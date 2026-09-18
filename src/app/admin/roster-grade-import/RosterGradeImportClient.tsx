'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'

// ── Types ──────────────────────────────────────────────────────────────────────

type School = {
  school_name_raw: string
  school_id: number | null
  total: number
  pending: number
  school_matched: number
  wrestler_matched: number
  confirmed: number
  no_match: number
  skipped: number
  proposal: {
    schoolId: number
    displayName: string
    confidence: string
    alternates?: { schoolId: number; displayName: string; confidence: string }[]
  } | null
}

type WrestlerMatch = {
  wrestlerId: string
  displayName: string
  currentGrade: string | null
  score: number
}

type TrackEntry = {
  id: string
  first_name_raw: string
  last_name_raw: string
  weight_class: number | null
  grade: string
  status: string
  wrestler_id: string | null
  matches: WrestlerMatch[]
  autoMatch: WrestlerMatch | null
  matchedWrestler: { id: string; first_name: string; last_name: string; grade: string | null; grade_confirmed_source: string | null } | null
}

type Phase = 'schools' | 'wrestlers' | 'confirm'

type ProgramSchool = { id: number; display_name: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function confidenceBadge(confidence: string) {
  const map: Record<string, string> = {
    exact: 'bg-green-100 text-green-800',
    high: 'bg-blue-100 text-blue-800',
    low: 'bg-yellow-100 text-yellow-800',
    oos: 'bg-purple-100 text-purple-800',
    none: 'bg-slate-100 text-slate-500',
  }
  return map[confidence] ?? 'bg-slate-100 text-slate-500'
}

function pct(score: number) {
  return `${Math.round(score * 100)}%`
}

// ── School Picker ──────────────────────────────────────────────────────────────

function SchoolPicker({
  programSchools,
  onSelect,
}: {
  programSchools: ProgramSchool[]
  onSelect: (school: ProgramSchool) => void
}) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')

  const filtered = query.trim().length === 0
    ? programSchools.slice(0, 30)
    : programSchools.filter(s =>
        s.display_name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 30)

  if (!open) {
    return (
      <button
        className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
        onClick={() => setOpen(true)}
      >
        Select school…
      </button>
    )
  }

  return (
    <div className="relative">
      <input
        autoFocus
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search schools…"
        className="text-xs border border-slate-300 rounded px-2 py-1 w-48 outline-none focus:border-blue-500"
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {filtered.length > 0 && (
        <div className="absolute z-10 top-full left-0 mt-0.5 w-64 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(s => (
            <button
              key={s.id}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-slate-700"
              onMouseDown={() => { onSelect(s); setOpen(false); setQuery('') }}
            >
              {s.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function RosterGradeImportClient() {
  const router = useRouter()
  const { gender } = useAdminGender()

  useEffect(() => {
    if (gender === 'F') router.replace('/admin')
  }, [gender, router])

  const [phase, setPhase] = useState<Phase>('schools')
  const [schools, setSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [programSchools, setProgramSchools] = useState<ProgramSchool[]>([])

  // School phase: track pending edits
  const [schoolEdits, setSchoolEdits] = useState<Record<string, number | null>>({})
  const [savingSchools, setSavingSchools] = useState(false)

  // Wrestler phase
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [entries, setEntries] = useState<TrackEntry[]>([])
  const [liveWrestlers, setLiveWrestlers] = useState<{ id: string; first_name: string; last_name: string; grade: string | null; grade_confirmed_source: string | null }[]>([])
  const [liveCount, setLiveCount] = useState(0)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [wrestlerEdits, setWrestlerEdits] = useState<Record<string, { wrestler_id: string | null; status: string }>>({})
  const [savingWrestlers, setSavingWrestlers] = useState(false)

  // Confirm phase
  const [confirmStats, setConfirmStats] = useState<{ total: number; byGrade: Record<string, number> } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<string | null>(null)

  // School filter
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'unmatched' | 'matched'>('all')

  // ── Load schools ─────────────────────────────────────────────────────────────

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true)
    setSchoolsError(null)
    try {
      const [rosterRes, programRes] = await Promise.all([
        fetch('/api/admin/roster-grade-import/schools'),
        fetch('/api/admin/roster-grade-import/schools?list=true'),
      ])
      if (!rosterRes.ok) throw new Error(await rosterRes.text())
      const { schools: data } = await rosterRes.json()
      setSchools(data)
      if (programRes.ok) {
        const { schools: prog } = await programRes.json()
        setProgramSchools(prog ?? [])
      }
    } catch (e: unknown) {
      setSchoolsError(e instanceof Error ? e.message : String(e))
    } finally {
      setSchoolsLoading(false)
    }
  }, [])

  useEffect(() => { loadSchools() }, [loadSchools])

  // ── Load confirm stats ────────────────────────────────────────────────────────

  const loadConfirmStats = useCallback(async () => {
    const res = await fetch('/api/admin/roster-grade-import/confirm')
    if (res.ok) setConfirmStats(await res.json())
  }, [])

  useEffect(() => {
    if (phase === 'confirm') loadConfirmStats()
  }, [phase, loadConfirmStats])

  // ── Save school matches ───────────────────────────────────────────────────────

  async function saveSchoolMatches() {
    const payload = Object.entries(schoolEdits).map(([school_name_raw, school_id]) => ({
      school_name_raw,
      school_id,
    })).filter(e => e.school_id !== null)

    if (payload.length === 0) return

    setSavingSchools(true)
    try {
      const res = await fetch('/api/admin/roster-grade-import/schools', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      setSchoolEdits({})
      await loadSchools()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingSchools(false)
    }
  }

  async function skipSchool(school_name_raw: string) {
    await fetch('/api/admin/roster-grade-import/schools', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ school_name_raw, action: 'skip' }]),
    })
    await loadSchools()
  }

  // ── Load wrestler entries ─────────────────────────────────────────────────────

  async function openSchool(school: School) {
    setSelectedSchool(school)
    setWrestlerEdits({})
    setEntriesLoading(true)
    setPhase('wrestlers')
    try {
      const res = await fetch(`/api/admin/roster-grade-import/wrestlers?school_id=${school.school_id}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setEntries(data.entries)
      setLiveWrestlers(data.liveWrestlers ?? [])
      setLiveCount(data.liveCount)
      // Auto-populate edits for high-confidence auto-matches not yet saved,
      // and for school_matched entries with zero candidates (definite no-match).
      const autoEdits: typeof wrestlerEdits = {}
      for (const e of data.entries as TrackEntry[]) {
        if (e.status === 'school_matched' && e.autoMatch) {
          autoEdits[e.id] = { wrestler_id: e.autoMatch.wrestlerId, status: 'wrestler_matched' }
        } else if (e.status === 'school_matched' && !e.autoMatch && (e.matches ?? []).length === 0) {
          autoEdits[e.id] = { wrestler_id: null, status: 'no_match' }
        }
      }
      setWrestlerEdits(autoEdits)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
      setPhase('schools')
    } finally {
      setEntriesLoading(false)
    }
  }

  // ── Save wrestler matches ─────────────────────────────────────────────────────

  async function saveWrestlerMatches() {
    const payload = Object.entries(wrestlerEdits).map(([id, v]) => ({ id, ...v }))
    if (payload.length === 0) return

    setSavingWrestlers(true)
    try {
      const res = await fetch('/api/admin/roster-grade-import/wrestlers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(await res.text())
      // Reload entries to reflect saved state
      const school = selectedSchool!
      const r2 = await fetch(`/api/admin/roster-grade-import/wrestlers?school_id=${school.school_id}`)
      const data = await r2.json()
      setEntries(data.entries)
      setLiveWrestlers(data.liveWrestlers ?? [])
      setLiveCount(data.liveCount)
      setWrestlerEdits({})
      // Refresh school list in background
      loadSchools()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingWrestlers(false)
    }
  }

  // ── Confirm grades ────────────────────────────────────────────────────────────

  async function runConfirm() {
    setConfirming(true)
    setConfirmResult(null)
    try {
      const res = await fetch('/api/admin/roster-grade-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setConfirmResult(`Done — ${data.updated} grades written to wrestlers table.`)
      await loadConfirmStats()
    } catch (e: unknown) {
      setConfirmResult(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setConfirming(false)
    }
  }

  // ── Computed summaries ────────────────────────────────────────────────────────

  const totalSchools       = schools.length
  const matchedSchools     = schools.filter(s => s.school_id).length
  const skippedSchools     = schools.filter(s => s.skipped > 0 && !s.school_id).length
  const totalWrestlerMatched = schools.reduce((n, s) => n + s.wrestler_matched + s.confirmed, 0)

  const visibleSchools = schools.filter(s => {
    if (schoolFilter === 'unmatched') return !s.school_id
    if (schoolFilter === 'matched')   return !!s.school_id
    return true
  })

  // ── Render ────────────────────────────────────────────────────────────────────

  // ── Phase: Schools ──────────────────────────────────────────────────────────

  if (phase === 'schools') {
    return (
      <div>
        {/* Summary bar */}
        <div className="flex gap-6 mb-6 text-sm text-slate-600">
          <span><strong className="text-slate-900">{totalSchools}</strong> schools</span>
          <span><strong className="text-slate-900">{matchedSchools}</strong> matched</span>
          <span><strong className="text-slate-900">{totalSchools - matchedSchools - skippedSchools}</strong> unmatched</span>
          <span><strong className="text-slate-900">{totalWrestlerMatched}</strong> wrestlers matched</span>
          <button
            className="ml-auto px-3 py-1 rounded bg-slate-900 text-white text-xs font-medium disabled:opacity-40"
            onClick={() => setPhase('confirm')}
          >
            Go to Confirm →
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'unmatched', 'matched'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSchoolFilter(f)}
              className={`px-3 py-1 rounded text-xs font-medium ${schoolFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
          {Object.keys(schoolEdits).length > 0 && (
            <button
              disabled={savingSchools}
              onClick={saveSchoolMatches}
              className="ml-auto px-3 py-1 rounded bg-green-700 text-white text-xs font-medium disabled:opacity-40"
            >
              {savingSchools ? 'Saving…' : `Save ${Object.keys(schoolEdits).length} match${Object.keys(schoolEdits).length !== 1 ? 'es' : ''}`}
            </button>
          )}
        </div>

        {schoolsLoading && <p className="text-sm text-slate-500">Loading…</p>}
        {schoolsError  && <p className="text-sm text-red-600">{schoolsError}</p>}

        {!schoolsLoading && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                  <th className="px-3 py-1 font-medium">Track Name</th>
                  <th className="px-3 py-1 font-medium">Total</th>
                  <th className="px-3 py-1 font-medium">Status</th>
                  <th className="px-3 py-1 font-medium">Auto-Match / Matched School</th>
                  <th className="px-3 py-1 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSchools.map(school => {
                  const hasEdit = schoolEdits[school.school_name_raw] !== undefined
                  const editId  = schoolEdits[school.school_name_raw]

                  const statusSummary = [
                    school.confirmed    > 0 ? `${school.confirmed} confirmed` : null,
                    school.wrestler_matched > 0 ? `${school.wrestler_matched} wm` : null,
                    school.school_matched > 0 ? `${school.school_matched} sm` : null,
                    school.pending      > 0 ? `${school.pending} pending` : null,
                    school.no_match     > 0 ? `${school.no_match} no-match` : null,
                    school.skipped      > 0 ? `${school.skipped} skipped` : null,
                  ].filter(Boolean).join(', ')

                  const isSkipped    = school.skipped === school.total && !school.school_id
                  const isFullyDone  = school.school_id && school.pending === 0 && school.school_matched === 0

                  return (
                    <tr
                      key={school.school_name_raw}
                      className={`border-b border-slate-100 ${isSkipped ? 'opacity-40' : ''}`}
                    >
                      <td className="px-3 py-1 font-mono text-xs text-slate-700">{school.school_name_raw}</td>
                      <td className="px-3 py-1 text-slate-600">{school.total}</td>
                      <td className="px-3 py-1 text-slate-500 text-xs">{statusSummary}</td>
                      <td className="px-3 py-1">
                        {school.school_id ? (
                          <span className="text-green-700 text-xs">
                            {programSchools.find(p => p.id === school.school_id)?.display_name ?? `ID ${school.school_id}`}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {school.proposal && school.proposal.displayName && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${confidenceBadge(school.proposal.confidence)}`}>
                                  {school.proposal.confidence}
                                </span>
                                <span className="text-xs text-slate-700">{school.proposal.displayName}</span>
                                <button
                                  className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white"
                                  onClick={() => setSchoolEdits(p => ({ ...p, [school.school_name_raw]: school.proposal!.schoolId }))}
                                >
                                  Accept
                                </button>
                              </div>
                            )}
                            {school.proposal?.alternates && school.proposal.alternates.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {school.proposal.alternates.slice(0, 2).map(alt => (
                                  <button
                                    key={alt.schoolId}
                                    className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                                    onClick={() => setSchoolEdits(p => ({ ...p, [school.school_name_raw]: alt.schoolId }))}
                                  >
                                    {alt.displayName} ({alt.confidence})
                                  </button>
                                ))}
                              </div>
                            )}
                            {!hasEdit && (
                              <SchoolPicker
                                programSchools={programSchools}
                                onSelect={s => setSchoolEdits(p => ({ ...p, [school.school_name_raw]: s.id }))}
                              />
                            )}
                          </div>
                        )}
                        {hasEdit && (
                          <div className="mt-1 text-xs text-green-700 font-medium">
                            → {programSchools.find(p => p.id === editId)?.display_name ?? `ID ${editId}`}
                            <button className="ml-2 text-slate-400" onClick={() => setSchoolEdits(p => { const n = {...p}; delete n[school.school_name_raw]; return n })}>✕</button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1">
                        <div className="flex gap-1 flex-wrap">
                          {school.school_id && !isFullyDone && (
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-slate-800 text-white"
                              onClick={() => openSchool(school)}
                            >
                              Match Wrestlers →
                            </button>
                          )}
                          {school.school_id && isFullyDone && (
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600"
                              onClick={() => openSchool(school)}
                            >
                              Review
                            </button>
                          )}
                          {!school.school_id && !isSkipped && (
                            <button
                              className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500"
                              onClick={() => skipSchool(school.school_name_raw)}
                            >
                              Skip
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Phase: Wrestlers ────────────────────────────────────────────────────────

  if (phase === 'wrestlers') {
    const pendingEdits = Object.keys(wrestlerEdits).length

    // Partition entries into sections
    const autoMatched  = entries.filter(e =>
      (e.status === 'wrestler_matched' && !wrestlerEdits[e.id]) ||
      (e.status === 'school_matched'   && wrestlerEdits[e.id]?.status === 'wrestler_matched') ||
      (e.status === 'school_matched'   && !wrestlerEdits[e.id] && e.autoMatch)
    )
    const needsReview  = entries.filter(e =>
      e.status === 'school_matched' && !wrestlerEdits[e.id] && !e.autoMatch
    )
    const noMatchEntries = entries.filter(e =>
      (e.status === 'no_match' && !wrestlerEdits[e.id]) ||
      (wrestlerEdits[e.id]?.status === 'no_match')
    )
    const confirmed = entries.filter(e => e.status === 'confirmed')

    // Live wrestlers not referenced by any entry or edit
    const matchedWrestlerIds = new Set([
      ...entries.map(e => e.wrestler_id).filter(Boolean),
      ...Object.values(wrestlerEdits).map(v => v.wrestler_id).filter(Boolean),
    ])
    const unmatchedLive = liveWrestlers.filter(w => !matchedWrestlerIds.has(w.id))

    function gradeBadge(grade: string | null) {
      if (!grade) return <span className="text-xs text-slate-400">—</span>
      const cls = grade === 'Sr' ? 'bg-slate-200 text-slate-700' :
                  grade === 'Jr' ? 'bg-blue-100 text-blue-700'   :
                  grade === 'So' ? 'bg-green-100 text-green-700' :
                                   'bg-yellow-100 text-yellow-700'
      return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{grade}</span>
    }

    return (
      <div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            className="text-sm text-slate-500 hover:text-slate-900"
            onClick={() => { setPhase('schools'); setSelectedSchool(null); setEntries([]); setLiveWrestlers([]) }}
          >
            ← Schools
          </button>
          <h2 className="text-lg font-semibold text-slate-900">{selectedSchool?.school_name_raw}</h2>
          <span className="text-sm text-slate-500">{entries.length} import · {liveCount} in system</span>
          {pendingEdits > 0 && (
            <button
              disabled={savingWrestlers}
              onClick={saveWrestlerMatches}
              className="ml-auto px-3 py-1 rounded bg-green-700 text-white text-sm font-medium disabled:opacity-40"
            >
              {savingWrestlers ? 'Saving…' : `Save ${pendingEdits} edit${pendingEdits !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {entriesLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!entriesLoading && (
          <div className="space-y-8">

            {/* ── Section 1: Auto-matched ─────────────────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Auto-matched ({autoMatched.length + confirmed.length})
              </h3>
              {autoMatched.length === 0 && confirmed.length === 0 && (
                <p className="text-xs text-slate-400 italic">None</p>
              )}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-1">Import Name</th>
                    <th className="px-3 py-1">Wt</th>
                    <th className="px-3 py-1">Grade</th>
                    <th className="px-3 py-1">Matched To</th>
                    <th className="px-3 py-1">Score</th>
                    <th className="px-3 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {confirmed.map(e => (
                    <tr key={e.id} className="border-b border-slate-50 opacity-50">
                      <td className="px-3 py-1 text-slate-700">{e.first_name_raw} {e.last_name_raw}</td>
                      <td className="px-3 py-1 text-slate-400">{e.weight_class ?? '—'}</td>
                      <td className="px-3 py-1">{gradeBadge(e.grade)}</td>
                      <td className="px-3 py-1 text-green-700 text-xs">✓ Confirmed</td>
                      <td className="px-3 py-1"></td>
                      <td className="px-3 py-1"></td>
                    </tr>
                  ))}
                  {autoMatched.map(e => {
                    const edit = wrestlerEdits[e.id]
                    const matchName = edit?.wrestler_id
                      ? liveWrestlers.find(w => w.id === edit.wrestler_id)
                        ? `${liveWrestlers.find(w => w.id === edit.wrestler_id)!.first_name} ${liveWrestlers.find(w => w.id === edit.wrestler_id)!.last_name}`
                        : `ID ${edit.wrestler_id?.slice(0, 8)}`
                      : e.matchedWrestler
                        ? `${e.matchedWrestler.first_name} ${e.matchedWrestler.last_name}`
                        : e.autoMatch?.displayName ?? '—'
                    const score = edit ? e.autoMatch?.score : e.autoMatch?.score
                    return (
                      <tr key={e.id} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-800">{e.first_name_raw} {e.last_name_raw}</td>
                        <td className="px-3 py-1 text-slate-400">{e.weight_class ?? '—'}</td>
                        <td className="px-3 py-1">{gradeBadge(e.grade)}</td>
                        <td className="px-3 py-1 text-blue-700 text-xs">{matchName}</td>
                        <td className="px-3 py-1 text-slate-400 text-xs">{score ? pct(score) : '—'}</td>
                        <td className="px-3 py-1">
                          <button
                            className="text-xs text-slate-400 hover:text-red-600"
                            onClick={() => setWrestlerEdits(p => ({
                              ...p,
                              [e.id]: { wrestler_id: null, status: 'no_match' },
                            }))}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            {/* ── Section 2: Needs review ──────────────────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Needs review ({needsReview.length + noMatchEntries.length})
              </h3>
              {needsReview.length === 0 && noMatchEntries.length === 0 && (
                <p className="text-xs text-slate-400 italic">None</p>
              )}
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-1">Import Name</th>
                    <th className="px-3 py-1">Wt</th>
                    <th className="px-3 py-1">Grade</th>
                    <th className="px-3 py-1">Candidates</th>
                  </tr>
                </thead>
                <tbody>
                  {noMatchEntries.map(e => {
                    const edit = wrestlerEdits[e.id]
                    return (
                      <tr key={e.id} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-600">{e.first_name_raw} {e.last_name_raw}</td>
                        <td className="px-3 py-1 text-slate-400">{e.weight_class ?? '—'}</td>
                        <td className="px-3 py-1">{gradeBadge(e.grade)}</td>
                        <td className="px-3 py-1">
                          {edit ? (
                            <span className="text-xs text-slate-500 italic">
                              No match
                              <button className="ml-2 text-slate-400 hover:text-slate-600"
                                onClick={() => setWrestlerEdits(p => { const n = {...p}; delete n[e.id]; return n })}>
                                ✕
                              </button>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No match</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {needsReview.map(e => (
                    <tr key={e.id} className="border-b border-slate-50">
                      <td className="px-3 py-1 text-slate-800 font-medium">{e.first_name_raw} {e.last_name_raw}</td>
                      <td className="px-3 py-1 text-slate-400">{e.weight_class ?? '—'}</td>
                      <td className="px-3 py-1">{gradeBadge(e.grade)}</td>
                      <td className="px-3 py-1">
                        <div className="flex flex-wrap gap-1 items-center">
                          {e.matches.map(m => (
                            <button
                              key={m.wrestlerId}
                              className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-blue-50"
                              onClick={() => setWrestlerEdits(p => ({
                                ...p,
                                [e.id]: { wrestler_id: m.wrestlerId, status: 'wrestler_matched' },
                              }))}
                            >
                              {m.displayName} <span className="text-slate-400">{pct(m.score)}</span>
                            </button>
                          ))}
                          {e.matches.length === 0 && (
                            <span className="text-xs text-slate-400 italic mr-2">No candidates</span>
                          )}
                          <button
                            className="text-xs px-2 py-0.5 rounded bg-red-50 text-red-600 border border-red-200"
                            onClick={() => setWrestlerEdits(p => ({
                              ...p,
                              [e.id]: { wrestler_id: null, status: 'no_match' },
                            }))}
                          >
                            No Match
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* ── Section 3: In system, not in import ─────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                In system — not in import ({unmatchedLive.length})
              </h3>
              {unmatchedLive.length === 0 && (
                <p className="text-xs text-slate-400 italic">All system wrestlers accounted for</p>
              )}
              {unmatchedLive.length > 0 && (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1">Wrestler</th>
                      <th className="px-3 py-1">Current Grade</th>
                      <th className="px-3 py-1">Grade Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatchedLive.map(w => (
                      <tr key={w.id} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-700">{w.first_name} {w.last_name}</td>
                        <td className="px-3 py-1">{gradeBadge(w.grade)}</td>
                        <td className="px-3 py-1 text-xs text-slate-400">{w.grade_confirmed_source ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

          </div>
        )}
      </div>
    )
  }

  // ── Phase: Confirm ──────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          className="text-sm text-slate-500 hover:text-slate-900"
          onClick={() => setPhase('schools')}
        >
          ← Back to Schools
        </button>
        <h2 className="text-lg font-semibold text-slate-900">Confirm Grades</h2>
      </div>

      {!confirmStats && <p className="text-sm text-slate-500">Loading…</p>}

      {confirmStats && (
        <div>
          <div className="mb-6 rounded-lg border border-slate-200 p-5 max-w-sm">
            <div className="text-3xl font-bold text-slate-900 mb-1">{confirmStats.total}</div>
            <div className="text-sm text-slate-500 mb-4">wrestler-matched entries ready to confirm</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {['Fr', 'So', 'Jr', 'Sr'].map(g => (
                <div key={g}>
                  <div className="font-bold text-slate-800">{confirmStats.byGrade[g] ?? 0}</div>
                  <div className="text-slate-400">{g}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-4 max-w-lg">
            This will write <code>grade</code> and <code>grade_confirmed_source = &apos;roster_upload&apos;</code>
            to the live <code>wrestlers</code> table for all {confirmStats.total} matched entries,
            and mark them as <code>confirmed</code> in the import table.
          </p>

          {confirmResult && (
            <div className={`mb-4 text-sm rounded px-3 py-2 ${confirmResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {confirmResult}
            </div>
          )}

          <button
            disabled={confirming || confirmStats.total === 0}
            onClick={runConfirm}
            className="px-5 py-2 rounded bg-green-700 text-white font-semibold text-sm disabled:opacity-40"
          >
            {confirming ? 'Confirming…' : `Confirm ${confirmStats.total} Grades`}
          </button>
        </div>
      )}
    </div>
  )
}
