'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { UnresolvedGrades } from './UnresolvedGrades'
import { UnlinkedDuals } from './UnlinkedDuals'

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

type Phase = 'schools' | 'wrestlers' | 'confirm' | 'unresolved' | 'unlinked'

type ProgramSchool = { id: number; display_name: string }

type LiveWrestler = { id: string; first_name: string; last_name: string; grade: string | null; grade_confirmed_source: string | null }

// One row per live roster wrestler: which import entry (if any) is proposed/confirmed
// for them, what grade to write, and whether the admin has rejected the proposal.
type RosterEdit = {
  entryId:   string | null
  grade:     string
  rejected:  boolean
  confirmed: boolean   // already written to wrestlers table — row is locked
  score?:    number    // match confidence, only set for freshly-proposed (unsaved) matches
}

// Greedily pairs each live roster wrestler with the best available import entry.
// Already-persisted matches (confirmed/wrestler_matched) win over fresh guesses,
// and each import entry can only be claimed once.
function computeRosterEdits(entries: TrackEntry[], liveWrestlers: LiveWrestler[]): Record<string, RosterEdit> {
  const result: Record<string, RosterEdit> = {}
  const usedEntryIds = new Set<string>()

  for (const w of liveWrestlers) {
    let entry = entries.find(e => e.wrestler_id === w.id && e.status === 'confirmed')
    const confirmed = !!entry
    if (!entry) entry = entries.find(e => e.wrestler_id === w.id && e.status === 'wrestler_matched')

    let score: number | undefined
    if (!entry) {
      let best: { entry: TrackEntry; score: number } | null = null
      for (const e of entries) {
        if (e.status !== 'school_matched' || usedEntryIds.has(e.id)) continue
        const m = e.matches.find(mm => mm.wrestlerId === w.id)
        if (m && (!best || m.score > best.score)) best = { entry: e, score: m.score }
      }
      entry = best?.entry
      score = best?.score
    }

    if (entry) usedEntryIds.add(entry.id)
    result[w.id] = {
      entryId:   entry?.id ?? null,
      // No import row: start from the wrestler's own grade ('' = none) so nothing is
      // implied; picking a grade writes it directly (see manualGradeEdits)
      grade:     entry?.grade ?? w.grade ?? '',
      rejected:  false,
      confirmed,
      score,
    }
  }
  return result
}

// Roster wrestlers with no import row whose grade the admin set or changed by hand
function manualGradeEdits(edits: Record<string, RosterEdit>, liveWrestlers: LiveWrestler[]) {
  return liveWrestlers
    .map(w => ({ w, e: edits[w.id] }))
    .filter(({ w, e }) => e && !e.entryId && !e.confirmed && e.grade && e.grade !== w.grade)
    .map(({ w, e }) => ({ wrestler_id: w.id, grade: e.grade }))
}

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

