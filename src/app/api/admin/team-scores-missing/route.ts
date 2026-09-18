import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET /api/admin/team-scores-missing?gender=F
// Returns in_season_tournaments for the given gender that have no team scores yet.
export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = (req.nextUrl.searchParams.get('gender') as 'M' | 'F') ?? 'M'

  const db = createSupabaseAdmin()
  const istTable = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const [tourRes, scoresRes] = await Promise.all([
    db
      .from(istTable)
      .select('id, name, start_date, season')
      .order('start_date', { ascending: false }),
    db
      .from('in_season_tournament_team_scores')
      .select('tournament_id')
      .eq('place', 1),
  ])

  const hasScores = new Set((scoresRes.data ?? []).map(r => r.tournament_id))
  const missing = (tourRes.data ?? []).filter(t => !hasScores.has(t.id))

  return NextResponse.json({ tournaments: missing })
}
