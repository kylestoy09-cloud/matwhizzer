// Restore boys 2025-26 district bouts and placements that were in the database on 2026-03-21 and
// are gone now (2026-11-05). Proof: the 3/21 export (../source_of_truth_matches.csv,
// ../source_of_truth_entries.csv, ../source_of_truth_placements.csv) lists each bout with its
// database id; those ids and their entries no longer exist. All six wrestlers are shared-name
// cases: 3/20 build_from_gt.py put their entry on the other same-name profile, 8/21
// fix_merged_profiles.py split the profiles, and at an unknown later point the entry, its bouts
// and its placement were deleted (no script, log or backup records it). Five of the six were
// re-entered later with no bouts; Anthony Russo (Red Bank Catholic, D32 150 seed 1) was not.
//   npx tsx --tsconfig tsconfig.json scripts/restore_lost_district_bouts_20261105.mts [--apply]
// Each bout is re-inserted only if its opponent's entry still exists in the same bracket and the
// bracket has no bout with the same round and the same two entries. A placement is re-inserted
// only if that place is empty in the bracket.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }

// quoted-field CSV
function csv(file: string) {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false
  const s = fs.readFileSync(file, 'utf8')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = '' }
    else if (c !== '\r') f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [h, ...r] = rows
  return r.map(x => Object.fromEntries(h.map((k, i) => [k, x[i] ?? ''])))
}
const SM = csv('../source_of_truth_matches.csv'), SE = csv('../source_of_truth_entries.csv'), SP = csv('../source_of_truth_placements.csv')
const WC: Record<string, number> = { 106: 53, 113: 54, 120: 55, 126: 56, 132: 57, 138: 58, 144: 59, 150: 60, 157: 61, 165: 62, 175: 63, 190: 64, 215: 65, 285: 66 }

// lost 3/21 entry → today's entry for the same wrestler (null = create one)
const CASES: { old: string; now: string | null; wrestler?: string; school?: number }[] = [
  { old: 'b9e1b254-a0c2-484f-87b6-86f08f96df84', now: 'd3e8a854' },  // Ryan Kim, Fort Lee, D8 165
  { old: '4bde699a', now: 'd78cd7e2' },                               // Peter Terranova, Edison, D18 126
  { old: 'bd4d2049', now: '7baaa515' },                               // Julian Sanchez, WW-P North, D19 215
  { old: 'e70b6c28', now: '18f1eb6d' },                               // Owen Williams, Manchester Twp, D26 106
  { old: 'c00220c0', now: '0582439b' },                               // Aidan Johnson, Gloucester City, D28 138
  { old: '9e4bab48', now: null, wrestler: '99e50f31', school: 264 },  // Anthony Russo, Red Bank Catholic, D32 150
]

const full = (prefix: string, ids: string[]) => { const m = ids.filter(i => i.startsWith(prefix)); if (m.length !== 1) throw new Error(`id ${prefix}: ${m.length} matches`); return m[0] }
const score = (wt: string, sw: string, sl: string, ft: string) => {
  if (wt === 'FALL' && ft) { const m = Math.floor(Number(ft) / 60), s = Number(ft) % 60; return `Fall ${m}:${String(s).padStart(2, '0')}` }
  if (wt === 'TF-1.5' && sw && sl) return `TF-1.5 ${sw}-${sl}`
  if (sw && sl) return `${sw}-${sl}`
  return null
}

