import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    id: string
    wrestler1_school_id?: number | null
    wrestler1_school_raw?: string
    nj_wrestler1_id?: string | null
    wrestler2_school_id?: number | null
    wrestler2_school_raw?: string
    nj_wrestler2_id?: string | null
    winner?: 1 | 2 | null
    result_type?: string | null
    result_detail?: string | null
    fall_time_seconds?: number | null
    weight_class?: number
    round?: string
  }

  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { id, ...fields } = body
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data, error } = await supabase
    .from('tournament_bouts')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bout: data })
}
