// Tournament history progress (admin Tournament Hub → History): for each history tournament and season, what's in the
// system — placements, bouts, and whether the bouts are only those with an NJ wrestler (an out-of-state tournament
// loaded from NJ teams' results). The files we have for each year come from src/lib/tournamentHistorySources.ts.
//   GET ?gender=M|F
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import { HISTORY_SERIES } from '@/lib/tournamentHistorySeries'

export const dynamic = 'force-dynamic'

export type HistoryProgressCell = { id: string; placements: number; bouts: number; njOnly: boolean; outside: boolean }

export async function GET(req: NextRequest) {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isAdminUser(user.id))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const g: 'M' | 'F' = req.nextUrl.searchParams.get('gender') === 'F' ? 'F' : 'M'
  const db = createSupabaseAdmin()
  const series = HISTORY_SERIES[g]
  const table = g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const boutTable = g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  const { data: eds, error } = await db.from(table).select('id, name, season, tournament_type').in('name', series.flatMap(s => s.names))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: nj } = await db.from('schools').select('id').eq('is_nj', true)
  const njIds = new Set((nj ?? []).map(s => s.id as number))
  const out: Record<string, Record<string, HistoryProgressCell>> = {}
  await Promise.all((eds ?? []).map(async e => {
    const key = series.find(s => s.names.includes(e.name))!.key
    const [{ count: placements }, bouts] = await Promise.all([
      db.from('tournament_placements').select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', e.id),
      (async () => {
        const rows: { wrestler1_school_id: number | null; wrestler2_school_id: number | null }[] = []
        for (let f = 0; ; f += 1000) {
          const { data } = await db.from(boutTable).select('wrestler1_school_id, wrestler2_school_id').eq('in_season_tournament_id', e.id).order('id').range(f, f + 999)
          rows.push(...(data ?? []))
          if (!data || data.length < 1000) break
        }
        return rows
      })(),
    ])
    // every bout has an NJ wrestler in it → only NJ teams' results were loaded
    const njOnly = bouts.length > 0 && bouts.every(b => njIds.has(b.wrestler1_school_id ?? -1) || njIds.has(b.wrestler2_school_id ?? -1))
    ;(out[key] ??= {})[e.season] = { id: e.id, placements: placements ?? 0, bouts: bouts.length, njOnly, outside: e.tournament_type === 'outside' }
  }))
  return NextResponse.json({ series, cells: out })
}
