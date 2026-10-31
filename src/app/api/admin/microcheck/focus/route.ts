import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { requireMicrocheckAdmin } from '../_auth'

export const dynamic = 'force-dynamic'

// POST — push one school's check to the front of the queue. Body: { task_key, school_id }
export async function POST(req: NextRequest) {
  const user = await requireMicrocheckAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { task_key, school_id } = await req.json() as { task_key: string; school_id: number }
  if (!task_key || !school_id) return NextResponse.json({ error: 'task_key and school_id required' }, { status: 400 })
  const { error } = await createSupabaseAdmin().from('microcheck_focus')
    .upsert({ task_key, school_id, created_by: user.id }, { onConflict: 'task_key,school_id', ignoreDuplicates: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — take it off the front. Body: { task_key, school_id }
export async function DELETE(req: NextRequest) {
  if (!await requireMicrocheckAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { task_key, school_id } = await req.json() as { task_key: string; school_id: number }
  const { error } = await createSupabaseAdmin().from('microcheck_focus').delete().eq('task_key', task_key).eq('school_id', school_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
