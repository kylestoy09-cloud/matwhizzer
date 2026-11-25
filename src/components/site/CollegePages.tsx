// The college pages (Kyle 2026-11-17: "create college profiles and list out the nj wrestlers with results at that
// school"), boys only: the list of colleges NJ wrestlers competed for at the NCAA Division I championships, and one
// college's page (a bar in its colors, then each NJ wrestler — high school, NCAA years, best finish, All-American count,
// record and bonus wins; * = a record from a bracket sheet missing bouts). Shown in the Aesthetic Tool mock until Kyle
// approves (mock first); `live` = links work, off in the mock. Kyle 2026-11-17: the college page's header like a high
// school's (lettering, mascot, city and state, conference), the table apart from it, no record column, "NCAA
// Qualifier" years, and a dropdown per wrestler; the list gets leader boards (consolation wins = back side warriors).
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Stardos_Stencil } from 'next/font/google'
import { textOn, levelFull, ordinal, COLLEGE_LEVELS, type Side } from '@/lib/ncaa/stats'
import { loadCollege, loadLevel } from '@/lib/ncaa/collegePublic'
import { CollegeLevelTabs } from '@/components/site/CollegeLevelTabs'
import { CollegeRosterTable, type RosterRow } from '@/components/site/CollegeRosterTable'
import { SchoolTag } from '@/components/SchoolTag'
import { StatBoard, BoardCell } from '@/components/site/StatBoard'
import { CollegeListTable } from '@/components/site/CollegeListTable'
import { SortableBoard, type BoardCol, type BoardRow } from '@/components/site/SortableBoard'
import { CollegeLevelViews } from '@/components/site/CollegeLevelViews'

const stardos = Stardos_Stencil({ weight: '700', subsets: ['latin'] })
const TH = 'text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap'
const Maybe = ({ href, live, className, children }: { href: string; live: boolean; className: string; children: ReactNode }) =>
  live ? <Link href={href} className={className}>{children}</Link> : <span className={className}>{children}</span>

/** The college list with a tab per championship level (Kyle 2026-11-17); every tab is drawn on the server and the tabs
 *  switch between them */
// embedded: as Insight · Collegiate's body (the Insight page supplies the header and width)
export async function CollegeListCore({ live = true, g = 'M', embedded = false }: { live?: boolean; g?: Side; embedded?: boolean }) {
  const levels = COLLEGE_LEVELS[g]
  const panels = await Promise.all(levels.map(l => LevelPanel({ live, g, level: l.level })))
  const tabs = levels.map((l, i) => ({ key: l.level, label: l.tab, summary: panels[i].summary, panel: panels[i].panel }))
  if (embedded) return <CollegeLevelTabs title="" tabs={tabs} embedded />
  // the standard page width and header (title, the level tabs, the level's summary line — Kyle 2026-11-18)
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <CollegeLevelTabs title={g === 'F' ? 'Girls College' : 'Boys College'} tabs={levels.map((l, i) => ({ key: l.level, label: l.tab, summary: panels[i].summary, panel: panels[i].panel }))} />
    </div>
  )
}

