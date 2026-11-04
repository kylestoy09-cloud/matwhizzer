// Girls program setup fixes (2026-11-04, approved by Kyle).
//   1. Mt. Olive/Randolph (56) and Parsippany Hills/Parsippany (78) were girls co-ops in 2025-26
//      (TrackWrestling team names) but were never marked: is_combined = true, and Randolph (87) /
//      Parsippany (64) inactive for girls 2025-26, merged into 56 / 78. Neither has any girls
//      records, so nothing moves.
//   2. Schools with real girls records but no girls_schools row (missing from the girls school
//      directory): Indian Hills, Hammonton, Toms River East (2024-25 postseason), Keansburg
//      (2025-26 dual), and Sparta, Northern Highlands, Cherry Hill West, Vineland (own teams in
//      2024-25; already inactive for 2025-26, like Old Tappan and Kittatinny).
//   3. Boys: William "Jayden Ratz" (Seton Hall Prep) → first "William Jayden", last "Ratz".
//   npx tsx --tsconfig tsconfig.json scripts/fix_girls_programs_20261104.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }

const COOPS = [56, 78]
const INACTIVE = [{ school_id: 87, season_id: 2026, gender: 'F', merged_into_school_id: 56 }, { school_id: 64, season_id: 2026, gender: 'F', merged_into_school_id: 78 }]
const ADD = [13, 297, 253, 191, 26, 35, 268, 294]
const RATZ = 'b5140db1-94b9-4257-8396-d040f8f242c7'

const backup = {
  girls_schools: chk(await db.from('girls_schools').select('*').in('school_id', [...COOPS, ...ADD]), 'gs'),
  inactive_school_seasons: chk(await db.from('inactive_school_seasons').select('*').in('school_id', [87, 64]), 'iss'),
  wrestlers: chk(await db.from('wrestlers').select('*').eq('id', RATZ), 'w'),
}
if (backup.inactive_school_seasons.length) throw new Error('87/64 already have inactive rows: check by hand')
if (backup.girls_schools.some(r => ADD.includes(r.school_id))) throw new Error('a school to add already has a girls_schools row')
if (backup.wrestlers[0]?.last_name !== 'Jayden Ratz') throw new Error('Ratz profile not as expected')
const names = new Map(chk(await db.from('schools').select('id, display_name').in('id', ADD), 's').map(s => [s.id, s.display_name]))
const add = ADD.map(id => ({ school_id: id, display_name: names.get(id), is_combined: false }))

console.log('co-op flag on:', backup.girls_schools.filter(r => COOPS.includes(r.school_id)).map(r => `${r.school_id} ${r.display_name} (${r.is_combined})`).join(', '))
console.log('inactive rows:', JSON.stringify(INACTIVE))
console.log('girls_schools add:', add.map(a => `${a.school_id} ${a.display_name}`).join(', '))
console.log('Ratz:', backup.wrestlers[0].first_name, '|', backup.wrestlers[0].last_name, '→ William Jayden | Ratz')
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261104_girls_programs_before.json', JSON.stringify(backup, null, 1))
chk(await db.from('girls_schools').update({ is_combined: true }).in('school_id', COOPS).select('school_id'), 'coop')
chk(await db.from('inactive_school_seasons').insert(INACTIVE).select('school_id'), 'inactive')
chk(await db.from('girls_schools').insert(add).select('school_id'), 'add')
chk(await db.from('wrestlers').update({ first_name: 'William Jayden', last_name: 'Ratz' }).eq('id', RATZ).select('id'), 'ratz')
console.log('APPLIED')
