'use client'
// The Individual Post Season buttons and podium (2026-11-07): the State button, Regions and Districts
// in their region colors (each shown once its bracket is set), and On the Podium as a table where a
// school opens to its placers.
import { Fragment, useState } from 'react'
import Link from 'next/link'
import { StdTiles, useSideColors } from '@/components/site/StdPage'
import { SchoolLogoBadge } from '@/components/SchoolLogoBadge'

const ordinal = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`

export function TournamentButtons({ side, state, regions, districts }: { side: 'boys' | 'girls'; state: boolean; regions: number[]; districts: number[] }) {
  const c = useSideColors(side)
  const P = side === 'girls' ? 'Girls' : 'Boys'
  return (
    <div className="space-y-8">
      {state && <StdTiles tiles={[{ key: 'state', label: `${P} State Tournament →`, href: `/${side}/state`, ...c.accent }]} scale={0.8} minWidth={280} center />}
      {regions.length > 0 && (
        <section>
          <h2 className="mb-3 text-center text-lg font-bold text-slate-900">Regions</h2>
          <StdTiles tiles={regions.map(r => ({ key: r, label: String(r), href: `/${side}/regions/${r}`, ...c.region(r) }))} groupSize={4} center />
        </section>
      )}
      {districts.length > 0 && (
        <section>
          <h2 className="mb-3 text-center text-lg font-bold text-slate-900">Districts</h2>
          <StdTiles tiles={districts.map(d => ({ key: d, label: String(d), href: `/${side}/districts/${d}`, ...c.district(d) }))} scale={0.75} groupSize={side === 'girls' ? 3 : 4} center />
        </section>
      )}
    </div>
  )
}

export type PodiumSchool = { school_id: number; school_name: string; logo_url: string | null; bg_color: string | null; placers: { weight: number; wrestler_id: string; wrestler_name: string; place: number }[] }

export function PodiumTable({ side, schools }: { side: 'boys' | 'girls'; schools: PodiumSchool[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="overflow-x-auto border border-black">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{['#', 'School', 'Placers'].map(h => <th key={h} className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide">{h}</th>)}</tr></thead>
        <tbody>
          {schools.map((s, i) => (
            <Fragment key={s.school_id}>
              <tr className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                <td className="px-3 py-1 tabular-nums">{i + 1}</td>
                <td className="px-3 py-1">
                  <button onClick={() => setOpen(o => (o === s.school_id ? null : s.school_id))} className="flex items-center gap-1.5 font-semibold text-slate-900 hover:underline">
                    <SchoolLogoBadge logoUrl={s.logo_url} bgColor={s.bg_color} />
                    {s.school_name} <span className="text-slate-400">{open === s.school_id ? '▴' : '▾'}</span>
                  </button>
                </td>
                <td className="px-3 py-1 tabular-nums">{s.placers.length}</td>
              </tr>
              {open === s.school_id && (
                <tr><td colSpan={3} className="bg-slate-100 px-6 py-2">
                  <table className="text-[12px]">
                    <thead><tr className="text-slate-500">{['Wt', 'Wrestler', 'Place'].map(h => <th key={h} className="px-3 py-0.5 text-left font-semibold">{h}</th>)}</tr></thead>
                    <tbody>{s.placers.map(p => (
                      <tr key={`${p.weight}-${p.wrestler_id}`}>
                        <td className="px-3 py-0.5 tabular-nums">{p.weight}</td>
                        <td className="px-3 py-0.5"><Link href={`/${side}/wrestler/${p.wrestler_id}`} className="hover:underline">{p.wrestler_name}</Link></td>
                        <td className="px-3 py-0.5">{ordinal(p.place)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
