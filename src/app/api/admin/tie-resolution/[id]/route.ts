import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: appUser } = await auth.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { winner, gender } = await req.json() as { winner: 'team1' | 'team2'; gender: 'M' | 'F' }
  if (winner !== 'team1' && winner !== 'team2') {
    return NextResponse.json({ error: 'winner must be team1 or team2' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const table = gender === 'F' ? 'dual_meets_girls' : 'dual_meets'

  const { data: meet, error: fetchErr } = await db
    .from(table)
    .select('id, team1_school_id, team2_school_id, team1_score, team2_score')
    .eq('id', id)
    .single()

  if (fetchErr || !meet) return NextResponse.json({ error: 'Meet not found' }, { status: 404 })

  const winnerSchoolId = winner === 'team1' ? meet.team1_school_id : meet.team2_school_id
  const updates =
    winner === 'team1'
      ? { team1_score: (meet.team1_score ?? 0) + 1, criteria_winner_school_id: winnerSchoolId, tiebreaker_pending: false }
      : { team2_score: (meet.team2_score ?? 0) + 1, criteria_winner_school_id: winnerSchoolId, tiebreaker_pending: false }

  const { data, error } = await db.from(table).update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ meet: data })
}
