// Finish the girls co-op moves the 2026-08-26 / 2026-09-16 migrations left half done (2026-11-03,
// approved by Kyle). Boys rows on these schools are never touched.
//   1. Demarest-Old Tappan (314), 2025-26: Old Tappan (6) is inactive for girls, but its girls
//      entries, duals, bouts, name aliases and roster rows were never moved, and the co-op's
//      TrackWrestling name alias pointed at 6.
//   2. Newton/Kittatinny (24), 2024-25: already a co-op that season; its entries and team totals
//      sat on Kittatinny (315).
//   3. Cherry Hill East-West (267), 2025-26: 9 girls tournament bout sides on Cherry Hill West (268).
//   4. Inactive members' 2025-26 girls district / region assignments (6, 315) removed.
//   5. Season names: the girls co-op names apply to the seasons the co-op existed
//      (school_season_names), so pages built on school_display_name() show them.
//   npx tsx --tsconfig tsconfig.json scripts/fix_girls_coops_20261103.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const tours = chk(await db.from('tournaments').select('id, season_id, gender'), 't')
const girlsT = (s: number) => tours.filter(t => t.gender === 'F' && t.season_id === s).map(t => t.id)
const ist = chk(await db.from('in_season_tournaments_girls').select('id, season'), 'ist')
const girlsIST = (label: string) => ist.filter(x => x.season === label).map(x => x.id)
const backup: Record<string, any[]> = {}
const plan: { what: string; n: number; run: () => Promise<void> }[] = []
const step = async (what: string, table: string, rows: any[], run: () => Promise<void>) => { backup[`${what} :: ${table}`] = rows; plan.push({ what, n: rows.length, run }) }
const sel = async (q: any, w: string) => chk(await q, w)

// ── 1. Old Tappan (6) → Demarest-Old Tappan (314), girls 2025-26 ─────────────────────────────
const e6 = await sel(db.from('tournament_entries').select('*').eq('school_id', 6).in('tournament_id', girlsT(2026)), 'e6')
await step('OT entries → 314', 'tournament_entries', e6, async () => { chk(await db.from('tournament_entries').update({ school_id: 314 }).in('id', e6.map(r => r.id)).select('id'), 'u') })
const dm6 = await sel(db.from('dual_meets_girls').select('*').or('team1_school_id.eq.6,team2_school_id.eq.6').eq('season_id', 2026), 'dm6')
await step('OT dual meets → 314', 'dual_meets_girls', dm6, async () => {
  chk(await db.from('dual_meets_girls').update({ team1_school_id: 314 }).in('id', dm6.map(r => r.id)).eq('team1_school_id', 6).select('id'), 'u1')
  chk(await db.from('dual_meets_girls').update({ team2_school_id: 314 }).in('id', dm6.map(r => r.id)).eq('team2_school_id', 6).select('id'), 'u2')
})
const dmm6 = dm6.length ? await sel(db.from('dual_meet_matches_girls').select('*').in('dual_meet_id', dm6.map(r => r.id)).or('school_a_id.eq.6,school_b_id.eq.6'), 'dmm6') : []
await step('OT dual bouts → 314', 'dual_meet_matches_girls', dmm6, async () => {
  chk(await db.from('dual_meet_matches_girls').update({ school_a_id: 314 }).in('id', dmm6.map(r => r.id)).eq('school_a_id', 6).select('id'), 'a')
  chk(await db.from('dual_meet_matches_girls').update({ school_b_id: 314 }).in('id', dmm6.map(r => r.id)).eq('school_b_id', 6).select('id'), 'b')
})
const tb6 = await sel(db.from('tournament_bouts_girls').select('*').or('wrestler1_school_id.eq.6,wrestler2_school_id.eq.6').in('in_season_tournament_id', girlsIST('2025-26')), 'tb6')
await step('OT tournament bouts → 314', 'tournament_bouts_girls', tb6, async () => {
  chk(await db.from('tournament_bouts_girls').update({ wrestler1_school_id: 314 }).in('id', tb6.map(r => r.id)).eq('wrestler1_school_id', 6).select('id'), '1')
  chk(await db.from('tournament_bouts_girls').update({ wrestler2_school_id: 314 }).in('id', tb6.map(r => r.id)).eq('wrestler2_school_id', 6).select('id'), '2')
})
const pl6 = await sel(db.from('tournament_placements').select('*').eq('school_id', 6).in('in_season_tournament_id', girlsIST('2025-26')), 'pl6')
await step('OT girls placements → 314', 'tournament_placements', pl6, async () => { if (pl6.length) chk(await db.from('tournament_placements').update({ school_id: 314 }).in('id', pl6.map(r => r.id)).select('id'), 'p') })
const ts6 = await sel(db.from('in_season_tournament_team_scores').select('*').eq('school_id', 6).in('tournament_id', girlsIST('2025-26')), 'ts6')
await step('OT girls tournament team scores → 314', 'in_season_tournament_team_scores', ts6, async () => { if (ts6.length) chk(await db.from('in_season_tournament_team_scores').update({ school_id: 314 }).in('id', ts6.map(r => r.id)).select('id'), 's') })
const rg6 = await sel(db.from('roster_grade_import').select('*').eq('school_id', 6).ilike('import_batch', '%girls%'), 'rg6')
await step('OT girls roster rows → 314', 'roster_grade_import', rg6, async () => { if (rg6.length) chk(await db.from('roster_grade_import').update({ school_id: 314 }).in('id', rg6.map(r => r.id)).select('id'), 'r') })
const sa = await sel(db.from('school_aliases').select('*').eq('alias', 'Northern Valley Regional-Demarest/Old Tappan'), 'sa')
await step('co-op team-name alias → 314 (girls)', 'school_aliases', sa, async () => { chk(await db.from('school_aliases').update({ school_id: 314, notes: 'gender:F' }).eq('alias', 'Northern Valley Regional-Demarest/Old Tappan').select('id'), 'al') })

