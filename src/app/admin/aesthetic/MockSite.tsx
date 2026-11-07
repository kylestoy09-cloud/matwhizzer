'use client'
// Mock site for the Aesthetic Tool: the public top nav and each page it links to. Every page keeps the
// layout it has on the live site; only the frame is standardized: the header (title left with a rule,
// season picker, summary, tabs), tabs, buttons and tables (Kyle, 2026-11-06). Sample content only.
// The schedule keeps its own page (calendars work differently).

import { Fragment, useState, type ReactNode } from 'react'
import { SitePageHeader } from '@/components/site/SitePageHeader'
import { SiteTabs } from '@/components/site/SiteTabs'
import { NumberTileGrid, type NumberTile } from '@/components/site/NumberTileGrid'
import { boysRegionOfDistrict, girlsRegionOfDistrict, type TileColors } from '@/lib/siteTheme'

// each page's summary line, editable in the tool
export const SUMMARY_DEFAULTS = {
  schedule: 'Dual meets and tournaments by date',
  standings: 'NJSIAA power points and records',
  leaderboards: 'Season leaders by category',
  tournaments: 'In-season tournaments and their winners',
  'ps-team': 'Team tournament brackets by section and group',
  'ps-individual': 'State champions, podium schools, point leaders, and every bracket',
  region: 'Brackets, placewinners and team scores',
  district: 'Brackets, placewinners and team scores',
  state: 'Boardwalk Hall · double elimination',
  h2h: 'Compare two wrestlers',
  about: 'How the site works',
}
export type SummaryKey = keyof typeof SUMMARY_DEFAULTS

export type MockLook = {
  fontFamily: string
  titleFontFamily?: string
  titleSize?: number
  summaries: Record<SummaryKey, string>
  size: number
  radius: number
  border: string
  showLogo: boolean
  headerLayout: 'live' | 'proposed'   // proposed: hamburger left of the logo, Boys / Girls left of the search
  boysTile: (region: number) => TileColors
  girlsTile: (region: number) => TileColors
}

type Page = 'schedule' | 'standings' | 'leaderboards' | 'tournaments' | 'ps-team' | 'ps-individual' | 'region' | 'district' | 'state' | 'h2h' | 'about'
// as in HeaderNav: Standings opens on click and has a Group / Conference menu; Post Season is menu only
const NAV: { key: Page | 'postseason'; label: string; menuOnly?: boolean; menu?: { key: Page; label: string; view?: string }[] }[] = [
  { key: 'schedule', label: 'Scores' },
  { key: 'standings', label: 'Standings', menu: [{ key: 'standings', label: 'Group', view: 'group' }, { key: 'standings', label: 'Conference', view: 'conference' }] },
  { key: 'leaderboards', label: 'Leaders' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'postseason', label: 'Post Season', menuOnly: true, menu: [{ key: 'ps-team', label: 'Team' }, { key: 'ps-individual', label: 'Individual' }] },
  { key: 'h2h', label: 'H2H' },
  { key: 'about', label: 'About' },
]
// the live team bracket's group tabs (TeamBracketClient.tsx)
const TEAM_GROUPS = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Non-Public']
const BOYS_WEIGHTS = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const GIRLS_WEIGHTS = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]

// sample-content building blocks, in the site table standard (px-3 py-1)
function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto border border-black">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{cols.map(c => <th key={c} className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>{r.map((c, j) => <td key={j} className="px-3 py-1 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}
const Section = ({ title, children, center = false }: { title: string; children: ReactNode; center?: boolean }) => (
  <section className="mt-8"><h2 className={`mb-3 text-lg font-bold text-slate-900 ${center ? 'text-center' : ''}`}>{title}</h2>{children}</section>
)
const SeasonPick = () => (
  <select className="bg-amber-50 border border-amber-300 font-semibold text-amber-800 text-sm py-0.5 pl-2 pr-2"><option>Current season</option><option>Previous season</option></select>
)

