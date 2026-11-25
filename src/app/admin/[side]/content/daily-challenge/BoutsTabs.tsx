'use client'

// Daily Challenge research from the postseason brackets on file (Kyle 2026-11-14), one side at a time, every season
// with brackets (2012-13 on for boys, 2018-19 on for girls): Pins & Techs — every fall and tech fall at districts,
// regions and states with its time, counted by wrestler, school, year, weight or event, or listed bout by bout; and
// Low-Seed Champs — every state champion with the seed he won from. Years are the season's end year (2018 = 2017-18).
import { useEffect, useMemo, useState } from 'react'
import { SortTable, type Col } from './HistoryTabs'

type Event = { year: number; level: 'district' | 'region' | 'state'; name: string }
type Data = { events: Record<string, Event>; people: string[]; pins: [number, number | null, string, 0 | 1, number | null, number, number][]; champs: { year: number; weight: number | null; seed: number | null; person: number }[]; placed: [number, number, number, number, number][] }
type Bout = { key: string; year: number; level: Event['level']; event: string; weight: number | null; round: string; tech: boolean; secs: number | null; winner: string; school: string; loser: string; loserSchool: string }

const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const btn = (on: boolean) => `px-3 py-1 border ${on ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`
const clock = (s: number | null) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
const wt = (w: number | null) => (w == null ? '—' : w >= 275 ? `${w} (Hwt)` : String(w))
const ROUND: Record<string, string> = { R1: 'Prelim', R2: 'Round 1', QF: 'Quarters', SF: 'Semis', F: 'Final', '3rd_Place': '3rd place', '5th_Place': '5th place', '7th_Place': '7th place' }

function useBouts(g: 'M' | 'F') {
  // kept with the side it was loaded for, so a switch shows Loading until the other side arrives
  const [got, setGot] = useState<{ g: 'M' | 'F'; data: Data | null; error: string | null } | null>(null)
  useEffect(() => {
    fetch(`/api/admin/history/bouts?gender=${g}`).then(r => r.json()).then(d => setGot({ g, data: d.error ? null : d, error: d.error ?? null })).catch(() => setGot({ g, data: null, error: 'Could not load the bouts' }))
  }, [g])
  return got?.g === g ? { data: got.data, error: got.error } : { data: null, error: null }
}

function Side({ who, setWho }: { who: 'M' | 'F'; setWho: (g: 'M' | 'F') => void }) {
  return <div className="flex">{(['M', 'F'] as const).map(g => <button key={g} onClick={() => setWho(g)} className={btn(who === g)}>{g === 'M' ? 'Boys' : 'Girls'}</button>)}</div>
}

// ── Pins & Techs ─────────────────────────────────────────────────────────────

type Agg = { key: string; rows: Bout[]; pins: number; techs: number; fastPin: number | null; fastTech: number | null; avgPin: number | null; first: number; last: number }
const GROUPS: Record<string, { label: string; key: (b: Bout) => string }> = {
  wrestler: { label: 'Wrestler', key: b => `${b.winner} — ${b.school}` },
  school:   { label: 'School', key: b => b.school },
  year:     { label: 'Year', key: b => String(b.year) },
  weight:   { label: 'Weight', key: b => wt(b.weight) },
  event:    { label: 'Event', key: b => b.event },
  bout:     { label: 'Bout', key: b => b.key },
}
const min = (xs: (number | null)[]) => { const v = xs.filter((x): x is number => x != null); return v.length ? Math.min(...v) : null }

