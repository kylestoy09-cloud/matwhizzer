// Girls dual 4f531491 (2025-26): the first run of backfill_mapped_weight_bouts_20261106.mts added its
// 126 double forfeit (0-0) a second time; this deletes the newer copy (Kyle approved, 2026-11-06).
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = (await db.from('dual_meet_matches_girls').select('*').eq('dual_meet_id', '4f531491-2856-4f10-9993-578811be52de').eq('weight_class', 126).is('wrestler_a_name_raw', null).is('wrestler_b_name_raw', null).order('created_at')).data!.filter(r => r.dual_meet_id.startsWith('4f531491'))
console.log(rows.map(r => `${r.id} ${r.created_at} ${r.result_type} ${r.team1_points}-${r.team2_points}`))
if (rows.length !== 2 || rows.some(r => r.team1_points || r.team2_points)) throw new Error('expected two 0-0 no-name rows')
const ins = JSON.parse(fs.readFileSync('docs/migrations/backups/20261106_mapped_weight_bouts_inserted_run1.json', 'utf8')).bouts._girls as string[]
const dup = rows.filter(r => ins.includes(r.id)).at(-1)!
fs.writeFileSync('docs/migrations/backups/20261106_duplicate_df_before.json', JSON.stringify(dup, null, 1))
const d = await db.from('dual_meet_matches_girls').delete().eq('id', dup.id).select('id'); console.log('deleted', d.error?.message ?? d.data)
