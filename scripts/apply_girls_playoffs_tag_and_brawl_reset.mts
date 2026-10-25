// Applies docs/migrations/20261024_girls_playoffs_tag_and_brawl_reset.sql via
// the service role, after saving every affected row to the backup file.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const BACKUP = 'docs/migrations/backups/20261024_girls_playoffs_tag_and_brawl_reset.json'
const sql = readFileSync('docs/migrations/20261024_girls_playoffs_tag_and_brawl_reset.sql', 'utf8')
const block = (from: string, to: string) => sql.slice(sql.indexOf(from), sql.indexOf(to, sql.indexOf(from)))
const uuids = (s: string) => [...s.matchAll(/'([0-9a-f-]{36})'/g)].map(m => m[1])
const DUP = '45592f11-7882-4496-98a0-7d3164c981f5', DUP_KEEP = '6eb0690b-2840-4206-b7d5-eb5ee5974744'
const PLAYOFF = uuids(block('SET is_playoff = true', ');'))
const BRAWL = uuids(block("meet_kind = 'jamboree' AND id IN", ');'))
const ALIASES = block('DELETE FROM wrestler_name_aliases WHERE id IN (', ');').match(/\(([\d, ]+)/)![1].split(',').map(Number)
if (PLAYOFF.length !== 14 || BRAWL.length !== 35 || ALIASES.length !== 23) throw new Error(`id counts ${PLAYOFF.length}/${BRAWL.length}/${ALIASES.length}`)
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }

if (existsSync(BACKUP)) throw new Error('backup exists — already applied?')
const backup = {
  playoff_meets: ok(await db.from('dual_meets_girls').select('*').in('id', [...PLAYOFF, DUP])),
  dup_bouts: ok(await db.from('dual_meet_matches_girls').select('*').eq('dual_meet_id', DUP)),
  brawl_meets: ok(await db.from('dual_meets_girls').select('*').in('id', BRAWL)),
  brawl_bouts: ok(await db.from('dual_meet_matches_girls').select('*').in('dual_meet_id', BRAWL)),
  aliases: ok(await db.from('wrestler_name_aliases').select('*').in('id', ALIASES)),
}
writeFileSync(BACKUP, JSON.stringify(backup, null, 1))
console.log('backup:', Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, (v as any[]).length])))

const keep = ok(await db.from('dual_meets_girls').select('id').eq('id', DUP_KEEP)) as any[]
if (keep.length) console.log('deleted dup playoff', (ok(await db.from('dual_meets_girls').delete().eq('id', DUP).select('id')) as any[]).length)
console.log('tagged playoff', (ok(await db.from('dual_meets_girls').update({ is_playoff: true }).in('id', PLAYOFF).select('id')) as any[]).length)
console.log('deleted brawl meets', (ok(await db.from('dual_meets_girls').delete().eq('meet_kind', 'jamboree').in('id', BRAWL).select('id')) as any[]).length)
console.log('deleted aliases', (ok(await db.from('wrestler_name_aliases').delete().in('id', ALIASES).select('id')) as any[]).length)

const { count: pc } = await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2026).eq('is_playoff', true)
const { count: bc } = await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2026).eq('meet_date', '2025-12-28').eq('meet_kind', 'jamboree')
console.log('verify: playoff meets', pc, '(expect 14); brawl meets', bc, '(expect 0)')
