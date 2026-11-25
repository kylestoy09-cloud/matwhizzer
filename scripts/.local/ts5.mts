import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tourns = (await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2026).eq('tournament_type', 'districts')).data!
let eq = 0, ne = 0, diffs: number[] = []; const ex: string[] = []
for (const t of tourns) {
  const d = Number(t.name.match(/District (\d+)$/)![1]); if (d === 21) continue
  const off = new Map((await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)).data!.map((r: any) => [r.school_id, Number(r.total_points)]))
  const calc = new Map(((await db.rpc('district_team_score', { p_district: d, p_gender: 'M', p_season: 2026 })).data ?? []).map((r: any) => [r.school_id, Number(r.total_points)]))
  for (const [s, p] of off) { const c = calc.get(s) ?? 0; if (Math.abs(c - p) < 0.01) eq++; else { ne++; diffs.push(p - c); if (ex.length < 6) ex.push(`D${d} school ${s}: official ${p}, formula ${c}`) } }
}
diffs.sort((a, b) => a - b)
console.log(`boys 2025-26 districts (31 with official tables): formula equals official ${eq}, differs ${ne}; official minus formula: min ${diffs[0]}, median ${diffs[Math.floor(diffs.length / 2)]}, max ${diffs.at(-1)}`)
console.log(ex.join('\n'))
