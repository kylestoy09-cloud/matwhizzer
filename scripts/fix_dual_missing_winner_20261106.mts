// Boys dual bouts with team points but no winner_id (15, all imported 2026-08): the page and the
// wrestlers' records read the winner from winner_id, so the win went missing (Tyler Davis, Shawnee v
// West Deptford 12/13, 175 TF counted for West Deptford on the dual page). The side with the points
// won: winner_id becomes that side's wrestler.
//   npx tsx --tsconfig tsconfig.json scripts/fix_dual_missing_winner_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
async function all(t: string, c: string) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await db.from(t).select(c).order('id').range(i, i + 999); if (error) throw new Error(t + error.message); o.push(...data!); if (data!.length < 1000) break } return o }
const out: any[] = []
for (const sfx of ['', '_girls']) {
  const b = await all('dual_meet_matches' + sfx, '*')
  for (const x of b) if (!x.winner_id && !x.is_double_forfeit && (x.team1_points > 0) !== (x.team2_points > 0)) {
    const w = x.team1_points > 0 ? x.wrestler_a_id : x.wrestler_b_id
    if (w) out.push({ sfx, row: x, winner: w, label: `${x.weight_class} ${x.team1_points > 0 ? x.wrestler_a_name_raw : x.wrestler_b_name_raw} over ${x.team1_points > 0 ? x.wrestler_b_name_raw : x.wrestler_a_name_raw} (${x.result_type} ${x.result_detail ?? ''}) ${x.team1_points}-${x.team2_points}` })
  }
}
console.log(`bouts to fix: ${out.length}`); for (const o of out) console.log('  ', o.sfx || 'boys', o.label)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_dual_missing_winner_before.json', JSON.stringify(out.map(o => o.row), null, 1))
for (const o of out) { const r = await db.from('dual_meet_matches' + o.sfx).update({ winner_id: o.winner }).eq('id', o.row.id).is('winner_id', null).select('id'); if (r.error) throw r.error }
console.log(`APPLIED: ${out.length}`)
