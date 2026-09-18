import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getSeasonProgress } from '@/lib/season-progress'

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

// GET /api/admin/season-progress?seasonId=X&gender=M
// Omit seasonId to use the is_public_default season for the given gender.
// gender defaults to 'M'.
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw    = req.nextUrl.searchParams.get('seasonId')
  const rawG   = req.nextUrl.searchParams.get('gender')
  const seasonId = raw ? Number(raw) : undefined
  const gender: 'M' | 'F' = rawG === 'F' ? 'F' : 'M'

  try {
    const progress = await getSeasonProgress(seasonId, gender)
    if (!progress) return NextResponse.json({ error: 'Season not found' }, { status: 404 })
    return NextResponse.json(progress)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed' },
      { status: 500 }
    )
  }
}
