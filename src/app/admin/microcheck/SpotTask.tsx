'use client'
// A College spot check in Microcheck (Kyle 2026-11-19: "confirm college matches randomly … give the guys a link to
// name + college + wrestling … another button for name + college + high school + wrestling — then three buttons:
// confirmed, not him, can't tell"). One career the importer matched by itself; the answer is saved through
// /api/admin/microcheck/complete, which hands back the next task.
import { useState } from 'react'
import type { SpotCareer } from '@/lib/ncaa/spotCheck'
import { levelTab, ordinal } from '@/lib/ncaa/stats'

export type CollegeSpotTask = { task_type: 'college_spot'; task_key: string; group_label: string; gender: 'M' | 'F'; career: SpotCareer }
export const spotClaimKey = (t: CollegeSpotTask) => `spot:${t.gender}:${t.career.key}`

const google = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`

export function SpotTask({ task, onNext, onSkip, onBack, compact }: {
  task: CollegeSpotTask
  onNext: (next: unknown) => void
  onSkip: () => void
  onBack?: () => void
  compact?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const c = task.career
  async function act(action: 'confirmed' | 'not_him' | 'cant_tell') {
    setBusy(true); setError(null)
    try {
      const d = await (await fetch('/api/admin/microcheck/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'college_spot', task_key: task.task_key, gender: task.gender, key: c.key, action }) })).json()
      if (d.error) { setError(d.error); return }
      onNext(d.task)
    } catch { setError('Network error') } finally { setBusy(false) }
  }
  const btn = 'w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40'
  return (
    <div className={compact ? 'p-4 space-y-3' : 'max-w-xl mx-auto px-5 py-10 space-y-4'}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-slate-400 uppercase tracking-widest`}>{task.group_label} · College Spot Check</div>
      <p className="text-sm text-slate-500">We matched this NJ wrestler to a college career automatically. Is it the same person?</p>
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <div className="text-base font-bold text-slate-900">{c.name}</div>
        <div className="text-xs text-slate-500">High school: {c.hs ?? 'TBD'}</div>
        <div className="mt-2 text-sm font-semibold text-slate-800">{c.college}</div>
        <ul className="mt-1 space-y-0.5 text-xs text-slate-600 tabular-nums">
          {c.years.map((y, i) => <li key={i}>{y.year} · {levelTab(y.level)} · {y.weight} lb{y.place ? ` · ${ordinal(y.place)}` : ''}</li>)}
        </ul>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <a href={google(`${c.name} ${c.college} wrestling`)} target="_blank" rel="noopener noreferrer" className="block text-center py-2 rounded-lg border border-slate-300 text-sm font-semibold text-blue-700 hover:bg-slate-50">Search: name + college ↗</a>
        <a href={google(`${c.name} ${c.college} ${c.hs ?? ''} wrestling`)} target="_blank" rel="noopener noreferrer" className="block text-center py-2 rounded-lg border border-slate-300 text-sm font-semibold text-blue-700 hover:bg-slate-50">Search: name + college + high school ↗</a>
      </div>
      <p className="text-xs text-slate-500">Look for his college bio or a roster that names his high school or hometown.</p>
      <div className="grid grid-cols-3 gap-2">
        <button disabled={busy} onClick={() => act('confirmed')} className={`${btn} bg-emerald-600 text-white`}>Confirmed</button>
        <button disabled={busy} onClick={() => act('not_him')} className={`${btn} bg-red-600 text-white`}>Not him</button>
        <button disabled={busy} onClick={() => act('cant_tell')} className={`${btn} bg-slate-100 text-slate-700`}>Can&apos;t tell</button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button disabled={busy} onClick={onSkip} className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40">Skip for now</button>
      {onBack && <button onClick={onBack} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">← Back to leaderboard</button>}
    </div>
  )
}
