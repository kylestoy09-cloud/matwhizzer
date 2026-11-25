'use client'

// Daily Challenge (Kyle 2026-11-12), under Articles. One contest across boys and girls trivia, so both
// sides show the same list. Questions: one per date (12:00 AM – 11:59 PM Eastern), multiple choice or a
// ranking of four, with a time limit (30 s default); past dates are the archive. Winners: each week's two
// winners and their prize details. The research tabs hold the NJ boys wrestling history to write from.
// "Sandbox" switches the Questions and Winners tabs to the test copies the Challenge Sandbox page plays.
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { PinsTab, LowSeedTab, SeedsTab } from './BoutsTabs'
import { NjwhLink } from '@/components/site/NjwhLink'
import { useHistory, ExplorerTab, SchoolsTab, MedalTableTab, WrestlersTab, TeamTitlesTab, AllFinishesTab, matchWeights, MATCHED_FROM } from './HistoryTabs'

type Q = { id: number; challenge_date: string; topic: 'boys' | 'girls' | 'general'; kind: 'choice' | 'rank'; question: string; options: string[]; correct: number[]; time_limit_sec: number; notes: string | null; plays: number; correct_count?: number }
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const TABS = ['Questions', 'Winners', 'Explorer', 'Schools', 'Medal Table', 'Wrestlers', 'Team titles', 'All finishes', 'Pins & Techs', 'Low-Seed Champs', 'Seeds'] as const
type Tab = typeof TABS[number]
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const dayLabel = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const TOPIC: Record<string, string> = { boys: 'Boys', girls: 'Girls', general: 'General' }

export function DailyChallengeClient() {
  const { side, loaded, gender } = useAdminGender()
  const [tab, setTab] = useState<Tab>('Questions')
  const [sandbox, setSandbox] = useState(false)
  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Articles · one contest for boys and girls</p>
      <div className="flex items-center gap-4 mb-4">
        <h1 className="text-lg font-bold text-slate-900">Daily Challenge</h1>
        <Link href={`/admin/${side}/content/challenge-sandbox`} className="text-xs underline text-slate-500 hover:text-black">Open the sandbox</Link>
      </div>
      <div className="flex gap-1 border-b border-slate-200 mb-5 items-end">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-sm -mb-px border-b-2 ${tab === t ? 'border-black font-semibold text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>
        ))}
        {(tab === 'Questions' || tab === 'Winners') && (
          <label className="ml-auto mb-1 text-xs flex items-center gap-1 text-slate-600"><input type="checkbox" checked={sandbox} onChange={e => setSandbox(e.target.checked)} /> Sandbox copies</label>
        )}
      </div>
      {!loaded ? <p className="text-sm text-slate-400">Loading…</p>
        : tab === 'Questions' ? <QuestionsTab key={String(sandbox)} sandbox={sandbox} />
        : tab === 'Winners' ? <WinnersTab key={String(sandbox)} sandbox={sandbox} />
        : tab === 'Pins & Techs' ? <PinsTab gender={gender === 'F' ? 'F' : 'M'} />
        : tab === 'Low-Seed Champs' ? <LowSeedTab gender={gender === 'F' ? 'F' : 'M'} />
        : tab === 'Seeds' ? <SeedsTab gender={gender === 'F' ? 'F' : 'M'} />
        : <Research tab={tab} />}
    </div>
  )
}

