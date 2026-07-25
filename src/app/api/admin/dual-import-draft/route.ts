import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// GET /api/admin/dual-import-draft — list drafts or fetch one full draft
// ?id=<uuid> returns full draft (raw_text + overrides); no id returns summary list
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = serviceClient()
  const id = req.nextUrl.searchParams.get('id')

  if (id) {
    const { data, error } = await supabase
      .from('dual_import_drafts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ draft: data })
  }

  const { data, error } = await supabase
    .from('dual_import_drafts')
    .select('id, label, meet_count, status, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ drafts: data ?? [] })
}

// POST /api/admin/dual-import-draft — create or update a draft
// Body: { id?, label, raw_text, school_overrides, wrestler_overrides, meet_count }
export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, label, raw_text, school_overrides, wrestler_overrides, meet_count } = body

  if (!raw_text) return NextResponse.json({ error: 'raw_text required' }, { status: 400 })

  const supabase = serviceClient()

  if (id) {
    // Update existing draft (must belong to this user)
    const { data, error } = await supabase
      .from('dual_import_drafts')
      .update({
        label:              label ?? '',
        raw_text,
        school_overrides:   school_overrides  ?? {},
        wrestler_overrides: wrestler_overrides ?? {},
        meet_count:         meet_count ?? 0,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ draft: data })
  }

  // Create new draft
  const { data, error } = await supabase
    .from('dual_import_drafts')
    .insert({
      user_id:            user.id,
      label:              label ?? '',
      raw_text,
      school_overrides:   school_overrides  ?? {},
      wrestler_overrides: wrestler_overrides ?? {},
      meet_count:         meet_count ?? 0,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ draft: data })
}

// DELETE /api/admin/dual-import-draft?id=<uuid> — delete a draft
export async function DELETE(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = serviceClient()
  const { error } = await supabase
    .from('dual_import_drafts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// PATCH /api/admin/dual-import-draft — mark a draft as imported
export async function PATCH(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = serviceClient()
  const { error } = await supabase
    .from('dual_import_drafts')
    .update({ status: 'imported', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
