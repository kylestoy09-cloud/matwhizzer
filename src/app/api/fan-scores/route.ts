import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fan_score: null })

  const dual_meet_id = req.nextUrl.searchParams.get('dual_meet_id')
  if (!dual_meet_id) return NextResponse.json({ fan_score: null })

  const { data } = await supabase
    .from('fan_scores')
    .select('*')
    .eq('user_id', user.id)
    .eq('dual_meet_id', dual_meet_id)
    .maybeSingle()

  return NextResponse.json({ fan_score: data ?? null })
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  const { dual_meet_id, bouts, team_a_score, team_b_score, finalize } = body

  if (typeof dual_meet_id !== 'string' || !UUID.test(dual_meet_id)) {
    return NextResponse.json({ error: 'dual_meet_id must be a meet id' }, { status: 400 })
  }
  if (bouts !== undefined && !Array.isArray(bouts)) {
    return NextResponse.json({ error: 'bouts must be a list' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const payload: Record<string, unknown> = {
    user_id: user.id,
    dual_meet_id,
    bouts: bouts ?? [],
    team_a_score: team_a_score ?? null,
    team_b_score: team_b_score ?? null,
    updated_at: now,
  }
  if (finalize) payload.finalized_at = now

  const { data, error } = await supabase
    .from('fan_scores')
    .upsert(payload, { onConflict: 'user_id,dual_meet_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ fan_score: data })
}
