// Splits profiles that hold two different people (joined by the old same-name import rule).
// Each case moves everything recorded for the profile at `split_school_id` to a new person.
// List: docs/migrations/backups/20261101_merged_wrestler_splits_list.json
// Dry run (default): counts what would move. --apply: backs up every affected row, then splits.
// --skip-judgment: leave the judgment-call cases out.
// Grades: the new person takes their own school's Track roster grade. The kept profile takes
// its own school's roster grade when that differs; when its grade came only from the other
// school's roster row, it is cleared.
// Run: npx tsx --tsconfig tsconfig.json scripts/split_merged_wrestlers.mts [--apply] [--skip-judgment]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { splitWrestlerAtSchool } from '../src/lib/splitWrestler'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')
const skipJudgment = process.argv.includes('--skip-judgment')
type Case = { gender: 'M' | 'F'; wrestler_id: string; name: string; keep_school: string; split_school: string; split_school_id: number; judgment_call: boolean }
const cases = (JSON.parse(fs.readFileSync('docs/migrations/backups/20261101_merged_wrestler_splits_list.json', 'utf8')) as Case[])
  .filter(c => !(skipJudgment && c.judgment_call))

// Every row a split touches, by table: [table, wrestler column, school column]
function targets(g: 'M' | 'F'): [string, string, string][] {
  const dual = g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const tourn = g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  return [
    [dual, 'wrestler_a_id', 'school_a_id'], [dual, 'wrestler_b_id', 'school_b_id'],
    [tourn, 'wrestler1_id', 'wrestler1_school_id'], [tourn, 'wrestler2_id', 'wrestler2_school_id'],
    ['wrestler_name_aliases', 'wrestler_id', 'school_id'],
    ['tournament_placements', 'wrestler_id', 'school_id'], ['tournament_entries', 'wrestler_id', 'school_id'],
    ['in_season_tournament_seeds', 'wrestler_id', 'school_id'], ['wrestler_school_history', 'wrestler_id', 'school_id'],
    ['individual_rankings', 'wrestler_id', 'school_id'], ['roster_grade_import', 'wrestler_id', 'school_id'],
    ['tournament_bracket_slots', 'top_wrestler_id', 'top_school_id'], ['tournament_bracket_slots', 'bottom_wrestler_id', 'bottom_school_id'],
  ]
}

const backup: Record<string, unknown> = {}
let totalRows = 0
for (const c of cases) {
  const rows: Record<string, unknown[]> = {}
  for (const [table, wcol, scol] of targets(c.gender)) {
    const { data, error } = await db.from(table).select('*').eq(wcol, c.wrestler_id).eq(scol, c.split_school_id)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (data?.length) rows[`${table}.${wcol}`] = data
  }
  const { data: w } = await db.from('wrestlers').select('*').eq('id', c.wrestler_id).single()
  backup[`${c.wrestler_id}@${c.split_school_id}`] = { case: c, wrestler: w, rows }
  const n = Object.values(rows).reduce((a, r) => a + r.length, 0)
  totalRows += n
  console.log(`${c.judgment_call ? '?' : ' '} ${c.name.padEnd(20)} keep ${c.keep_school} | new person at ${c.split_school}: ${n} rows (${Object.entries(rows).map(([k, r]) => `${k.split('.')[0]} ${r.length}`).join(', ')})`)
}
console.log(`\n${cases.length} splits, ${totalRows} rows move`)
if (!apply) process.exit(0)

const file = `docs/migrations/backups/20261101_merged_wrestler_splits_before.json`
fs.writeFileSync(file, JSON.stringify(backup))
console.log('backup written:', file)
const results: unknown[] = []
for (const c of cases) {
  const { data: w } = await db.from('wrestlers').select('first_name, last_name, grade, grade_confirmed_at').eq('id', c.wrestler_id).single()
  const { data: rosterRows } = await db.from('roster_grade_import').select('school_id, grade').eq('wrestler_id', c.wrestler_id)
  const { data: keep } = await db.from('schools').select('id').eq('display_name', c.keep_school).limit(1)
  const keepRow  = rosterRows?.find(r => r.school_id === keep?.[0]?.id)
  const splitRow = rosterRows?.find(r => r.school_id === c.split_school_id)

  const r = await splitWrestlerAtSchool(db, c.wrestler_id, c.split_school_id,
    { first_name: w!.first_name, last_name: w!.last_name, grade: splitRow?.grade ?? null }, { moveRecords: true })

  // The kept profile's grade: its own school's roster row wins; a grade that came only from
  // the other school's row belongs to the other person
  let gradeFix: string | null = null
  if (keepRow && keepRow.grade !== w!.grade) {
    await db.from('wrestlers').update({ grade: keepRow.grade, grade_confirmed_at: new Date().toISOString(), grade_confirmed_source: 'roster_upload' }).eq('id', c.wrestler_id)
    gradeFix = `${w!.grade ?? '-'} -> ${keepRow.grade}`
  } else if (!keepRow && splitRow && w!.grade === splitRow.grade) {
    await db.from('wrestlers').update({ grade: null, grade_confirmed_at: null, grade_confirmed_source: null }).eq('id', c.wrestler_id)
    gradeFix = `${w!.grade} -> none (was the other person's)`
  }
  results.push({ ...c, new_wrestler_id: r.newId, new_grade: splitRow?.grade ?? null, kept_grade_fix: gradeFix, moved: r.moved })
  console.log(`split ${c.name} @ ${c.split_school} -> ${r.newId} (grade ${splitRow?.grade ?? '-'})${gradeFix ? ` | kept profile grade ${gradeFix}` : ''}`)
}
fs.writeFileSync(`docs/migrations/backups/20261101_merged_wrestler_splits_done.json`, JSON.stringify(results, null, 1))
