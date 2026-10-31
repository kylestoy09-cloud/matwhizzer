'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { DualMeetOption } from './page'

// ── Types ─────────────────────────────────────────────────────────────────────

export type AugmentedMatch = {
  id: string
  dual_meet_id: string
  weight_class: number
  wrestler_a_id:      string | null
  wrestler_b_id:      string | null
  winner_id:          string | null
  result_type:        string | null
  result_detail:      string | null
  fall_time_seconds:  number | null
  is_double_forfeit:  boolean
  is_forfeit_win:     boolean
  validated:          boolean
  school_a_id:        number | null
  school_b_id:        number | null
  wrestler_a_name_raw: string | null
  wrestler_b_name_raw: string | null
  // Augmented by API
  wrestler_a_name:  string | null
  wrestler_a_stub:  boolean
  wrestler_b_name:  string | null
  wrestler_b_stub:  boolean
  school_a_name:    string | null
  school_a_is_nj:   boolean
  school_b_name:    string | null
  school_b_is_nj:   boolean
  wa_registered_school_id: number | null
  wb_registered_school_id: number | null
}

type UnlinkedSlot = {
  matchId:     string
  meetId:      string
  meetLabel:   string
  weightClass: number
  slot:        'a' | 'b'
  nameRaw:     string | null
}

type UnlinkedGroup = {
  schoolId:   number
  schoolName: string
  isNj:       boolean
  slots:      UnlinkedSlot[]
}

type FilterKey = 'all' | 'no_link' | 'school_mismatch' | 'stub_name'

// ── Flags ─────────────────────────────────────────────────────────────────────

const FILTER_LABELS: Record<FilterKey, string> = {
  all:            'All',
  no_link:        'No Link',
  school_mismatch:'School Mismatch',
  stub_name:      'Stub Name',
}

const FLAG_BADGE: Record<FilterKey, string> = {
  all:            '',
  no_link:        'bg-amber-100 text-amber-800',
  school_mismatch:'bg-red-100 text-red-800',
  stub_name:      'bg-violet-100 text-violet-800',
}

function getMatchFlags(m: AugmentedMatch): FilterKey[] {
  const flags: FilterKey[] = []

  // School linked but no wrestler in that slot (and not a forfeit that excuses the absence)
  if (
    (!m.is_double_forfeit && m.school_a_id !== null && m.wrestler_a_id === null) ||
    (!m.is_double_forfeit && !m.is_forfeit_win && m.school_b_id !== null && m.wrestler_b_id === null)
  ) flags.push('no_link')

  // Wrestler's registered school (from tournament_entries) differs from slot's school
  if (
    (m.wa_registered_school_id !== null &&
     m.school_a_id !== null &&
     m.wa_registered_school_id !== m.school_a_id) ||
    (m.wb_registered_school_id !== null &&
     m.school_b_id !== null &&
     m.wb_registered_school_id !== m.school_b_id)
  ) flags.push('school_mismatch')

  // Linked wrestler has a stub first_name (e.g. "J." — import artifact)
  if (m.wrestler_a_stub || m.wrestler_b_stub) flags.push('stub_name')

  return flags
}

// ── Meet label ─────────────────────────────────────────────────────────────────

function meetLabel(m: DualMeetOption): string {
  const date = new Date(m.meet_date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: '2-digit',
  })
  const genderSuffix = m.gender === 'F' ? ' · Girls' : ''
  return `${m.team1_name ?? '—'} vs ${m.team2_name ?? '—'} · ${date}${genderSuffix}`
}

// ── Main component ────────────────────────────────────────────────────────────