// girls wrestler name aliases: Old Tappan → 314, Kittatinny → 24 (drop a copy the target already has)
async function moveGirlAliases(from: number, to: number, what: string) {
  const rows = (await sel(db.from('wrestler_name_aliases').select('*, wrestlers(gender)').eq('school_id', from), 'wa')).filter((r: any) => r.wrestlers?.gender === 'F')
  await step(what, 'wrestler_name_aliases', rows, async () => {
    const target = await sel(db.from('wrestler_name_aliases').select('raw_name').eq('school_id', to), 't')
    for (const r of rows) {
      if (target.some(t => t.raw_name === r.raw_name)) chk(await db.from('wrestler_name_aliases').delete().eq('id', r.id).select('id'), 'dup')
      else chk(await db.from('wrestler_name_aliases').update({ school_id: to }).eq('id', r.id).select('id'), 'mv')
    }
  })
}
await moveGirlAliases(6, 314, 'OT girls wrestler aliases → 314')

// ── 2. Kittatinny (315) → Newton/Kittatinny (24), girls 2024-25 ──────────────────────────────
const e315 = await sel(db.from('tournament_entries').select('*').eq('school_id', 315).in('tournament_id', girlsT(2025)), 'e315')
await step('Kittatinny 2024-25 entries → 24', 'tournament_entries', e315, async () => { if (e315.length) chk(await db.from('tournament_entries').update({ school_id: 24 }).in('id', e315.map(r => r.id)).select('id'), 'u') })
const pts315 = await sel(db.from('precomputed_team_scores').select('*').eq('school_id', 315).in('tournament_id', girlsT(2025)), 'p315')
const pts24 = await sel(db.from('precomputed_team_scores').select('*').eq('school_id', 24).in('tournament_id', girlsT(2025)), 'p24')
if (pts24.length) throw new Error('Newton already has 2024-25 girls team rows: merge them by hand')
await step('Kittatinny 2024-25 team totals → 24', 'precomputed_team_scores', pts315, async () => { if (pts315.length) chk(await db.from('precomputed_team_scores').update({ school_id: 24, school_name: 'Newton/Kittatinny' }).in('id', pts315.map(r => r.id)).select('id'), 'u') })
await moveGirlAliases(315, 24, 'Kittatinny girls wrestler aliases → 24')

// ── 3. Cherry Hill West (268) → Cherry Hill East-West (267), girls 2025-26 bouts ──────────────
const tb268 = await sel(db.from('tournament_bouts_girls').select('*').or('wrestler1_school_id.eq.268,wrestler2_school_id.eq.268').in('in_season_tournament_id', girlsIST('2025-26')), 'tb268')
await step('CHW tournament bouts → 267', 'tournament_bouts_girls', tb268, async () => {
  chk(await db.from('tournament_bouts_girls').update({ wrestler1_school_id: 267 }).in('id', tb268.map(r => r.id)).eq('wrestler1_school_id', 268).select('id'), '1')
  chk(await db.from('tournament_bouts_girls').update({ wrestler2_school_id: 267 }).in('id', tb268.map(r => r.id)).eq('wrestler2_school_id', 268).select('id'), '2')
})

// ── 4. inactive members' 2025-26 girls district / region assignments ───────────────────────────
for (const t of ['girls_school_districts', 'girls_school_regions']) {
  const rows = await sel(db.from(t).select('*').in('school_id', [6, 315]).eq('season_id', 2026), t)
  await step(`inactive members out of ${t}`, t, rows, async () => { if (rows.length) chk(await db.from(t).delete().in('school_id', [6, 315]).eq('season_id', 2026).select('school_id'), 'd') })
}

// ── 5. girls co-op names for the seasons the co-op existed ─────────────────────────────────────
const gs = new Map(chk(await db.from('girls_schools').select('school_id, display_name'), 'gs').map(s => [s.school_id, s.display_name]))
const names = [[24, 2025], [24, 2026], [76, 2026], [4, 2026], [287, 2026], [267, 2026], [18, 2026], [314, 2026], [56, 2026], [78, 2026]].map(([id, s]) => ({ school_id: id, season_id: s, gender: 'F', display_name: gs.get(id)! }))
const have = await sel(db.from('school_season_names').select('*').eq('gender', 'F'), 'ssn')
const add = names.filter(n => !have.some(h => h.school_id === n.school_id && h.season_id === n.season_id))
await step('girls co-op season names', 'school_season_names', add, async () => { if (add.length) chk(await db.from('school_season_names').insert(add).select('school_id'), 'ins') })

for (const p of plan) console.log(`${String(p.n).padStart(4)}  ${p.what}`)
console.log('season names:', add.map(n => `${n.school_id}/${n.season_id} "${n.display_name}"`).join(', '))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261103_girls_coops_before.json', JSON.stringify(backup, null, 1))
for (const p of plan) { await p.run(); console.log('done:', p.what) }
console.log('APPLIED')
