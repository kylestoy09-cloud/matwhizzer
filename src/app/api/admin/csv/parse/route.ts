// POST /api/admin/csv/parse
// Parses a TournamentWrestling CSV export, runs school + wrestler matching,
// and returns flags for review — same shape as the RTF match route.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'
import { parseCsvBouts } from '@/lib/parseCsvBouts'
import { matchSchoolNames, clearSchoolCache } from '@/lib/matchSchools'
import { clearWrestlerCache } from '@/lib/matchWrestlers'
import { matchTournament } from '@/lib/matchTournaments'
import { seasonIdForDate } from '@/lib/seasons'
import type { SchoolFlag, WrestlerFlag } from '@/app/admin/[side]/import-rtf/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// Parse "D. Butenewicz" → initial='D', lastName='Butenewicz'
function parseInitialName(raw: string): { initial: string; lastName: string } {
  const m = raw.trim().match(/^([A-Za-z])\.?\s+(.+)$/)
  if (m) return { initial: m[1].toUpperCase(), lastName: m[2].trim() }
  return { initial: '', lastName: raw.trim() }
}

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let csvText: string
  let tournamentName: string
  let startDate: string
  let endDate: string | null
  let gender: 'M' | 'F'
  try {
    const body = await req.json()
    csvText       = body.csvText
    tournamentName = body.tournamentName
    startDate     = body.startDate
    endDate       = body.endDate ?? null
    gender        = body.gender ?? 'M'
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  const SEASON    = (await getWorkingSeason(parseGender(gender))).label
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'

  if (!csvText?.trim()) return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 })
  if (!tournamentName?.trim()) return NextResponse.json({ error: 'Tournament name is required' }, { status: 400 })
  if (!startDate?.trim()) return NextResponse.json({ error: 'Start date is required' }, { status: 400 })

  const { bouts, seeds } = parseCsvBouts(csvText)
  if (bouts.length === 0) return NextResponse.json({ error: 'No bouts found in CSV. Check that the file has the expected header: weight,match,round,result,seed1,name1,team1,score1,seed2,name2,team2,score2' }, { status: 400 })

  const client = serviceClient()
  clearSchoolCache()
  clearWrestlerCache()

  // ── School matching ────────────────────────────────────────────────────────
  const allSchoolRaws = new Set<string>()
  for (const b of bouts) {
    allSchoolRaws.add(b.winner_school)
    allSchoolRaws.add(b.loser_school)
  }

  type ResolvedSchool = {
    school_id: number | null
    display_name: string | null
    confidence: string
    alternates: SchoolFlag['alternates']
  }

  const schoolCache = new Map<string, ResolvedSchool>()
  // Season-aware so co-op member names resolve to that season's program
  const matchOpts = { gender, seasonId: seasonIdForDate(startDate) }
  for (const raw of allSchoolRaws) {
    const m = await matchSchoolNames(raw, matchOpts)
    schoolCache.set(raw, {
      school_id: m.schoolId,
      display_name: m.displayName,
      confidence: m.confidence,
      alternates: m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score, is_oos: a.isOos })),
    })
  }

  // ── School flags — only surface schools that need admin review ────────────
  const boutCountBySchool = new Map<string, number>()
  for (const b of bouts) {
    for (const raw of [b.winner_school, b.loser_school]) {
      boutCountBySchool.set(raw, (boutCountBySchool.get(raw) ?? 0) + 1)
    }
  }

  const school_flags: SchoolFlag[] = []
  for (const [raw, r] of schoolCache) {
    if (r.confidence === 'exact' || r.confidence === 'oos' || r.confidence === 'skip') continue
    school_flags.push({
      raw,
      confidence: r.confidence as SchoolFlag['confidence'],
      school_id: r.school_id,
      display_name: r.display_name,
      alternates: r.alternates,
      bout_count: boutCountBySchool.get(raw) ?? 0,
    })
  }

  // ── Wrestler matching — initial-aware ─────────────────────────────────────
  // Collect unique (name, school_raw, weight) combos across all bouts
  type WrestlerKey = `${string}|${string}|${number}`
  const uniqueWrestlers = new Map<WrestlerKey, { name: string; school_raw: string; weight: number }>()
  for (const b of bouts) {
    const wKey = `${b.winner_name}|${b.winner_school}|${b.weight}` as WrestlerKey
    const lKey = `${b.loser_name}|${b.loser_school}|${b.weight}` as WrestlerKey
    if (!uniqueWrestlers.has(wKey)) uniqueWrestlers.set(wKey, { name: b.winner_name, school_raw: b.winner_school, weight: b.weight })
    if (!uniqueWrestlers.has(lKey)) uniqueWrestlers.set(lKey, { name: b.loser_name, school_raw: b.loser_school, weight: b.weight })
  }

  // For each unique wrestler, do initial-aware matching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = client as any

  const wrestlerFlags: WrestlerFlag[] = []
  // Only flag wrestlers from NJ schools (school_id not null, not OOS)
  for (const [key, { name, school_raw, weight }] of uniqueWrestlers) {
    const school = schoolCache.get(school_raw)
    const school_id = school?.school_id ?? null
    const is_oos = school?.confidence === 'oos'

    if (!school_id) continue  // Unknown school — skip wrestler matching

    const { initial, lastName } = parseInitialName(name)
    const flagKey = `${name}|${school_id}|${weight}`

    if (!initial || !lastName) {
      // Can't parse name — mark as new
      wrestlerFlags.push({
        key: flagKey,
        raw_name: name,
        school_raw,
        school_id,
        weight_class: weight,
        confidence: 'none',
        is_new: true,
        is_oos,
        wrestler_id: null,
        display_name: null,
        alternates: [],
      })
      continue
    }

    // Query by last name + gender (primary)
    const { data: candidates } = await db
      .from('wrestlers')
      .select('id, first_name, last_name, gender')
      .ilike('last_name', lastName)
      .eq('gender', gender)
      .limit(50)

    const typed = (candidates ?? []) as { id: string; first_name: string; last_name: string; gender: string }[]

    // Filter to exact last name match (case-insensitive) + first name starts with initial
    let matched = typed.filter(w =>
      w.last_name.toLowerCase() === lastName.toLowerCase() &&
      w.first_name.toUpperCase().startsWith(initial)
    )

    // If no gender-correct match found, check for same-name wrestlers with a different gender
    // (handles wrestlers created under the wrong gender by a previous import).
    // Return them as low-confidence so the admin can review rather than creating duplicates.
    if (matched.length === 0) {
      const { data: anyGender } = await db
        .from('wrestlers')
        .select('id, first_name, last_name, gender')
        .ilike('last_name', lastName)
        .neq('gender', gender)
        .limit(50)
      const anyTyped = (anyGender ?? []) as { id: string; first_name: string; last_name: string; gender: string }[]
      matched = anyTyped.filter(w =>
        w.last_name.toLowerCase() === lastName.toLowerCase() &&
        w.first_name.toUpperCase().startsWith(initial)
      )
    }

    if (matched.length === 0) {
      wrestlerFlags.push({
        key: flagKey,
        raw_name: name,
        school_raw,
        school_id,
        weight_class: weight,
        confidence: 'none',
        is_new: true,
        is_oos,
        wrestler_id: null,
        display_name: null,
        alternates: [],
      })
    } else if (matched.length === 1) {
      // Single match — high confidence
      wrestlerFlags.push({
        key: flagKey,
        raw_name: name,
        school_raw,
        school_id,
        weight_class: weight,
        confidence: 'high',
        is_new: false,
        is_oos,
        wrestler_id: matched[0].id,
        display_name: `${matched[0].first_name} ${matched[0].last_name}`,
        alternates: [],
      })
    } else {
      // Multiple matches — low confidence, show all as alternates
      wrestlerFlags.push({
        key: flagKey,
        raw_name: name,
        school_raw,
        school_id,
        weight_class: weight,
        confidence: 'low',
        is_new: false,
        is_oos,
        wrestler_id: matched[0].id,
        display_name: `${matched[0].first_name} ${matched[0].last_name}`,
        alternates: matched.slice(1).map(w => ({
          wrestler_id: w.id,
          display_name: `${w.first_name} ${w.last_name}`,
          score: 80,
        })),
      })
    }
  }

  // ── Tournament existence check ─────────────────────────────────────────────
  const { data: existingTournaments } = await db
    .from(istTable)
    .select('id, name, start_date')
    .eq('season', SEASON)

  const tournamentCandidates = (existingTournaments ?? []).map((r: { id: string; name: string; start_date: string | null }) => ({
    id: r.id,
    name: r.name,
    start_date: r.start_date,
  }))

  const exactRow = (existingTournaments ?? []).find(
    (r: { name: string }) => r.name.toLowerCase() === tournamentName.toLowerCase()
  ) as { id: string; name: string } | undefined

  let existing_id: string | null = exactRow?.id ?? null
  let has_existing_bouts = false

  if (!existing_id) {
    const { best } = matchTournament(tournamentName, tournamentCandidates)
    if (best && (best.confidence === 'exact' || best.confidence === 'high')) {
      existing_id = best.tournament_id
    }
  }

  if (existing_id) {
    const bq = await db
      .from(boutTable)
      .select('id', { count: 'exact', head: true })
      .eq('in_season_tournament_id', existing_id)
    has_existing_bouts = (bq.count ?? 0) > 0
  }

  // Only return wrestler flags that need review: new wrestlers or low confidence
  const wrestler_flags = wrestlerFlags.filter(
    f => f.is_new || f.confidence === 'low' || f.confidence === 'none'
  )

  return NextResponse.json({
    bouts,
    seeds,
    school_flags,
    wrestler_flags,
    all_wrestler_matches: wrestlerFlags,  // full list used by save route logic
    existing_id,
    has_existing_bouts,
    bout_count: bouts.length,
    seed_count: seeds.length,
    school_count: allSchoolRaws.size,
  })
}