// The history behind the questions. Boys or girls (the side's own to start; the one contest uses both — Kyle
// 2026-11-13), and a year range: all years, since 1996 with today's 14 weights lined up (boys), or since any year.
function Research({ tab }: { tab: Tab }) {
  const { gender } = useAdminGender()
  const [who, setWho] = useState<'M' | 'F'>(gender === 'F' ? 'F' : 'M')
  const girls = who === 'F'
  const { data, error } = useHistory(who)
  const [matched, setMatched] = useState(false)
  const [since, setSince] = useState('')     // a year typed in: only finishes from then on
  const from = /^\d{4}$/.test(since) ? Number(since) : null
  const finishes = useMemo(() => {
    if (!data) return []
    const f = matched && !girls ? matchWeights(data.finishes) : data.finishes
    return from ? f.filter(x => x.year >= from) : f
  }, [data, matched, girls, from])
  const titles = useMemo(() => (data ? data.titles.filter(t => !from || t.year >= from) : []), [data, from])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!data) return <p className="text-sm text-slate-400">Loading the history…</p>
  const btn = (on: boolean) => `px-3 py-1 border ${on ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`
  const switches = (
    <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
      <div className="flex">
        {(['M', 'F'] as const).map(g => <button key={g} onClick={() => { setWho(g); if (g === 'F') setMatched(false) }} className={btn(who === g)}>{g === 'M' ? 'Boys' : 'Girls'}</button>)}
      </div>
      <span className="text-slate-500 ml-3">Years</span>
      <button onClick={() => { setMatched(false); setSince('') }} className={btn(!matched && !since)}>All years</button>
      {!girls && tab !== 'Team titles' && <button onClick={() => { setMatched(true); setSince('') }} className={btn(matched)}>Since {MATCHED_FROM} (today&apos;s weights)</button>}
      <label className="flex items-center gap-1 text-slate-600">Since
        <input value={since} onChange={e => { setSince(e.target.value.replace(/\D/g, '').slice(0, 4)); setMatched(false) }} placeholder="2020" inputMode="numeric"
          className={`border px-2 py-1 w-20 ${since ? 'border-black' : 'border-slate-300'}`} />
      </label>
      {girls && <span className="text-xs text-slate-500">Girls: region and state podiums since 2019.</span>}
      {!girls && <span className="text-xs text-slate-500">Source: <NjwhLink /></span>}
      {matched && <span className="text-xs text-slate-500">Today&apos;s 14 weights only; each stands for the weights in brackets from earlier years (1996–2011, 2012–21), lined up by position.</span>}
    </div>
  )
  const key = `${who}${matched}${from ?? ''}`
  return <>
    {switches}
    {tab === 'Explorer' ? <ExplorerTab key={key} finishes={finishes} />
      : tab === 'Schools' ? <SchoolsTab key={key} finishes={finishes} titles={titles} />
      : tab === 'Medal Table' ? <MedalTableTab key={key} finishes={finishes} titles={titles} />
      : tab === 'Wrestlers' ? <WrestlersTab key={key} finishes={finishes} />
      : tab === 'Team titles' ? (girls ? <p className="text-sm text-slate-400">No girls team titles on file.</p> : <TeamTitlesTab titles={titles} />)
      : <AllFinishesTab key={key} finishes={finishes} />}
  </>
}

// ── Questions: one per date ──────────────────────────────────────────────────

