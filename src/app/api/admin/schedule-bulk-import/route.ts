import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CURRENT_SEASON_ID   = 2
const CURRENT_SEASON_TEXT = '2025-26'

// ── Types ────────────────────────────────────────────────────────────────────

export type CsvRow = {
  reporting_school_id:   string  // raw string from CSV; must parse to int
  reporting_school_name: string
  opponent_id:           string  // blank if untracked
  opponent_name:         string
  meet_date:             string  // YYYY-MM-DD
  gender:                string  // M | F
  event_type:            string  // dual_meet | tournament | '' (auto-detect)
  event_name:            string  // used for tournament matching
  _row_index:            number  // for error reporting
}

export type StagedMeet = {
  key:                  string
  team1_school_id:      number
  team2_school_id:      number | null
  team1_name:           string
  team2_name:           string
  meet_date:            string
  gender:               string
  confirmed_by_both:    boolean
}

export type StagedLink = {
  tournament_id:  string
  tournament_name: string
  school_id:      number
  school_name:    string
  already_linked: boolean
}

export type FlaggedItem = {
  key:         string
  reason:      'single_sided_tracked' | 'unmatched_tournament'
  message:     string
  schools:     string[]
  meet_date:   string
  gender:      string
}

// ── Auth ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeDate(raw: string): string | null {
  if (!raw) return null
  // YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  // M/D/YYYY or MM/DD/YYYY
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`
  return null
}

function meetKey(id1: number, id2: number | null, date: string, gender: string) {
  const s = id2 === null ? `unk-${id2}` : `${Math.min(id1, id2)}-${Math.max(id1, id2)}`
  return `${s}|${date}|${gender}`
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
}

function fuzzyMatchTournament(
  text: string,
  tournaments: { id: string; name: string; gender: string }[],
  gender: string,
): { id: string; name: string } | null {
  const norm = normalizeName(text)
  if (!norm) return null
  // Filter by gender first (or accept ungendered entry as M by default)
  const candidates = tournaments.filter(t => t.gender === gender || gender === '')
  // Exact match
  for (const t of candidates) {
    if (normalizeName(t.name) === norm) return { id: t.id, name: t.name }
  }
  // Contains match
  for (const t of candidates) {
    const tn = normalizeName(t.name)
    if (tn.includes(norm) || norm.includes(tn)) return { id: t.id, name: t.name }
  }
  return null
}

function isTournamentRow(row: CsvRow, tournaments: { id: string; name: string; gender: string }[]): boolean {
  const et = row.event_type.toLowerCase()
  if (et === 'tournament' || et === 't') return true
  if (et === 'dual_meet' || et === 'dual' || et === 'd') return false
  // Auto-detect: if event_name or opponent_name fuzzy-matches a tournament
  const text = row.event_name || row.opponent_name
  if (text && fuzzyMatchTournament(text, tournaments, row.gender || 'M')) return true
  return false
}

function matchSchool(
  idRaw: string,
  nameRaw: string,
  byId: Map<number, string>,
  byName: Map<string, number>,
): { id: number; name: string } | null {
  const numId = parseInt(idRaw, 10)
  if (!isNaN(numId) && byId.has(numId)) return { id: numId, name: byId.get(numId)! }
  if (nameRaw) {
    const key = nameRaw.trim().toLowerCase()
    if (byName.has(key)) {
      const id = byName.get(key)!
      return { id, name: byId.get(id) ?? nameRaw }
    }
    // fuzzy
    for (const [sName, id] of byName) {
      if (sName.includes(key) || key.includes(sName)) return { id, name: byId.get(id) ?? nameRaw }
    }
  }
  return null
}

// ── Stage ─────────────────────────────────────────────────────────────────────

async function handleStage(rows: CsvRow[], supabase: ReturnType<typeof db>) {
  // Load reference data
  const { data: schoolData } = await supabase
    .from('schools')
    .select('id, display_name, short_name')
    .eq('is_nj', true)

  const schoolRows = (schoolData ?? []) as unknown as { id: number; display_name: string; short_name: string | null }[]
  const byId   = new Map<number, string>()
  const byName = new Map<string, number>()
  for (const s of schoolRows) {
    byId.set(s.id, s.display_name)
    byName.set(s.display_name.toLowerCase(), s.id)
    if (s.short_name) byName.set(s.short_name.toLowerCase(), s.id)
  }

  const [{ data: boysTournamentData }, { data: girlsTournamentData }] = await Promise.all([
    supabase.from('in_season_tournaments').select('id, name').eq('season', CURRENT_SEASON_TEXT),
    (supabase as any).from('in_season_tournaments_girls').select('id, name').eq('season', CURRENT_SEASON_TEXT),
  ])

  const tournaments: { id: string; name: string; gender: string }[] = [
    ...((boysTournamentData ?? []) as unknown as { id: string; name: string }[]).map(t => ({ ...t, gender: 'M' })),
    ...((girlsTournamentData ?? []) as unknown as { id: string; name: string }[]).map(t => ({ ...t, gender: 'F' })),
  ]

  // Load existing dual meets for current season (boys from dual_meets, girls from dual_meets_girls)
  const [{ data: existingBoysData }, { data: existingGirlsData }] = await Promise.all([
    supabase.from('dual_meets').select('team1_school_id, team2_school_id, meet_date').eq('season_id', CURRENT_SEASON_ID),
    supabase.from('dual_meets_girls').select('team1_school_id, team2_school_id, meet_date').eq('season_id', CURRENT_SEASON_ID),
  ])

  const existingMeets = new Set<string>()
  for (const m of (existingBoysData ?? []) as unknown as { team1_school_id: number; team2_school_id: number; meet_date: string }[]) {
    existingMeets.add(meetKey(m.team1_school_id, m.team2_school_id, m.meet_date, 'M'))
    existingMeets.add(meetKey(m.team2_school_id, m.team1_school_id, m.meet_date, 'M'))
  }
  for (const m of (existingGirlsData ?? []) as unknown as { team1_school_id: number; team2_school_id: number; meet_date: string }[]) {
    existingMeets.add(meetKey(m.team1_school_id, m.team2_school_id, m.meet_date, 'F'))
    existingMeets.add(meetKey(m.team2_school_id, m.team1_school_id, m.meet_date, 'F'))
  }

  // Load existing tournament participants (check if already linked)
  const { data: existingParticipants } = await supabase
    .from('in_season_tournament_participants')
    .select('in_season_tournament_id, school_id')

  const existingLinks = new Set<string>()
  for (const p of (existingParticipants ?? []) as unknown as { in_season_tournament_id: string; school_id: number }[]) {
    existingLinks.add(`${p.in_season_tournament_id}|${p.school_id}`)
  }

  // Process each row
  const meetGroups = new Map<string, { row: CsvRow; reportingId: number; reportingName: string; opponentId: number | null; opponentName: string }[]>()
  const tournamentLinks: StagedLink[] = []
  const flagged: FlaggedItem[] = []
  const parseErrors: string[] = []

  for (const row of rows) {
    const gender = (row.gender || 'M').toUpperCase()
    const date = normalizeDate(row.meet_date)
    if (!date) {
      parseErrors.push(`Row ${row._row_index}: invalid date "${row.meet_date}"`)
      continue
    }

    const reporting = matchSchool(row.reporting_school_id, row.reporting_school_name, byId, byName)
    if (!reporting) {
      parseErrors.push(`Row ${row._row_index}: could not match reporting school "${row.reporting_school_name || row.reporting_school_id}"`)
      continue
    }

    if (isTournamentRow(row, tournaments)) {
      const text = row.event_name || row.opponent_name
      const match = text ? fuzzyMatchTournament(text, tournaments, gender) : null
      if (match) {
        const linkKey = `${match.id}|${reporting.id}`
        const alreadyLinked = existingLinks.has(linkKey)
        // Avoid duplicate links within this batch
        if (!tournamentLinks.some(l => l.tournament_id === match.id && l.school_id === reporting.id)) {
          tournamentLinks.push({
            tournament_id:   match.id,
            tournament_name: match.name,
            school_id:       reporting.id,
            school_name:     reporting.name,
            already_linked:  alreadyLinked,
          })
        }
      } else {
        const text2 = row.event_name || row.opponent_name
        flagged.push({
          key:      `tournament|${reporting.id}|${date}|${gender}`,
          reason:   'unmatched_tournament',
          message:  `"${text2 || '(no name)'}" doesn't match any 2025-26 tournament`,
          schools:  [reporting.name],
          meet_date: date,
          gender,
        })
      }
      continue
    }

    // Dual meet row
    const opponent = matchSchool(row.opponent_id, row.opponent_name, byId, byName)
    const opponentId   = opponent?.id   ?? null
    const opponentName = opponent?.name ?? row.opponent_name ?? 'Unknown'

    const key = opponentId !== null
      ? meetKey(reporting.id, opponentId, date, gender)
      : `untracked|${reporting.id}|${opponentName.toLowerCase()}|${date}|${gender}`

    if (!meetGroups.has(key)) meetGroups.set(key, [])
    meetGroups.get(key)!.push({ row, reportingId: reporting.id, reportingName: reporting.name, opponentId, opponentName })
  }

  const crossConfirmed:    StagedMeet[] = []
  const untrackedOpponent: StagedMeet[] = []
  let skippedExisting = 0

  for (const [key, group] of meetGroups) {
    const { reportingId, reportingName, opponentId, opponentName, row } = group[0]
    const date   = normalizeDate(row.meet_date)!
    const gender = (row.gender || 'M').toUpperCase()

    // Check if already in DB
    if (opponentId !== null && (existingMeets.has(meetKey(reportingId, opponentId, date, gender)))) {
      skippedExisting++
      continue
    }

    if (opponentId === null) {
      // Untracked opponent — one row is normal, auto-create
      untrackedOpponent.push({
        key,
        team1_school_id:   Math.min(reportingId, reportingId),
        team2_school_id:   null,
        team1_name:        reportingName,
        team2_name:        opponentName,
        meet_date:         date,
        gender,
        confirmed_by_both: false,
      })
    } else if (group.length >= 2) {
      // Both schools reported it — cross-confirmed
      const t1 = Math.min(reportingId, opponentId)
      const t2 = Math.max(reportingId, opponentId)
      crossConfirmed.push({
        key,
        team1_school_id:   t1,
        team2_school_id:   t2,
        team1_name:        byId.get(t1) ?? reportingName,
        team2_name:        byId.get(t2) ?? opponentName,
        meet_date:         date,
        gender,
        confirmed_by_both: true,
      })
    } else {
      // Single-sided vs tracked school — flag for review
      flagged.push({
        key,
        reason:   'single_sided_tracked',
        message:  `Only ${reportingName} listed this match (opponent ${opponentName} hasn't submitted yet)`,
        schools:  [reportingName, opponentName],
        meet_date: date,
        gender,
      })
    }
  }

  return NextResponse.json({
    crossConfirmed,
    untrackedOpponent,
    tournamentLinks,
    flagged,
    parseErrors,
    totals: {
      autoCreate:      crossConfirmed.length + untrackedOpponent.length,
      tournament:      tournamentLinks.filter(l => !l.already_linked).length,
      flagged:         flagged.length,
      skippedExisting,
    },
  })
}

