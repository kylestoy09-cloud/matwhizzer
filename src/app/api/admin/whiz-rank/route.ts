// Whiz Rank (admin, per side; Kyle 2026-11-17). src/lib/whizRank.ts has the rules.
// GET ?gender&season                       the season's ranking weeks with how many weight/sections are submitted
// GET ?gender&week&weight&section          one board (top 25 + everyone else rated there, with WRR, finishes, off-season)
// GET ?gender&week&wrestler                a row's drop-down: record for the week + recent bouts against expectation
// POST  { gender, week, weight, section, order }        save the order (wrestler ids, top 25)
// PATCH { gender, week, weight, section, submitted }    submit (lock) or reopen; the week is ready when all are in
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { saveWhizOrder, setSubmitted, whizBoard, whizWeeks, wrestlerMatches, WHIZ_SECTIONS, WHIZ_WEIGHTS, type Side } from '@/lib/whizRank'
import { transferSeasons } from '@/lib/transfers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const side = (g: unknown): Side | null => (g === 'M' || g === 'F' ? g : null)

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const p = req.nextUrl.searchParams
  const g = side(p.get('gender'))
  if (!g) return bad('gender must be M or F')
  const db = createSupabaseAdmin()
  try {
    const week = Number(p.get('week'))
    if (week && p.get('wrestler')) return NextResponse.json(await wrestlerMatches(db, g, week, p.get('wrestler')!))
    if (week && p.get('weight') && p.get('section')) return NextResponse.json(await whizBoard(db, g, week, Number(p.get('weight')), p.get('section')!))
    const seasonId = Number(p.get('season')) || (await transferSeasons(db, g)).find(s => s.open)?.id
    if (!seasonId) return bad('No open season')
    const weeks = await whizWeeks(db, g, seasonId)
    const { data: comp } = await db.from('individual_ranking_completion').select('week_id, weight_class, stage_entity').eq('gender', g).eq('stage', 'section').in('week_id', weeks.map(w => w.id))
    const { data: notes } = await db.from('whiz_rank_notices').select('week_id, weight_class, section').eq('gender', g).in('week_id', weeks.map(w => w.id))   // missing table → none
    return NextResponse.json({
      season: seasonId, sections: WHIZ_SECTIONS[g], weights: WHIZ_WEIGHTS[g],
      weeks: weeks.map(w => ({ ...w, submitted: (comp ?? []).filter(c => c.week_id === w.id).map(c => `${c.weight_class}|${c.stage_entity}`), notices: [...new Set((notes ?? []).filter(n => n.week_id === w.id).map(n => `${n.weight_class}|${n.section}`))] })),
    })
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 500)
  }
}

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (!g || !b.week || !b.weight || !b.section || !Array.isArray(b.order)) return bad('gender, week, weight, section and order required')
  try {
    await saveWhizOrder(createSupabaseAdmin(), g, Number(b.week), Number(b.weight), String(b.section), b.order.map(String))
    return NextResponse.json({ ok: true })
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e))
  }
}

export async function PATCH(req: NextRequest) {
  const user = await getAdminUser()
  if (!user) return bad('Forbidden', 403)
  const b = await req.json().catch(() => ({}))
  const g = side(b.gender)
  if (!g || !b.week || !b.weight || !b.section) return bad('gender, week, weight and section required')
  try {
    return NextResponse.json(await setSubmitted(createSupabaseAdmin(), g, Number(b.week), Number(b.weight), String(b.section), b.submitted !== false, user.email ?? ''))
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e))
  }
}
