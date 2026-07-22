'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { TournamentBoutRecord } from './types'

// ── Result type options ────────────────────────────────────────────────────────

const RESULT_TYPES = ['Fall', 'Dec', 'MD', 'TF', 'For', 'SV-1', 'TB-1', 'DQ', 'Inj', 'OT', '2-OT']

function parseTime(s: string): number | null {
  const m = s.match(/^(\d+):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

// ── School search widget ───────────────────────────────────────────────────────

type SchoolOption = { id: number; display_name: string }

function SchoolSearch({
  label,
  currentId,
  currentRaw,
  onSelect,
}: {
  label: string
  currentId: number | null
  currentRaw: string
  onSelect: (s: SchoolOption | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SchoolOption[]>([])
  const [searching, setSearching] = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    setQuery(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) { setResults([]); return }
    debounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/admin/search-schools?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setResults(data.schools ?? [])
      } finally { setSearching(false) }
    }, 250)
  }, [])

  const displayLabel = currentId
    ? results.find(r => r.id === currentId)?.display_name ?? currentRaw
    : currentRaw || '—'

  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-0.5">{label}</p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-left w-full text-xs px-2 py-1 border border-slate-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <span className="text-slate-700">{displayLabel}</span>
          {currentId && <span className="text-slate-300 ml-1">#{currentId}</span>}
          <span className="float-right text-slate-300">✏</span>
        </button>
      ) : (
        <div className="border border-blue-400 rounded overflow-hidden">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            placeholder="Search NJ schools…"
            className="w-full text-xs px-2 py-1 focus:outline-none"
          />
          {currentId && (
            <button
              onClick={() => { onSelect(null); setOpen(false); setQuery('') }}
              className="w-full text-left text-xs px-2 py-1 text-slate-500 hover:bg-slate-50 border-t border-slate-100"
            >
              Clear (set school_id = null)
            </button>
          )}
          {searching && <p className="text-xs px-2 py-1 text-slate-400">Searching…</p>}
          {results.length > 0 && (
            <ul className="max-h-36 overflow-y-auto divide-y divide-slate-100">
              {results.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => { onSelect(s); setOpen(false); setQuery(''); setResults([]) }}
                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-slate-50"
                  >
                    {s.display_name}
                    <span className="text-slate-300 ml-1">#{s.id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={() => { setOpen(false); setQuery(''); setResults([]) }}
            className="w-full text-xs text-slate-400 px-2 py-1 border-t border-slate-100 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

// ── Wrestler picker ────────────────────────────────────────────────────────────

type WrestlerOption = { wrestlerId: string; displayName: string; weights: number[] }

function WrestlerPicker({
  label,
  schoolId,
  currentId,
  currentNameRaw,
  onSelect,
}: {
  label: string
  schoolId: number | null
  currentId: string | null
  currentNameRaw: string
  onSelect: (w: WrestlerOption | null) => void
}) {
  const [roster, setRoster] = useState<WrestlerOption[]>([])
  const [loading, setLoading] = useState(false)
  const loadedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!schoolId || schoolId === loadedFor.current) return
    loadedFor.current = schoolId
    setLoading(true)
    fetch(`/api/admin/school-wrestlers?schoolId=${schoolId}`)
      .then(r => r.json())
      .then(d => setRoster(d.wrestlers ?? []))
      .finally(() => setLoading(false))
  }, [schoolId])

  const currentName = roster.find(w => w.wrestlerId === currentId)?.displayName ?? currentNameRaw

  if (!schoolId) return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-0.5">{label}</p>
      <p className="text-xs text-slate-300 italic">Select school first</p>
    </div>
  )

  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-0.5">{label}</p>
      {loading ? (
        <p className="text-xs text-slate-400">Loading roster…</p>
      ) : (
        <select
          value={currentId ?? ''}
          onChange={e => {
            const w = roster.find(r => r.wrestlerId === e.target.value)
            onSelect(w ?? null)
          }}
          className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
        >
          <option value="">{currentNameRaw} (raw — no link)</option>
          {roster.map(w => (
            <option key={w.wrestlerId} value={w.wrestlerId}>
              {w.displayName} ({w.weights.join('/')})
            </option>
          ))}
        </select>
      )}
      {currentId && (
        <p className="text-[10px] text-slate-400 mt-0.5">{currentName}</p>
      )}
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface InSeasonEditPanelProps {
  bout: TournamentBoutRecord | null
  onSaved: (b: TournamentBoutRecord) => void
  onCancel: () => void
}

