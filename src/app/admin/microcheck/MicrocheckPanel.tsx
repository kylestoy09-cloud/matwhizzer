'use client'

import { useCallback, useEffect, useState } from 'react'

// Each gender's roster import has its own API routes
const rosterApi = (g: 'M' | 'F') => g === 'F' ? '/api/admin/roster-grade-import-girls' : '/api/admin/roster-grade-import'

/* ── Name similarity (module-level so useEffect can call it) ── */
function _triSim(a: string, b: string): number {
  const tris = (s: string) => {
    const p = `  ${s.toLowerCase()}  `
    const t = new Set<string>()
    for (let i = 0; i < p.length - 2; i++) t.add(p.slice(i, i + 3))
    return t
  }
  const ta = tris(a), tb = tris(b)
  let inter = 0
  for (const t of ta) if (tb.has(t)) inter++
  const union = ta.size + tb.size - inter
  return union === 0 ? 0 : inter / union
}

function _nameSim(af: string, al: string, bf: string, bl: string): number {
  const fullA = `${af} ${al}`.toLowerCase().trim()
  const fullB = `${bf} ${bl}`.toLowerCase().trim()
  if (fullA === fullB) return 1.0
  if (al.toLowerCase() === bl.toLowerCase() && af[0]?.toLowerCase() === bf[0]?.toLowerCase()) return 0.92
  if (al.toLowerCase() === bl.toLowerCase()) return 0.80
  return _triSim(fullA, fullB)
}

