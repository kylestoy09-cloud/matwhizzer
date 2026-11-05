import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_kson_young_before.json', 'utf8'))
const p = b.pairs[0]
console.log('Ksan gone:', ((await db.from('wrestlers').select('id').eq('id', p.from)).data ?? []).length === 0, '| Kson:', JSON.stringify((await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', p.into)).data), '| Track row:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, wrestler_id').eq('wrestler_id', p.into)).data?.map((r: any) => `${r.first_name_raw} ${r.last_name_raw} ${r.grade}`)))
for (const f of ['lb_rs_refresh', 'lb_ps_refresh']) { const r = await db.rpc(f, { p_gender: 'M', p_season: 2026 }); console.log(f, r.error?.message ?? 'ok') }
for (const s of ['2025-26 (archive)', '2026-27']) await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'M', season: s, note: 'local run after the held-boys fix and the Kson Young merge 2026-11-05' } })