export function DualAuditClient({ meets }: { meets: DualMeetOption[] }) {
  const [mode, setMode]                     = useState<'meet' | 'queue'>('meet')
  const [mid, setMid]                       = useState(meets[0]?.id ?? '')
  const [matches, setMatches]               = useState<AugmentedMatch[]>([])
  const [loading, setLoading]               = useState(false)
  const [loadError, setLoadError]           = useState('')
  const [filter, setFilter]                 = useState<FilterKey>('all')
  const [selectedMatch, setSelectedMatch]   = useState<AugmentedMatch | null>(null)
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null)
  // Work queue state
  const [queueGroups, setQueueGroups]       = useState<UnlinkedGroup[]>([])
  const [queueLoading, setQueueLoading]     = useState(false)
  const [queueError, setQueueError]         = useState('')
  const [openSchools, setOpenSchools]       = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!mid) return
    setLoading(true)
    setLoadError('')
    setMatches([])
    setSelectedMatch(null)

    fetch(`/api/admin/dual-audit?mid=${encodeURIComponent(mid)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoadError(d.error); return }
        setMatches(d.matches ?? [])
      })
      .catch(e => setLoadError(String(e)))
      .finally(() => setLoading(false))
  }, [mid])

  const matchFlags = useMemo(() => {
    const map = new Map<string, FilterKey[]>()
    for (const m of matches) map.set(m.id, getMatchFlags(m))
    return map
  }, [matches])

  const counts = useMemo<Record<FilterKey, number>>(() => {
    const c: Record<FilterKey, number> = { all: matches.length, no_link: 0, school_mismatch: 0, stub_name: 0 }
    for (const flags of matchFlags.values()) {
      for (const f of flags) c[f]++
    }
    return c
  }, [matchFlags, matches.length])

  const filteredMatches = useMemo(
    () => filter === 'all'
      ? matches
      : matches.filter(m => matchFlags.get(m.id)?.includes(filter)),
    [matches, matchFlags, filter],
  )

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSaved = useCallback((updated: AugmentedMatch) => {
    setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    setSelectedMatch(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    showToast('Saved', true)
  }, [])

  const handleCancel = useCallback(() => setSelectedMatch(null), [])

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 shrink-0 flex-wrap">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ← Admin
        </Link>
        <h1 className="text-sm font-semibold text-slate-900">Dual Meet Audit</h1>

        {/* Mode toggle */}
        <div className="flex rounded border border-slate-300 overflow-hidden text-xs">
          <button
            onClick={() => setMode('meet')}
            className={`px-3 py-1.5 ${mode === 'meet' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            By Meet
          </button>
          <button
            onClick={() => {
              setMode('queue')
              if (queueGroups.length === 0 && !queueLoading) {
                setQueueLoading(true)
                setQueueError('')
                fetch('/api/admin/dual-audit?view=unlinked')
                  .then(r => r.json())
                  .then(d => { if (d.error) setQueueError(d.error); else setQueueGroups(d.groups ?? []) })
                  .catch(e => setQueueError(String(e)))
                  .finally(() => setQueueLoading(false))
              }
            }}
            className={`px-3 py-1.5 border-l border-slate-300 ${mode === 'queue' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Work Queue
            {queueGroups.length > 0 && (
              <span className="ml-1.5 text-[10px]">
                {queueGroups.reduce((s, g) => s + g.slots.length, 0)}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1" />

        {mode === 'meet' && (
          <select
            value={mid}
            onChange={e => { setMid(e.target.value); setFilter('all') }}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 max-w-xs"
          >
            {meets.length === 0 && <option value="">No dual meets found</option>}
            {meets.map(m => (
              <option key={m.id} value={m.id}>{meetLabel(m)}</option>
            ))}
          </select>
        )}
        {mode === 'queue' && (
          <button
            onClick={() => {
              setQueueGroups([])
              setQueueLoading(true)
              setQueueError('')
              fetch('/api/admin/dual-audit?view=unlinked')
                .then(r => r.json())
                .then(d => { if (d.error) setQueueError(d.error); else setQueueGroups(d.groups ?? []) })
                .catch(e => setQueueError(String(e)))
                .finally(() => setQueueLoading(false))
            }}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left: filter tabs + match list / work queue ──────────────────── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r border-slate-200">
          {/* ── Work Queue panel ─────────────────────────────────────────────── */}
          {mode === 'queue' && (
            <div className="flex-1 overflow-auto">
              {queueLoading && (
                <p className="text-sm text-slate-400 text-center py-16">Loading unlinked matches…</p>
              )}
              {!queueLoading && queueError && (
                <p className="text-sm text-red-500 text-center py-16">{queueError}</p>
              )}
              {!queueLoading && !queueError && queueGroups.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-16">No unlinked wrestlers — all matches are linked ✓</p>
              )}
              {!queueLoading && !queueError && queueGroups.map(group => {
                const isOpen = openSchools.has(group.schoolId)
                return (
                  <div key={group.schoolId} className="border-b border-slate-200">
                    <button
                      onClick={() => setOpenSchools(prev => {
                        const next = new Set(prev)
                        isOpen ? next.delete(group.schoolId) : next.add(group.schoolId)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{group.schoolName}</span>
                        {!group.isNj && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">OOS</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {group.slots.length} unlinked {isOpen ? '▲' : '▼'}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="divide-y divide-slate-100">
                        {group.slots.map(slot => (
                          <button
                            key={`${slot.matchId}-${slot.slot}`}
                            onClick={() => {
                              // Load the full match for editing — switch to meet view for this match
                              setMid(slot.meetId)
                              setMode('meet')
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-amber-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-mono text-slate-400 w-8 shrink-0">{slot.weightClass}</span>
                              <span className="text-xs text-slate-800 flex-1">
                                {slot.nameRaw ?? <span className="italic text-slate-400">no name</span>}
                              </span>
                              <span className="text-[10px] text-slate-400 shrink-0">{slot.meetLabel}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── By-Meet panel ─────────────────────────────────────────────────── */}
          {mode === 'meet' && <>
          {/* Filter tabs */}
          <div className="flex gap-1.5 px-4 py-2.5 border-b border-slate-100 bg-slate-50 shrink-0 flex-wrap">
            {(Object.keys(FILTER_LABELS) as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full border transition-colors ${
                  filter === f
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-300 hover:border-slate-500'
                }`}
              >
                {FILTER_LABELS[f]}
                <span className="text-[10px] tabular-nums text-slate-400">{counts[f]}</span>
              </button>
            ))}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`px-4 py-1.5 text-xs font-medium shrink-0 ${
              toast.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {toast.msg}
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-auto">
            {loading && (
              <p className="text-sm text-slate-400 text-center py-16">Loading matches…</p>
            )}
            {!loading && loadError && (
              <p className="text-sm text-red-500 text-center py-16">{loadError}</p>
            )}
            {!loading && !loadError && matches.length === 0 && mid && (
              <p className="text-sm text-slate-400 text-center py-16">No matches found for this meet</p>
            )}
            {!loading && !loadError && filteredMatches.length === 0 && matches.length > 0 && (
              <p className="text-sm text-slate-400 text-center py-16">No matches match this filter</p>
            )}

            {!loading && !loadError && filteredMatches.map(match => {
              const flags = matchFlags.get(match.id) ?? []
              const isSelected = selectedMatch?.id === match.id

              // Winner slot: 'a', 'b', or null
              const winnerSlot =
                match.winner_id && match.winner_id === match.wrestler_a_id ? 'a'
                : match.winner_id && match.winner_id === match.wrestler_b_id ? 'b'
                : null

              return (
                <button
                  key={match.id}
                  onClick={() => setSelectedMatch(isSelected ? null : match)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 border-l-4 ${
                    isSelected ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Weight header */}
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                        {match.weight_class} lb
                        {match.is_double_forfeit && (
                          <span className="ml-2 normal-case font-normal text-slate-400">double forfeit</span>
                        )}
                        {match.is_forfeit_win && (
                          <span className="ml-2 normal-case font-normal text-slate-400">forfeit win</span>
                        )}
                      </p>
                      {/* Slot A */}
                      <MatchSlotLine
                        name={match.wrestler_a_name}
                        nameRaw={match.wrestler_a_name_raw}
                        school={match.school_a_name}
                        hasLink={!!match.wrestler_a_id}
                        isStub={match.wrestler_a_stub}
                        isWinner={winnerSlot === 'a'}
                        isOos={!match.school_a_is_nj}
                      />
                      {/* Slot B */}
                      <MatchSlotLine
                        name={match.wrestler_b_name}
                        nameRaw={match.wrestler_b_name_raw}
                        school={match.school_b_name}
                        hasLink={!!match.wrestler_b_id}
                        isStub={match.wrestler_b_stub}
                        isWinner={winnerSlot === 'b'}
                        isOos={!match.school_b_is_nj}
                      />
                    </div>

                    {/* Result + flags */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {match.result_type && (
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {match.result_type}
                          {match.result_detail ? ` ${match.result_detail}` : ''}
                        </span>
                      )}
                      {flags.length > 0 && (
                        <div className="flex flex-wrap gap-1 justify-end">
                          {flags.map(f => (
                            <span
                              key={f}
                              className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${FLAG_BADGE[f]}`}
                            >
                              {FILTER_LABELS[f]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
          </>}
        </div>

        {/* ── Right: edit panel ─────────────────────────────────────────────── */}
        <div className="w-72 xl:w-80 overflow-y-auto shrink-0">
          <DualMatchEditPanel
            match={selectedMatch}
            onSaved={handleSaved}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </div>
  )
}

