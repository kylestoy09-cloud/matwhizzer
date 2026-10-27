// Restores school 381 Mary Help of Christians Academy and Kayla Coletta's
// 2024-25 / 2025-26 data, deleted by Part B of
// docs/migrations/20260917_cliffside_ridgefield_s1_fix.sql. See
// docs/migrations/20261026_restore_mary_help_kayla_coletta.sql.
//
//   node --env-file=.env.local scripts/restore_mary_help_kayla_coletta.mts <wrestling_brackets dir> <girls_src dir>
//       dry run: builds and prints every row
//   ... --apply <inserted.json>
//
// Sources (local exports taken before the deletion):
//   source_of_truth_entries.csv / _matches.csv / _team_scores.csv (2026-03-21):
//     her 4 postseason entries and 13 matches with their original ids
//   9/17 FK error on placements for her state entry + state 107 placements
//     1-7 present → 8th place
//   wrestler_match_score_log (2026-09-12 hammer run): ids, opponents and dates
//     of her 17 in-season tournament bouts; details from the Track text exports
//   "January Girls Dual 1-15": Garfield vs. Mary Help (01/15/2026), her 1-0 dual
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { boutResultToDb } from '../src/lib/parseRtf.ts'

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const [baseDir, srcDir, applyFlag, insertedPath] = process.argv.slice(2)
const APPLY = applyFlag === '--apply'
if (!baseDir || !srcDir || (APPLY && !insertedPath)) throw new Error('usage: <wrestling_brackets dir> <girls_src dir> [--apply <inserted.json>]')
const ok = <T,>(r: { data: T; error: any }) => { if (r.error) throw r.error; return r.data }

const SCHOOL = 381
const KAYLA = 'f2efe0e6-36cd-412b-b576-d1f50bae9992'
const WC_107 = 68
const PENN_CHARTER = 'William Penn Charter School'

function split(line: string) { const out: string[] = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out }
function csv(p: string) { const [h, ...rows] = readFileSync(p, 'utf8').replace(/\r/g, '').trim().split('\n'); const k = split(h); return rows.map(r => { const v = split(r); return Object.fromEntries(k.map((x, i) => [x, v[i]])) }) }
const secs = (t: string) => { const [m, s] = t.split(':').map(Number); return m * 60 + s }

// ── Guards: nothing here may already exist ──────────────────────────────────
const existing = ok(await db.from('schools').select('id,display_name').or(`id.eq.${SCHOOL},display_name.eq.Mary Help of Christians Academy,display_name.eq.${PENN_CHARTER}`)) as any[]
if (existing.length) throw new Error(`already present: ${JSON.stringify(existing)}`)
const kayla = ok(await db.from('wrestlers').select('id,first_name,last_name,gender').eq('id', KAYLA).single()) as any
if (kayla.last_name !== 'Coletta' || kayla.gender !== 'F') throw new Error('wrestler mismatch')

// ── 1. School rows (girls side only — Mary Help has no boys program) ────────
const school = {
  id: SCHOOL, display_name: 'Mary Help of Christians Academy', is_nj: true, is_combined: false,
  section: 'Non-Public', town: 'North Haledon', county: 'Passaic',
  logo_url: `https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/${SCHOOL}.png`,
  logo_direction: 'right',   // school_logo_directions.csv
}
const girlsRows = {
  girls_schools: [{ school_id: SCHOOL, display_name: school.display_name, is_combined: false }],
  girls_school_profiles: [{ school_id: SCHOOL, section: 'Non-Public', classification: null }],
  // same District 2 / region tournaments as Paramus Catholic (153), whose rows these copy
  girls_school_districts: [{ school_id: SCHOOL, season_id: 2026, district_id: 2 }],
  girls_school_regions: [{ school_id: SCHOOL, season_id: 2026, region_id: 10 }],
  school_names: [{ school_id: SCHOOL, school_name: school.display_name, abbreviation: 'MHCA' }],   // "MHCA" in the Track dual header
}

