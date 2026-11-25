'use client'
// A college's NJ wrestlers (Kyle 2026-11-17): one row each — high school, the years he qualified for the NCAA
// Championships, best finish, All-American years, bonus and consolation wins — opening to his awards, one row per
// year (Kyle 2026-11-18): NJSIAA medals, offseason badges (Super 32 / Fargo podiums, Ironman and world titles) and his
// NCAA finish, oldest first. The bouts stay on his profile.
import { Fragment, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ordinal, textOn, levelTab, levelFullAny, type CareerTotals, type CollegeYear } from '@/lib/ncaa/stats'
import type { HsAccolade } from '@/lib/ncaa/hsAccolades'
import { BADGE_LOOK, type OffseasonBadge } from '@/lib/offseasonBadges'
import { IconHint } from '@/components/site/IconHint'
import { placementHint, badgeHint, collegeHint } from '@/lib/awardHints'

export type RosterRow = { wrestler_id: string; name: string; hs: ReactNode; years: CollegeYear[]; totals: CareerTotals; accolades: HsAccolade[]; badges: OffseasonBadge[] }

const TH = 'text-left px-3 py-1 text-xs font-bold uppercase tracking-wide whitespace-nowrap'
// Kyle 2026-11-18: a college can have wrestlers at more than one championship (Wilkes: DIII, and DI when DIII placers
// went on to it), so each year and finish names its level
const COLS = ['', 'Wrestler', 'High School', 'Championships', 'Best', 'AA', 'Falls', 'Techs', 'Majors', 'Cons. Wins']
const tab = levelTab

/** His best finish, with how many times he reached it (Kyle 2026-11-18: "if they won more than 1 – put that") */
function bestLabel(years: CollegeYear[]): string {
  const placed = years.filter(y => y.place != null)
  if (!placed.length) return '—'
  const best = Math.min(...placed.map(y => y.place!))
  const at = placed.filter(y => y.place === best)
  return [...new Set(at.map(y => y.level))].map(l => {
    const n = at.filter(y => y.level === l).length
    return `${n > 1 ? `${n}× ` : ''}${tab(l)} ${best === 1 ? 'Champion' : ordinal(best)}`
  }).join(', ')
}

/** A medal chip the way the profile's medal case draws it: district light gray, region navy, State gold */
function HsChip({ a }: { a: HsAccolade }) {
  const look = a.level === 0 ? 'bg-slate-50 border-slate-200 text-slate-700' : a.level === 1 ? 'bg-[#16284A] border-[#16284A] text-white' : 'bg-amber-50 border-amber-200 text-amber-800'
  const medal = a.place === 1 ? '\u{1F947}' : a.place === 2 ? '\u{1F948}' : a.place === 3 ? '\u{1F949}' : null
  const short = a.label === 'State' ? 'State' : a.label.replace(/^District /, 'D').replace(/^Region /, 'R')
  const num = Number(/\d+/.exec(a.label)?.[0]) || null
  return (
    <IconHint hint={placementHint(a.place, a.level === 0 ? 'district' : a.level === 1 ? 'region' : 'state', num, a.year)}>
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${look}`}>
      {medal ? <span>{medal}</span> : <span className="opacity-75">{ordinal(a.place)}</span>}
      <span>{short}</span>
      <span className="opacity-60">{`'${String(a.year).slice(2)}`}</span>
    </span>
    </IconHint>
  )
}

const medalOf = (p: number) => (p === 1 ? '\u{1F947}' : p === 2 ? '\u{1F948}' : p === 3 ? '\u{1F949}' : null)
const yy = (y: number) => `'${String(y).slice(2)}`

