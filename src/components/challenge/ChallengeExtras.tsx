'use client'

// Daily Challenge leaderboard, poll card and prize form (Kyle 2026-11-12). Used on the admin sandbox page
// (sandbox prop) and, later, on the site.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { sandboxBody, sandboxQuery, type SandboxOpts } from './ChallengeCard'

const box = 'border border-slate-200 bg-white p-5'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const secs = (ms: number) => `${(ms / 1000).toFixed(2)}s`
const weekLabel = (iso: string) => `Week of ${new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`

// ── Leaderboard ──────────────────────────────────────────────────────────────

type Board = { week: string; rows: { rank: number; name: string; correct: number; ms: number; answered: number; me: boolean }[]; winners: { week: string; top: string | null; top_correct: number | null; top_ms: number | null; random: string | null; entrants: number }[]; error?: string }

export function ChallengeLeaderboard({ sandbox, refresh = 0 }: { sandbox?: SandboxOpts; refresh?: number }) {
  const [b, setB] = useState<Board | null>(null)
  useEffect(() => {
    fetch(`/api/challenge/leaderboard${sandboxQuery(sandbox)}`).then(r => r.json()).then(setB).catch(() => setB(null))
  }, [sandbox, refresh])
  if (!b) return <div className={box}><p className="text-sm text-slate-400">Loading…</p></div>
  if (b.error) return <div className={box}><p className="text-sm text-red-600">{b.error}</p></div>
  return (
    <div className={box}>
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-1">This week · {weekLabel(b.week)}</p>
      <p className="text-xs text-slate-500 mb-3">Most correct answers wins; ties go to the least total time.</p>
      {!b.rows.length ? <p className="text-sm text-slate-400">No answers yet this week.</p> : (
        <table className="w-full text-sm"><thead><tr className="text-[11px] uppercase text-slate-400 text-left"><th className="py-1">#</th><th>Player</th><th className="text-right">Correct</th><th className="text-right">Time</th></tr></thead>
          <tbody>{b.rows.slice(0, 25).map(r => (
            <tr key={r.rank} className={`border-t border-slate-100 ${r.me ? 'bg-amber-50 font-semibold' : ''}`}><td className="py-1 text-slate-400">{r.rank}</td><td>{r.name}{r.me ? ' (you)' : ''}</td><td className="text-right tabular-nums">{r.correct}/{r.answered}</td><td className="text-right tabular-nums">{r.correct ? secs(r.ms) : '—'}</td></tr>
          ))}</tbody></table>
      )}
      {b.winners.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-1">Past winners</p>
          {b.winners.map(w => (
            <p key={w.week} className="text-sm text-slate-600">{weekLabel(w.week)}: <b>{w.top ?? 'no correct answers'}</b>{w.top && w.top_correct != null ? ` (${w.top_correct} correct, ${secs(w.top_ms ?? 0)})` : ''}{w.random ? ` · random winner: ${w.random}` : ''}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Poll ─────────────────────────────────────────────────────────────────────

type PollState = { signedIn: boolean; available?: boolean; question?: string; answers?: string[]; voted?: number | null; total?: number; pct?: number[]; error?: string }

export function PollCard({ sandbox }: { sandbox?: SandboxOpts }) {
  const [p, setP] = useState<PollState | null>(null)
  const load = useCallback(() => { fetch(`/api/poll${sandboxQuery(sandbox)}`).then(r => r.json()).then(setP) }, [sandbox])
  useEffect(() => { load() }, [load])
  async function vote(choice: number) {
    const r = await fetch('/api/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sandboxBody(sandbox), choice }) })
    const d = await r.json()
    setP(r.ok ? d : { ...(p ?? { signedIn: true }), error: d.error })
  }
  if (!p) return <div className={box}><p className="text-sm text-slate-400">Loading…</p></div>
  if (!p.signedIn) return <div className={box}><p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">Poll</p><Link href="/signup" className="inline-block px-4 py-2 bg-black text-white text-sm font-semibold">Set up a profile to vote</Link></div>
  if (!p.available) return <div className={box}><p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-1">Poll</p><p className="text-sm text-slate-500">No poll today.</p></div>
  return (
    <div className={box}>
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">Poll</p>
      <p className="font-semibold text-slate-900 mb-3">{p.question}</p>
      <div className="grid gap-2">
        {(p.answers ?? []).map((a, i) => p.voted == null
          ? <button key={i} onClick={() => vote(i)} className="text-left px-3 py-2 border border-slate-300 hover:border-black text-sm">{a}</button>
          : (
            <div key={i} className={`relative border text-sm px-3 py-2 ${p.voted === i ? 'border-black font-semibold' : 'border-slate-200'}`}>
              <div className="absolute inset-y-0 left-0 bg-slate-100" style={{ width: `${p.pct?.[i] ?? 0}%` }} />
              <div className="relative flex justify-between"><span>{a}</span><span className="tabular-nums">{p.pct?.[i] ?? 0}%</span></div>
            </div>
          ))}
      </div>
      {p.voted != null && <p className="text-xs text-slate-400 mt-2">{p.total} vote{p.total === 1 ? '' : 's'}</p>}
      {p.error && <p className="text-xs text-red-600 mt-2">{p.error}</p>}
    </div>
  )
}

// ── Prize form ───────────────────────────────────────────────────────────────

type Claim = { id: number; week_start: string; kind: 'top' | 'random'; submitted_at: string | null; shirt_size: string | null }

export function ClaimForm({ sandbox, refresh = 0 }: { sandbox?: SandboxOpts; refresh?: number }) {
  const [data, setData] = useState<{ signedIn: boolean; sizes?: string[]; claims?: Claim[] } | null>(null)
  const [form, setForm] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const load = useCallback(() => { fetch(`/api/challenge/claim${sandboxQuery(sandbox)}`).then(r => r.json()).then(setData) }, [sandbox])
  useEffect(() => { load() }, [load, refresh])
  if (!data) return null
  if (!data.signedIn) return <div className={box}><p className="text-sm">Sign in to claim your prize.</p></div>
  const open = (data.claims ?? []).filter(c => !c.submitted_at)
  if (!open.length) return sandbox ? <div className={box}><p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-1">Prize</p><p className="text-sm text-slate-500">{data.claims?.length ? 'Prize details sent.' : 'This player has no prize to claim.'}</p></div> : null
  const c = open[0]
  async function submit() {
    const r = await fetch('/api/challenge/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sandboxBody(sandbox), id: c.id, ...form }) })
    const d = await r.json()
    if (!r.ok) return setMsg({ ok: false, text: d.error })
    setMsg({ ok: true, text: 'Thanks! Your prize is on its way.' }); setForm({}); load()
  }
  const f = (k: string, label: string, w = 'w-full') => <input value={form[k] ?? ''} onChange={e => setForm({ ...form, [k]: e.target.value })} placeholder={label} className={`${input} ${w}`} />
  return (
    <div className="border-2 border-amber-400 bg-amber-50 p-5">
      <p className="font-bold text-slate-900">You won the Daily Challenge! 🎉</p>
      <p className="text-sm text-slate-600 mb-3">{weekLabel(c.week_start)} · {c.kind === 'top' ? 'most correct in the least time' : 'random winner'}. Tell us your shirt size and where to mail your prize.</p>
      <div className="grid gap-2 max-w-md">
        <select value={form.shirt_size ?? ''} onChange={e => setForm({ ...form, shirt_size: e.target.value })} className={input}><option value="">Shirt size…</option>{(data.sizes ?? []).map(s => <option key={s} value={s}>{s}</option>)}</select>
        {f('full_name', 'Full name')}{f('address1', 'Street address')}{f('address2', 'Apt, suite (optional)')}
        <div className="flex gap-2">{f('city', 'City', 'flex-1')}{f('state', 'State', 'w-20')}{f('zip', 'ZIP', 'w-28')}</div>
        <button onClick={submit} className="px-4 py-2 bg-black text-white text-sm font-semibold">Send</button>
        {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
