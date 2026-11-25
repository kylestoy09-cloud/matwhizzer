'use client'

// Challenge Sandbox (Kyle 2026-11-12): the Daily Challenge and polls exactly as fans will see them, played
// against the sandbox's own questions and polls (set up on the Daily Challenge / Polls pages with "Sandbox
// copies"). Pick the day it pretends to be and the test player; walk through a whole week in minutes:
// answer as several players, move the date past Sunday, and the week's winners are picked as they would be
// for real (never emailed). Reset clears the test plays, winners, claims and votes.
import { useState } from 'react'
import Link from 'next/link'
import { useAdminGender } from '@/components/admin/AdminGenderContext'
import { ChallengeCard } from '@/components/challenge/ChallengeCard'
import { ChallengeLeaderboard, PollCard, ClaimForm } from '@/components/challenge/ChallengeExtras'

const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const todayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
const shift = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

export function SandboxClient() {
  const { side } = useAdminGender()
  const [asOf, setAsOf] = useState(todayET())
  const [player, setPlayer] = useState('Tester 1')
  const [name, setName] = useState('Tester 1')
  const [tick, setTick] = useState(0)
  const sandbox = { asOf, player }
  const key = `${asOf}|${player}|${tick}`

  async function reset() {
    if (!confirm('Clear all sandbox plays, winners, prize forms and poll votes? (Sandbox questions and polls stay.)')) return
    await fetch('/api/admin/daily-challenge?sandbox=1&reset=1', { method: 'DELETE' })
    setTick(t => t + 1)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">Articles · test page (nothing here touches the real game)</p>
      <h1 className="text-lg font-bold text-slate-900 mb-1">Challenge Sandbox</h1>
      <p className="text-sm text-slate-500 mb-4">
        Plays the <Link href={`/admin/${side}/content/daily-challenge`} className="underline">sandbox questions</Link> and <Link href={`/admin/${side}/content/polls`} className="underline">sandbox polls</Link> (tick &ldquo;Sandbox copies&rdquo; there to set them up).
      </p>

      <div className="flex flex-wrap items-end gap-3 border border-slate-200 bg-slate-50 p-3 mb-5 text-sm">
        <label className="text-xs text-slate-500">Pretend today is<br />
          <span className="flex gap-1 mt-0.5">
            <button onClick={() => setAsOf(shift(asOf, -1))} className="px-2 border border-slate-300 bg-white">‹</button>
            <input type="date" value={asOf} onChange={e => e.target.value && setAsOf(e.target.value)} className={input} />
            <button onClick={() => setAsOf(shift(asOf, 1))} className="px-2 border border-slate-300 bg-white">›</button>
          </span>
        </label>
        <label className="text-xs text-slate-500">Playing as<br />
          <span className="flex gap-1 mt-0.5">
            <input value={name} onChange={e => setName(e.target.value)} className={`${input} w-36`} />
            <button onClick={() => name.trim() && setPlayer(name.trim())} className="px-2 border border-slate-300 bg-white">Switch</button>
          </span>
        </label>
        <span className="text-xs text-slate-500 pb-1">{new Date(`${asOf}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })} · as <b>{player}</b></span>
        <button onClick={reset} className="ml-auto px-3 py-1 border border-slate-300 bg-white text-xs hover:border-red-500 hover:text-red-600">Reset test plays</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <ClaimForm key={`c${key}`} sandbox={sandbox} />
          <ChallengeCard key={`q${key}`} sandbox={sandbox} onAnswered={() => setTick(t => t + 1)} />
          <PollCard key={`p${key}`} sandbox={sandbox} />
        </div>
        <ChallengeLeaderboard key={`l${key}`} sandbox={sandbox} />
      </div>
      <p className="text-xs text-slate-400 mt-4">To test the weekly winners: answer on a few days as two or three players, then set the date to the next Monday. The winners appear on the leaderboard and on Daily Challenge → Winners (Sandbox copies), and a winner sees the prize form here.</p>
    </div>
  )
}
