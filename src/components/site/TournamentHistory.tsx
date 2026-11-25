// The History tab of a district, region or state page (Kyle 2026-11-14): team champions by year, champions by weight
// (weights down the side, years across the top), the high team scores, leaders, and the quickest pins and techs over
// time. A year whose weight class isn't one of today's sits in the nearest row, marked. Data: src/lib/tournamentHistory.ts
import Link from 'next/link'
import { SchoolTag } from '@/components/SchoolTag'
import { SiteTabs } from '@/components/site/SiteTabs'
import { mapWeights, tournamentHistory, type TournamentHistoryData, type HistBout, type HistLevel } from '@/lib/tournamentHistory'
import { seasonWeights } from '@/lib/postseasonSeason'
import { WEIGHTS } from '@/lib/leaderboards/config'
import { CALCULATED_TEAM_NOTE } from '@/lib/teamScoreNote'
import { NjwhLink } from '@/components/site/NjwhLink'
import { IconHint } from '@/components/site/IconHint'
import { MoreTable, MultiChampTabs } from '@/components/site/HistoryLists'

const th = 'px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const td = 'px-3 py-1 whitespace-nowrap'
const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** The Brackets / History tabs on a tournament page */
export function HistoryTabs({ base, view }: { base: string; view: 'brackets' | 'history' }) {
  return <SiteTabs items={[{ key: 'brackets', label: 'Brackets', href: base }, { key: 'history', label: 'History', href: `${base}?view=history` }]} active={view} />
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-black">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{head.map((h, i) => <th key={i} className={th}>{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

// sub: under the title (where a table's years start, Kyle 2026-11-16: "advertise their 2013 start"); note: under the table
function Section({ title, sub, note, children }: { title: string; sub?: React.ReactNode; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className={`${sub ? 'mb-0.5' : 'mb-3'} text-base font-semibold text-slate-800`}>{title}</h2>
      {sub && <p className="mb-3 text-xs font-medium text-slate-500">{sub}</p>}
      {children}
      {note && <p className="mt-2 text-xs text-slate-500">{note}</p>}
    </section>
  )
}

// a school before our brackets that isn't one of ours (closed, merged) shows as NJ Wrestling History names it
const School = ({ id, name, old }: { id: number | null; name: string; old?: boolean }) =>
  id == null && old ? <span>{name}</span> : <SchoolTag id={id} name={name} />
const oldCredit = (what: string, years: { label: string; old?: boolean; season: number }[]) => {
  const from = years.filter(y => !y.old).sort((a, b) => a.season - b.season)[0]?.label
  return <>{what} before {from ? `our brackets (${from})` : 'our brackets'} are from <NjwhLink />.</>
}

// 👻 a ghost champion: won the title seeded 5th or lower (as on the brackets; seeds are on file for every state
// bracket and the recent districts and regions)
const ghost = (p: { place: number; seed?: number | null }, what: string) => p.place === 1 && p.seed != null && p.seed >= 5
  ? <IconHint className="ml-1" hint={`Ghost champion: won this ${what.toLowerCase()} as the #${p.seed} seed (seeded 5th or lower)`}>👻</IconHint> : null

const Wrestler = ({ side, id, name }: { side: string; id: string | null; name: string }) =>
  id ? <Link href={`/${side}/wrestler/${id}`} className="font-medium text-slate-900 hover:underline">{name}</Link> : <span className="font-medium">{name}</span>

export function TournamentHistory({ gender, level, data, current, seasonWeights, showEvent }: {
  gender: 'M' | 'F'
  level: HistLevel
  data: TournamentHistoryData
  current: readonly number[]                 // today's weight classes
  seasonWeights: Record<number, number[]>    // each year's own classes
  showEvent?: boolean                        // regions: the year's region name (North I …) under the year
}) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const { years, placers, teams, bouts } = data
  if (!years.length) return <p className="text-sm text-slate-500">No history on file for this tournament.</p>
  const yearsDesc = [...years].sort((a, b) => b.season - a.season)
  const ourYears = yearsDesc.filter(y => !y.old)              // team scores and bout times start with our brackets
  const hasOld = placers.some(p => p.old)
  // boys results go further back than our brackets: a table drawn only from them says where it starts (Kyle 2026-11-16)
  const since = gender === 'M' && ourYears.length ? `Goes back to ${ourYears[ourYears.length - 1].label}.` : undefined
  const label = (s: number) => years.find(y => y.season === s)?.label ?? String(s)

  // team champion and runner-up each year
  const bySeason = new Map<number, typeof teams>()
  for (const t of teams) bySeason.set(t.season, [...(bySeason.get(t.season) ?? []), t])
  for (const v of bySeason.values()) v.sort((a, b) => b.points - a.points)
  const calc = teams.some(t => t.calculated)

  // champions grid: today's weights down the side, years across; each year's class mapped to the nearest
  const maps = new Map(years.map(y => [y.season, mapWeights(seasonWeights[y.season] ?? current, current)]))
  const champ = new Map<string, (typeof placers)[number] & { actual: number | string }>()
  for (const p of placers) if (p.place === 1) {
    const row = maps.get(p.season)?.get(p.weight) ?? p.weight
    champ.set(`${row}|${p.season}`, { ...p, actual: p.weightLabel ?? p.weight })
  }
  const mapped = [...champ.entries()].some(([k, c]) => Number(k.split('|')[0]) !== c.actual)

  // leaders
  const count = <T,>(rows: T[], key: (r: T) => string | null) => { const m = new Map<string, T[]>(); for (const r of rows) { const k = key(r); if (k) m.set(k, [...(m.get(k) ?? []), r]) } return [...m.values()].sort((a, b) => b.length - a.length) }
  const teamTitles = count([...bySeason.values()].map(v => v[0]).filter(Boolean), t => t.school_id != null ? String(t.school_id) : null).slice(0, 10)
  const champs = placers.filter(p => p.place === 1)
  const schoolKey = (p: (typeof placers)[number]) => p.school_id != null ? String(p.school_id) : p.old && p.school ? `n:${p.school}` : null
  const bySchool = count(champs, schoolKey)
  // the same wrestler: their profile, else name and school (years before our brackets have no profiles)
  // every podium finish by school (Kyle 2026-11-21: "we have state champions by school but we need state podium by
  // school too"): most medals, then most titles, then most runners-up…
  const depth = Math.max(0, ...placers.map(p => p.place))
  const podiumBySchool = count(placers, schoolKey).map(v => ({ v, at: Array.from({ length: depth }, (_, k) => v.filter(p => p.place === k + 1).length) }))
    .sort((a, b) => b.v.length - a.v.length || a.at.reduce((d, n, k) => d || b.at[k] - n, 0))
  const multi = count(champs, p => p.wrestler_id ?? `${p.name.toLowerCase()}|${schoolKey(p)}`).filter(v => v.length > 1)
    .map(v => [...v].sort((a, b) => a.season - b.season))
    // by the year the wrestler got there (their last title): the state list from the first to do it to the most
    // recent, the region and district lists most recent first (Kyle 2026-11-16)
    .sort((a, b) => (level === 'state' ? 1 : -1) * (a[a.length - 1].season - b[b.length - 1].season) || a[0].season - b[0].season)
  const multiRow = (v: (typeof champs), i: number) => (
    <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
      <td className={`${td} tabular-nums`}>{i + 1}</td>
      <td className={td}><Wrestler side={side} id={v.find(p => p.wrestler_id)?.wrestler_id ?? null} name={v[v.length - 1].name} /><div className="text-[11px] text-slate-500">{v[v.length - 1].school}</div></td>
      <td className={`${td} text-slate-600`}>{v.map(p => `'${String(p.season).slice(-2)}`).join(', ')}</td>
    </tr>)
  const multiGroups = [
    { key: '4', label: '4x', rows: multi.filter(v => v.length >= 4).map(multiRow) },
    { key: '3', label: '3x', rows: multi.filter(v => v.length === 3).map(multiRow) },
    { key: '2', label: '2x', rows: multi.filter(v => v.length === 2).map(multiRow) },
  ]
  const levelName = level === 'state' ? 'State' : level === 'region' ? 'Region' : 'District'
  const high = [...teams].sort((a, b) => b.points - a.points).slice(0, 10)

  const top = (tech: boolean) => bouts.filter(b => b.tech === tech).sort((a, b) => a.secs - b.secs).slice(0, 10)
  const fastest = (s: number, tech: boolean) => bouts.filter(b => b.season === s && b.tech === tech).sort((a, b) => a.secs - b.secs)[0]
  const boutCell = (b: HistBout | undefined, tech: boolean) => b ? <><span className="mr-2 font-mono font-semibold tabular-nums">{clock(b.secs)}</span><Wrestler side={side} id={b.wrestler_id} name={b.name} /> <span className="text-slate-500">· {b.school} · {b.weight}</span></> : <span className="text-slate-400">{tech ? 'No Techs' : 'No Pins'}</span>

  return (
    <div>
      <Section title="Team Champions" sub={since} note={calc ? CALCULATED_TEAM_NOTE : undefined}>
        <Table head={['Year', ...(showEvent ? ['Region'] : []), 'Champion', 'Pts', 'Runner-up', 'Pts']}>
          {ourYears.map((y, i) => { const [w, r] = bySeason.get(y.season) ?? []; return (
            <tr key={y.season} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
              <td className={`${td} tabular-nums`}>{y.label}</td>
              {showEvent && <td className={`${td} text-slate-500`}>{y.event}</td>}
              <td className={`${td} font-semibold`}>{w ? <SchoolTag id={w.school_id} name={w.school} /> : '—'}</td>
              <td className={`${td} tabular-nums`}>{w?.points ?? ''}</td>
              <td className={td}>{r ? <SchoolTag id={r.school_id} name={r.school} /> : ''}</td>
              <td className={`${td} tabular-nums text-slate-500`}>{r?.points ?? ''}</td>
            </tr>) })}
        </Table>
      </Section>

      <Section title="Champions by Weight" sub={hasOld ? undefined : since} note={(mapped || hasOld) ? <>{mapped && <><span className="bg-amber-100 px-1 font-semibold text-amber-800">Shaded</span> weights: that year&apos;s class differed, shown in the row of today&apos;s nearest weight. </>}{hasOld && oldCredit('Champions', years)}</> : undefined}>
        <div className="overflow-x-auto border border-black">
          <table className="text-[12px]">
            <thead><tr className="bg-slate-900 text-white">
              <th className={`${th} sticky left-0 bg-slate-900`}>Wt</th>
              {yearsDesc.map(y => <th key={y.season} className={th}>{y.label}{showEvent && !/^Region \d+$/.test(y.event) ? <div className="text-[10px] font-normal normal-case text-slate-300">{y.event}</div> : null}</th>)}
            </tr></thead>
            <tbody>
              {current.map((w, i) => (
                <tr key={w} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                  <td className={`${td} sticky left-0 font-bold tabular-nums ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>{w}</td>
                  {yearsDesc.map(y => { const c = champ.get(`${w}|${y.season}`); return (
                    <td key={y.season} className="px-3 py-1 align-top">
                      {c ? <div className="whitespace-nowrap">
                        {c.actual !== w && <span className="mr-1 bg-amber-100 px-1 font-semibold text-amber-800 tabular-nums">{c.actual}</span>}
                        <Wrestler side={side} id={c.wrestler_id} name={c.name} />{ghost(c, levelName)}
                        <div className="text-[11px] text-slate-500">{c.school}</div>
                      </div> : <span className="text-slate-300">—</span>}
                    </td>) })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`${levelName} Champions by School`} sub={hasOld ? undefined : since} note={hasOld ? oldCredit(`${levelName} champions`, years) : undefined}>
        <MoreTable head={['#', 'School', 'Champs', 'First', 'Latest']} first={10} step={20} rows={bySchool.map((v, i) => { const ys = v.map(p => p.season); return (
          <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
            <td className={`${td} tabular-nums`}>{i + 1}</td>
            <td className={`${td} font-semibold`}><School id={v[0].school_id} name={v[0].school} old={v[0].old} /></td>
            <td className={`${td} tabular-nums font-semibold`}>{v.length}</td>
            <td className={`${td} tabular-nums text-slate-500`}>{label(Math.min(...ys))}</td>
            <td className={`${td} tabular-nums text-slate-500`}>{label(Math.max(...ys))}</td>
          </tr>) })} />
      </Section>

      <Section title={`${levelName} Podium by School`} sub={hasOld ? undefined : since} note={hasOld ? oldCredit(`${levelName} placers`, years) : undefined}>
        <MoreTable head={['#', 'School', 'Medals', ...Array.from({ length: depth }, (_, k) => ord(k + 1)), 'First', 'Latest']} first={10} step={20} rows={podiumBySchool.map(({ v, at }, i) => { const ys = v.map(p => p.season); return (
          <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
            <td className={`${td} tabular-nums`}>{i + 1}</td>
            <td className={`${td} font-semibold`}><School id={v[0].school_id} name={v[0].school} old={v[0].old} /></td>
            <td className={`${td} tabular-nums font-semibold`}>{v.length}</td>
            {at.map((n, k) => <td key={k} className={`${td} tabular-nums ${n ? '' : 'text-slate-300'}`}>{n || '—'}</td>)}
            <td className={`${td} tabular-nums text-slate-500`}>{label(Math.min(...ys))}</td>
            <td className={`${td} tabular-nums text-slate-500`}>{label(Math.max(...ys))}</td>
          </tr>) })} />
      </Section>

      <Section title="High Scores" sub={since} note={calc ? CALCULATED_TEAM_NOTE : undefined}>
        <Table head={['#', 'School', 'Year', 'Pts']}>
          {high.map((t, i) => (
            <tr key={`${t.season}-${t.school_id}`} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
              <td className={`${td} tabular-nums`}>{i + 1}</td>
              <td className={`${td} font-semibold`}><SchoolTag id={t.school_id} name={t.school} /></td>
              <td className={`${td} tabular-nums`}>{label(t.season)}</td>
              <td className={`${td} tabular-nums font-semibold`}>{t.points}</td>
            </tr>))}
        </Table>
      </Section>

      <Section title="Leaders" note={hasOld ? oldCredit('Multi-time champions', years) : undefined}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Team Titles</h3>
            <p className="mb-2 text-xs font-medium text-slate-500">{since ?? '\u00a0'}</p>
            <Table head={['School', '#']}>
              {teamTitles.map((v, i) => <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}><td className={td}><SchoolTag id={v[0].school_id} name={v[0].school} /></td><td className={`${td} tabular-nums font-semibold`}>{v.length}</td></tr>)}
            </Table>
          </div>
          <div>
            <h3 className="mb-0.5 text-sm font-semibold text-slate-700">Multi-Time Champs</h3>
            <p className="mb-2 text-xs font-medium text-slate-500">{hasOld ? 'All years on file.' : since ?? '\u00a0'}</p>
            <MultiChampTabs groups={multiGroups} />
          </div>
        </div>
      </Section>

      <Section title="Quickest Decks & Techs" sub={since} note="A tech fall of 0:15 or under isn't counted; a pin or tech with no time on file counts as 6:00.">
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          {([false, true] as const).map(tech => (
            <Table key={String(tech)} head={['#', tech ? 'Tech' : 'Deck', 'Wrestler', 'Wt', 'Year']}>
              {top(tech).map((b, i) => (
                <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                  <td className={`${td} tabular-nums`}>{i + 1}</td>
                  <td className={`${td} font-mono font-semibold tabular-nums`}>{clock(b.secs)}</td>
                  <td className={td}><Wrestler side={side} id={b.wrestler_id} name={b.name} /><div className="text-[11px] text-slate-500">{b.school}</div></td>
                  <td className={`${td} tabular-nums`}>{b.weight}</td>
                  <td className={`${td} tabular-nums`}>{label(b.season)}</td>
                </tr>))}
            </Table>
          ))}
        </div>
        <Table head={['Year', 'Quickest Deck', 'Quickest Tech']}>
          {ourYears.map((y, i) => (
            <tr key={y.season} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
              <td className={`${td} tabular-nums`}>{y.label}</td>
              <td className={td}>{boutCell(fastest(y.season, false), false)}</td>
              <td className={td}>{boutCell(fastest(y.season, true), true)}</td>
            </tr>))}
        </Table>
      </Section>
    </div>
  )
}

/** The weight page's history (Kyle 2026-11-14): the podium at this weight each year, a differing year's class marked */
export function WeightHistory({ gender, data, weight: pageWeight, current, seasonWeights }: { gender: 'M' | 'F'; data: TournamentHistoryData; weight: number; current: readonly number[]; seasonWeights: Record<number, number[]> }) {
  const side = gender === 'F' ? 'girls' : 'boys'
  const weight = current.includes(pageWeight) ? pageWeight : mapWeights([pageWeight], current).get(pageWeight)!   // an old year's class: today's nearest
  const yearsDesc = [...data.years].sort((a, b) => b.season - a.season)
  const rows = yearsDesc.map(y => {
    const m = mapWeights(seasonWeights[y.season] ?? current, current)
    const ps = data.placers.filter(p => p.season === y.season && (m.get(p.weight) ?? p.weight) === weight).sort((a, b) => a.place - b.place)
    return { y, ps, actual: ps[0]?.weight, label: ps[0]?.weightLabel }
  }).filter(r => r.ps.length)
  if (!rows.length) return null
  const places = Math.max(...rows.map(r => Math.max(...r.ps.map(p => p.place))))
  return (
    <section className="mt-12">
      <h2 className="mb-3 text-base font-semibold text-slate-800">History · {weight} lb</h2>
      <Table head={['Year', ...Array.from({ length: places }, (_, i) => ord(i + 1))]}>
        {rows.map(({ y, ps, actual, label }, i) => (
          <tr key={y.season} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
            <td className={`${td} tabular-nums`}>{y.label}{(actual !== weight || label) && <span className="ml-1 bg-amber-100 px-1 text-[11px] font-semibold text-amber-800">{label ?? actual}</span>}</td>
            {Array.from({ length: places }, (_, k) => { const p = ps.find(x => x.place === k + 1); return (
              <td key={k} className="px-3 py-1 align-top">{p ? <div className="whitespace-nowrap"><Wrestler side={side} id={p.wrestler_id} name={p.name} />{ghost(p, 'tournament')}<div className="text-[11px] text-slate-500">{p.school}</div></div> : <span className="text-slate-300">—</span>}</td>) })}
          </tr>))}
      </Table>
      {rows.some(r => r.actual !== weight || r.label) && <p className="mt-2 text-xs text-slate-500"><span className="bg-amber-100 px-1 font-semibold text-amber-800">Shaded</span> years had a different weight class, shown here as today&apos;s nearest.</p>}
      {rows.some(r => r.ps.some(p => p.old)) ? <p className="mt-1 text-xs text-slate-500">{oldCredit('Podiums', data.years)}</p>
        : gender === 'M' && <p className="mt-1 text-xs text-slate-500">Goes back to {rows[rows.length - 1].y.label}.</p>}
    </section>
  )
}

/** Loads and shows a tournament's History tab for the seasons in the viewer's postseason picker */
export async function TournamentHistoryView({ gender, level, num, seasons, regionName = null }: { gender: 'M' | 'F'; level: HistLevel; num: number | null; seasons: number[]; regionName?: string | null }) {
  const data = await tournamentHistory(gender, level, num, seasons, regionName)
  return <TournamentHistory gender={gender} level={level} data={data} current={WEIGHTS[gender]} seasonWeights={await weightsBySeason(gender, data)} showEvent={level === 'region'} />
}

/** The weight page's History section */
export async function WeightHistoryView({ gender, level, num, seasons, weight, regionName = null }: { gender: 'M' | 'F'; level: HistLevel; num: number | null; seasons: number[]; weight: number; regionName?: string | null }) {
  const data = await tournamentHistory(gender, level, num, seasons, regionName)
  return <WeightHistory gender={gender} data={data} weight={weight} current={WEIGHTS[gender]} seasonWeights={await weightsBySeason(gender, data)} />
}

async function weightsBySeason(gender: 'M' | 'F', data: TournamentHistoryData): Promise<Record<number, number[]>> {
  return Object.fromEntries(await Promise.all(data.years.map(async y => [y.season, data.oldWeights[y.season] ?? await seasonWeights(gender, y.season, WEIGHTS[gender])] as const)))
}