// On the Podium as a table: click a school to see its placers (weight, wrestler, place)
const PODIUM: { school: string; placers: [number, string, string][] }[] = [
  { school: 'St Joseph Regional', placers: [[113, 'Charles Esposito', '1st'], [120, 'Johnathon McGinty', '1st'], [285, 'Cristian Alvarez', '2nd'], [138, 'Adrian DeJesus', '3rd']] },
  { school: 'Bergen Catholic', placers: [[157, 'Gideon Gonzalez', '1st'], [165, 'Manny Gusfa', '4th'], [190, 'Ralphie Barca', '6th']] },
  { school: 'Delbarton', placers: [[106, 'Peter Terranova', '5th'], [120, 'Tommy Marchetti', '7th']] },
]
function PodiumTable() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <div className="overflow-x-auto border border-black">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{['#', 'School', 'Placers'].map(c => <th key={c} className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide">{c}</th>)}</tr></thead>
        <tbody>
          {PODIUM.map((p, i) => (
            <Fragment key={p.school}>
              <tr className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                <td className="px-3 py-1">{i + 1}</td>
                <td className="px-3 py-1">
                  <button onClick={() => setOpen(o => (o === p.school ? null : p.school))} className="font-semibold text-slate-900 hover:underline">
                    {p.school} <span className="text-slate-400">{open === p.school ? '▴' : '▾'}</span>
                  </button>
                </td>
                <td className="px-3 py-1">{p.placers.length}</td>
              </tr>
              {open === p.school && (
                <tr><td colSpan={3} className="bg-slate-100 px-6 py-2">
                  <table className="text-[12px]"><thead><tr className="text-slate-500">{['Wt', 'Wrestler', 'Place'].map(c => <th key={c} className="px-3 py-0.5 text-left font-semibold">{c}</th>)}</tr></thead>
                    <tbody>{p.placers.map(([w, n, pl]) => <tr key={w}><td className="px-3 py-0.5">{w}</td><td className="px-3 py-0.5">{n}</td><td className="px-3 py-0.5">{pl}</td></tr>)}</tbody></table>
                </td></tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// the region / district switcher: the live pill buttons
function Pills({ items, active, onPick }: { items: { key: number; label: string }[]; active: number; onPick: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(it => (
        <button key={it.key} onClick={() => onPick(it.key)}
          className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${it.key === active ? 'bg-slate-800 text-white' : 'bg-white border border-black text-slate-700 hover:bg-slate-50 hover:border-slate-400'}`}>
          {it.label}
        </button>
      ))}
    </div>
  )
}

// Leaderboard "Filter by": the live box and checklists, but each list is a dropdown that starts at
// All and shows what's picked under its label. Conference, or Section + Group: picking one side turns
// the other off (Kyle, 2026-11-06).
const F_CONFS = ['Big North', 'NJIC', 'Super Essex', 'Union County', 'Skyland', 'Shore', 'Colonial Valley', 'Cape-Atlantic']
const F_SECS = ['North I', 'North II', 'Central', 'South']
const F_GROUPS = ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5', 'Non-Public A', 'Non-Public B']
function FilterDrop({ label, options, picked, setPicked, disabled, open, setOpen }: {
  label: string; options: string[]; picked: Set<string>; setPicked: (v: Set<string>) => void; disabled: boolean; open: boolean; setOpen: (v: boolean) => void
}) {
  const shown = picked.size === 0 ? 'All' : [...picked].join(', ')
  return (
    <div className={`flex-1 min-w-[160px] ${disabled ? 'opacity-40' : ''}`}>
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="mb-1 truncate text-xs font-semibold text-slate-800" title={shown}>{disabled ? 'Off' : shown}</div>
      <button type="button" disabled={disabled} onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:cursor-not-allowed">
        <span>{picked.size === 0 ? 'All' : `${picked.size} selected`}</span><span className="text-slate-400">{open ? '▴' : '▾'}</span>
      </button>
      {open && !disabled && (
        <div className="border border-t-0 border-slate-200 bg-white max-h-40 overflow-y-auto divide-y divide-slate-100">
          {options.map(o => (
            <label key={o} className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer">
              <input type="checkbox" checked={picked.has(o)} className="accent-slate-800 shrink-0"
                onChange={() => { const n = new Set(picked); if (n.has(o)) n.delete(o); else n.add(o); setPicked(n) }} />
              <span className="text-xs text-slate-700">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
function MockLbFilters() {
  const [c, setC] = useState<Set<string>>(new Set())
  const [sec, setSec] = useState<Set<string>>(new Set())
  const [g, setG] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const confOn = c.size > 0, sgOn = sec.size > 0 || g.size > 0
  const filtered = confOn || sgOn
  return (
    <div className="border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter by</span>
        {filtered && <button onClick={() => { setC(new Set()); setSec(new Set()); setG(new Set()); setOpen(null) }} className="text-xs text-slate-400 hover:text-slate-700 underline">Reset — show all</button>}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <FilterDrop label="Conference" options={F_CONFS} picked={c} setPicked={setC} disabled={sgOn} open={open === 'c'} setOpen={v => setOpen(v ? 'c' : null)} />
        <FilterDrop label="Section" options={F_SECS} picked={sec} setPicked={setSec} disabled={confOn} open={open === 's'} setOpen={v => setOpen(v ? 's' : null)} />
        <FilterDrop label="Group" options={F_GROUPS} picked={g} setPicked={setG} disabled={confOn} open={open === 'g'} setOpen={v => setOpen(v ? 'g' : null)} />
      </div>
    </div>
  )
}

// Schedule controls: the live box (date, then filters, My Schools, Clear), but Conference, Group and
// Section are three dropdowns instead of checkboxes that open lists. Conference alone; Group and Section
// can be used together (Kyle, 2026-11-06).
function MockScheduleControls() {
  const [c, setC] = useState<Set<string>>(new Set())
  const [g, setG] = useState<Set<string>>(new Set())
  const [sec, setSec] = useState<Set<string>>(new Set())
  const [open, setOpen] = useState<string | null>(null)
  const confOn = c.size > 0, sgOn = sec.size > 0 || g.size > 0
  return (
    <div className="border border-slate-200 bg-slate-50 p-4 mb-6 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <input type="date" className="border border-black px-3 py-2 text-sm rounded-none shrink-0" />
        <FilterDrop label="Conference" options={F_CONFS} picked={c} setPicked={setC} disabled={sgOn} open={open === 'c'} setOpen={v => setOpen(v ? 'c' : null)} />
        <FilterDrop label="Group" options={F_GROUPS} picked={g} setPicked={setG} disabled={confOn} open={open === 'g'} setOpen={v => setOpen(v ? 'g' : null)} />
        <FilterDrop label="Section" options={F_SECS} picked={sec} setPicked={setSec} disabled={confOn} open={open === 's'} setOpen={v => setOpen(v ? 's' : null)} />
      </div>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2"><input type="checkbox" className="accent-slate-800" /><span className="text-sm font-medium text-slate-700">My Schools</span></label>
        {(confOn || sgOn) && <button onClick={() => { setC(new Set()); setG(new Set()); setSec(new Set()); setOpen(null) }} className="text-xs text-slate-400 hover:text-slate-700 underline ml-auto">Clear — show all NJSIAA</button>}
      </div>
    </div>
  )
}

// sortable table (the leaderboard keeps click-to-sort headers): numbers sort high to low first
function SortTable({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  const [sort, setSort] = useState<{ i: number; desc: boolean }>({ i: cols.length - 1, desc: true })
  const sorted = [...rows].sort((a, b) => { const x = a[sort.i], y = b[sort.i]; const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y)); return sort.desc ? -d : d })
  return (
    <div className="overflow-x-auto border border-black">
      <table className="w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">
          <th className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide">#</th>
          {cols.map((c, i) => (
            <th key={c} className="px-3 py-1 text-left text-xs font-bold uppercase tracking-wide whitespace-nowrap">
              <button onClick={() => setSort(p => ({ i, desc: p.i === i ? !p.desc : true }))} className="uppercase hover:underline">{c}{sort.i === i ? (sort.desc ? ' ▾' : ' ▴') : ''}</button>
            </th>
          ))}
        </tr></thead>
        <tbody>{sorted.map((r, k) => <tr key={k} className={k % 2 ? 'bg-slate-50' : 'bg-white'}><td className="px-3 py-1">{k + 1}</td>{r.map((c, j) => <td key={j} className="px-3 py-1 whitespace-nowrap">{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

const TOURNAMENTS: Record<string, (string | number)[][]> = {
  December: [['12/19', 'Beast of the East', 'Univ. of Delaware', 64, 'Bergen Catholic'], ['12/27', 'Sam Cali Invitational', 'Brick', 24, 'Southern Regional'], ['12/29', 'Escape the Rock', 'Mount Olive', 32, 'Phillipsburg']],
  January: [['1/3', 'Holiday Classic', 'Pope John', 16, 'Delbarton'], ['1/10', 'Morris County', 'Morristown', 18, 'Delbarton'], ['1/17', 'Sussex County', 'High Point', 12, 'Kittatinny']],
  February: [['2/7', 'Hunterdon County', 'Hunterdon Central', 10, 'Hunterdon Central'], ['2/14', 'Bergen County', 'Ridgewood', 30, 'Bergen Catholic']],
}

export function MockSite({ look }: { look: MockLook }) {
  const [page, setPage] = useState<Page>('ps-individual')
  const [girls, setGirls] = useState(false)
  const [menu, setMenu] = useState<string | null>(null)
  const [standView, setStandView] = useState('group')
  const [lbSide, setLbSide] = useState('individual')
  const [lbCat, setLbCat] = useState('wins')
  const [month, setMonth] = useState('December')
  const [regionNum, setRegionNum] = useState(2)
  const [districtNum, setDistrictNum] = useState(5)
  const [teamGroup, setTeamGroup] = useState('')
  const [teamSection, setTeamSection] = useState('')
  const P = girls ? 'Girls' : 'Boys'
  const tile = (r: number) => (girls ? look.girlsTile(r) : look.boysTile(r))
  const accent = tile(girls ? 3 : 7)          // weight, conference and State buttons: boys region 7, girls region 3
  const nRegions = girls ? 4 : 8, nDistricts = girls ? 12 : 32
  const regionOfDistrict = girls ? girlsRegionOfDistrict : boysRegionOfDistrict
  const weights = girls ? GIRLS_WEIGHTS : BOYS_WEIGHTS
  const grid = (tiles: NumberTile[], scale = 1, opts: { minWidth?: number; groupSize?: number; center?: boolean } = {}) => (
    <NumberTileGrid tiles={tiles} fontFamily={look.fontFamily} size={Math.round(look.size * scale)} radius={look.radius} border={look.border}
      minWidth={opts.minWidth ?? Math.round(look.size * scale)} groupSize={opts.groupSize} center={opts.center} />
  )
  const regionTiles: NumberTile[] = Array.from({ length: nRegions }, (_, i) => ({ key: i + 1, label: String(i + 1), ...tile(i + 1), onClick: () => { setRegionNum(i + 1); setPage('region') } }))
  const districtTiles: NumberTile[] = Array.from({ length: nDistricts }, (_, i) => ({ key: i + 1, label: String(i + 1), ...tile(regionOfDistrict(i + 1)), onClick: () => { setDistrictNum(i + 1); setPage('district') } }))
  const weightTiles: NumberTile[] = weights.map(w => ({ key: w, label: String(w), ...accent }))
  const sections = girls ? ['North', 'South', 'Non-Team'] : ['North I', 'North II', 'Central', 'South']
  const standTiles: NumberTile[] = standView === 'group'
    ? sections.flatMap((sec, si) => (girls ? [''] : ['G1', 'G2', 'G3', 'G4', 'G5']).map(g => ({ key: `${sec}${g}`, label: g ? `${sec} ${g}` : sec, ...tile(si + 1) })))
    : ['Big North', 'NJIC', 'Super Essex', 'Union County', 'Skyland', 'Shore', 'Colonial Valley', 'Cape-Atlantic'].map(c => ({ key: c, label: c, ...accent }))
  // pages that span seasons (Head to Head) have no season picker
  const header = (title: string, key: SummaryKey, tabs?: ReactNode, noPicker = false) => (
    <SitePageHeader title={title} picker={noPicker ? undefined : <SeasonPick />} summary={look.summaries[key]} tabs={tabs} showLogo={look.showLogo} titleFontFamily={look.titleFontFamily} titleSize={look.titleSize} />
  )
  const cats = lbSide === 'team'
    ? [['wins', 'Dual Wins'], ['pp', 'Power Points'], ['bonus', 'Bonus %']]
    : [['wins', 'Wins'], ['pins', 'Pins'], ['tf', 'Tech Falls'], ['bonus', 'Bonus %'], ['fast', 'Fastest Pin']]

  const body: Record<Page, ReactNode> = {
    schedule: <>
      {header(`${P} Scores`, 'schedule')}
      <MockScheduleControls />
      <div className="overflow-x-auto border border-black">
        <table className="w-full text-[13px]">
          <tbody>
            <tr className="border-t border-slate-200 bg-slate-100"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Post Season Tournaments — 1</td></tr>
            <tr className="bg-white"><td className="px-3 py-1">All day</td><td className="px-3 py-1">District 7</td><td className="px-3 py-1">Ridgefield Park</td></tr>
            <tr className="border-t border-slate-200 bg-slate-100"><td colSpan={3} className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-slate-500">Dual Meets — 2</td></tr>
            <tr className="bg-white"><td className="px-3 py-1">10:00</td><td className="px-3 py-1">Bergen Catholic 42 — 21 Delbarton</td><td className="px-3 py-1">Final</td></tr>
            <tr className="bg-slate-50"><td className="px-3 py-1">11:30</td><td className="px-3 py-1">Phillipsburg vs Hunterdon Central</td><td className="px-3 py-1">7:00 PM</td></tr>
          </tbody>
        </table>
      </div>
    </>,
    standings: <>
      {header(`${P} Standings`, 'standings',
        <SiteTabs items={[['group', 'Group'], ['conference', 'Conference']].map(([k, l]) => ({ key: k, label: l, onClick: () => setStandView(k) }))} active={standView} />)}
      {grid(standTiles, 0.7, { minWidth: 120 })}
      <Section title={standView === 'group' ? (girls ? 'North' : 'North I Group 5') : 'Big North'}><Table cols={['#', 'School', 'W-L', 'PP']} rows={[[1, 'Phillipsburg', '18-2', '64.2'], [2, 'Hunterdon Central', '15-4', '58.9'], [3, 'Ridgewood', '14-6', '55.1']]} /></Section>
    </>,
    leaderboards: <>
      {header(`${P} Leaders`, 'leaderboards',
        <>
          <SiteTabs items={[['team', 'Team'], ['individual', 'Individual']].map(([k, l]) => ({ key: k, label: l, onClick: () => { setLbSide(k); setLbCat('wins') } }))} active={lbSide} />
          <SiteTabs level={2} items={cats.map(([k, l]) => ({ key: k, label: l, onClick: () => setLbCat(k) }))} active={lbCat} />
        </>)}
      <div className="mt-3"><MockLbFilters /></div>
      <div className="pt-3">
        {lbSide === 'team'
          ? <SortTable cols={['School', 'W-L', 'PP']} rows={[['Bergen Catholic', '18-0', 64.2], ['St Joseph Regional', '16-2', 61.9], ['Delbarton', '15-3', 58.0]]} />
          : <SortTable cols={['Wrestler', 'School', 'Wt', 'W']} rows={[['Cristian Alvarez', 'St Joseph Regional', 285, 40], ['Nick Clayton', 'High Point', 150, 38], ['Luke Geleta', 'Phillipsburg', 144, 37]]} />}
      </div>
    </>,
    tournaments: <>
      {header(`${P} Tournaments`, 'tournaments',
        <SiteTabs items={Object.keys(TOURNAMENTS).map(m => ({ key: m, label: m, onClick: () => setMonth(m) }))} active={month} />)}
      <div className="pt-2"><Table cols={['Date', 'Tournament', 'Host', 'Teams', 'Winner']} rows={TOURNAMENTS[month]} /></div>
    </>,
    'ps-team': <>
      {header(`${P} Team Post Season`, 'ps-team',
        <>
          {!girls && <SiteTabs items={TEAM_GROUPS.map(g => ({ key: g, label: g, onClick: () => { setTeamGroup(t => (t === g ? '' : g)); setTeamSection('') } }))} active={teamGroup} />}
          <SiteTabs level={girls ? 1 : 2} items={(girls ? ['North', 'South'] : teamGroup === 'Non-Public' ? ['A', 'B'] : sections).map(sec => ({ key: sec, label: sec, onClick: () => setTeamSection(t => (t === sec ? '' : sec)) }))} active={teamSection} />
        </>)}
      <p className="text-xs text-slate-500">Click a {girls ? 'section' : 'group, a section, or one of each'} (click again to clear). Showing: <span className="font-semibold text-slate-800">{[girls ? '' : teamGroup, teamSection].filter(Boolean).join(' · ') || 'everything'}</span></p>
      <Section title={[girls ? '' : teamGroup, teamSection].filter(Boolean).join(' · ') || 'All brackets'}><Table cols={['Seed', 'School', 'Rd 1', 'Semi', 'Final']} rows={[[1, 'Phillipsburg', 'W 42-21', 'W 35-30', 'W 31-28'], [2, 'Hunterdon Central', 'W 50-12', 'W 33-27', 'L 28-31']]} /></Section>
    </>,
    'ps-individual': <>
      {header(`${P} Individual Post Season`, 'ps-individual')}
      {/* the tournament buttons first (Kyle), then the live order */}
      <section>{grid([{ key: 'state', label: `${P} State Tournament →`, ...accent, onClick: () => setPage('state') }], 0.8, { minWidth: 280, center: true })}</section>
      <Section title="Regions" center>{grid(regionTiles, 1, { groupSize: 4, center: true })}</Section>
      <Section title="Districts" center>{grid(districtTiles, 0.75, { groupSize: girls ? 3 : 4, center: true })}</Section>
      <Section title="State Champions"><Table cols={['Wt', 'Wrestler', 'School']} rows={[[106, 'Thomas Blewett, Jr', 'Middletown North'], [113, 'Charles Esposito, Sr', 'St Joseph Regional'], [120, 'Johnathon McGinty, Sr', 'St Joseph Regional']]} /></Section>
      <Section title="On the Podium"><p className="mb-3 text-xs text-slate-500">Schools ranked by wrestlers finishing 1st–8th at States. Click a school for its placers.</p><PodiumTable /></Section>
      <Section title="Team Point Leaders"><Table cols={['#', 'School', 'Dist', 'Reg', 'State', 'Total']} rows={[[1, 'Bergen Catholic', 345.5, 210, 168, 723.5], [2, 'Delbarton', 290, 198, 120, 608]]} /></Section>
    </>,
    region: <>
      {header(`${P} Region ${regionNum}`, 'region')}
      <Pills items={Array.from({ length: nRegions }, (_, i) => ({ key: i + 1, label: `R${i + 1}` }))} active={regionNum} onPick={setRegionNum} />
      <div className="mt-6">{grid(weightTiles, 0.7)}</div>
      <Section title="Team Scores"><Table cols={['#', 'School', 'Points']} rows={[[1, 'St Joseph Regional', 250], [2, 'Bergen Catholic', 214.5], [3, 'Delbarton', 160]]} /></Section>
    </>,
    district: <>
      {header(`${P} District ${districtNum}`, 'district')}
      <Pills items={Array.from({ length: nDistricts }, (_, i) => ({ key: i + 1, label: `D${i + 1}` }))} active={districtNum} onPick={setDistrictNum} />
      <div className="mt-6">{grid(weightTiles, 0.7)}</div>
      <Section title="Team Scores"><Table cols={['#', 'School', 'Points']} rows={[[1, 'Phillipsburg', 258], [2, 'Hunterdon Central', 201], [3, 'Voorhees', 140]]} /></Section>
    </>,
    state: <>
      {header(`${P} State Tournament`, 'state')}
      {grid(weightTiles, 0.7)}
      <Section title="On the Podium"><PodiumTable /></Section>
      <Section title="State Placewinners"><Table cols={['Wt', 'Champion', 'Runner-up', '3rd', '4th']} rows={[[106, 'Blewett', 'Burke', 'Ruane', 'Daly'], [113, 'Esposito', 'Szamreta', 'Sipper', 'Reyes']]} /></Section>
    </>,
    h2h: <>
      {header(`${P} Head to Head`, 'h2h', undefined, true)}
      <div className="grid gap-3 sm:grid-cols-2">{['Wrestler 1', 'Wrestler 2'].map(p => <input key={p} placeholder={p} className="border border-slate-300 px-3 py-2 text-sm" />)}</div>
      <Section title="Common Opponents"><Table cols={['Opponent', 'Wrestler 1', 'Wrestler 2']} rows={[['Nick Clayton', 'W Dec 7-6', 'L MD 13-4'], ['Luke Geleta', 'L Fall 3:10', 'W Dec 2-1']]} /></Section>
    </>,
    about: <>
      {header('About Mat Whizzer', 'about', <SiteTabs items={['Summary', 'Q&A', 'Rules'].map(k => ({ key: k, label: k }))} active="Summary" />)}
      <div className="space-y-3 text-sm text-slate-700 max-w-2xl"><p>Mat Whizzer covers NJSIAA wrestling: duals, tournaments, the postseason and ratings for every wrestler.</p><p>Each section below explains where the numbers come from.</p></div>
    </>,
  }

  const proposed = look.headerLayout === 'proposed'
  const hamburger = (
    <button className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors px-2 py-1 rounded-none hover:bg-white/10">
      <span className="w-7 h-7 rounded-none bg-white/20 flex items-center justify-center">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </span>
      {!proposed && <span className="hidden sm:inline text-sm">admin</span>}
    </button>
  )
  const genderToggle = (
    <div className="flex border border-white/30 flex-shrink-0">
      <button onClick={() => { setGirls(false); setRegionNum(1); setDistrictNum(1) }} className={`px-4 py-1 text-xs font-bold tracking-wide transition-colors ${!girls ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Boys</button>
      <button onClick={() => { setGirls(true); setRegionNum(1); setDistrictNum(1) }} className={`px-4 py-1 text-xs font-bold tracking-wide transition-colors border-l border-white/30 ${girls ? 'bg-rose-200 text-rose-900' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>Girls</button>
    </div>
  )

  return (
    <div className="border border-black">
      {/* the public header, copied from src/components/HeaderNav.tsx (logo + account menu, nav row with the
          Boys / Girls toggle at the right, search row). Not part of the redesign: it stays as live. */}
      <header className={girls ? 'bg-rose-900' : 'bg-slate-900'}>
        <div className={`px-4 py-2 flex items-center border-b border-black/30 ${proposed ? 'gap-2' : 'justify-between'}`}>
          {proposed && hamburger}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Mat Whizzer Header Logo.png" alt="Mat Whizzer" className="h-10 w-auto" />
          {!proposed && hamburger}
        </div>
        <div className={`${girls ? 'bg-rose-800' : 'bg-slate-800'} border-b border-black overflow-x-auto sm:overflow-visible`}>
          <div className="flex items-center gap-0.5 px-3 py-1.5 whitespace-nowrap min-w-max w-full">
            {NAV.map(n => {
              const active = n.key === 'postseason' ? ['ps-team', 'ps-individual', 'region', 'district', 'state'].includes(page) : page === n.key
              const cls = `px-3 py-1 text-sm transition-colors rounded-none ${active ? 'text-white font-semibold underline underline-offset-4' : 'text-white/70 hover:text-white hover:bg-white/10'}`
              if (!n.menu) return <button key={n.key} onClick={() => { setPage(n.key as Page); setMenu(null) }} className={cls}>{n.label}</button>
              return (
                <div key={n.key} className="relative" onMouseEnter={() => setMenu(n.key)} onMouseLeave={() => setMenu(null)}>
                  <button onClick={() => (n.menuOnly ? setMenu(m => (m === n.key ? null : n.key)) : (setPage(n.key as Page), setMenu(null)))} className={cls}>
                    {n.label}{n.menuOnly && <> <span className="text-[10px]">▾</span></>}
                  </button>
                  {menu === n.key && (
                    <div className="absolute left-0 top-full pt-1.5 z-50">
                      <div className={`w-44 rounded-none border border-black overflow-hidden ${girls ? 'bg-rose-800 border-rose-700' : 'bg-slate-800 border-slate-700'}`}>
                        {n.menu.map(m => <button key={m.label} onClick={() => { setPage(m.key); if (m.view) setStandView(m.view); setMenu(null) }} className={`block w-full text-left px-4 py-2 text-sm text-slate-100 ${girls ? 'hover:bg-rose-700' : 'hover:bg-slate-700'} hover:text-white transition-colors`}>{m.label}</button>)}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {!proposed && <div className="ml-auto">{genderToggle}</div>}
          </div>
        </div>
        <div className={`${girls ? 'bg-rose-800' : 'bg-slate-800'} border-b border-black/60`}>
          <div className={`px-4 py-1 ${proposed ? 'flex items-center gap-2' : ''}`}>
            {proposed && genderToggle}
            <div className={`relative ${proposed ? 'min-w-0 flex-1 max-w-lg' : 'w-full max-w-lg'}`}>
              <input type="text" placeholder="Search wrestlers or schools…" autoComplete="off" className="w-full border border-slate-300 rounded-none px-4 py-1.5 text-sm shadow-none bg-white text-slate-900 placeholder-slate-400" />
            </div>
          </div>
        </div>
      </header>
      <div className="bg-white px-4 sm:px-8 py-8">{body[page]}</div>
    </div>
  )
}
