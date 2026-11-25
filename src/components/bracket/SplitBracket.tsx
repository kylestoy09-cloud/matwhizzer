'use client'
// A compact bracket (Kyle 2026-11-21, Aesthetic tool first: "these brackets need to be tighter … a hover expand to show
// everything … split the bracket in its halves and have one half on one side and the other half on the other side",
// like a March Madness sheet). The championship tree's top half reads left to right, its bottom half right to left,
// the final in the middle with the 3rd / 5th / 7th place bouts under it; the other consolation rounds follow below.
// Cards show last names only (the NJ outline for NJSIAA wrestlers where others are in the bracket); hovering a card
// opens the full bout: names, schools, result. Sizes come from the Aesthetic tool's bracket settings (BracketLook).
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import type { BracketBout, BracketPerson, WeightBracket } from '@/lib/boutBracket'
import { roundStep } from '@/lib/boutOrder'
import { NjIcon } from '@/components/site/NjIcon'
import { BRACKET_LOOK_DEFAULT, type BracketLook } from '@/lib/bracketLook'
export { BRACKET_LOOK_DEFAULT, type BracketLook }


const KW = 14   // connector width
const PLACE = /^(3rd|5th|7th)/

const shortName = (n: string, last: boolean) => {
  if (!last) return n
  const parts = n.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : n
}

function Line({ p, won, look, mark, tag }: { p: BracketPerson | null; won: boolean; look: BracketLook & { seedSpace?: boolean }; mark: boolean; tag?: string }) {
  if (!p) return <div className="flex items-center px-1 text-slate-300" style={{ height: look.rowH, fontSize: look.font }}>Bye</div>
  return (
    <div className={`flex items-center gap-0.5 px-1 min-w-0 ${won ? 'font-bold text-slate-900' : 'text-slate-500'}`} style={{ height: look.showSchool ? look.rowH * 1.6 : look.rowH, fontSize: look.font }}>
      {p.seed ? <span className="shrink-0 w-3 text-right font-normal text-slate-400 tabular-nums" style={{ fontSize: look.font - 1 }}>{p.seed}</span> : look.seedSpace ? <span className="shrink-0 w-3" /> : null}
      {mark && p.nj && <NjIcon className="h-2.5 w-1.5 shrink-0" />}
      <span className="min-w-0 leading-none">
        <span className="block truncate">{shortName(p.name, look.lastNameOnly)}</span>
        {look.showSchool && p.school && <span className="block truncate font-normal text-slate-400" style={{ fontSize: look.font - 2 }}>{p.school}</span>}
      </span>
      {/* ↓QF: dropped from the championship side in that round; ↑C2: won that consolation round to get here */}
      {tag && <span className={`ml-auto shrink-0 pl-0.5 font-normal ${tag.startsWith('↑') ? 'text-emerald-700' : 'text-amber-700'}`} style={{ fontSize: look.font - 2 }} title={tag.startsWith('↑') ? `Won ${tag.slice(1)} to get here` : `Dropped from the championship side (${tag.slice(1)})`}>{tag}</span>}
    </div>
  )
}

