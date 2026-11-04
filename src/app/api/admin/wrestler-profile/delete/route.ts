// Delete a wrestler profile from the admin edit tool (src/lib/wrestlerDelete.ts).
//   GET    ?id=<uuid>                 what a delete would hit (records block it)
//   DELETE { id, confirm }            confirm must be the wrestler's full name, as typed
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { deletePreview, deleteWrestler } from '@/lib/wrestlerDelete'

export const dynamic = 'force-dynamic'

const fullName = (w: { first_name: string | null; last_name: string | null }) => `${w.first_name ?? ''} ${w.last_name ?? ''}`.replace(/\s+/g, ' ').trim()

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  try {
    return NextResponse.json(await deletePreview(createSupabaseAdmin(), id))
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, confirm } = await req.json().catch(() => ({})) as { id?: string; confirm?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const db = createSupabaseAdmin()
  const { data: w } = await db.from('wrestlers').select('*').eq('id', id).maybeSingle()
  if (!w) return NextResponse.json({ error: 'Wrestler not found' }, { status: 404 })
  if ((confirm ?? '').replace(/\s+/g, ' ').trim().toLowerCase() !== fullName(w).toLowerCase())
    return NextResponse.json({ error: 'The name typed doesn’t match this wrestler' }, { status: 400 })
  try {
    const res = await deleteWrestler(db, id)
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: user.email ?? '', p_action: 'delete_wrestler_profile', p_entity_type: 'wrestlers', p_entity_id: id,
      p_details: { deleted: w },   // the whole row, so it can be put back
    })
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true })
}
