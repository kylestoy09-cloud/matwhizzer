// (2026-11-04, approved by Kyle)
// 1. Girls 2025-26 inactive: Indian Hills (13), Hammonton (297), Toms River East (253) — girls
//    only in 2024-25; Hackensack (43) — no girls activity in any season; Keansburg (191) — one
//    dual with an unnamed wrestler that doesn't count. All five had open microcheck roster tasks.
// 2. The girls "Gabriel Grant" profile (031c6969) was East Orange's boys Gabriel Grant (138),
//    entered on two girls dual sheets (Belleville 12/19, Newark Academy 1/7). The two bouts stay
//    (the girls keep their falls) with the East Orange side unlinked; the profile is deleted.
//   npx tsx --tsconfig tsconfig.json scripts/fix_girls_inactive_and_gabriel_20261104.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { deleteWrestler } from '../src/lib/wrestlerDelete'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const SCHOOLS = [13, 297, 253, 43, 191]
const G = '031c6969-58e6-40f1-a217-500a2ff42ae5'
const bouts = chk(await db.from('dual_meet_matches_girls').select('*').or(`wrestler_a_id.eq.${G},wrestler_b_id.eq.${G}`), 'b')
const w = chk(await db.from('wrestlers').select('*').eq('id', G), 'w')
if (w[0]?.first_name !== 'Gabriel' || w[0]?.gender !== 'F' || bouts.length !== 2) throw new Error('not as expected')
if (bouts.some(b => b.winner_id === G)) throw new Error('Gabriel won a bout')
console.log(`inactive: ${SCHOOLS.join(', ')} | Gabriel bouts to unlink: ${bouts.length}`)
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261104_girls_inactive_and_gabriel_before.json', JSON.stringify({ wrestler: w, bouts }, null, 1))
chk(await db.from('inactive_school_seasons').insert(SCHOOLS.map(school_id => ({ school_id, season_id: 2026, gender: 'F' }))).select('school_id'), 'inactive')
for (const b of bouts) chk(await db.from('dual_meet_matches_girls').update(b.wrestler_a_id === G ? { wrestler_a_id: null } : { wrestler_b_id: null }).eq('id', b.id).select('id'), 'unlink')
const res = await deleteWrestler(db as never, G)
await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: res.ok ? 'delete_wrestler_profile' : 'delete_wrestler_profile_failed', p_entity_type: 'wrestlers', p_entity_id: G, p_details: { deleted: w[0], removed: res.removed ?? null, note: 'girls Gabriel Grant = East Orange boys wrestler; 2 girls dual bouts unlinked' } })
console.log(res.ok ? 'APPLIED: 5 inactive, Gabriel profile deleted' : `delete failed: ${res.error}`)
