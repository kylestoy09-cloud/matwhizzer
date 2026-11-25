// End-of-season Snap Shot for one side (Kyle 2026-11-11). GET loads the saved report for a season; POST builds it
// (src/lib/snapshot/seasonReport.ts) and saves it. ?gender=M|F picks the program's own table.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import { buildSeasonReport } from '@/lib/snapshot/seasonReport'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function admin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  return user && (await isAdminUser(user.id)) ? user : null
}
const table = (g: string) => (g === 'F' ? 'snapshot_season_reports_girls' : 'snapshot_season_reports')

export async function GET(req: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const gender = req.nextUrl.searchParams.get('gender'), season = req.nextUrl.searchParams.get('season')
  if ((gender !== 'M' && gender !== 'F') || !season) return NextResponse.json({ error: 'gender and season are required' }, { status: 400 })
  const { data, error } = await createSupabaseAdmin().from(table(gender)).select('payload, computed_at').eq('season', season).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'No end-of-season report saved for this season' }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { gender, seasonId } = await req.json() as { gender?: string; seasonId?: number }
  if ((gender !== 'M' && gender !== 'F') || !Number.isInteger(seasonId)) return NextResponse.json({ error: 'gender and seasonId are required' }, { status: 400 })
  const db = createSupabaseAdmin()
  try {
    const payload = await buildSeasonReport(db, gender, seasonId!)
    const computed_at = new Date().toISOString()
    const { error } = await db.from(table(gender)).upsert({ season: payload.season, payload, computed_at }, { onConflict: 'season' })
    if (error) return NextResponse.json({ error: `Not saved: ${error.message}` }, { status: 500 })
    return NextResponse.json({ payload, computed_at })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
