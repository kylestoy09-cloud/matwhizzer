import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/individual-rankings/bootstrap?gender=M
// Returns districts, regions, and seeded week rows for the latest season.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = req.nextUrl.searchParams.get('gender') ?? 'M'
  const client = createSupabaseAdmin()

  const districtTable = gender === 'F' ? 'girls_districts' : 'boys_districts'
  const regionTable   = gender === 'F' ? 'girls_regions'   : 'boys_regions'

  const [distRes, regRes, weekRes] = await Promise.all([
    client.from(districtTable).select('id, name').order('name'),
    client.from(regionTable).select('id, name').order('name'),
    client
      .from('individual_ranking_weeks')
      .select('id, week_number, week_date, season_id')
      .eq('gender', gender)
      .order('week_number'),
  ])

  return NextResponse.json({
    districts: distRes.data ?? [],
    regions:   regRes.data  ?? [],
    weeks:     weekRes.data ?? [],
  })
}
