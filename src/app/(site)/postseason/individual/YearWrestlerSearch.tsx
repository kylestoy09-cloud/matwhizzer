'use client'

// "Search wrestlers" beside the year picker on a past year (Kyle 2026-11-14): type a name, pick one for the profile.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

type Hit = { id: string; name: string; school_id: number | null; school: string | null; event: string; place: number | null }
const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`

export function YearWrestlerSearch({ gender, season }: { gender: 'M' | 'F'; season: number }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [got, setGot] = useState<{ q: string; rows: Hit[] } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (q.trim().length < 2) return
    const t = setTimeout(() => {
      fetch(`/api/postseason/wrestlers?gender=${gender}&season=${season}&q=${encodeURIComponent(q.trim())}`).then(r => r.json()).then(d => setGot({ q, rows: d.rows ?? [] })).catch(() => setGot({ q, rows: [] }))
    }, 250)
    return () => clearTimeout(t)
  }, [q, gender, season])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const rows = q.trim().length >= 2 && got?.q === q ? got.rows : null
  return (
    <div ref={ref} className="relative ml-2">
      <input type="text" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} placeholder="Search wrestlers" autoComplete="off"
        className="border border-slate-300 px-2 py-1 text-sm w-48 sm:w-56 focus:outline-none focus:ring-1 focus:ring-slate-500" />
      {open && rows && (
        <div className="absolute left-0 top-full mt-0.5 w-80 max-w-[calc(100vw-2rem)] bg-white border border-black shadow-md z-30 divide-y divide-slate-100">
          {rows.length === 0 ? <p className="px-3 py-1.5 text-sm text-slate-400">No one by that name this season.</p> : rows.map(r => (
            <Link key={r.id} href={`/${side}/wrestler/${r.id}`} className="flex items-baseline gap-2 px-3 py-1.5 text-sm hover:bg-slate-50">
              <span className="font-medium text-slate-900 whitespace-nowrap">{r.name}</span>
              <span className="text-slate-500 truncate">{r.school ?? 'TBD'}</span>
              <span className="ml-auto text-xs text-slate-500 whitespace-nowrap">{r.event}{r.place ? ` · ${ord(r.place)}` : ''}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