export function PinsTab({ gender }: { gender: 'M' | 'F' }) {
  const [who, setWho] = useState(gender)
  const { data, error } = useBouts(who)
  const [level, setLevel] = useState<'all' | Event['level']>('all')
  const [kind, setKind] = useState<'both' | 'pins' | 'techs'>('both')
  const [from, setFrom] = useState(''), [to, setTo] = useState(''), [weight, setWeight] = useState('')
  const [by, setBy] = useState('wrestler')
  const bouts = useMemo<Bout[]>(() => {
    if (!data) return []
    const p = (i: number) => { const [n, s] = (data.people[i] ?? '—|TBD').split('|'); return { n, s } }
    return data.pins.map(([t, w, round, tech, secs, win, lose], i) => {
      const e = data.events[t], a = p(win), b = p(lose)
      return { key: String(i), year: e.year, level: e.level, event: e.level === 'state' ? 'State' : e.name, weight: w, round, tech: tech === 1, secs, winner: a.n, school: a.s, loser: b.n, loserSchool: b.s }
    })
  }, [data])
  const weights = useMemo(() => [...new Set(bouts.map(b => b.weight).filter((w): w is number => w != null))].sort((a, b) => a - b), [bouts])
  const shown = bouts.filter(b => (level === 'all' || b.level === level) && (kind === 'both' || b.tech === (kind === 'techs')) &&
    (!from || b.year >= Number(from)) && (!to || b.year <= Number(to)) && (!weight || String(b.weight) === weight))
  if (error) return <p className="text-sm text-red-600">{error}</p>
  const years = data ? [...new Set(Object.values(data.events).map(e => e.year))].sort() : []
  const head = (
    <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
      <Side who={who} setWho={setWho} />
      {years.length > 0 && <span className="text-xs text-slate-500 ml-2">Brackets on file {years[0] - 1}-{String(years[0]).slice(2)} to {years[years.length - 1] - 1}-{String(years[years.length - 1]).slice(2)} (year = the season&apos;s end year)</span>}
    </div>
  )
  if (!data) return <>{head}<p className="text-sm text-slate-400">Loading the bouts…</p></>
  const groupRows: Agg[] = by === 'bout' ? [] : (() => {
    const m = new Map<string, Bout[]>()
    for (const b of shown) { const k = GROUPS[by].key(b); m.set(k, [...(m.get(k) ?? []), b]) }
    return [...m].map(([key, rows]) => {
      const pinTimes = rows.filter(r => !r.tech && r.secs != null).map(r => r.secs!)
      return { key, rows, pins: rows.filter(r => !r.tech).length, techs: rows.filter(r => r.tech).length, fastPin: min(rows.filter(r => !r.tech).map(r => r.secs)), fastTech: min(rows.filter(r => r.tech).map(r => r.secs)),
        avgPin: pinTimes.length ? Math.round(pinTimes.reduce((a, b) => a + b, 0) / pinTimes.length) : null, first: Math.min(...rows.map(r => r.year)), last: Math.max(...rows.map(r => r.year)) }
    })
  })()
  const boutCols: Col<Bout>[] = [
    { key: 'secs', label: 'Time', value: b => b.secs ?? 99999, render: b => <span className="tabular-nums font-medium">{clock(b.secs)}</span>, num: true },
    { key: 'type', label: 'Type', value: b => (b.tech ? 'Tech' : 'Pin') },
    { key: 'year', label: 'Year', value: b => b.year, num: true },
    { key: 'event', label: 'Event', value: b => b.event },
    { key: 'weight', label: 'Wt', value: b => b.weight, render: b => wt(b.weight), num: true },
    { key: 'round', label: 'Round', value: b => ROUND[b.round] ?? b.round },
    { key: 'winner', label: 'Winner', value: b => b.winner, render: b => <><span className="font-medium">{b.winner}</span> <span className="text-slate-400">{b.school}</span></> },
    { key: 'loser', label: 'Over', value: b => b.loser, render: b => <>{b.loser} <span className="text-slate-400">{b.loserSchool}</span></> },
  ]
  return (
    <div>
      {head}
      <p className="text-xs text-slate-500 mb-2">Every fall and tech fall at districts, regions and states. Pick the bouts, then how to count them; Bout lists them one by one (sort by Time for the fastest). Click a row for its bouts.</p>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        <select value={level} onChange={e => setLevel(e.target.value as typeof level)} className={input}><option value="all">Districts + regions + states</option><option value="district">Districts</option><option value="region">Regions</option><option value="state">States</option></select>
        <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} className={input}><option value="both">Pins + techs</option><option value="pins">Pins</option><option value="techs">Techs</option></select>
        <select value={weight} onChange={e => setWeight(e.target.value)} className={input}><option value="">All weights</option>{weights.map(w => <option key={w} value={w}>{wt(w)}</option>)}</select>
        <input value={from} onChange={e => setFrom(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="From year" className={`${input} w-24`} />
        <input value={to} onChange={e => setTo(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="To year" className={`${input} w-24`} />
      </div>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        <span className="text-slate-500">Count by</span>
        {Object.entries(GROUPS).map(([k, g]) => <button key={k} onClick={() => setBy(k)} className={btn(by === k)}>{g.label}</button>)}
      </div>
      {by === 'bout'
        ? <SortTable<Bout> key={`${who}bout`} rows={shown} rowKey={b => b.key} initial={{ key: 'secs', desc: false }} cols={boutCols} />
        : <SortTable<Agg> key={`${who}${by}`} rows={groupRows} rowKey={r => r.key} initial={{ key: kind === 'techs' ? 'techs' : 'pins', desc: true }}
            detail={r => <SortTable<Bout> rows={r.rows} rowKey={b => b.key} initial={{ key: 'year', desc: true }} cols={boutCols} limit={50} />}
            cols={[
              { key: 'key', label: GROUPS[by].label, value: r => r.key, render: r => <span className="font-medium">{r.key}</span> },
              { key: 'pins', label: 'Pins', value: r => r.pins, num: true },
              { key: 'techs', label: 'Techs', value: r => r.techs, num: true },
              { key: 'total', label: 'Total', value: r => r.pins + r.techs, num: true },
              { key: 'fastPin', label: 'Fastest pin', value: r => r.fastPin ?? 99999, render: r => clock(r.fastPin), num: true },
              { key: 'avgPin', label: 'Avg pin', value: r => r.avgPin ?? 99999, render: r => clock(r.avgPin), num: true },
              { key: 'fastTech', label: 'Fastest tech', value: r => r.fastTech ?? 99999, render: r => clock(r.fastTech), num: true },
              { key: 'first', label: 'First', value: r => r.first, num: true },
              { key: 'last', label: 'Last', value: r => r.last, num: true },
            ]} />}
    </div>
  )
}

// ── Low-seed state champions ─────────────────────────────────────────────────

type Champ = { key: string; year: number; weight: number | null; seed: number; name: string; school: string }

export function LowSeedTab({ gender }: { gender: 'M' | 'F' }) {
  const [who, setWho] = useState(gender)
  const { data, error } = useBouts(who)
  const [minSeed, setMinSeed] = useState('')
  const champs = useMemo<Champ[]>(() => (data?.champs ?? []).filter(c => c.seed != null).map((c, i) => {
    const [name, school] = (data!.people[c.person] ?? '—|TBD').split('|')
    return { key: String(i), year: c.year, weight: c.weight, seed: c.seed!, name, school }
  }), [data])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  const unseeded = (data?.champs ?? []).filter(c => c.seed == null).length
  const rows = champs.filter(c => !minSeed || c.seed >= Number(minSeed))
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        <Side who={who} setWho={setWho} />
        <label className="flex items-center gap-1 text-slate-600 ml-2">Seeded
          <input value={minSeed} onChange={e => setMinSeed(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="any" className={`${input} w-16`} /> or lower</label>
      </div>
      {!data ? <p className="text-sm text-slate-400">Loading the champions…</p> : <>
        <p className="text-xs text-slate-500 mb-2">State champions by the seed they won from (lowest seeds first). Click a column to sort; Wt sorts by weight.{unseeded ? ` ${unseeded} champions with no seed on file are left out.` : ''}</p>
        <SortTable<Champ> key={who} rows={rows} rowKey={c => c.key} initial={{ key: 'seed', desc: true }} cols={[
          { key: 'seed', label: 'Seed', value: c => c.seed, render: c => <span className="font-semibold tabular-nums">#{c.seed}</span>, num: true },
          { key: 'year', label: 'Year', value: c => c.year, num: true },
          { key: 'weight', label: 'Wt', value: c => c.weight, render: c => wt(c.weight), num: true },
          { key: 'name', label: 'Champion', value: c => c.name, render: c => <span className="font-medium">{c.name}</span> },
          { key: 'school', label: 'School', value: c => c.school },
        ]} />
      </>}
    </div>
  )
}

// ── Seeds: the best finishes from every seed ─────────────────────────────────

type Placer = { year: number; event: string; weight: number; place: number; seed: number; name: string; school: string }
const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th'}`

export function SeedsTab({ gender }: { gender: 'M' | 'F' }) {
  const [who, setWho] = useState(gender)
  const { data, error } = useBouts(who)
  const [level, setLevel] = useState<Event['level']>('state')
  const placers = useMemo<Placer[]>(() => (data?.placed ?? []).flatMap(([t, weight, place, seed, p]) => {
    const e = data!.events[t]
    if (e.level !== level) return []
    const [name, school] = (data!.people[p] ?? '—|TBD').split('|')
    return [{ year: e.year, event: e.level === 'state' ? 'State' : e.name, weight, place, seed, name, school }]
  }), [data, level])
  if (error) return <p className="text-sm text-red-600">{error}</p>
  // each seed: its finishes best first (place, then most recent); the top 3 show, with how often the best was reached
  const seeds = [...new Set(placers.map(p => p.seed))].sort((a, b) => a - b).map(seed => {
    const rows = placers.filter(p => p.seed === seed).sort((a, b) => a.place - b.place || b.year - a.year || a.weight - b.weight)
    return { seed, rows, best: rows[0].place, timesBest: rows.filter(r => r.place === rows[0].place).length, placers: rows.length }
  })
  const years = [...new Set(placers.map(p => p.year))].sort()
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-sm flex-wrap">
        <Side who={who} setWho={setWho} />
        <select value={level} onChange={e => setLevel(e.target.value as Event['level'])} className={`${input} ml-2`}><option value="state">States</option><option value="region">Regions</option><option value="district">Districts</option></select>
        {years.length > 0 && <span className="text-xs text-slate-500">Seeds on file: {years.map(y => `${y - 1}-${String(y).slice(2)}`).join(', ')}</span>}
      </div>
      {!data ? <p className="text-sm text-slate-400">Loading the placers…</p> : !seeds.length ? <p className="text-sm text-slate-400">No seeded placers on file at this level.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead className="bg-slate-50 border-b border-slate-200"><tr>
              {['Seed', 'Best finish', 'Top 3 finishes from this seed', 'Placers'].map(h => <th key={h} className="px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>{seeds.map(s => (
              <tr key={s.seed} className="border-b border-slate-100 align-top">
                <td className="px-3 py-1 font-semibold tabular-nums">#{s.seed}</td>
                <td className="px-3 py-1 whitespace-nowrap">{ordinal(s.best)}<span className="text-slate-400"> ×{s.timesBest}</span></td>
                <td className="px-3 py-1">{s.rows.slice(0, 3).map((r, i) => (
                  <div key={i}><span className="font-medium">{ordinal(r.place)}</span> · {r.year} · {r.event === 'State' ? '' : `${r.event} · `}{wt(r.weight)} · <span className="font-medium">{r.name}</span> <span className="text-slate-400">{r.school}</span></div>
                ))}</td>
                <td className="px-3 py-1 tabular-nums text-slate-500">{s.placers}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="text-xs text-slate-400 mt-1">Best finish ×N = how many times that seed reached it. Ties go to the most recent year. Year = the season&apos;s end year.</p>
        </div>
      )}
    </div>
  )
}
