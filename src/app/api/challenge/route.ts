// Daily Challenge: GET today's state for the player; POST { action: 'start' } shows the question and starts
// the server clock; POST { action: 'answer', answer } records it (one attempt; late = wrong) and returns
// the correct answer. Sandbox (admin test page): { sandbox: true, asOf, player }.
import { NextRequest, NextResponse } from 'next/server'
import { challengeContext, notifyWinner, type Ctx } from '@/lib/challengeServer'
import { finalizeWeeks, isCorrect, validAnswer, GRACE_MS, type Kind } from '@/lib/challenge'

export const dynamic = 'force-dynamic'
const bad = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s })

type Q = { id: number; challenge_date: string; topic: string; kind: Kind; question: string; options: string[]; correct: number[]; time_limit_sec: number }
type Play = { started_at: string; answered_at: string | null; answer: number[] | null; is_correct: boolean | null; timed_out: boolean; elapsed_ms: number | null }

async function state(ctx: Ctx) {
  // The first visit after a week ends picks its winners
  await finalizeWeeks(ctx.db, ctx.sandbox, ctx.today, c => notifyWinner(ctx.db, c))
  const { data: q } = await ctx.db.from('daily_challenges').select('*').eq('sandbox', ctx.sandbox).eq('challenge_date', ctx.today).maybeSingle() as { data: Q | null }
  if (!q) return { date: ctx.today, available: false }
  const { data: play } = await ctx.db.from('daily_challenge_plays').select('started_at, answered_at, answer, is_correct, timed_out, elapsed_ms').eq('challenge_id', q.id).eq('player', ctx.player).maybeSingle() as { data: Play | null }
  const base = { date: ctx.today, available: true, topic: q.topic, kind: q.kind, time_limit_sec: q.time_limit_sec }
  if (!play) return { ...base, status: 'ready' }
  const shown = { question: q.question, options: q.options }
  if (!play.answered_at) {
    const left = q.time_limit_sec * 1000 - (Date.now() - new Date(play.started_at).getTime())
    if (left + GRACE_MS > 0) return { ...base, ...shown, status: 'playing', ms_left: Math.max(0, left) }
    // Ran out of time without answering
    await ctx.db.from('daily_challenge_plays').update({ answered_at: new Date().toISOString(), is_correct: false, timed_out: true }).eq('challenge_id', q.id).eq('player', ctx.player).is('answered_at', null)
    return { ...base, ...shown, status: 'done', is_correct: false, timed_out: true, answer: null, correct: q.correct }
  }
  return { ...base, ...shown, status: 'done', is_correct: play.is_correct, timed_out: play.timed_out, answer: play.answer, elapsed_ms: play.elapsed_ms, correct: q.correct }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const ctx = await challengeContext({ sandbox: sp.get('sandbox'), asOf: sp.get('asOf'), player: sp.get('player') })
  if (!ctx) return NextResponse.json({ signedIn: false })
  try { return NextResponse.json({ signedIn: true, ...(await state(ctx)) }) } catch (e) { return bad((e as Error).message, 500) }
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const ctx = await challengeContext(b)
  if (!ctx) return bad('Sign in to play', 401)
  const { data: q } = await ctx.db.from('daily_challenges').select('*').eq('sandbox', ctx.sandbox).eq('challenge_date', ctx.today).maybeSingle() as { data: Q | null }
  if (!q) return bad('No challenge today', 404)

  if (b.action === 'start') {
    // Starting twice keeps the first start time (no restarting the clock)
    await ctx.db.from('daily_challenge_plays').upsert({ challenge_id: q.id, sandbox: ctx.sandbox, player: ctx.player, user_id: ctx.userId }, { onConflict: 'challenge_id,player', ignoreDuplicates: true })
    return NextResponse.json({ signedIn: true, ...(await state(ctx)) })
  }

  if (b.action === 'answer') {
    if (!validAnswer(q.kind, b.answer)) return bad(q.kind === 'rank' ? 'Put all four in order' : 'Pick one answer')
    const now = Date.now()
    const { data: play } = await ctx.db.from('daily_challenge_plays').select('started_at, answered_at').eq('challenge_id', q.id).eq('player', ctx.player).maybeSingle()
    if (!play) return bad('Open the challenge first')
    if (play.answered_at) return NextResponse.json({ signedIn: true, ...(await state(ctx)) })   // one attempt
    const elapsed = now - new Date(play.started_at).getTime()
    const late = elapsed > q.time_limit_sec * 1000 + GRACE_MS
    const right = !late && isCorrect(q.kind, q.correct, b.answer)
    await ctx.db.from('daily_challenge_plays').update({
      answered_at: new Date(now).toISOString(), answer: b.answer, is_correct: right, timed_out: late, elapsed_ms: Math.min(elapsed, q.time_limit_sec * 1000),
    }).eq('challenge_id', q.id).eq('player', ctx.player).is('answered_at', null)
    return NextResponse.json({ signedIn: true, ...(await state(ctx)) })
  }
  return bad('action must be start or answer')
}