function QuestionsTab({ sandbox }: { sandbox: boolean }) {
  const [rows, setRows] = useState<Q[] | null>(null)
  const [today, setToday] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [days, setDays] = useState(30)
  const [showPast, setShowPast] = useState(false)

  const load = useCallback(() => {
    fetch(`/api/admin/daily-challenge${sandbox ? '?sandbox=1' : ''}`).then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else { setRows(d.rows); setToday(d.today) } })
      .catch(() => setError('Could not load the questions'))
  }, [sandbox])
  useEffect(() => { load() }, [load])

  const byDate = useMemo(() => new Map((rows ?? []).map(r => [r.challenge_date, r])), [rows])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (!rows || !today) return <p className="text-sm text-slate-400">Loading…</p>
  // Sandbox: any date can be set up (the sandbox picks its own "today")
  const start = sandbox ? addDays(today, -7) : today
  const upcoming = [...new Set([...Array.from({ length: days + 1 }, (_, i) => addDays(start, i)), ...rows.map(r => r.challenge_date).filter(d => sandbox || d >= today)])].sort()
  const past = sandbox ? [] : rows.filter(r => r.challenge_date < today)
  const filled = upcoming.filter(d => byDate.has(d)).length

  return (
    <div>
      <p className="text-sm text-slate-600 mb-3">
        {sandbox ? 'Sandbox questions: set them on any dates, then play them on the sandbox page. ' : 'One question per day, shown 12:00 AM – 11:59 PM Eastern. '}
        {filled} of {upcoming.length} days listed have one.
        {!sandbox && upcoming.length - filled > 0 && <span className="text-amber-700"> First open day: {dayLabel(upcoming.find(d => !byDate.has(d))!)}.</span>}
      </p>
      <div className="border border-slate-200 divide-y divide-slate-100">
        {upcoming.map(d => (
          <DayRow key={d} date={d} today={today} q={byDate.get(d) ?? null} sandbox={sandbox} editing={editing === d}
            onEdit={() => setEditing(d)} onDone={() => { setEditing(null); load() }} />
        ))}
      </div>
      <button onClick={() => setDays(days + 30)} className="mt-2 text-sm underline text-slate-500 hover:text-black">Show 30 more days</button>

      {!sandbox && (
        <div className="mt-8">
          <button onClick={() => setShowPast(v => !v)} className="text-sm font-semibold text-slate-800">{showPast ? '▾' : '▸'} Archive ({past.length})</button>
          {showPast && (past.length === 0 ? <p className="text-sm text-slate-400 mt-2">Nothing has run yet.</p> : (
            <div className="border border-slate-200 divide-y divide-slate-100 mt-2">{past.map(q => <QuestionLine key={q.id} q={q} />)}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function QuestionLine({ q }: { q: Q }) {
  const ans = q.kind === 'rank' ? q.correct.map(i => q.options[i]).join(' → ') : q.options[q.correct[0]]
  return (
    <div className="px-4 py-2 text-sm flex gap-3">
      <span className="text-xs text-slate-400 w-36 shrink-0 pt-0.5">{dayLabel(q.challenge_date)}</span>
      <div className="flex-1">
        <span className="text-[11px] uppercase text-slate-400 mr-2">{TOPIC[q.topic]} · {q.kind === 'rank' ? 'ranking' : 'choice'} · {q.time_limit_sec}s</span>
        <span className="font-medium">{q.question}</span> <span className="text-slate-500">— {ans}</span>
        {q.plays > 0 && <span className="text-xs text-slate-400"> · {q.plays} played, {q.correct_count ?? 0} right</span>}
        {q.notes && <div className="text-xs text-slate-400">{q.notes}</div>}
      </div>
    </div>
  )
}

function DayRow({ date, today, q, sandbox, editing, onEdit, onDone }: { date: string; today: string; q: Q | null; sandbox: boolean; editing: boolean; onEdit: () => void; onDone: () => void }) {
  const [f, setF] = useState({
    topic: q?.topic ?? 'boys', kind: q?.kind ?? 'choice', question: q?.question ?? '', options: q?.options ?? ['', '', '', ''],
    correct: q?.correct ?? [] as number[], time: String(q?.time_limit_sec ?? 30), notes: q?.notes ?? '',
  })
  const [err, setErr] = useState<string | null>(null)
  const isToday = date === today
  const locked = !sandbox && !!q && q.plays > 0
  async function save() {
    const res = await fetch('/api/admin/daily-challenge', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandbox, challenge_date: date, topic: f.topic, kind: f.kind, question: f.question, options: f.options, correct: f.correct, time_limit_sec: Number(f.time), notes: f.notes }) })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onDone()
  }
  async function remove() {
    if (!confirm(`Remove the ${dayLabel(date)} question?`)) return
    const res = await fetch(`/api/admin/daily-challenge?date=${date}${sandbox ? '&sandbox=1' : ''}`, { method: 'DELETE' })
    const d = await res.json()
    if (!res.ok) return setErr(d.error)
    onDone()
  }
  const setOpt = (i: number, v: string) => setF({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) })
  const rankOf = (i: number) => f.correct.indexOf(i)
  const toggleRank = (i: number) => setF({ ...f, correct: rankOf(i) >= 0 ? f.correct.filter(x => x !== i) : [...f.correct, i] })

  if (editing) return (
    <div className="px-4 py-3 bg-slate-50 space-y-2">
      <p className="text-xs font-semibold text-slate-700">{dayLabel(date)}{isToday ? ' · today' : ''}</p>
      <div className="flex gap-2 flex-wrap text-sm items-center">
        <select value={f.topic} onChange={e => setF({ ...f, topic: e.target.value as Q['topic'] })} className={input}><option value="boys">Boys</option><option value="girls">Girls</option><option value="general">General</option></select>
        <select value={f.kind} onChange={e => setF({ ...f, kind: e.target.value as Q['kind'], correct: [] })} className={input}><option value="choice">Multiple choice</option><option value="rank">Ranking (order all four)</option></select>
        <label className="text-xs text-slate-500 flex items-center gap-1">Seconds <input value={f.time} onChange={e => setF({ ...f, time: e.target.value.replace(/\D/g, '') })} className={`${input} w-16`} /></label>
      </div>
      <textarea value={f.question} onChange={e => setF({ ...f, question: e.target.value })} placeholder="Question" rows={2} className={`${input} w-full`} />
      <p className="text-xs text-slate-500">{f.kind === 'choice' ? 'Mark the right answer.' : 'Click the numbers in the right order, first to last.'}</p>
      {f.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          {f.kind === 'choice'
            ? <input type="radio" checked={f.correct[0] === i} onChange={() => setF({ ...f, correct: [i] })} title="Right answer" />
            : <button onClick={() => toggleRank(i)} className={`w-7 h-7 text-xs border ${rankOf(i) >= 0 ? 'bg-black text-white border-black' : 'border-slate-300'}`}>{rankOf(i) >= 0 ? rankOf(i) + 1 : '–'}</button>}
          <input value={o} onChange={e => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} className={`${input} flex-1`} />
        </div>
      ))}
      <input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} placeholder="Notes (how you got it, for later)" className={`${input} w-full`} />
      <div className="flex gap-2 items-center">
        <button onClick={save} className="px-3 py-1 text-sm bg-black text-white">Save</button>
        <button onClick={onDone} className="px-3 py-1 text-sm border border-slate-300">Cancel</button>
        {q && (sandbox || !isToday) && <button onClick={remove} className="ml-auto text-xs text-slate-400 hover:text-red-600">Remove</button>}
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  )
  return (
    <div className={`flex items-start ${isToday ? 'bg-amber-50/60' : ''}`}>
      {q ? <div className="flex-1"><QuestionLine q={q} /></div> : (
        <div className="flex-1 px-4 py-2 text-sm flex gap-3"><span className="text-xs text-slate-400 w-36 shrink-0 pt-0.5">{dayLabel(date)}{isToday ? ' · today' : ''}</span><span className="text-slate-300">No question yet</span></div>
      )}
      {!locked && <button onClick={onEdit} className="text-xs underline text-slate-500 hover:text-black shrink-0 px-4 py-2">{q ? 'Edit' : 'Add'}</button>}
    </div>
  )
}

