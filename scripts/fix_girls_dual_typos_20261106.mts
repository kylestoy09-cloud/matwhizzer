// Girls 2025-26 duals with a typo on TrackWrestling's page (Dual score gaps 2025-26.xlsx, 2026-11-06):
//   * Scotch Plains-Fanwood v North Plainfield 2/11: the 138 bout is listed with weight "S", so the parser
//     skipped it: Cassidy Costello (SPF) over Yaretzi Manuel-Corona (Fall 1:37), 6-0. Added at 138.
//   * Pemberton Township v Lakewood 12/13: Ashley Ruiz's tech fall at 120 is listed as 11 team points;
//     a tech fall is 5 (the listed final, 4-11, uses 5). Stored 11 → 5.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const before = chk(await db.from('dual_meet_matches_girls').select('*').eq('id', '069b06af-114f-47ac-ba93-819eb61f4971'), 'b')
if (before.length !== 1 || before[0].team2_points !== 11) throw new Error('Pemberton bout not as expected')
fs.writeFileSync('docs/migrations/backups/20261106_girls_dual_typos_before.json', JSON.stringify(before, null, 1))
chk(await db.from('dual_meet_matches_girls').update({ team2_points: 5 }).eq('id', before[0].id).eq('team2_points', 11).select('id'), 'pemberton')
const have = chk(await db.from('dual_meet_matches_girls').select('id').eq('dual_meet_id', '5999aff9-c5e8-4ec7-a9cd-6b166411bc11').eq('weight_class', 138), 'h')
if (!have.length) {
  const r = chk(await db.from('dual_meet_matches_girls').insert({ dual_meet_id: '5999aff9-c5e8-4ec7-a9cd-6b166411bc11', weight_class: 138, wrestler_a_id: '833900c9-33c4-4ad1-b809-703d6f0ac618', wrestler_b_id: '29608f3c-c9c0-45ff-95c7-4d27dfa73191', school_a_id: 126, school_b_id: 143, winner_id: '833900c9-33c4-4ad1-b809-703d6f0ac618', result_type: 'Fall', result_detail: null, fall_time_seconds: 97, team1_points: 6, team2_points: 0, is_double_forfeit: false, is_forfeit_win: false, validated: false, wrestler_a_name_raw: 'Cassidy Costello', wrestler_b_name_raw: 'Yaretzi Manuel-Corona', result_time_estimated: false, winner_score: null, loser_score: null }).select('id'), 'spf')
  fs.writeFileSync('docs/migrations/backups/20261106_girls_dual_typos_inserted.json', JSON.stringify(r, null, 1))
}
console.log('done')
