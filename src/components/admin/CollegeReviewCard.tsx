'use client'
// One college entrant who might be ours (Kyle 2026-11-17): name, college, year / level / weight / place / seed, a
// Google search, "Not ours", each candidate with "This is him", and a search for someone else. The same card on the
// College page's Review tab and in Microcheck (src/lib/ncaa/review.ts).
import Link from 'next/link'
import { useState } from 'react'
import { reviewGoogleUrl, type ReviewRow } from '@/lib/ncaa/reviewShared'

const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 >= 11 && n % 100 <= 13 ? 0 : n % 10] ?? 'th'}`

export function CollegeReviewCard({ row: r, gender, onAct, busy }: { row: ReviewRow; gender: 'M' | 'F'; onAct: (action: 'accept' | 'not_ours', wrestlerId?: string) => void; busy?: boolean }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<{ id: string; display_name: string }[]>([])
  async function find(v: string) {
    setQ(v)
    if (v.trim().length < 3) { setHits([]); return }
    const d = await (await fetch(`/api/admin/search-wrestlers?gender=${gender}&q=${encodeURIComponent(v.trim())}`)).json()
    setHits(d.wrestlers ?? [])
  }
  const c = r.college
  return (
    <div className={`border border-slate-200 bg-white p-3 text-left ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold text-slate-900">{r.name}</span>
        {c ? <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: c.primary_color ?? '#334155', color: c.secondary_color ?? '#fff' }}>{c.name}</span> : <span className="text-xs text-slate-500">{r.college_raw}</span>}
        <span className="text-slate-500">{(r.years?.length ? r.years : [r]).map(y => `${y.year} ${y.level} · ${y.weight}${y.place ? ` · ${ord(y.place)}` : ''}${y.seed ? ` · seed ${y.seed}` : ''}`).join('  |  ')}</span>
        <a href={reviewGoogleUrl(r)} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-700 underline">Google him ↗</a>
        <button onClick={() => onAct('not_ours')} className="ml-auto border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50">Not ours</button>
      </div>
      <ul className="space-y-1">
        {r.candidates.map(cd => (
          <li key={cd.wrestler_id} className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => onAct('accept', cd.wrestler_id)} className="bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white hover:bg-emerald-800">This is him</button>
            <Link href={`/admin/${side}/wrestlers/${cd.wrestler_id}`} target="_blank" className="font-medium text-slate-800 hover:underline">{cd.name}</Link>
            <span className="text-slate-500">{cd.schools || '—'} · {cd.hs} · {cd.gap}</span>
            <span className="text-xs text-amber-700">{cd.why}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => find(e.target.value)} placeholder="Someone else? Search our wrestlers…" className="w-64 border border-slate-200 px-2 py-0.5 text-xs" />
        {hits.slice(0, 6).map(h => (
          <button key={h.id} onClick={() => onAct('accept', h.id)} className="border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-50">{h.display_name}</button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400">One card per wrestler at this college{r.years?.length > 1 ? ` (${r.years.length} NCAA years)` : ''}: a decision covers every year.</p>
    </div>
  )
}