function BadgeChip({ b }: { b: OffseasonBadge }) {
  const medal = medalOf(b.place)
  return (
    <IconHint hint={badgeHint(b.kind, b.label, b.place, b.year)}>
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${BADGE_LOOK[b.kind]}`}>
      {medal ? <span>{medal}</span> : <span className="opacity-75">{ordinal(b.place)}</span>}
      <span>{b.label}</span>
      <span className="opacity-60">{yy(b.year)}</span>
    </span>
    </IconHint>
  )
}

/** A championship year as a chip in the college's colors: a medal for an All-American finish, else "Qualifier" — named
 *  by its level (DI, DII, DIII, NAIA) */
function NcaaChip({ y }: { y: CollegeYear }) {
  return <IconHint hint={collegeHint(levelFullAny(y.level), y.place, y.weight, y.year)}><NcaaPill y={y} /></IconHint>
}
function NcaaPill({ y }: { y: CollegeYear }) {
  if (y.place == null) return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-white" style={{ color: '#334155', borderColor: y.college?.primary_color ?? '#334155' }}>
      <span>{tab(y.level)} Qualifier {y.weight}</span><span className="opacity-60">{yy(y.year)}</span>
    </span>
  )
  const bg = y.college?.primary_color ?? '#334155', medal = medalOf(y.place)
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border" style={{ background: bg, color: textOn(bg), borderColor: y.college?.secondary_color ?? bg }}>
      {medal ? <span>{medal}</span> : <span className="opacity-75">{ordinal(y.place)}</span>}
      <span>{tab(y.level)} {y.weight}</span><span className="opacity-70">{yy(y.year)}</span>
    </span>
  )
}

/** His awards, one row per season (end-year keyed, as the site keys seasons), oldest first */
function AwardsByYear({ r }: { r: RosterRow }) {
  const seasons = [...new Set([...r.accolades.map(a => a.year), ...r.badges.map(b => b.season), ...r.years.map(y => y.year)])].sort((a, b) => a - b)
  if (!seasons.length) return <p className="text-xs text-slate-500">No awards on file.</p>
  return (
    <table className="w-full text-[12px] border border-slate-200 bg-white">
      <tbody>
        {seasons.map((s, k) => (
          <tr key={s} className={`border-t border-slate-100 ${k % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
            <td className="px-3 py-1.5 whitespace-nowrap align-top font-semibold tabular-nums text-slate-600 w-20">{s - 1}–{String(s).slice(2)}</td>
            <td className="px-2 py-1.5">
              <div className="flex flex-wrap gap-1.5">
                {r.accolades.filter(a => a.year === s).map((a, i) => <HsChip key={`h${i}`} a={a} />)}
                {r.badges.filter(b => b.season === s).map((b, i) => <BadgeChip key={`b${i}`} b={b} />)}
                {/* a qualifier chip only when that year has no placing (Kyle 2026-11-19: DIII placers went on to DI) */}
                {r.years.filter(y => y.year === s && (y.place != null || !r.years.some(o => o.year === s && o.place != null))).map(y => <NcaaChip key={y.entry_id} y={y} />)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function CollegeRosterTable({ rows, live, side = '/boys' }: { rows: RosterRow[]; live: boolean; side?: '/boys' | '/girls' }) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setOpen(o => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })
  return (
    <div className="border border-black rounded-none overflow-x-auto">
      <table className="min-w-max w-full text-[13px]">
        <thead><tr className="bg-slate-900 text-white">{COLS.map(c => <th key={c} className={TH}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const isOpen = open.has(r.wrestler_id), bg = i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
            const years = [...r.years].sort((a, b) => a.year - b.year)
            return (
              <Fragment key={r.wrestler_id}>
                <tr className={`border-t border-slate-100 cursor-pointer hover:bg-slate-100 ${bg}`} onClick={() => toggle(r.wrestler_id)}>
                  <td className="pl-3 pr-1 py-1 text-slate-400 w-4" aria-label={isOpen ? 'Hide' : 'Show'}>{isOpen ? '▾' : '▸'}</td>
                  <td className="px-3 py-1 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    {live ? <Link href={`${side}/wrestler/${r.wrestler_id}`} className="font-semibold text-slate-800 hover:underline">{r.name}</Link> : <button type="button" className="font-semibold text-slate-800" onClick={() => toggle(r.wrestler_id)}>{r.name}</button>}
                  </td>
                  <td className="px-3 py-1 whitespace-nowrap">{r.hs}</td>
                  <td className="px-3 py-1 whitespace-nowrap tabular-nums text-slate-600">{years.map(y => `${y.year} ${tab(y.level)}${y.place ? ` (${ordinal(y.place)})` : ''}`).join(', ')}</td>
                  <td className="px-3 py-1 whitespace-nowrap">{bestLabel(r.years)}</td>
                  <td className="px-3 py-1 tabular-nums">{r.totals.aa || ''}</td>
                  <td className="px-3 py-1 tabular-nums">{r.totals.falls || ''}</td>
                  <td className="px-3 py-1 tabular-nums">{r.totals.techs || ''}</td>
                  <td className="px-3 py-1 tabular-nums">{r.totals.majors || ''}</td>
                  <td className="px-3 py-1 tabular-nums">{r.totals.consWins || ''}</td>
                </tr>
                {isOpen && (
                  <tr className={bg}>
                    <td colSpan={COLS.length} className="px-4 pb-4 pt-1 border-t border-slate-100">
                      <AwardsByYear r={r} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
