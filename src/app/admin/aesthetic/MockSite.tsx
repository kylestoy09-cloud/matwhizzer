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

export type MockLook = {
  fontFamily: string
  titleFontFamily?: string
  size: number
  radius: number
  border: string
  showLogo: boolean
  boysTile: (region: number) => TileColors
  girlsTile: (region: number) => TileColors
}

type Page = 'schedule' | 'standings' | 'leaderboards' | 'tournaments' | 'ps-team' | 'ps-individual' | 'region' | 'district' | 'state' | 'h2h' | 'about'
const NAV: { key: Page | 'postseason'; label: string; menu?: { key: Page; label: string }[] }[] = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'standings', label: 'Standings' },
  { key: 'leaderboards', label: 'Leaderboards' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'postseason', label: 'Post Season', menu: [{ key: 'ps-team', label: 'Team' }, { key: 'ps-individual', label: 'Individual' }] },
  { key: 'h2h', label: 'H2H' },
  { key: 'about', label: 'About' },
]
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

const TOURNAMENTS: Record<string, (string | number)[][]> = {
  December: [['12/19', 'Beast of the East', 'Univ. of Delaware', 64, 'Bergen Catholic'], ['12/27', 'Sam Cali Invitational', 'Brick', 24, 'Southern Regional'], ['12/29', 'Escape the Rock', 'Mount Olive', 32, 'Phillipsburg']],
  January: [['1/3', 'Holiday Classic', 'Pope John', 16, 'Delbarton'], ['1/10', 'Morris County', 'Morristown', 18, 'Delbarton'], ['1/17', 'Sussex County', 'High Point', 12, 'Kittatinny']],
  February: [['2/7', 'Hunterdon County', 'Hunterdon Central', 10, 'Hunterdon Central'], ['2/14', 'Bergen County', 'Ridgewood', 30, 'Bergen Catholic']],
}

