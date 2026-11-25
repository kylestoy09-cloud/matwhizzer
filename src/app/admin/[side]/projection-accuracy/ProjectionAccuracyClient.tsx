'use client'
// Projection Accuracy: how the projections did (frozen, as projected at the time), and a lever lab that replays any
// change over the season's tracked bouts before it's saved as the next version. Grading: src/lib/projectionEval.ts.
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { OUTCOME_LABELS } from '@/lib/hammerScore'
import { RATING_SHORT } from '@/lib/rating'
import { V1_PARAMS, type Finishes, type ProjectionParams } from '@/lib/projection'
import { KIND_ROWS, type Line, type Report, type SpreadPoint } from '@/lib/projectionEval'
import { BAND_NAMES, mmss, speedLabel, type BandCutoffs } from '@/lib/speedBands'
import { oddsFor, topOutcomes, KIND_WORD, DEFAULT_ODDS, type OddsTable } from '@/lib/projectionOdds'

type Settings = { id: number; version: number; name: string | null; note: string | null; params: ProjectionParams; is_active: boolean; created_at: string; created_by: string | null }
type Miss = { date: string; a: { id: string; name: string; wrr: number }; b: { id: string; name: string; wrr: number }; projected: string; happened: string; winnerFinishes: Finishes | null }
type OddsData = { bouts: number; pickRight: number; inTop3: number; pinPickRight: number; pinInTop3: number; calibration: { from: number; bouts: number; said: number; happened: number }[]; table: OddsTable }
type Data = { odds?: OddsData; settings: Settings[]; seasons: string[]; season: string | null; bouts?: number; cutoffs?: BandCutoffs; spread?: { clock: SpreadPoint[]; speed: SpreadPoint[]; kind?: SpreadPoint[] }; recorded?: Report; active?: Report; misses?: { upset: Miss[]; finish: Miss[] }; error?: string }
type Test = { active: Report; test: Report; baseline?: Report; changes: { changed: number; better: number; worse: number }; scale: 'clock' | 'speed'; cutoffs: BandCutoffs | null; misses: { finish: Miss[] }; error?: string }

const pct = (a: number, b: number) => (b ? `${(100 * a / b).toFixed(1)}%` : '—')
// picked the winner over every bout, a toss-up counting as half (a coin flip — the site gives every toss-up to the
// home side or the lower seed), so widening the toss-up band can't lift the number by skipping hard bouts
const winRate = (l: Line) => (l.n ? (l.winRight + 0.5 * (l.n - l.called)) / l.n : 0)
const th = 'px-3 py-1 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide'
const td = 'px-3 py-1 text-sm text-slate-800 tabular-nums'
const KIND_LABEL: Record<string, string> = { pin: 'Pin', tech: 'Tech', major: 'Major', dec: 'Decision', ot: 'OT', 'toss-up': 'Toss-up', lost: 'Upset (lost)' }

function Headline({ l, title }: { l: Line; title: string }) {
  const box = (label: string, value: string, hint: string) => (
    <div className="border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-xl font-bold text-slate-900 tabular-nums">{value}</div>
      <div className="text-[11px] text-slate-500">{hint}</div>
    </div>
  )
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {box('Bouts', l.n.toLocaleString(), `${(l.n - l.called).toLocaleString()} toss-ups`)}
        {box('Picked the winner', `${(100 * winRate(l)).toFixed(1)}%`, 'every bout; a toss-up counts as half')}
        {box('Right finish type', pct(l.kindRight, l.winRight), 'pin / tech / major / dec / OT, when the winner was right')}
        {box('Exact result', pct(l.exact, l.winRight), 'finish and period/margin')}
        {box('Avg tiers off', l.tiersN ? (l.tiersOff / l.tiersN).toFixed(2) : '—', 'on the 32-step result scale')}
      </div>
    </div>
  )
}