// ── Winners ──────────────────────────────────────────────────────────────────

type Claim = { id: number; week_start: string; kind: 'top' | 'random'; name: string; email: string | null; notified_at: string | null; notify_error: string | null; full_name: string | null; shirt_size: string | null; address1: string | null; address2: string | null; city: string | null; state: string | null; zip: string | null; submitted_at: string | null; mailed_at: string | null }
type Week = { week_start: string; top_correct: number | null; top_ms: number | null; entrants: number }

function WinnersTab({ sandbox }: { sandbox: boolean }) {
  const [d, setD] = useState<{ weeks: Week[]; claims: Claim[] } | null>(null)
  const load = useCallback(() => { fetch(`/api/admin/challenge-winners${sandbox ? '?sandbox=1' : ''}`).then(r => r.json()).then(setD) }, [sandbox])
  useEffect(() => { load() }, [load])
  async function mailed(c: Claim) {
    await fetch('/api/admin/challenge-winners', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: c.id, mailed: !c.mailed_at }) })
    load()
  }
  if (!d) return <p className="text-sm text-slate-400">Loading…</p>
  if (!d.weeks.length) return <p className="text-sm text-slate-400">No week has finished yet. Winners are picked automatically once a week (Monday–Sunday) ends.</p>
  return (
    <div className="space-y-4">
      {d.weeks.map(w => {
        const cs = d.claims.filter(c => c.week_start === w.week_start)
        return (
          <div key={w.week_start} className="border border-slate-200">
            <p className="px-4 py-2 bg-slate-50 text-sm font-semibold border-b border-slate-200">Week of {dayLabel(w.week_start)} · {w.entrants} players</p>
            {!cs.length && <p className="px-4 py-2 text-sm text-slate-400">No one answered that week.</p>}
            {cs.map(c => (
              <div key={c.id} className="px-4 py-2 text-sm border-b border-slate-100 last:border-0 flex gap-4 flex-wrap">
                <div className="w-56"><b>{c.kind === 'top' ? 'Top player' : 'Random winner'}:</b> {c.name}{c.kind === 'top' && w.top_correct != null && <span className="text-slate-500"> ({w.top_correct} correct, {((w.top_ms ?? 0) / 1000).toFixed(2)}s)</span>}<div className="text-xs text-slate-400">{c.email ?? (sandbox ? 'sandbox player' : 'no email')}</div></div>
                <div className="w-40 text-xs">{sandbox ? 'not emailed (sandbox)' : c.notified_at ? `emailed ${new Date(c.notified_at).toLocaleDateString()}` : <span className="text-red-600">email failed: {c.notify_error}</span>}</div>
                <div className="flex-1 text-xs">{c.submitted_at ? <>{c.full_name} · size {c.shirt_size}<br />{c.address1}{c.address2 ? `, ${c.address2}` : ''}, {c.city}, {c.state} {c.zip}</> : <span className="text-amber-700">waiting for size and address</span>}</div>
                <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={!!c.mailed_at} onChange={() => mailed(c)} disabled={!c.submitted_at} /> Mailed</label>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
