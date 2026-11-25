'use client'

// NJ wrestling history research tabs for writing Daily Challenge questions (Kyle 2026-11-12), one side at a
// time. Boys: every state placer and champion, every region champion, group and sectional team titles. Girls
// (2026-11-13): every region and state podium since 2019; regions are named, not numbered. Every table sorts by
// any column; click a row to see the finishes behind a count. Weights are as listed in their year (157
// existed 1952–73 and from 2022), so use the year range to separate eras.
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Finish = { person?: string; section?: string | null; level: 'state' | 'region'; year: number; region: number | null; region_name?: string | null; weight: string; place: number; tie: string | null; name: string; school: string | null; school_listed?: string | null; note: string | null; listed?: string }

// Today's 14 weights (Kyle 2026-11-12: "make the 14 weights consistent ... so that we can at least compare").
// Every year from 1996 has 14 weights (three sets: 1996–2011, 2012–21, 2022–now); they line up by position,
// lightest to heaviest, so 1996's 189 counts as 190 and 2012's 220 as 215. 1995 had 13 (state and region
// agree), so it can't line up and stays out, as do the years before.
export const TODAYS_14 = ['106', '113', '120', '126', '132', '138', '144', '150', '157', '165', '175', '190', '215', 'Hwt']
export const MATCHED_FROM = 1996
/** Since 1996: today's weight → the older weights it stands for (157 → 152, 160), from the data. */
export function equivalents(finishes: Finish[]): Map<string, string> {
  const m = new Map<string, Set<string>>()
  for (const f of finishes) if (f.listed && f.listed !== f.weight && !(f.listed === '275' && f.weight === 'Hwt')) (m.get(f.weight) ?? m.set(f.weight, new Set()).get(f.weight)!).add(f.listed)
  return new Map([...m].map(([w, set]) => [w, [...set].sort(weightSort).join(', ')]))
}
export const weightLabel = (w: string, eq: Map<string, string>) => (eq.get(w) ? `${w} (${eq.get(w)})` : w)

export function matchWeights(finishes: Finish[]): Finish[] {
  const byYear = new Map<number, Set<string>>()
  for (const f of finishes) if (f.year >= MATCHED_FROM) (byYear.get(f.year) ?? byYear.set(f.year, new Set()).get(f.year)!).add(f.weight === '275' ? 'Hwt' : f.weight)
  const slot = new Map<number, Map<string, string>>()
  for (const [y, ws] of byYear) {
    const sorted = [...ws].sort((a, b) => (a === 'Hwt' ? 999 : Number(a)) - (b === 'Hwt' ? 999 : Number(b)))
    if (sorted.length === 14) slot.set(y, new Map(sorted.map((w, i) => [w, TODAYS_14[i]])))
  }
  const out: Finish[] = []
  for (const f of finishes) {
    const m = slot.get(f.year)?.get(f.weight === '275' ? 'Hwt' : f.weight)
    if (m) out.push({ ...f, weight: m, listed: f.weight })
  }
  return out
}
export type Title = { kind: 'group' | 'sectional'; year: number; grp: string; section: string | null; champion: string; runner_up: string | null }

const th = 'px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap cursor-pointer select-none hover:bg-slate-100'
const td = 'px-3 py-1'
const input = 'border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black'
const ord = (n: number) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th')
const weightSort = (a: string, b: string) => (a === 'Hwt' ? 999 : Number(a)) - (b === 'Hwt' ? 999 : Number(b))
const schoolOf = (s: string | null) => s?.trim() || '(no school listed)'
/** A region as named: girls' regions have names (North I, Central…), boys' are numbered */
export const regionLabel = (f: Finish) => f.region_name ?? `Region ${f.region}`

/** One wrestler per high school career (Kyle 2026-11-13: Joe Duca of Paulsboro won regions in 1979-80 and his son in
 *  2007-10). Finishes under one name and school stay together while they fit four seasons from the first; a later
 *  one starts another wrestler. A name and school with more than one career is labeled with each one's years. */
