import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// Link: set ms_wrestlers.hs_wrestler_id
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ms_wrestler_id: number
  let hs_wrestler_id: string
  try {
    const body = await req.json()
    ms_wrestler_id = Number(body.ms_wrestler_id)
    hs_wrestler_id = body.hs_wrestler_id
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!ms_wrestler_id || isNaN(ms_wrestler_id)) return NextResponse.json({ error: 'ms_wrestler_id required' }, { status: 400 })
  if (!hs_wrestler_id) return NextResponse.json({ error: 'hs_wrestler_id required' }, { status: 400 })

  const client = serviceClient()

  const { error } = await client
    .from('ms_wrestlers')
    .update({ hs_wrestler_id })
    .eq('id', ms_wrestler_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// Unlink: clear ms_wrestlers.hs_wrestler_id
export async function DELETE(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ms_wrestler_id: number
  try {
    const body = await req.json()
    ms_wrestler_id = Number(body.ms_wrestler_id)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!ms_wrestler_id || isNaN(ms_wrestler_id)) return NextResponse.json({ error: 'ms_wrestler_id required' }, { status: 400 })

  const client = serviceClient()

  const { error } = await client
    .from('ms_wrestlers')
    .update({ hs_wrestler_id: null })
    .eq('id', ms_wrestler_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
