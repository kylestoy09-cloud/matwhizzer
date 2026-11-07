// Aesthetic Tool saves (docs/migrations/20261107_site_aesthetic_versions.sql). Admin only.
//   GET               the saved look in effect (newest) and the last 20 saves (no settings)
//   GET ?id=<id>      one earlier save, with its settings
//   POST { settings, note? }   save a new version; it becomes the look in effect on the live site
import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { SITE_LOOK_TAG } from '@/lib/siteLookServer'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseAdmin()
  const id = req.nextUrl.searchParams.get('id')
  if (id) {
    const { data, error } = await db.from('site_aesthetic_versions').select('id, settings, note, saved_by, created_at').eq('id', Number(id)).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ version: data })
  }
  const [{ data: current, error: e1 }, { data: history, error: e2 }] = await Promise.all([
    db.from('site_aesthetic_versions').select('id, settings, note, saved_by, created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('site_aesthetic_versions').select('id, note, saved_by, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 })
  return NextResponse.json({ current, history: history ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.settings !== 'object' || body.settings === null) return NextResponse.json({ error: 'settings required' }, { status: 400 })
  const { data, error } = await createSupabaseAdmin().from('site_aesthetic_versions')
    .insert({ settings: body.settings, note: typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 200) : null, saved_by: user.email ?? null })
    .select('id, note, saved_by, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  revalidateTag(SITE_LOOK_TAG, { expire: 0 })   // the site shows the new look on the next page load
  return NextResponse.json({ saved: data })
}
