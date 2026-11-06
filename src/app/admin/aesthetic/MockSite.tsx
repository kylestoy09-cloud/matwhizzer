'use client'
// Mock site for the Aesthetic Tool: the public top nav, and each page it links to laid out in the
// standard frame (SitePageHeader + season row + NumberTileGrid / tables), with sample content. Every
// page reads the same tool settings, so a change shows on all of them.

import { useState, type ReactNode } from 'react'
import { SitePageHeader } from '@/components/site/SitePageHeader'
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

type Page = 'schedule' | 'standings' | 'leaderboards' | 'tournaments' | 'ps-team' | 'ps-individual' | 'districts' | 'regions' | 'state' | 'h2h' | 'about'
const NAV: { key: Page | 'postseason'; label: string; menu?: { key: Page; label: string }[] }[] = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'standings', label: 'Standings' },
  { key: 'leaderboards', label: 'Leaderboards' },
  { key: 'tournaments', label: 'Tournaments' },
  { key: 'postseason', label: 'Post Season', menu: [
    { key: 'ps-team', label: 'Team' }, { key: 'ps-individual', label: 'Individual' },
    { key: 'districts', label: 'Districts' }, { key: 'regions', label: 'Regions' }, { key: 'state', label: 'State' },
  ] },
  { key: 'h2h', label: 'H2H' },
  { key: 'about', label: 'About' },
]

// ── sample-content building blocks, all in the site table standard (px-3 py-1) ──
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
const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="mt-8"><h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-700">{title}</h3>{children}</section>
)
function Toggle({ options, active }: { options: string[]; active: string }) {
  return <span className="inline-flex">{options.map(o => <span key={o} className={`px-2 py-0.5 text-xs font-semibold border ${o === active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-700'}`}>{o}</span>)}</span>
}
const SeasonPick = () => (
  <select className="bg-amber-50 border border-amber-300 font-semibold text-amber-800 text-sm py-0.5 pl-2 pr-2"><option>Current season</option><option>Previous season</option></select>
)

