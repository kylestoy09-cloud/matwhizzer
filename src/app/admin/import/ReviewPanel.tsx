'use client'

import { useState, useCallback, useRef } from 'react'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import {
  type SchoolOverride,
  resolveSchool,
} from './types'

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls =
    confidence === 'high' ? 'bg-green-100 text-green-700'
    : confidence === 'low' ? 'bg-yellow-100 text-yellow-700'
    : 'bg-red-100 text-red-700'
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>
      {confidence}
    </span>
  )
}

// ── School flag card — mirrors TournamentImportClient SchoolFlag ───────────────

function SchoolFlagCard({
  rawName,
  match,
  boutCount,
  override,
  onOverride,
}: {
  rawName:    string
  match:      SchoolMatch
  boutCount:  number
  override:   SchoolOverride | undefined
  onOverride: (rawName: string, o: SchoolOverride | null) => void
}) {
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<{ id: number; display_name: string }[]>([])
  const [searching,  setSearching]  = useState(false)
  const [showSearch, setShowSearch] = useState(match.confidence === 'low' || match.confidence === 'none')
  const [status,     setStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
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

  const confirmNJ = useCallback(async (school: { id: number; display_name: string }) => {
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/add-school-alias', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          school_id:  school.id,
          alias:      rawName,
          alias_type: 'abbreviation',
          notes:      'Added via dual meet import UI',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('saved')
    } catch { setStatus('error') }
    onOverride(rawName, { schoolId: school.id, displayName: school.display_name })
    setResults([])
    setQuery('')
  }, [rawName, onOverride])

  const confirmOOS = useCallback(async () => {
    setStatus('saving')
    try {
      const res = await fetch('/api/admin/add-school-alias', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          school_id:  null,
          alias:      rawName,
          alias_type: 'oos',
          notes:      'Confirmed out-of-state via dual meet import UI',
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('saved')
    } catch { setStatus('error') }
    onOverride(rawName, { schoolId: null, displayName: rawName, isOutOfState: true })
  }, [rawName, onOverride])

  // ── Resolved ────────────────────────────────────────────────────────────────
  if (override) {
    return (
      <div className="border border-slate-200 rounded-lg px-4 py-3 bg-white flex items-center justify-between">
        <div>
          <span className="font-mono text-sm text-slate-700">{rawName}</span>
          <span className="text-xs text-slate-400 ml-2">{boutCount} bout{boutCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {override.isOutOfState ? (
            <span className="text-xs text-purple-700 font-medium">Out-of-state ✓</span>
          ) : (
            <>
              <span className="text-xs text-green-700">→ {override.displayName}</span>
              <span className="text-xs text-green-600 font-medium">NJ ✓</span>
            </>
          )}
          {status === 'error' && <span className="text-xs text-red-500">Alias save failed</span>}
          <button
            onClick={() => { onOverride(rawName, null); setStatus('idle') }}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline"
          >
            undo
          </button>
        </div>
      </div>
    )
  }

  // ── Decision required ───────────────────────────────────────────────────────
  const hasCandidate = match.schoolId != null && match.displayName

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-sm font-medium text-slate-800">{rawName}</p>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge confidence={match.confidence} />
            <span className="text-xs text-slate-400">{boutCount} bout{boutCount !== 1 ? 's' : ''}</span>
            {match.confidence === 'low' && match.displayName && (
              <span className="text-xs text-slate-500">best guess: {match.displayName}</span>
            )}
          </div>
          {match.alternates.length > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              Fuzzy matches: {match.alternates.map(a => a.displayName).join(', ')}
            </p>
          )}
        </div>
        <div className="shrink-0 text-xs">
          {status === 'saving' && <span className="text-slate-400">Saving…</span>}
          {status === 'saved'  && <span className="text-green-600">Saved</span>}
          {status === 'error'  && <span className="text-red-500">Save failed</span>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {hasCandidate && (
          <button
            onClick={() => confirmNJ({ id: match.schoolId!, display_name: match.displayName! })}
            disabled={status === 'saving'}
            className="text-xs px-3 py-1.5 border border-teal-300 text-teal-700 rounded hover:bg-teal-50 transition-colors disabled:opacity-50"
          >
            Confirm: {match.displayName}
          </button>
        )}
        <button
          onClick={() => setShowSearch(s => !s)}
          className="text-xs px-3 py-1.5 border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
        >
          {hasCandidate ? 'Use different school' : 'Map to NJ school'}
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
                    onClick={() => confirmNJ(s)}
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

// ── ReviewPanel ────────────────────────────────────────────────────────────────

type Props = {
  meets:             ParsedMeet[]
  schoolResolutions: Record<string, SchoolMatch>
  schoolOverrides:   Record<string, SchoolOverride>
  onSchoolOverride:  (rawName: string, o: SchoolOverride | null) => void
}

export function ReviewPanel({
  meets,
  schoolResolutions,
  schoolOverrides,
  onSchoolOverride,
}: Props) {
  // Collect unique school names that need a decision, with bout counts
  const boutCountBySchool = new Map<string, number>()
  for (const meet of meets) {
    for (const m of meet.matches) {
      if (m.winnerSchoolRaw) boutCountBySchool.set(m.winnerSchoolRaw, (boutCountBySchool.get(m.winnerSchoolRaw) ?? 0) + 1)
      if (m.loserSchoolRaw)  boutCountBySchool.set(m.loserSchoolRaw,  (boutCountBySchool.get(m.loserSchoolRaw)  ?? 0) + 1)
    }
  }

  const schoolItems: { rawName: string; match: SchoolMatch; boutCount: number }[] = []
  const seen = new Set<string>()

  const collect = (rawName: string | null | undefined) => {
    if (!rawName || seen.has(rawName)) return
    seen.add(rawName)
    const res = resolveSchool(rawName, schoolResolutions, schoolOverrides)
    if (res.confidence === 'low' || res.confidence === 'none') {
      const match = schoolResolutions[rawName]
      if (match) schoolItems.push({ rawName, match, boutCount: boutCountBySchool.get(rawName) ?? 0 })
    }
  }

  for (const meet of meets) {
    collect(meet.team1Name)
    collect(meet.team2Name)
    for (const m of meet.matches) {
      collect(m.winnerSchoolRaw)
      collect(m.loserSchoolRaw)
    }
  }

  // Sort by bout count descending (same as tournament import)
  schoolItems.sort((a, b) => b.boutCount - a.boutCount)

  if (schoolItems.length === 0) return null

  return (
    <div>
      <h2 className="font-semibold text-slate-700 mb-1">
        School Decisions
        <span className="ml-2 text-sm font-normal text-slate-400">
          {schoolItems.filter(s => schoolOverrides[s.rawName]).length} of {schoolItems.length} decided
        </span>
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        Every unresolved school requires a decision. Confirm the suggested name to write a permanent alias, or pick a different school. Sorted by bout count.
      </p>
      <div className="space-y-3">
        {schoolItems.map(({ rawName, match, boutCount }) => (
          <SchoolFlagCard
            key={rawName}
            rawName={rawName}
            match={match}
            boutCount={boutCount}
            override={schoolOverrides[rawName]}
            onOverride={onSchoolOverride}
          />
        ))}
      </div>
    </div>
  )
}