const plan: { entry?: any; matches: any[]; placements: any[]; label: string; target: string | null; c: typeof CASES[number] }[] = []
const before: Record<string, any> = {}
for (const c of CASES) {
  const old = SE.find(e => e.entry_id.startsWith(c.old)); if (!old) throw new Error(`3/21 entry ${c.old} not in the export`)
  if (chk(await db.from('tournament_entries').select('id').eq('id', old.entry_id), 'old').length) throw new Error(`entry ${old.entry_id} still exists`)
  const tid = Number(old.tournament_id), wc = WC[old.weight]
  const bracket = chk(await db.from('tournament_entries').select('id, wrestler_id, seed, grade, grade_label, wrestlers(first_name, last_name)').eq('tournament_id', tid).eq('weight_class_id', wc), 'bracket')
  const label = `${old.tournament_name} ${old.weight}: ${old.first_name} ${old.last_name} (${old.school})`
  let target: string | null = null, entry: any
  if (c.now) {
    target = full(c.now, bracket.map(b => b.id))
    const t = bracket.find(b => b.id === target)!
    if (t.wrestlers.first_name !== old.first_name || t.wrestlers.last_name !== old.last_name) throw new Error(`${label}: today's entry is ${t.wrestlers.first_name} ${t.wrestlers.last_name}`)
  } else {
    const w = chk(await db.from('wrestlers').select('id, first_name, last_name').eq('first_name', old.first_name).eq('last_name', old.last_name).eq('gender', 'M'), 'w').filter(x => x.id.startsWith(c.wrestler!))
    if (w.length !== 1) throw new Error(`${label}: profile ${c.wrestler} not found`)
    if (bracket.some(b => b.wrestler_id === w[0].id)) throw new Error(`${label}: already entered`)
    if (bracket.some(b => b.seed === Number(old.seed))) throw new Error(`${label}: seed ${old.seed} is taken`)
    // grade from his other 2025-26 postseason entries
    const other = chk(await db.from('tournament_entries').select('grade, grade_label, tournaments(season_id)').eq('wrestler_id', w[0].id), 'o').find(x => x.tournaments.season_id === 2026 && x.grade_label)
    entry = { wrestler_id: w[0].id, tournament_id: tid, school_id: c.school, weight_class_id: wc, seed: Number(old.seed), grade: other?.grade ?? null, grade_label: other?.grade_label ?? null, wins: 0, losses: 0, school_context_raw: old.school, team_points: 0 }
  }
  const existing = chk(await db.from('matches').select('*').eq('tournament_id', tid).eq('weight_class_id', wc), 'm')
  const existingPl = chk(await db.from('placements').select('*').eq('tournament_id', tid).eq('weight_class_id', wc), 'p')
  before[label] = { entries: bracket, matches: existing, placements: existingPl }
  const ids = new Set(bracket.map(b => b.id))
  const matches = []
  for (const m of SM.filter(m => m.winner_entry_id === old.entry_id || m.loser_entry_id === old.entry_id)) {
    if (chk(await db.from('matches').select('id').eq('id', m.match_id), 'mid').length) throw new Error(`bout ${m.match_id} still exists`)
    const opp = m.winner_entry_id === old.entry_id ? m.loser_entry_id : m.winner_entry_id
    if (opp && !ids.has(opp)) throw new Error(`${label} ${m.round}: opponent entry ${opp} is not in the bracket`)
    const me = target ?? '(new entry)'
    const w = m.winner_entry_id === old.entry_id ? me : m.winner_entry_id, l = m.loser_entry_id === old.entry_id ? me : (m.loser_entry_id || null)
    if (target && existing.some(x => x.round === m.round && x.winner_entry_id === w && x.loser_entry_id === l)) continue
    matches.push({ id: m.match_id, tournament_id: tid, weight_class_id: wc, bracket_side: m.bracket_side, round: m.round, winner_entry_id: w, loser_entry_id: l, win_type: m.win_type, winner_score: m.winner_score ? Number(m.winner_score) : null, loser_score: m.loser_score ? Number(m.loser_score) : null, fall_time_seconds: m.fall_time_seconds ? Number(m.fall_time_seconds) : null, score_raw: score(m.win_type, m.winner_score, m.loser_score, m.fall_time_seconds), validated: true, _names: `${m.winner_name} over ${m.loser_name}` })
  }
  const placements = SP.filter(p => p.entry_id === old.entry_id).filter(p => !existingPl.some(x => x.place === Number(p.place))).map(p => ({ tournament_id: tid, weight_class_id: wc, place: Number(p.place), entry_id: target ?? '(new entry)', wrestler_name_raw: p.wrestler_name }))
  plan.push({ entry, matches, placements, label, target, c })
}

