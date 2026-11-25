'use client'
// Bracket format (Kyle 2026-11-21: "we also need to add bracket format to the aesthetic tool so that we can hash out the
// format"): a real tournament's brackets in the compact, split-halves layout (src/components/bracket/SplitBracket.tsx),
// with its sizes adjustable. The live bracket page keeps its current format until this one is approved.
import { useState } from 'react'
import { SplitBracket } from '@/components/bracket/SplitBracket'
import { BRACKET_LOOK_DEFAULT, type BracketLook } from '@/lib/bracketLook'
import { BoutBracket } from '@/components/bracket/BoutBracket'
import type { TournamentBrackets } from '@/lib/tournamentBrackets'

// look / setLook: the tool's settings (s.bracket), so the left panel's Save keeps them with the site look
export function BracketLab({ data, look, setLook }: { data: TournamentBrackets | null; look: BracketLook; setLook: (f: (p: BracketLook) => BracketLook) => void }) {
  const [weight, setWeight] = useState<number>(data?.weights[0] ?? 0)
  const [live, setLive] = useState(false)
  const set = <K extends keyof BracketLook>(k: K, v: BracketLook[K]) => setLook(p => ({ ...p, [k]: v }))
  if (!data) return <p className="text-sm text-slate-500">No tournament with that id.</p>
  const b = data.brackets[weight]
  const range = (k: 'cardW' | 'rowH' | 'firstRowH' | 'gap' | 'font', label: string, min: number, max: number) => (
    <label className="block">{label}: {look[k]}px<input type="range" min={min} max={max} value={look[k]} onChange={e => set(k, Number(e.target.value))} className="block w-full" /></label>
  )
  const check = (k: 'split' | 'lastNameOnly' | 'showSchool' | 'hover' | 'fit' | 'live', label: string) => (
    <label className="flex items-center gap-2"><input type="checkbox" checked={look[k]} onChange={e => set(k, e.target.checked)} /> {label}</label>
  )
  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-3 text-xs text-slate-600">
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Bracket format</h2>
        {check('split', 'Split halves (final in the middle)')}
        {check('fit', 'Fit to screen (card width = the most a card gets)')}
        {range('cardW', 'Card width', 60, 200)}
        {range('rowH', 'Line height', 10, 26)}
        {range('firstRowH', 'First-round line height', 8, 26)}
        {range('font', 'Name size', 8, 14)}
        {range('gap', 'Space between bouts', 0, 20)}
        {check('lastNameOnly', 'Last names only')}
        {check('showSchool', 'School under each name')}
        {check('hover', 'Hover opens the full bout')}
        <label className="flex items-center gap-2 border-t border-slate-200 pt-3"><input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} /> Show the live format below</label>
        <div className="border-t border-slate-200 pt-3 space-y-2">
          {check('live', 'Use this format on the live bracket page')}
          <p className="text-[11px] text-slate-500">Save (in the left panel) keeps these settings with the site look; the newest save is in effect. With the box above on, the live bracket pages switch to this format.</p>
          <button onClick={() => setLook(() => ({ ...BRACKET_LOOK_DEFAULT, live: look.live }))} className="border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">Bracket defaults</button>
        </div>
      </aside>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-900">{data.tournament.name} {data.tournament.season ?? ''}</h2>
        <div className="my-3 flex flex-wrap gap-1">
          {data.weights.map(w => (
            <button key={w} onClick={() => setWeight(w)} className={`px-2 py-0.5 text-xs border ${w === weight ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}>{w}</button>
          ))}
        </div>
        {data.mixed && <p className="mb-2 text-[11px] text-slate-500">The NJ outline marks NJSIAA wrestlers.</p>}
        {b ? <SplitBracket bracket={b} look={look} mixed={data.mixed} /> : <p className="text-sm text-slate-500">No bouts at {weight}.</p>}
        {live && b && <div className="mt-10 border-t border-slate-200 pt-6"><p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Live format</p><BoutBracket bracket={b} /></div>}
      </div>
    </div>
  )
}