export function InSeasonEditPanel({ bout, onSaved, onCancel }: InSeasonEditPanelProps) {
  const [school1Id, setSchool1Id]   = useState<number | null>(null)
  const [school1Raw, setSchool1Raw] = useState('')
  const [wrestler1Id, setWrestler1Id] = useState<string | null>(null)
  const [school2Id, setSchool2Id]   = useState<number | null>(null)
  const [school2Raw, setSchool2Raw] = useState('')
  const [wrestler2Id, setWrestler2Id] = useState<string | null>(null)
  const [winner, setWinner]         = useState<1 | 2 | null>(null)
  const [resultType, setResultType] = useState<string>('')
  const [resultDetail, setResultDetail] = useState<string>('')
  const [fallTimeStr, setFallTimeStr]   = useState<string>('')
  const [weightClass, setWeightClass]   = useState<number>(0)
  const [round, setRound]               = useState<string>('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string>('')

  // Sync form from selected bout
  useEffect(() => {
    if (!bout) return
    setSchool1Id(bout.wrestler1_school_id)
    setSchool1Raw(bout.wrestler1_school_raw)
    setWrestler1Id(bout.nj_wrestler1_id)
    setSchool2Id(bout.wrestler2_school_id)
    setSchool2Raw(bout.wrestler2_school_raw)
    setWrestler2Id(bout.nj_wrestler2_id)
    setWinner(bout.winner)
    setResultType(bout.result_type ?? '')
    setResultDetail(bout.result_detail ?? '')
    setFallTimeStr(bout.fall_time_seconds != null ? formatTime(bout.fall_time_seconds) : '')
    setWeightClass(bout.weight_class)
    setRound(bout.round)
    setError('')
  }, [bout])

  const handleSchool1 = useCallback((s: SchoolOption | null) => {
    setSchool1Id(s?.id ?? null)
    if (s) setSchool1Raw(s.display_name)
    setWrestler1Id(null)
  }, [])

  const handleSchool2 = useCallback((s: SchoolOption | null) => {
    setSchool2Id(s?.id ?? null)
    if (s) setSchool2Raw(s.display_name)
    setWrestler2Id(null)
  }, [])

  const handleWrestler1 = useCallback((w: WrestlerOption | null) => {
    setWrestler1Id(w?.wrestlerId ?? null)
  }, [])

  const handleWrestler2 = useCallback((w: WrestlerOption | null) => {
    setWrestler2Id(w?.wrestlerId ?? null)
  }, [])

  async function handleSave() {
    if (!bout) return
    setSaving(true)
    setError('')
    const fallSec = resultType === 'Fall' && fallTimeStr ? parseTime(fallTimeStr) : null
    const payload = {
      id: bout.id,
      weight_class:         weightClass,
      round:                round,
      wrestler1_school_id:  school1Id,
      wrestler1_school_raw: school1Raw,
      nj_wrestler1_id:      wrestler1Id,
      wrestler2_school_id:  school2Id,
      wrestler2_school_raw: school2Raw,
      nj_wrestler2_id:      wrestler2Id,
      winner:               winner,
      result_type:          resultType || null,
      result_detail:        resultDetail || null,
      fall_time_seconds:    fallSec,
    }
    try {
      const res = await fetch('/api/admin/update-tournament-bout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSaved(data.bout as TournamentBoutRecord)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (!bout) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="text-lg font-medium">Select a bout to edit</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">
          {bout.weight_class}lb · {bout.round}
        </h3>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{bout.id}</p>
      </div>

      {error && <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>}

      {/* Weight + round */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Weight</label>
          <input
            type="number"
            value={weightClass}
            onChange={e => setWeightClass(Number(e.target.value))}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Round</label>
          <input
            type="text"
            value={round}
            onChange={e => setRound(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Wrestler 1 */}
      <div className="border border-slate-100 rounded p-3 space-y-2 bg-slate-50">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          Wrestler 1 · <span className="font-normal">{bout.wrestler1_name_raw}</span>
        </p>
        <SchoolSearch
          label="School 1"
          currentId={school1Id}
          currentRaw={school1Raw}
          onSelect={handleSchool1}
        />
        <WrestlerPicker
          label="Wrestler 1 link"
          schoolId={school1Id}
          currentId={wrestler1Id}
          currentNameRaw={bout.wrestler1_name_raw}
          onSelect={handleWrestler1}
        />
      </div>

      {/* Wrestler 2 */}
      <div className="border border-slate-100 rounded p-3 space-y-2 bg-slate-50">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          Wrestler 2 · <span className="font-normal">{bout.wrestler2_name_raw}</span>
        </p>
        <SchoolSearch
          label="School 2"
          currentId={school2Id}
          currentRaw={school2Raw}
          onSelect={handleSchool2}
        />
        <WrestlerPicker
          label="Wrestler 2 link"
          schoolId={school2Id}
          currentId={wrestler2Id}
          currentNameRaw={bout.wrestler2_name_raw}
          onSelect={handleWrestler2}
        />
      </div>

      {/* Result */}
      <div className="space-y-2">
        {/* Winner toggle */}
        <div>
          <p className="text-[10px] font-medium text-slate-500 mb-1">Winner</p>
          <div className="flex gap-2">
            {([1, 2] as const).map(n => (
              <button
                key={n}
                onClick={() => setWinner(winner === n ? null : n)}
                className={`flex-1 text-xs py-1.5 rounded border transition-colors ${
                  winner === n
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {n === 1 ? bout.wrestler1_name_raw : bout.wrestler2_name_raw}
              </button>
            ))}
          </div>
        </div>

        {/* Result type */}
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Result type</label>
          <select
            value={resultType}
            onChange={e => setResultType(e.target.value)}
            className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            <option value="">—</option>
            {RESULT_TYPES.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>

        {/* Fall time */}
        {resultType === 'Fall' && (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Fall time (M:SS)</label>
            <input
              type="text"
              placeholder="1:23"
              value={fallTimeStr}
              onChange={e => setFallTimeStr(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}

        {/* Detail (score, e.g. "8-4") */}
        {resultType && resultType !== 'Fall' && resultType !== 'For' && (
          <div>
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Score detail</label>
            <input
              type="text"
              placeholder="e.g. 8-4"
              value={resultDetail}
              onChange={e => setResultDetail(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-slate-900 text-white text-sm font-semibold py-2 rounded
                     hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
