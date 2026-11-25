// Polls: GET today's poll (by its date, Eastern) with the percentages once you've voted; POST { choice } to
// vote once (signed in). Sandbox: { sandbox, asOf, player } (admin).
import { NextRequest, NextResponse } from 'next/server'
import { challengeContext, type Ctx } from '@/lib/challengeServer'

export const dynamic = 'force-dynamic'

async function state(ctx: Ctx) {
  const { data: poll } = await ctx.db.from('polls').select('id, topic, question, answers').eq('sandbox', ctx.sandbox).eq('poll_date', ctx.today).eq('archived', false).order('id', { ascending: false }).limit(1).maybeSingle()
  if (!poll) return { available: false }
  const { data: votes } = await ctx.db.from('poll_votes').select('player, choice').eq('poll_id', poll.id)
  const mine = (votes ?? []).find((v: { player: string }) => v.player === ctx.player)
  if (!mine) return { available: true, id: poll.id, question: poll.question, answers: poll.answers, voted: null }
  const counts = (poll.answers as string[]).map((_, i) => (votes ?? []).filter((v: { choice: number }) => v.choice === i).length)
  const total = counts.reduce((a, b) => a + b, 0)
  return { available: true, id: poll.id, question: poll.question, answers: poll.answers, voted: mine.choice, total, pct: counts.map(c => (total ? Math.round((c / total) * 1000) / 10 : 0)) }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const ctx = await challengeContext({ sandbox: sp.get('sandbox'), asOf: sp.get('asOf'), player: sp.get('player') })
  if (!ctx) return NextResponse.json({ signedIn: false })
  return NextResponse.json({ signedIn: true, ...(await state(ctx)) })
}

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const ctx = await challengeContext(b)
  if (!ctx) return NextResponse.json({ error: 'Sign in to vote' }, { status: 401 })
  if (!Number.isInteger(b.choice) || b.choice < 0) return NextResponse.json({ error: 'Pick an answer' }, { status: 400 })
  const s = await state(ctx)
  if (!s.available || !('id' in s)) return NextResponse.json({ error: 'No poll today' }, { status: 404 })
  if (b.choice >= (s.answers as string[]).length) return NextResponse.json({ error: 'Pick an answer' }, { status: 400 })
  await ctx.db.from('poll_votes').upsert({ poll_id: s.id, player: ctx.player, user_id: ctx.userId, choice: b.choice }, { onConflict: 'poll_id,player', ignoreDuplicates: true })
  return NextResponse.json({ signedIn: true, ...(await state(ctx)) })
}