function topCandidates(wrestler: LiveWrestler, entries: ImportEntry[], n = 3) {
  return entries
    .map(e => ({ entry: e, score: _nameSim(wrestler.first_name, wrestler.last_name, e.first_name_raw, e.last_name_raw) }))
    .filter(c => c.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

type TaskInfo = {
  task_type:   'school_profile'
  task_key:    string
  group_label: string        // Boys / Girls / Both programs
  school_id:   number
  school_name: string
  gender:      'M' | 'F'
  field:       string
  label:       string
  input_type:  'text' | 'url' | 'email' | 'roster'
  placeholder: string
}

type TieTask = {
  task_type:   'tie_resolution'
  task_key:    string
  group_label: string
  task_id:     string
  entity_id:   string
  gender:      'M' | 'F'
  team1_name:  string
  team2_name:  string
  score:       number
  meet_date:   string
  dual_table:  string
}

type ScoreEntry    = { admin_id: string; name: string; completed: number }
type DailyKing     = { date: string; admin_id: string; name: string; count: number }
type MonthlyStanding = { admin_id: string; name: string; days: number; totalTasks: number }
type MonthlyRoyal  = { month: string; admin_id: string; name: string; days: number; standings: MonthlyStanding[] }
type CantFindEntry = { school_id: number; school_name: string; field: string; gender: 'M' | 'F'; completed_at: string; admin_name: string }
type FlaggedEntry  = { school_id: number; school_name: string; gender: 'M' | 'F'; suspect_count: number; resolved: boolean }

type ImportEntry = {
  id:             string
  first_name_raw: string
  last_name_raw:  string
  weight_class:   number | null
  grade:          string | null
  status:         string
  wrestler_id:    string | null
  matches:        { wrestlerId: string; displayName: string; score: number }[]
  autoMatch:      { wrestlerId: string; displayName: string; score: number } | null
  matchedWrestler: { id: string; first_name: string; last_name: string } | null
}

type LiveWrestler = { id: string; first_name: string; last_name: string; grade: string | null }

// Keyed by system wrestler id; tracks which import entry was chosen (or "not in import")
type PendingDecision = { importEntryId: string | null; status: 'wrestler_matched' | 'not_in_import' }

const FIELD_LABELS: Record<string, string> = {
  address: 'Address', website_url: 'Website', twitter_handle: 'Twitter / X',
  facebook_url: 'Facebook', coach_name: 'Coach Name', coach_email: 'Coach Email',
  ad_name: 'AD Name', ad_email: 'AD Email', roster_match: 'Roster Match',
}

const FIELD_SEARCH: Record<string, (school: string) => string> = {
  coach_name:   s => `${s} high school NJ boys wrestling coach`,
  coach_email:  s => `${s} high school NJ boys wrestling coach email`,
  ad_name:      s => `${s} high school NJ athletic director`,
  ad_email:     s => `${s} high school NJ athletic director email`,
  website_url:  s => `${s} high school NJ wrestling`,
  twitter_handle: s => `${s} high school NJ wrestling twitter`,
  facebook_url: s => `${s} high school NJ wrestling facebook`,
  address:      s => `${s} high school NJ address`,
}

function SearchButton({ field, schoolName }: { field: string; schoolName: string }) {
  const queryFn = FIELD_SEARCH[field]
  if (!queryFn) return null
  const query = queryFn(schoolName)
  return (
    <button
      type="button"
      onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank')}
      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 rounded-lg px-3 py-1.5 transition-colors"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21.35 11.1H12.18V13.83H18.69C18.36 17.64 15.19 19.27 12.19 19.27C8.36 19.27 5 16.25 5 12C5 7.9 8.2 4.73 12.2 4.73C15.29 4.73 17.1 6.7 17.1 6.7L19 4.72C19 4.72 16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12C2.03 17.05 6.16 22 12.25 22C17.6 22 21.5 18.33 21.5 12.91C21.5 11.76 21.35 11.1 21.35 11.1Z"/>
      </svg>
      Search Google
    </button>
  )
}

type View = 'home' | 'task' | 'tie' | 'done'

export function MicrocheckPanel({ onClose }: { onClose: () => void }) {
  const [tab,          setTab]          = useState<'tasks' | 'cantfind' | 'flagged'>('tasks')
  const [view,         setView]         = useState<View>('home')
  const [task,         setTask]         = useState<TaskInfo | null>(null)
  const [tie,          setTie]          = useState<TieTask | null>(null)
  // Tasks passed over this session; the queue covers boys and girls
  const [skipped,      setSkipped]      = useState<string[]>([])
  const [value,        setValue]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [scoreboard,    setScoreboard]    = useState<ScoreEntry[]>([])
  const [todayBoard,    setTodayBoard]    = useState<ScoreEntry[]>([])
  const [dailyKings,    setDailyKings]    = useState<DailyKing[]>([])
  const [monthlyRoyal,  setMonthlyRoyal]  = useState<MonthlyRoyal[]>([])
  const [poopTab,       setPoopTab]       = useState<'today' | 'alltime' | 'monthly'>('today')
  const [scoreLoading,  setScoreLoading]  = useState(false)
  const [cantFind,     setCantFind]     = useState<CantFindEntry[]>([])
  const [cfLoading,    setCfLoading]    = useState(false)
  const [flagged,      setFlagged]      = useState<FlaggedEntry[]>([])
  const [flagLoading,  setFlagLoading]  = useState(false)

  // Roster-specific state
  const [rosterEntries,    setRosterEntries]    = useState<ImportEntry[]>([])
  const [liveWrestlers,    setLiveWrestlers]    = useState<LiveWrestler[]>([])
  const [rosterLoading,    setRosterLoading]    = useState(false)
  const [pendingDecisions, setPendingDecisions] = useState<Map<string, PendingDecision>>(new Map())

  const loadScore = useCallback(async () => {
    setScoreLoading(true)
    try {
      const res = await fetch('/api/admin/microcheck/scoreboard')
      const data = await res.json()
      if (!data.error) {
        setScoreboard(data.scoreboard ?? [])
        setTodayBoard(data.today ?? [])
        setDailyKings(data.dailyKings ?? [])
        setMonthlyRoyal(data.monthlyRoyalty ?? [])
      }
    } finally { setScoreLoading(false) }
  }, [])

  const loadCantFind = useCallback(async () => {
    setCfLoading(true)
    try {
      const res = await fetch('/api/admin/microcheck/cant-find')
      const data = await res.json()
      if (!data.error) setCantFind(data.entries ?? [])
    } finally { setCfLoading(false) }
  }, [])

  const loadFlagged = useCallback(async () => {
    setFlagLoading(true)
    try {
      const res = await fetch('/api/admin/microcheck/flagged')
      const data = await res.json()
      if (!data.error) setFlagged(data.flags ?? [])
    } finally { setFlagLoading(false) }
  }, [])

  useEffect(() => { loadScore() }, [loadScore])
  useEffect(() => { if (tab === 'cantfind') loadCantFind() }, [tab, loadCantFind])
  useEffect(() => { if (tab === 'flagged') loadFlagged() }, [tab, loadFlagged])

  // Load roster data whenever a roster task is shown
  useEffect(() => {
    if (!task || task.input_type !== 'roster') return
    setRosterLoading(true)
    setRosterEntries([])
    setPendingDecisions(new Map())
    fetch(`${rosterApi(task.gender)}/wrestlers?school_id=${task.school_id}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        const entries: ImportEntry[] = data.entries ?? []
        const live: LiveWrestler[]   = data.liveWrestlers ?? []
        setRosterEntries(entries)
        setLiveWrestlers(live)
        // Pre-populate decisions for every live wrestler
        // Priority: already saved in DB → auto-select top candidate (score ≥ 0.5)
        const matchedByWrestler = new Map<string, string>()
        for (const e of entries) {
          if (e.status === 'wrestler_matched' && e.wrestler_id)
            matchedByWrestler.set(e.wrestler_id, e.id)
        }
        const schoolMatchedEntries = entries.filter(e => e.status === 'school_matched')
        const pre = new Map<string, PendingDecision>()
        for (const w of live) {
          if (matchedByWrestler.has(w.id)) {
            pre.set(w.id, { importEntryId: matchedByWrestler.get(w.id)!, status: 'wrestler_matched' })
          } else {
            const best = topCandidates(w, schoolMatchedEntries, 1)[0]
            if (best) pre.set(w.id, { importEntryId: best.entry.id, status: 'wrestler_matched' })
          }
        }
        setPendingDecisions(pre)
      })
      .catch(() => setError('Failed to load wrestlers'))
      .finally(() => setRosterLoading(false))
  }, [task])

  function showTask(t: TaskInfo | TieTask | null) {
    setValue('')
    if (!t) { setView('done'); setTask(null); setTie(null); return }
    if (t.task_type === 'tie_resolution') { setTie(t); setTask(null); setView('tie'); return }
    setTask(t); setTie(null); setView('task')
  }

  function skipCurrent() {
    const key = tie ? `queue:${tie.task_id}` : task ? `${task.task_key}:${task.school_id}` : null
    if (!key) return
    const next = [...skipped, key]
    setSkipped(next)
    getTask(next)
  }

  async function submitTie(winner: 'team1' | 'team2') {
    if (!tie) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/microcheck/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ task_type: 'tie_resolution', task_id: tie.task_id, entity_id: tie.entity_id, gender: tie.gender, winner, dual_table: tie.dual_table }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      await loadScore()
      showTask(data.task)
    } catch { setError('Network error') }
    finally { setSubmitting(false) }
  }

  async function getTask(skip: string[] = skipped) {
    setLoading(true)
    setError(null)
    setValue('')
    try {
      const res = await fetch(`/api/admin/microcheck/next?skip=${encodeURIComponent(skip.join(','))}`)
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      showTask(data.task)
    } catch { setError('Network error') }
    finally { setLoading(false) }
  }

  async function submit(status: 'completed' | 'cant_find') {
    if (!task) return
    setSubmitting(true)
    setError(null)
    try {
      // For roster tasks, save decisions and mark remaining import entries as no_match
      if (task.input_type === 'roster' && status === 'completed') {
        // Build patch from decisions (wrestler_id → import entry)
        const claimedEntryIds = new Set<string>()
        const payload: { id: string; wrestler_id: string | null; status: string }[] = []
        for (const [wrestlerId, d] of pendingDecisions.entries()) {
          if (d.status === 'wrestler_matched' && d.importEntryId) {
            payload.push({ id: d.importEntryId, wrestler_id: wrestlerId, status: 'wrestler_matched' })
            claimedEntryIds.add(d.importEntryId)
          }
        }
        // Mark unclaimed school_matched entries as no_match so the queue clears
        for (const e of rosterEntries) {
          if (e.status === 'school_matched' && !claimedEntryIds.has(e.id))
            payload.push({ id: e.id, wrestler_id: null, status: 'no_match' })
        }
        if (payload.length > 0) {
          const patchRes = await fetch(`${rosterApi(task.gender)}/wrestlers`, {
            method:  'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
          })
          const patchData = await patchRes.json()
          if (patchData.error) { setError(patchData.error); return }
        }
        // Write the matched grades to the wrestlers (saving a match alone doesn't)
        if (claimedEntryIds.size > 0) {
          const confirmRes = await fetch(`${rosterApi(task.gender)}/confirm`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ school_id: task.school_id, ids: [...claimedEntryIds] }),
          })
          const confirmData = await confirmRes.json()
          if (confirmData.error) { setError(confirmData.error); return }
        }
      }

      const res = await fetch('/api/admin/microcheck/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          task_key:  task.task_key,
          school_id: task.school_id,
          gender:    task.gender,
          field:     task.field,
          status,
          value:     status === 'completed' && task.input_type !== 'roster' ? value.trim() || null : null,
        }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); return }
      await loadScore()
      showTask(data.task)
    } catch { setError('Network error') }
    finally { setSubmitting(false) }
  }

  async function resolveFlag(school_id: number, gender: 'M' | 'F', resolved: boolean) {
    await fetch('/api/admin/microcheck/flagged', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ school_id, gender, resolved }),
    })
    setFlagged(prev => prev.map(f => f.school_id === school_id && f.gender === gender ? { ...f, resolved } : f))
  }

  function setDecision(wrestlerId: string, decision: PendingDecision | null) {
    setPendingDecisions(prev => {
      const next = new Map(prev)
      if (decision === null) next.delete(wrestlerId)
      else next.set(wrestlerId, decision)
      return next
    })
  }

  const isRoster    = task?.input_type === 'roster'
  const noRoster    = isRoster && !rosterLoading && liveWrestlers.length === 0
  const allDecided  = liveWrestlers.length > 0 && liveWrestlers.every(w => pendingDecisions.has(w.id))
  const canSubmit   = isRoster ? (allDecided || noRoster) : value.trim().length > 0

  return (
    <div
      className="fixed z-[200] flex flex-col shadow-2xl overflow-hidden
        bottom-0 right-0 left-0 rounded-t-xl
        sm:bottom-4 sm:right-4 sm:left-auto sm:rounded-xl"
      style={{ height: 560, maxWidth: 400, width: '100%', border: '1px solid rgba(0,0,0,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800 text-white shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <button onClick={() => setTab('tasks')} className={`text-xs font-semibold px-2 py-0.5 rounded ${tab === 'tasks' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Tasks</button>
          <button onClick={() => setTab('cantfind')} className={`text-xs font-semibold px-2 py-0.5 rounded ${tab === 'cantfind' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>Can't Find</button>
          <button onClick={() => setTab('flagged')} className={`text-xs font-semibold px-2 py-0.5 rounded flex items-center gap-1 ${tab === 'flagged' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}>
            <span className="text-amber-400">⚑</span> Flagged
          </button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <>
            {/* Home — Poop Leaderboard */}
            {view === 'home' && (
              <div className="flex flex-col h-full" style={{ background: '#fdf8f4' }}>
                {/* CHECK ME button — top */}
                <div className="px-3 pt-3 pb-1 shrink-0">
                  {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
                  <button disabled={loading} onClick={() => getTask()}
                    className="w-full py-3 rounded-xl text-sm font-black tracking-wide disabled:opacity-40"
                    style={{ background: '#5c3317', color: '#f5ddb0' }}>
                    {loading ? '🚽 hold on…' : '💩 CHECK ME'}
                  </button>
                  <div className="flex justify-end mt-1">
                    <a
                      href="/admin/microcheck/tracker"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium hover:underline mr-3"
                      style={{ color: '#a0714f' }}
                    >
                      ▦ Missing data
                    </a>
                    <a
                      href="/admin/microcheck/priorities"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-medium hover:underline"
                      style={{ color: '#a0714f' }}
                    >
                      ⚙ Task order
                    </a>
                  </div>
                </div>

                {/* Poop sub-tabs */}
                <div className="flex gap-1 px-3 pt-2 pb-1 shrink-0">
                  {(['today','monthly','alltime'] as const).map(t => (
                    <button key={t} onClick={() => setPoopTab(t)}
                      className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg transition-colors ${poopTab === t ? 'bg-[#5c3317] text-[#f5ddb0]' : 'bg-[#ede0d4] text-[#7a4a2a] hover:bg-[#dfc9b3]'}`}>
                      {t === 'today' ? '💩 Today' : t === 'monthly' ? '👑 Monthly' : '🏆 All Time'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {scoreLoading ? (
                    <p className="text-xs text-center py-6" style={{ color: '#a0714f' }}>Loading the logs…</p>
                  ) : poopTab === 'today' ? (
                    <PoopBoard rows={todayBoard} label="turds today" emptyMsg="No logs dropped yet today. Be first. 💩" />
                  ) : poopTab === 'alltime' ? (
                    <PoopBoard rows={scoreboard} label="total turds" emptyMsg="No checks yet — someone go first." />
                  ) : (
                    <MonthlyRoyaltyView dailyKings={dailyKings} monthlyRoyal={monthlyRoyal} scoreboard={scoreboard} />
                  )}
                </div>
              </div>
            )}

            {/* Task view */}
            {view === 'task' && task && (
              <div className="flex flex-col h-full">
                {/* Task header */}
                <div className="px-4 pt-4 pb-2 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {task.group_label} · {FIELD_LABELS[task.field] ?? task.field}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{task.school_name}</h2>
                </div>

                {/* Task body */}
                <div className="flex-1 overflow-y-auto px-4 pb-2">
                  {!isRoster ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-slate-500">Find their {task.label}</p>
                        <SearchButton field={task.field} schoolName={task.school_name} />
                      </div>
                      <input
                        key={task.school_id + task.field}
                        type={task.input_type === 'email' ? 'email' : 'text'}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && canSubmit && !submitting) submit('completed') }}
                        placeholder={task.placeholder}
                        autoFocus
                        className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-900 placeholder:text-slate-300"
                      />
                    </>
                  ) : rosterLoading ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Loading wrestlers…</p>
                  ) : liveWrestlers.length === 0 ? (
                    <div className="py-6 text-center space-y-2">
                      <p className="text-sm font-semibold text-slate-500">No roster in the system for this school.</p>
                      <p className="text-xs text-slate-400">Click "Mark No Roster" below to clear this task and move on.</p>
                    </div>
                  ) : (
                    <RosterMatcher
                      liveWrestlers={liveWrestlers}
                      importEntries={rosterEntries}
                      decisions={pendingDecisions}
                      onDecide={setDecision}
                    />
                  )}
                  {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
                </div>

                {/* Footer buttons */}
                <div className="px-4 pb-4 space-y-2 shrink-0 border-t border-slate-100 pt-3">
                  <button
                    disabled={submitting || !canSubmit}
                    onClick={() => submit('completed')}
                    className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40"
                  >
                    {submitting ? '…' : noRoster ? 'Mark No Roster' : isRoster ? `Save Matches (${pendingDecisions.size}/${liveWrestlers.length})` : 'Done'}
                  </button>
                  {!isRoster && (
                    <button disabled={submitting} onClick={() => submit('cant_find')} className="w-full py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium disabled:opacity-40">
                      Can't Find
                    </button>
                  )}
                  <button disabled={submitting} onClick={skipCurrent} className="w-full text-xs text-slate-500 hover:text-slate-800 py-1 disabled:opacity-40">
                    Skip for now
                  </button>
                  <button onClick={() => { setView('home'); setTask(null) }} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
                    ← Back to leaderboard
                  </button>
                </div>
              </div>
            )}

            {/* Tie view */}
            {view === 'tie' && tie && (
              <div className="flex flex-col h-full">
                <div className="px-4 pt-4 pb-2 shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {tie.group_label} · Tie Resolution
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{tie.team1_name} vs {tie.team2_name}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(tie.meet_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · tied {tie.score}–{tie.score}
                  </p>
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${tie.team1_name} ${tie.group_label} wrestling schedule results`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-2 inline-block"
                  >
                    Search {tie.team1_name} schedule →
                  </a>
                </div>
                <div className="flex-1" />
                <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <button disabled={submitting} onClick={() => submitTie('team1')} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40">
                    {submitting ? '…' : `${tie.team1_name} won`}
                  </button>
                  <button disabled={submitting} onClick={() => submitTie('team2')} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40">
                    {submitting ? '…' : `${tie.team2_name} won`}
                  </button>
                  <button disabled={submitting} onClick={skipCurrent} className="w-full text-xs text-slate-500 hover:text-slate-800 py-1 disabled:opacity-40">
                    Skip for now
                  </button>
                  <button onClick={() => { setView('home'); setTie(null) }} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">
                    ← Back to leaderboard
                  </button>
                </div>
              </div>
            )}

            {/* Done */}
            {view === 'done' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                  <div className="text-4xl mb-3">✓</div>
                  <p className="text-base font-bold text-slate-900 mb-1">All caught up</p>
                  <p className="text-xs text-slate-500">No more open tasks right now.</p>
                </div>
                <div className="p-4 border-t border-slate-100 shrink-0 space-y-2">
                  <button onClick={() => getTask()} className="w-full py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold">Check Me</button>
                  <button onClick={() => setView('home')} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">← Back to leaderboard</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Flagged tab ── */}
        {tab === 'flagged' && (
          <div className="p-4">
            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
              These schools are being reviewed manually via the Roster Grade Import tool.
            </p>
            {flagLoading && <p className="text-xs text-slate-400 text-center py-4">Loading…</p>}
            {!flagLoading && flagged.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">No flagged schools.</p>
            )}
            {!flagLoading && flagged.length > 0 && (
              <div className="space-y-1.5">
                {flagged.map(f => (
                  <div key={`${f.gender}${f.school_id}`} className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                    <p className="text-xs font-semibold text-slate-800">{f.school_name} <span className="font-normal text-slate-500">· {f.gender === 'F' ? 'Girls' : 'Boys'}</span></p>
                    <p className="text-[10px] text-amber-700">{f.suspect_count} wrestler{f.suspect_count !== 1 ? 's' : ''} not in import</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Can't Find tab ── */}
        {tab === 'cantfind' && (
          <div className="p-4">
            {cfLoading && <p className="text-xs text-slate-400 text-center py-6">Loading…</p>}
            {!cfLoading && cantFind.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nothing flagged yet.</p>}
            {!cfLoading && cantFind.length > 0 && (
              <div className="space-y-2">
                {cantFind.map((e, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg px-3 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{e.school_name}</p>
                        <p className="text-xs text-slate-500">{FIELD_LABELS[e.field] ?? e.field}{['roster_match', 'coach_name', 'coach_email'].includes(e.field) ? ` · ${e.gender === 'F' ? 'Girls' : 'Boys'}` : ''}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">{new Date(e.completed_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">by {e.admin_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Inline roster matcher (system-first, auto-matched) ── */
function RosterMatcher({
  liveWrestlers,
  importEntries,
  decisions,
  onDecide,
}: {
  liveWrestlers: LiveWrestler[]
  importEntries: ImportEntry[]
  decisions:     Map<string, PendingDecision>
  onDecide:      (wrestlerId: string, d: PendingDecision | null) => void
}) {
  const schoolMatchedEntries = importEntries.filter(e => e.status === 'school_matched')

  const claimedEntryIds = new Set(
    [...decisions.values()]
      .filter(d => d.status === 'wrestler_matched' && d.importEntryId)
      .map(d => d.importEntryId as string)
  )
  const unclaimed  = schoolMatchedEntries.filter(e => !claimedEntryIds.has(e.id))
  const missingCt  = liveWrestlers.filter(w => decisions.get(w.id)?.status === 'not_in_import').length
  const pendingCt  = liveWrestlers.filter(w => !decisions.has(w.id)).length

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-1">
        {liveWrestlers.length} in system
        {pendingCt  > 0 && <span className="text-amber-600 ml-1">· {pendingCt} need decision</span>}
        {missingCt  > 0 && <span className="text-red-500 ml-1">· {missingCt} not in import</span>}
      </p>

      {liveWrestlers.map(w => {
        const decision    = decisions.get(w.id)
        const chosenEntry = decision?.importEntryId ? importEntries.find(e => e.id === decision.importEntryId) : null
        const candidates  = topCandidates(w, schoolMatchedEntries)

        // ── Matched card ──────────────────────────────────────────────
        if (decision?.status === 'wrestler_matched') {
          const sysGrade    = w.grade?.trim() || null
          const impGrade    = chosenEntry?.grade?.trim() || null
          const gradeMatch  = sysGrade && impGrade && sysGrade === impGrade
          const gradeMismatch = sysGrade && impGrade && sysGrade !== impGrade

          return (
            <div key={w.id} className={`border rounded-lg px-3 py-2 ${gradeMismatch ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-800 truncate">
                      {w.first_name} {w.last_name}
                    </p>
                    {/* Grade comparison */}
                    {gradeMismatch ? (
                      <span className="shrink-0 text-[11px] font-semibold text-amber-700 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded">
                        {sysGrade} → {impGrade} ⚠
                      </span>
                    ) : gradeMatch ? (
                      <span className="shrink-0 text-[11px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">
                        Gr {impGrade} ✓
                      </span>
                    ) : impGrade ? (
                      <span className="shrink-0 text-[11px] text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        → Gr {impGrade}
                      </span>
                    ) : sysGrade ? (
                      <span className="shrink-0 text-[11px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                        Sys {sysGrade}
                      </span>
                    ) : null}
                  </div>
                  {chosenEntry && (
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {chosenEntry.first_name_raw} {chosenEntry.last_name_raw}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onDecide(w.id, null)}
                  className="shrink-0 text-[11px] px-2 py-1 rounded border border-red-200 text-red-500 hover:bg-red-50 whitespace-nowrap"
                >
                  Reject
                </button>
              </div>
            </div>
          )
        }

        // ── Not-in-import card ────────────────────────────────────────
        if (decision?.status === 'not_in_import') {
          return (
            <div key={w.id} className="border border-red-200 bg-red-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-slate-800">{w.first_name} {w.last_name}</p>
                <p className="text-xs text-red-500 font-medium">Not in import</p>
              </div>
              <button
                onClick={() => onDecide(w.id, null)}
                className="shrink-0 text-[10px] text-slate-400 hover:text-slate-600 underline"
              >
                undo
              </button>
            </div>
          )
        }

        // ── Undecided (rejected or no candidates) ────────────────────
        return (
          <div key={w.id} className="border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-slate-800">{w.first_name} {w.last_name}</p>
              {w.grade && <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">Gr {w.grade}</span>}
            </div>
            <div className="flex flex-wrap gap-1">
              {candidates.length === 0
                ? <span className="text-[10px] text-slate-400 italic">No import candidates</span>
                : candidates.map(({ entry: e }) => (
                    <button
                      key={e.id}
                      onClick={() => onDecide(w.id, { importEntryId: e.id, status: 'wrestler_matched' })}
                      className="text-[11px] px-2 py-1 rounded bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-800"
                    >
                      {e.first_name_raw} {e.last_name_raw}{e.grade ? ` · ${e.grade}` : ''}
                    </button>
                  ))
              }
              <button
                onClick={() => onDecide(w.id, { importEntryId: null, status: 'not_in_import' })}
                className="text-[11px] px-2 py-1 rounded bg-white border border-red-200 text-red-500 hover:bg-red-50"
              >
                Not in import
              </button>
            </div>
          </div>
        )
      })}

      {/* Unclaimed import entries — new kids not in system */}
      {unclaimed.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
            In import — not in system ({unclaimed.length})
          </p>
          <div className="space-y-1">
            {unclaimed.map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs text-slate-400 px-2 py-1 bg-slate-50 rounded border border-slate-100">
                <span>{e.first_name_raw} {e.last_name_raw}</span>
                {e.grade && <span className="text-[10px]">Gr {e.grade}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Poop leaderboard ── */
function PoopBoard({ rows, label, emptyMsg }: { rows: ScoreEntry[]; label: string; emptyMsg: string }) {
  if (rows.length === 0)
    return <p className="text-xs text-center py-6" style={{ color: '#a0714f' }}>{emptyMsg}</p>

  const max  = Math.max(...rows.map(r => r.completed), 1)
  const king = rows[0]

  return (
    <div className="space-y-2.5 pt-1">
      {rows.map((row, i) => {
        const isKing = i === 0 && row.completed > 0
        const pct    = Math.max((row.completed / max) * 100, row.completed > 0 ? 6 : 0)
        const segments = Math.min(row.completed, 12)

        return (
          <div key={row.admin_id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: '#3d1f0a' }}>
                {isKing ? '👑 ' : ''}{row.name}
                {isKing && <span className="ml-1 text-[10px] font-normal" style={{ color: '#c07a3a' }}>poop king</span>}
              </span>
              <span className="text-[10px] font-bold" style={{ color: '#7a4a2a' }}>
                {row.completed} {label}
              </span>
            </div>
            {/* Turd bar */}
            <div className="relative h-5 rounded-sm overflow-hidden" style={{ background: '#ede0d4' }}>
              {row.completed > 0 && (
                <div
                  className="absolute left-0 top-0 h-full flex items-center transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isKing
                      ? 'linear-gradient(90deg, #3d1f0a 0%, #7b3f1a 60%, #a0602a 100%)'
                      : 'linear-gradient(90deg, #5c3317 0%, #8b5a2b 60%, #b07840 100%)',
                    borderRadius: '2px 12px 12px 2px',
                  }}
                >
                  {/* Texture segments */}
                  {Array.from({ length: segments }).map((_, si) => (
                    <div key={si} className="shrink-0" style={{
                      width: 2, height: '60%', background: 'rgba(0,0,0,0.15)',
                      marginLeft: si === 0 ? 4 : 3, borderRadius: 1,
                    }} />
                  ))}
                  {/* Turd tip */}
                  <span className="absolute right-0.5 text-[11px] leading-none select-none">💩</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Monthly royalty view ── */
function MonthlyRoyaltyView({ dailyKings, monthlyRoyal, scoreboard }: {
  dailyKings:   DailyKing[]
  monthlyRoyal: MonthlyRoyal[]
  scoreboard:   ScoreEntry[]
}) {
  const currentMonth = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }).slice(0, 7)

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-')
    return new Date(Number(y), Number(mo) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
  }
  const dayLabel = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })

  // Current month data
  const thisMonthData = monthlyRoyal.find(m => m.month === currentMonth)
  const thisMonthKings = dailyKings.filter(k => k.date.startsWith(currentMonth))

  // If no API standings yet (e.g., month just started), build from dailyKings client-side
  const standings: MonthlyStanding[] = thisMonthData?.standings.length
    ? thisMonthData.standings
    : (() => {
        const map = new Map<string, { name: string; days: number }>()
        for (const k of thisMonthKings) {
          const e = map.get(k.admin_id)
          if (e) e.days++
          else map.set(k.admin_id, { name: k.name, days: 1 })
        }
        return [...map.entries()]
          .map(([id, d]) => ({ admin_id: id, ...d, totalTasks: scoreboard.find(s => s.admin_id === id)?.completed ?? 0 }))
          .sort((a, b) => b.days - a.days || b.totalTasks - a.totalTasks)
      })()

  const king = standings[0]

  if (!king && thisMonthKings.length === 0) {
    return <p className="text-xs text-center py-6" style={{ color: '#a0714f' }}>No logs this month yet. Drop some turds.</p>
  }

  return (
    <div className="space-y-4">
      {/* Monthly king banner */}
      {king && (
        <div className="rounded-xl px-4 py-3 text-center" style={{ background: 'linear-gradient(135deg, #3d1f0a 0%, #7b3f1a 100%)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#c07a3a' }}>{monthLabel(currentMonth)}</p>
          <p className="text-lg font-black" style={{ color: '#f5ddb0' }}>👑 {king.name}</p>
          <p className="text-[11px] font-semibold" style={{ color: '#c07a3a' }}>Poop King · {king.days} day{king.days !== 1 ? 's' : ''} on top</p>
        </div>
      )}

      {/* Monthly standings */}
      {standings.length > 1 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 px-1" style={{ color: '#7a4a2a' }}>Month Standings</p>
          <div className="space-y-1">
            {standings.map((s, i) => (
              <div key={s.admin_id} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: i === 0 ? '#ede0d4' : '#f7efe8' }}>
                <span className="text-[11px] font-bold" style={{ color: '#3d1f0a' }}>
                  {i === 0 ? '👑 ' : `${i + 1}. `}{s.name}
                </span>
                <span className="text-[10px]" style={{ color: '#7a4a2a' }}>
                  {s.days}d as king · {s.totalTasks} total 💩
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily log for this month */}
      {thisMonthKings.length > 0 && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1.5 px-1" style={{ color: '#7a4a2a' }}>Daily Log</p>
          <div className="space-y-1">
            {thisMonthKings.map(k => (
              <div key={k.date} className="flex items-center justify-between px-3 py-1.5 rounded" style={{ background: '#f7efe8' }}>
                <span className="text-[10px]" style={{ color: '#7a4a2a' }}>{dayLabel(k.date)}</span>
                <span className="text-[10px] font-semibold" style={{ color: '#3d1f0a' }}>💩 {k.name} · {k.count} turds</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
