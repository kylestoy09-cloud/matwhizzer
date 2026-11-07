'use client'
// Region / district / state page parts (2026-11-07): the weight buttons as standard tiles in the accent
// color (boys region 7, girls region 3), and the R1–R8 / D1–D32 pill switcher kept from the live
// region page.
import Link from 'next/link'
import { StdTiles, useSideColors } from './StdPage'

export function WeightTiles({ side, hrefBase, weights }: { side: 'boys' | 'girls'; hrefBase: string; weights: number[] }) {
  const c = useSideColors(side)
  return <StdTiles tiles={weights.map(w => ({ key: w, label: String(w), href: `${hrefBase}/${w}`, ...c.accent }))} scale={0.7} />
}

export function NumberPills({ items, active }: { items: { key: number; label: string; href: string }[]; active: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => (
        <Link key={it.key} href={it.href}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${it.key === active ? 'bg-slate-800 text-white' : 'bg-white border border-black text-slate-700 hover:bg-slate-50 hover:border-slate-400'}`}>
          {it.label}
        </Link>
      ))}
    </div>
  )
}
