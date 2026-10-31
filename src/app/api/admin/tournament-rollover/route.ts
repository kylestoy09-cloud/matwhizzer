import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { getWorkingSeason, getPreviousSeason } from '@/lib/season-context'
import type { Gender } from '@/lib/seasons'

export const dynamic = 'force-dynamic'

// Rolls the previous season's tournaments into the season in progress, per gender
async function rolloverSeasons(gender: Gender): Promise<{ prior: string; current: string }> {
  const current = await getWorkingSeason(gender)
  const prior   = await getPreviousSeason(current)
  return { prior: prior.label, current: current.label }
}

// Columns to copy from prior tournament → new tournament record
const COPY_COLS = [
  'name', 'location', 'source_format', 'tournament_type',
  'venue_name', 'venue_address', 'location_school_id',
  'banner_bg', 'banner_fg', 'is_oos', 'podium_depth', 'gender', 'point_value',
] as const

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// GET /api/admin/tournament-rollover
//   ?check=1  → { migrationPending: bool }
//   (no params) → { tournaments: PriorTournament[], currentSeasonIds: string[] }
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()

  // Check if participants table exists
  const { error: tableErr } = await supabase
    .from('in_season_tournament_participants')
    .select('id')
    .limit(1)

  const migrationPending = !!tableErr && (tableErr.code === '42P01' || tableErr.message.includes('does not exist'))

  if (req.nextUrl.searchParams.get('check') === '1') {
    return NextResponse.json({ migrationPending })
  }

  const [boysSeasons, girlsSeasons] = await Promise.all([rolloverSeasons('M'), rolloverSeasons('F')])

  // Fetch prior-season tournaments from both tables
  const SELECT_COLS = COPY_COLS.join(', ') + ', id, start_date, end_date'
  const [{ data: boysTournaments, error: boysErr }, { data: girlsTournaments, error: girlsErr }] = await Promise.all([
    supabase.from('in_season_tournaments').select(SELECT_COLS).eq('season', boysSeasons.prior).order('start_date'),
    supabase.from('in_season_tournaments_girls').select(SELECT_COLS.replace(/\bgender\b,?\s*/g, '')).eq('season', girlsSeasons.prior).order('start_date'),
  ])

  if (boysErr && girlsErr) return NextResponse.json({ error: boysErr.message }, { status: 500 })

  const girlsWithGender = ((girlsTournaments ?? []) as unknown as Record<string, unknown>[]).map(t => ({ ...t, gender: 'F' } as Record<string, unknown>))
  const allTournaments = [...((boysTournaments ?? []) as unknown as Record<string, unknown>[]), ...girlsWithGender]
    .sort((a, b) => String(a.start_date ?? '').localeCompare(String(b.start_date ?? '')))

  // Also fetch which tournaments have already been rolled over (to warn about duplicates)
  const [{ data: existingBoys }, { data: existingGirls }] = await Promise.all([
    supabase.from('in_season_tournaments').select('name').eq('season', boysSeasons.current),
    supabase.from('in_season_tournaments_girls').select('name').eq('season', girlsSeasons.current),
  ])

  const existingNames = new Set([
    ...((existingBoys ?? []) as unknown as { name: string }[]).map(r => r.name.toLowerCase()),
    ...((existingGirls ?? []) as unknown as { name: string }[]).map(r => r.name.toLowerCase()),
  ])

  // ?gender=M|F: one side's tournaments
  const genderParam = req.nextUrl.searchParams.get('gender')
  const rows = genderParam === 'M' || genderParam === 'F'
    ? allTournaments.filter(t => (t.gender ?? 'M') === genderParam)
    : allTournaments

  return NextResponse.json({
    migrationPending,
    seasons: { M: boysSeasons, F: girlsSeasons },
    tournaments: rows.map(t => ({
      id:              t.id,
      name:            t.name,
      gender:          t.gender ?? 'M',
      tournament_type: t.tournament_type ?? null,
      source_format:   t.source_format ?? null,
      is_oos:          t.is_oos ?? false,
      podium_depth:    t.podium_depth ?? 3,
      point_value:     t.point_value ?? null,
      start_date:      t.start_date,
      end_date:        t.end_date ?? null,
      location:        t.location ?? null,
      venue_name:      t.venue_name ?? null,
      venue_address:   t.venue_address ?? null,
      banner_bg:       t.banner_bg ?? null,
      banner_fg:       t.banner_fg ?? null,
      location_school_id: t.location_school_id ?? null,
      alreadyRolledOver: existingNames.has((t.name as string).toLowerCase()),
    })),
  })
}

