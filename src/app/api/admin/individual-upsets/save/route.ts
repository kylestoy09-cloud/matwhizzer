import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

// POST /api/admin/individual-upsets/save
// Body:
// {
//   week_id: number,
//   gender: 'M' | 'F',
//   weight_class: number,
//   // Map of upset id → include_in_publish bool
//   selections: { [id: string]: boolean }
// }
//
// Applies include_in_publish updates and upserts a completion row.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { week_id, gender, weight_class, selections } = body as {
    week_id:      number
    gender:       'M' | 'F'
    weight_class: number
    selections:   Record<string, boolean>
  }

  if (!week_id || !gender || !weight_class || !selections) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  // Apply selections — do individual updates for each upset to preserve
  // other columns. Batch in groups of 50 to avoid long IN() clauses.
  const entries = Object.entries(selections)

  const included = entries.filter(([, v]) => v).map(([id]) => parseInt(id, 10))
  const excluded = entries.filter(([, v]) => !v).map(([id]) => parseInt(id, 10))

  if (included.length) {
    await db.from('individual_upsets')
      .update({ include_in_publish: true, updated_at: new Date().toISOString() })
      .in('id', included)
      .eq('week_id',      week_id)
      .eq('gender',       gender)
      .eq('weight_class', weight_class)
  }
  if (excluded.length) {
    await db.from('individual_upsets')
      .update({ include_in_publish: false, updated_at: new Date().toISOString() })
      .in('id', excluded)
      .eq('week_id',      week_id)
      .eq('gender',       gender)
      .eq('weight_class', weight_class)
  }

  // Upsert completion row
  const { error: compError } = await db
    .from('individual_upset_completion')
    .upsert({
      week_id,
      gender,
      weight_class,
      completed_at: new Date().toISOString(),
      completed_by: email,
    }, { onConflict: 'week_id,gender,weight_class' })

  if (compError) return NextResponse.json({ error: compError.message }, { status: 500 })

  const includedCount = included.length
  return NextResponse.json({ ok: true, included: includedCount })
}

// DELETE /api/admin/individual-upsets/save
// Body: { week_id, gender, weight_class }
// Clears completion without changing selections.
export async function DELETE(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { week_id, gender, weight_class } = body

  const db = createSupabaseAdmin()
  await db
    .from('individual_upset_completion')
    .delete()
    .eq('week_id',      week_id)
    .eq('gender',       gender)
    .eq('weight_class', weight_class)

  return NextResponse.json({ ok: true })
}
