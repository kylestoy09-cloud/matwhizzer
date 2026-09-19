import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET /api/admin/dual-meets?gender=M[&seasonId=2]
// Returns dual meets filtered by gender and optionally by season.
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender   = req.nextUrl.searchParams.get('gender') as 'M' | 'F' | null
  const seasonId = req.nextUrl.searchParams.get('seasonId')

  const db = createSupabaseAdmin()

  const SELECT = `id, meet_date, team1_score, team2_score,
    team1_school_id, team2_school_id,
    team1:schools!team1_school_id(display_name),
    team2:schools!team2_school_id(display_name)`

  if (gender === 'F') {
    let q = db.from('dual_meets_girls').select(SELECT).order('meet_date', { ascending: true })
    if (seasonId) q = q.eq('season_id', parseInt(seasonId)) as typeof q
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const meets = (data ?? []).map((m: any) => ({
      id:               m.id,
      meet_date:        m.meet_date,
      gender:           'F',
      team1_name:       m.team1?.display_name ?? null,
      team2_name:       m.team2?.display_name ?? null,
      team1_school_id:  m.team1_school_id,
      team2_school_id:  m.team2_school_id,
      team1_score:      m.team1_score ?? null,
      team2_score:      m.team2_score ?? null,
    }))
    return NextResponse.json({ meets })
  }

  let q = db.from('dual_meets').select(SELECT).eq('gender', 'M').order('meet_date', { ascending: true })
  if (seasonId) q = q.eq('season_id', parseInt(seasonId)) as typeof q
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const meets = (data ?? []).map((m: any) => ({
    id:               m.id,
    meet_date:        m.meet_date,
    gender:           'M',
    team1_name:       m.team1?.display_name ?? null,
    team2_name:       m.team2?.display_name ?? null,
    team1_school_id:  m.team1_school_id,
    team2_school_id:  m.team2_school_id,
    team1_score:      m.team1_score ?? null,
    team2_score:      m.team2_score ?? null,
  }))

  return NextResponse.json({ meets })
}

// PATCH /api/admin/dual-meets
// Body: { id, gender, team1_score, team2_score }
export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await auth.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, gender, team1_score, team2_score } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const db    = createSupabaseAdmin()
  const table = gender === 'F' ? 'dual_meets_girls' : 'dual_meets'

  const patch: Record<string, unknown> = {}
  if (team1_score !== undefined) patch.team1_score = team1_score === '' ? null : Number(team1_score)
  if (team2_score !== undefined) patch.team2_score = team2_score === '' ? null : Number(team2_score)

  const { error } = await db.from(table).update(patch).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
