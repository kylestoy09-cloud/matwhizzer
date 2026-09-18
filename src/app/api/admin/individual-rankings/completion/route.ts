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

// GET /api/admin/individual-rankings/completion?gender=M&week_id=X
// Returns all completion rows for a week+gender (all weights).
// Used by the client to compute both the master meter and per-weight sub-meters.
// Returns empty rows array when week_id is absent or no rows exist yet.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender  = req.nextUrl.searchParams.get('gender') ?? 'M'
  const weekId  = req.nextUrl.searchParams.get('week_id')

  if (!weekId) return NextResponse.json({ rows: [] })

  const client = createSupabaseAdmin()
  const { data, error } = await client
    .from('individual_ranking_completion')
    .select('weight_class, stage, stage_entity')
    .eq('week_id', weekId)
    .eq('gender', gender)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rows: data ?? [] })
}
