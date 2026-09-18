import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

function boutPoints(resultType: string): number {
  switch (resultType) {
    case 'Fall':
    case 'Forfeit':
    case 'DQ':
    case 'M. For.':
      return 6
    case 'TF':
      return 5
    case 'MD':
      return 4
    default:
      // Dec, SV-1, UTB, TB-1, TB-2, OT and anything else decisioned
      return 3
  }
}

export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournament_id, gender } = await req.json()
  if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'

  // Fetch all non-BYE bouts for this tournament
  const { data: bouts, error: boutsErr } = await db
    .from(boutTable)
    .select('result_type, wrestler1_school_id, wrestler2_school_id, wrestler1_school_raw, wrestler2_school_raw')
    .eq('in_season_tournament_id', tournament_id)
    .neq('result_type', 'BYE')

  if (boutsErr) return NextResponse.json({ error: boutsErr.message }, { status: 500 })
  if (!bouts || bouts.length === 0) {
    return NextResponse.json({ error: 'No bouts found for this tournament' }, { status: 400 })
  }

  // Fetch display names for all NJ school IDs
  const schoolIds = [...new Set(
    bouts.flatMap(b => [b.wrestler1_school_id, b.wrestler2_school_id]).filter(Boolean) as number[]
  )]
  const schoolNameMap = new Map<number, string>()
  if (schoolIds.length > 0) {
    const { data: schools } = await db
      .from('schools')
      .select('id, display_name')
      .in('id', schoolIds)
    for (const s of schools ?? []) schoolNameMap.set(s.id, s.display_name)
  }

  // Accumulate points per school
  type SchoolEntry = { school_id: number | null; school_name: string; points: number }
  const schoolMap = new Map<string, SchoolEntry>()

  function entryKey(schoolId: number | null, schoolRaw: string): string {
    return schoolId != null ? `id:${schoolId}` : `name:${schoolRaw}`
  }

  function ensureSchool(schoolId: number | null, schoolRaw: string | null) {
    const name = schoolId != null
      ? (schoolNameMap.get(schoolId) ?? schoolRaw ?? 'Unknown')
      : (schoolRaw ?? 'Unknown')
    const k = entryKey(schoolId, name)
    if (!schoolMap.has(k)) {
      schoolMap.set(k, { school_id: schoolId, school_name: name, points: 0 })
    }
    return k
  }

  for (const bout of bouts) {
    const pts = boutPoints(bout.result_type)
    // winner (wrestler1) earns points
    const winnerKey = ensureSchool(bout.wrestler1_school_id, bout.wrestler1_school_raw)
    schoolMap.get(winnerKey)!.points += pts
    // loser (wrestler2) earns 0 but must appear in standings
    ensureSchool(bout.wrestler2_school_id, bout.wrestler2_school_raw)
  }

  // Sort by points descending, assign place (ties get the same place)
  const sorted = [...schoolMap.values()].sort((a, b) => b.points - a.points)
  let place = 1
  const rows = sorted.map((entry, i) => {
    if (i > 0 && sorted[i - 1].points !== entry.points) place = i + 1
    return {
      tournament_id,
      place,
      school_name: entry.school_name,
      school_id: entry.school_id,
      score: entry.points,
    }
  })

  // Replace existing scores
  await db.from('in_season_tournament_team_scores').delete().eq('tournament_id', tournament_id)

  const { data: inserted, error: insertErr } = await db
    .from('in_season_tournament_team_scores')
    .insert(rows)
    .select('id')

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  return NextResponse.json({ inserted: inserted?.length ?? 0, scores: rows })
}
