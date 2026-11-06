// Boys 2025-26 duals whose stored bouts didn't add up to the final score because the import dropped a
// bout the source lists (Dual score gaps 2025-26.xlsx, 2026-11-06):
//   * a bout against an unnamed opponent, "Luke Woronicak (Woodstown) over (Camden/Camden Eastside)
//     (Fall 1:31)": the parser kept the school with a blank name, the importer found no wrestler there
//     and skipped the bout (parser fixed the same day). Woodstown and Toms River East v Camden, 1/3.
//   * two bouts listed at one weight, one weight missing (a weight mislabelled on TrackWrestling):
//     only one bout per weight is stored. Paramus v Jefferson 12/17 lists two at 120 and none at 126:
//     Rory Donoghue over Jayden San Lucas is the 126 (San Lucas wrestled 126 in all 21 of his other
//     bouts). Cherry Hill West v Red Bank Catholic 2/7 lists two at 150 and none at 144: Luken Ramos
//     over Jakob Ubarry is the 144 (Ramos: 144 in 20 of 24), Anthony Russo over John Aumiller the 150.
// With these, each dual's bouts equal its final score.
//   npx tsx --tsconfig tsconfig.json scripts/fix_dual_dropped_bouts_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function wid(name: string, school: number) {
  const a = chk(await db.from('wrestler_name_aliases').select('wrestler_id').eq('raw_name', name).eq('school_id', school), 'alias')
  if (a.length !== 1) throw new Error(`${name} @ ${school}: ${a.length} name links`); return a[0].wrestler_id as string
}
const meet = async (d: string, t1: string, t2: string) => chk(await db.from('dual_meets').select('id, team1_school_id, team2_school_id, team1_score, team2_score').eq('meet_date', d).eq('team1_school_name_raw', t1).eq('team2_school_name_raw', t2), 'meet')[0]
const sum = async (id: string) => chk(await db.from('dual_meet_matches').select('team1_points, team2_points').eq('dual_meet_id', id), 'b').reduce((a, b) => [a[0] + b.team1_points, a[1] + b.team2_points], [0, 0])
const add: any[] = [], move: { id: string; from: number; to: number; label: string }[] = []
const ins = (m: any, w: number, aName: string | null, aId: string | null, bName: string | null, bId: string | null, winnerA: boolean, type: string, detail: string | null, secs: number | null, ws: number | null, ls: number | null, p1: number, p2: number, label: string) =>
  add.push({ label, row: { dual_meet_id: m.id, weight_class: w, wrestler_a_id: aId, wrestler_b_id: bId, school_a_id: aId ? m.team1_school_id : null, school_b_id: bId ? m.team2_school_id : null, winner_id: winnerA ? aId : bId, result_type: type, result_detail: detail, fall_time_seconds: secs, team1_points: p1, team2_points: p2, is_double_forfeit: false, is_forfeit_win: false, validated: false, wrestler_a_name_raw: aName, wrestler_b_name_raw: bName, result_time_estimated: false, winner_score: ws, loser_score: ls } })
const wd = await meet('2026-01-03', 'Woodstown', 'Camden/Camden Eastside')
ins(wd, 138, 'Luke Woronicak', await wid('Luke Woronicak', 295), null, null, true, 'Fall', null, 91, null, null, 6, 0, 'Woodstown v Camden 1/3, 138: Luke Woronicak over (unnamed) Fall 1:31')
const tre = await meet('2026-01-03', 'Toms River East H.S.', 'Camden/Camden Eastside')
ins(tre, 138, 'Michael Hinton', await wid('Michael Hinton', 253), null, null, true, 'Fall', null, 37, null, null, 6, 0, 'Toms River East v Camden 1/3, 138: Michael Hinton over (unnamed) Fall 0:37')
const pa = await meet('2025-12-17', 'Paramus', 'Jefferson TWP')
ins(pa, 126, 'Rory Donoghue', await wid('Rory Donoghue', 57), 'Jayden San Lucas', await wid('Jayden San Lucas', 4), true, 'Fall', null, 49, null, null, 6, 0, 'Paramus v Jefferson 12/17, 126 (listed 120): Rory Donoghue over Jayden San Lucas Fall 0:49')
const ch = await meet('2026-02-07', 'Cherry Hill West', 'Red Bank Catholic Hs')
const ramos = chk(await db.from('dual_meet_matches').select('id, weight_class, wrestler_b_name_raw').eq('dual_meet_id', ch.id).eq('weight_class', 150), 'r')
if (ramos.length !== 1 || ramos[0].wrestler_b_name_raw !== 'Luken Ramos') throw new Error('Cherry Hill 150: expected the stored Ramos bout')
move.push({ id: ramos[0].id, from: 150, to: 144, label: 'Cherry Hill West v Red Bank Catholic 2/7: Luken Ramos over Jakob Ubarry 150 → 144' })
ins(ch, 150, 'John Aumiller', await wid('John Aumiller', 268), 'Anthony Russo', await wid('Anthony Russo', 264), false, 'Fall', null, 110, null, null, 0, 6, 'Cherry Hill West v Red Bank Catholic 2/7, 150: Anthony Russo over John Aumiller Fall 1:50')
for (const [m, n] of [[wd, 'Woodstown'], [tre, 'Toms River East'], [pa, 'Paramus'], [ch, 'Cherry Hill West']] as const) {
  const [s1, s2] = await sum(m.id); const a = add.filter(x => x.row.dual_meet_id === m.id).reduce((t, x) => [t[0] + x.row.team1_points, t[1] + x.row.team2_points], [0, 0])
  console.log(`${n}: final ${m.team1_score}-${m.team2_score}; bouts ${s1}-${s2} → ${s1 + a[0]}-${s2 + a[1]}${s1 + a[0] === m.team1_score && s2 + a[1] === m.team2_score ? ' (adds up)' : ' NOT EQUAL'}`)
}
for (const x of add) console.log('  add:', x.label); for (const x of move) console.log('  move:', x.label)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_dual_dropped_bouts_before.json', JSON.stringify({ moved: chk(await db.from('dual_meet_matches').select('*').in('id', move.map(m => m.id)), 'bk') }, null, 1))
for (const x of move) chk(await db.from('dual_meet_matches').update({ weight_class: x.to }).eq('id', x.id).eq('weight_class', x.from).select('id'), 'move')
const made = chk(await db.from('dual_meet_matches').insert(add.map(x => x.row)).select('id'), 'insert')
fs.writeFileSync('docs/migrations/backups/20261106_dual_dropped_bouts_inserted.json', JSON.stringify(made.map(m => m.id), null, 1))
console.log(`APPLIED: ${made.length} bouts added, ${move.length} weight corrected`)
