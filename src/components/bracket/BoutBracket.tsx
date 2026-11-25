'use client'
// A weight's bracket drawn from its bouts (src/lib/boutBracket.ts): the championship tree with connectors, then the
// consolation rounds. Names link to the wrestler; schools come from the school records (never imported text).
import Link from 'next/link'
import type { BracketBout, BracketPerson, WeightBracket } from '@/lib/boutBracket'
import { NjIcon } from '@/components/site/NjIcon'

const CW = 168   // card width
const CH = 60    // card height
const GAP = 10   // space between first-column cards
const KW = 22    // connector column width
const UNIT = CH + GAP

function Side({ p, won }: { p: BracketPerson | null; won: boolean }) {
  if (!p) return <div className="h-[22px] px-1.5 flex items-center text-[10px] text-slate-300">Bye</div>
  return (
    <div className={`h-[22px] px-1.5 flex items-center gap-1 min-w-0 ${won ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
      {p.seed ? <span className="shrink-0 text-[9px] font-normal text-slate-400 tabular-nums">{p.seed}</span> : null}
      {p.nj && <NjIcon />}
      <span className="truncate text-[11px]">{p.id ? <Link href={`/wrestler/${p.id}`} className="hover:underline">{p.name}</Link> : p.name}</span>
      {p.school && <span className="truncate text-[9px] font-normal text-slate-400 shrink">{p.school}</span>}
    </div>
  )
}

function Card({ b }: { b: BracketBout }) {
  return (
    <div className="border border-slate-300 bg-white overflow-hidden flex flex-col" style={{ width: CW, height: CH }}>
      <Side p={b.top} won={b.winner === 'top'} />
      <div className="border-t border-slate-200" />
      <Side p={b.bottom} won={b.winner === 'bottom'} />
      {b.result && <div className="border-t border-slate-100 px-1.5 text-[9px] leading-[14px] text-slate-400 truncate">{b.result}</div>}
    </div>
  )
}

export function BoutBracket({ bracket }: { bracket: WeightBracket }) {
  const { champ, cons } = bracket
  const depth = champ.length
  const treeShaped = depth > 0 && champ[depth - 1].cells.length === 1 && champ.every((c, i) => c.cells.length === 2 ** (depth - 1 - i))
  const H = treeShaped ? 2 ** (depth - 1) * UNIT : 0
  const W = depth * CW + (depth - 1) * KW
  const centerY = (col: number, i: number) => (i + 0.5) * 2 ** col * UNIT
  return (
    <div className="space-y-8">
      {depth > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Championship</p>
          {treeShaped ? (
            <div className="overflow-x-auto pb-2">
              <div className="flex mb-1" style={{ width: W }}>
                {champ.map((c, i) => <p key={i} className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest" style={{ width: CW, marginRight: i < depth - 1 ? KW : 0 }}>{c.label}</p>)}
              </div>
              <div className="relative" style={{ width: W, height: H }}>
                <svg className="absolute inset-0 pointer-events-none" width={W} height={H}>
                  {champ.slice(1).map((col, c1) => col.cells.map((b, i) => {
                    if (!b) return null
                    const c = c1 + 1, x = c * (CW + KW), y = centerY(c, i)
                    const kids = [champ[c - 1].cells[2 * i], champ[c - 1].cells[2 * i + 1]]
                    return kids.map((k, j) => k && (
                      <polyline key={`${c}-${i}-${j}`} points={`${x - KW},${centerY(c - 1, 2 * i + j)} ${x - KW / 2},${centerY(c - 1, 2 * i + j)} ${x - KW / 2},${y} ${x},${y}`} fill="none" stroke="#CBD5E1" strokeWidth={1.5} />
                    ))
                  }))}
                </svg>
                {champ.map((col, c) => col.cells.map((b, i) => b && (
                  <div key={`${c}-${i}`} className="absolute" style={{ left: c * (CW + KW), top: centerY(c, i) - CH / 2 }}><Card b={b} /></div>
                )))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-6">
              {champ.map((c, i) => (
                <div key={i}>
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{c.label}</p>
                  <div className="flex flex-col gap-2">{c.cells.map((b, j) => b && <Card key={j} b={b} />)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {!bracket.complete && depth > 0 && (
        <p className="text-xs text-slate-500">Partial bracket — only bouts with NJ wrestlers are on file for this weight.</p>
      )}
      {cons.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Consolation</p>
          <div className="flex flex-wrap gap-6">
            {cons.map((c, i) => (
              <div key={i}>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">{c.label}</p>
                <div className="flex flex-col gap-2">{c.bouts.map(b => <Card key={b.id} b={b} />)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {bracket.other.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Other bouts</p>
          <div className="flex flex-wrap gap-2">{bracket.other.map(b => <Card key={b.id} b={b} />)}</div>
        </div>
      )}
    </div>
  )
}
