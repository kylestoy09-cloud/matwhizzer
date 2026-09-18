import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

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

  const { tournament_id, scores } = await req.json()
  if (!tournament_id || !Array.isArray(scores) || !scores.length) {
    return NextResponse.json({ error: 'Missing tournament_id or scores' }, { status: 400 })
  }

  const client = serviceClient()

  await client.from('in_season_tournament_team_scores').delete().eq('tournament_id', tournament_id)

  const rows = scores.map((s: { place: number; school_name: string; score: number; school_id: number | null }) => ({
    tournament_id,
    place: s.place,
    school_name: s.school_name,
    school_id: s.school_id ?? null,
    score: s.score,
  }))

  const { data, error } = await client
    .from('in_season_tournament_team_scores')
    .insert(rows)
    .select('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ inserted: data?.length ?? 0 })
}
