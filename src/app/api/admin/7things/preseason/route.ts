import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

// GET /api/admin/7things/preseason?gender=M
// Returns all preseason article rows for the current preseason season
export async function GET(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gender = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const db     = createSupabaseAdmin()
  const table  = gender === 'M' ? 'boys_articles' : 'girls_articles'

  const { data: sgsRow } = await db
    .from('season_gender_state')
    .select('season_id, seasons(year_label)')
    .eq('stage', 'preseason')
    .eq('gender', gender)
    .single()

  if (!sgsRow) return NextResponse.json({ seasonId: null, seasonLabel: null, articles: [] })

  const seasonId    = sgsRow.season_id
  const seasonLabel = (sgsRow as any).seasons?.year_label ?? null

  const { data: articles, error } = await db
    .from(table)
    .select('id, article_key, section, title, body, completed, status, updated_at')
    .eq('season_id', seasonId)
    .eq('article_type', 'preseason')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ seasonId, seasonLabel, articles: articles ?? [] })
}

// PATCH /api/admin/7things/preseason
// Save (create or update) a single article row.
// If body.id is present → UPDATE. Otherwise → INSERT and return new id.
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    id?:          string
    season_id:    number
    gender:       string
    article_key:  string
    section:      string | null
    title?:       string
    body?:        string
    completed?:   boolean
    status?:      string
  }

  const { id, season_id, gender, article_key, section } = body
  const db    = createSupabaseAdmin()
  const table = gender === 'M' ? 'boys_articles' : 'girls_articles'
  const now   = new Date().toISOString()

  if (id) {
    const update: Record<string, unknown> = { updated_at: now }
    if (body.title     !== undefined) update.title     = body.title
    if (body.body      !== undefined) update.body      = body.body
    if (body.completed !== undefined) update.completed = body.completed
    if (body.status    !== undefined) update.status    = body.status

    const { error } = await db.from(table).update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, id })
  }

  const { data, error } = await db
    .from(table)
    .insert({
      season_id,
      article_type: 'preseason',
      article_key,
      section:      section ?? null,
      title:        body.title     ?? '',
      body:         body.body      ?? '',
      author:       '',
      status:       body.status    ?? 'draft',
      completed:    body.completed ?? false,
      updated_at:   now,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