function Full({ p, won, mark }: { p: BracketPerson | null; won: boolean; mark: boolean }) {
  if (!p) return <div className="px-2 py-1 text-[11px] text-slate-300">Bye</div>
  return (
    <div className={`px-2 py-1 ${won ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
      <div className="flex items-center gap-1 text-[12px]">{p.seed ? <span className="font-normal text-slate-400 tabular-nums">#{p.seed}</span> : null}{mark && p.nj && <NjIcon />}{p.id ? <Link href={`/wrestler/${p.id}`} className="hover:underline">{p.name}</Link> : p.name}</div>
      {p.school && <div className="text-[10px] font-normal text-slate-400">{p.school}</div>}
    </div>
  )
}

/** One bout: compact; on hover the full bout opens over it (toward the middle of the sheet) */
function Card({ b, look, mark, toLeft, label, tagOf }: { b: BracketBout | null; look: BracketLook & { seedSpace?: boolean }; mark: boolean; toLeft?: boolean; label?: string; tagOf?: (p: BracketPerson | null) => string | undefined }) {
  const h = cardH(look)
  if (!b) return <div style={{ width: look.cardW, height: h }} />
  return (
    <div className="group relative" style={{ width: look.cardW, height: h }}>
      <div className="h-full border border-slate-300 bg-white overflow-hidden flex flex-col">
        <Line p={b.top} won={b.winner === 'top'} look={look} mark={mark} tag={tagOf?.(b.top)} />
        <div className="border-t border-slate-200" />
        <Line p={b.bottom} won={b.winner === 'bottom'} look={look} mark={mark} tag={tagOf?.(b.bottom)} />
      </div>
      {look.hover && (
        <div className={`pointer-events-none absolute top-1/2 z-30 hidden w-60 -translate-y-1/2 border border-black bg-white shadow-lg group-hover:block group-hover:pointer-events-auto ${toLeft ? 'right-0' : 'left-0'}`}>
          {label && <div className="bg-slate-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">{label}</div>}
          <Full p={b.top} won={b.winner === 'top'} mark={mark} />
          <div className="border-t border-slate-200" />
          <Full p={b.bottom} won={b.winner === 'bottom'} mark={mark} />
          {b.result && <div className="border-t border-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{b.result}</div>}
        </div>
      )}
    </div>
  )
}

const cardH = (look: BracketLook) => (look.showSchool ? look.rowH * 1.6 : look.rowH) * 2 + 3

export function SplitBracket({ bracket, look: given, mixed }: { bracket: WeightBracket; look: BracketLook; mixed: boolean }) {
  const { champ, cons } = bracket
  const D = champ.length
  const tree = D > 0 && champ[D - 1].cells.length === 1 && champ.every((c, i) => c.cells.length === 2 ** (D - 1 - i))
  // fit: the page width shared out over the columns (a card never wider than the set width, nor under 56px)
  const box = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const nCols = given.split ? 2 * (D - 1) + 1 : D
  const fitW = width ? Math.floor((width - (nCols - 1) * KW) / nCols) : given.cardW
  // seeds: a bracket with any keeps a seed's width on every line, so the names line up
  const seeded = champ.some(c => c.cells.some(b => b?.top?.seed || b?.bottom?.seed))
  const look = { ...(given.fit ? { ...given, cardW: Math.max(56, Math.min(given.cardW, fitW)) } : given), seedSpace: seeded }
  const CH = cardH(look), CW = look.cardW, STEP = CW + KW
  const places = cons.filter(c => PLACE.test(c.label)).sort((a, b) => a.label.localeCompare(b.label))
  const wrestlebacks = cons.filter(c => !PLACE.test(c.label))

  if (!tree) return <p ref={box} className="text-xs text-slate-500">This weight&apos;s championship bouts don&apos;t form one tree (a round label is missing); the full list is on the live bracket page.</p>

  // geometry (Kyle 2026-11-21: "the first round matchups could be tighter still"): the tree is packed from its first
  // bouts up — a bout sits centered on the bouts that fed it, a bout with no feeders (its wrestlers had byes) takes only
  // its own card's height, so byes leave no empty slots; the first round can use a shorter line (firstRowH)
  const firstLook = { ...look, rowH: Math.min(look.firstRowH, look.rowH) }
  const lookAt = (c: number) => (c === 0 ? firstLook : look)
  const hOf = (c: number) => cardH(lookAt(c))
  const cell = (c: number, i: number) => champ[c]?.cells[i] ?? null
  const center = new Map<string, number>()   // "c|i" → center y within its half
  const lay = (c: number, i: number, top: number): { h: number; mid: number } => {
    const kids = c > 0 ? [[c - 1, 2 * i], [c - 1, 2 * i + 1]].filter(([cc, ii]) => cell(cc, ii)) : []
    let h: number, mid: number
    if (!kids.length) { h = hOf(c) + look.gap; mid = top + hOf(c) / 2 }
    else {
      let t = top; const mids: number[] = []
      for (const [cc, ii] of kids) { const r = lay(cc, ii, t); t += r.h; mids.push(r.mid) }
      mid = (mids[0] + mids[mids.length - 1]) / 2
      h = Math.max(t - top, hOf(c) + look.gap)
    }
    center.set(`${c}|${i}`, mid)
    return { h, mid }
  }
  const cols = look.split ? 2 * (D - 1) + 1 : D
  const W = cols * CW + (cols - 1) * KW
  const finalX = (D - 1) * STEP
  const offset = new Map<string, number>()   // side → vertical offset of that half
  let H: number, finalMid: number
  if (look.split && D >= 2) {
    const L = lay(D - 2, 0, 0), R = cell(D - 2, 1) ? lay(D - 2, 1, 0) : { h: 0, mid: 0 }
    H = Math.max(L.h, R.h)
    offset.set('L', (H - L.h) / 2); offset.set('R', (H - R.h) / 2)
    finalMid = R.h ? (L.mid + offset.get('L')! + R.mid + offset.get('R')!) / 2 : L.mid + offset.get('L')!
  } else {
    const T = lay(D - 1, 0, 0)
    H = T.h; finalMid = T.mid
    offset.set('L', 0); offset.set('R', 0)
  }
  const sideOf = (c: number, i: number) => (look.split && c < D - 1 && i >= champ[c].cells.length / 2 ? 'R' : 'L')
  const yOf = (c: number, i: number) => (c === D - 1 ? finalMid : center.get(`${c}|${i}`)! + offset.get(sideOf(c, i))!)
  const xOf = (c: number, i: number) => (c === D - 1 ? finalX : sideOf(c, i) === 'R' ? W - CW - c * STEP : c * STEP)

  type Pos = { b: BracketBout | null; x: number; y: number; toLeft: boolean; label: string; c: number }
  const cards: Pos[] = []
  const lines: { x: number; y: number; w: number; h: number }[] = []
  for (let c = 0; c < D; c++) {
    champ[c].cells.forEach((b, i) => {
      if (!b || (c < D - 1 && !center.has(`${c}|${i}`))) return   // a bye: no bout, no card, no line
      const right = sideOf(c, i) === 'R', x = xOf(c, i), my = yOf(c, i)
      cards.push({ b, x, y: my - hOf(c) / 2, toLeft: right, label: champ[c].label, c })
      if (c === D - 1) return
      // the line to the bout it fed
      const pc = c + 1, pi = Math.floor(i / 2), py = yOf(pc, pi)
      const midX = right ? x - KW / 2 : x + CW + KW / 2
      lines.push({ x: right ? midX : x + CW, y: my, w: KW / 2, h: 1 })
      lines.push({ x: midX, y: Math.min(my, py), w: 1, h: Math.abs(py - my) || 1 })
      lines.push({ x: right ? x - KW : midX, y: py, w: KW / 2, h: 1 })
    })
  }
  const CHf = hOf(D - 1)

  // column labels across the top
  const heads: { x: number; label: string }[] = []
  for (let c = 0; c < D - 1; c++) { heads.push({ x: c * STEP, label: champ[c].label }); if (look.split) heads.push({ x: W - CW - c * STEP, label: champ[c].label }) }
  heads.push({ x: finalX, label: champ[D - 1].label })

  return (
    <div ref={box} className="space-y-6">
      <div className="overflow-x-auto pb-2">
        <div className="relative" style={{ width: W, height: 14 }}>
          {heads.map((h, i) => <div key={i} className="absolute text-[9px] font-bold uppercase tracking-wide text-slate-400 truncate" style={{ left: h.x, width: CW }}>{h.label}</div>)}
        </div>
        <div className="relative" style={{ width: W, height: Math.max(H, finalMid + CHf / 2 + 10) }}>
          {lines.map((l, i) => <div key={i} className="absolute bg-slate-300" style={{ left: l.x, top: l.y, width: l.w, height: l.h }} />)}
          {cards.map((p, i) => <div key={i} className="absolute" style={{ left: p.x, top: p.y }}><Card b={p.b} look={lookAt(p.c)} mark={mixed} toLeft={p.toLeft} label={p.label} /></div>)}
        </div>
      </div>
      {(wrestlebacks.length > 0 || places.length > 0) && (
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Consolation</p>
          <ConsTree bracket={bracket} look={{ ...look, cardW: given.cardW }} mixed={mixed} avail={width} maxW={given.cardW} />
        </div>
      )}
    </div>
  )
}

const pkey = (p: BracketPerson | null) => (p ? p.id ?? `${p.name}|${p.school ?? ''}` : '')
const SHORT: Record<string, string> = { 'Round 1': 'R1', 'Round 2': 'R2', 'Round 3': 'R3', 'Round 4': 'R4', 'Round 5': 'R5', Quarters: 'QF', Semis: 'SF', Final: 'F' }

/** The wrestlebacks as a tree (Kyle 2026-11-21: "are we able to create some direction with the consolation brackets?"):
 *  the 3rd place bout in the middle, each wrestler's earlier consolation bout feeding it, back to where they dropped in
 *  from the championship side (tagged ↓QF, ↓R2 …). The halves face each other like the championship tree; the 5th and
 *  7th place bouts sit under the 3rd. Columns are the consolation rounds, the same round in the same column on both
 *  sides. Without a 3rd place bout the rounds are listed as columns. */
export function ConsTree({ bracket, look: given, mixed, avail = 0, maxW }: { bracket: WeightBracket; look: BracketLook & { seedSpace?: boolean }; mixed: boolean; avail?: number; maxW?: number }) {
  let look = given
  const { champ, cons } = bracket
  const placeOf = (n: string) => cons.find(c => c.label.startsWith(n))?.bouts[0] ?? null
  const third = placeOf('3rd'), fifth = placeOf('5th'), seventh = placeOf('7th')
  const backs = cons.filter(c => !PLACE.test(c.label)).flatMap(c => c.bouts.map(b => ({ b, label: c.label })))
  // where each wrestler dropped in: the championship round they lost
  const dropped = new Map<string, string>()
  for (const col of champ) for (const b of col.cells) if (b && b.winner) { const l = b.winner === 'top' ? b.bottom : b.top; if (l) dropped.set(pkey(l), SHORT[col.label] ?? col.label) }
  const mine = new Map<string, { b: BracketBout; label: string }[]>()
  for (const x of backs) for (const p of [x.b.top, x.b.bottom]) if (p) (mine.get(pkey(p)) ?? mine.set(pkey(p), []).get(pkey(p))!).push(x)
  const before = (p: BracketPerson | null, b: BracketBout) => {
    if (!p) return null
    const xs = (mine.get(pkey(p)) ?? []).filter(x => roundStep(x.b.round) < roundStep(b.round)).sort((a, c) => roundStep(a.b.round) - roundStep(c.b.round))
    return xs.length ? xs[xs.length - 1] : null
  }
  if (!third) return (
    <div className="flex gap-3">
      {cons.map(c => (
        <div key={c.label} className="shrink-0">
          <div className="mb-1 text-[9px] font-bold uppercase tracking-wide text-slate-400 truncate" style={{ width: look.cardW }}>{c.label}</div>
          <div className="flex flex-col" style={{ gap: look.gap }}>{c.bouts.map(b => <Card key={b.id} b={b} look={look} mark={mixed} label={c.label} />)}</div>
        </div>
      ))}
    </div>
  )
  // each wrestler's way into a bout: ↓ the championship round they dropped from, or ↑ the consolation round they won
  // (Kyle 2026-11-21: "lets add arrow up c2 to show how the other person got there")
  const tagFor = (b: BracketBout) => (p: BracketPerson | null) => {
    if (!p) return undefined
    const prev = before(p, b)
    if (prev) return `↑${prev.label.replace('Cons. Round ', 'C').replace('Cons. Quarters', 'CQF').replace('Cons. Semis', 'CSF')}`
    const d = dropped.get(pkey(p))
    return d ? `↓${d}` : undefined
  }

  type Node = { b: BracketBout; label: string; kids: Node[] }
  const build = (x: { b: BracketBout; label: string }, depth = 0): Node => ({ ...x, kids: depth > 12 ? [] : [x.b.top, x.b.bottom].map(p => before(p, x.b)).filter(Boolean).map(k => build(k!, depth + 1)) })
  const sides = [third.top, third.bottom].map(p => before(p, third)).map(x => (x ? build(x) : null))
  // columns: each half's own consolation rounds, earliest first (a short half takes only the room it needs)
  const steps: number[][] = [[], []]
  const walk = (n: Node | null, side: number) => { if (!n) return; if (!steps[side].includes(roundStep(n.b.round))) steps[side].push(roundStep(n.b.round)); n.kids.forEach(k => walk(k, side)) }
  sides.forEach((sd, i) => walk(sd, i)); steps.forEach(x => x.sort((a, c) => a - c))
  const nCols = steps[0].length + steps[1].length + 1
  // fit: the page width shared out over this tree's own columns (never wider than the set card width, nor under 56px)
  if (given.fit && avail) look = { ...given, cardW: Math.max(56, Math.min(maxW ?? given.cardW, Math.floor((avail - (nCols - 1) * KW) / nCols))) }
  const CW = look.cardW, STEP = CW + KW, CH = cardH(look)
  const W = nCols * CW + (nCols - 1) * KW, centerX = steps[0].length * STEP
  const colX = (side: number, step: number) => { const c = steps[side].indexOf(step); return side === 0 ? c * STEP : W - CW - c * STEP }
  type Pos = { b: BracketBout; label: string; x: number; mid: number; side: number }
  const placed: Pos[] = [], lines: { x: number; y: number; w: number; h: number }[] = []
  const lay = (node: Node, top: number, side: number): { h: number; mid: number } => {
    let h: number, mid: number
    if (!node.kids.length) { h = CH + look.gap; mid = top + CH / 2 }
    else {
      let t = top; const mids: number[] = []
      for (const k of node.kids) { const r = lay(k, t, side); t += r.h; mids.push(r.mid) }
      mid = (mids[0] + mids[mids.length - 1]) / 2
      h = Math.max(t - top, CH + look.gap)
    }
    placed.push({ b: node.b, label: node.label, x: colX(side, roundStep(node.b.round)), mid, side })
    return { h, mid }
  }
  const halves = sides.map((sd, i) => (sd ? lay(sd, 0, i) : { h: 0, mid: 0 }))
  const H = Math.max(halves[0].h, halves[1].h, CH + look.gap)
  const off = halves.map(hv => (H - hv.h) / 2)
  for (const p of placed) p.mid += off[p.side]
  const rootMid = halves[0].h && halves[1].h ? (halves[0].mid + off[0] + halves[1].mid + off[1]) / 2 : H / 2
  // lines: each bout to the one its winner went on to (the 3rd place bout for the two sides' last ones)
  const posOf = new Map(placed.map(p => [p.b.id, p]))
  const link = (child: Pos, px: number, py: number) => {
    const right = child.side === 1
    const elbow = right ? px + CW + KW / 2 : px - KW / 2
    const from = right ? child.x : child.x + CW
    lines.push({ x: Math.min(from, elbow), y: child.mid, w: Math.abs(elbow - from) || 1, h: 1 })
    lines.push({ x: elbow, y: Math.min(child.mid, py), w: 1, h: Math.abs(py - child.mid) || 1 })
    lines.push({ x: right ? px + CW : elbow, y: py, w: KW / 2, h: 1 })
  }
  const linkAll = (node: Node | null, parent: { x: number; mid: number } | null) => {
    if (!node) return
    const me = posOf.get(node.b.id)!
    if (parent) link(me, parent.x, parent.mid)
    node.kids.forEach(k => linkAll(k, me))
  }
  sides.forEach(sd => linkAll(sd, { x: centerX, mid: rootMid }))
  const under = [fifth && { b: fifth, label: '5th Place' }, seventh && { b: seventh, label: '7th Place' }].filter(Boolean) as { b: BracketBout; label: string }[]
  const tall = Math.max(H, rootMid + CH / 2 + 8 + under.length * (CH + 18) + 10)
  return (
    <div className="overflow-x-auto pb-2">
      <div className="relative" style={{ width: W, height: 14 }}>
        {[0, 1].flatMap(sd => steps[sd].map(st => { const lab = placed.find(p => roundStep(p.b.round) === st)?.label ?? ''; return <div key={`${st}-${sd}`} className="absolute text-[9px] font-bold uppercase tracking-wide text-slate-400 truncate" style={{ left: colX(sd, st), width: CW }}>{lab.replace('Cons. Round ', 'C')}</div> }))}
        <div className="absolute text-[9px] font-bold uppercase tracking-wide text-slate-400" style={{ left: centerX, width: CW }}>3rd Place</div>
      </div>
      <div className="relative" style={{ width: W, height: tall }}>
        {lines.map((l, i) => <div key={i} className="absolute bg-slate-300" style={{ left: l.x, top: l.y, width: l.w, height: l.h }} />)}
        {placed.map(p => <div key={p.b.id} className="absolute" style={{ left: p.x, top: p.mid - CH / 2 }}><Card b={p.b} look={look} mark={mixed} toLeft={p.side === 1} label={p.label} tagOf={tagFor(p.b)} /></div>)}
        <div className="absolute" style={{ left: centerX, top: rootMid - CH / 2 }}><Card b={third} look={look} mark={mixed} label="3rd Place" tagOf={tagFor(third)} /></div>
        {under.map((u, i) => (
          <div key={u.label} className="absolute" style={{ left: centerX, top: rootMid + CH / 2 + 8 + i * (CH + 18) }}>
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{u.label}</div>
            <Card b={u.b} look={look} mark={mixed} label={u.label} />
          </div>
        ))}
      </div>
    </div>
  )
}