// ── Slot line (list view) ─────────────────────────────────────────────────────

function MatchSlotLine({
  name,
  nameRaw,
  school,
  hasLink,
  isStub,
  isWinner,
  isOos,
}: {
  name:     string | null
  nameRaw:  string | null
  school:   string | null
  hasLink:  boolean
  isStub:   boolean
  isWinner: boolean
  isOos?:   boolean
}) {
  // Resolved name from wrestler record takes priority.
  // If unlinked but raw name is present, show raw in muted style.
  // If both null (historical gap), show "—".
  const displayName = name ?? nameRaw
  const isRawFallback = !name && !!nameRaw

  return (
    <div className={`flex items-baseline gap-1 text-xs ${isWinner ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
      <span className={`truncate ${isStub ? 'text-violet-700' : isRawFallback ? 'text-slate-400 italic' : ''}`}>
        {displayName ?? '—'}
      </span>
      {school && (
        <span className="text-slate-400 font-normal text-[10px] shrink-0">({school})</span>
      )}
      {isOos && (
        <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded-full bg-purple-100 text-purple-700">OOS</span>
      )}
      {!hasLink && school && (
        <span className="shrink-0 text-[9px] font-semibold text-amber-600">NO LINK</span>
      )}
      {isStub && (
        <span className="shrink-0 text-[9px] font-semibold text-violet-600">STUB</span>
      )}
    </div>
  )
}

// ── Wrestler picker ───────────────────────────────────────────────────────────

type WrestlerOption = { wrestlerId: string; displayName: string; weights: number[] }

function WrestlerPicker({
  label,
  schoolId,
  schoolName,
  currentId,
  currentName,
  onSelect,
}: {
  label:       string
  schoolId:    number | null
  schoolName:  string | null
  currentId:   string | null
  currentName: string | null
  onSelect:    (w: WrestlerOption | null) => void
}) {
  const [roster, setRoster]   = useState<WrestlerOption[]>([])
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

  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-0.5">{label}</p>
      {!schoolId ? (
        <p className="text-xs text-slate-300 italic">OOS team — no roster</p>
      ) : loading ? (
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
          <option value="">{currentName ?? `(${schoolName ?? 'no school'}) — unlinked`}</option>
          {roster.map(w => (
            <option key={w.wrestlerId} value={w.wrestlerId}>
              {w.displayName} ({w.weights.join('/')})
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

// ── Edit panel ────────────────────────────────────────────────────────────────

const RESULT_TYPES = ['Fall', 'Dec', 'MD', 'TF', 'For', 'SV-1', 'UTB', 'MFFL', 'DQ', 'Inj']

function parseTime(s: string): number | null {
  const m = s.match(/^(\d+):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function DualMatchEditPanel({
  match,
  onSaved,
  onCancel,
}: {
  match:    AugmentedMatch | null
  onSaved:  (m: AugmentedMatch) => void
  onCancel: () => void
}) {
  const [wrestlerAId,    setWrestlerAId]    = useState<string | null>(null)
  const [wrestlerAName,  setWrestlerAName]  = useState<string | null>(null)
  const [wrestlerBId,    setWrestlerBId]    = useState<string | null>(null)
  const [wrestlerBName,  setWrestlerBName]  = useState<string | null>(null)
  const [winnerSlot,     setWinnerSlot]     = useState<'a' | 'b' | null>(null)
  const [resultType,     setResultType]     = useState<string>('')
  const [resultDetail,   setResultDetail]   = useState<string>('')
  const [fallTimeStr,    setFallTimeStr]    = useState<string>('')
  const [isDoubleForfeit, setIsDoubleForfeit] = useState(false)
  const [isForfeitWin,    setIsForfeitWin]    = useState(false)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string>('')

  // Sync form from selected match
  useEffect(() => {
    if (!match) return
    setWrestlerAId(match.wrestler_a_id)
    setWrestlerAName(match.wrestler_a_name)
    setWrestlerBId(match.wrestler_b_id)
    setWrestlerBName(match.wrestler_b_name)
    setWinnerSlot(
      match.winner_id && match.winner_id === match.wrestler_a_id ? 'a'
      : match.winner_id && match.winner_id === match.wrestler_b_id ? 'b'
      : null
    )
    setResultType(match.result_type ?? '')
    setResultDetail(match.result_detail ?? '')
    setFallTimeStr(match.fall_time_seconds != null ? formatTime(match.fall_time_seconds) : '')
    setIsDoubleForfeit(match.is_double_forfeit)
    setIsForfeitWin(match.is_forfeit_win)
    setError('')
  }, [match])

  const handleWrestlerA = useCallback((w: WrestlerOption | null) => {
    setWrestlerAId(w?.wrestlerId ?? null)
    setWrestlerAName(w?.displayName ?? null)
    // If winner was A and we change A, clear winner to avoid stale winner_id
    if (winnerSlot === 'a') setWinnerSlot(null)
  }, [winnerSlot])

  const handleWrestlerB = useCallback((w: WrestlerOption | null) => {
    setWrestlerBId(w?.wrestlerId ?? null)
    setWrestlerBName(w?.displayName ?? null)
    if (winnerSlot === 'b') setWinnerSlot(null)
  }, [winnerSlot])

  async function handleSave() {
    if (!match) return
    setSaving(true)
    setError('')

    const resolvedWinnerId =
      winnerSlot === 'a' ? wrestlerAId
      : winnerSlot === 'b' ? wrestlerBId
      : null

    const fallSec = resultType === 'Fall' && fallTimeStr ? parseTime(fallTimeStr) : null

    const payload = {
      id:                match.id,
      wrestler_a_id:     wrestlerAId,
      wrestler_b_id:     wrestlerBId,
      winner_id:         resolvedWinnerId,
      result_type:       resultType || null,
      result_detail:     resultDetail || null,
      fall_time_seconds: fallSec,
      is_double_forfeit: isDoubleForfeit,
      is_forfeit_win:    isForfeitWin,
    }

    try {
      const res = await fetch('/api/admin/update-dual-meet-match', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')

      // Merge DB result back with existing augmented fields so flags recompute
      onSaved({
        ...match,
        ...data.match,
        wrestler_a_name: wrestlerAName,
        wrestler_b_name: wrestlerBName,
        // Stub status may have changed if wrestler was re-linked; conservatively keep old values.
        // Full refresh on next dropdown change will correct them.
        wrestler_a_stub: wrestlerAId !== match.wrestler_a_id ? false : match.wrestler_a_stub,
        wrestler_b_stub: wrestlerBId !== match.wrestler_b_id ? false : match.wrestler_b_stub,
        wa_registered_school_id: match.wa_registered_school_id,
        wb_registered_school_id: match.wb_registered_school_id,
        school_a_name: match.school_a_name,
        school_b_name: match.school_b_name,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (!match) {
    return (
      <div className="p-6 text-center text-slate-400">
        <p className="text-lg font-medium">Select a match to edit</p>
      </div>
    )
  }

  const schoolAName = match.school_a_name ?? 'Team A'
  const schoolBName = match.school_b_name ?? 'Team B'
  const winnerALabel = wrestlerAName ?? schoolAName
  const winnerBLabel = wrestlerBName ?? schoolBName

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{match.weight_class} lb</h3>
        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{match.id}</p>
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{error}</div>
      )}

      {/* Forfeit toggles */}
      <div className="flex gap-3">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isDoubleForfeit}
            onChange={e => {
              setIsDoubleForfeit(e.target.checked)
              if (e.target.checked) setIsForfeitWin(false)
            }}
            className="accent-slate-700"
          />
          Double Forfeit
        </label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={isForfeitWin}
            onChange={e => {
              setIsForfeitWin(e.target.checked)
              if (e.target.checked) setIsDoubleForfeit(false)
            }}
            className="accent-slate-700"
          />
          Forfeit Win
        </label>
      </div>

      {/* Slot A */}
      <div className="border border-slate-100 rounded p-3 space-y-2 bg-slate-50">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          {schoolAName}
        </p>
        {!wrestlerAId && match.wrestler_a_name_raw && (
          <p className="text-[10px] text-slate-500">
            Raw: <span className="font-mono">{match.wrestler_a_name_raw}</span>
          </p>
        )}
        <WrestlerPicker
          label="Wrestler A"
          schoolId={match.school_a_id}
          schoolName={schoolAName}
          currentId={wrestlerAId}
          currentName={wrestlerAName}
          onSelect={handleWrestlerA}
        />
        {match.wrestler_a_stub && (
          <p className="text-[10px] text-violet-600">
            Stub name detected — wrestler record has an abbreviated first name
          </p>
        )}
      </div>

      {/* Slot B */}
      <div className="border border-slate-100 rounded p-3 space-y-2 bg-slate-50">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          {schoolBName}
        </p>
        {!wrestlerBId && match.wrestler_b_name_raw && (
          <p className="text-[10px] text-slate-500">
            Raw: <span className="font-mono">{match.wrestler_b_name_raw}</span>
          </p>
        )}
        <WrestlerPicker
          label="Wrestler B"
          schoolId={match.school_b_id}
          schoolName={schoolBName}
          currentId={wrestlerBId}
          currentName={wrestlerBName}
          onSelect={handleWrestlerB}
        />
        {match.wrestler_b_stub && (
          <p className="text-[10px] text-violet-600">
            Stub name detected — wrestler record has an abbreviated first name
          </p>
        )}
      </div>

      {/* School mismatch callout */}
      {((match.wa_registered_school_id !== null &&
         match.school_a_id !== null &&
         match.wa_registered_school_id !== match.school_a_id) ||
        (match.wb_registered_school_id !== null &&
         match.school_b_id !== null &&
         match.wb_registered_school_id !== match.school_b_id)) && (
        <div className="text-xs text-red-700 bg-red-50 rounded px-3 py-2 space-y-0.5">
          <p className="font-semibold">School mismatch</p>
          {match.wa_registered_school_id !== null &&
           match.school_a_id !== null &&
           match.wa_registered_school_id !== match.school_a_id && (
            <p>Wrestler A registered under school #{match.wa_registered_school_id}, match has #{match.school_a_id}</p>
          )}
          {match.wb_registered_school_id !== null &&
           match.school_b_id !== null &&
           match.wb_registered_school_id !== match.school_b_id && (
            <p>Wrestler B registered under school #{match.wb_registered_school_id}, match has #{match.school_b_id}</p>
          )}
        </div>
      )}

      {/* Result */}
      <div className="space-y-2">
        {/* Winner toggle */}
        <div>
          <p className="text-[10px] font-medium text-slate-500 mb-1">Winner</p>
          <div className="flex gap-2">
            {(['a', 'b'] as const).map(slot => (
              <button
                key={slot}
                onClick={() => setWinnerSlot(winnerSlot === slot ? null : slot)}
                className={`flex-1 text-xs py-1.5 rounded border transition-colors truncate px-1 ${
                  winnerSlot === slot
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {slot === 'a' ? winnerALabel : winnerBLabel}
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
            {RESULT_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
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

        {/* Score detail */}
        {resultType && resultType !== 'Fall' && resultType !== 'For' && resultType !== 'MFFL' && (
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