// ── Commit ────────────────────────────────────────────────────────────────────

async function handleCommit(
  body: {
    crossConfirmed:    StagedMeet[]
    untrackedOpponent: StagedMeet[]
    tournamentLinks:   StagedLink[]
  },
  email: string,
  supabase: ReturnType<typeof db>,
) {
  const allMeets = [
    ...(body.crossConfirmed    ?? []).map(m => ({ ...m, confirmed_by_both: true  })),
    ...(body.untrackedOpponent ?? []).map(m => ({ ...m, confirmed_by_both: false })),
  ]

  let created = 0
  let skipped = 0
  const errors: string[] = []

  for (const meet of allMeets) {
    const t1 = meet.team2_school_id !== null
      ? Math.min(meet.team1_school_id, meet.team2_school_id)
      : meet.team1_school_id
    const t2 = meet.team2_school_id !== null
      ? Math.max(meet.team1_school_id, meet.team2_school_id)
      : null

    const t1Name = meet.team1_school_id === t1 ? meet.team1_name : meet.team2_name
    const t2Name = meet.team1_school_id === t1 ? meet.team2_name : meet.team1_name

    const insertTable = meet.gender === 'F' ? 'dual_meets_girls' : 'dual_meets'
    const insertPayload: Record<string, unknown> = {
      season_id:                  CURRENT_SEASON_ID,
      team1_school_id:            t1,
      team2_school_id:            t2,
      team1_school_name_raw:      t1Name,
      team2_school_name_raw:      t2Name,
      meet_date:                  meet.meet_date,
      status:                     'scheduled',
      confirmed_by_both_schools:  meet.confirmed_by_both,
      schedule_source:            'bulk_schedule_import',
    }
    if (meet.gender !== 'F') insertPayload.gender = meet.gender
    const { error } = await supabase
      .from(insertTable)
      .insert(insertPayload)

    if (error) {
      if (error.code === '23505') {
        skipped++  // unique constraint — already exists
      } else {
        errors.push(`${t1Name} vs ${t2Name} on ${meet.meet_date}: ${error.message}`)
      }
    } else {
      created++
    }
  }

  // Tournament participant links (skip already_linked)
  const newLinks = (body.tournamentLinks ?? []).filter(l => !l.already_linked)
  let tournamentLinked = 0

  if (newLinks.length > 0) {
    for (const l of newLinks) {
      const { error } = await supabase
        .from('in_season_tournament_participants')
        .insert({
          in_season_tournament_id: l.tournament_id,
          school_id:               l.school_id,
          added_via:               'schedule_import',
        })
      if (!error) tournamentLinked++
      // ignore 23505 unique constraint violations silently
    }
  }

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'bulk_schedule_import',
      p_entity_type: 'dual_meets',
      p_entity_id:   null,
      p_details: {
        season:           CURRENT_SEASON_TEXT,
        meets_created:    created,
        meets_skipped:    skipped,
        tournament_links: tournamentLinked,
        errors:           errors.length,
      },
    })
  } catch { /* non-fatal */ }

  if (errors.length > 0 && created === 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({ ok: true, created, skipped, tournamentLinked, errors })
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const supabase = db()

  if (action === 'stage') return handleStage(body.rows ?? [], supabase)
  if (action === 'commit') return handleCommit(body, email, supabase)

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
