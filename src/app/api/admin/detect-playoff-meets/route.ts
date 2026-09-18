import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const SEASON_ID = 2
const GENDER    = 'M'

const PLAYOFF_DATES = [
  '2026-02-16',  // public R1 + R2
  '2026-02-17',  // NP R1 + QF (incl. NP-B prelim)
  '2026-02-18',  // public sectional finals
  '2026-02-19',  // NP state semis
  '2026-02-20',  // public state semis
  '2026-02-22',  // all state finals
]

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Load confirmed seeds
  const { data: seedRows, error: seedErr } = await supabase
    .from('playoff_seeds')
    .select('seed, school_id, section, classification')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)
    .eq('confirmed', true)

  if (seedErr || !seedRows?.length) {
    return NextResponse.json({ error: 'No confirmed playoff seeds found' }, { status: 400 })
  }

  const PUBLIC_SECTIONS_SET = new Set(['North I', 'North II', 'Central', 'South'])

  // school_id → "section|classification" (for same-bracket sectional + NP matching)
  const schoolToBracket = new Map<number, string>()
  // school_id → classification (for cross-section public state SF/Final matching)
  const schoolToGroup   = new Map<number, string>()
  // bracket key → Map<seed_number, school_id>
  const bracketSeeds    = new Map<string, Map<number, number>>()

  for (const r of seedRows) {
    const key  = `${r.section}|${r.classification}`
    const sid  = Number(r.school_id)
    const seed = Number(r.seed)
    if (!sid) continue

    schoolToBracket.set(sid, key)
    if (PUBLIC_SECTIONS_SET.has(r.section)) schoolToGroup.set(sid, r.classification)
    if (!bracketSeeds.has(key)) bracketSeeds.set(key, new Map())
    bracketSeeds.get(key)!.set(seed, sid)
  }

  // Load all dual meets on playoff dates
  const { data: meetRows } = await supabase
    .from('dual_meets')
    .select('id, team1_school_id, team2_school_id, team1_score, team2_score, meet_date')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)
    .in('meet_date', PLAYOFF_DATES)

  const allMeets = meetRows ?? []

  // State SF/Final dates where cross-section public matches occur
  const STATE_BRACKET_DATES = new Set(['2026-02-20', '2026-02-22'])

  const toTag = new Set<string>()

  for (const m of allMeets) {
    const t1 = Number(m.team1_school_id)
    const t2 = Number(m.team2_school_id)
    if (!t1 || !t2) continue
    const b1 = schoolToBracket.get(t1)
    const b2 = schoolToBracket.get(t2)

    // Same section/classification → sectional match or NP match
    if (b1 && b1 === b2) { toTag.add(m.id as string); continue }

    // Cross-section, same group on a state bracket date → public state SF or Final
    if (STATE_BRACKET_DATES.has(m.meet_date)) {
      const g1 = schoolToGroup.get(t1)
      const g2 = schoolToGroup.get(t2)
      if (g1 && g1 === g2) toTag.add(m.id as string)
    }
  }

  // Write to DB
  let tagged = 0
  if (toTag.size > 0) {
    const { error } = await supabase
      .from('dual_meets')
      .update({ is_playoff: true })
      .in('id', [...toTag])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    tagged = toTag.size
  }

  // Build missing report: which expected R1 matchups weren't found?
  const missing: string[] = []

  const PUBLIC_SECTIONS   = ['North I', 'North II', 'Central', 'South']
  const PUBLIC_GROUPS     = ['1', '2', '3', '4', '5']
  const R1_PAIRS: [number, number][] = [[1, 8], [4, 5], [2, 7], [3, 6]]
  const NPA_R1_PAIRS: [number, number][] = [[4, 13], [5, 12], [6, 11], [7, 10], [8, 9]]

  const hasMeet = (date: string, sidA: number, sidB: number) =>
    allMeets.some(m =>
      m.meet_date === date &&
      ((Number(m.team1_school_id) === sidA && Number(m.team2_school_id) === sidB) ||
       (Number(m.team1_school_id) === sidB && Number(m.team2_school_id) === sidA)),
    )

  // Public brackets: check R1, R2, and sectional final per bracket
  for (const group of PUBLIC_GROUPS) {
    for (const section of PUBLIC_SECTIONS) {
      const seeds = bracketSeeds.get(`${section}|${group}`)
      if (!seeds || seeds.size < 2) continue
      const label  = `${section} G${group}`
      const sids   = new Set(seeds.values())

      // R1: known fixed matchups (1v8, 4v5, 2v7, 3v6)
      let r1Found = 0
      for (const [hi, lo] of R1_PAIRS) {
        const a = seeds.get(hi), b = seeds.get(lo)
        if (!a || !b) continue
        if (hasMeet('2026-02-16', a, b)) { r1Found++; continue }
        missing.push(`${label}: R1 ${hi}v${lo} not found`)
      }

      // R2: can't predict matchup without knowing R1 results — count Feb 16 meets in bracket
      const feb16Count = allMeets.filter(m =>
        m.meet_date === '2026-02-16' &&
        sids.has(Number(m.team1_school_id)) &&
        sids.has(Number(m.team2_school_id))
      ).length
      const r2Found = Math.max(0, feb16Count - r1Found)
      if (r2Found < 2) missing.push(`${label}: R2 — found ${r2Found} of 2 (Feb 16)`)

      // Sectional final (Feb 18): exactly 1 match per bracket
      const sectFinalFound = allMeets.some(m =>
        m.meet_date === '2026-02-18' &&
        sids.has(Number(m.team1_school_id)) &&
        sids.has(Number(m.team2_school_id))
      )
      if (!sectFinalFound) missing.push(`${label}: sectional final not found (Feb 18)`)
    }
  }

  // NP-A: check R1 on Feb 17
  {
    const seeds = bracketSeeds.get('Non-Public|A')
    if (seeds && seeds.size >= 2) {
      for (const [hi, lo] of NPA_R1_PAIRS) {
        const a = seeds.get(hi), b = seeds.get(lo)
        if (!a || !b) continue
        if (!hasMeet('2026-02-17', a, b)) missing.push(`NP-A: R1 ${hi}v${lo} not found`)
      }
    }
  }

  // NP-B: check prelim + known QF matchups on Feb 17
  {
    const seeds = bracketSeeds.get('Non-Public|B')
    if (seeds && seeds.size >= 2) {
      for (const [hi, lo] of [[8, 9], [4, 5], [3, 6], [2, 7]] as [number, number][]) {
        const a = seeds.get(hi), b = seeds.get(lo)
        if (!a || !b) continue
        if (!hasMeet('2026-02-17', a, b)) missing.push(`NP-B: ${hi}v${lo} not found`)
      }
    }
  }

  // Public state SFs (Feb 20): each group needs 2 cross-section matches
  // Public state finals (Feb 22): each group needs 1 match
  // NP-A SF (Feb 19): 2 matches; NP-A Final (Feb 22): 1 match
  // NP-B SF (Feb 19): 2 matches; NP-B Final (Feb 22): 1 match
  {
    // Build group → school_ids set for cross-section SF/Final detection
    const groupSchools = new Map<string, Set<number>>()
    for (const [sid, bracket] of schoolToBracket) {
      const [section, group] = bracket.split('|')
      if (!PUBLIC_SECTIONS_SET.has(section)) continue
      if (!groupSchools.has(group)) groupSchools.set(group, new Set())
      groupSchools.get(group)!.add(sid)
    }

    const meetsOnStateSF    = allMeets.filter(m => m.meet_date === '2026-02-20')
    const meetsOnStateFinal = allMeets.filter(m => m.meet_date === '2026-02-22')

    const isCrossSection = (t1: number, t2: number) => {
      const b1 = schoolToBracket.get(t1), b2 = schoolToBracket.get(t2)
      return b1 && b2 && b1 !== b2
    }

    for (const group of PUBLIC_GROUPS) {
      const schools = groupSchools.get(group)
      if (!schools || schools.size < 2) continue

      const sfCount = meetsOnStateSF.filter(m => {
        const t1 = Number(m.team1_school_id), t2 = Number(m.team2_school_id)
        return schools.has(t1) && schools.has(t2) && isCrossSection(t1, t2)
      }).length

      if (sfCount < 2) {
        missing.push(`Group ${group}: state SFs — found ${sfCount} of 2 (Feb 20)`)
      }

      const finalCount = meetsOnStateFinal.filter(m => {
        const t1 = Number(m.team1_school_id), t2 = Number(m.team2_school_id)
        return schools.has(t1) && schools.has(t2) && isCrossSection(t1, t2)
      }).length

      if (finalCount < 1) {
        missing.push(`Group ${group}: state final — not found (Feb 22)`)
      }
    }

    // NP-A: 2 SFs on Feb 19, 1 final on Feb 22
    {
      const npaSeeds = bracketSeeds.get('Non-Public|A')
      if (npaSeeds && npaSeeds.size >= 2) {
        const npaSchools = new Set(npaSeeds.values())
        const sfCount = allMeets.filter(m =>
          m.meet_date === '2026-02-19' &&
          npaSchools.has(Number(m.team1_school_id)) &&
          npaSchools.has(Number(m.team2_school_id))
        ).length
        if (sfCount < 2) missing.push(`NP-A: state SFs — found ${sfCount} of 2 (Feb 19)`)

        const finalCount = allMeets.filter(m =>
          m.meet_date === '2026-02-22' &&
          npaSchools.has(Number(m.team1_school_id)) &&
          npaSchools.has(Number(m.team2_school_id))
        ).length
        if (finalCount < 1) missing.push(`NP-A: state final — not found (Feb 22)`)
      }
    }

    // NP-B: 2 SFs on Feb 19, 1 final on Feb 22
    {
      const npbSeeds = bracketSeeds.get('Non-Public|B')
      if (npbSeeds && npbSeeds.size >= 2) {
        const npbSchools = new Set(npbSeeds.values())
        const sfCount = allMeets.filter(m =>
          m.meet_date === '2026-02-19' &&
          npbSchools.has(Number(m.team1_school_id)) &&
          npbSchools.has(Number(m.team2_school_id))
        ).length
        if (sfCount < 2) missing.push(`NP-B: state SFs — found ${sfCount} of 2 (Feb 19)`)

        const finalCount = allMeets.filter(m =>
          m.meet_date === '2026-02-22' &&
          npbSchools.has(Number(m.team1_school_id)) &&
          npbSchools.has(Number(m.team2_school_id))
        ).length
        if (finalCount < 1) missing.push(`NP-B: state final — not found (Feb 22)`)
      }
    }
  }

  return NextResponse.json({
    ok:      true,
    tagged,
    missing,
    note: tagged === 0 && toTag.size === 0
      ? 'No new matches to tag — either all are already tagged or no playoff-date meets were found.'
      : `Tagged ${tagged} meet${tagged === 1 ? '' : 's'} as playoff.`,
  })
}
