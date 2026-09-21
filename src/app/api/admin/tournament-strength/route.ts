import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, getPreviousSeason } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawG = req.nextUrl.searchParams.get('gender')
  const gender: 'M' | 'F' = rawG === 'F' ? 'F' : 'M'

  const season = await getWorkingSeason(gender)
  const prior = await getPreviousSeason(season)
  const db = createSupabaseAdmin()
  const { data, error } = await db.rpc('tournament_strength_report', {
    p_season: season.label,
    p_postseason_season_id: prior.id,
    p_gender: gender,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [], season: season.label, priorSeason: prior.label })
}