type RolloverEntry = {
  priorId:      string
  newStartDate: string
  newEndDate?:  string
  schoolNames?: string[]
  // metadata echoed from client
  name:            string
  gender:          string
  tournament_type: string | null
  source_format:   string | null
  is_oos:          boolean
  podium_depth:    number
  point_value:     number | null
  location:        string | null
  venue_name:      string | null
  venue_address:   string | null
  banner_bg:       string | null
  banner_fg:       string | null
  location_school_id: number | null
}

// POST /api/admin/tournament-rollover
// Body: { entries: RolloverEntry[] }
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const entries: RolloverEntry[] = body.entries ?? []

  if (entries.length === 0)
    return NextResponse.json({ error: 'No entries provided' }, { status: 400 })

  const supabase = db()

  // Load all NJ schools for participant matching
  const { data: schoolData } = await supabase
    .from('schools')
    .select('id, display_name, short_name')
    .eq('is_nj', true)

  const schools = (schoolData ?? []) as unknown as { id: number; display_name: string; short_name: string | null }[]
  const byName = new Map<string, number>()
  for (const s of schools) {
    byName.set(s.display_name.toLowerCase(), s.id)
    if (s.short_name) byName.set(s.short_name.toLowerCase(), s.id)
  }

  function matchSchool(name: string): number | null {
    const key = name.trim().toLowerCase()
    if (byName.has(key)) return byName.get(key)!
    // fuzzy: find a school whose name contains the input, or input contains the school name
    for (const [sName, id] of byName) {
      if (sName.includes(key) || key.includes(sName)) return id
    }
    return null
  }

  let created = 0
  let skipped = 0
  let participantsLinked = 0
  const participantsUnmatched: string[] = []
  const withParticipants: string[] = []
  const withoutParticipants: string[] = []

  const [boysSeasons, girlsSeasons] = await Promise.all([rolloverSeasons('M'), rolloverSeasons('F')])

  for (const entry of entries) {
    // Insert new tournament
    const rolloverIsGirls   = entry.gender === 'F'
    const rolloverIstTable  = rolloverIsGirls ? 'in_season_tournaments_girls'             : 'in_season_tournaments'
    const rolloverPartTable = rolloverIsGirls ? 'in_season_tournament_participants_girls'  : 'in_season_tournament_participants'
    const insertRow: Record<string, unknown> = {
      season:     (rolloverIsGirls ? girlsSeasons : boysSeasons).current,
      start_date: entry.newStartDate,
      name:            entry.name,
      tournament_type: entry.tournament_type,
      source_format:   entry.source_format,
      is_oos:          entry.is_oos,
      podium_depth:    entry.podium_depth,
      point_value:     entry.point_value,
      location:        entry.location,
      venue_name:      entry.venue_name,
      venue_address:   entry.venue_address,
      banner_bg:       entry.banner_bg,
      banner_fg:       entry.banner_fg,
      location_school_id: entry.location_school_id,
    }
    // Boys table still has gender column pre-Phase 3 cleanup; girls table has no gender column
    if (!rolloverIsGirls) insertRow.gender = entry.gender
    if (entry.newEndDate) insertRow.end_date = entry.newEndDate

    const { data: newTournament, error: insertErr } = await supabase
      .from(rolloverIstTable)
      .insert(insertRow)
      .select('id')
      .single()

    if (insertErr) {
      // Duplicate name/season — already rolled over; skip gracefully
      skipped++
      continue
    }

    created++
    const newId = (newTournament as { id: string }).id

    // Link participants if provided
    const names = (entry.schoolNames ?? []).map(n => n.trim()).filter(Boolean)
    if (names.length > 0) {
      withParticipants.push(entry.name)
      const participantRows: { in_season_tournament_id: string; school_id: number; added_via: string }[] = []

      for (const name of names) {
        const schoolId = matchSchool(name)
        if (schoolId) {
          participantRows.push({ in_season_tournament_id: newId, school_id: schoolId, added_via: 'rollover_upload' })
        } else {
          participantsUnmatched.push(`${entry.name}: ${name}`)
        }
      }

      if (participantRows.length > 0) {
        await supabase
          .from(rolloverPartTable)
          .insert(participantRows)
          .then(() => { participantsLinked += participantRows.length })
      }
    } else {
      withoutParticipants.push(entry.name)
    }
  }

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'tournament_rollover',
      p_entity_type: 'in_season_tournaments',
      p_entity_id:   null,
      p_details: {
        seasons:             { M: boysSeasons, F: girlsSeasons },
        created,
        skipped,
        participants_linked: participantsLinked,
        with_participants:   withParticipants,
        without_participants: withoutParticipants,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok:                     true,
    created,
    skipped,
    participantsLinked,
    participantsUnmatched,
  })
}
