// Lily Oh is from Riverside High School, Leesburg, Virginia (2026 VHSL girls state champion), not
// NJ's Riverside (214) (2026-11-04, reported by Kyle). Her only bouts are from the 4th Annual Girls
// Beast of the East (Delaware, multi-state), whose bracket said just "Riverside"; the import matched
// that to the NJ school by name. She is not on Riverside NJ's Track roster.
// Fix: an out-of-state school "Riverside, VA"; her 4 bouts' school and her name alias move to it;
// she becomes is_oos (no rating, rankings or seeding). No "Riverside" school alias is added: it
// would catch NJ Riverside's own wrestlers.
//   npx tsx --tsconfig tsconfig.json scripts/fix_lily_oh_riverside_va_20261104.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const LILY = 'd1421eca-fdc4-45c5-bccd-8d33e4d87c29'
const bouts = chk(await db.from('tournament_bouts_girls').select('*').or(`wrestler1_id.eq.${LILY},wrestler2_id.eq.${LILY}`), 'b')
const backup = {
  wrestler: chk(await db.from('wrestlers').select('*').eq('id', LILY), 'w'), bouts,
  aliases: chk(await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', LILY), 'a'),
  wrestler_hammer_scores: chk(await db.from('wrestler_hammer_scores').select('*').eq('wrestler_id', LILY), 'h'),
  lb_rs_wrestler: chk(await db.from('lb_rs_wrestler').select('*').eq('wrestler_id', LILY), 'lr'),
  lb_ps_wrestler: chk(await db.from('lb_ps_wrestler').select('*').eq('wrestler_id', LILY), 'lp'),
}
const side = (b: any) => (b.wrestler1_id === LILY ? 1 : 2)
if (bouts.some(b => b[`wrestler${side(b)}_school_id`] !== 214)) throw new Error('a bout is not on Riverside 214')
const exists = chk(await db.from('schools').select('id').eq('display_name', 'Riverside, VA'), 's')
console.log(`bouts ${bouts.length} | aliases ${backup.aliases.length} | rating rows ${backup.wrestler_hammer_scores.length} | school exists: ${exists.length > 0}`)
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261104_lily_oh_riverside_va_before.json', JSON.stringify(backup, null, 1))
const sid = exists[0]?.id ?? chk(await db.from('schools').insert({ display_name: 'Riverside, VA', town: 'Leesburg', is_nj: false }).select('id'), 'school')[0].id
for (const b of bouts) chk(await db.from('tournament_bouts_girls').update({ [`wrestler${side(b)}_school_id`]: sid }).eq('id', b.id).select('id'), 'bout')
chk(await db.from('wrestler_name_aliases').update({ school_id: sid }).eq('wrestler_id', LILY).eq('school_id', 214).select('id'), 'alias')
chk(await db.from('wrestlers').update({ is_oos: true }).eq('id', LILY).select('id'), 'is_oos')
for (const t of ['wrestler_hammer_scores', 'lb_rs_wrestler', 'lb_ps_wrestler']) chk(await db.from(t).delete().eq('wrestler_id', LILY).select('wrestler_id'), t)
console.log(`APPLIED: Riverside, VA = school ${sid}`)
