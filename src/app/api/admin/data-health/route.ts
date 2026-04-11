import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// All valid NJSIAA weight classes (boys + girls)
const VALID_WEIGHTS = new Set([
  106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285, // boys
  100, 107, 114, 152, 185, 235, // girls-only
])

const GARBAGE_NAMES = new Set(['-', 'Forfeit', 'Team Forfeit'])

export type CheckResult = {
  id: string
  name: string
  section: 'schools' | 'wrestlers' | 'entries' | 'standings' | 'leaderboards'
  count: number
  samples: Record<string, unknown>[]
  error?: string
  checkedAt: string
}

export type DataHealthResponse = {
  checks: CheckResult[]
  sampleSchoolIds: number[]
  checkedAt: string
}

export async function GET() {
  // Auth check — only logged-in admins
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createSupabaseAdmin()
  const checkedAt = new Date().toISOString()

  // Fetch all base data in parallel
  const [
    schoolsRes,
    wrestlersRes,
    entriesRes,
    weightClassesRes,
    confStandingsRes,
    precomputedRes,
    placementsRes,
  ] = await Promise.all([
    supabase.from('schools')
      .select('id, display_name, logo_url, athletic_conference')
      .limit(1000),
    supabase.from('wrestlers')
      .select('id, first_name, last_name, gender, graduation_year')
      .limit(10000),
    supabase.from('tournament_entries')
      .select('id, wrestler_id, school_id, weight_class_id, tournament_id')
      .limit(20000),
    supabase.from('weight_classes')
      .select('id, weight'),
    supabase.from('conference_standings')
      .select('id, school_id, school_name')
      .limit(1000),
    supabase.from('precomputed_team_scores')
      .select('id, tournament_id, school_id, school_name')
      .limit(5000),
    supabase.from('placements')
      .select('id, entry_id, weight_class_id, place, tournament_id')
      .limit(10000),
  ])

  const schools = schoolsRes.data ?? []
  const wrestlers = wrestlersRes.data ?? []
  const entries = entriesRes.data ?? []
  const weightClasses = weightClassesRes.data ?? []
  const confStandings = confStandingsRes.data ?? []
  const precomputed = precomputedRes.data ?? []
  const placements = placementsRes.data ?? []

  // ── Derived lookups ────────────────────────────────────────────────────────
  const schoolIdSet = new Set(schools.map(s => s.id))
  const entryIdSet = new Set(entries.map(e => e.id))
  const wcWeightMap = new Map(weightClasses.map(wc => [wc.id, wc.weight]))

  // Per-wrestler: set of distinct school_ids across entries
  const wrestlerSchoolMap = new Map<string, Set<number>>()
  const wrestlerHasEntry = new Set<string>()
  for (const e of entries) {
    wrestlerHasEntry.add(e.wrestler_id)
    if (e.school_id != null) {
      if (!wrestlerSchoolMap.has(e.wrestler_id)) wrestlerSchoolMap.set(e.wrestler_id, new Set())
      wrestlerSchoolMap.get(e.wrestler_id)!.add(e.school_id)
    }
  }

  // School IDs that have at least one entry
  const schoolsWithEntries = new Set(
    entries.filter(e => e.school_id != null).map(e => e.school_id as number)
  )

  const checks: CheckResult[] = []

  function check(
    id: string,
    name: string,
    section: CheckResult['section'],
    affected: unknown[],
    sampleFn: (row: unknown) => Record<string, unknown>,
    error?: string
  ): CheckResult {
    return {
      id, name, section,
      count: affected.length,
      samples: affected.slice(0, 5).map(sampleFn),
      ...(error ? { error } : {}),
      checkedAt,
    }
  }

  // ── SCHOOLS ────────────────────────────────────────────────────────────────

  // Duplicate names (case-insensitive)
  const nameGroups = new Map<string, typeof schools>()
  for (const s of schools) {
    const key = s.display_name.toLowerCase().trim()
    if (!nameGroups.has(key)) nameGroups.set(key, [])
    nameGroups.get(key)!.push(s)
  }
  const dupNameRows = [...nameGroups.values()].filter(g => g.length > 1).flat()
  checks.push(check(
    'schools_duplicate_names', 'Duplicate school names', 'schools',
    dupNameRows,
    s => ({ id: (s as typeof schools[0]).id, display_name: (s as typeof schools[0]).display_name }),
  ))

  // Schools with 0 wrestler entries
  const schoolsNoWrestlers = schools.filter(s => !schoolsWithEntries.has(s.id))
  checks.push(check(
    'schools_no_wrestlers', 'Schools with 0 wrestler entries', 'schools',
    schoolsNoWrestlers,
    s => ({ id: (s as typeof schools[0]).id, display_name: (s as typeof schools[0]).display_name }),
  ))

  // Schools missing logo_url
  const schoolsNoLogo = schools.filter(s => !s.logo_url)
  checks.push(check(
    'schools_no_logo', 'Schools missing logo_url', 'schools',
    schoolsNoLogo,
    s => ({ id: (s as typeof schools[0]).id, display_name: (s as typeof schools[0]).display_name }),
  ))

  // Schools with no conference assignment
  const schoolsNoConf = schools.filter(s => !s.athletic_conference)
  checks.push(check(
    'schools_no_conference', 'Schools with no conference assignment', 'schools',
    schoolsNoConf,
    s => ({ id: (s as typeof schools[0]).id, display_name: (s as typeof schools[0]).display_name }),
  ))

  // Garbage name records
  const garbageSchools = schools.filter(
    s => GARBAGE_NAMES.has(s.display_name) || /\)\s/.test(s.display_name)
  )
  checks.push(check(
    'schools_garbage_names', 'Garbage name records', 'schools',
    garbageSchools,
    s => ({ id: (s as typeof schools[0]).id, display_name: (s as typeof schools[0]).display_name }),
  ))

  // ── WRESTLERS ──────────────────────────────────────────────────────────────

  // Wrestlers with no school association (no entry with a non-null school_id)
  const wrestlersNoSchool = wrestlers.filter(w => {
    const schoolSet = wrestlerSchoolMap.get(w.id)
    return !schoolSet || schoolSet.size === 0
  })
  checks.push(check(
    'wrestlers_no_school', 'Wrestlers with no school association', 'wrestlers',
    wrestlersNoSchool,
    w => { const r = w as typeof wrestlers[0]; return { id: r.id, name: `${r.first_name} ${r.last_name}`, gender: r.gender } },
  ))

  // Wrestlers with no tournament entries at all
  const wrestlersNoEntries = wrestlers.filter(w => !wrestlerHasEntry.has(w.id))
  checks.push(check(
    'wrestlers_no_entries', 'Wrestlers with no tournament entries', 'wrestlers',
    wrestlersNoEntries,
    w => { const r = w as typeof wrestlers[0]; return { id: r.id, name: `${r.first_name} ${r.last_name}`, gender: r.gender } },
  ))

  // Wrestlers spanning 3+ distinct schools
  const wrestlersMultiSchool = wrestlers.filter(w => {
    const schoolSet = wrestlerSchoolMap.get(w.id)
    return schoolSet && schoolSet.size >= 3
  })
  checks.push(check(
    'wrestlers_multi_school', 'Wrestlers with entries at 3+ distinct schools', 'wrestlers',
    wrestlersMultiSchool,
    w => {
      const r = w as typeof wrestlers[0]
      return { id: r.id, name: `${r.first_name} ${r.last_name}`, schools: wrestlerSchoolMap.get(r.id)?.size }
    },
  ))

  // Duplicate wrestlers (same first + last + gender)
  const wrestlerKeyMap = new Map<string, typeof wrestlers>()
  for (const w of wrestlers) {
    const key = `${w.first_name.toLowerCase()}|${w.last_name.toLowerCase()}|${w.gender}`
    if (!wrestlerKeyMap.has(key)) wrestlerKeyMap.set(key, [])
    wrestlerKeyMap.get(key)!.push(w)
  }
  const dupWrestlers = [...wrestlerKeyMap.values()].filter(g => g.length > 1).flat()
  checks.push(check(
    'wrestlers_duplicates', 'Duplicate wrestlers (same name + gender)', 'wrestlers',
    dupWrestlers,
    w => { const r = w as typeof wrestlers[0]; return { id: r.id, name: `${r.first_name} ${r.last_name}`, gender: r.gender } },
  ))

  // Bad graduation year
  const badGradYear = wrestlers.filter(
    w => w.graduation_year != null && (w.graduation_year < 2020 || w.graduation_year > 2030)
  )
  checks.push(check(
    'wrestlers_bad_grad_year', 'Wrestlers with grad year < 2020 or > 2030', 'wrestlers',
    badGradYear,
    w => { const r = w as typeof wrestlers[0]; return { id: r.id, name: `${r.first_name} ${r.last_name}`, grad_year: r.graduation_year } },
  ))

  // ── TOURNAMENT ENTRIES ─────────────────────────────────────────────────────

  // Null school_id
  const entriesNullSchool = entries.filter(e => e.school_id == null)
  checks.push(check(
    'entries_null_school', 'Entries with null school_id', 'entries',
    entriesNullSchool,
    e => { const r = e as typeof entries[0]; return { id: r.id, wrestler_id: r.wrestler_id, tournament_id: r.tournament_id } },
  ))

  // Null wrestler_id (violates NOT NULL, should always be 0)
  const entriesNullWrestler = entries.filter(e => !e.wrestler_id)
  checks.push(check(
    'entries_null_wrestler', 'Entries with null wrestler_id', 'entries',
    entriesNullWrestler,
    e => { const r = e as typeof entries[0]; return { id: r.id, tournament_id: r.tournament_id } },
  ))

  // Invalid weight class
  const entriesInvalidWeight = entries.filter(e => {
    const w = wcWeightMap.get(e.weight_class_id)
    return w == null || !VALID_WEIGHTS.has(w)
  })
  checks.push(check(
    'entries_invalid_weight', 'Entries with invalid weight class', 'entries',
    entriesInvalidWeight,
    e => {
      const r = e as typeof entries[0]
      return { id: r.id, weight_class_id: r.weight_class_id, weight: wcWeightMap.get(r.weight_class_id) ?? 'missing' }
    },
  ))

  // ── STANDINGS ──────────────────────────────────────────────────────────────

  // Conference standings: null school_id or school_id not in schools table
  const confIssues = confStandings.filter(
    cs => cs.school_id == null || !schoolIdSet.has(cs.school_id)
  )
  checks.push(check(
    'standings_conf_bad_school', 'Conference standings: missing or unresolved school_id', 'standings',
    confIssues,
    cs => { const r = cs as typeof confStandings[0]; return { id: r.id, school_name: r.school_name, school_id: r.school_id } },
  ))

  // Precomputed team scores with null school_id
  const precomputedNullSchool = precomputed.filter(p => p.school_id == null)
  checks.push(check(
    'standings_precomputed_null_school', 'Precomputed scores with null school_id', 'standings',
    precomputedNullSchool,
    p => { const r = p as typeof precomputed[0]; return { id: r.id, school_name: r.school_name, tournament_id: r.tournament_id } },
  ))

  // Duplicate school within same tournament in precomputed scores
  const precomputedKeyMap = new Map<string, typeof precomputed>()
  for (const p of precomputed) {
    if (p.school_id == null) continue
    const key = `${p.tournament_id}|${p.school_id}`
    if (!precomputedKeyMap.has(key)) precomputedKeyMap.set(key, [])
    precomputedKeyMap.get(key)!.push(p)
  }
  const precomputedDups = [...precomputedKeyMap.values()].filter(g => g.length > 1).flat()
  checks.push(check(
    'standings_precomputed_dups', 'Duplicate school+tournament in precomputed scores', 'standings',
    precomputedDups,
    p => { const r = p as typeof precomputed[0]; return { id: r.id, school_name: r.school_name, tournament_id: r.tournament_id } },
  ))

  // ── LEADERBOARDS ───────────────────────────────────────────────────────────

  // Placements with null or unmatched entry_id
  const placementsBadEntry = placements.filter(
    p => p.entry_id == null || !entryIdSet.has(p.entry_id)
  )
  checks.push(check(
    'placements_bad_entry', 'Placements with null or unmatched entry_id', 'leaderboards',
    placementsBadEntry,
    p => { const r = p as typeof placements[0]; return { id: r.id, entry_id: r.entry_id, place: r.place, tournament_id: r.tournament_id } },
  ))

  // Placements with invalid weight class
  const placementsInvalidWeight = placements.filter(p => {
    const w = wcWeightMap.get(p.weight_class_id)
    return w == null || !VALID_WEIGHTS.has(w)
  })
  checks.push(check(
    'placements_invalid_weight', 'Placements with invalid weight class', 'leaderboards',
    placementsInvalidWeight,
    p => {
      const r = p as typeof placements[0]
      return { id: r.id, weight_class_id: r.weight_class_id, weight: wcWeightMap.get(r.weight_class_id) ?? 'missing' }
    },
  ))

  // First 5 school IDs for site health school-page checks
  const sampleSchoolIds = schools.slice(0, 5).map(s => s.id)

  return NextResponse.json({ checks, sampleSchoolIds, checkedAt } satisfies DataHealthResponse)
}
