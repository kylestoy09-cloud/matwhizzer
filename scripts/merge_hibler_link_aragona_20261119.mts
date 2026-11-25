// Kyle 2026-11-19: "august is same guy" — August Hibler, Bergen Catholic 2022 (150) and Leonia/Palisades Park 2024 (144),
// two Playoff History profiles: the 2022 one merges into the 2024 one (more records). References counted in every table
// that points at a wrestler first: tournament_entries 2 / 3, playoff_history_entrants 2 / 3, playoff_history_profiles
// 1 / 1, nothing else. And "jojo is pope john": the 2017 Super 32 6th at 138 ("Jojo Aragona", PA) is Joseph Aragona.
// Backs up every row it touches; the emptied profile is deleted only when a recount finds nothing left. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const FROM = '5bcbf575-c742-4d12-8987-71c96dc0f47b', INTO = '22210b79-7c2f-48aa-b5a3-a280af0ffe6f'
const MOVE: [string, string][] = [['tournament_entries', 'wrestler_id'], ['playoff_history_entrants', 'wrestler_id']]
const chk = <T,>(r: { data: T | null; error: { message: string } | null }, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as T }
const backup: Record<string, unknown> = {
  wrestler: chk(await db.from('wrestlers').select('*').eq('id', FROM), 'w'),
  profiles: chk(await db.from('playoff_history_profiles').select('*').in('wrestler_id', [FROM, INTO]), 'php'),
  prospect: chk(await db.from('boys_prospects').select('*').eq('id', 10688), 'pr'),
}
for (const [t, c] of MOVE) backup[`${t}.${c}`] = chk(await db.from(t).select('*').eq(c, FROM), t)
console.log(Object.fromEntries(Object.entries(backup).map(([k, v]) => [k, (v as unknown[]).length])))
if (!APPLY) process.exit(0)
writeFileSync('docs/migrations/backups/20261119_hibler_merge_aragona.json', JSON.stringify(backup, null, 1))
for (const [t, c] of MOVE) chk(await db.from(t).update({ [c]: INTO }).eq(c, FROM).select(c), `move ${t}`)
chk(await db.from('playoff_history_profiles').update({ first_season: 2022 }).eq('wrestler_id', INTO).select('wrestler_id'), 'profile span')
chk(await db.from('playoff_history_profiles').delete().eq('wrestler_id', FROM).select('wrestler_id'), 'profile row')
// recount everything that could still point at him before deleting
let left = 0
for (const [t, c] of [...MOVE, ['playoff_history_profiles', 'wrestler_id'], ['history_finishes', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['boys_prospects', 'wrestler_id'], ['boys_college_entries', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id']] as [string, string][]) {
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, FROM); left += count ?? 0
}
if (left) { console.log(`STOP: ${left} references left — profile kept`); process.exit(1) }
const del = await db.from('wrestlers').delete().eq('id', FROM).select('id')
console.log(del.error ? `STOP: ${del.error.message} — profile kept` : 'August Hibler merged')
chk(await db.from('boys_prospects').update({ wrestler_id: 'fc78c9ac-6be3-43cd-94c0-f3aa1f871ae2', state: 'NJ' }).eq('id', 10688).is('wrestler_id', null).select('id'), 'aragona')
console.log('2017 Jojo Aragona linked')
