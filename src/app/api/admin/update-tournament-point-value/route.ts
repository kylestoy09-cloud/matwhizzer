import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const VALID_VALUES = new Set([1, 5, 10, 15, 20, null])

export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { id: string; point_value: number | null; gender?: 'M' | 'F' }

  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!VALID_VALUES.has(body.point_value)) {
    return NextResponse.json({ error: 'point_value must be 1, 5, 10, 15, 20, or null' }, { status: 400 })
  }

  const supabase = createSupabaseAdmin()
  // If gender provided use directly; otherwise check boys table first, fall back to girls
  let istTable = body.gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  if (!body.gender) {
    const { data: check } = await supabase.from('in_season_tournaments').select('id').eq('id', body.id).maybeSingle()
    if (!check) istTable = 'in_season_tournaments_girls'
  }
  const { error } = await supabase
    .from(istTable)
    .update({ point_value: body.point_value })
    .eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