// ── 2. Postseason entries, matches, placements ──────────────────────────────
const E = csv(`${baseDir}/source_of_truth_entries.csv`).filter(e => e.last_name === 'Coletta')
const M = csv(`${baseDir}/source_of_truth_matches.csv`).filter(m => /coletta/i.test(m.winner_name + m.loser_name))
if (E.length !== 4 || M.length !== 13) throw new Error(`expected 4 entries / 13 matches, got ${E.length}/${M.length}`)
const grades = new Map(csv(`${baseDir}/grade_updates.csv`).filter(g => /coletta/i.test(g.wrestler_name)).map(g => [g.entry_id, g]))
const entries = E.map(e => {
  // grade_updates.csv covers her 2024-25 region and 2025-26 district entries; the
  // same-season region and state entries take the district grade (Jr)
  const g = grades.get(e.entry_id) ?? (e.season_id === '2' ? { grade: '11', grade_label: 'Jr' } : undefined)
  return {
    id: e.entry_id, wrestler_id: KAYLA, tournament_id: Number(e.tournament_id), school_id: SCHOOL, weight_class_id: WC_107,
    seed: e.seed ? Number(e.seed) : null, grade: g ? Number(g.grade) : null, grade_label: g?.grade_label ?? null,
    wins: 0, losses: 0, school_context_raw: school.display_name, team_points: 0,
  }
})
// regions/state in 2025-26 store score_raw ("Fall 3:02", "7-3"); the others leave it null
const SCORE_RAW_TOURNAMENTS = new Set([181, 185])
const matches = M.map(m => {
  const fall = m.fall_time_seconds ? Number(m.fall_time_seconds) : null
  const ws = m.winner_score ? Number(m.winner_score) : null, ls = m.loser_score ? Number(m.loser_score) : null
  const raw = !SCORE_RAW_TOURNAMENTS.has(Number(m.tournament_id)) ? null
    : m.win_type === 'FALL' ? `Fall ${Math.floor(fall! / 60)}:${String(fall! % 60).padStart(2, '0')}`
    : ws !== null ? `${ws}-${ls}` : null
  return {
    id: m.match_id, tournament_id: Number(m.tournament_id), weight_class_id: WC_107, bracket_side: m.bracket_side,
    round: m.round, winner_entry_id: m.winner_entry_id, loser_entry_id: m.loser_entry_id, win_type: m.win_type,
    winner_score: ws, loser_score: ls, fall_time_seconds: fall, score_raw: raw, validated: true,
  }
})
const oppIds = matches.map(m => m.winner_entry_id === E.find(e => e.tournament_id === String(m.tournament_id))!.entry_id ? m.loser_entry_id : m.winner_entry_id)
const opp = ok(await db.from('tournament_entries').select('id').in('id', oppIds)) as any[]
if (opp.length !== new Set(oppIds).size) throw new Error('an opponent entry is missing')
const placements = [
  { tournament_id: 187, weight_class_id: WC_107, place: 2, entry_id: '30d4df64-a15c-40ab-9907-6d465cf833df', wrestler_name_raw: 'Kayla Coletta' },
  { tournament_id: 185, weight_class_id: WC_107, place: 8, entry_id: 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', wrestler_name_raw: 'Kayla Coletta' },
]
const taken = ok(await db.from('placements').select('tournament_id,place').eq('weight_class_id', WC_107).in('tournament_id', [185, 187])) as any[]
for (const p of placements) if (taken.some(t => t.tournament_id === p.tournament_id && t.place === p.place)) throw new Error(`place ${p.place} in ${p.tournament_id} is taken`)

// ── 3. In-season tournament bouts (original ids from the 9/12 hammer log) ───
// [tournament, opponent, round, Kayla won?, result, detail] — from the Track exports
const T = { garfield: '2233e693-c37e-4122-b3b0-6ee000b00144', mazzola: '0997cea8-7358-4add-99f9-8f2d92cfb4dc', viking: '1f8c733e-fd85-42fb-a586-c468409536cc', patriots: '4883670e-f8ee-4a71-9c00-bbf63bd48834', kards: 'af1d296e-964a-4b6b-8a0c-306eaf14956b' }
const BOUTS: [string, string, string, boolean, string, string | null][] = [
  [T.garfield, 'Salem Fuchs', 'QF', true, 'Fall', '2:48'],
  [T.garfield, 'Ava Connolly', 'SF', true, 'Dec', '5-4'],
  [T.garfield, 'Gabriella Jaquez', 'F', true, 'Fall', '2:23'],
  [T.mazzola, 'Jazlynn Lopez', 'R2', true, 'Fall', '2:33'],
  [T.mazzola, 'Maeve Perry', 'QF', false, 'Fall', '2:32'],
  [T.mazzola, 'Blair Buzniak', 'C1', true, 'Fall', '3:19'],
  [T.mazzola, 'Francis Peraza', '5th_Place', true, 'Fall', '1:29'],
  [T.viking, 'Kashmera Williams', 'QF', true, 'Fall', '2:30'],
  [T.viking, 'Stephanie Tepale', 'SF', true, 'TF', '15-0'],
  [T.viking, 'Lexi Cammarata', 'F', true, 'Dec', '19-13'],
  [T.patriots, 'Jamilah Cotea', 'R2', true, 'Fall', '0:56'],
  [T.patriots, 'Willa Walsh', 'QF', true, 'Fall', '3:28'],
  [T.patriots, 'Annabelle Toye', 'SF', false, 'Dec', '8-3'],
  [T.patriots, 'Hannah Jang', '3rd_Place', true, 'Fall', '2:40'],
  [T.kards, 'Madison Navarro', 'QF', true, 'Fall', '2:30'],
  [T.kards, 'Evalina Guzikowski', 'SF', true, 'MD', '9-1'],
  [T.kards, 'Adriana Yodice', 'F', false, 'TF', '20-4'],
]
const tDates = new Map((ok(await db.from('in_season_tournaments_girls').select('id,start_date').in('id', Object.values(T))) as any[]).map(t => [t.id, t.start_date]))
const log = ok(await db.from('wrestler_match_score_log').select('source_id,opponent_wrestler_id,match_date,is_winner').eq('wrestler_id', KAYLA).eq('match_source', 'tournament_bout')) as any[]
const oppW = ok(await db.from('wrestlers').select('id,first_name,last_name').in('id', log.map(l => l.opponent_wrestler_id))) as any[]
const resultTypes = new Set((ok(await db.from('tournament_bouts_girls').select('result_type').in('in_season_tournament_id', Object.values(T)).limit(3000)) as any[]).map(r => r.result_type))
const bouts: any[] = []
for (const [tid, oppName, round, won, type, detail] of BOUTS) {
  const w = oppW.find(o => `${o.first_name} ${o.last_name}` === oppName)
  if (!w) throw new Error(`opponent not found: ${oppName}`)
  const l = log.find(x => x.opponent_wrestler_id === w.id && x.match_date === tDates.get(tid))
  if (!l || l.is_winner !== won) throw new Error(`hammer log mismatch: ${oppName}`)
  if (!resultTypes.has(type)) throw new Error(`result type ${type} not used in these tournaments`)
  // opponent's school and weight from her other bouts in the same tournament
  const ob = ok(await db.from('tournament_bouts_girls').select('weight_class,wrestler1_id,wrestler1_school_id,wrestler1_school_raw,wrestler2_school_id,wrestler2_school_raw').eq('in_season_tournament_id', tid).or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)) as any[]
  if (!ob.length) throw new Error(`no other bouts for ${oppName}`)
  const side = ob[0].wrestler1_id === w.id ? 1 : 2
  const oSchoolId = ob[0][`wrestler${side}_school_id`], oSchoolRaw = ob[0][`wrestler${side}_school_raw`]
  const isFall = type === 'Fall'
  const [ws, ls] = !isFall && detail ? detail.split('-').map(Number) : [null, null]
  const k = { id: KAYLA, name: 'Kayla Coletta', school_id: SCHOOL, school_raw: school.display_name }
  const o = { id: w.id, name: oppName, school_id: oSchoolId, school_raw: oSchoolRaw }
  const [a, b] = won ? [k, o] : [o, k]
  bouts.push({
    id: l.source_id, in_season_tournament_id: tid, weight_class: ob[0].weight_class, round,
    wrestler1_id: a.id, wrestler1_name_raw: a.name, wrestler1_school_id: a.school_id, wrestler1_school_raw: a.school_raw,
    wrestler2_id: b.id, wrestler2_name_raw: b.name, wrestler2_school_id: b.school_id, wrestler2_school_raw: b.school_raw,
    winner: 1, result_type: type, result_detail: isFall ? null : detail,
    fall_time_seconds: isFall ? secs(detail!) : null, winner_score: ws, loser_score: ls,
    result_time_estimated: false, source_format: 'rtf',
  })
}

