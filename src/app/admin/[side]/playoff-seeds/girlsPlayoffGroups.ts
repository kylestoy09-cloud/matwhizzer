import { createClient } from '@supabase/supabase-js'
import { getWorkingSeason } from '@/lib/season-context'

// Girls team playoffs: one North and one South bracket of 8, seeded from the girls
// power points pools (power_points.pp_group 'north' / 'south'). Seeds 9–12 are
// alternates. Saved seeds use section 'North' / 'South', classification 'Team'.
type School = { id: number; display_name: string; logo_url: string | null; primary_color: string | null }
type SeedEntry = { seed: number; school: School | null; wins: number; losses: number; pp: number }

const GIRLS_GROUPS = [
  { section: 'North', classification: 'Team', label: 'North', pool: 'north' },
  { section: 'South', classification: 'Team', label: 'South', pool: 'south' },
] as const

const BRACKET_SIZE = 8
const TOTAL_SLOTS  = 12

export async function girlsPlayoffGroups() {
  const SEASON_ID = (await getWorkingSeason('F')).id
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const [{ data: ppRows }, { data: savedRows }] = await Promise.all([
    db.from('power_points')
      .select('school_id, pp_group, power_points, frozen_power_points, overall_wins, overall_losses, schools!inner(id, display_name, logo_url, primary_color)')
      .eq('season_id', SEASON_ID)
      .eq('gender', 'F')
      .in('pp_group', GIRLS_GROUPS.map(g => g.pool))
      .order('power_points', { ascending: false }),
    db.from('playoff_seeds')
      .select('section, classification, seed, school_id, confirmed, schools(id, display_name, logo_url, primary_color)')
      .eq('season_id', SEASON_ID)
      .eq('gender', 'F'),
  ])

  // Power points order within each pool
  const ppMap = new Map<string, SeedEntry[]>()
  for (const row of ppRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = row.schools as any
    const list = ppMap.get(row.pp_group as string) ?? []
    if (list.length < TOTAL_SLOTS) {
      list.push({
        seed: list.length + 1,
        school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color },
        wins: row.overall_wins,
        losses: row.overall_losses,
        pp: Number(row.frozen_power_points ?? row.power_points),
      })
      ppMap.set(row.pp_group as string, list)
    }
  }

  const savedMap = new Map<string, Map<number, { school: School | null; confirmed: boolean }>>()
  for (const r of savedRows ?? []) {
    const key = `${r.section}|${r.classification}`
    if (!savedMap.has(key)) savedMap.set(key, new Map())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc = r.schools as any
    savedMap.get(key)!.set(r.seed, {
      school: sc ? { id: sc.id, display_name: sc.display_name, logo_url: sc.logo_url, primary_color: sc.primary_color } : null,
      confirmed: r.confirmed,
    })
  }

  const groups = GIRLS_GROUPS.map(g => {
    const key     = `${g.section}|${g.classification}`
    const ppSeeds = ppMap.get(g.pool) ?? []
    const saved   = savedMap.get(key)
    const confirmed = saved ? [...saved.values()].every(v => v.confirmed) && saved.size === BRACKET_SIZE : false
    const seeds: SeedEntry[] = Array.from({ length: TOTAL_SLOTS }, (_, i) => {
      const seedNum = i + 1
      if (seedNum <= BRACKET_SIZE && saved?.has(seedNum)) {
        const sv = saved.get(seedNum)!
        const pp = ppSeeds[i]
        return { seed: seedNum, school: sv.school, wins: pp?.wins ?? 0, losses: pp?.losses ?? 0, pp: pp?.pp ?? 0 }
      }
      return ppSeeds[i] ?? { seed: seedNum, school: null, wins: 0, losses: 0, pp: 0 }
    })
    return { section: g.section, classification: g.classification, label: g.label, key, seeds, confirmed, isNPA: false, isNPB: false }
  })

  return { SEASON_ID, groups }
}
