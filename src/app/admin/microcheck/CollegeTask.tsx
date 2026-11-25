'use client'
// A College review task in Microcheck (Kyle 2026-11-17: "make the college review a micro check — basically have
// everything in the box"): the same card as the College page's Review tab (CollegeReviewCard). A decision is saved
// through /api/admin/microcheck/complete, which hands back the next task.
import { useState } from 'react'
import { CollegeReviewCard } from '@/components/admin/CollegeReviewCard'
import type { ReviewRow } from '@/lib/ncaa/reviewShared'

export type CollegeReviewTask = { task_type: 'college_review'; task_key: string; group_label: string; gender: 'M' | 'F'; row: ReviewRow }
export const collegeClaimKey = (t: CollegeReviewTask) => `college:${t.gender}:${t.row.id}`

export function CollegeTask({ task, onNext, onSkip, onBack, compact }: {
  task: CollegeReviewTask
  onNext: (next: unknown) => void       // the following task from /complete
  onSkip: () => void
  onBack?: () => void
  compact?: boolean                     // the side panel
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function act(action: 'accept' | 'not_ours', wrestler_id?: string) {
    setBusy(true); setError(null)
    try {
      const d = await (await fetch('/api/admin/microcheck/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_type: 'college_review', task_key: task.task_key, gender: task.gender, entry_id: task.row.id, action, wrestler_id }) })).json()
      if (d.error) { setError(d.error); return }
      onNext(d.task)
    } catch { setError('Network error') } finally { setBusy(false) }
  }
  return (
    <div className={compact ? 'p-4 space-y-3' : 'max-w-2xl mx-auto px-5 py-10 space-y-4'}>
      <div className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-slate-400 uppercase tracking-widest`}>{task.group_label} · College Review</div>
      {!compact && <p className="text-sm text-slate-500">Is this college wrestler one of our NJ wrestlers?</p>}
      <CollegeReviewCard row={task.row} gender={task.gender} onAct={act} busy={busy} />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button disabled={busy} onClick={onSkip} className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40">Skip for now</button>
      {onBack && <button onClick={onBack} className="w-full text-xs text-slate-400 hover:text-slate-600 py-1">← Back to leaderboard</button>}
    </div>
  )
}