/** One level's colleges and leader boards, and its summary line for the header */
async function LevelPanel({ live, g, level }: { live: boolean; g: Side; level: string }): Promise<{ summary: ReactNode; panel: ReactNode }> {
  const side = g === 'F' ? '/girls' : '/boys'
  // live: cached 5 minutes (src/lib/ncaa/collegePublic.ts); the mock reads fresh
  const { list, careers } = await loadLevel(g, level, !live)
  if (!list.length) return { summary: `No ${levelFull(g, level)} results loaded yet.`, panel: null }
  const total = list.reduce((s, c) => s + c.wrestlers, 0)
  const firstYear = Math.min(...list.map(c => c.first))
  // Leaders (Kyle 2026-11-18): the national champions (multi-time first), every medal by the year it was won, and the
  // back side warriors (most consolation wins) — career totals at this level's championships, each board sortable
  const sub = (c: (typeof careers)[number]) => c.hs?.name ?? null
  const collegeOf = (c: (typeof careers)[number]) => c.colleges.map(x => x.name).join(' / ') || 'TBD'
  const href = (c: (typeof careers)[number]) => `${side}/wrestler/${c.wrestler_id}`
  const placeCell = (p: number) => ({ v: p, t: p === 1 ? 'Champion' : ordinal(p) })
  const champs: BoardRow[] = careers.filter(c => c.totals.titles > 0).map(c => ({ id: c.wrestler_id, name: c.name, href: href(c), sub: sub(c),
    values: { college: collegeOf(c), titles: c.totals.titles, years: c.finishes.filter(f => f.place === 1).map(f => `${f.year} (${f.weight})`).join(', ') } }))
  const medals: BoardRow[] = careers.flatMap(c => c.finishes.map(f => ({ id: `${c.wrestler_id}-${f.year}-${f.weight}`, name: c.name, href: href(c), sub: sub(c),
    values: { year: f.year, place: placeCell(f.place), weight: f.weight, college: f.college } })))
  // Kyle 2026-11-18 ("the leaderboard tab for each division to show leaders"): the career leaders — most All-American
  // finishes at every level; wins, falls and bonus wins where the level's bouts are loaded (DI, DII — DIII and NAIA are
  // placings only)
  const aaRows: BoardRow[] = careers.filter(c => c.totals.aa > 0).map(c => ({ id: c.wrestler_id, name: c.name, href: href(c), sub: sub(c),
    values: { college: collegeOf(c), aa: c.totals.aa, titles: c.totals.titles || null, best: placeCell(c.totals.best!) } }))
  const winRows: BoardRow[] = careers.filter(c => c.totals.wins > 0).map(c => ({ id: c.wrestler_id, name: c.name, href: href(c), sub: sub(c),
    values: { college: collegeOf(c), wins: c.totals.wins, losses: c.totals.losses, years: c.totals.years } }))
  const bonusRows: BoardRow[] = careers.filter(c => c.totals.falls + c.totals.techs + c.totals.majors > 0).map(c => ({ id: c.wrestler_id, name: c.name, href: href(c), sub: sub(c),
    values: { college: collegeOf(c), bonus: c.totals.falls + c.totals.techs + c.totals.majors, falls: c.totals.falls, techs: c.totals.techs, majors: c.totals.majors } }))
  const backside: BoardRow[] = careers.filter(c => c.totals.consWins > 0).map(c => ({ id: c.wrestler_id, name: c.name, href: href(c), sub: sub(c),
    values: { college: collegeOf(c), consWins: c.totals.consWins, aa: c.totals.aa || null } }))
  const boards: { title: string; note: string; cols: BoardCol[]; rows: BoardRow[]; initial: { key: string; desc: boolean }; then?: { key: string; desc: boolean } }[] = [
    { title: 'National Champions', note: 'NJ wrestlers who won the title — multi-time champions first', cols: [{ key: 'college', label: 'College' }, { key: 'titles', label: 'Titles', num: true }, { key: 'years', label: 'Years (weight)' }], rows: champs, initial: { key: 'titles', desc: true } },
    { title: 'Medals by Year', note: 'Every top-8 finish, by the year it was won', cols: [{ key: 'year', label: 'Year', num: true }, { key: 'place', label: 'Place', num: true }, { key: 'weight', label: 'Wt', num: true }, { key: 'college', label: 'College' }], rows: medals, initial: { key: 'year', desc: true }, then: { key: 'place', desc: false } },
    { title: 'Most All-American Finishes', note: 'Career top-8 finishes at these championships', cols: [{ key: 'college', label: 'College' }, { key: 'aa', label: 'AA', num: true }, { key: 'titles', label: 'Titles', num: true }, { key: 'best', label: 'Best', num: true }], rows: aaRows, initial: { key: 'aa', desc: true }, then: { key: 'best', desc: false } },
    { title: 'Most Wins', note: 'Career wins at these championships', cols: [{ key: 'college', label: 'College' }, { key: 'wins', label: 'W', num: true }, { key: 'losses', label: 'L', num: true }, { key: 'years', label: 'Years', num: true }], rows: winRows, initial: { key: 'wins', desc: true } },
    { title: 'Most Bonus Wins', note: 'Falls, tech falls and major decisions, career', cols: [{ key: 'college', label: 'College' }, { key: 'bonus', label: 'Bonus', num: true }, { key: 'falls', label: 'Falls', num: true }, { key: 'techs', label: 'Techs', num: true }, { key: 'majors', label: 'Majors', num: true }], rows: bonusRows, initial: { key: 'bonus', desc: true }, then: { key: 'falls', desc: true } },
    { title: 'Back Side Warriors', note: 'Most consolation wins at the championships, career', cols: [{ key: 'college', label: 'College' }, { key: 'consWins', label: 'Cons. W', num: true }, { key: 'aa', label: 'AA', num: true }], rows: backside, initial: { key: 'consWins', desc: true } },
  ].filter(b => b.rows.length > 0)
  const leaders = boards.length ? (
    <div className="space-y-8">
      {boards.map(b => (
        <div key={b.title}>
          <h2 className="text-lg font-bold text-slate-900">{b.title} <span className="text-sm font-normal text-slate-400">· {b.rows.length}</span></h2>
          <p className="text-xs text-slate-500 mb-2">{b.note} · click a column to sort</p>
          <SortableBoard cols={b.cols} rows={b.rows} initial={b.initial} then={b.then} live={live} />
        </div>
      ))}
      <p className="text-xs text-slate-500">Cons. W = wins on the wrestleback side, place bouts included. Some 2000s bracket sheets don’t list every bout; place-winner-only years list no bouts.</p>
    </div>
  ) : <p className="text-sm text-slate-500">No champions, medals or consolation wins on file for this level yet.</p>
  const colleges = (
    <div>
      <CollegeListTable rows={list.map(c => ({ id: c.college.id, name: c.college.name, color: c.college.primary_color ?? '#334155', href: live ? `${side}/college/${c.college.id}` : null,
        wrestlers: c.wrestlers, aa: c.aa, titles: c.titles, first: c.first, last: c.last }))} />
      <p className="mt-1 text-xs text-slate-500">Click a column to sort; click again to flip it.</p>
      <p className="mt-3 text-xs text-slate-500">NJSIAA high school wrestlers matched to their championship entries.</p>
    </div>
  )
  // the header as a table (Kyle 2026-11-21): NJSIAA, with the level's total titles and All-Americans (wrestlers with a
  // top-8 finish), counted over careers so a transfer counts once
  const aaWrestlers = careers.filter(c => c.totals.aa > 0).length, titlesAll = careers.reduce((n, c) => n + c.totals.titles, 0)
  // the stats board that tops the school profile (src/components/site/StatBoard.tsx)
  const summary = (
    <StatBoard cols="grid-cols-3 sm:grid-cols-5" className="mb-0 max-w-3xl">
      <BoardCell label="Years">{firstYear}–now</BoardCell>
      <BoardCell label="Colleges">{list.length}</BoardCell>
      <BoardCell label="NJSIAA Wrestlers">{total}</BoardCell>
      <BoardCell label="All-Americans">{aaWrestlers}</BoardCell>
      <BoardCell label="Titles">{titlesAll}</BoardCell>
    </StatBoard>
  )
  return { summary,
    panel: <CollegeLevelViews colleges={colleges} leaders={leaders} /> }
}


