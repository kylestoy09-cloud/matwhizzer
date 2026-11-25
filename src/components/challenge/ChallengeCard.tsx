'use client'

// The Daily Challenge for one day (Kyle 2026-11-12). Signed out: the button asks the fan to set up a
// profile. Signed in: "Today's Challenge" asks the server to start the clock and shows the question with a
// countdown (30 s unless the question says otherwise); one attempt; the right answer shows after. The
// server keeps the time, so refreshing doesn't reset it. Used on the admin sandbox page (sandbox prop) and,
// later, on the site.
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'

export type SandboxOpts = { asOf: string; player: string }
type State = {
  signedIn: boolean; available?: boolean; status?: 'ready' | 'playing' | 'done'; topic?: string; kind?: 'choice' | 'rank'
  question?: string; options?: string[]; time_limit_sec?: number; ms_left?: number
  is_correct?: boolean | null; timed_out?: boolean; answer?: number[] | null; correct?: number[]; elapsed_ms?: number | null; error?: string
}

export const sandboxQuery = (s?: SandboxOpts) => s ? `?sandbox=1&asOf=${s.asOf}&player=${encodeURIComponent(s.player)}` : ''
export const sandboxBody = (s?: SandboxOpts) => s ? { sandbox: true, asOf: s.asOf, player: s.player } : {}

export function ChallengeCard({ sandbox, onAnswered }: { sandbox?: SandboxOpts; onAnswered?: () => void }) {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [pick, setPick] = useState<number | null>(null)
  const [order, setOrder] = useState<number[]>([])
  const [left, setLeft] = useState(0)
  const deadline = useRef(0)

  const apply = useCallback((d: State) => {
    setS(d)
    if (d.status === 'playing') { deadline.current = Date.now() + (d.ms_left ?? 0); setLeft(d.ms_left ?? 0) }
  }, [])
  const load = useCallback(() => {
    fetch(`/api/challenge${sandboxQuery(sandbox)}`).then(r => r.json()).then(apply).catch(() => setS({ signedIn: true, error: 'Could not load the challenge' }))
  }, [sandbox, apply])
  useEffect(() => { load() }, [load])

  // The countdown the player sees; the server has the real clock
  useEffect(() => {
    if (s?.status !== 'playing') return
    const t = setInterval(() => {
      const ms = Math.max(0, deadline.current - Date.now())
      setLeft(ms)
      if (ms === 0) { clearInterval(t); setTimeout(load, 1600) }   // past the grace: the server marks it out of time
    }, 100)
    return () => clearInterval(t)
  }, [s?.status, load])

  async function post(body: Record<string, unknown>) {
    setBusy(true)
    const r = await fetch('/api/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sandboxBody(sandbox), ...body }) })
    const d = await r.json()
    setBusy(false)
    if (!r.ok) return setS(prev => ({ ...(prev ?? { signedIn: true }), error: d.error }))
    apply(d)
    if (d.status === 'done') onAnswered?.()
  }

  const box = 'border border-slate-200 bg-white p-5'
  if (!s) return <div className={box}><p className="text-sm text-slate-400">Loading…</p></div>
  if (!s.signedIn) return (
    <div className={box}>
      <p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-2">Daily Challenge</p>
      <Link href="/signup" className="inline-block px-4 py-2 bg-black text-white text-sm font-semibold">Set up a profile to play</Link>
    </div>
  )
  if (!s.available) return <div className={box}><p className="text-xs uppercase tracking-wide font-semibold text-slate-400 mb-1">Daily Challenge</p><p className="text-sm text-slate-500">No challenge today. Check back tomorrow.</p></div>

  const opts = s.options ?? []
  return (
    <div className={box}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-wide font-semibold text-slate-400">Daily Challenge{s.topic && s.topic !== 'general' ? ` · ${s.topic === 'girls' ? 'Girls' : 'Boys'}` : ''}</p>
        {s.status === 'playing' && <p className={`text-sm font-bold tabular-nums ${left < 10000 ? 'text-red-600' : 'text-slate-700'}`}>{Math.ceil(left / 1000)}s</p>}
      </div>

      {s.status === 'ready' && (
        <>
          <p className="text-sm text-slate-600 mb-3">You get one try and {s.time_limit_sec} seconds once the question shows.</p>
          <button onClick={() => post({ action: 'start' })} disabled={busy} className="px-4 py-2 bg-black text-white text-sm font-semibold disabled:opacity-40">Today&apos;s Challenge</button>
        </>
      )}

      {s.status === 'playing' && (
        <>
          <p className="font-semibold text-slate-900 mb-3">{s.question}</p>
          {s.kind === 'rank' ? (
            <>
              <p className="text-xs text-slate-500 mb-2">Tap them in order, first to last.{order.length > 0 && <button onClick={() => setOrder([])} className="ml-2 underline">start over</button>}</p>
              <div className="grid gap-2">
                {opts.map((o, i) => {
                  const n = order.indexOf(i)
                  return <button key={i} disabled={n >= 0 || busy} onClick={() => setOrder([...order, i])} className={`text-left px-3 py-2 border text-sm ${n >= 0 ? 'border-black bg-slate-100' : 'border-slate-300 hover:border-black'}`}>{n >= 0 && <b className="mr-2">{n + 1}.</b>}{o}</button>
                })}
              </div>
              <button onClick={() => post({ action: 'answer', answer: order })} disabled={order.length !== 4 || busy} className="mt-3 px-4 py-2 bg-black text-white text-sm font-semibold disabled:opacity-40">Submit</button>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                {opts.map((o, i) => <button key={i} onClick={() => setPick(i)} disabled={busy} className={`text-left px-3 py-2 border text-sm ${pick === i ? 'border-black bg-slate-100 font-semibold' : 'border-slate-300 hover:border-black'}`}>{o}</button>)}
              </div>
              <button onClick={() => pick != null && post({ action: 'answer', answer: [pick] })} disabled={pick == null || busy} className="mt-3 px-4 py-2 bg-black text-white text-sm font-semibold disabled:opacity-40">Submit</button>
            </>
          )}
        </>
      )}

      {s.status === 'done' && (
        <>
          <p className="font-semibold text-slate-900 mb-2">{s.question}</p>
          <p className={`text-sm font-semibold mb-2 ${s.is_correct ? 'text-emerald-700' : 'text-red-600'}`}>
            {s.is_correct ? `Correct! ${((s.elapsed_ms ?? 0) / 1000).toFixed(2)} seconds.` : s.timed_out ? 'Out of time.' : 'Not this time.'}
          </p>
          <p className="text-xs text-slate-500 mb-1">{s.kind === 'rank' ? 'The right order:' : 'The answer:'}</p>
          <ol className="text-sm list-decimal ml-5">
            {(s.kind === 'rank' ? (s.correct ?? []) : (s.correct ?? []).slice(0, 1)).map(i => <li key={i} className={s.kind === 'choice' ? 'list-none -ml-5 font-semibold' : ''}>{opts[i]}</li>)}
          </ol>
        </>
      )}
      {s.error && <p className="text-xs text-red-600 mt-2">{s.error}</p>}
    </div>
  )
}
