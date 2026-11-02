// Leaderboards: what can be shown and how it is addressed. Every table has its own URL
// (?tab=…&side=…&cat=…&wt=…&level=…&scope=…&sort=…&n=…) and the page reads only that
// table's rows. Boys and girls each have their own page and data; only this layout is shared.

export type Gender = 'M' | 'F'
export type Phase = 'regular' | 'postseason' | 'analytics'
export type Side = 'team' | 'individual'
export type Level = 'district' | 'region' | 'state'
export type Scope = 'at' | 'thru'

export const WEIGHTS: Record<Gender, number[]> = {
  M: [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  F: [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235],
}

export const PAGE = 25
export const MAX_ROWS = 100
export const MAX_WRR_ROWS = 300

// Minimums for a percentage to mean something
export const MIN_RS_MATCHES = 5          // individual bonus %, regular season
export const MIN_PS_MATCHES = 3          // individual bonus %, postseason
export const MIN_RS_TEAM_CONTESTED = 30  // team pins / techs / bonus %, regular season
export const MIN_PS_TEAM_MATCHES = 10    // team bonus %, postseason
export const MIN_DUALS = 5               // points per dual

export type Category = { key: string; label: string; weights: boolean }

export const RS_TEAM: Category[] = [
  { key: 'pins',  label: 'Most Pins',        weights: false },
  { key: 'techs', label: 'Most Techs',       weights: false },
  { key: 'bonus', label: 'Bonus Point %',    weights: false },
  { key: 'wrr',   label: 'Team WRR',         weights: false },
  { key: 'ppd',   label: 'Points Per Dual',  weights: false },
]
export const RS_INDIVIDUAL: Category[] = [
  { key: 'quickest', label: 'Quickest',      weights: true },
  { key: 'most',     label: 'Most',          weights: true },
  { key: 'bonus',    label: 'Bonus Point %', weights: true },
  { key: 'wrr',      label: 'WRR',           weights: true },
]
export const PS_TEAM: Category[] = [
  { key: 'points', label: 'Team Points',   weights: false },
  { key: 'pins',   label: 'Most Pins',     weights: false },
  { key: 'techs',  label: 'Most Techs',    weights: false },
  { key: 'bonus',  label: 'Bonus Point %', weights: false },
]
export const PS_INDIVIDUAL: Category[] = [
  { key: 'quickest', label: 'Quickest',        weights: true },
  { key: 'most',     label: 'Most',            weights: true },
  { key: 'bonus',    label: 'Bonus Point %',   weights: true },
  { key: 'points',   label: 'Wrestler Points', weights: true },
  { key: 'mattime',  label: 'Mat Time',        weights: true },
]
// levels: which District / Region / State tabs a table offers (none = season-wide only)
export const ANALYTICS: (Category & { levels: boolean })[] = [
  { key: 'buster',      label: 'Bracket Buster',     weights: false, levels: true },
  { key: 'backside',    label: 'Backside Warriors',  weights: false, levels: true },
  { key: 'techmasters', label: 'Technical Masters',  weights: false, levels: true },
  { key: 'cinderella',  label: 'Cinderella Champs',  weights: false, levels: false },
  { key: 'revenge',     label: 'Revenge Tour',       weights: false, levels: false },
  { key: 'margins',     label: 'The Margins',        weights: false, levels: true },
  { key: 'districts',   label: 'District Strength',  weights: false, levels: false },
  { key: 'depth',       label: 'School Depth',       weights: false, levels: false },
]

export const LEVELS: { key: Level; label: string }[] = [
  { key: 'district', label: 'Districts' },
  { key: 'region',   label: 'Regions' },
  { key: 'state',    label: 'State' },
]

/** lb_ps_* pool for a level and scope (districts have no "through") */
export function poolFor(level: Level, scope: Scope): string {
  return level === 'district' ? 'district' : `${level}:${scope}`
}

/** lb_an_* level argument */
export function analyticsLevel(level: Level | null): string | null {
  return level === 'district' ? 'districts' : level
}

export type Params = {
  tab: Phase; side: Side; cat: string; wt: number | null
  level: Level; scope: Scope; alevel: Level | null
  sort: string | null; n: number
  conf: string[]; sec: string[]; grp: string[]
}

type Raw = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? ''
const list = (v: string | string[] | undefined) => one(v).split(',').map(s => s.trim()).filter(Boolean)

/** Read the URL, accepting the old ?tab=regular-season|wrestlers and ?pool= links */
export function readParams(raw: Raw, gender: Gender): Params {
  const t = one(raw.tab)
  const tab: Phase = t === 'postseason' || t === 'wrestlers' ? 'postseason' : t === 'analytics' ? 'analytics' : 'regular'
  const side: Side = one(raw.side) === 'individual' ? 'individual' : 'team'
  const cats = tab === 'analytics' ? ANALYTICS : tab === 'regular' ? (side === 'team' ? RS_TEAM : RS_INDIVIDUAL) : (side === 'team' ? PS_TEAM : PS_INDIVIDUAL)
  const cat = cats.find(c => c.key === one(raw.cat))?.key ?? cats[0].key
  const w = Number(one(raw.wt))
  const wt = WEIGHTS[gender].includes(w) ? w : null
  const oldPool = one(raw.pool)                     // old links: district(s) | region | state, all "through"
  const lv = one(raw.level) || (oldPool.startsWith('district') ? 'district' : oldPool)
  const level: Level = lv === 'region' || lv === 'state' ? lv : 'district'
  const scope: Scope = one(raw.scope) === 'at' ? 'at' : 'thru'
  const al = one(raw.alevel)
  const alevel: Level | null = al === 'district' || al === 'region' || al === 'state' ? al : null
  const cap = tab !== 'analytics' && cat === 'wrr' && side === 'individual' ? MAX_WRR_ROWS : MAX_ROWS
  const nRaw = Math.round(Number(one(raw.n)) / PAGE) * PAGE
  const n = Math.min(Math.max(nRaw || PAGE, PAGE), cap)
  return { tab, side, cat, wt, level, scope, alevel, sort: one(raw.sort) || null, n, conf: list(raw.conf), sec: list(raw.sec), grp: list(raw.grp) }
}

export function rowCap(p: Params): number {
  return p.tab !== 'analytics' && p.side === 'individual' && p.cat === 'wrr' ? MAX_WRR_ROWS : MAX_ROWS
}

/** A link to the same page with some settings changed (unset ones are dropped) */
export function hrefFor(base: string, p: Params, patch: Partial<Record<keyof Params, string | number | null>>): string {
  const v: Record<string, string | number | null> = {
    tab: p.tab, side: p.side, cat: p.cat, wt: p.wt, level: p.level, scope: p.scope, alevel: p.alevel,
    sort: p.sort, n: p.n === PAGE ? null : p.n,
    conf: p.conf.join(',') || null, sec: p.sec.join(',') || null, grp: p.grp.join(',') || null,
    ...patch,
  }
  const q = new URLSearchParams()
  for (const [k, x] of Object.entries(v)) if (x !== null && x !== undefined && x !== '') q.set(k, String(x))
  return `${base}?${q.toString()}`
}