export function MockSite({ look }: { look: MockLook }) {
  const [page, setPage] = useState<Page>('standings')
  const [girls, setGirls] = useState(false)
  const [menu, setMenu] = useState(false)
  const P = girls ? 'Girls' : 'Boys'
  const tile = (r: number) => (girls ? look.girlsTile(r) : look.boysTile(r))
  const nRegions = girls ? 4 : 8, nDistricts = girls ? 12 : 32
  const regionOfDistrict = girls ? girlsRegionOfDistrict : boysRegionOfDistrict
  const grid = (tiles: NumberTile[], scale = 1, minWidth?: number) => (
    <NumberTileGrid tiles={tiles} fontFamily={look.fontFamily} size={Math.round(look.size * scale)} radius={look.radius} border={look.border} minWidth={minWidth ?? Math.round(look.size * scale)} />
  )
  const regionTiles: NumberTile[] = Array.from({ length: nRegions }, (_, i) => ({ key: i + 1, label: String(i + 1), ...tile(i + 1) }))
  const districtTiles: NumberTile[] = Array.from({ length: nDistricts }, (_, i) => ({ key: i + 1, label: String(i + 1), ...tile(regionOfDistrict(i + 1)) }))
  const groupTiles: NumberTile[] = (girls ? ['North', 'South', 'Non-Team'] : ['North I', 'North II', 'Central', 'South']).flatMap((sec, si) =>
    (girls ? [''] : ['G1', 'G2', 'G3', 'G4', 'G5']).map(g => ({ key: `${sec}${g}`, label: g ? `${sec} ${g}` : sec, ...tile(si + 1) })))
  const header = (title: string, subtitle: ReactNode, row: ReactNode) => (
    <SitePageHeader title={title} subtitle={subtitle} seasonRow={row} showLogo={look.showLogo} titleFontFamily={look.titleFontFamily} />
  )

  const body: Record<Page, ReactNode> = {
    schedule: <>
      {header(`${P} Schedule`, 'Dual meets and tournaments by date', <><SeasonPick /><Toggle options={['All', 'My Schools']} active="All" /><Toggle options={['Section', 'Group', 'Conference']} active="Section" /></>)}
      {grid(['Dec', 'Jan', 'Feb'].map((m, i) => ({ key: m, label: m, ...tile(i + 1) })), 0.7, 110)}
      <Section title="Saturday, January 10"><Table cols={['Time', 'Home', 'Score', 'Away', 'Type']} rows={[['10:00', 'Bergen Catholic', '42-21', 'Delbarton', 'Dual'], ['11:30', 'Phillipsburg', '—', 'Hunterdon Central', 'Dual'], ['All day', 'Sam Cali Invitational', '', '', 'Tournament']]} /></Section>
    </>,
    standings: <>
      {header(`${P} Standings`, 'NJSIAA power points and records', <><SeasonPick /><Toggle options={['Group', 'Conference']} active="Group" /></>)}
      {grid(groupTiles, 0.7, 120)}
      <Section title={girls ? 'North' : 'North I Group 5'}><Table cols={['#', 'School', 'W-L', 'PP']} rows={[[1, 'Phillipsburg', '18-2', '64.2'], [2, 'Hunterdon Central', '15-4', '58.9'], [3, 'Ridgewood', '14-6', '55.1']]} /></Section>
    </>,
    leaderboards: <>
      {header(`${P} Leaderboards`, 'Season leaders by category', <><SeasonPick /><Toggle options={['Regular Season', 'Post Season']} active="Regular Season" /></>)}
      {grid(['Wins', 'Pins', 'Tech Falls', 'Bonus %', 'Fastest Pin', 'Team Points'].map((c, i) => ({ key: c, label: c, ...tile((i % nRegions) + 1) })), 0.65, 120)}
      <Section title="Wins"><Table cols={['#', 'Wrestler', 'School', 'Wt', 'W']} rows={[[1, 'Cristian Alvarez', 'St Joseph Regional', 285, 40], [2, 'Nick Clayton', 'High Point', 150, 38], [3, 'Luke Geleta', 'Phillipsburg', 144, 37]]} /></Section>
    </>,
    tournaments: <>
      {header(`${P} Tournaments`, 'In-season tournaments', <><SeasonPick /><Toggle options={['Upcoming', 'Completed']} active="Completed" /></>)}
      {grid(['Dec', 'Jan', 'Feb'].map((m, i) => ({ key: m, label: m, ...tile(i + 1) })), 0.7, 110)}
      <Section title="December"><Table cols={['Date', 'Tournament', 'Host', 'Teams']} rows={[['12/19', 'Beast of the East', 'Univ. of Delaware', 64], ['12/27', 'Sam Cali Invitational', 'Brick', 24], ['12/29', 'Escape the Rock', 'Mount Olive', 32]]} /></Section>
    </>,
    'ps-team': <>
      {header(`${P} Team Post Season`, 'Team tournaments and postseason team scores', <><SeasonPick /><Toggle options={['Team Tournament', 'Team Scores']} active="Team Scores" /></>)}
      {grid(regionTiles, 1)}
      <Section title="Top team scores"><Table cols={['#', 'School', 'Dist', 'Reg', 'State', 'Total']} rows={[[1, 'Bergen Catholic', 345.5, 210, 168, 723.5], [2, 'Delbarton', 290, 198, 120, 608], [3, 'Phillipsburg', 258, 160, 101, 519]]} /></Section>
    </>,
    'ps-individual': <>
      {header(`${P} Individual Post Season`, 'State champions, podium schools and point leaders', <><SeasonPick /></>)}
      {grid([{ key: 'd', label: 'Districts', ...tile(1) }, { key: 'r', label: 'Regions', ...tile(2) }, { key: 's', label: 'State', ...tile(3) }], 0.8, 140)}
      <Section title="State champions"><Table cols={['Wt', 'Wrestler', 'School']} rows={[[106, 'Thomas Blewett, Jr', 'Middletown North'], [113, 'Charles Esposito, Sr', 'St Joseph Regional'], [120, 'Johnathon McGinty, Sr', 'St Joseph Regional']]} /></Section>
    </>,
    districts: <>
      {header(`${P} District Brackets`, 'Select a district', <><SeasonPick /></>)}
      {grid(districtTiles, 0.75)}
      <p className="mt-3 text-xs text-slate-500">Each district is in its region&apos;s color.</p>
    </>,
    regions: <>
      {header(`${P} Region Brackets`, 'Select a region', <><SeasonPick /></>)}
      {grid(regionTiles, 1)}
    </>,
    state: <>
      {header(`${P} State Tournament`, 'Boardwalk Hall · double elimination', <><SeasonPick /></>)}
      {grid((girls ? [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235] : [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]).map((w, i) => ({ key: w, label: String(w), ...tile((i % nRegions) + 1) })), 0.7)}
      <Section title="State placewinners"><Table cols={['Wt', 'Champion', 'Runner-up', '3rd', '4th']} rows={[[106, 'Blewett', 'Burke', 'Ruane', 'Daly'], [113, 'Esposito', 'Szamreta', 'Sipper', 'Reyes']]} /></Section>
    </>,
    h2h: <>
      {header(`${P} Head to Head`, 'Compare two wrestlers', <><SeasonPick /></>)}
      <div className="grid gap-3 sm:grid-cols-2">{['Wrestler 1', 'Wrestler 2'].map(p => <input key={p} placeholder={p} className="border border-slate-300 px-3 py-2 text-sm" />)}</div>
      <Section title="Common opponents"><Table cols={['Opponent', 'Wrestler 1', 'Wrestler 2']} rows={[['Nick Clayton', 'W Dec 7-6', 'L MD 13-4'], ['Luke Geleta', 'L Fall 3:10', 'W Dec 2-1']]} /></Section>
    </>,
    about: <>
      {header('About Mat Whizzer', 'How the site works', <Toggle options={['Summary', 'Q&A', 'Rules']} active="Summary" />)}
      <div className="space-y-3 text-sm text-slate-700 max-w-2xl mx-auto"><p>Mat Whizzer covers NJSIAA wrestling: duals, tournaments, the postseason and ratings for every wrestler.</p><p>Each section below explains where the numbers come from.</p></div>
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
            {['Boys', 'Girls'].map(g => <button key={g} onClick={() => setGirls(g === 'Girls')} className={`px-3 py-0.5 text-xs font-semibold ${(g === 'Girls') === girls ? 'bg-white text-slate-900' : 'text-white'}`}>{g}</button>)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 px-3 py-1.5 text-sm">
          {NAV.map(n => n.menu ? (
            <div key={n.key} className="relative">
              <button onClick={() => setMenu(m => !m)} className={`px-2 py-1 hover:bg-white/10 ${page.startsWith('ps-') || ['districts', 'regions', 'state'].includes(page) ? 'bg-white/15' : ''}`}>{n.label} ▾</button>
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