export function MockSite({ look }: { look: MockLook }) {
  const [page, setPage] = useState<Page>('ps-individual')
  const [girls, setGirls] = useState(false)
  const [menu, setMenu] = useState(false)
  const [standView, setStandView] = useState('group')
  const [lbSide, setLbSide] = useState('individual')
  const [lbCat, setLbCat] = useState('wins')
  const [month, setMonth] = useState('December')
  const [regionNum, setRegionNum] = useState(2)
  const [districtNum, setDistrictNum] = useState(5)
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
  const header = (title: string, summary: ReactNode, tabs?: ReactNode) => (
    <SitePageHeader title={title} picker={<SeasonPick />} summary={summary} tabs={tabs} showLogo={look.showLogo} titleFontFamily={look.titleFontFamily} />
  )
  const cats = lbSide === 'team'
    ? [['wins', 'Dual Wins'], ['pp', 'Power Points'], ['bonus', 'Bonus %']]
    : [['wins', 'Wins'], ['pins', 'Pins'], ['tf', 'Tech Falls'], ['bonus', 'Bonus %'], ['fast', 'Fastest Pin']]

  const body: Record<Page, ReactNode> = {
    schedule: (
      <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">The Schedule keeps its current page.</p>
        <p className="mt-1">Calendars work differently, so it stays as it is on the live site.</p>
      </div>
    ),
    standings: <>
      {header(`${P} Standings`, 'NJSIAA power points and records',
        <SiteTabs items={[['group', 'Group'], ['conference', 'Conference']].map(([k, l]) => ({ key: k, label: l, onClick: () => setStandView(k) }))} active={standView} />)}
      {grid(standTiles, 0.7, { minWidth: 120 })}
      <Section title={standView === 'group' ? (girls ? 'North' : 'North I Group 5') : 'Big North'}><Table cols={['#', 'School', 'W-L', 'PP']} rows={[[1, 'Phillipsburg', '18-2', '64.2'], [2, 'Hunterdon Central', '15-4', '58.9'], [3, 'Ridgewood', '14-6', '55.1']]} /></Section>
    </>,
    leaderboards: <>
      {header(`${P} Leaderboards`, 'Season leaders by category',
        <>
          <SiteTabs items={[['team', 'Team'], ['individual', 'Individual']].map(([k, l]) => ({ key: k, label: l, onClick: () => { setLbSide(k); setLbCat('wins') } }))} active={lbSide} />
          <SiteTabs level={2} items={cats.map(([k, l]) => ({ key: k, label: l, onClick: () => setLbCat(k) }))} active={lbCat} />
        </>)}
      <div className="pt-2">
        {lbSide === 'team'
          ? <Table cols={['#', 'School', 'W-L', 'PP']} rows={[[1, 'Bergen Catholic', '18-0', '64.2'], [2, 'St Joseph Regional', '16-2', '61.9'], [3, 'Delbarton', '15-3', '58.0']]} />
          : <Table cols={['#', 'Wrestler', 'School', 'Wt', 'W']} rows={[[1, 'Cristian Alvarez', 'St Joseph Regional', 285, 40], [2, 'Nick Clayton', 'High Point', 150, 38], [3, 'Luke Geleta', 'Phillipsburg', 144, 37]]} />}
      </div>
    </>,
    tournaments: <>
      {header(`${P} Tournaments`, 'In-season tournaments and their winners',
        <SiteTabs items={Object.keys(TOURNAMENTS).map(m => ({ key: m, label: m, onClick: () => setMonth(m) }))} active={month} />)}
      <div className="pt-2"><Table cols={['Date', 'Tournament', 'Host', 'Teams', 'Winner']} rows={TOURNAMENTS[month]} /></div>
    </>,
    'ps-team': <>
      {header(`${P} Team Post Season`, 'Team tournament brackets by section and group',
        <SiteTabs items={sections.map(s => ({ key: s, label: s }))} active={sections[0]} />)}
      {grid(girls ? [{ key: 'b', label: 'Bracket', ...accent }] : ['G1', 'G2', 'G3', 'G4', 'G5'].map(g => ({ key: g, label: g, ...accent })), 0.8, { minWidth: 90 })}
      <Section title={girls ? 'North' : 'North I Group 5'}><Table cols={['Seed', 'School', 'Rd 1', 'Semi', 'Final']} rows={[[1, 'Phillipsburg', 'W 42-21', 'W 35-30', 'W 31-28'], [2, 'Hunterdon Central', 'W 50-12', 'W 33-27', 'L 28-31']]} /></Section>
    </>,
    'ps-individual': <>
      {header(`${P} Individual Post Season`, 'State champions, podium schools, point leaders, and every bracket')}
      <Section title="State Champions"><Table cols={['Wt', 'Wrestler', 'School']} rows={[[106, 'Thomas Blewett, Jr', 'Middletown North'], [113, 'Charles Esposito, Sr', 'St Joseph Regional'], [120, 'Johnathon McGinty, Sr', 'St Joseph Regional']]} /></Section>
      <Section title="On the Podium"><p className="mb-3 text-xs text-slate-500">Schools ranked by wrestlers finishing 1st–8th at States. Click a school for its placers.</p><PodiumTable /></Section>
      <Section title="Team Point Leaders"><Table cols={['#', 'School', 'Dist', 'Reg', 'State', 'Total']} rows={[[1, 'Bergen Catholic', 345.5, 210, 168, 723.5], [2, 'Delbarton', 290, 198, 120, 608]]} /></Section>
      <section className="mt-8">{grid([{ key: 'state', label: `${P} State Tournament →`, ...accent, onClick: () => setPage('state') }], 0.8, { minWidth: 280, center: true })}</section>
      <Section title="Regions" center>{grid(regionTiles, 1, { groupSize: 4, center: true })}</Section>
      <Section title="Districts" center>{grid(districtTiles, 0.75, { groupSize: girls ? 3 : 4, center: true })}</Section>
    </>,
    region: <>
      {header(`${P} Region ${regionNum}`, 'Brackets, placewinners and team scores')}
      <Pills items={Array.from({ length: nRegions }, (_, i) => ({ key: i + 1, label: `R${i + 1}` }))} active={regionNum} onPick={setRegionNum} />
      <div className="mt-6">{grid(weightTiles, 0.7)}</div>
      <Section title="Team Scores"><Table cols={['#', 'School', 'Points']} rows={[[1, 'St Joseph Regional', 250], [2, 'Bergen Catholic', 214.5], [3, 'Delbarton', 160]]} /></Section>
    </>,
    district: <>
      {header(`${P} District ${districtNum}`, 'Brackets, placewinners and team scores')}
      <Pills items={Array.from({ length: nDistricts }, (_, i) => ({ key: i + 1, label: `D${i + 1}` }))} active={districtNum} onPick={setDistrictNum} />
      <div className="mt-6">{grid(weightTiles, 0.7)}</div>
      <Section title="Team Scores"><Table cols={['#', 'School', 'Points']} rows={[[1, 'Phillipsburg', 258], [2, 'Hunterdon Central', 201], [3, 'Voorhees', 140]]} /></Section>
    </>,
    state: <>
      {header(`${P} State Tournament`, 'Boardwalk Hall · double elimination')}
      {grid(weightTiles, 0.7)}
      <Section title="On the Podium"><PodiumTable /></Section>
      <Section title="State Placewinners"><Table cols={['Wt', 'Champion', 'Runner-up', '3rd', '4th']} rows={[[106, 'Blewett', 'Burke', 'Ruane', 'Daly'], [113, 'Esposito', 'Szamreta', 'Sipper', 'Reyes']]} /></Section>
    </>,
    h2h: <>
      {header(`${P} Head to Head`, 'Compare two wrestlers')}
      <div className="grid gap-3 sm:grid-cols-2">{['Wrestler 1', 'Wrestler 2'].map(p => <input key={p} placeholder={p} className="border border-slate-300 px-3 py-2 text-sm" />)}</div>
      <Section title="Common Opponents"><Table cols={['Opponent', 'Wrestler 1', 'Wrestler 2']} rows={[['Nick Clayton', 'W Dec 7-6', 'L MD 13-4'], ['Luke Geleta', 'L Fall 3:10', 'W Dec 2-1']]} /></Section>
    </>,
    about: <>
      {header('About Mat Whizzer', 'How the site works', <SiteTabs items={['Summary', 'Q&A', 'Rules'].map(k => ({ key: k, label: k }))} active="Summary" />)}
      <div className="space-y-3 text-sm text-slate-700 max-w-2xl"><p>Mat Whizzer covers NJSIAA wrestling: duals, tournaments, the postseason and ratings for every wrestler.</p><p>Each section below explains where the numbers come from.</p></div>
    </>,
  }

  return (
    <div className="border border-black">
      {/* mock of the public top nav */}
      <nav className={`${girls ? 'bg-rose-900' : 'bg-slate-900'} text-white`}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/Mat Whizzer Header Logo.png" alt="Mat Whizzer" className="h-7 w-auto" />
          <span className="inline-flex border border-white/30">
            {['Boys', 'Girls'].map(g => <button key={g} onClick={() => { setGirls(g === 'Girls'); setRegionNum(1); setDistrictNum(1) }} className={`px-3 py-0.5 text-xs font-semibold ${(g === 'Girls') === girls ? 'bg-white text-slate-900' : 'text-white'}`}>{g}</button>)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 text-sm">
          {NAV.map(n => n.menu ? (
            <div key={n.key} className="relative">
              <button onClick={() => setMenu(m => !m)} className={`px-2 py-1 hover:bg-white/10 ${['ps-team', 'ps-individual', 'region', 'district', 'state'].includes(page) ? 'bg-white/15' : ''}`}>{n.label} ▾</button>
              {menu && (
                <div className="absolute z-10 mt-1 min-w-[140px] border border-black bg-white text-slate-800 shadow">
                  {n.menu.map(m => <button key={m.key} onClick={() => { setPage(m.key); setMenu(false) }} className="block w-full px-3 py-1 text-left text-sm hover:bg-slate-100">{m.label}</button>)}
                </div>
              )}
            </div>
          ) : (
            <button key={n.key} onClick={() => { setPage(n.key as Page); setMenu(false) }} className={`px-2 py-1 hover:bg-white/10 ${page === n.key ? 'bg-white/15' : ''}`}>{n.label}</button>
          ))}
        </div>
      </nav>
      <div className="bg-white px-4 sm:px-8 py-8">{body[page]}</div>
    </div>
  )
}
