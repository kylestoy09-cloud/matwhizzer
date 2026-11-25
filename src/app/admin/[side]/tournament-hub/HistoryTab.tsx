'use client'
// Tournament Hub → History: the progress grid, and the review of what the import couldn't settle (teams, NJ wrestlers)
import { useState } from 'react'
import { HistoryGrid } from './HistoryGrid'
import { HistoryReview } from './HistoryReview'

export function HistoryTab({ gender }: { gender: 'M' | 'F' }) {
  const [view, setView] = useState<'progress' | 'review'>('progress')
  return (
    <div className="space-y-4">
      <div className="flex gap-1 text-sm">
        {([['progress', 'Progress'], ['review', 'Review — schools & wrestlers']] as const).map(([v, t]) => (
          <button key={v} onClick={() => setView(v)} className={`px-3 py-1 border ${view === v ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{t}</button>
        ))}
      </div>
      {view === 'progress' ? <HistoryGrid gender={gender} /> : <HistoryReview gender={gender} />}
    </div>
  )
}
