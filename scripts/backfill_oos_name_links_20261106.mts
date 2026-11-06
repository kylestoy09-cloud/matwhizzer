// Name links for out-of-state profiles created before imports saved them (July-August 2026: 880
// profiles had none). Without a link a later import can't find the profile and makes a second one
// (Dan Vargas, Easton Area, 2026-11-06). Each link is the name as written in the profile's own bouts
// at that school; a name already linked to a different wrestler at that school is left alone and
// listed.
//   npx tsx --tsconfig tsconfig.json scripts/backfill_oos_name_links_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { saveNameLinks } from '@/lib/nameLinks'
import { isPlaceholderName } from '@/lib/personName'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
async function all(t: string, c: string, f?: (q: any) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { let q = db.from(t).select(c).order('id'); if (f) q = f(q); const { data, error } = await q.range(i, i + 999); if (error) throw new Error(t + error.message); o.push(...data!); if (data!.length < 1000) break } return o }
const oos = await all('wrestlers', 'id, gender', q => q.eq('is_oos', true))
const aliases = await all('wrestler_name_aliases', 'id, wrestler_id, raw_name, school_id')
const linked = new Set(aliases.map(a => a.wrestler_id))
const taken = new Map(aliases.map(a => [`${a.raw_name}|${a.school_id}`, a.wrestler_id]))
const want = new Set(oos.filter(w => !linked.has(w.id)).map(w => w.id))
const links: { raw_name: string; school_id: number; wrestler_id: string }[] = []
const add = (w: string | null, raw: string | null, s: number | null) => { if (w && want.has(w) && raw?.trim() && s != null && !isPlaceholderName(raw)) links.push({ raw_name: raw.trim(), school_id: s, wrestler_id: w }) }
for (const sfx of ['', '_girls']) {
  for (const b of await all('dual_meet_matches' + sfx, 'id, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id')) { add(b.wrestler_a_id, b.wrestler_a_name_raw, b.school_a_id); add(b.wrestler_b_id, b.wrestler_b_name_raw, b.school_b_id) }
  for (const b of await all('tournament_bouts' + sfx, 'id, wrestler1_id, wrestler2_id, wrestler1_name_raw, wrestler2_name_raw, wrestler1_school_id, wrestler2_school_id')) { add(b.wrestler1_id, b.wrestler1_name_raw, b.wrestler1_school_id); add(b.wrestler2_id, b.wrestler2_name_raw, b.wrestler2_school_id) }
}
const uniq = [...new Map(links.map(l => [`${l.raw_name}|${l.school_id}`, l])).values()]
const clash = uniq.filter(l => taken.has(`${l.raw_name}|${l.school_id}`) && taken.get(`${l.raw_name}|${l.school_id}`) !== l.wrestler_id)
const fresh = uniq.filter(l => !taken.has(`${l.raw_name}|${l.school_id}`))
console.log(`unlinked out-of-state profiles: ${want.size}; covered by their bouts: ${new Set(fresh.map(l => l.wrestler_id)).size}; links to add: ${fresh.length}; name already linked to another wrestler: ${clash.length}`)
for (const c of clash.slice(0, 20)) console.log('   clash:', c.raw_name, 'school', c.school_id, c.wrestler_id.slice(0, 8), 'vs', taken.get(`${c.raw_name}|${c.school_id}`)!.slice(0, 8))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
let saved = 0; for (let i = 0; i < fresh.length; i += 500) { const r = await saveNameLinks(db, fresh.slice(i, i + 500)); if (r.error) throw new Error(r.error); saved += r.saved }
console.log(`APPLIED: ${saved} links`)
