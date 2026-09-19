import { redirect } from 'next/navigation'
import { getWorkingSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { HubShell } from '../dashboards/HubShell'
import { PlayoffSeedsClient } from '../playoff-seeds/PlayoffSeedsClient'

export const dynamic = 'force-dynamic'

const ALL_GROUPS: { section: string; classification: string; label: string }[] = [
  ...(['1','2','3','4','5'] as const).flatMap(g =>
    ['North I','North II','Central','South'].map(s => ({
      section: s,
      classification: g,
      label: `${s} G${g}`,
    }))
  ),
  { section: 'Non-Public', classification: 'A', label: 'NP-A' },
  { section: 'Non-Public', classification: 'B', label: 'NP-B' },
]

const NPA_KEY = 'Non-Public|A'
const NPB_KEY = 'Non-Public|B'

function TeamPlayoffsHeader({
  groupsConfirmed,
  totalGroups,
  seedsSet,
}: {
  groupsConfirmed: number
  totalGroups: number
  seedsSet: number
}) {
  const groupsPct = Math.round(groupsConfirmed / totalGroups * 100)
  const seedsPct  = Math.round(seedsSet / totalGroups * 100)

  function Pill({ label, value, pct }: { label: string; value: string | number; pct?: number }) {
    const color = pct === undefined ? 'text-slate-800'
      : pct >= 80 ? 'text-green-600' : pct >= 40 ? 'text-amber-600' : 'text-slate-500'
    const bar = pct === undefined ? null
      : pct >= 80 ? 'bg-green-400' : pct >= 40 ? 'bg-amber-400' : 'bg-slate-300'
    return (
      <div className="flex flex-col gap-1.5 px-4 py-3 border border-slate-100 rounded-lg bg-slate-50 min-w-[110px]">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${color}`}>{value}</p>
        {bar && (
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(pct!, 100)}%` }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-base font-bold text-slate-800">Team Playoffs</p>
        <p className="text-sm text-slate-500 font-medium">Seeds &amp; Brackets</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Pill label="Groups"          value={`${groupsConfirmed}/${totalGroups}`} />
        <Pill label="Seeds %"         value={`${seedsPct}%`}  pct={seedsPct} />
        <Pill label="Brackets %"      value={`${groupsPct}%`} pct={groupsPct} />
        <Pill label="Groups Done"     value={groupsConfirmed} />
        <Pill label="Groups Pending"  value={totalGroups - groupsConfirmed} />
      </div>
    </div>
  )
}

export default async function TeamPlayoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string }>
}) {
  const { gender: genderParam } = await searchParams
  const GENDER = genderParam === 'F' ? 'F' : 'M'
  const SEASON_ID = (await getWorkingSeason(GENDER)).id

  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) redirect('/admin/login')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  type School = { id: number; display_name: string; logo_url: string | null; primary_color: string | null }
  type SeedEntry = { seed: number; school: School | null; wins: number; losses: number; pp: number }

  const [{ data: ppRows }, { data: npaSchools }, { data: npbSchools }] = await Promise.all([
    db.from('power_points')
      .select('school_id, power_points, frozen_power_points, overall_wins, overall_losses, schools!inner(id, display_name, logo_url, primary_color, section, classification)')
      .eq('season_id', SEASON_ID)
      .eq('gender', GENDER)
      .order('power_points', { ascending: false }),
    db.from('schools')
      .select('id, display_name, logo_url, primary_color')
      .eq('section', 'Non-Public').eq('classification', 'A').eq('is_nj', true)
      .order('display_name'),
    db.from('schools')
      .select('id, display_name, logo_url, primary_color')
      .eq('section', 'Non-Public').eq('classification', 'B').eq('is_nj', true)
      .order('display_name'),
  ])

  const ppMap = new Map<string, SeedEntry[]>()
  const npaSeededIds = new Set<number>()
  const npbSeededIds = new Set<number>()

  for (const row of ppRows ?? []) {
    const s = row.schools as any
    if (!s.section || !s.classification) continue
    const key   = `${s.section}|${s.classification}`
    const limit = key === NPA_KEY ? 13 : key === NPB_KEY ? 9 : 12
    const list  = ppMap.get(key) ?? []
    if (list.length < limit) {
      list.push({
        seed: list.length + 1,
        school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color },
        wins: row.overall_wins,
        losses: row.overall_losses,
        pp: Number(row.frozen_power_points ?? row.power_points),
      })
      ppMap.set(key, list)
      if (key === NPA_KEY) npaSeededIds.add(s.id)
      if (key === NPB_KEY) npbSeededIds.add(s.id)
    }
  }

  const npaPool: SeedEntry[] = (npaSchools ?? [])
    .filter(s => !npaSeededIds.has(s.id))
    .map((s, i) => ({ seed: 14 + i, school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color }, wins: 0, losses: 0, pp: 0 }))

  const npbPool: SeedEntry[] = (npbSchools ?? [])
    .filter(s => !npbSeededIds.has(s.id))
    .map((s, i) => ({ seed: 10 + i, school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color }, wins: 0, losses: 0, pp: 0 }))

  const { data: savedRows } = await db
    .from('playoff_seeds')
    .select('section, classification, seed, school_id, confirmed, schools(id, display_name, logo_url, primary_color)')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)

  const savedMap = new Map<string, Map<number, { school: School | null; confirmed: boolean }>>()
  for (const r of savedRows ?? []) {
    const key = `${r.section}|${r.classification}`
    if (!savedMap.has(key)) savedMap.set(key, new Map())
    const sc = r.schools as any
    savedMap.get(key)!.set(r.seed, {
      school: sc ? { id: sc.id, display_name: sc.display_name, logo_url: sc.logo_url, primary_color: sc.primary_color } : null,
      confirmed: r.confirmed,
    })
  }

  const groups = ALL_GROUPS.map(g => {
    const key         = `${g.section}|${g.classification}`
    const ppSeeds     = ppMap.get(key) ?? []
    const saved       = savedMap.get(key)
    const isNPA       = key === NPA_KEY
    const isNPB       = key === NPB_KEY
    const bracketSize = isNPA ? 13 : isNPB ? 9 : 8
    const totalSlots  = isNPA ? 13 : isNPB ? 9 : 12

    const isConfirmed = saved
      ? [...saved.values()].every(v => v.confirmed) && saved.size === bracketSize
      : false

    const seeds: SeedEntry[] = Array.from({ length: totalSlots }, (_, i) => {
      const seedNum = i + 1
      if (seedNum <= bracketSize && saved?.has(seedNum)) {
        const sv      = saved.get(seedNum)!
        const ppEntry = ppSeeds[i]
        return { seed: seedNum, school: sv.school, wins: ppEntry?.wins ?? 0, losses: ppEntry?.losses ?? 0, pp: ppEntry?.pp ?? 0 }
      }
      return ppSeeds[i] ?? { seed: seedNum, school: null, wins: 0, losses: 0, pp: 0 }
    })

    const pool      = isNPA ? npaPool : isNPB ? npbPool : []
    const fullSeeds = (isNPA || isNPB) ? [...seeds, ...pool] : seeds

    return { ...g, key, seeds: fullSeeds, confirmed: isConfirmed, isNPA, isNPB }
  })

  const groupsConfirmed = groups.filter(g => g.confirmed).length
  const seedsSet        = groups.filter(g => savedMap.has(g.key)).length

  return (
    <HubShell
      header={
        <TeamPlayoffsHeader
          groupsConfirmed={groupsConfirmed}
          totalGroups={ALL_GROUPS.length}
          seedsSet={seedsSet}
        />
      }
    >
      <PlayoffSeedsClient groups={groups} seasonId={SEASON_ID} gender={GENDER} />
    </HubShell>
  )
}