// ── 4. Garfield vs. Mary Help dual (01/15/2026) — Mary Help's official 1-0 ──
const tylki = ok(await db.from('wrestlers').select('id').eq('first_name', 'Emilia').eq('last_name', 'Tylki').eq('gender', 'F')) as any[]
if (tylki.length !== 1) throw new Error('Emilia Tylki not unique')
const r = boutResultToDb('Fall', '2:27')
const dual = { season_id: 2026, team1_school_id: 53, team2_school_id: SCHOOL, team1_school_name_raw: 'Garfield', team2_school_name_raw: school.display_name,
  meet_date: '2026-01-15', team1_score: 0, team2_score: 6, status: 'final', meet_kind: 'partial', counts_toward_record: true }
const dualBout = { weight_class: 114, order_index: 0, wrestler_a_id: tylki[0].id, wrestler_b_id: KAYLA, wrestler_a_name_raw: 'Emilia Tylki', wrestler_b_name_raw: 'Kayla Coletta',
  school_a_id: 53, school_b_id: SCHOOL, winner_id: KAYLA, result_type: r.db_type, result_detail: r.db_detail, fall_time_seconds: r.fall_time_seconds,
  result_time_estimated: r.result_time_estimated, winner_score: r.winner_score, loser_score: r.loser_score, team1_points: 0, team2_points: 6,
  is_double_forfeit: false, is_forfeit_win: false, validated: false }