export function assignPeople(finishes: Finish[]): Finish[] {
  const key = (f: Finish) => `${f.name.toLowerCase().replace(/[^a-z ]/g, '').trim()}|${(f.school ?? '').toLowerCase().trim()}`
  const groups = new Map<string, Finish[]>()
  for (const f of finishes) groups.set(key(f), [...(groups.get(key(f)) ?? []), f])
  const person = new Map<Finish, string>()
  for (const fs of groups.values()) {
    const sorted = [...fs].sort((a, b) => a.year - b.year)
    const careers: Finish[][] = []
    for (const f of sorted) {
      const cur = careers[careers.length - 1]
      if (cur && f.year - cur[0].year <= 3) cur.push(f); else careers.push([f])
    }
    for (const c of careers) {
      const first = c[0].year, last = c[c.length - 1].year
      const label = `${c[0].name} — ${schoolOf(c[0].school)}${careers.length > 1 ? ` (${first === last ? first : `${first}–${String(last).slice(2)}`})` : ''}`
      for (const f of c) person.set(f, label)
    }
  }
  return finishes.map(f => ({ ...f, person: person.get(f) }))
}

export function useHistory(gender: 'M' | 'F') {
  const [data, setData] = useState<{ finishes: Finish[]; titles: Title[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch(`/api/admin/history?gender=${gender}`).then(r => r.json()).then(d => d.error ? setError(d.error) : setData({ ...d, finishes: assignPeople(d.finishes).map(f => ({ ...f, section: (f.school && d.sections?.[f.school]) || null })) })).catch(() => setError('Could not load the history'))
  }, [gender])
  return { data, error }
}

// ── A sortable table ─────────────────────────────────────────────────────────

export type Col<R> = { key: string; label: string; value: (r: R) => string | number | null; render?: (r: R) => ReactNode; num?: boolean }

export function SortTable<R>({ cols, rows, rowKey, initial, detail, limit = 300 }: {
  cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string; initial: { key: string; desc: boolean }; detail?: (r: R) => ReactNode; limit?: number
}) {
  const [sort, setSort] = useState(initial)
  const [open, setOpen] = useState<string | null>(null)
  const [shown, setShown] = useState(limit)
  const col = cols.find(c => c.key === sort.key) ?? cols[0]
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    const x = col.value(a), y = col.value(b)
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x ?? '').localeCompare(String(y ?? ''), undefined, { numeric: true })
    return sort.desc ? -c : c
  }), [rows, col, sort.desc])
  const click = (k: string) => setSort(s => s.key === k ? { key: k, desc: !s.desc } : { key: k, desc: !!cols.find(c => c.key === k)?.num })
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-slate-200">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            <th className={`${th} cursor-default hover:bg-slate-50`}>#</th>
            {cols.map(c => <th key={c.key} className={th} onClick={() => click(c.key)}>{c.label} {sort.key === c.key ? (sort.desc ? '↓' : '↑') : ''}</th>)}
          </tr></thead>
          <tbody>{sorted.slice(0, shown).map((r, i) => {
            const k = rowKey(r)
            return (
              <Fragment key={k}>
                <tr className={`border-b border-slate-100 ${detail ? 'cursor-pointer hover:bg-slate-50' : ''}`} onClick={() => detail && setOpen(open === k ? null : k)}>
                  <td className={`${td} text-slate-400`}>{i + 1}</td>
                  {cols.map(c => <td key={c.key} className={`${td} ${c.num ? 'tabular-nums' : ''}`}>{c.render ? c.render(r) : c.value(r) ?? '—'}</td>)}
                </tr>
                {detail && open === k && <tr className="bg-slate-50/70 border-b border-slate-200"><td /><td colSpan={cols.length} className="px-3 py-2">{detail(r)}</td></tr>}
              </Fragment>
            )
          })}</tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-1">
        {sorted.length.toLocaleString()} rows{sorted.length > shown && <> · <button onClick={() => setShown(shown + limit)} className="underline hover:text-black">show {Math.min(limit, sorted.length - shown)} more</button></>}
      </p>
    </>
  )
}

