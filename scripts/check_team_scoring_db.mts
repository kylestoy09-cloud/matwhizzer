// Compares the database's boys scoring (tw_boys_school_points, 20261105_tw_scoring_rules.sql) with the
// official copied totals (precomputed_team_scores) for every boys postseason tournament. Read-only.
// Expected (docs/reviews/trackwrestling_team_scoring.md): state and regions exact; districts exact
// apart from TrackWrestling's 5 TF-1 errors (0.5) and Montville D5 2025-26 (+2, unexplained).
//   npx tsx --tsconfig tsconfig.json scripts/check_team_scoring_db.mts [2026|2025]
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SEASON = Number(process.argv[2] ?? 2026)
const tours = (await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'M').eq('season_id', SEASON).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!
const res: Record<string, { eq: number; n: number; off: string[] }> = {}
for (const t of tours) {
  const calc = await db.rpc('tw_boys_school_points', { p_tournament_id: t.id })
  if (calc.error) throw new Error(`${t.name}: ${calc.error.message}`)
  const C = new Map((calc.data as any[]).map(r => [r.school_id, Number(r.points)]))
  const off = (await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)).data!
  const k = t.tournament_type; res[k] = res[k] ?? { eq: 0, n: 0, off: [] }
  for (const o of off) { res[k].n++; const c = C.get(o.school_id) ?? 0; if (Math.abs(Number(o.total_points) - c) < 0.01) res[k].eq++; else res[k].off.push(`${t.name.replace('Boy_s ', '')} school ${o.school_id}: official ${o.total_points}, database ${c}`) }
}
for (const [k, v] of Object.entries(res)) { console.log(`${SEASON} ${k}: ${v.eq}/${v.n} equal`); for (const o of v.off.slice(0, 12)) console.log('   ', o) }
