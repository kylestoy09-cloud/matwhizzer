// "Scratch Scratch" (Mainland, girls) was a placeholder, not a wrestler (2026-11-04, approved by Kyle):
// Overbrook Girls Winter Open 2025, 120 R1, Lea Gomez-Mares (Cumberland) won by forfeit over a
// scratched Mainland entry. The bout stays as a forfeit win with no loser profile (shown as
// "Forfeit"); the placeholder profile, its alias and its leaderboard row go.
//   npx tsx --tsconfig tsconfig.json scripts/fix_scratch_placeholder_20261104.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const ID = '993438ab-aea0-45ae-acaa-4ea0480ca551'
const backup = {
  wrestler: chk(await db.from('wrestlers').select('*').eq('id', ID), 'w'),
  bouts: chk(await db.from('tournament_bouts_girls').select('*').or(`wrestler1_id.eq.${ID},wrestler2_id.eq.${ID}`), 'b'),
  aliases: chk(await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', ID), 'a'),
  lb_rs_wrestler: chk(await db.from('lb_rs_wrestler').select('*').eq('wrestler_id', ID), 'lb'),
}
if (backup.wrestler[0]?.first_name !== 'Scratch') throw new Error('not the Scratch profile')
if (backup.bouts.length !== 1 || backup.bouts[0].wrestler2_id !== ID || backup.bouts[0].result_type !== 'Forfeit') throw new Error('bouts not as expected')
console.log('bout', backup.bouts[0].id, '| aliases', backup.aliases.length, '| lb rows', backup.lb_rs_wrestler.length)
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261104_scratch_placeholder_before.json', JSON.stringify(backup, null, 1))
chk(await db.from('tournament_bouts_girls').update({ wrestler2_id: null }).eq('id', backup.bouts[0].id).select('id'), 'bout')
chk(await db.from('wrestler_name_aliases').delete().eq('wrestler_id', ID).select('id'), 'alias')
chk(await db.from('lb_rs_wrestler').delete().eq('wrestler_id', ID).select('wrestler_id'), 'lb')
const r = await db.from('wrestlers').delete().eq('id', ID).select('id')
console.log(r.error ? `delete blocked: ${r.error.message}` : 'APPLIED: profile deleted')
