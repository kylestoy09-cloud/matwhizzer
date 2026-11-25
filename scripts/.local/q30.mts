import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, cols: string, f?: (q: any) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { let q = db.from(t).select(cols).order('id').range(i, i + 999); if (f) q = f(q); const { data, error } = await q; if (error) throw new Error(t + error.message); out.push(...data!); if (data!.length < 1000) break } return out }
const c = (a: any[], k: (x: any) => string) => a.reduce((m, x) => (m[k(x)] = (m[k(x)] ?? 0) + 1, m), {} as Record<string, number>)
for (const g of ['M', 'F']) {
  const mt = g === 'F' ? 'dual_meets_girls' : 'dual_meets'
  const meets = new Set((await all(mt, 'id, season_id', q => q.eq('season_id', 2026))).map(m => m.id))
  const db_ = (await all(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, result_type, is_double_forfeit, is_forfeit_win')).filter(b => meets.has(b.dual_meet_id))
  console.log(g, 'dual bouts', db_.length, c(db_, b => `${b.result_type}${b.is_double_forfeit ? '/DFF' : ''}${b.is_forfeit_win ? '/ff' : ''}`))
  const ist = new Set((await all(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id, season', q => q.eq('season', '2025-26'))).map(t => t.id))
  const tb = (await all(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, result_type')).filter(b => ist.has(b.in_season_tournament_id))
  console.log(g, 'tournament bouts', tb.length, c(tb, b => String(b.result_type)))
  const pts = new Set((await all('tournaments', 'id, season_id, gender', q => q.eq('season_id', 2026).eq('gender', g))).map(t => t.id))
  const pm = (await all('matches', 'id, tournament_id, win_type')).filter(m => pts.has(m.tournament_id))
  console.log(g, 'postseason', pm.length, c(pm, m => String(m.win_type)))
}
