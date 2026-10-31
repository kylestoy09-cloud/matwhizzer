import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'
import { parseRtfText, parseDateRange } from '@/lib/parseRtf'
import { matchTournament } from '@/lib/matchTournaments'
import type { TournamentSummary } from '@/app/admin/[side]/import-rtf/types'

export const dynamic = 'force-dynamic'


function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string
  let year: number
  let gender: string | undefined
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
    gender = body.gender
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  const SEASON    = (await getWorkingSeason(parseGender(gender))).label
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'

  const parsed = parseRtfText(text)
  if (!parsed.length) {
    const lines = text.split('\n').map((l: string) => l.trim()).filter(Boolean)
    const isRtf = lines[0]?.startsWith('{\\rtf') || lines[0]?.startsWith('\\rtf')
    const preview = lines.slice(0, 5).map((l: string) => l.slice(0, 120)).join('\n')
    const hint = isRtf
      ? 'The pasted content looks like raw RTF markup. Convert it first:\n  textutil -convert txt -stdout "file.rtf" | pbcopy'
      : `No tournament header found. Add one as the first line:\n  Doc Buchanan - 12/27/2025\n\nThen paste the bout lines beneath it. Supported formats:\n  • TrackWrestling RTF (full bracket or school tracking)\n  • Clean text ("NNN lbs - Round Name, School over Name, School, Result")\n\nFirst lines received:\n${preview || '(empty)'}`
    return NextResponse.json({ error: hint, tournaments: [] })
  }

  const client = serviceClient()

  // Load all existing tournaments for fuzzy matching
  let tournamentQuery = client
    .from(istTable)
    .select('id, name, start_date')
    .eq('season', SEASON)
  const { data: existingTournaments } = await tournamentQuery
  const tournamentCandidates = (existingTournaments ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    start_date: r.start_date as string | null,
  }))

  const summaries: TournamentSummary[] = []

  // Batch existence check: one query for all tournament names instead of N serial round trips.
  // Also filters by gender (fixing the bug where a boys tournament matched a girls parse).
  const tournamentNames = parsed.map(t => t.name)
  let existingBatchQuery = client
    .from(istTable)
    .select('id, name')
    .in('name', tournamentNames)
    .eq('season', SEASON)
  const { data: existingBatchRows } = await existingBatchQuery
  const existingIdByName = new Map((existingBatchRows ?? []).map(r => [r.name as string, r.id as string]))

  // Batch bout-count check: parallel queries for all matched IDs.
  const matchedIds = [...existingIdByName.values()]
  const boutCountById = new Map<string, number>()
  if (matchedIds.length > 0) {
    await Promise.all(matchedIds.map(async id => {
      const bq = await client
        .from(boutTable)
        .select('id', { count: 'exact', head: true })
        .eq('in_season_tournament_id', id)
      boutCountById.set(id, bq.count ?? 0)
    }))
  }

  for (const t of parsed) {
    const [start_date, end_date] = parseDateRange(t.date_raw, year)
    const existing_id = existingIdByName.get(t.name) ?? null
    const has_bouts = existing_id ? (boutCountById.get(existing_id) ?? 0) > 0 : false

    const { best, alternates } = matchTournament(t.name, tournamentCandidates)

    summaries.push({
      name: t.name,
      date_raw: t.date_raw,
      start_date,
      end_date,
      source_format: t.source_format,
      tournament_type: 'inside',
      bout_count: t.bout_count,
      placement_count: t.placement_count,
      team_score_count: t.team_score_count,
      existing_id,
      has_existing_bouts: has_bouts,
      venue_name: t.venue_name,
      venue_address: t.venue_address,
      tournament_match: best,
      tournament_alternates: alternates,
    })
  }

  return NextResponse.json({ tournaments: summaries })
}
