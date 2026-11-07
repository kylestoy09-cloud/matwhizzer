'use client'
// Standings buttons in the standard tiles (2026-11-07): boys sections × groups (each section in its
// region color, Non-Public in the accent), conferences (accent), and the girls lists.
import { StdTiles, useSideColors } from '@/components/site/StdPage'

type Btn = { key: string; label: string; href: string }

export function BoysGroupButtons({ rows, nonPublic }: { rows: { section: string; buttons: Btn[] }[]; nonPublic: Btn[] }) {
  const c = useSideColors('boys')
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.section} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-sm font-semibold text-slate-700">{r.section}</span>
          <div className="flex-1"><StdTiles tiles={r.buttons.map(b => ({ ...b, ...c.region(i + 1) }))} scale={0.7} minWidth={90} /></div>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <span className="w-20 shrink-0 text-sm font-semibold text-slate-700">Non-Public</span>
        <div className="flex-1"><StdTiles tiles={nonPublic.map(b => ({ ...b, ...c.accent }))} scale={0.7} minWidth={90} /></div>
      </div>
    </div>
  )
}

export function ConferenceButtons({ side, buttons }: { side: 'boys' | 'girls'; buttons: Btn[] }) {
  const c = useSideColors(side)
  return <StdTiles tiles={buttons.map(b => ({ ...b, ...c.accent }))} scale={0.7} minWidth={160} />
}

export function GirlsListButtons({ buttons }: { buttons: Btn[] }) {
  const c = useSideColors('girls')
  return <StdTiles tiles={buttons.map((b, i) => ({ ...b, ...c.region(i + 1) }))} scale={0.7} minWidth={160} />
}