/** Years as runs: 1974–1975, 1979, 1983–1985 */
function yearSpans(ys: number[]): string {
  const u = [...new Set(ys)].sort((a, b) => a - b), out: string[] = []
  for (let i = 0; i < u.length; i++) {
    let j = i
    while (j + 1 < u.length && u[j + 1] === u[j] + 1) j++
    out.push(i === j ? `${u[i]}` : `${u[i]}–${u[j]}`); i = j
  }
  return out.join(', ')
}

export async function CollegePageCore({ cid, live = true, g = 'M' }: { cid: number; live?: boolean; g?: Side }) {
  // the girls' page too (Kyle 2026-11-19: the women's championships, imported like the boys')
  const side = g === 'F' ? '/girls' : '/boys'
  const { college, roster, accolades, badges } = await loadCollege(g, cid, !live)
  if (!college || !roster.length) return <p className="text-sm text-slate-500">No NJ wrestlers on file for that college.</p>
  const bg = college.primary_color ?? '#334155', fg = textOn(bg)
  const anyShort = roster.some(r => !r.totals.complete)
  const aa = roster.filter(r => r.totals.aa > 0).length, titles = roster.reduce((s, r) => s + r.totals.titles, 0)
  const place = [college.city, college.state].filter(Boolean).join(', ')
  const pill = 'text-xs font-semibold px-3 py-1 rounded-full bg-white/15 whitespace-nowrap'
  const rows: RosterRow[] = roster.map(r => ({ ...r, hs: r.hs ? <SchoolTag id={r.hs.id} name={r.hs.name} className="" /> : 'TBD', accolades: accolades[r.wrestler_id] ?? [], badges: badges[r.wrestler_id] ?? [] }))
  const sum = (k: 'falls' | 'techs' | 'majors' | 'consWins') => roster.reduce((s, r) => s + r.totals[k], 0)
  const years = roster.flatMap(r => r.years.map(y => y.year))
  return (
    <div>
      {/* the high school page's header: name in the school lettering, mascot under it, then city and state; a pill row */}
      <div className="w-full shadow-md" style={{ backgroundColor: bg, borderBottom: `4px solid ${college.secondary_color ?? bg}` }}>
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <h1 className={`${stardos.className} text-2xl md:text-3xl uppercase tracking-tight leading-none`} style={{ color: fg }}>{college.name}</h1>
          {college.mascot && <p className={`${stardos.className} text-base md:text-lg mt-0.5`} style={{ color: fg, opacity: 0.9 }}>{college.mascot}</p>}
          {place && <p className="text-xs mt-1" style={{ color: fg, opacity: 0.75 }}>{place}</p>}
        </div>
        <div className="px-4 sm:px-6 pb-2.5 flex flex-wrap items-center gap-1.5">
          {college.conference && <span className={pill} style={{ color: fg }}>{college.conference}</span>}
          {/* each championship with the years its NJ wrestlers were there (Kyle 2026-11-18) */}
          {COLLEGE_LEVELS[g].map(l => l.level).filter(l => roster.some(r => r.years.some(y => y.level === l))).map(l => (
            <span key={l} className={pill} style={{ color: fg }}>{levelFull(g, l)} · {yearSpans(roster.flatMap(r => r.years.filter(y => y.level === l).map(y => y.year)))}</span>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Maybe live={live} href={`${side}/insight/collegiate`} className="text-sm text-slate-500 hover:text-slate-700 hover:underline mb-4 inline-block">← All Colleges</Maybe>
        <h2 className="text-lg font-bold text-slate-900 mb-2">NJ Wrestlers at the College Championships</h2>
        {/* the numbers as a stats board, like the school profile's (Kyle 2026-11-18) */}
        <StatBoard cols="grid-cols-4 sm:grid-cols-7">
          <BoardCell label="NJ Wrestlers">{roster.length}</BoardCell>
          <BoardCell label="Years" sub={years.length ? `${Math.min(...years)}–${Math.max(...years)}` : null}>{new Set(years).size}</BoardCell>
          <BoardCell label="All-Americans">{aa}</BoardCell>
          <BoardCell label="Titles">{titles}</BoardCell>
          <BoardCell label="Falls">{sum('falls')}</BoardCell>
          <BoardCell label="Tech Falls">{sum('techs')}</BoardCell>
          <BoardCell label="Cons. Wins">{sum('consWins')}</BoardCell>
        </StatBoard>
        <p className="text-sm text-slate-500 mb-3">Click a wrestler for {g === 'F' ? 'her' : 'his'} awards, year by year.</p>
        <CollegeRosterTable rows={rows} live={live} side={side} />
        <p className="mt-3 text-xs text-slate-500">Championship bouts only. AA = All-American (top 8). Cons. Wins = wins on the wrestleback side, place bouts included.{anyShort ? ' * The bracket sheet for at least one year doesn’t list every bout, so that record is incomplete.' : ''}</p>
      </div>
    </div>
  )
}