for (const p of plan) {
  console.log(`${p.label}${p.entry ? ` — new entry, seed ${p.entry.seed}, grade ${p.entry.grade_label ?? '-'}` : ''}`)
  for (const m of p.matches) console.log(`   bout ${m.round} ${m._names} ${m.win_type} ${m.score_raw ?? ''}`)
  for (const pl of p.placements) console.log(`   place ${pl.place}`)
}
console.log(`total: ${plan.filter(p => p.entry).length} entries, ${plan.reduce((a, p) => a + p.matches.length, 0)} bouts, ${plan.reduce((a, p) => a + p.placements.length, 0)} placements`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

// The service role can't write matches (SELECT grant only), so --apply inserts the entry and the
// placements and writes the bouts to a SQL file for the Supabase SQL editor, as with
// 20261026_restore_mary_help_kayla_coletta.sql.
const SQL = 'docs/migrations/20261105_restore_lost_district_bouts.sql'
const inserted: any = { entries: [], placements: [] }
const values: string[] = []
const v = (x: any) => x == null ? 'NULL' : typeof x === 'number' || typeof x === 'boolean' ? String(x) : `'${String(x).replace(/'/g, "''")}'`
fs.writeFileSync('docs/migrations/backups/20261105_restore_lost_district_bouts_before.json', JSON.stringify({ before, plan }, null, 1))
for (const p of plan) {
  let eid = p.target
  if (p.entry) { eid = chk(await db.from('tournament_entries').insert(p.entry).select('id'), 'insert entry')[0].id; inserted.entries.push(eid) }
  if (p.placements.length) inserted.placements.push(...chk(await db.from('placements').insert(p.placements.map(x => ({ ...x, entry_id: eid }))).select('id'), 'insert placements').map(x => x.id))
  for (const { _names, ...m } of p.matches) {
    const w = m.winner_entry_id === '(new entry)' ? eid : m.winner_entry_id, l = m.loser_entry_id === '(new entry)' ? eid : m.loser_entry_id
    values.push(`    (${[m.id, m.tournament_id, m.weight_class_id, m.bracket_side, m.round, w, l, m.win_type, m.winner_score, m.loser_score, m.fall_time_seconds, m.score_raw, true].map(v).join(', ')}),  -- ${p.label.replace('Boy_s Districts ', '')} ${m.round}: ${_names}`)
  }
  console.log(`done: ${p.label} → entry ${eid!.slice(0, 8)}, placement rows ${p.placements.length}`)
}
fs.writeFileSync('docs/migrations/backups/20261105_restore_lost_district_bouts_inserted.json', JSON.stringify(inserted, null, 1))
const last = values.length - 1
fs.writeFileSync(SQL, `-- docs/migrations/20261105_restore_lost_district_bouts.sql
--
-- Restores 10 boys 2025-26 district bouts that were in the database on 2026-03-21
-- (source_of_truth_matches.csv, original ids) and were deleted later with their entries,
-- by something not recorded anywhere. Wrestlers: Ryan Kim (Fort Lee, D8 165), Peter
-- Terranova (Edison, D18 126), Julian Sanchez (WW-P North, D19 215), Owen Williams
-- (Manchester Twp, D26 106), Aidan Johnson (Gloucester City, D28 138), Anthony Russo
-- (Red Bank Catholic, D32 150).
--
-- Service-role rows (scripts/restore_lost_district_bouts_20261105.mts; ids in
-- docs/migrations/backups/20261105_restore_lost_district_bouts_inserted.json):
--   tournament_entries x1 (Anthony Russo, D32 150 seed 1); placements x2 (Kim 2nd, Russo 2nd).
-- The service role has no grant on matches, so this file inserts the bouts.
-- Run it in the Supabase SQL editor.

INSERT INTO matches
  (id, tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id,
   win_type, winner_score, loser_score, fall_time_seconds, score_raw, validated)
VALUES
${values.map((x, i) => i === last ? x.replace('),  --', ')   --') : x).join('\n')}
ON CONFLICT (id) DO NOTHING;

-- Verify: expect 10 rows
SELECT t.name, m.round, m.win_type, m.score_raw
FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE m.id IN (${plan.flatMap(p => p.matches.map(m => `'${m.id}'`)).join(', ')})
ORDER BY t.id, m.round;

-- ROLLBACK: DELETE FROM matches WHERE id IN (the 10 ids above); then delete the
-- service-role rows by the ids in the backup file.
`)
console.log(`APPLIED (entry + placements). Bouts: run ${SQL} in the Supabase SQL editor.`)