// ── 5. Official standings row (2026 final standings girls: non-classified, 1-0, 23 PP) ──
const pp = { school_id: SCHOOL, season_id: 2026, gender: 'F', power_points: 23, overall_wins: 1, overall_losses: 0, overall_ties: 0, meets_counted: 1, pp_group: 'non_classified' }

// ── 6. Team scores (source_of_truth_team_scores.csv) ────────────────────────
const TS = csv(`${baseDir}/source_of_truth_team_scores.csv`).filter(t => t.school_name === school.display_name)
const TYPE: Record<string, string> = { girls_regions: 'girls_regions', districts: 'girls_districts', girls_state: 'girls_state' }
const tSeason = new Map((ok(await db.from('tournaments').select('id,season_id').in('id', TS.map(t => Number(t.tournament_id)))) as any[]).map(t => [t.id, t.season_id]))
const teamScores = TS.map(t => ({ tournament_id: Number(t.tournament_id), school_id: SCHOOL, school_name: school.display_name, total_points: Number(t.total_points), season_id: tSeason.get(Number(t.tournament_id)), tournament_type: TYPE[t.tournament_type] }))

const plan = { school, penn: { display_name: PENN_CHARTER, is_nj: false, is_combined: false }, ...girlsRows, entries, matches, placements, bouts, dual, dualBout, pp, teamScores }
console.log(JSON.stringify(Object.fromEntries(Object.entries(plan).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1]))))
if (!APPLY) { writeFileSync(`${srcDir}/../restore_plan.json`, JSON.stringify(plan, null, 1)); process.exit(0) }

// ── Apply (each step recorded, so a failure can be rolled back exactly) ─────
const done: any = { steps: [] }
const save = () => writeFileSync(insertedPath, JSON.stringify(done, null, 1))
async function ins(table: string, rows: any, select = 'id') {
  const out = ok(await db.from(table).insert(rows).select(select)) as any[]
  done.steps.push({ table, rows: out }); save(); return out
}
await ins('schools', school)
await ins('schools', plan.penn)
for (const [t, rows] of Object.entries(girlsRows)) await ins(t, rows, '*')
await ins('tournament_entries', entries)
await ins('matches', matches)
await ins('placements', placements)
await ins('tournament_bouts_girls', bouts)
const [d] = await ins('dual_meets_girls', dual)
await ins('dual_meet_matches_girls', { ...dualBout, dual_meet_id: d.id })
await ins('power_points', pp)
await ins('precomputed_team_scores', teamScores)
await ins('wrestler_name_aliases', { raw_name: 'Kayla Coletta', school_id: SCHOOL, wrestler_id: KAYLA })
console.log('applied', done.steps.map((s: any) => `${s.table}:${s.rows.length}`).join(' '))
