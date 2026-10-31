import { redirect } from 'next/navigation'
import { getWorkingSeason } from '@/lib/season-context'
import Link from 'next/link'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { AdminBackButton } from '@/app/admin/AdminBackButton'
import { PlayoffSeedsClient } from './PlayoffSeedsClient'
import { boysProgramSchoolIds, girlsProgramSchoolIds } from '@/lib/genderPrograms'

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

export default async function PlayoffSeedsPage({
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

  // Non-Public pools: this gender's programs only (see src/lib/genderPrograms.ts)
  const programIds = await (GENDER === 'F' ? girlsProgramSchoolIds : boysProgramSchoolIds)(db, SEASON_ID)

  const [{ data: ppRows }, { data: npaSchools }, { data: npbSchools }] = await Promise.all([
    db.from('power_points')
      .select('school_id, power_points, frozen_power_points, overall_wins, overall_losses, schools!inner(id, display_name, logo_url, primary_color, section, classification)')
      .eq('season_id', SEASON_ID)
      .eq('gender', GENDER)
      .order('power_points', { ascending: false }),
    db.from('schools')
      .select('id, display_name, logo_url, primary_color')
      .eq('section', 'Non-Public').eq('classification', 'A').in('id', programIds)
      .order('display_name'),
    db.from('schools')
      .select('id, display_name, logo_url, primary_color')
      .eq('section', 'Non-Public').eq('classification', 'B').in('id', programIds)
      .order('display_name'),
  ])

  // PP map: key → top-N seeds
  // NP-A: 13, NP-B: 9, others: 12
  const ppMap = new Map<string, SeedEntry[]>()
  const npaSeededIds = new Set<number>()
  const npbSeededIds = new Set<number>()

  for (const row of ppRows ?? []) {
    const s = row.schools as any
    if (!s.section || !s.classification) continue
    const key = `${s.section}|${s.classification}`
    const limit = key === NPA_KEY ? 13 : key === NPB_KEY ? 9 : 12
    const list = ppMap.get(key) ?? []
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

  // Pool of remaining schools for NP-A and NP-B
  const npaPool: SeedEntry[] = (npaSchools ?? [])
    .filter(s => !npaSeededIds.has(s.id))
    .map((s, i) => ({ seed: 14 + i, school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color }, wins: 0, losses: 0, pp: 0 }))

  const npbPool: SeedEntry[] = (npbSchools ?? [])
    .filter(s => !npbSeededIds.has(s.id))
    .map((s, i) => ({ seed: 10 + i, school: { id: s.id, display_name: s.display_name, logo_url: s.logo_url, primary_color: s.primary_color }, wins: 0, losses: 0, pp: 0 }))

  // Saved seeds
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
    const key = `${g.section}|${g.classification}`
    const ppSeeds = ppMap.get(key) ?? []
    const saved = savedMap.get(key)
    const isNPA = key === NPA_KEY
    const isNPB = key === NPB_KEY
    const bracketSize = isNPA ? 13 : isNPB ? 9 : 8
    const totalSlots = isNPA ? 13 : isNPB ? 9 : 12

    const isConfirmed = saved
      ? [...saved.values()].every(v => v.confirmed) && saved.size === bracketSize
      : false

    const seeds: SeedEntry[] = Array.from({ length: totalSlots }, (_, i) => {
      const seedNum = i + 1
      if (seedNum <= bracketSize && saved?.has(seedNum)) {
        const sv = saved.get(seedNum)!
        const ppEntry = ppSeeds[i]
        return { seed: seedNum, school: sv.school, wins: ppEntry?.wins ?? 0, losses: ppEntry?.losses ?? 0, pp: ppEntry?.pp ?? 0 }
      }
      return ppSeeds[i] ?? { seed: seedNum, school: null, wins: 0, losses: 0, pp: 0 }
    })

    const pool = isNPA ? npaPool : isNPB ? npbPool : []
    const fullSeeds = (isNPA || isNPB) ? [...seeds, ...pool] : seeds

    return { ...g, key, seeds: fullSeeds, confirmed: isConfirmed, isNPA, isNPB }
  })

  return (
    <div className="max-w-7xl mx-auto px-4 pt-4 pb-16">
      <AdminBackButton />
      <div className="mt-4 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Playoff Seeds</h1>
          <p className="text-sm text-slate-500 mt-1">Review and confirm first-round bracket seedings for all 22 groups. Pre-filled from Power Points standings.</p>
        </div>
        <div className="flex border border-slate-300 rounded overflow-hidden shrink-0">
          <Link
            href="/admin/playoff-seeds?gender=M"
            className={`px-4 py-2 text-sm font-medium transition-colors ${GENDER === 'M' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Boys
          </Link>
          <Link
            href="/admin/playoff-seeds?gender=F"
            className={`px-4 py-2 text-sm font-medium transition-colors border-l border-slate-300 ${GENDER === 'F' ? 'bg-rose-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
          >
            Girls
          </Link>
        </div>
      </div>
      <PlayoffSeedsClient groups={groups} seasonId={SEASON_ID} gender={GENDER} />
    </div>
  )
}
