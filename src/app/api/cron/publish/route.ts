// The publisher (Kyle 2026-11-17): Vercel cron at the top of every hour (Kyle: "60 minutes late is fine"). Publishes each side's ready article events and
// ready ranking weeks whose time has come (src/lib/articleHub.ts); an article event not ready by its time is marked
// missed. Only the cron (Authorization: Bearer CRON_SECRET) may call it.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { publishDueArticles } from '@/lib/articleHub'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = createSupabaseAdmin()
  const now = new Date()
  const out: Record<string, unknown> = {}
  for (const g of ['M', 'F'] as const) {
    out[g] = await publishDueArticles(db, g, now)
  }
  // ranking weeks: every weight/section submitted (ready_at) and the Monday 8 AM time reached
  const { data: weeks, error } = await db.from('individual_ranking_weeks').select('id, gender, week_number')
    .not('ready_at', 'is', null).is('published_at', null).lte('publish_at', now.toISOString())
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  for (const w of weeks ?? []) await db.from('individual_ranking_weeks').update({ published_at: now.toISOString() }).eq('id', w.id)
  out.rankings = (weeks ?? []).map(w => `${w.gender} week ${w.week_number}`)
  const acted = (['M', 'F'] as const).some(g => { const r = out[g] as { published: number; missed: number }; return r.published || r.missed }) || (weeks ?? []).length
  if (acted) {
    try { await db.rpc('log_admin_activity', { p_admin_email: 'cron', p_action: 'publish', p_entity_type: 'article_events', p_entity_id: null, p_details: out }) } catch { /* non-fatal */ }
  }
  return NextResponse.json({ ok: true, at: now.toISOString(), ...out })
}