function FinishList({ rows }: { rows: Finish[] }) {
  return (
    <div className="text-xs text-slate-600 columns-1 md:columns-2 gap-6">
      {[...rows].sort((a, b) => b.year - a.year || weightSort(a.weight, b.weight)).map((f, i) => (
        <div key={i}>{f.year} · {f.level === 'state' ? `State ${f.tie ?? ord(f.place)}` : `${regionLabel(f)} ${f.place === 1 ? 'champ' : ord(f.place)}`}{f.note ? ` (${f.note})` : ''} · {f.weight}{f.listed && f.listed !== f.weight ? ` (wrestled at ${f.listed})` : ''} · <b>{f.name}</b> ({schoolOf(f.school)})</div>
      ))}
    </div>
  )
}

// ── Filters shared by the finish tabs ────────────────────────────────────────

type Filters = { level: 'all' | 'state' | 'region'; region: string; weight: string; from: string; to: string; place: string; section: string }
const PLACES: Record<string, { label: string; test: (f: Finish) => boolean }> = {
  any:    { label: 'Any finish', test: () => true },
  champ:  { label: 'Champions', test: f => f.place === 1 },
  final:  { label: 'Finalists (1st–2nd)', test: f => f.place <= 2 },
  top4:   { label: 'Top 4', test: f => f.place <= 4 },
  podium: { label: 'State podium (1st–8th)', test: f => f.level === 'state' },
  ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8].map(p => [`p${p}`, { label: `${ord(p)} place`, test: (f: Finish) => f.place === p }])),
}

function useFilters(init: Partial<Filters> = {}) {
  const [f, setF] = useState<Filters>({ level: 'all', region: '', weight: '', from: '', to: '', place: 'any', section: '', ...init })
  const apply = (rows: Finish[]) => rows.filter(x => (!f.section || x.section === f.section) &&
    (f.level === 'all' || x.level === f.level) && (!f.region || (x.level === 'region' && regionLabel(x) === f.region)) &&
    (!f.weight || x.weight === f.weight) && (!f.from || x.year >= Number(f.from)) && (!f.to || x.year <= Number(f.to)) && PLACES[f.place].test(x))
  return { f, setF, apply }
}

