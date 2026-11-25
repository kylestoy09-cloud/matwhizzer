// The district / region / state pages for a Playoff History season (2013 on; Kyle 2026-11-14): the weights that
// season used (before 2021-22 the boys had 145, 152, 160 …; girls' classes changed most years) and the names of its
// regions when they weren't the usual ones (boys 2020-21's four super regions; girls 2018-19 to 2021-22 North /
// South). Current seasons keep the pages' own lists. Cached a day: a loaded season doesn't change.
import { unstable_cache } from 'next/cache'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { getHistorySeasons } from '@/lib/seasons-server'

type G = 'M' | 'F'

const load = (g: G, season: number) => unstable_cache(async () => {
  const db = createSupabaseAdmin()
  const { data: tours } = await db.from('tournaments').select('id, name, tournament_type, region_id').eq('gender', g).eq('season_id', season)
  const ids = (tours ?? []).map(t => t.id)
  const weights = new Set<number>()
  for (let i = 0; i < ids.length; i += 10) {
    const { data } = await db.from('matches').select('weight_classes(weight)').in('tournament_id', ids.slice(i, i + 10)).eq('round', 'F').limit(1000)
    for (const m of (data ?? []) as unknown as { weight_classes: { weight: number } | null }[]) if (m.weight_classes) weights.add(m.weight_classes.weight)
  }
  const regionIds = [...new Set((tours ?? []).filter(t => /region/i.test(t.tournament_type)).map(t => t.region_id).filter(Boolean))]
  const { data: regs } = regionIds.length ? await db.from('regions').select('id, name').in('id', regionIds) : { data: [] }
  const regionName: Record<number, string> = {}
  for (const t of tours ?? []) {
    if (!/region/i.test(t.tournament_type)) continue
    const num = Number(/r(\d+)$/.exec(t.name)?.[1])
    const nm = regs?.find(r => r.id === t.region_id)?.name
    if (num && nm) regionName[num] = nm.replace(/^Girls Region /, 'Region ').replace(/^Region (North|South|Central)/, '$1').trim()
  }
  return { weights: [...weights].sort((a, b) => a - b), regionName, districts: (tours ?? []).some(t => t.tournament_type === 'districts'), regions: Object.keys(regionName).map(Number).sort((a, b) => a - b) }
}, ['postseason-season', g, String(season), process.env.VERCEL_DEPLOYMENT_ID ?? 'local'], { revalidate: 86400 })()

/** null for a current season (the page keeps its own lists) */
export async function historySeasonInfo(g: G, season: number) {
  if (!(await getHistorySeasons(g)).some(h => h.id === season)) return null
  return load(g, season)
}

export async function seasonWeights(g: G, season: number, current: readonly number[]): Promise<number[]> {
  const h = await historySeasonInfo(g, season)
  return h?.weights.length ? h.weights : [...current]
}

// Region labels for ANY season (Kyle 2026-11-14: "they should never change"): the region's own name when it has one
// (boys 2020-21 and girls 2022-23 on: North I, North II, Central, South; girls 2018-19 to 2021-22: North, South), else
// "Region N". `order` lists the season's regions North I, North II, Central, South first, then by number — girls 2025-26
// numbers them Central 1, North I 2, North II 3.
const NAMED_ORDER = ['North I', 'North II', 'North', 'Central', 'South']
const labels = (g: G, season: number) => unstable_cache(async () => {
  const db = createSupabaseAdmin()
  const { data: tours } = await db.from('tournaments').select('name, tournament_type, region_id').eq('gender', g).eq('season_id', season).in('tournament_type', ['regions', 'girls_regions'])
  const ids = [...new Set((tours ?? []).map(t => t.region_id).filter(Boolean))]
  const { data: regs } = ids.length ? await db.from('regions').select('id, name').in('id', ids) : { data: [] }
  const name: Record<number, string> = {}
  for (const t of tours ?? []) {
    const num = Number(/r(\d+)$/.exec(t.name)?.[1]); if (!num) continue
    const nm = (regs ?? []).find(r => r.id === t.region_id)?.name?.replace(/^Girls Region /, 'Region ').replace(/^Region (North|South|Central)/, '$1').trim()
    name[num] = nm || `Region ${num}`
  }
  const rank = (n: number) => { const i = NAMED_ORDER.indexOf(name[n]); return i < 0 ? 100 + n : i }
  return { name, order: Object.keys(name).map(Number).sort((a, b) => rank(a) - rank(b)) }
}, ['region-labels', g, String(season), process.env.VERCEL_DEPLOYMENT_ID ?? 'local'], { revalidate: 3600 })()

export async function regionLabels(g: G, season: number) {
  const r = await labels(g, season)
  const named = (n: number) => r.name[n] && !/^Region \d+$/.test(r.name[n]) ? r.name[n] : null
  return {
    label: (n: number) => r.name[n] ?? `Region ${n}`,       // page titles: "Region 3" / "North I"
    button: (n: number) => named(n) ?? String(n),             // buttons and tiles, as built in the Aesthetic tool: "3" / "North I"
    pill: (n: number) => named(n) ?? `R${n}`,                 // the pills on a region page (like D1 on district pages)
    order: r.order,
  }
}

/** A name without the ", Sr" the state RPCs add (wrestler_name_with_grade is today's grade): a Playoff History year
 *  shows names alone, since a profile linked to a current wrestler would show this year's grade (Kyle 2026-11-14 review) */
export const withoutGrade = (name: string) => name.replace(/, (Fr|So|Jr|Sr|\d+th)$/, '')