// Boys and girls are separate imports with their own API routes and pages:
// /admin/roster-grade-import (boys) and /admin/roster-grade-import-girls.
export function RosterGradeImportClient({ gender }: { gender: 'M' | 'F' }) {
  const router = useRouter()
  const { gender: adminGender, loaded } = useAdminGender()
  const api = gender === 'F' ? '/api/admin/roster-grade-import-girls' : '/api/admin/roster-grade-import'

  // The admin gender toggle switches to the other gender's import page
  useEffect(() => {
    if (loaded && adminGender !== gender) router.replace(adminGender === 'F' ? '/admin/roster-grade-import-girls' : '/admin/roster-grade-import')
  }, [loaded, adminGender, gender, router])

  const [phase, setPhase] = useState<Phase>('schools')
  const [schools, setSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(true)
  const [schoolsError, setSchoolsError] = useState<string | null>(null)
  const [programSchools, setProgramSchools] = useState<ProgramSchool[]>([])

  // School phase: track pending edits
  const [schoolEdits, setSchoolEdits] = useState<Record<string, number | null>>({})
  const [savingSchools, setSavingSchools] = useState(false)

  // Wrestler phase — roster-centric review
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [entries, setEntries] = useState<TrackEntry[]>([])
  const [liveWrestlers, setLiveWrestlers] = useState<LiveWrestler[]>([])
  const [liveCount, setLiveCount] = useState(0)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [rosterEdits, setRosterEdits] = useState<Record<string, RosterEdit>>({})
  const [searchWrestlerId, setSearchWrestlerId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmingRoster, setConfirmingRoster] = useState(false)
  const [rosterMessage, setRosterMessage] = useState<string | null>(null)

  // Confirm phase
  const [confirmStats, setConfirmStats] = useState<{ total: number; byGrade: Record<string, number>; unresolved?: number } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmResult, setConfirmResult] = useState<string | null>(null)

  // Grades Unresolved tab
  const [unresolvedCount, setUnresolvedCount] = useState<number | null>(null)
  const [unlinkedCount, setUnlinkedCount] = useState<number | null>(null)
  useEffect(() => {
    fetch(`${api}/unresolved`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.items)) setUnresolvedCount(d.items.length) })
      .catch(() => {})
    // Unlinked dual matches is a boys tool (boys dual_meet_matches)
    if (gender === 'F') return
    fetch('/api/admin/unlinked-duals')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.items)) setUnlinkedCount(d.items.length) })
      .catch(() => {})
  }, [api, gender])

  // School filter
  const [schoolFilter, setSchoolFilter] = useState<'all' | 'unmatched' | 'matched'>('all')

  // ── Load schools ─────────────────────────────────────────────────────────────

  const loadSchools = useCallback(async () => {
    setSchoolsLoading(true)
    setSchoolsError(null)
    try {
      const [rosterRes, programRes] = await Promise.all([
        fetch(`${api}/schools`),
        fetch(`${api}/schools?list=true`),
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
  }, [api])

  useEffect(() => { loadSchools() }, [loadSchools])

  // ── Load confirm stats ────────────────────────────────────────────────────────

  const loadConfirmStats = useCallback(async () => {
    const res = await fetch(`${api}/confirm`)
    if (res.ok) setConfirmStats(await res.json())
  }, [api])

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
      const res = await fetch(`${api}/schools`, {
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
    await fetch(`${api}/schools`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ school_name_raw, action: 'skip' }]),
    })
    await loadSchools()
  }

  // ── Load wrestler entries ─────────────────────────────────────────────────────

  async function openSchool(school: School) {
    setSelectedSchool(school)
    setRosterEdits({})
    setRosterMessage(null)
    setSearchWrestlerId(null)
    setEntriesLoading(true)
    setPhase('wrestlers')
    try {
      const res = await fetch(`${api}/wrestlers?school_id=${school.school_id}`)
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setEntries(data.entries)
      setLiveWrestlers(data.liveWrestlers ?? [])
      setLiveCount(data.liveCount)
      setRosterEdits(computeRosterEdits(data.entries, data.liveWrestlers ?? []))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : String(err))
      setPhase('schools')
    } finally {
      setEntriesLoading(false)
    }
  }

  // ── Confirm roster grades ─────────────────────────────────────────────────────
  // Writes grades only for the live roster wrestlers the admin accepted; any
  // rejected proposal is written back to no_match instead of being confirmed.

  async function confirmRoster() {
    const school = selectedSchool!
    const accept = Object.entries(rosterEdits).filter(([, e]) => !e.confirmed && !e.rejected && e.entryId)
    const revert = Object.entries(rosterEdits).filter(([, e]) => !e.confirmed && e.rejected && e.entryId)
    const manual = manualGradeEdits(rosterEdits, liveWrestlers)
    if (accept.length === 0 && revert.length === 0 && manual.length === 0) return

    setConfirmingRoster(true)
    setRosterMessage(null)
    try {
      const patchPayload = [
        ...accept.map(([wrestlerId, e]) => ({ id: e.entryId!, wrestler_id: wrestlerId, status: 'wrestler_matched', grade: e.grade })),
        ...revert.map(([, e]) => ({ id: e.entryId!, wrestler_id: null, status: 'no_match' })),
      ]
      if (patchPayload.length > 0) {
        const patchRes = await fetch(`${api}/wrestlers`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patchPayload),
        })
        if (!patchRes.ok) throw new Error(await patchRes.text())
      }

      if (manual.length > 0) {
        const putRes = await fetch(`${api}/wrestlers`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(manual),
        })
        const putData = await putRes.json()
        if (!putRes.ok) throw new Error(putData.error)
      }

      if (accept.length > 0) {
        const confirmRes = await fetch(`${api}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ school_id: school.school_id, ids: accept.map(([, e]) => e.entryId) }),
        })
        const confirmData = await confirmRes.json()
        if (!confirmRes.ok) throw new Error(confirmData.error)
      }

      const written = accept.length + manual.length
      setRosterMessage(`Confirmed ${written} grade${written !== 1 ? 's' : ''} to the roster.`)
      const r2 = await fetch(`${api}/wrestlers?school_id=${school.school_id}`)
      const data = await r2.json()
      setEntries(data.entries)
      setLiveWrestlers(data.liveWrestlers ?? [])
      setLiveCount(data.liveCount)
      setRosterEdits(computeRosterEdits(data.entries, data.liveWrestlers ?? []))
      loadSchools()
    } catch (e: unknown) {
      setRosterMessage(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setConfirmingRoster(false)
    }
  }

  // ── Confirm grades ────────────────────────────────────────────────────────────

  async function runConfirm() {
    setConfirming(true)
    setConfirmResult(null)
    try {
      const res = await fetch(`${api}/confirm`, {
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

  if (phase === 'unlinked' && gender === 'M') {
    return <UnlinkedDuals onBack={() => { setPhase('schools'); loadSchools() }} onCount={setUnlinkedCount} />
  }

  if (phase === 'unresolved') {
    return <UnresolvedGrades api={api} onBack={() => { setPhase('schools'); loadSchools() }} onCount={setUnresolvedCount} />
  }

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
            className={`ml-auto px-3 py-1 rounded text-xs font-medium border ${unresolvedCount ? 'border-amber-400 text-amber-800 bg-amber-50' : 'border-slate-300 text-slate-600'}`}
            onClick={() => setPhase('unresolved')}
          >
            Grades Unresolved{unresolvedCount != null ? ` (${unresolvedCount})` : ''}
          </button>
          {gender === 'M' && (
          <button
            className={`px-3 py-1 rounded text-xs font-medium border ${unlinkedCount ? 'border-amber-400 text-amber-800 bg-amber-50' : 'border-slate-300 text-slate-600'}`}
            onClick={() => setPhase('unlinked')}
          >
            Unlinked Matches{unlinkedCount != null ? ` (${unlinkedCount})` : ''}
          </button>
          )}
          <button
            className="px-3 py-1 rounded bg-slate-900 text-white text-xs font-medium disabled:opacity-40"
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
    function gradeBadge(grade: string | null) {
      if (!grade) return <span className="text-xs text-slate-400">—</span>
      const cls = grade === 'Sr' ? 'bg-slate-200 text-slate-700' :
                  grade === 'Jr' ? 'bg-blue-100 text-blue-700'   :
                  grade === 'So' ? 'bg-green-100 text-green-700' :
                                   'bg-yellow-100 text-yellow-700'
      return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cls}`}>{grade}</span>
    }

    // Import entries currently claimed by an accepted (non-rejected) roster row
    const activeEntryIds = new Set(
      Object.values(rosterEdits).filter(e => e.entryId && !e.rejected).map(e => e.entryId as string)
    )
    const leftoverEntries = entries.filter(e => !activeEntryIds.has(e.id) && e.status !== 'confirmed')

    const confirmCount = Object.values(rosterEdits).filter(e => !e.confirmed && !e.rejected && e.entryId).length
      + manualGradeEdits(rosterEdits, liveWrestlers).length

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
          <span className="text-sm text-slate-500">{liveCount} on roster · {entries.length} import rows</span>
          {confirmCount > 0 && (
            <button
              disabled={confirmingRoster}
              onClick={confirmRoster}
              className="ml-auto px-3 py-1 rounded bg-green-700 text-white text-sm font-medium disabled:opacity-40"
            >
              {confirmingRoster ? 'Confirming…' : `Confirm ${confirmCount} Grade${confirmCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {rosterMessage && (
          <div className={`mb-4 text-sm rounded px-3 py-2 ${rosterMessage.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {rosterMessage}
          </div>
        )}

        {entriesLoading && <p className="text-sm text-slate-500">Loading…</p>}

        {!entriesLoading && (
          <div className="space-y-8">

            {/* ── Our roster ──────────────────────────────────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Our roster ({liveWrestlers.length})
              </h3>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    <th className="px-3 py-1">Wrestler</th>
                    <th className="px-3 py-1">Current Grade</th>
                    <th className="px-3 py-1">Matched Import Name</th>
                    <th className="px-3 py-1">Import Grade</th>
                    <th className="px-3 py-1">New Grade</th>
                    <th className="px-3 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {liveWrestlers.map(w => {
                    const edit = rosterEdits[w.id]
                    if (!edit) return null
                    const matchedEntry = edit.entryId ? entries.find(e => e.id === edit.entryId) ?? null : null
                    const isSearching = searchWrestlerId === w.id
                    const searchResults = leftoverEntries.filter(e =>
                      `${e.first_name_raw} ${e.last_name_raw}`.toLowerCase().includes(searchQuery.toLowerCase())
                    ).slice(0, 20)

                    if (edit.confirmed) {
                      return (
                        <tr key={w.id} className="border-b border-slate-50 opacity-50">
                          <td className="px-3 py-1 text-slate-700">{w.first_name} {w.last_name}</td>
                          <td className="px-3 py-1">{gradeBadge(w.grade)}</td>
                          <td className="px-3 py-1 text-green-700 text-xs">
                            {matchedEntry ? `${matchedEntry.first_name_raw} ${matchedEntry.last_name_raw}` : '—'}
                          </td>
                          <td className="px-3 py-1">{matchedEntry ? gradeBadge(matchedEntry.grade) : '—'}</td>
                          <td className="px-3 py-1 text-green-700 text-xs font-medium">✓ Confirmed</td>
                          <td className="px-3 py-1"></td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={w.id} className={`border-b border-slate-50 ${edit.rejected ? 'opacity-40' : ''}`}>
                        <td className="px-3 py-1 text-slate-800 font-medium align-top">{w.first_name} {w.last_name}</td>
                        <td className="px-3 py-1 align-top">{gradeBadge(w.grade)}</td>
                        <td className="px-3 py-1 align-top">
                          <div className="flex items-center gap-2 flex-wrap">
                            {matchedEntry ? (
                              <>
                                <span className="text-blue-700 text-xs">{matchedEntry.first_name_raw} {matchedEntry.last_name_raw}</span>
                                {edit.score != null && <span className="text-xs text-slate-400">{pct(edit.score)}</span>}
                                <button
                                  className="text-xs text-slate-400 hover:text-slate-700 underline"
                                  onClick={() => { setSearchWrestlerId(isSearching ? null : w.id); setSearchQuery('') }}
                                >
                                  change
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-slate-400 italic">No match</span>
                                <button
                                  className="text-xs text-blue-600 underline"
                                  onClick={() => { setSearchWrestlerId(isSearching ? null : w.id); setSearchQuery('') }}
                                >
                                  search
                                </button>
                              </>
                            )}
                          </div>
                          {isSearching && (
                            <div className="relative mt-1">
                              <input
                                autoFocus
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search import names…"
                                className="text-xs border border-slate-300 rounded px-2 py-1 w-56 outline-none focus:border-blue-500"
                                onBlur={() => setTimeout(() => setSearchWrestlerId(null), 150)}
                              />
                              <div className="absolute z-10 top-full left-0 mt-0.5 w-64 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(e => (
                                  <button
                                    key={e.id}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-slate-700"
                                    onMouseDown={() => {
                                      setRosterEdits(p => ({
                                        ...p,
                                        [w.id]: { entryId: e.id, grade: e.grade, rejected: false, confirmed: false },
                                      }))
                                      setSearchWrestlerId(null)
                                    }}
                                  >
                                    {e.first_name_raw} {e.last_name_raw}{' '}
                                    <span className="text-slate-400">· Wt {e.weight_class ?? '—'} · {e.grade}</span>
                                  </button>
                                ))}
                                {searchResults.length === 0 && (
                                  <div className="px-3 py-1.5 text-xs text-slate-400 italic">No matches</div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-1 align-top">{matchedEntry ? gradeBadge(matchedEntry.grade) : <span className="text-xs text-slate-400">—</span>}</td>
                        <td className="px-3 py-1 align-top">
                          <select
                            value={edit.grade}
                            disabled={edit.rejected}
                            onChange={e => setRosterEdits(p => ({ ...p, [w.id]: { ...p[w.id], grade: e.target.value } }))}
                            className="text-xs border border-slate-300 rounded px-1.5 py-0.5 disabled:opacity-40"
                          >
                            {!edit.grade && <option value="">—</option>}
                            {['Fr', 'So', 'Jr', 'Sr'].map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-1 align-top">
                          {matchedEntry && (
                            edit.rejected ? (
                              <button
                                className="text-xs text-slate-500 underline"
                                onClick={() => setRosterEdits(p => ({ ...p, [w.id]: { ...p[w.id], rejected: false } }))}
                              >
                                Undo
                              </button>
                            ) : (
                              <button
                                className="text-xs text-red-600 hover:text-red-800"
                                onClick={() => setRosterEdits(p => ({ ...p, [w.id]: { ...p[w.id], rejected: true } }))}
                              >
                                Reject
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </section>

            {/* ── Import names not matched to our roster ───────────────────── */}
            <section>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Import names not matched to your roster ({leftoverEntries.length})
              </h3>
              {leftoverEntries.length === 0 ? (
                <p className="text-xs text-slate-400 italic">All import names matched</p>
              ) : (
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                      <th className="px-3 py-1">Import Name</th>
                      <th className="px-3 py-1">Wt</th>
                      <th className="px-3 py-1">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leftoverEntries.map(e => (
                      <tr key={e.id} className="border-b border-slate-50">
                        <td className="px-3 py-1 text-slate-500">{e.first_name_raw} {e.last_name_raw}</td>
                        <td className="px-3 py-1 text-slate-400">{e.weight_class ?? '—'}</td>
                        <td className="px-3 py-1">{gradeBadge(e.grade)}</td>
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
            {!!confirmStats.unresolved && (
              <> {confirmStats.unresolved} wrestler{confirmStats.unresolved !== 1 ? 's' : ''} with conflicting grades
              {confirmStats.unresolved !== 1 ? ' are' : ' is'} skipped — resolve them in <button className="underline" onClick={() => setPhase('unresolved')}>Grades Unresolved</button>.</>
            )}
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