function FilterBar({ f, setF, finishes, show = ['level', 'region', 'section', 'weight', 'years', 'place'] }: { f: Filters; setF: (f: Filters) => void; finishes: Finish[]; show?: string[] }) {
  const weights = useMemo(() => [...new Set(finishes.map(x => x.weight))].sort(weightSort), [finishes])
  const eq = useMemo(() => equivalents(finishes), [finishes])   // Since 1996: 157 shows as 157 (152, 160)
  const set = (k: keyof Filters, v: string) => setF({ ...f, [k]: v, ...(k === 'region' && v ? { level: 'region' as const } : {}), ...(k === 'level' && v !== 'region' ? { region: '' } : {}) })
  return (
    <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
      {show.includes('level') && <select value={f.level} onChange={e => set('level', e.target.value)} className={input}><option value="all">State + region</option><option value="state">State</option><option value="region">Region</option></select>}
      {show.includes('region') && <select value={f.region} onChange={e => set('region', e.target.value)} className={input}><option value="">All regions</option>{[...new Set(finishes.filter(x => x.level === 'region').map(regionLabel))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).map(r => <option key={r} value={r}>{r}</option>)}</select>}
      {show.includes('section') && <select value={f.section} onChange={e => set('section', e.target.value)} className={input}><option value="">All sections</option>{[...new Set(finishes.map(x => x.section).filter(Boolean))].sort().map(sec => <option key={sec!} value={sec!}>{sec}</option>)}</select>}
      {show.includes('weight') && <select value={f.weight} onChange={e => set('weight', e.target.value)} className={input}><option value="">All weights</option>{weights.map(w => <option key={w} value={w}>{weightLabel(w, eq)}</option>)}</select>}
      {show.includes('years') && <>
        <input value={f.from} onChange={e => set('from', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="From year" className={`${input} w-24`} />
        <input value={f.to} onChange={e => set('to', e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="To year" className={`${input} w-24`} />
      </>}
      {show.includes('place') && <select value={f.place} onChange={e => set('place', e.target.value)} className={input}>{Object.entries(PLACES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>}
    </div>
  )
}

// ── Explorer ─────────────────────────────────────────────────────────────────

const GROUPS: Record<string, { label: string; key: (f: Finish) => string }> = {
  wrestler: { label: 'Wrestler', key: f => f.person ?? `${f.name} — ${schoolOf(f.school)}` },
  school:   { label: 'School', key: f => schoolOf(f.school) },
  weight:   { label: 'Weight', key: f => f.weight },
  year:     { label: 'Year', key: f => String(f.year) },
  region:   { label: 'Region', key: f => (f.level === 'region' ? regionLabel(f) : 'State') },
  section:  { label: 'Section', key: f => f.section ?? '(section not known)' },
}
type Agg = { key: string; section: string | null; rows: Finish[]; total: number; state1: number; statePod: number; region1: number; first: number; last: number }
function aggregate(rows: Finish[], key: (f: Finish) => string): Agg[] {
  const m = new Map<string, Finish[]>()
  for (const r of rows) { const k = key(r); m.set(k, [...(m.get(k) ?? []), r]) }
  return [...m].map(([k, rs]) => ({
    key: k, section: rs[0].section ?? null, rows: rs, total: rs.length,
    state1: rs.filter(r => r.level === 'state' && r.place === 1).length, statePod: rs.filter(r => r.level === 'state').length,
    region1: rs.filter(r => r.level === 'region' && r.place === 1).length, first: Math.min(...rs.map(r => r.year)), last: Math.max(...rs.map(r => r.year)),
  }))
}

export function ExplorerTab({ finishes }: { finishes: Finish[] }) {
  const { f, setF, apply } = useFilters({ place: 'any' })   // every finish until narrowed (a 3rd place hid under "Champions")
  const [by, setBy] = useState('school')
  const rows = aggregate(apply(finishes), GROUPS[by].key)
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">Pick the finishes, then how to count them. e.g. most champions in one region: pick the region · Champions · by School (or by Wrestler).</p>
      <FilterBar f={f} setF={setF} finishes={finishes} />
      <div className="flex items-center gap-2 mb-3 text-sm">
        <span className="text-slate-500">Count by</span>
        {Object.entries(GROUPS).map(([k, g]) => <button key={k} onClick={() => setBy(k)} className={`px-3 py-1 border ${by === k ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>{g.label}</button>)}
      </div>
      <SortTable<Agg> rows={rows} rowKey={r => r.key} initial={{ key: 'total', desc: true }} detail={r => <FinishList rows={r.rows} />}
        cols={[
          { key: 'key', label: GROUPS[by].label, value: r => r.key, render: r => <span className="font-medium">{r.key}</span> },
          ...(by === 'school' || by === 'wrestler' ? [{ key: 'section', label: 'Section', value: (r: Agg) => r.section ?? '' }] : []),
          { key: 'total', label: 'Count', value: r => r.total, num: true },
          { key: 'state1', label: 'State titles', value: r => r.state1, num: true },
          { key: 'statePod', label: 'State podiums', value: r => r.statePod, num: true },
          { key: 'region1', label: 'Region titles', value: r => r.region1, num: true },
          { key: 'first', label: 'First', value: r => r.first, num: true },
          { key: 'last', label: 'Last', value: r => r.last, num: true },
        ]} />
    </div>
  )
}

// ── Schools ──────────────────────────────────────────────────────────────────

type SchoolAgg = { school: string; state1: number; final: number; statePod: number; region1: number; group1: number; group2: number; sect1: number; byWeight: Record<string, number>; rows: Finish[] }
const METRICS: Record<string, { label: string; test: (f: Finish) => boolean }> = {
  state1: { label: 'State titles', test: f => f.level === 'state' && f.place === 1 },
  statePod: { label: 'State podiums', test: f => f.level === 'state' },
  region1: { label: 'Region titles', test: f => f.level === 'region' && f.place === 1 },
}

export function SchoolsTab({ finishes, titles }: { finishes: Finish[]; titles: Title[] }) {
  const { f, setF, apply } = useFilters()
  const [view, setView] = useState<'totals' | 'weights'>('totals')
  const [metric, setMetric] = useState('state1')
  const fin = apply(finishes)
  const yr = (y: number) => (!f.from || y >= Number(f.from)) && (!f.to || y <= Number(f.to))
  const weights = [...new Set(fin.filter(METRICS[metric].test).map(x => x.weight))].sort(weightSort)
  const eqs = equivalents(finishes)
  const rows = (() => {
    const m = new Map<string, SchoolAgg>()
    const get = (s: string) => m.get(s) ?? m.set(s, { school: s, state1: 0, final: 0, statePod: 0, region1: 0, group1: 0, group2: 0, sect1: 0, byWeight: {}, rows: [] }).get(s)!
    for (const x of fin) {
      const a = get(schoolOf(x.school)); a.rows.push(x)
      if (x.level === 'state') { a.statePod++; if (x.place === 1) a.state1++; if (x.place <= 2) a.final++ } else if (x.place === 1) a.region1++
      if (METRICS[metric].test(x)) a.byWeight[x.weight] = (a.byWeight[x.weight] ?? 0) + 1
    }
    // Team titles follow the year range only (they have no weight or region)
    if (!f.weight && !f.region) for (const t of titles) {
      if (!yr(t.year)) continue
      if (t.kind === 'group') { get(t.champion).group1++; if (t.runner_up) get(t.runner_up).group2++ } else get(t.champion).sect1++
    }
    return [...m.values()]
  })()
  const totalOf = (r: SchoolAgg) => Object.values(r.byWeight).reduce((a, b) => a + b, 0)
  return (
    <div>
      <FilterBar f={f} setF={setF} finishes={finishes} show={['region', 'weight', 'years']} />
      <div className="flex items-center gap-2 mb-3 text-sm">
        <button onClick={() => setView('totals')} className={`px-3 py-1 border ${view === 'totals' ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>Totals</button>
        <button onClick={() => setView('weights')} className={`px-3 py-1 border ${view === 'weights' ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>By weight</button>
        {view === 'weights' && <select value={metric} onChange={e => setMetric(e.target.value)} className={input}>{Object.entries(METRICS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}</select>}
        {(f.weight || f.region) && view === 'totals' && <span className="text-xs text-slate-400">Team titles are hidden while a weight or region is picked.</span>}
      </div>
      {view === 'totals'
        ? <SortTable<SchoolAgg> rows={rows} rowKey={r => r.school} initial={{ key: 'state1', desc: true }} detail={r => <FinishList rows={r.rows} />}
            cols={[
              { key: 'school', label: 'School', value: r => r.school, render: r => <span className="font-medium">{r.school}</span> },
              { key: 'state1', label: 'State titles', value: r => r.state1, num: true },
              { key: 'final', label: 'State finalists', value: r => r.final, num: true },
              { key: 'statePod', label: 'State podiums', value: r => r.statePod, num: true },
              { key: 'region1', label: 'Region titles', value: r => r.region1, num: true },
              { key: 'group1', label: 'Group titles', value: r => r.group1, num: true },
              { key: 'group2', label: 'Group runner-up', value: r => r.group2, num: true },
              { key: 'sect1', label: 'Sectional titles', value: r => r.sect1, num: true },
            ]} />
        : <SortTable<SchoolAgg> rows={rows.filter(r => totalOf(r) > 0)} rowKey={r => r.school} initial={{ key: 'total', desc: true }} detail={r => <FinishList rows={r.rows.filter(METRICS[metric].test)} />}
            cols={[
              { key: 'school', label: 'School', value: r => r.school, render: r => <span className="font-medium">{r.school}</span> },
              { key: 'total', label: 'Total', value: totalOf, num: true },
              ...weights.map(w => ({ key: `w${w}`, label: weightLabel(w, eqs), value: (r: SchoolAgg) => r.byWeight[w] ?? 0, render: (r: SchoolAgg) => r.byWeight[w] ? r.byWeight[w] : <span className="text-slate-300">·</span>, num: true })),
            ]} />}
    </div>
  )
}

// ── Wrestlers ────────────────────────────────────────────────────────────────

export function WrestlersTab({ finishes }: { finishes: Finish[] }) {
  const { f, setF, apply } = useFilters()
  const rows = aggregate(apply(finishes), GROUPS.wrestler.key).map(a => ({ ...a, weights: [...new Set(a.rows.map(r => r.weight))].sort(weightSort).join(', ') }))
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">A wrestler is a name at a school. Old years often list initials, so one person can appear twice.</p>
      <FilterBar f={f} setF={setF} finishes={finishes} show={['region', 'weight', 'years']} />
      <SortTable rows={rows} rowKey={r => r.key} initial={{ key: 'state1', desc: true }} detail={r => <FinishList rows={r.rows} />}
        cols={[
          { key: 'key', label: 'Wrestler — school', value: r => r.key, render: r => <span className="font-medium">{r.key}</span> },
          { key: 'state1', label: 'State titles', value: r => r.state1, num: true },
          { key: 'statePod', label: 'State podiums', value: r => r.statePod, num: true },
          { key: 'region1', label: 'Region titles', value: r => r.region1, num: true },
          { key: 'weights', label: 'Weights', value: r => r.weights },
          { key: 'first', label: 'First', value: r => r.first, num: true },
          { key: 'last', label: 'Last', value: r => r.last, num: true },
        ]} />
    </div>
  )
}

// ── Team titles ──────────────────────────────────────────────────────────────

export function TeamTitlesTab({ titles }: { titles: Title[] }) {
  const [kind, setKind] = useState<'all' | 'group' | 'sectional'>('all')
  const [grp, setGrp] = useState('')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'titles' | 'schools'>('schools')
  const groups = useMemo(() => [...new Set(titles.map(t => t.grp))].sort(), [titles])
  const rows = titles.filter(t => (kind === 'all' || t.kind === kind) && (!grp || t.grp === grp) && (!q || `${t.champion} ${t.runner_up ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const bySchool = useMemo(() => {
    const m = new Map<string, { school: string; group1: number; group2: number; sect1: number; years: number[] }>()
    const get = (s: string) => m.get(s) ?? m.set(s, { school: s, group1: 0, group2: 0, sect1: 0, years: [] }).get(s)!
    for (const t of rows) {
      if (t.kind === 'group') { const a = get(t.champion); a.group1++; a.years.push(t.year); if (t.runner_up) get(t.runner_up).group2++ }
      else { const a = get(t.champion); a.sect1++; a.years.push(t.year) }
    }
    return [...m.values()]
  }, [rows])
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-sm">
        <button onClick={() => setView('schools')} className={`px-3 py-1 border ${view === 'schools' ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>By school</button>
        <button onClick={() => setView('titles')} className={`px-3 py-1 border ${view === 'titles' ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`}>Every title</button>
        <select value={kind} onChange={e => setKind(e.target.value as typeof kind)} className={input}><option value="all">Group + sectional</option><option value="group">Group (state)</option><option value="sectional">Sectional</option></select>
        <select value={grp} onChange={e => setGrp(e.target.value)} className={input}><option value="">All groups</option>{groups.map(g => <option key={g} value={g}>{g}</option>)}</select>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search school" className={`${input} w-48`} />
      </div>
      {view === 'schools'
        ? <SortTable rows={bySchool} rowKey={r => r.school} initial={{ key: 'group1', desc: true }}
            cols={[
              { key: 'school', label: 'School', value: r => r.school, render: r => <span className="font-medium">{r.school}</span> },
              { key: 'group1', label: 'Group titles', value: r => r.group1, num: true },
              { key: 'group2', label: 'Group runner-up', value: r => r.group2, num: true },
              { key: 'sect1', label: 'Sectional titles', value: r => r.sect1, num: true },
              { key: 'years', label: 'Title years', value: r => [...r.years].sort((a, b) => b - a).join(', ') },
            ]} />
        : <SortTable rows={rows} rowKey={r => `${r.kind}${r.year}${r.grp}${r.section}${r.champion}`} initial={{ key: 'year', desc: true }}
            cols={[
              { key: 'year', label: 'Year', value: r => r.year, num: true },
              { key: 'kind', label: 'Title', value: r => (r.kind === 'group' ? 'Group' : 'Sectional') },
              { key: 'grp', label: 'Group', value: r => r.grp },
              { key: 'section', label: 'Section', value: r => r.section },
              { key: 'champion', label: 'Champion', value: r => r.champion, render: r => <span className="font-medium">{r.champion}</span> },
              { key: 'runner_up', label: 'Runner-up', value: r => r.runner_up },
            ]} />}
    </div>
  )
}

// ── All finishes ─────────────────────────────────────────────────────────────

export function AllFinishesTab({ finishes }: { finishes: Finish[] }) {
  const { f, setF, apply } = useFilters()
  const [q, setQ] = useState('')
  const rows = apply(finishes).filter(x => !q || `${x.name} ${x.school ?? ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search wrestler or school" className={`${input} w-64 mb-2`} />
      <FilterBar f={f} setF={setF} finishes={finishes} />
      <SortTable rows={rows} rowKey={r => `${r.level}${r.year}${r.region}${r.weight}${r.place}${r.name}${r.tie}`} initial={{ key: 'year', desc: true }}
        cols={[
          { key: 'year', label: 'Year', value: r => r.year, num: true },
          { key: 'level', label: 'Level', value: r => (r.level === 'state' ? 'State' : regionLabel(r)) },
          { key: 'weight', label: 'Weight', value: r => (r.weight === 'Hwt' ? 999 : Number(r.weight)), render: r => <>{r.weight}{r.listed && r.listed !== r.weight && <span className="text-slate-400"> ({r.listed})</span>}</>, num: true },
          { key: 'place', label: 'Place', value: r => r.place, render: r => r.tie ?? ord(r.place), num: true },
          { key: 'name', label: 'Wrestler', value: r => r.name, render: r => <span className="font-medium">{r.name}</span> },
          { key: 'school', label: 'School', value: r => r.school },
          { key: 'note', label: 'Note', value: r => r.note },
        ]} />
    </div>
  )
}

// ── Medal Table (Kyle 2026-11-14): state medals like the Olympics — champions, then runners-up, then thirds — with
// team titles beside them and titles in all (individual + team). By school, or by wrestler: a wrestler's team titles
// are the ones their school won from their first finish on file to their last (the years we know they were there). ──
type MedalAgg = { key: string; school: string; gold: number; silver: number; bronze: number; other: number; total: number; group1: number; sect1: number; first: number; last: number; rows: Finish[] }

export function MedalTableTab({ finishes, titles }: { finishes: Finish[]; titles: Title[] }) {
  const [by, setBy] = useState<'school' | 'wrestler'>('school')
  const rows = (() => {
    const m = new Map<string, MedalAgg>()
    const get = (k: string, school: string) => m.get(k) ?? m.set(k, { key: k, school, gold: 0, silver: 0, bronze: 0, other: 0, total: 0, group1: 0, sect1: 0, first: 9999, last: 0, rows: [] }).get(k)!
    for (const x of finishes) {
      const a = get(by === 'school' ? schoolOf(x.school) : GROUPS.wrestler.key(x), schoolOf(x.school))
      a.first = Math.min(a.first, x.year); a.last = Math.max(a.last, x.year)
      if (x.level !== 'state') continue
      a.rows.push(x); a.total++
      if (x.place === 1) a.gold++; else if (x.place === 2) a.silver++; else if (x.place === 3) a.bronze++; else a.other++
    }
    if (by === 'school') for (const t of titles) { if (t.kind === 'group') get(t.champion, t.champion).group1++; else get(t.champion, t.champion).sect1++ }
    else for (const a of m.values()) for (const t of titles) {
      if (t.champion !== a.school || t.year < a.first || t.year > a.last) continue
      if (t.kind === 'group') a.group1++; else a.sect1++
    }
    return [...m.values()].filter(a => a.total > 0 || (by === 'school' && a.group1 + a.sect1 > 0))
  })()
  // Olympic order: golds, then silvers, then bronzes, then all medals
  const olympic = (r: MedalAgg) => r.gold * 1e9 + r.silver * 1e6 + r.bronze * 1e3 + r.total
  const btn = (on: boolean) => `px-3 py-1 border ${on ? 'bg-black text-white border-black' : 'border-slate-300 hover:border-black'}`
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm">
        <button onClick={() => setBy('school')} className={btn(by === 'school')}>Schools</button>
        <button onClick={() => setBy('wrestler')} className={btn(by === 'wrestler')}>Wrestlers</button>
      </div>
      <p className="mb-3 text-xs text-slate-500">State medals (every place on the podium), ranked by champions, then runners-up, then thirds. Team titles: state group and sectional champions{by === 'wrestler' ? ' won by the wrestler’s school from their first finish on file to their last' : ''}. Total titles = individual state titles + team titles.</p>
      <SortTable<MedalAgg> key={by} rows={rows} rowKey={r => r.key} initial={{ key: 'rank', desc: true }} detail={r => <FinishList rows={r.rows} />}
        cols={[
          by === 'school'
            ? { key: 'key', label: 'School', value: r => r.key, render: r => <span className="font-medium">{r.key}</span> }
            : { key: 'key', label: 'Wrestler — school', value: r => r.key, render: r => <span className="font-medium">{r.key}</span> },
          { key: 'rank', label: 'Champs', value: olympic, render: r => r.gold, num: true },
          { key: 'silver', label: '2nd', value: r => r.silver, num: true },
          { key: 'bronze', label: '3rd', value: r => r.bronze, num: true },
          { key: 'other', label: '4th–8th', value: r => r.other, num: true },
          { key: 'total', label: 'Medals', value: r => r.total, num: true },
          { key: 'group1', label: 'Group', value: r => r.group1, num: true },
          { key: 'sect1', label: 'Sectional', value: r => r.sect1, num: true },
          { key: 'teams', label: 'Team titles', value: r => r.group1 + r.sect1, num: true },
          { key: 'titles', label: 'Total titles', value: r => r.gold + r.group1 + r.sect1, render: r => <span className="font-semibold">{r.gold + r.group1 + r.sect1}</span>, num: true },
          ...(by === 'wrestler' ? [{ key: 'years', label: 'Years', value: (r: MedalAgg) => r.first, render: (r: MedalAgg) => r.first === r.last ? r.first : `${r.first}–${String(r.last).slice(2)}` }] : []),
        ]} />
    </div>
  )
}
