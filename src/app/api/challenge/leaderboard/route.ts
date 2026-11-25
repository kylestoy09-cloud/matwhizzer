// Daily Challenge leaderboard: this week's standings (Monday–Sunday Eastern) and past weeks' winners.
// Anyone can look; the signed-in player's own row is marked. Sandbox: { sandbox=1, asOf, player } (admin).
import { NextRequest, NextResponse } from 'next/server'
import { challengeContext, notifyWinner } from '@/lib/challengeServer'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { easternDate, finalizeWeeks, playerNames, standings, weekStart, type Db } from '@/lib/challenge'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const ctx = await challengeContext({ sandbox: sp.get('sandbox'), asOf: sp.get('asOf'), player: sp.get('player') })
  if (sp.get('sandbox') && !ctx) return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const db = ctx?.db ?? (createSupabaseAdmin() as unknown as Db)
  const sandbox = ctx?.sandbox ?? false, today = ctx?.today ?? easternDate()
  try {
    await finalizeWeeks(db, sandbox, today, c => notifyWinner(db, c))
    const week = /^\d{4}-\d{2}-\d{2}$/.test(sp.get('week') ?? '') ? weekStart(sp.get('week')!) : weekStart(today)
    const rows = await standings(db, sandbox, week)
    const { data: weeks } = await db.from('daily_challenge_weeks').select('*').eq('sandbox', sandbox).order('week_start', { ascending: false }).limit(12)
    const ids = [...new Set((weeks ?? []).flatMap((w: { top_player: string | null; random_player: string | null }) => [w.top_player, w.random_player]).filter((p: string | null) => p && !p.startsWith('sandbox:')))] as string[]
    const names = await playerNames(db, ids)
    const nameOf = (p: string | null) => !p ? null : p.startsWith('sandbox:') ? p.slice(8) : names.get(p) ?? 'Player'
    return NextResponse.json({
      week, me: ctx?.player ?? null,
      rows: rows.map((r, i) => ({ rank: i + 1, name: r.name, correct: r.correct, ms: r.ms, answered: r.answered, me: r.player === ctx?.player })),
      winners: (weeks ?? []).map((w: { week_start: string; top_player: string | null; top_correct: number | null; top_ms: number | null; random_player: string | null; entrants: number }) => ({
        week: w.week_start, top: nameOf(w.top_player), top_correct: w.top_correct, top_ms: w.top_ms, random: nameOf(w.random_player), entrants: w.entrants,
      })),
    })
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 500 }) }
}
