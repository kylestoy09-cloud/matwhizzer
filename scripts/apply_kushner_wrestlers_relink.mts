// Applies docs/migrations/20261028_kushner_wrestlers_relink.sql via the service
// role, after saving the affected rows to the backup file.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261028_kushner_wrestlers_relink.json'
const MEET = '9a25d510-74cf-48dd-9556-1c09d2e40dbc', KUSHNER = 748
// deleted initials-only id → existing full-name wrestler (same boy in the 2026-01-08 Rutgers Prep dual)
const RELINK: Record<string, string> = {
  '1051eca0-2156-43cc-83ad-37e6f0b71b6c': '371baf38-8d24-4a91-9246-a44345c33bb4',  // J Lankry  → Jordan Lankary (106 / 106)
  '2ce1b022-fc16-43aa-8b4b-ef637c7b443d': '47a20d87-9b64-4c82-8afa-837e0e3f45ee',  // B Strub   → Brian Straw (120 / 120)
  '9a62bb89-2dd3-4528-a092-b69e55985c10': '5ee6a3a6-e42c-4646-9cfc-7b66e9e2cc1b',  // M Sher    → Matanel Sher (126 / 132)
  '23dbad90-47e2-4aaf-bed2-e852206fddc5': '16ec0533-f7a7-4f0a-b0e6-474835b77aa2',  // J Rojas   → Josh Rojas (150 / 144)
  'af4281ca-efc9-428f-9d66-3b432fde91d4': '7f42b6cd-374c-47af-b336-a7149ab59c99',  // A Yarkony → Aidan Urcony (157 / 150)
}
// recreated under their original ids (no full-name match)
const RECREATE: Record<string, [string, string]> = {
  '7d0c6170-363c-4bb2-b616-83800df63f1d': ['O', 'Lazanowitz'],
  '0b7a3edc-3218-47a7-9a5a-9c8abae45800': ['J', 'Sperber'],
  'bb24f137-e0b0-463a-afed-1b3e4ef94d32': ['E', 'Kestler'],
  '4a084088-51e3-45e9-9939-693649cb8071': ['S', 'Weill'],
}
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }
if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const allIds = [...Object.keys(RELINK), ...Object.keys(RECREATE)]
const present = ok(await db.from('wrestlers').select('id').in('id', [...allIds, ...Object.values(RELINK)])) as any[]
if (present.some(p => allIds.includes(p.id))) throw new Error('a deleted id exists again')
if (present.length !== 5) throw new Error('a relink target is missing')
const template = ok(await db.from('wrestlers').select('gender,is_oos,is_stub').eq('id', '5ee6a3a6-e42c-4646-9cfc-7b66e9e2cc1b').single()) as any
const bouts = ok(await db.from('dual_meet_matches').select('*').eq('dual_meet_id', MEET)) as any[]
const aliases = ok(await db.from('wrestler_name_aliases').select('*').eq('school_id', KUSHNER).in('wrestler_id', allIds)) as any[]
writeFileSync(BACKUP, JSON.stringify({ bouts, aliases }, null, 1))
console.log('backup:', bouts.length, 'bouts,', aliases.length, 'aliases')

const created = ok(await db.from('wrestlers').insert(Object.entries(RECREATE).map(([id, [f, l]]) => ({ id, first_name: f, last_name: l, gender: 'M', is_oos: template.is_oos, is_stub: template.is_stub }))).select('id')) as any[]
console.log('recreated wrestlers', created.length)
let relinked = 0
for (const [from, to] of Object.entries(RELINK)) {
  for (const col of ['wrestler_a_id', 'wrestler_b_id', 'winner_id']) {
    const r = ok(await db.from('dual_meet_matches').update({ [col]: to }).eq('dual_meet_id', MEET).eq(col, from).select('id')) as any[]
    if (col !== 'winner_id') relinked += r.length
  }
  ok(await db.from('wrestler_name_aliases').update({ wrestler_id: to }).eq('school_id', KUSHNER).eq('wrestler_id', from))
}
console.log('bouts re-pointed', relinked)
const after = ok(await db.from('dual_meet_matches').select('wrestler_a_id,wrestler_b_id').eq('dual_meet_id', MEET)) as any[]
const ids = [...new Set(after.flatMap(b => [b.wrestler_a_id, b.wrestler_b_id]).filter(Boolean))]
const exist = ok(await db.from('wrestlers').select('id').in('id', ids)) as any[]
console.log('verify: wrestler ids in meet', ids.length, 'all exist:', exist.length === ids.length)
