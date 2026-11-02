/**
 * Rebuilds the leaderboard tables (lb_rs_* regular season, lb_ps_* postseason) for one
 * gender's season from its bouts and ratings. The daily crons run it after the rating
 * recalculation (vercel.json); it's a separate job so the rating run stays inside its time
 * limit. Default: the gender's season in progress. ?season=<id> rebuilds another season.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'

export const maxDuration = 300

async function authorize(req: NextRequest): Promise<boolean> {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  if (req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`) return true
  // or a signed-in admin (any signed-in user is not enough: fans have accounts)
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return false
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  return appUser?.role === 'admin'
}

async function refresh(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gender = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const seasonParam = Number(req.nextUrl.searchParams.get('season'))
  const season = seasonParam || (await getWorkingSeason(parseGender(gender))).id
  const db = createSupabaseAdmin()
  const started = Date.now()
  const out: Record<string, unknown> = { gender, season }
  for (const fn of ['lb_rs_refresh', 'lb_ps_refresh'] as const) {
    const { data, error } = await db.rpc(fn, { p_gender: gender, p_season: season })
    if (error) return NextResponse.json({ ...out, error: `${fn}: ${error.message}` }, { status: 500 })
    out[fn] = Array.isArray(data) ? data[0] : data
  }
  return NextResponse.json({ ...out, duration_ms: Date.now() - started })
}

export const GET = refresh
export const POST = refresh
