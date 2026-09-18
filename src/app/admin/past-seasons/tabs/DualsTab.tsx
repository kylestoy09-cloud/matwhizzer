'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { PastSeason } from '../PastSeasonsClient'

// ── Types ─────────────────────────────────────────────────────────────────────

type MeetRow = {
  id: string
  meet_date: string
  gender: string
  team1_name: string | null
  team2_name: string | null
  team1_school_id: number | null
  team2_school_id: number | null
  team1_score: number | null
  team2_score: number | null
}

type AugmentedMatch = {
  id: string
  dual_meet_id: string
  weight_class: number
  wrestler_a_id: string | null
  wrestler_b_id: string | null
  winner_id: string | null
  result_type: string | null
  result_detail: string | null
  fall_time_seconds: number | null
  is_double_forfeit: boolean
  is_forfeit_win: boolean
  wrestler_a_name: string | null
  wrestler_b_name: string | null
  school_a_name: string | null
  school_b_name: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function fmtScore(m: MeetRow) {
  if (m.team1_score === null && m.team2_score === null) return null
  return `${m.team1_score ?? '?'} – ${m.team2_score ?? '?'}`
}

function parseTime(s: string): number | null {
  const match = s.match(/^(\d+):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

function formatTime(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

const RESULT_TYPES = ['Fall', 'Dec', 'MD', 'TF', 'For', 'SV-1', 'UTB', 'MFFL', 'DQ', 'Inj']

// ── Main component ─────────────────────────────────────────────────────────────

export function DualsTab({ season, gender }: { season: PastSeason; gender: 'M' | 'F' }) {
  const [view, setView]           = useState<'date' | 'school'>('date')
  const [meets, setMeets]         = useState<MeetRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [schoolSearch, setSchoolSearch] = useState('')

  const [selectedMeetId, setSelectedMeetId]   = useState<string | null>(null)
  const [matches, setMatches]                 = useState<AugmentedMatch[]>([])
  const [matchesLoading, setMatchesLoading]   = useState(false)
  const [selectedMatch, setSelectedMatch]     = useState<AugmentedMatch | null>(null)

  const [score1, setScore1]       = useState('')
  const [score2, setScore2]       = useState('')
  const [scoreSaving, setScoreSaving] = useState(false)
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null)

  // Load meets for this season
  useEffect(() => {
    setLoading(true)
    setError('')
    setMeets([])
    setSelectedMeetId(null)
    setMatches([])
    setSelectedMatch(null)
    fetch(`/api/admin/dual-meets?gender=${gender}&seasonId=${season.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setMeets(d.meets ?? [])
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [season.id, gender])

  // Load matches when a meet is selected
  useEffect(() => {
    if (!selectedMeetId) { setMatches([]); setSelectedMatch(null); return }
    setMatchesLoading(true)
    setMatches([])
    setSelectedMatch(null)
    fetch(`/api/admin/dual-audit?mid=${selectedMeetId}&gender=${gender}`)
      .then(r => r.json())
      .then(d => setMatches(d.matches ?? []))
      .catch(() => {})
      .finally(() => setMatchesLoading(false))
  }, [selectedMeetId, gender])

  // Sync score fields when meet changes
  useEffect(() => {
    const m = meets.find(m => m.id === selectedMeetId)
    setScore1(m?.team1_score != null ? String(m.team1_score) : '')
    setScore2(m?.team2_score != null ? String(m.team2_score) : '')
  }, [selectedMeetId, meets])

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function selectMeet(id: string) {
    setSelectedMeetId(prev => prev === id ? null : id)
  }

  async function saveScore() {
    if (!selectedMeetId) return
    setScoreSaving(true)
    try {
      const res = await fetch('/api/admin/dual-meets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedMeetId, gender, team1_score: score1, team2_score: score2 }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Save failed')
      setMeets(prev => prev.map(m =>
        m.id === selectedMeetId
          ? { ...m, team1_score: score1 === '' ? null : Number(score1), team2_score: score2 === '' ? null : Number(score2) }
          : m
      ))
      showToast('Score saved', true)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setScoreSaving(false)
    }
  }

  const handleMatchSaved = useCallback((updated: AugmentedMatch) => {
    setMatches(prev => prev.map(m => m.id === updated.id ? { ...m, ...updated } : m))
    setSelectedMatch(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    showToast('Match saved', true)
  }, [])

  // ── By-date grouping ────────────────────────────────────────────────────────
  const byDate = useMemo(() => {
    const map = new Map<string, MeetRow[]>()
    for (const m of meets) {
      const list = map.get(m.meet_date) ?? []
      list.push(m)
      map.set(m.meet_date, list)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [meets])

  // ── By-school index ─────────────────────────────────────────────────────────
  const bySchool = useMemo(() => {
    const map = new Map<string, { name: string; meets: MeetRow[] }>()
    for (const m of meets) {
      for (const [sid, name] of [
        [String(m.team1_school_id), m.team1_name],
        [String(m.team2_school_id), m.team2_name],
      ] as [string, string | null][]) {
        if (!sid || sid === 'null') continue
        const entry = map.get(sid) ?? { name: name ?? sid, meets: [] }
        entry.meets.push(m)
        map.set(sid, entry)
      }
    }
    return [...map.entries()]
      .map(([id, val]) => ({ id, name: val.name, meets: val.meets }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [meets])

  const [openDates, setOpenDates]     = useState<Set<string>>(new Set())
  const [openSchools, setOpenSchools] = useState<Set<string>>(new Set())

  const filteredSchools = useMemo(() => {
    if (!schoolSearch.trim()) return bySchool
    const q = schoolSearch.trim().toLowerCase()
    return bySchool.filter(s => s.name.toLowerCase().includes(q))
  }, [bySchool, schoolSearch])

  const selectedMeet = meets.find(m => m.id === selectedMeetId) ?? null

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return <p className="text-sm text-slate-400 py-8 text-center">Loading dual meets…</p>
  if (error)   return <p className="text-sm text-red-500 py-8 text-center">{error}</p>
  if (meets.length === 0) return (
    <p className="text-sm text-slate-400 py-8 text-center">
      No dual meets found for {season.year_label}.
    </p>
  )

  return (
    <div className="flex h-full" style={{ minHeight: 600 }}>

      {/* ── Left: meet list ─────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-slate-100 flex flex-col overflow-hidden">

        {/* View switcher */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['date', 'school'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                view === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {v === 'date' ? 'By Date' : 'By School'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── By Date ───────────────────────────────────────────────────── */}
          {view === 'date' && byDate.map(([date, dateMeets]) => {
            const isOpen = openDates.has(date)
            return (
              <div key={date} className="border-b border-slate-100">
                <button
                  onClick={() => setOpenDates(prev => {
                    const next = new Set(prev)
                    isOpen ? next.delete(date) : next.add(date)
                    return next
                  })}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <span className="text-xs font-semibold text-slate-700">{fmtDate(date)}</span>
                  <span className="text-[10px] text-slate-400">{dateMeets.length} meet{dateMeets.length !== 1 ? 's' : ''} {isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && dateMeets.map(m => (
                  <MeetListRow
                    key={m.id}
                    meet={m}
                    selected={m.id === selectedMeetId}
                    onClick={() => selectMeet(m.id)}
                  />
                ))}
              </div>
            )
          })}

          {/* ── By School ─────────────────────────────────────────────────── */}
          {view === 'school' && (
            <>
              <div className="p-2 border-b border-slate-100 shrink-0">
                <input
                  type="text"
                  placeholder="Search school…"
                  value={schoolSearch}
                  onChange={e => setSchoolSearch(e.target.value)}
                  className="w-full text-xs border border-slate-200 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>
              {filteredSchools.map(school => {
                const isOpen = openSchools.has(school.id)
                return (
                  <div key={school.id} className="border-b border-slate-100">
                    <button
                      onClick={() => setOpenSchools(prev => {
                        const next = new Set(prev)
                        isOpen ? next.delete(school.id) : next.add(school.id)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                    >
                      <span className="text-xs font-semibold text-slate-700">{school.name}</span>
                      <span className="text-[10px] text-slate-400">{school.meets.length} {isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && school.meets.map(m => (
                      <MeetListRow
                        key={m.id}
                        meet={m}
                        selected={m.id === selectedMeetId}
                        perspectiveSchoolId={Number(school.id)}
                        onClick={() => selectMeet(m.id)}
                      />
                    ))}
                  </div>
                )
              })}
            </>
          )}

        </div>

        {/* Footer count */}
        <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 shrink-0">
          {meets.length} dual meets · {season.year_label}
        </div>
      </div>

      {/* ── Right: meet detail ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {!selectedMeet ? (
          <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
            Select a dual meet
          </div>
        ) : (
          <>
            {/* Meet detail + match list */}
            <div className="flex-1 overflow-y-auto border-r border-slate-100">

              {/* Toast */}
              {toast && (
                <div className={`px-4 py-1.5 text-xs font-medium ${toast.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {toast.msg}
                </div>
              )}

              {/* Meet header */}
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] text-slate-400 mb-1">{fmtDate(selectedMeet.meet_date)}</p>
                <p className="text-sm font-bold text-slate-800">
                  {selectedMeet.team1_name ?? '—'} vs {selectedMeet.team2_name ?? '—'}
                </p>
              </div>

              {/* Score editor */}
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Team Score</p>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-slate-500 font-medium w-28 truncate">{selectedMeet.team1_name ?? 'Team 1'}</div>
                  <input
                    type="number"
                    value={score1}
                    onChange={e => setScore1(e.target.value)}
                    placeholder="—"
                    className="w-16 text-sm border border-slate-200 px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <span className="text-slate-300 text-sm">–</span>
                  <input
                    type="number"
                    value={score2}
                    onChange={e => setScore2(e.target.value)}
                    placeholder="—"
                    className="w-16 text-sm border border-slate-200 px-2 py-1 text-center focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                  <div className="text-[10px] text-slate-500 font-medium w-28 truncate">{selectedMeet.team2_name ?? 'Team 2'}</div>
                  <button
                    onClick={saveScore}
                    disabled={scoreSaving}
                    className="ml-auto px-3 py-1 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors"
                  >
                    {scoreSaving ? 'Saving…' : 'Save Score'}
                  </button>
                </div>
              </div>

              {/* Matches */}
              <div>
                <p className="px-5 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100 bg-slate-50">
                  {matchesLoading ? 'Loading matches…' : `${matches.length} weight classes`}
                </p>
                {!matchesLoading && matches.map(match => (
                  <button
                    key={match.id}
                    onClick={() => setSelectedMatch(prev => prev?.id === match.id ? null : match)}
                    className={`w-full text-left px-5 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors border-l-4 ${
                      selectedMatch?.id === match.id ? 'border-l-slate-800 bg-slate-50' : 'border-l-transparent'
                    }`}
                  >
                    <MatchRow match={match} />
                  </button>
                ))}
              </div>
            </div>

            {/* Match edit panel */}
            <div className="w-64 shrink-0 overflow-y-auto">
              <MatchEditPanel
                match={selectedMatch}
                onSaved={handleMatchSaved}
                onCancel={() => setSelectedMatch(null)}
                gender={gender}
              />
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// ── Meet list row ─────────────────────────────────────────────────────────────

function MeetListRow({
  meet,
  selected,
  perspectiveSchoolId,
  onClick,
}: {
  meet: MeetRow
  selected: boolean
  perspectiveSchoolId?: number
  onClick: () => void
}) {
  const score = fmtScore(meet)

  let team1 = meet.team1_name ?? '—'
  let team2 = meet.team2_name ?? '—'
  let s1    = meet.team1_score
  let s2    = meet.team2_score

  // In school view, show "vs Opponent" with perspective school first
  if (perspectiveSchoolId !== undefined) {
    if (meet.team2_school_id === perspectiveSchoolId) {
      ;[team1, team2] = [team2, team1];
      [s1, s2] = [s2, s1]
    }
    team2 = `vs ${team2}`
  }

  const won  = s1 !== null && s2 !== null && s1 > s2
  const lost = s1 !== null && s2 !== null && s1 < s2

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-2 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 border-l-4 ${
        selected ? 'border-l-slate-800 bg-blue-50' : 'border-l-transparent'
      }`}
    >
      <div className="min-w-0 flex-1">
        {perspectiveSchoolId !== undefined ? (
          <p className="text-xs text-slate-700 truncate">{team2}</p>
        ) : (
          <>
            <p className="text-[11px] text-slate-700 truncate">{team1}</p>
            <p className="text-[11px] text-slate-500 truncate">{team2}</p>
          </>
        )}
        {perspectiveSchoolId !== undefined && (
          <p className="text-[10px] text-slate-400">{fmtDate(meet.meet_date)}</p>
        )}
      </div>
      {score ? (
        <span className={`text-xs font-semibold tabular-nums shrink-0 ${
          won ? 'text-green-600' : lost ? 'text-red-500' : 'text-slate-500'
        }`}>
          {perspectiveSchoolId !== undefined ? `${s1 ?? '?'}–${s2 ?? '?'}` : score}
        </span>
      ) : (
        <span className="text-[10px] text-slate-300 shrink-0">no score</span>
      )}
    </button>
  )
}

// ── Match list row ─────────────────────────────────────────────────────────────

function MatchRow({ match }: { match: AugmentedMatch }) {
  const winnerSlot =
    match.winner_id && match.winner_id === match.wrestler_a_id ? 'a'
    : match.winner_id && match.winner_id === match.wrestler_b_id ? 'b'
    : null

  const special = match.is_double_forfeit ? 'Double Forfeit'
    : match.is_forfeit_win ? 'Forfeit Win'
    : null

  return (
    <div className="flex items-start gap-3">
      <span className="text-[10px] font-mono text-slate-400 w-8 shrink-0 mt-0.5">{match.weight_class}</span>
      <div className="flex-1 min-w-0">
        {special ? (
          <p className="text-xs text-slate-400 italic">{special}</p>
        ) : (
          <>
            <div className="flex items-baseline gap-1">
              <span className={`text-xs truncate ${winnerSlot === 'a' ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                {match.wrestler_a_name ?? <span className="italic text-slate-300">—</span>}
              </span>
              <span className="text-slate-300 text-[10px]">({match.school_a_name ?? '?'})</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-xs truncate ${winnerSlot === 'b' ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                {match.wrestler_b_name ?? <span className="italic text-slate-300">—</span>}
              </span>
              <span className="text-slate-300 text-[10px]">({match.school_b_name ?? '?'})</span>
            </div>
          </>
        )}
      </div>
      {match.result_type && (
        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 tabular-nums">
          {match.result_type}{match.result_detail ? ` ${match.result_detail}` : ''}
        </span>
      )}
    </div>
  )
}

// ── Match edit panel ──────────────────────────────────────────────────────────

function MatchEditPanel({
  match,
  gender,
  onSaved,
  onCancel,
}: {
  match: AugmentedMatch | null
  gender: 'M' | 'F'
  onSaved: (m: AugmentedMatch) => void
  onCancel: () => void
}) {
  const [winnerSlot,   setWinnerSlot]   = useState<'a' | 'b' | null>(null)
  const [resultType,   setResultType]   = useState('')
  const [resultDetail, setResultDetail] = useState('')
  const [fallTimeStr,  setFallTimeStr]  = useState('')
  const [isDoubleForfeit, setIsDoubleForfeit] = useState(false)
  const [isForfeitWin,    setIsForfeitWin]    = useState(false)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  useEffect(() => {
    if (!match) return
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

  async function handleSave() {
    if (!match) return
    setSaving(true)
    setError('')
    const resolvedWinnerId =
      winnerSlot === 'a' ? match.wrestler_a_id
      : winnerSlot === 'b' ? match.wrestler_b_id
      : null
    const fallSec = resultType === 'Fall' && fallTimeStr ? parseTime(fallTimeStr) : null

    try {
      const res = await fetch('/api/admin/update-dual-meet-match', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                match.id,
          gender,
          wrestler_a_id:     match.wrestler_a_id,
          wrestler_b_id:     match.wrestler_b_id,
          winner_id:         resolvedWinnerId,
          result_type:       resultType || null,
          result_detail:     resultDetail || null,
          fall_time_seconds: fallSec,
          is_double_forfeit: isDoubleForfeit,
          is_forfeit_win:    isForfeitWin,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      onSaved({ ...match, ...data.match, wrestler_a_name: match.wrestler_a_name, wrestler_b_name: match.wrestler_b_name })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (!match) {
    return (
      <div className="p-4 text-center text-slate-300 text-xs mt-8">
        Select a match to edit
      </div>
    )
  }

  const nameA = match.wrestler_a_name ?? match.school_a_name ?? 'Wrestler A'
  const nameB = match.wrestler_b_name ?? match.school_b_name ?? 'Wrestler B'

  return (
    <div className="p-4 space-y-4">
      <div>
        <p className="text-xs font-bold text-slate-800">{match.weight_class} lb</p>
        <p className="text-[10px] text-slate-400">{match.school_a_name} vs {match.school_b_name}</p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2">{error}</p>}

      <div className="flex gap-2">
        <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
          <input type="checkbox" checked={isDoubleForfeit} onChange={e => { setIsDoubleForfeit(e.target.checked); if (e.target.checked) setIsForfeitWin(false) }} className="accent-slate-700" />
          Dbl Forfeit
        </label>
        <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer">
          <input type="checkbox" checked={isForfeitWin} onChange={e => { setIsForfeitWin(e.target.checked); if (e.target.checked) setIsDoubleForfeit(false) }} className="accent-slate-700" />
          Forfeit Win
        </label>
      </div>

      <div>
        <p className="text-[10px] font-medium text-slate-500 mb-1">Winner</p>
        <div className="flex gap-1">
          {(['a', 'b'] as const).map(slot => (
            <button
              key={slot}
              onClick={() => setWinnerSlot(winnerSlot === slot ? null : slot)}
              className={`flex-1 text-[11px] py-1.5 border truncate px-1 transition-colors ${
                winnerSlot === slot ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {slot === 'a' ? nameA : nameB}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Result</label>
        <select
          value={resultType}
          onChange={e => setResultType(e.target.value)}
          className="w-full text-xs border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="">—</option>
          {RESULT_TYPES.map(rt => <option key={rt} value={rt}>{rt}</option>)}
        </select>
      </div>

      {resultType === 'Fall' && (
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Fall time (M:SS)</label>
          <input type="text" placeholder="1:23" value={fallTimeStr} onChange={e => setFallTimeStr(e.target.value)}
            className="w-full text-xs border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        </div>
      )}

      {resultType && resultType !== 'Fall' && resultType !== 'For' && resultType !== 'MFFL' && (
        <div>
          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Score</label>
          <input type="text" placeholder="e.g. 8-4" value={resultDetail} onChange={e => setResultDetail(e.target.value)}
            className="w-full text-xs border border-slate-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400" />
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-slate-900 text-white text-xs font-semibold py-2 hover:bg-slate-700 disabled:opacity-50 transition-colors">
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} className="px-3 py-2 text-xs text-slate-400 hover:text-slate-700">
          ✕
        </button>
      </div>
    </div>
  )
}
