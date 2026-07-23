'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import type {
  PipeImportJSON,
  SchoolResolution,
  WrestlerResolution,
  SchoolOverride,
  WrestlerOverride,
  TournamentBlock,
} from './types'

// ── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls =
    confidence === 'exact' ? 'bg-green-100 text-green-800' :
    confidence === 'alias' ? 'bg-teal-100 text-teal-800' :
    confidence === 'high'  ? 'bg-blue-100 text-blue-800' :
    confidence === 'low'   ? 'bg-yellow-100 text-yellow-800' :
    confidence === 'oos'   ? 'bg-purple-100 text-purple-800' :
                             'bg-red-100 text-red-800'
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${cls}`}>
      {confidence}
    </span>
  )
}

// ── School flag card ──────────────────────────────────────────────────────────
// Shows 'none' and 'low' confidence schools — every one needs an explicit
// decision: map to an NJ school, or confirm as out-of-state.

function SchoolFlag({
  rawName,
  resolution,
  boutCount,
  override,
  onOverride,
}: {
  rawName: string
  resolution: SchoolResolution
  boutCount: number
  override: SchoolOverride | undefined
  onOverride: (rawName: string, o: SchoolOverride) => void
}) {
  const [query, setQuery]           = useState('')
  const [results, setResults]       = useState<{ id: number; display_name: string }[]>([])
  const [searching, setSearching]   = useState(false)
  const [status, setStatus]         = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showSearch, setShowSearch] = useState(resolution.confidence === 'low')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.schools ?? [])
      } finally { setSearching(false) }
    }, 250)
  }, [])

  const pickNJ = useCallback(async (school: { id: number; display_name: string }) => {
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/add-school-alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: school.id,
          alias: rawName,
          alias_type: 'abbreviation',
          notes: `Added via tournament import UI`,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('saved')
    } catch { setStatus('error') }
    onOverride(rawName, { type: 'nj', school_id: school.id, display_name: school.display_name })
    setResults([])
    setQuery('')
  }, [rawName, onOverride])

  const confirmOOS = useCallback(async () => {
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/add-school-alias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: null,
          alias: rawName,
          alias_type: 'oos',
          notes: `Confirmed out-of-state via tournament import UI`,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('saved')
    } catch { setStatus('error') }
    onOverride(rawName, { type: 'oos' })
  }, [rawName, onOverride])

  // ── Resolved state ──────────────────────────────────────────────────────────
  if (override) {
    return (
      <div className="border border-slate-200 rounded-lg px-4 py-3 bg-white flex items-center justify-between">
        <div>
          <span className="font-mono text-sm text-slate-700">{rawName}</span>
          <span className="text-xs text-slate-400 ml-2">{boutCount} bouts</span>
        </div>
        <div className="flex items-center gap-2">
          {override.type === 'nj' ? (
            <>
              <span className="text-xs text-green-700">→ {override.display_name}</span>
              <span className="text-xs text-green-600 font-medium">NJ ✓</span>
            </>
          ) : (
            <span className="text-xs text-purple-700 font-medium">Out-of-state ✓</span>
          )}
          {status === 'error' && <span className="text-xs text-red-500">Alias save failed</span>}
        </div>
      </div>
    )
  }

  // ── Decision required ───────────────────────────────────────────────────────
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-sm font-medium text-slate-800">{rawName}</p>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge confidence={resolution.confidence} />
            <span className="text-xs text-slate-400">{boutCount} bout{boutCount !== 1 ? 's' : ''}</span>
            {resolution.confidence === 'low' && resolution.display_name && (
              <span className="text-xs text-slate-500">best guess: {resolution.display_name}</span>
            )}
          </div>
          {resolution.alternates.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Fuzzy matches: {resolution.alternates.map(a => a.display_name).join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status === 'saving' && <span className="text-xs text-slate-400">Saving…</span>}
          {status === 'saved'  && <span className="text-xs text-green-600">Saved</span>}
          {status === 'error'  && <span className="text-xs text-red-500">Save failed</span>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(resolution.confidence === 'high' || resolution.confidence === 'low')
          && resolution.school_id != null && resolution.display_name && (
          <button
            onClick={() => pickNJ({ id: resolution.school_id!, display_name: resolution.display_name! })}
            disabled={status === 'saving'}
            className="text-xs px-3 py-1.5 border border-teal-300 text-teal-700 rounded hover:bg-teal-50 transition-colors disabled:opacity-50"
          >
            Confirm: {resolution.display_name}
          </button>
        )}
        <button
          onClick={() => setShowSearch(s => !s)}
          className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
        >
          {(resolution.confidence === 'high' || resolution.confidence === 'low') ? 'Use different school' : 'Map to NJ school'}
        </button>
        <button
          onClick={confirmOOS}
          disabled={status === 'saving'}
          className="text-xs px-3 py-1.5 border border-slate-300 text-slate-600 rounded hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Confirm out-of-state
        </button>
      </div>

      {showSearch && (
        <div className="mt-3">
          <input
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search NJ schools…"
            autoFocus
            className="w-full text-sm border border-slate-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searching && <p className="text-xs text-slate-400 mt-1">Searching…</p>}
          {results.length > 0 && (
            <ul className="mt-1 border border-slate-200 rounded divide-y divide-slate-100 max-h-40 overflow-y-auto">
              {results.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => pickNJ(s)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    {s.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Roster search ─────────────────────────────────────────────────────────────

function RosterSearch({
  schoolId,
  onSelect,
}: {
  schoolId: number
  onSelect: (w: { id: string; display_name: string }) => void
}) {
  const [query, setQuery]   = useState('')
  const [roster, setRoster] = useState<{ id: string; display_name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const loaded = useRef(false)

  const load = useCallback(async () => {
    if (loaded.current) return
    loaded.current = true
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/school-wrestlers?schoolId=${schoolId}`)
      const data = await res.json()
      setRoster(data.wrestlers ?? [])
    } finally { setLoading(false) }
  }, [schoolId])

  const filtered = query.trim()
    ? roster.filter(w => w.display_name.toLowerCase().includes(query.toLowerCase()))
    : roster

  return (
    <div className="mt-2">
      <input
        type="text"
        placeholder="Search roster…"
        value={query}
        onFocus={load}
        onChange={e => { load(); setQuery(e.target.value) }}
        className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
      {loading && <p className="text-xs text-slate-400 mt-1">Loading roster…</p>}
      {filtered.length > 0 && (
        <ul className="mt-1 border border-slate-200 rounded divide-y divide-slate-100 max-h-32 overflow-y-auto">
          {filtered.map(w => (
            <li key={w.id}>
              <button
                onClick={() => onSelect(w)}
                className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50"
              >
                {w.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Wrestler flag card ────────────────────────────────────────────────────────

function WrestlerFlag({
  wrestlerKey,
  resolution,
  override,
  onOverride,
}: {
  wrestlerKey: string
  resolution: WrestlerResolution
  override: WrestlerOverride | undefined
  onOverride: (key: string, o: WrestlerOverride) => void
}) {
  const [name, schoolIdStr, weightStr] = wrestlerKey.split('|')
  const schoolId = schoolIdStr !== 'null' ? Number(schoolIdStr) : null
  const weight = Number(weightStr)

  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-800">{name}</p>
          <p className="text-xs text-slate-400">{weight}lb · school #{schoolId}</p>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge confidence={resolution.confidence} />
            {resolution.is_new && (
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">new</span>
            )}
          </div>
          {resolution.alternates.length > 0 && !override && (
            <p className="text-xs text-slate-400 mt-1">
              Alternates: {resolution.alternates.map(a => a.display_name).join(', ')}
            </p>
          )}
        </div>
        {override && (
          <span className="text-xs text-green-600 font-medium shrink-0">
            {override.type === 'new' ? 'Will create new' : `→ ${override.display_name}`}
          </span>
        )}
      </div>

      {!override && schoolId !== null && (
        <>
          {(resolution.confidence === 'high' || resolution.confidence === 'low')
            && resolution.wrestler_id && resolution.display_name && (
            <button
              onClick={() => onOverride(wrestlerKey, { type: 'existing', wrestler_id: resolution.wrestler_id!, display_name: resolution.display_name! })}
              className="mt-2 text-xs px-3 py-1.5 border border-teal-300 text-teal-700 rounded hover:bg-teal-50 transition-colors"
            >
              Confirm: {resolution.display_name}
            </button>
          )}
          <RosterSearch
            schoolId={schoolId}
            onSelect={w => onOverride(wrestlerKey, { type: 'existing', wrestler_id: w.id, display_name: w.display_name })}
          />
          <button
            onClick={() => onOverride(wrestlerKey, { type: 'new' })}
            className="mt-2 text-xs text-slate-500 underline hover:text-slate-700"
          >
            Confirm as new wrestler
          </button>
        </>
      )}
    </div>
  )
}

// ── Tournament summary row ────────────────────────────────────────────────────

function TournamentRow({ t }: { t: TournamentBlock }) {
  const flagged = t.bouts.filter(b => b.flagged).length
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-slate-800">{t.name}</p>
        <p className="text-xs text-slate-400">
          {t.start_date} · {t.bouts.length} bouts
          {t.existing_id && <span className="ml-2 text-slate-300">(already in DB)</span>}
        </p>
      </div>
      <div className="text-right">
        {t.skipped ? (
          <span className="text-xs text-slate-400">skipped</span>
        ) : (
          <span className={`text-xs font-medium ${flagged ? 'text-yellow-600' : 'text-green-600'}`}>
            {flagged ? `${flagged} flagged` : 'clean'}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentImportClient() {
  const [importData, setImportData]           = useState<PipeImportJSON | null>(null)
  const [importId, setImportId]               = useState<string | null>(null)
  const [schoolOverrides, setSchoolOverrides] = useState<Record<string, SchoolOverride>>({})
  const [wrestlerOverrides, setWrestlerOverrides] = useState<Record<string, WrestlerOverride>>({})
  const [phase, setPhase]             = useState<'upload' | 'review' | 'submitting' | 'done'>('upload')
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle')
  const [submitResult, setSubmitResult] = useState<{ inserted: number; created: number } | null>(null)
  const [submitError, setSubmitError]   = useState<string | null>(null)

  // Bout count per raw school name, computed once from the loaded JSON
  const boutCountBySchool = useMemo<Record<string, number>>(() => {
    if (!importData) return {}
    const counts: Record<string, number> = {}
    for (const t of importData.tournaments) {
      if (t.skipped) continue
      for (const b of t.bouts) {
        counts[b.winner_school_raw] = (counts[b.winner_school_raw] ?? 0) + 1
        counts[b.loser_school_raw]  = (counts[b.loser_school_raw]  ?? 0) + 1
      }
    }
    return counts
  }, [importData])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as PipeImportJSON
        if (!data.schema_version || data.schema_version < 1 || !data.source_format) {
          alert('Unrecognised JSON format. Make sure you used --json-out from import_pipe_csv.py.')
          return
        }
        setUploadStatus('uploading')
        const res = await fetch('/api/admin/stage-import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payload: data, filename: file.name }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Upload failed' }))
          throw new Error(err.error ?? 'Upload failed')
        }
        const { import_id } = await res.json()
        setImportId(import_id)
        setImportData(data)
        setSchoolOverrides({})
        setWrestlerOverrides({})
        setPhase('review')
        setUploadStatus('idle')
      } catch (err) {
        setUploadStatus('error')
        alert(err instanceof Error ? err.message : 'Upload failed')
      }
    }
    reader.readAsText(file)
  }, [])

  const handleSchoolOverride = useCallback((rawName: string, o: SchoolOverride) => {
    setSchoolOverrides(prev => ({ ...prev, [rawName]: o }))
  }, [])

  const handleWrestlerOverride = useCallback((key: string, o: WrestlerOverride) => {
    setWrestlerOverrides(prev => ({ ...prev, [key]: o }))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!importData) return
    setPhase('submitting')
    setSubmitError(null)
    try {
      const res = await fetch('/api/admin/import-tournament-bouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importData, schoolOverrides, wrestlerOverrides }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      setSubmitResult({ inserted: data.inserted, created: data.created })
      setPhase('done')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unknown error')
      setPhase('review')
    }
  }, [importData, schoolOverrides, wrestlerOverrides])

  // ── Upload phase ────────────────────────────────────────────────────────────
  if (phase === 'upload') {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
        <p className="text-slate-500 mb-2 text-sm">First generate the JSON locally:</p>
        <code className="block text-xs bg-slate-100 rounded px-4 py-2 mb-6 text-slate-700 font-mono">
          python3 scripts/import_pipe_csv.py --json-out out.json pipe_format_tournaments_dec2025.csv
        </code>
        {uploadStatus === 'uploading' ? (
          <p className="text-sm text-slate-500">Saving to database…</p>
        ) : (
          <label className="cursor-pointer inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload JSON file
            <input type="file" accept=".json" className="sr-only" onChange={handleFile} />
          </label>
        )}
        {uploadStatus === 'error' && (
          <p className="text-sm text-red-600 mt-3">Upload failed — check console for details.</p>
        )}
      </div>
    )
  }

  // ── Done phase ──────────────────────────────────────────────────────────────
  if (phase === 'done' && submitResult) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">Import complete</p>
        <p className="text-green-700 mt-1">
          {submitResult.inserted} bouts inserted · {submitResult.created} wrestlers created
        </p>
        <button
          onClick={() => { setPhase('upload'); setImportData(null); setImportId(null); setUploadStatus('idle') }}
          className="mt-4 text-sm text-green-700 underline hover:text-green-900"
        >
          Import another file
        </button>
      </div>
    )
  }

  // ── Review phase ────────────────────────────────────────────────────────────
  if (!importData) return null

  // Schools needing a decision: anything that isn't an exact/alias/oos match.
  // 'high' = fuzzy strong match (confirm required); 'low' = weak guess; 'none' = no match.
  const needsDecision = Object.entries(importData.schools).filter(
    ([raw, s]) => (s.confidence === 'none' || s.confidence === 'low' || s.confidence === 'high') && !schoolOverrides[raw]
  )
  const decidedCount = Object.entries(importData.schools).filter(
    ([raw, s]) => (s.confidence === 'none' || s.confidence === 'low' || s.confidence === 'high') && schoolOverrides[raw]
  ).length
  const totalSchoolDecisions = needsDecision.length + decidedCount

  // Wrestlers needing attention: high/low confidence or new, for NJ schools only.
  const flaggedWrestlers = Object.entries(importData.wrestlers).filter(
    ([key, w]) => {
      if (wrestlerOverrides[key]) return false
      if (key.split('|')[1] === 'null') return false
      return w.confidence === 'high' || w.confidence === 'low' || w.is_new
    }
  )
  const resolvedWrestlerCount = Object.entries(importData.wrestlers).filter(
    ([key]) => !!wrestlerOverrides[key]
  ).length
  const totalFlaggedWrestlers = flaggedWrestlers.length + resolvedWrestlerCount

  const unresolvedCount = needsDecision.length + flaggedWrestlers.length

  // Sort schools by bout count descending so high-impact ones come first
  const sortedSchoolDecisions = [
    ...needsDecision,
    ...Object.entries(importData.schools).filter(
      ([raw, s]) => (s.confidence === 'none' || s.confidence === 'low' || s.confidence === 'high') && schoolOverrides[raw]
    ),
  ].sort(([a], [b]) => (boutCountBySchool[b] ?? 0) - (boutCountBySchool[a] ?? 0))

  return (
    <div className="space-y-8">
      {/* Summary bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">{importData.csv_file}</h2>
          <button onClick={() => setPhase('upload')} className="text-xs text-slate-400 hover:text-slate-600">
            Upload different file
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-800">{importData.summary.total_bouts}</p>
            <p className="text-xs text-slate-400">total bouts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{importData.summary.total_tournaments}</p>
            <p className="text-xs text-slate-400">tournaments</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${totalSchoolDecisions > decidedCount ? 'text-yellow-600' : 'text-green-600'}`}>
              {decidedCount}/{totalSchoolDecisions}
            </p>
            <p className="text-xs text-slate-400">schools decided</p>
          </div>
          <div>
            <p className={`text-2xl font-bold ${totalFlaggedWrestlers > resolvedWrestlerCount ? 'text-yellow-600' : 'text-green-600'}`}>
              {resolvedWrestlerCount}/{totalFlaggedWrestlers}
            </p>
            <p className="text-xs text-slate-400">wrestlers resolved</p>
          </div>
        </div>
      </div>

      {/* Tournaments list */}
      <div>
        <h2 className="font-semibold text-slate-700 mb-3">Tournaments</h2>
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white px-4">
          {importData.tournaments.map(t => <TournamentRow key={t.name} t={t} />)}
        </div>
      </div>

      {/* School decisions */}
      {totalSchoolDecisions > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-1">
            School Decisions
            <span className="ml-2 text-sm font-normal text-slate-400">
              {decidedCount} of {totalSchoolDecisions} decided
            </span>
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Every unresolved school requires a decision. Fuzzy matches show a suggested name —
            confirm it to write a permanent alias, or pick a different school. Sorted by bout count.
          </p>
          <div className="space-y-3">
            {sortedSchoolDecisions.map(([rawName, resolution]) => (
              <SchoolFlag
                key={rawName}
                rawName={rawName}
                resolution={resolution}
                boutCount={boutCountBySchool[rawName] ?? 0}
                override={schoolOverrides[rawName]}
                onOverride={handleSchoolOverride}
              />
            ))}
          </div>
        </div>
      )}

      {/* Wrestler flags */}
      {totalFlaggedWrestlers > 0 && (
        <div>
          <h2 className="font-semibold text-slate-700 mb-3">
            Wrestler Issues
            <span className="ml-2 text-sm font-normal text-slate-400">
              {resolvedWrestlerCount} of {totalFlaggedWrestlers} resolved
              <span className="ml-1 text-orange-500">
                ({importData.summary.new_wrestler_count} new)
              </span>
            </span>
          </h2>
          <div className="space-y-3">
            {flaggedWrestlers.map(([key, resolution]) => (
              <WrestlerFlag
                key={key}
                wrestlerKey={key}
                resolution={resolution}
                override={wrestlerOverrides[key]}
                onOverride={handleWrestlerOverride}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submit */}
      <div className="border-t border-slate-200 pt-6">
        {submitError && <p className="text-sm text-red-600 mb-3">{submitError}</p>}
        {unresolvedCount > 0 && (
          <p className="text-sm text-yellow-700 mb-3">
            {unresolvedCount} item{unresolvedCount !== 1 ? 's' : ''} still need attention.
            Unresolved wrestlers will be created as new records; unresolved schools will have
            null school_id in the imported bouts.
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={phase === 'submitting'}
          className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {phase === 'submitting' ? 'Importing…' : 'Submit to database'}
        </button>
      </div>
    </div>
  )
}
