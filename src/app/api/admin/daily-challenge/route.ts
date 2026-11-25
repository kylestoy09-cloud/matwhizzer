// Daily Challenge questions (Kyle 2026-11-12): one contest across boys and girls trivia, one question per
// date (?sandbox=1 for the sandbox's own). kind 'choice' (4 options, one right: correct = [index]) or
// 'rank' (put 4 in order: correct = the indexes in order). Past dates are the archive: never changed or
// removed; a question that has been played can't be changed.
import { NextRequest, NextResponse } from 'next/server'
import { getAdminUser } from '@/lib/auth/isAdminUser'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { easternDate, validAnswer, type Kind } from '@/lib/challenge'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })
const isDate = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)

export async function GET(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const sandbox = req.nextUrl.searchParams.get('sandbox') === '1'
  const db = createSupabaseAdmin()
  const { data, error } = await db.from('daily_challenges').select('*').eq('sandbox', sandbox).order('challenge_date', { ascending: false })
  if (error) return bad(error.message, 500)
  const ids = (data ?? []).map(q => q.id)
  // plays: answers so far (a question that has been played can't be changed); correct_count: right ones
  const plays = new Map<number, { plays: number; correct_count: number }>()
  if (ids.length) {
    const { data: p } = await db.from('daily_challenge_plays').select('challenge_id, is_correct').in('challenge_id', ids).not('answered_at', 'is', null)
    for (const r of p ?? []) { const x = plays.get(r.challenge_id) ?? { plays: 0, correct_count: 0 }; x.plays++; if (r.is_correct) x.correct_count++; plays.set(r.challenge_id, x) }
  }
  return NextResponse.json({ rows: (data ?? []).map(q => ({ ...q, ...(plays.get(q.id) ?? { plays: 0, correct_count: 0 }) })), today: easternDate() })
}

export async function PUT(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const b = await req.json().catch(() => null)
  const sandbox = b?.sandbox === true
  if (!isDate(b?.challenge_date)) return bad('Pick a date')
  const kind: Kind = b.kind === 'rank' ? 'rank' : 'choice'
  const question = String(b.question ?? '').trim()
  const options = Array.isArray(b.options) ? b.options.map((o: unknown) => String(o ?? '').trim()) : []
  if (!question) return bad('A question is required')
  if (options.length !== 4 || options.some((o: string) => !o)) return bad('All four options are required')
  if (!validAnswer(kind, b.correct)) return bad(kind === 'rank' ? 'Set the right order for all four' : 'Mark the right answer')
  const limit = Number(b.time_limit_sec ?? 30)
  if (!Number.isInteger(limit) || limit < 5 || limit > 300) return bad('Time limit is 5–300 seconds')
  const topic = ['boys', 'girls', 'general'].includes(b.topic) ? b.topic : 'boys'
  if (!sandbox && b.challenge_date < easternDate()) return bad('That date has passed; past challenges are kept as they ran')
  const db = createSupabaseAdmin()
  const { data: cur } = await db.from('daily_challenges').select('id').eq('sandbox', sandbox).eq('challenge_date', b.challenge_date).maybeSingle()
  if (cur && !sandbox) {
    const { count } = await db.from('daily_challenge_plays').select('id', { count: 'exact', head: true }).eq('challenge_id', cur.id)
    if (count) return bad(`${count} people have already played this one; it can't be changed`)
  }
  const { data, error } = await db.from('daily_challenges').upsert({
    sandbox, challenge_date: b.challenge_date, topic, kind, question, options, correct: b.correct, time_limit_sec: limit,
    notes: String(b.notes ?? '').trim() || null, updated_at: new Date().toISOString(),
  }, { onConflict: 'sandbox,challenge_date' }).select('*').single()
  if (error) return bad(error.message, 500)
  return NextResponse.json({ row: data })
}

export async function DELETE(req: NextRequest) {
  if (!(await getAdminUser())) return bad('Forbidden', 403)
  const sp = req.nextUrl.searchParams
  const sandbox = sp.get('sandbox') === '1', date = sp.get('date')
  const db = createSupabaseAdmin()
  // Sandbox: ?sandbox=1&reset=1 clears the test plays, winners and claims (questions stay)
  if (sandbox && sp.get('reset') === '1') {
    for (const t of ['daily_challenge_plays', 'daily_challenge_weeks', 'daily_challenge_claims']) {
      const { error } = await db.from(t).delete().eq('sandbox', true)
      if (error) return bad(error.message, 500)
    }
    const { data: sp2 } = await db.from('polls').select('id').eq('sandbox', true)
    if (sp2?.length) await db.from('poll_votes').delete().in('poll_id', sp2.map(p => p.id))
    return NextResponse.json({ ok: true })
  }
  if (!isDate(date)) return bad('date is required')
  if (!sandbox && date <= easternDate()) return bad("Today's and past challenges are kept")
  const { error } = await db.from('daily_challenges').delete().eq('sandbox', sandbox).eq('challenge_date', date)
  if (error) return bad(error.message, 500)
  return NextResponse.json({ ok: true })
}
