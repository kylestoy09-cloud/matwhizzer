import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseTeamScoreBlock } from '@/lib/parseRtf'
import { matchSchoolNames } from '@/lib/matchSchools'

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

  const { text, tournament_query } = await req.json()

  const rawScores = parseTeamScoreBlock(text ?? '')
  if (!rawScores.length) {
    return NextResponse.json({ error: 'No team scores found — check the format' }, { status: 400 })
  }

  const scores = await Promise.all(rawScores.map(async s => {
    const m = await matchSchoolNames(s.school_name)
    return {
      place: s.place,
      school_name: s.school_name,
      score: s.score,
      school_id: m.schoolId,
      display_name: m.displayName,
      confidence: m.confidence,
      alternates: m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score })),
    }
  }))

  const client = serviceClient()
  const query = (tournament_query ?? '').trim()
  const [{ data: boysTournaments }, { data: girlsTournaments }] = await Promise.all([
    client.from('in_season_tournaments').select('id, name, start_date, season').ilike('name', `%${query}%`).order('start_date', { ascending: false }).limit(6),
    client.from('in_season_tournaments_girls').select('id, name, start_date, season').ilike('name', `%${query}%`).order('start_date', { ascending: false }).limit(6),
  ])
  const tournaments = [...(boysTournaments ?? []), ...(girlsTournaments ?? [])]
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? ''))
    .slice(0, 6)

  return NextResponse.json({ scores, tournaments })
}