function LineTable({ rows, first }: { rows: (Line & { label: string })[]; first: string }) {
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50"><tr><th className={th}>{first}</th><th className={th}>Bouts</th><th className={th}>Winner</th><th className={th}>Finish type</th><th className={th}>Exact</th><th className={th}>Tiers off</th></tr></thead>
      <tbody>{rows.map(r => (
        <tr key={r.label} className="border-t border-slate-100">
          <td className={td}>{r.label}</td><td className={td}>{r.n.toLocaleString()}</td><td className={td}>{r.n ? `${(100 * winRate(r)).toFixed(1)}%` : '—'}</td>
          <td className={td}>{pct(r.kindRight, r.winRight)}</td><td className={td}>{pct(r.exact, r.winRight)}</td>
          <td className={td}>{r.tiersN ? (r.tiersOff / r.tiersN).toFixed(2) : '—'}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function Matrix({ m }: { m: Report['matrix'] }) {
  const cols = ['pin', 'tech', 'major', 'dec', 'ot', 'lost']
  const rows = ['pin', 'tech', 'major', 'dec', 'ot', 'toss-up'].filter(k => m[k])
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50"><tr><th className={th}>Projected ↓ / Happened →</th>{cols.map(c => <th key={c} className={th}>{KIND_LABEL[c]}</th>)}<th className={th}>Right</th></tr></thead>
      <tbody>{rows.map(k => {
        const tot = cols.reduce((s, c) => s + (m[k][c] ?? 0), 0)
        return (
          <tr key={k} className="border-t border-slate-100">
            <td className={`${td} font-semibold`}>{KIND_LABEL[k]}</td>
            {cols.map(c => <td key={c} className={`${td} ${c === k ? 'bg-emerald-50 font-semibold' : ''}`}>{(m[k][c] ?? 0).toLocaleString()}</td>)}
            <td className={td}>{k === 'toss-up' ? '—' : pct(m[k][k] ?? 0, tot)}</td>
          </tr>
        )
      })}</tbody>
    </table>
  )
}

function Bands({ b }: { b: Report['bands'] }) {
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50"><tr><th className={th}>Higher WRR</th><th className={th}>Lower WRR</th><th className={th}>Bouts</th><th className={th}>Higher WRR won</th></tr></thead>
      <tbody>{b.map(x => (
        <tr key={`${x.fav}|${x.dog}`} className="border-t border-slate-100">
          <td className={td}>{x.fav}</td><td className={td}>{x.dog}</td><td className={td}>{x.n.toLocaleString()}</td><td className={td}>{pct(x.favWon, x.n)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function Misses({ list }: { list: Miss[] }) {
  const fin = (f: Finishes | null) => f ? `${f.wins}W: ${f.pins} pins, ${f.techs} techs, ${f.majors} majors` : '—'
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50"><tr><th className={th}>Date</th><th className={th}>Higher WRR</th><th className={th}>Lower WRR</th><th className={th}>Projected</th><th className={th}>Happened</th><th className={th}>Projected winner going in</th></tr></thead>
      <tbody>{list.map((m, i) => (
        <tr key={i} className="border-t border-slate-100">
          <td className={td}>{m.date}</td>
          <td className={td}><Link href={`/wrestler/${m.a.id}`} target="_blank" className="hover:underline">{m.a.name}</Link> <span className="text-slate-400">{m.a.wrr.toFixed(1)}</span></td>
          <td className={td}><Link href={`/wrestler/${m.b.id}`} target="_blank" className="hover:underline">{m.b.name}</Link> <span className="text-slate-400">{m.b.wrr.toFixed(1)}</span></td>
          <td className={td}>{m.projected}</td><td className={td}>{m.happened}</td><td className={`${td} text-xs text-slate-500`}>{fin(m.winnerFinishes)}</td>
        </tr>
      ))}</tbody>
    </table>
  )
}

function Cutoffs({ c, title }: { c: BandCutoffs; title: string }) {
  const range = (cuts: number[], i: number) => i === 0 ? `under ${mmss(cuts[0])}` : i === 5 ? `${mmss(cuts[4])}+` : `${mmss(cuts[i - 1])}–${mmss(cuts[i])}`
  return (
    <div>
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">{title}</h3>
      <table className="w-full border border-slate-200 bg-white">
        <thead className="bg-slate-50"><tr><th className={th}>Tier</th><th className={th}>Band</th><th className={th}>Pin ({c.n.pin.toLocaleString()} timed)</th><th className={th}>Tech ({c.n.tech.toLocaleString()} timed)</th></tr></thead>
        <tbody>{BAND_NAMES.map((b, i) => (
          <tr key={b} className="border-t border-slate-100"><td className={td}>{2 * i + 1} / {2 * i + 2}</td><td className={td}>{b}</td><td className={td}>{range(c.pin, i)}</td><td className={td}>{range(c.tech, i)}</td></tr>
        ))}</tbody>
      </table>
      <p className="text-xs text-slate-500 mt-1">From this season’s tracked bouts; estimated times left out.</p>
    </div>
  )
}

// The spread chart (Kyle 2026-11-20): every bout from both wrestlers' sides at the WRR spread going in (rounded, capped
// at ±32). Orange = what happened most often at that spread (bigger = a bigger share); blue = what the ladder assumes;
// the strip underneath = how often the result was exactly the assumption.
function SpreadChart({ points, label, rows = 32 }: { points: SpreadPoint[]; label: (rank: number) => string; rows?: number }) {
  const L = 190, T = 10, colW = 12, rowH = rows === 32 ? 14 : 30, W = L + 65 * colW + 10, H = T + rows * rowH, stripH = 60
  const x = (sp: number) => L + (sp + 32) * colW + colW / 2
  const y = (rank: number) => T + (rank - 1) * rowH + rowH / 2
  const assumed = points.filter(p => p.assumed != null)
  const maxHit = Math.max(10, ...points.map(p => p.hitPct ?? 0))
  return (
    <svg viewBox={`0 0 ${W} ${H + stripH + 40}`} className="w-full border border-slate-200 bg-white" role="img" aria-label="Most common result by WRR spread">
      {Array.from({ length: rows }, (_, i) => i + 1).map(r => (
        <g key={r}>
          <line x1={L} x2={W - 10} y1={y(r)} y2={y(r)} stroke={r % 2 ? '#f1f5f9' : '#f8fafc'} strokeWidth={rowH} />
          <text x={L - 6} y={y(r) + 3} textAnchor="end" fontSize="9" fill={r <= rows / 2 ? '#334155' : '#94a3b8'}>{label(r)}</text>
        </g>
      ))}
      <line x1={L} x2={W - 10} y1={T + (rows / 2) * rowH} y2={T + (rows / 2) * rowH} stroke="#64748b" strokeDasharray="4 3" />
      <text x={W - 12} y={T + (rows / 2) * rowH - 4} textAnchor="end" fontSize="9" fill="#64748b">wins ↑ · losses ↓</text>
      <line x1={x(0)} x2={x(0)} y1={T} y2={H} stroke="#cbd5e1" />
      <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={assumed.filter(p => p.s < 0).map(p => `${x(p.s)},${y(p.assumed!)}`).join(' ')} />
      <polyline fill="none" stroke="#2563eb" strokeWidth="2" points={assumed.filter(p => p.s > 0).map(p => `${x(p.s)},${y(p.assumed!)}`).join(' ')} />
      {points.filter(p => p.n > 0).map(p => (
        <circle key={p.s} cx={x(p.s)} cy={y(p.top)} r={2.5 + p.topPct / 6} fill="#f97316" fillOpacity="0.8">
          <title>{`Spread ${p.s > 0 ? '+' : ''}${p.s}: ${p.n.toLocaleString()} bouts\nMost common: ${label(p.top)} (${p.topPct.toFixed(1)}%)\nWe assume: ${p.assumed ? label(p.assumed) : 'Toss-up'}${p.hitPct != null ? ` — exactly right ${p.hitPct.toFixed(1)}%` : ''}`}</title>
        </circle>
      ))}
      {/* exact-hit strip */}
      <text x={L - 6} y={H + 14} textAnchor="end" fontSize="9" fill="#334155">Exactly right</text>
      <text x={L - 6} y={H + 26} textAnchor="end" fontSize="9" fill="#94a3b8">(up to {maxHit.toFixed(0)}%)</text>
      {points.map(p => p.hitPct != null && p.n > 0 && (
        <rect key={p.s} x={x(p.s) - colW / 2 + 1} width={colW - 2} y={H + 8 + stripH - (p.hitPct / maxHit) * stripH} height={(p.hitPct / maxHit) * stripH} fill="#10b981">
          <title>{`Spread ${p.s > 0 ? '+' : ''}${p.s}: exactly right ${p.hitPct.toFixed(1)}% of ${p.n.toLocaleString()}`}</title>
        </rect>
      ))}
      {[-32, -24, -16, -8, 0, 8, 16, 24, 32].map(sp => (
        <text key={sp} x={x(sp)} y={H + stripH + 26} textAnchor="middle" fontSize="10" fill="#475569">{sp > 0 ? `+${sp}` : sp}{Math.abs(sp) === 32 ? '+' : ''}</text>
      ))}
      <text x={x(0)} y={H + stripH + 38} textAnchor="middle" fontSize="10" fill="#475569">WRR spread going in (this wrestler minus opponent)</text>
    </svg>
  )
}

function SpreadSection({ spread, cutoffs }: { spread: { clock: SpreadPoint[]; speed: SpreadPoint[]; kind?: SpreadPoint[] }; cutoffs: BandCutoffs }) {
  const [scale, setScale] = useState<'kind' | 'clock' | 'speed'>('clock')
  const points = scale === 'kind' ? spread.kind ?? [] : spread[scale]
  const label = (r: number) => scale === 'kind' ? KIND_ROWS[r - 1] ?? '?' : scale === 'clock' || (r > 12 && r < 21)
    ? OUTCOME_LABELS[r] ?? '?'
    : r <= 12 ? speedLabel(r, cutoffs) : `${speedLabel(33 - r, cutoffs)} loss`
  let n = 0, hit = 0
  for (const p of points) if (p.hitPct != null) { n += p.n; hit += p.n * p.hitPct / 100 }
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Most common result by WRR spread — vs what we assume</h3>
        <div className="flex gap-1 text-xs">
          {(['kind', 'clock', 'speed'] as const).filter(k => k !== 'kind' || spread.kind).map(k => (
            <button key={k} onClick={() => setScale(k)} className={`px-2 py-0.5 border ${scale === k ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-600'}`}>{k === 'kind' ? 'Win type only' : k === 'clock' ? 'Clock' : 'Speed bands'}</button>
          ))}
        </div>
      </div>
      <SpreadChart points={points} label={label} rows={scale === 'kind' ? 10 : 32} />
      <p className="text-xs text-slate-500 mt-1">
        Every bout counted from both wrestlers’ sides (a +12 win is also a −12 loss); spreads rounded and capped at ±32. Orange = what happened most
        often at that spread (bigger dot = bigger share); blue = what the active ladder assumes from the WRR alone; green = how often the result was
        exactly that. Exactly right overall: <strong>{n ? (100 * hit / n).toFixed(1) : '—'}%</strong>. Hover a dot or bar for the numbers.
        {scale === 'kind' && ' Win type only: pin, tech, major, decision or OT — no time or margin buckets (the headline’s “Right finish type”).'}
        {scale === 'speed' && ' Speed bands hold different shares of pins and techs (5%, 5%, 15%, 25%, 25%, 25%), so the wide bands come up most often.'}
      </p>
      <details className="mt-2">
        <summary className="text-xs text-blue-700 cursor-pointer">All 65 spreads as a table</summary>
        <table className="w-full border border-slate-200 bg-white mt-2">
          <thead className="bg-slate-50"><tr><th className={th}>Spread</th><th className={th}>Bouts</th><th className={th}>Most common</th><th className={th}>We assume</th><th className={th}>Exactly right</th></tr></thead>
          <tbody>{[...points].reverse().map(p => (
            <tr key={p.s} className="border-t border-slate-100">
              <td className={td}>{p.s > 0 ? `+${p.s}` : p.s}{Math.abs(p.s) === 32 ? ' or more' : ''}</td><td className={td}>{p.n.toLocaleString()}</td>
              <td className={td}>{p.n ? `${label(p.top)} (${p.topPct.toFixed(1)}%)` : '—'}</td>
              <td className={td}>{p.assumed ? label(p.assumed) : 'Toss-up'}</td>
              <td className={td}>{p.hitPct != null && p.n ? `${p.hitPct.toFixed(1)}%` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </details>
    </section>
  )
}

// Outcome odds (Kyle 2026-11-20): the likeliest of ten outcomes is the pick, shown with the top three and their odds.
function OddsSection({ o }: { o: OddsData }) {
  const [hi, setHi] = useState(77), [lo, setLo] = useState(76)
  const fav = Math.max(hi, lo), dog = Math.min(hi, lo)
  const top = topOutcomes(oddsFor(o.table, fav, dog, null, null, { ...DEFAULT_ODDS, useRecords: false }), 3)
  const box = (label: string, v: string, hint: string) => (
    <div className="border border-slate-200 bg-white px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-xl font-bold text-slate-900 tabular-nums">{v}</div>
      <div className="text-[11px] text-slate-500">{hint}</div>
    </div>
  )
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Outcome odds — top three outcomes with their chances</h3>
      <p className="text-xs text-slate-500">Ten outcomes: the {RATING_SHORT} favorite or the underdog winning by pin, tech, major, decision or OT. Odds come from past bouts at the same rating level and spread, shifted by each side’s record — graded here on held-out halves of the season (built from one half, tested on the other).</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {box('Pick right', `${o.pickRight.toFixed(1)}%`, `always “favorite by pin”: ${o.pinPickRight.toFixed(1)}%`)}
        {box('In the top three', `${o.inTop3.toFixed(1)}%`, `always the same three: ${o.pinInTop3.toFixed(1)}%`)}
        {box('Bouts graded', o.bouts.toLocaleString(), 'each half tested on the other’s odds')}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Are the odds honest?</h4>
          <table className="w-full border border-slate-200 bg-white">
            <thead className="bg-slate-50"><tr><th className={th}>Pick’s chance</th><th className={th}>Bouts</th><th className={th}>Said</th><th className={th}>Happened</th></tr></thead>
            <tbody>{o.calibration.filter(c => c.bouts >= 20).map(c => (
              <tr key={c.from} className="border-t border-slate-100"><td className={td}>{c.from}–{c.from + 10}%</td><td className={td}>{c.bouts.toLocaleString()}</td><td className={td}>{c.said.toFixed(0)}%</td><td className={td}>{c.happened.toFixed(0)}%</td></tr>
            ))}</tbody>
          </table>
          <p className="text-xs text-slate-500 mt-1">When the pick said about 55%, it should happen about 55% of the time.</p>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Try a matchup</h4>
          <div className="border border-slate-200 bg-white px-3 py-2 space-y-2 text-sm">
            <div className="flex items-center gap-2">{RATING_SHORT} <input type="number" value={hi} onChange={e => setHi(Number(e.target.value))} className={num} /> vs <input type="number" value={lo} onChange={e => setLo(Number(e.target.value))} className={num} /></div>
            <ol className="space-y-0.5">{top.map((t, i) => (
              <li key={i} className={i === 0 ? 'font-semibold text-slate-900' : 'text-slate-700'}>{i + 1}. The {t.favorite ? fav : dog} wins by {KIND_WORD[t.kind]} — {t.pct.toFixed(0)}%</li>
            ))}</ol>
            <p className="text-xs text-slate-500">From the rating level and spread alone (no records). The first line is the pick.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

const num = 'w-16 border border-slate-300 px-1.5 py-0.5 text-sm tabular-nums'

function LeverForm({ p, set }: { p: ProjectionParams; set: (p: ProjectionParams) => void }) {
  const toggle = (on: boolean, flip: () => void, label: string, hint: string, extra: React.ReactNode) => (
    <div className="border border-slate-200 bg-white px-3 py-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" checked={on} onChange={flip} />{label}</label>
      <p className="text-xs text-slate-500 mt-0.5">{hint}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">{extra}</div>
    </div>
  )
  const n = (v: number, f: (x: number) => void, step = 1) => <input type="number" step={step} value={v} onChange={e => f(Number(e.target.value))} className={num} />
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Result scale</h4>
      <div className="border border-slate-200 bg-white px-3 py-2 space-y-1 text-sm text-slate-800">
        <label className="flex items-center gap-2"><input type="radio" checked={p.scale === 'clock'} onChange={() => set({ ...p, scale: 'clock' })} />Clock — pins and techs ranked by the period they ended in</label>
        <label className="flex items-center gap-2"><input type="radio" checked={p.scale === 'speed'} onChange={() => set({ ...p, scale: 'speed' })} />Speed bands — ranked by how fast among their own kind (“Pin under 0:25”)</label>
        <label className="flex items-center gap-2 pt-1"><input type="checkbox" checked={!p.showTimes} onChange={() => set({ ...p, showTimes: !p.showTimes })} />Show the win type only on the site (“Pin”, “Decision”) — times still weight the {RATING_SHORT} and the grading</label>
        <p className="text-xs text-slate-500">On speed bands each result tier is a pair: a fastest-5% pin and a fastest-5% tech are equal. Turn on “Pin ↔ tech by style” or “Finish from the records” so a wrestler’s history picks which one.</p>
      </div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">Finish levers — how they win</h4>
      {toggle(p.odds.on, () => set({ ...p, odds: { ...p.odds, on: !p.odds.on } }), 'Outcome odds',
        'The finish is the likeliest one for the projected winner, from past bouts at the same rating level and spread, shifted by each side’s record; the top three come back with their odds. Overrides the levers below. Tested on held-out halves of the season; saving builds the odds from the season shown.',
        <>Thin groups lean on neighbors as if {n(p.odds.minCell, v => set({ ...p, odds: { ...p.odds, minCell: v } }))} bouts · records count fully at {n(p.odds.recordK, v => set({ ...p, odds: { ...p.odds, recordK: v } }))} wins</>)}
      {toggle(p.fromRecord.on, () => set({ ...p, fromRecord: { ...p.fromRecord, on: !p.fromRecord.on } }), 'Finish from the records',
        'The projected winner’s most common way of winning, weighed by how the loser usually loses. Pins and techs keep the gap’s period, else 3rd period.',
        <>Once he has {n(p.fromRecord.minWins, v => set({ ...p, fromRecord: { ...p.fromRecord, minWins: v } }))} wins</>)}
      {toggle(p.buckets.on, () => set({ ...p, buckets: { ...p.buckets, on: !p.buckets.on } }), 'Finish or decision (needs Outcome odds)',
        'Two buckets: the odds pick a finish (pin / tech) or a decision. A finish is the winner’s own most common one; a decision follows how sure the pick is — OT when close, major when lopsided.',
        <>Decision once its odds reach {n(p.buckets.decisionFrom ?? 0.5, v => set({ ...p, buckets: { ...p.buckets, decisionFrom: v } }), 0.05)} · OT under {n(p.buckets.otBelow, v => set({ ...p, buckets: { ...p.buckets, otBelow: v } }), 0.01)} chance · Major from {n(p.buckets.majorFrom, v => set({ ...p, buckets: { ...p.buckets, majorFrom: v } }), 0.01)}</>)}
      {toggle(p.weight.on, () => set({ ...p, weight: { ...p.weight, on: !p.weight.on } }), 'Weight groups (needs Outcome odds)',
        'Each weight group’s finish mix shifts the odds of each kind of win (285’s decisions and OT, the light weights’ techs) without changing who’s favored; and a winner’s pin / tech record is blended with their group’s.',
        <>Group counts as {n(p.weight.recordK, v => set({ ...p, weight: { ...p.weight, recordK: v } }))} finishes of a wrestler’s record</>)}
      {toggle(p.byLevel.on, () => set({ ...p, byLevel: { ...p.byLevel, on: !p.byLevel.on } }), 'Finish by rating level',
        'Close bouts: a pin between lower-rated wrestlers, a decision between higher-rated ones. Runs before “Finish from the records”, which overrides it for a winner with enough record.',
        <>Within {n(p.byLevel.maxGap, v => set({ ...p, byLevel: { ...p.byLevel, maxGap: v } }))} points; higher WRR under {n(p.byLevel.splitAt, v => set({ ...p, byLevel: { ...p.byLevel, splitAt: v } }))} → {OUTCOME_LABELS[p.byLevel.pinRank]}, else {OUTCOME_LABELS[p.byLevel.decRank]}</>)}
      {toggle(p.finishStyle.on, () => set({ ...p, finishStyle: { ...p.finishStyle, on: !p.finishStyle.on } }), 'Pin ↔ tech by style',
        'A projected pin becomes a tech in the same period for a wrestler who techs more than he pins, and back.',
        <>Once he has {n(p.finishStyle.minWins, v => set({ ...p, finishStyle: { ...p.finishStyle, minWins: v } }))} wins</>)}
      {toggle(p.hardToPin.on, () => set({ ...p, hardToPin: { ...p.hardToPin, on: !p.hardToPin.on } }), 'Hard to pin',
        'The loser is rarely pinned: a projected pin becomes a tech in the same period.',
        <>Pinned in under {n(p.hardToPin.floorPct, v => set({ ...p, hardToPin: { ...p.hardToPin, floorPct: v } }))}% of {n(p.hardToPin.minLosses, v => set({ ...p, hardToPin: { ...p.hardToPin, minLosses: v } }))}+ losses</>)}
      {toggle(p.bonusCap.on, () => set({ ...p, bonusCap: { ...p.bonusCap, on: !p.bonusCap.on } }), 'Bonus cap',
        'A wrestler who rarely pins or techs is projected no better than a major.',
        <>Pins + techs under {n(p.bonusCap.floorPct, v => set({ ...p, bonusCap: { ...p.bonusCap, floorPct: v } }))}% of {n(p.bonusCap.minWins, v => set({ ...p, bonusCap: { ...p.bonusCap, minWins: v } }))}+ wins</>)}

      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest pt-2">Winner levers — who wins</h4>
      {toggle(p.strength.on, () => set({ ...p, strength: { ...p.strength, on: !p.strength.on } }), 'Strength rating',
        `A “who beats whom” rating beside the ${RATING_SHORT}: every bout moves both wrestlers by how surprising the result was. Blended into the projection; the ${RATING_SHORT} and rankings don’t change.`,
        <>Share of the blend {n(p.strength.weight, v => set({ ...p, strength: { ...p.strength, weight: v } }), 0.05)} (0.5 = half)</>)}
      <div className="border border-slate-200 bg-white px-3 py-2 space-y-1 text-xs text-slate-600">
        <p className="text-sm font-semibold text-slate-800">Blend weights (WRR · shared opponents · past meetings)</p>
        <div className="flex flex-wrap items-center gap-2">All three: {p.weights.all.map((w, i) => <span key={i}>{n(w, v => { const x = [...p.weights.all] as [number, number, number]; x[i] = v; set({ ...p, weights: { ...p.weights, all: x } }) }, 0.05)}</span>)}</div>
        <div className="flex flex-wrap items-center gap-2">WRR + past meetings: {p.weights.meetings.map((w, i) => <span key={i}>{n(w, v => { const x = [...p.weights.meetings] as [number, number]; x[i] = v; set({ ...p, weights: { ...p.weights, meetings: x } }) }, 0.05)}</span>)}</div>
        <div className="flex flex-wrap items-center gap-2">WRR + shared opponents: {p.weights.common.map((w, i) => <span key={i}>{n(w, v => { const x = [...p.weights.common] as [number, number]; x[i] = v; set({ ...p, weights: { ...p.weights, common: x } }) }, 0.05)}</span>)}</div>
        <div className="flex flex-wrap items-center gap-2 pt-1">Toss-up when the blended score is within {n(p.tossUp, v => set({ ...p, tossUp: v }), 0.5)} of even</div>
      </div>
      <details className="border border-slate-200 bg-white px-3 py-2">
        <summary className="text-sm font-semibold text-slate-800 cursor-pointer">Result ladder — the WRR gap needed for each result</summary>
        <p className="text-xs text-slate-500 mt-1">Projection only — the {RATING_SHORT} formula keeps its own ladder, so ratings never change from here.</p>
        <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-1 text-xs text-slate-600">
          {p.ladder.map((v, i) => <label key={i} className="flex items-center justify-between gap-2"><span>{OUTCOME_LABELS[i + 1]}</span>{n(v, x => { const l = [...p.ladder]; l[i] = x; set({ ...p, ladder: l }) }, 0.5)}</label>)}
        </div>
      </details>
    </div>
  )
}

function Compare({ a, b, base }: { a: Line; b: Line; base?: Line }) {
  const r = (n: number, d: number) => (d ? 100 * n / d : 0)
  const row = (label: string, x: number, y: number, fmt: (v: number) => string, higherBetter = true, bv?: number) => {
    const d = y - x, good = higherBetter ? d > 0 : d < 0
    return (
      <tr className="border-t border-slate-100">
        <td className={td}>{label}</td><td className={td}>{fmt(x)}</td><td className={td}>{fmt(y)}</td>
        <td className={`${td} font-semibold ${Math.abs(d) < 1e-9 ? 'text-slate-400' : good ? 'text-emerald-700' : 'text-red-600'}`}>{Math.abs(d) < 1e-9 ? '—' : `${d > 0 ? '+' : ''}${fmt(d)}`}</td>
        {base && <td className={`${td} text-slate-500`}>{bv == null ? '—' : fmt(bv)}</td>}
      </tr>
    )
  }
  const p1 = (v: number) => `${v.toFixed(1)}`
  return (
    <table className="w-full border border-slate-200 bg-white">
      <thead className="bg-slate-50"><tr><th className={th}></th><th className={th}>Active</th><th className={th}>Test</th><th className={th}>Change</th>{base && <th className={th} title="Every bout projected as a 1st Period Pin for the WRR favorite — the bar any finish lever has to beat">Always pin</th>}</tr></thead>
      <tbody>
        {row('Picked the winner %', 100 * winRate(a), 100 * winRate(b), p1)}
        {row('Right finish type %', r(a.kindRight, a.winRight), r(b.kindRight, b.winRight), p1, true, base ? r(base.kindRight, base.winRight) : undefined)}
        {row('Exact result %', r(a.exact, a.winRight), r(b.exact, b.winRight), p1, true, base ? r(base.exact, base.winRight) : undefined)}
        {row('Avg tiers off', a.tiersN ? a.tiersOff / a.tiersN : 0, b.tiersN ? b.tiersOff / b.tiersN : 0, v => v.toFixed(2), false)}
        {row('Toss-ups', a.n - a.called, b.n - b.called, v => String(Math.round(v)), false)}
      </tbody>
    </table>
  )
}

export function ProjectionAccuracyClient({ gender }: { gender: 'M' | 'F' }) {
  const [data, setData] = useState<Data | null>(null)
  const [season, setSeason] = useState<string | null>(null)
  const [draft, setDraft] = useState<ProjectionParams | null>(null)
  const [test, setTest] = useState<Test | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async (s: string | null) => {
    setBusy('Loading…')
    try {
      const d: Data = await (await fetch(`/api/admin/projection-accuracy?gender=${gender}${s ? `&season=${encodeURIComponent(s)}` : ''}`)).json()
      setData(d)
      if (!s && d.season) setSeason(d.season)
      setDraft(prev => prev ?? d.settings?.find(x => x.is_active)?.params ?? V1_PARAMS)
    } finally { setBusy(null) }
  }, [gender])
  useEffect(() => { load(null) }, [load])

  async function runTest() {
    if (!draft || !season) return
    setBusy('Testing…'); setMsg(null)
    try { setTest(await (await fetch('/api/admin/projection-accuracy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, season, params: draft }) })).json()) }
    finally { setBusy(null) }
  }
  async function save() {
    if (!draft) return
    if (!confirm('Save these settings as the next version? The site’s projections (head-to-head, match cards) switch to it now, and newly tracked bouts are projected with it. Bouts already tracked keep their projection.')) return
    setBusy('Saving…')
    try {
      const d = await (await fetch('/api/admin/projection-accuracy', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gender, season, params: draft, note }) })).json()
      if (d.error) setMsg(d.error); else { setMsg(`Saved as Version ${d.version} — live now.`); setNote(''); setTest(null); await load(season) }
    } finally { setBusy(null) }
  }

  if (!data) return <p className="text-sm text-slate-400">{busy ?? 'Loading…'}</p>
  if (data.error) return <p className="text-sm text-red-600">{data.error}</p>
  const active = data.settings.find(s => s.is_active)
  if (!data.season || !data.recorded || !data.active) {
    return <p className="text-sm text-slate-500">No tracked bouts yet. Bouts are recorded at each rating update; last season loads from the backfill script.</p>
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-slate-500">Season</span>
        <select value={season ?? ''} onChange={e => { setSeason(e.target.value); setTest(null); load(e.target.value) }} className="border border-slate-300 px-2 py-0.5 text-sm">
          {data.seasons.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-slate-500">Active: <strong className="text-slate-800">Version {active?.version}</strong>{active?.note ? ` — ${active.note}` : ''}</span>
        {busy && <span className="text-xs text-slate-400">{busy}</span>}
      </div>

      <Headline l={data.recorded.total} title={`${data.season} — as projected at the time`} />

      {data.spread && data.cutoffs && <SpreadSection spread={data.spread} cutoffs={data.cutoffs} />}

      {data.odds && <OddsSection o={data.odds} />}

      <section className="grid md:grid-cols-2 gap-6">
        <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">By month</h3><LineTable rows={data.recorded.byMonth} first="Month" /></div>
        <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">By WRR gap going in</h3><LineTable rows={data.recorded.byGap} first="Gap" /></div>
      </section>
      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Every two weeks — early-season form vs later</h3>
          <LineTable rows={data.recorded.byFortnight} first="Two weeks" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">By bouts so far (the less-experienced wrestler)</h3>
          <LineTable rows={data.recorded.byExperience} first="Bouts going in" />
          <p className="text-xs text-slate-500 mt-1">Where a rating has little to go on — a first bout, a newcomer — shows up here.</p>
        </div>
      </section>
      {data.recorded.byWeight?.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">By weight group</h3>
          <LineTable rows={data.recorded.byWeight} first="Weight" />
        </section>
      )}
      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">By settings version (what each version projected)</h3>
        <LineTable rows={data.recorded.bySettings} first="Version" />
      </section>
      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">What we projected vs what happened (from the projected winner’s side)</h3>
        <Matrix m={data.recorded.matrix} />
      </section>
      {data.cutoffs && data.cutoffs.n.pin > 0 && <section><Cutoffs c={data.cutoffs} title={`Speed bands — ${data.season}`} /></section>}
      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Rating matchups — how often the higher WRR won</h3>
        <Bands b={data.recorded.bands} />
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Lever Lab</h2>
        <p className="text-sm text-slate-500 mb-4">Change any lever and test it on every tracked {data.season} bout ({data.bouts?.toLocaleString()}): each bout is projected again from what was known going in, and graded against what happened.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {draft && <LeverForm p={draft} set={p => { setDraft(p); setTest(null) }} />}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={runTest} disabled={!!busy} className="px-4 py-1.5 bg-slate-900 text-white text-sm font-semibold disabled:opacity-40">Test on {data.season}</button>
              <button onClick={() => { setDraft(active?.params ?? V1_PARAMS); setTest(null) }} disabled={!!busy} className="px-3 py-1.5 border border-slate-300 text-sm text-slate-700 disabled:opacity-40">Back to active</button>
            </div>
          </div>
          <div className="space-y-3">
            {test?.error && <p className="text-sm text-red-600">{test.error}</p>}
            {test && !test.error && <>
              <Compare a={test.active.total} b={test.test.total} base={test.baseline?.total} />
              <p className="text-xs text-slate-500">Always pin: every bout projected as a 1st Period Pin for the {RATING_SHORT} favorite. Pins are most of all wins, so a finish lever only helps if it beats this.</p>
              <p className="text-xs text-slate-500">{test.changes.changed.toLocaleString()} projections changed: {test.changes.better.toLocaleString()} closer to what happened, {test.changes.worse.toLocaleString()} further.</p>
              {test.scale === 'speed' && <p className="text-xs text-amber-700">Speed bands: winner and finish type compare straight across; exact result and tiers off are each graded on their own scale (the test’s results re-ranked by speed band).</p>}
              <div className="border border-slate-200 bg-white px-3 py-2 space-y-2">
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="What changed and why (saved with the version)" className="w-full border border-slate-300 px-2 py-1 text-sm" />
                <button onClick={save} disabled={!!busy} className="px-4 py-1.5 bg-emerald-600 text-white text-sm font-semibold disabled:opacity-40">Save as Version {Math.max(0, ...data.settings.map(s => s.version)) + 1} (goes live)</button>
                {test.scale === 'speed' && <p className="text-xs text-slate-500">Speed bands: saving builds the bands from {data.season}’s timed bouts; the site shows results like “Pin under 0:25”. The {RATING_SHORT} stays on the clock.</p>}
              </div>
            </>}
            {!test && <p className="text-sm text-slate-400">Results show here after a test.</p>}
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}
          </div>
        </div>
        {test && !test.error && test.scale === 'speed' && (
          <div className="mt-4 grid md:grid-cols-2 gap-6">
            <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Test — every two weeks</h3><LineTable rows={test.test.byFortnight} first="Two weeks" /></div>
            <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Test — projected vs what happened</h3><Matrix m={test.test.matrix} /></div>
          </div>
        )}
        {test && !test.error && test.misses.finish.length > 0 && (
          <div className="mt-4"><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">With the test settings — worst finish calls</h3><Misses list={test.misses.finish} /></div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Worst finish calls — right winner, wrong finish</h3>
        {data.misses && <Misses list={data.misses.finish} />}
      </section>
      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Biggest upsets — projected winner lost (largest WRR gap)</h3>
        {data.misses && <Misses list={data.misses.upset} />}
      </section>

      <section>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Settings versions</h3>
        <table className="w-full border border-slate-200 bg-white">
          <thead className="bg-slate-50"><tr><th className={th}>Version</th><th className={th}>Saved</th><th className={th}>By</th><th className={th}>Note</th><th className={th}></th></tr></thead>
          <tbody>{[...data.settings].reverse().map(s => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className={td}>Version {s.version}{s.is_active && <span className="ml-2 text-[10px] font-bold uppercase text-emerald-700">Active</span>}</td>
              <td className={td}>{s.created_at.slice(0, 10)}</td><td className={td}>{s.created_by ?? '—'}</td>
              <td className={`${td} text-xs`}>{s.note ?? '—'}</td>
              <td className={td}><button onClick={() => { setDraft(s.params); setTest(null) }} className="text-xs text-blue-700 hover:underline">Load into lab</button></td>
            </tr>
          ))}</tbody>
        </table>
      </section>
    </div>
  )
}
