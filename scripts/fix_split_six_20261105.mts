// (2026-11-05, Kyle's rule) Six more 2024-25 senior profiles carrying 2025-26 records at a different
// school: those are different boys. A new profile for each 2025-26 wrestler (his Track grade when
// his exact name is on that school's 2025-26 Track roster) takes his 2025-26 duals, in-season
// tournament bouts, postseason entries and name links at that school; the senior goes inactive.
//   npx tsx --tsconfig tsconfig.json scripts/fix_split_six_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const APPLY = process.argv.includes('--apply')
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const schools = chk(await db.from('schools').select('id, display_name'), 's'); const sid = (n: string) => schools.find((s: any) => s.display_name === n).id
const ist26 = new Set(chk(await db.from('in_season_tournaments').select('id').eq('season', '2025-26'), 'ist').map((x: any) => x.id))
const post26 = new Set(chk(await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026), 't').map((x: any) => x.id))
const d25 = new Set(chk(await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025).eq('tournament_type', 'districts'), 'd').map((x: any) => x.id))
const SIX: [string, string, string, string][] = [['Gabriel', 'Rodriguez', 'Cumberland', 'Westwood'], ['Jayden', 'Rodriguez', 'Roselle Park', 'River Dell'], ['Jose', 'Rodriguez', 'South Plainfield', 'Raritan'], ['Joel', 'Martinez', 'Haddon Heights', 'East Orange'], ['James', 'Cook', 'Middletown South', 'Schalick'], ['Tyler', 'French', 'Lacey', 'Waldwick']]
const backup: Record<string, unknown> = {}, tasks: (() => Promise<void>)[] = [], out: string[] = []
for (const [first, last, oldSchool, school] of SIX) {
  const so = sid(oldSchool), s = sid(school)
  const cands = chk(await db.from('wrestlers').select('*').eq('gender', 'M').eq('first_name', first).eq('last_name', last), 'w')
  const owners = []
  for (const c of cands) { const e = chk(await db.from('tournament_entries').select('tournament_id, school_id, grade_label').eq('wrestler_id', c.id), 'e'); if (e.some((x: any) => d25.has(x.tournament_id) && x.school_id === so && x.grade_label === 'Sr')) owners.push(c) }
  if (owners.length !== 1) throw new Error(`${first} ${last}: ${owners.length} senior profiles at ${oldSchool}`)
  const w = owners[0], id = w.id
  const dm = chk(await db.from('dual_meet_matches').select('*, dual_meets!inner(season_id, gender)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`).eq('dual_meets.season_id', 2026), 'dm').filter((b: any) => (b.wrestler_a_id === id ? b.school_a_id : b.school_b_id) === s)
  const tb = chk(await db.from('tournament_bouts').select('*').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`), 'tb').filter((b: any) => ist26.has(b.in_season_tournament_id) && (b.wrestler1_id === id ? b.wrestler1_school_id : b.wrestler2_school_id) === s)
  const te = chk(await db.from('tournament_entries').select('*').eq('wrestler_id', id).eq('school_id', s), 'te').filter((e: any) => post26.has(e.tournament_id))
  const al = chk(await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', id).eq('school_id', s), 'al')
  const tr = chk(await db.from('roster_grade_import').select('*').eq('school_id', s).eq('gender', 'M').eq('season_id', 2026), 'tr').filter((r: any) => key(r.first_name_raw + r.last_name_raw) === key(first + last))
  const track = tr.length === 1 && (!tr[0].wrestler_id || tr[0].wrestler_id === id) ? tr[0] : null
  backup[id] = { wrestler: w, dm: dm.map(({ dual_meets, ...r }: any) => r), tb, te, al, track }
  out.push(`${first} ${last}: new profile @ ${school} (${track ? `Track ${track.grade}` : 'no Track row: no grade'}) gets ${dm.length} duals, ${tb.length} tournament bouts, ${te.length} postseason entries, ${al.length} name links | senior @ ${oldSchool} → inactive, grade ${w.grade}→Sr`)
  tasks.push(async () => {
    const now = new Date().toISOString()
    const n = chk(await db.from('wrestlers').insert({ first_name: first, last_name: last, gender: 'M', is_oos: false, is_active: true, grade: track?.grade ?? null, grade_confirmed_source: track ? 'roster_upload' : null, grade_confirmed_at: track ? now : null }).select('id'), 'new')[0].id
    backup[`${id} new`] = n
    for (const b of dm) chk(await db.from('dual_meet_matches').update({ ...(b.wrestler_a_id === id ? { wrestler_a_id: n } : { wrestler_b_id: n }), ...(b.winner_id === id ? { winner_id: n } : {}) }).eq('id', b.id).select('id'), 'dm')
    for (const b of tb) chk(await db.from('tournament_bouts').update(b.wrestler1_id === id ? { wrestler1_id: n } : { wrestler2_id: n }).eq('id', b.id).select('id'), 'tb')
    for (const e of te) chk(await db.from('tournament_entries').update({ wrestler_id: n }).eq('id', e.id).select('id'), 'te')
    for (const a of al) chk(await db.from('wrestler_name_aliases').update({ wrestler_id: n }).eq('id', a.id).select('id'), 'al')
    if (track) chk(await db.from('roster_grade_import').update({ wrestler_id: n, status: 'confirmed', confirmed_at: now, confirmed_by: 'kyle.stoy09@gmail.com' }).eq('id', track.id).select('id'), 'track')
    // the senior keeps his own 2024-25 grade (the profile's current grade was the 2025-26 boy's)
    chk(await db.from('wrestlers').update({ is_active: false, grade: 'Sr', grade_confirmed_source: 'districts', grade_confirmed_at: now }).eq('id', id).select('id'), 'senior')
    for (const t of ['wrestler_hammer_scores', 'wrestler_match_score_log', 'lb_rs_wrestler', 'lb_ps_wrestler', 'snapshot_streak_state']) chk(await db.from(t).delete().eq('wrestler_id', id).select(t.startsWith('lb_') ? 'wrestler_id' : '*'), t)
  })
}
for (const l of out) console.log(l)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_split_six_before.json', JSON.stringify(backup, null, 1))
for (const t of tasks) await t()
fs.writeFileSync('docs/migrations/backups/20261105_split_six_before.json', JSON.stringify(backup, null, 1))
console.log('APPLIED')
