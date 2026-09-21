import { NextResponse } from 'next/server'
import { getWorkingSeason } from '@/lib/season-context'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const GENDER    = 'M'

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const season = await getWorkingSeason(GENDER)
  const SEASON_ID = season.id

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Team playoff dates come from the NJSIAA season calendar (team_playoff_* rows)
  const { data: calRows, error: calErr } = await supabase
    .from('season_calendar')
    .select('event_type, event_date')
    .eq('season_id', SEASON_ID)
    .eq('gender', GENDER)
    .like('event_type', 'team_playoff_%')
  if (calErr) return NextResponse.json({ error: calErr.message }, { status: 500 })
  const dateOf = new Map((calRows ?? []).map(r => [r.event_type as string, r.event_date as string]))
  const ROUND_EVENTS = {
    r12Public:        'team_playoff_r12_public',
    sectionalPublic:  'team_playoff_sectional_final_public',
    stateSfPublic:    'team_playoff_state_sf_public',
    stateFinalPublic: 'team_playoff_state_final_public',
    r12Np:            'team_playoff_r12_np',
    stateSfNp:        'team_playoff_state_sf_np',
    stateFinalNp:     'team_playoff_state_final_np',
  } as const
  const missingRounds = Object.values(ROUND_EVENTS).filter(e => !dateOf.has(e))
  if (missingRounds.length) {
    return NextResponse.json({ error: `Season calendar for ${season.label} is missing team playoff dates: ${missingRounds.join(', ')}` }, { status: 400 })
  }
  const D = Object.fromEntries(
    Object.entries(ROUND_EVENTS).map(([k, e]) => [k, dateOf.get(e)!])
  ) as Record<keyof typeof ROUND_EVENTS, string>
  const PLAYOFF_DATES = [...new Set(Object.values(D))]

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
  const STATE_BRACKET_DATES = new Set([D.stateSfPublic, D.stateFinalPublic])

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
        if (hasMeet(D.r12Public, a, b)) { r1Found++; continue }
        missing.push(`${label}: R1 ${hi}v${lo} not found`)
      }

      // R2: can't predict matchup without knowing R1 results — count R1/R2-day meets in bracket
      const feb16Count = allMeets.filter(m =>
        m.meet_date === D.r12Public &&
        sids.has(Number(m.team1_school_id)) &&
        sids.has(Number(m.team2_school_id))
      ).length
      const r2Found = Math.max(0, feb16Count - r1Found)
      if (r2Found < 2) missing.push(`${label}: R2 — found ${r2Found} of 2 (${D.r12Public})`)

      // Sectional final: exactly 1 match per bracket
      const sectFinalFound = allMeets.some(m =>
        m.meet_date === D.sectionalPublic &&
        sids.has(Number(m.team1_school_id)) &&
        sids.has(Number(m.team2_school_id))
      )
      if (!sectFinalFound) missing.push(`${label}: sectional final not found (${D.sectionalPublic})`)
    }
  }

  // NP-A: check R1
  {
    const seeds = bracketSeeds.get('Non-Public|A')
    if (seeds && seeds.size >= 2) {
      for (const [hi, lo] of NPA_R1_PAIRS) {
        const a = seeds.get(hi), b = seeds.get(lo)
        if (!a || !b) continue
        if (!hasMeet(D.r12Np, a, b)) missing.push(`NP-A: R1 ${hi}v${lo} not found`)
      }
    }
  }

  // NP-B: check prelim + known QF matchups (R1/R2 day)
  {
    const seeds = bracketSeeds.get('Non-Public|B')
    if (seeds && seeds.size >= 2) {
      for (const [hi, lo] of [[8, 9], [4, 5], [3, 6], [2, 7]] as [number, number][]) {
        const a = seeds.get(hi), b = seeds.get(lo)
        if (!a || !b) continue
        if (!hasMeet(D.r12Np, a, b)) missing.push(`NP-B: ${hi}v${lo} not found`)
      }
    }
  }

  // Public state SFs: each group needs 2 cross-section matches
  // Public state finals: each group needs 1 match
  // NP-A SF: 2 matches; NP-A Final: 1 match
  // NP-B SF: 2 matches; NP-B Final: 1 match
  {
    // Build group → school_ids set for cross-section SF/Final detection
    const groupSchools = new Map<string, Set<number>>()
    for (const [sid, bracket] of schoolToBracket) {
      const [section, group] = bracket.split('|')
      if (!PUBLIC_SECTIONS_SET.has(section)) continue
      if (!groupSchools.has(group)) groupSchools.set(group, new Set())
      groupSchools.get(group)!.add(sid)
    }

    const meetsOnStateSF    = allMeets.filter(m => m.meet_date === D.stateSfPublic)
    const meetsOnStateFinal = allMeets.filter(m => m.meet_date === D.stateFinalPublic)

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
        missing.push(`Group ${group}: state SFs — found ${sfCount} of 2 (${D.stateSfPublic})`)
      }

      const finalCount = meetsOnStateFinal.filter(m => {
        const t1 = Number(m.team1_school_id), t2 = Number(m.team2_school_id)
        return schools.has(t1) && schools.has(t2) && isCrossSection(t1, t2)
      }).length

      if (finalCount < 1) {
        missing.push(`Group ${group}: state final — not found (${D.stateFinalPublic})`)
      }
    }

    // NP-A: 2 SFs, 1 final
    {
      const npaSeeds = bracketSeeds.get('Non-Public|A')
      if (npaSeeds && npaSeeds.size >= 2) {
        const npaSchools = new Set(npaSeeds.values())
        const sfCount = allMeets.filter(m =>
          m.meet_date === D.stateSfNp &&
          npaSchools.has(Number(m.team1_school_id)) &&
          npaSchools.has(Number(m.team2_school_id))
        ).length
        if (sfCount < 2) missing.push(`NP-A: state SFs — found ${sfCount} of 2 (${D.stateSfNp})`)

        const finalCount = allMeets.filter(m =>
          m.meet_date === D.stateFinalNp &&
          npaSchools.has(Number(m.team1_school_id)) &&
          npaSchools.has(Number(m.team2_school_id))
        ).length
        if (finalCount < 1) missing.push(`NP-A: state final — not found (${D.stateFinalNp})`)
      }
    }

    // NP-B: 2 SFs, 1 final
    {
      const npbSeeds = bracketSeeds.get('Non-Public|B')
      if (npbSeeds && npbSeeds.size >= 2) {
        const npbSchools = new Set(npbSeeds.values())
        const sfCount = allMeets.filter(m =>
          m.meet_date === D.stateSfNp &&
          npbSchools.has(Number(m.team1_school_id)) &&
          npbSchools.has(Number(m.team2_school_id))
        ).length
        if (sfCount < 2) missing.push(`NP-B: state SFs — found ${sfCount} of 2 (${D.stateSfNp})`)

        const finalCount = allMeets.filter(m =>
          m.meet_date === D.stateFinalNp &&
          npbSchools.has(Number(m.team1_school_id)) &&
          npbSchools.has(Number(m.team2_school_id))
        ).length
        if (finalCount < 1) missing.push(`NP-B: state final — not found (${D.stateFinalNp})`)
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
