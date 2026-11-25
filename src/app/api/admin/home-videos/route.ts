// Home Video tool (admin): the on/off switch and the weekly YouTube links with creator credit, per side.
// GET ?gender=M|F; PUT { gender, week_start, youtube_url, title, creator_name, creator_url, notes } saves a
// week (a Monday); DELETE ?gender&week clears one; PATCH { gender, enabled } flips the switch.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { easternDate, homeVideoTable, weekStart, youTubeId, currentHomeVideo } from '@/lib/homeVideo'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const side = (g: unknown) => (g === 'M' || g === 'F' ? g : null)
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
const cleanUrl = (u: unknown) => { const s = String(u ?? '').trim(); if (!s) return null; try { return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).toString() } catch { return undefined } }

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const g = side(req.nextUrl.searchParams.get('gender'))
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin()
  const [{ data: s }, { data: rows, error }] = await Promise.all([
    db.from('home_video_settings').select('enabled, updated_at, updated_by').eq('gender', g).maybeSingle(),
    db.from(homeVideoTable(g)).select('*').order('week_start', { ascending: false }),
  ])
  if (error) return bad(error.message, 500)
  const live = await currentHomeVideo(db, g)
  return NextResponse.json({ enabled: !!s?.enabled, setting: s ?? null, rows: rows ?? [], thisWeek: weekStart(easternDate()), showing: live?.week_start ?? null })
}

export async function PUT(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null)
  const g = side(b?.gender)
  if (!g) return bad('gender must be M or F')
  if (!isDate(b.week_start) || weekStart(b.week_start) !== b.week_start) return bad('Weeks start on a Monday')
  const video_id = youTubeId(b.youtube_url)
  if (!video_id) return bad("That isn't a YouTube video link")
  const creator_url = cleanUrl(b.creator_url)
  if (creator_url === undefined) return bad("The creator link isn't a web address")
  const t = (k: string) => String(b[k] ?? '').trim() || null
  const { data, error } = await createSupabaseAdmin().from(homeVideoTable(g)).upsert({
    week_start: b.week_start, youtube_url: String(b.youtube_url).trim(), video_id, title: t('title'), creator_name: t('creator_name'),
    creator_url, notes: t('notes'), updated_at: new Date().toISOString(), updated_by: user.email ?? null,
  }, { onConflict: 'week_start' }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ row: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const sp = req.nextUrl.searchParams
  const g = side(sp.get('gender')), week = sp.get('week')
  if (!g || !isDate(week)) return bad('gender and week are required')
  const { error } = await createSupabaseAdmin().from(homeVideoTable(g)).delete().eq('week_start', week)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null)
  const g = side(b?.gender)
  if (!g) return bad('gender must be M or F')
  const { error } = await createSupabaseAdmin().from('home_video_settings')
    .upsert({ gender: g, enabled: !!b.enabled, updated_at: new Date().toISOString(), updated_by: user.email ?? null }, { onConflict: 'gender' })
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true, enabled: !!b.enabled })
}
