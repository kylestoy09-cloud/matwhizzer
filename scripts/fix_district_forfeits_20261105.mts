// Boys district forfeits (2026-11-05, approved by Kyle): 2025-26, and 2024-25 with --season 2025.
// The 2026-03-20 load wrote the loser of every forfeit as the word "FORFEIT", so all 202 district
// forfeit bouts were stored with no loser. TrackWrestling's text
// (../Match Data/2026 District Match Data.py) still names every loser:
//   - a real wrestler (has a school, not a "Forfeit" name): 23 bouts. The loser goes back on the
//     bout; 3 of them (Cloos D26, Roche and Nocelotl D9) never had a bracket entry and get one.
//   - a filler entry ("Forfeit", "D Forfeit", D17's coaches' names): counts as a contested match.
//   - an empty slot ("over () (For.)"): a forfeit win that is not a contested match.
// Placement rows missing for a bracket's 1st-4th are added from the bouts. Team deductions
// (unsportsmanlike, -1 each) are official total minus the scoring rules' total when that is a whole
// number of points short (docs/reviews/trackwrestling_team_scoring.md).
//   npx tsx --tsconfig tsconfig.json scripts/fix_district_forfeits_20261105.mts [--season 2025] [--apply]
// --season 2025 (2024-25) reads ../Match Data/2025 District Data.py; default 2026 (2025-26).
// --apply writes the entries and placements (service role) and the SQL file for the bouts, the
// forfeit_opponent column and the deductions table (the service role can't write matches).
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await q(i, i + 999), 'page'); o.push(...d); if (d.length < 1000) break } return o }
const SEASON = process.argv.includes('--season') ? Number(process.argv[process.argv.indexOf('--season') + 1]) : 2026
if (![2025, 2026].includes(SEASON)) throw new Error('--season 2025 or 2026')
const SFX = SEASON === 2026 ? '' : `_${SEASON}`
const SRC = SEASON === 2026 ? '../Match Data/2026 District Match Data.py' : '../Match Data/2025 District Data.py'
const SQL = `docs/migrations/20261105_district_forfeits_and_deductions${SFX}.sql`
const WCW: Record<number, number> = { 53: 106, 54: 113, 55: 120, 56: 126, 57: 132, 58: 138, 59: 144, 60: 150, 61: 157, 62: 165, 63: 175, 64: 190, 65: 215, 66: 285 }
const RND: Record<string, string> = { 'Champ. Round 1': 'R2', Quarterfinal: 'QF', Semifinal: 'SF', '1st Place Match': 'F', '3rd Place Match': '3rd_Place' }
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')

// ── TrackWrestling forfeit lines, by weight|round|winner ──────────────────────────────────────────
const tw = new Map<string, { loser: string; school: string }>()
let w = 0
for (const raw of fs.readFileSync(SRC, 'utf8').replace(/\r/g, '').split('\n')) {
  const l = raw.trim(); if (/^\d{3}$/.test(l)) { w = Number(l); continue }
  const m = l.match(/^(Champ\. Round 1|Quarterfinal|Semifinal|1st Place Match|3rd Place Match) - (.+?) \(([^)]*(?:\([^)]*\)[^)]*)*)\) [\d-]+ won by (?:medical forfeit|forfeit|injury default) over (\(\)|.*?) \(([^)]*)\)/)
  if (m) tw.set(`${w}|${RND[m[1]]}|${n(m[2])}`, { loser: m[4].trim(), school: m[5].trim() })
}

const tours = chk(await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', SEASON).eq('tournament_type', 'districts'), 't')
const tids = tours.map(t => t.id)
const ents = await all((f, t) => db.from('tournament_entries').select('id, tournament_id, weight_class_id, school_id, wrestlers(first_name, last_name)').in('tournament_id', tids).range(f, t))
const ms = await all((f, t) => db.from('matches').select('id, tournament_id, weight_class_id, round, bracket_side, win_type, winner_entry_id, loser_entry_id, w:winner_entry_id(wrestlers(first_name, last_name))').in('tournament_id', tids).range(f, t))
const entName = (e: any) => n(`${e.wrestlers.first_name}${e.wrestlers.last_name}`)

const setLoser: { id: string; loser: string; label: string }[] = []
const newEntries: { key: string; row: any; label: string }[] = []
const opp = new Map<string, 'filler' | 'empty'>()
const unknown: string[] = []
// a bout with no winner either (an empty row) scores nothing: left as is and listed
const emptyRows = ms.filter(m => !m.loser_entry_id && !m.winner_entry_id)
for (const m of ms.filter(m => !m.loser_entry_id && m.winner_entry_id)) {
  const x = tw.get(`${WCW[m.weight_class_id]}|${m.round}|${n(`${m.w?.wrestlers?.first_name}${m.w?.wrestlers?.last_name}`)}`)
  const label = `${tours.find(t => t.id === m.tournament_id).name.replace('Boy_s Districts ', '')} ${WCW[m.weight_class_id]} ${m.round}`
  if (!x) { unknown.push(label); continue }
  if (x.loser === '' || x.loser === '()') { opp.set(m.id, 'empty'); continue }
  if (x.school === '' || /forfeit/i.test(x.loser)) { opp.set(m.id, 'filler'); continue }
  const hit = ents.filter(e => e.tournament_id === m.tournament_id && e.weight_class_id === m.weight_class_id && entName(e) === n(x.loser))
  if (hit.length === 1) { setLoser.push({ id: m.id, loser: hit[0].id, label: `${label}: ${x.loser} (${x.school})` }); continue }
  if (hit.length > 1) throw new Error(`${label}: ${x.loser} has ${hit.length} entries`)
  // no entry: the wrestler's profile, linked at that school
  const [first, ...rest] = x.loser.split(' ')
  const prof = chk(await db.from('wrestlers').select('id').eq('gender', 'M').ilike('first_name', first).ilike('last_name', rest.join(' ')), 'p')
  const links = prof.length ? chk(await db.from('wrestler_name_aliases').select('wrestler_id, school_id').in('wrestler_id', prof.map(p => p.id)), 'a') : []
  if (links.length !== 1) throw new Error(`${label}: ${x.loser} — ${prof.length} profiles, ${links.length} links`)
  const key = `${m.tournament_id}|${m.weight_class_id}|${links[0].wrestler_id}`
  if (!newEntries.some(e => e.key === key)) newEntries.push({ key, label: `${label}: ${x.loser} (${x.school})`, row: { wrestler_id: links[0].wrestler_id, tournament_id: m.tournament_id, school_id: links[0].school_id, weight_class_id: m.weight_class_id, seed: null, wins: 0, losses: 0, school_context_raw: x.school, team_points: 0 } })
  setLoser.push({ id: m.id, loser: `new:${key}`, label: `${label}: ${x.loser} (${x.school}) [new entry]` })
}
if (unknown.length) throw new Error(`no TrackWrestling line for: ${unknown.join('; ')}`)
// contested forfeits that do have a loser are left unmarked (a real opponent)

// ── placements: 1st-4th from F and 3rd_Place, with the losers put back ─────────────────────────────
const loserOf = new Map(setLoser.map(s => [s.id, s.loser]))
const pl = await all((f, t) => db.from('placements').select('tournament_id, weight_class_id, place, entry_id').in('tournament_id', tids).range(f, t))
const newPl: any[] = []
for (const m of ms.filter(m => m.round === 'F' || m.round === '3rd_Place')) {
  const [pw, pll] = m.round === 'F' ? [1, 2] : [3, 4]
  for (const [place, entry] of [[pw, m.winner_entry_id], [pll, m.loser_entry_id ?? loserOf.get(m.id) ?? null]] as [number, string | null][]) {
    if (!entry || pl.some(p => p.tournament_id === m.tournament_id && p.weight_class_id === m.weight_class_id && p.place === place)) continue
    const e = ents.find(x => x.id === entry)
    newPl.push({ tournament_id: m.tournament_id, weight_class_id: m.weight_class_id, place, entry_id: entry, wrestler_name_raw: e ? `${e.wrestlers.first_name} ${e.wrestlers.last_name}` : null })
  }
}

// ── deductions: official minus the rules, when a whole number of points short ───────────────────────
const PLACES: Record<number, number> = { 1: 14, 2: 10, 3: 7, 4: 4 }
const ORDER = ['R2', 'QF', 'SF', 'F']
const bonus = (t: string) => ['FALL', 'FORF', 'M-FORF', 'INJ', 'DQ'].includes(t) ? 2 : t.startsWith('TF') ? 1.5 : t === 'MD' ? 1 : 0
const deductions: { tournament_id: number; school_id: number; points: number; label: string }[] = []
const remaining: string[] = []
const off = await all((f, t) => db.from('precomputed_team_scores').select('tournament_id, school_id, total_points').in('tournament_id', tids).range(f, t))
for (const t of tours) {
  const tm = ms.filter(m => m.tournament_id === t.id).map(m => ({ ...m, loser_entry_id: m.loser_entry_id ?? (loserOf.get(m.id)?.startsWith('new:') ? null : loserOf.get(m.id)) ?? null, empty: opp.get(m.id) === 'empty' }))
  const te = ents.filter(e => e.tournament_id === t.id)
  const placeOf = new Map<string, number>([...pl, ...newPl].filter(p => p.tournament_id === t.id).map(p => [p.entry_id, p.place]))
  const pts = new Map<string, number>()
  for (const e of te) {
    const mine = tm.filter(m => m.winner_entry_id === e.id || m.loser_entry_id === e.id)
    let p = 0
    for (const m of mine) if (m.winner_entry_id === e.id) p += (m.round === 'F' || m.round === '3rd_Place' ? 0 : m.bracket_side === 'championship' ? 2 : 1) + (!m.loser_entry_id ? 2 : bonus(m.win_type))
    const first = mine.filter(m => m.bracket_side === 'championship' && ORDER.includes(m.round)).map(m => ORDER.indexOf(m.round)).sort((a, b) => a - b)[0]
    if (first > 0) {
      const next = mine.filter(m => !m.empty && m.bracket_side === 'championship' && ORDER.includes(m.round)).sort((a, b) => ORDER.indexOf(a.round) - ORDER.indexOf(b.round))[0]
      if (next && next.winner_entry_id === e.id) p += 2 * first
    }
    const place = placeOf.get(e.id); if (place) p += PLACES[place] ?? 0
    pts.set(e.id, p)
  }
  for (const o of off.filter(o => o.tournament_id === t.id)) {
    const calc = te.filter(e => e.school_id === o.school_id).reduce((a, e) => a + (pts.get(e.id) ?? 0), 0)
    const d = Number(o.total_points) - calc
    if (Math.abs(d) >= 0.01 && !(d <= -1 && Number.isInteger(d))) remaining.push(`${t.name.replace('Boy_s Districts ', '')} school ${o.school_id}: official ${o.total_points}, rules ${calc}`)
    if (d <= -1 && Number.isInteger(d)) deductions.push({ tournament_id: t.id, school_id: o.school_id, points: d, label: `${t.name.replace('Boy_s Districts ', '')} school ${o.school_id}: official ${o.total_points}, rules ${calc}` })
  }
}

if (emptyRows.length) console.log(`bouts with no winner and no loser (left as is): ${emptyRows.map(m => m.id).join(', ')}`)
console.log(`no-loser forfeits: ${ms.filter(m => !m.loser_entry_id && m.winner_entry_id).length} — real loser ${setLoser.length} (new entries ${newEntries.length}), filler ${[...opp.values()].filter(v => v === 'filler').length}, empty slot ${[...opp.values()].filter(v => v === 'empty').length}`)
for (const s of setLoser) console.log('  loser:', s.label)
console.log(`placement rows to add: ${newPl.length}`, JSON.stringify(newPl.reduce((a: any, p) => (a[p.place] = (a[p.place] ?? 0) + 1, a), {})))
console.log(`deductions: ${deductions.length}, total ${deductions.reduce((a, d) => a + d.points, 0)}`)
for (const d of deductions) console.log('  ', d.label)
console.log(`still off after this fix (not a deduction): ${remaining.length}`)
for (const r of remaining) console.log('   ~', r)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

// ── apply: entries, placements (service role), then the SQL file ──────────────────────────────────────
const backup = { placementsBefore: pl, newEntries, newPl, setLoser, opp: [...opp.entries()], deductions }
fs.writeFileSync(`docs/migrations/backups/20261105_district_forfeits${SFX}_before.json`, JSON.stringify(backup, null, 1))
const created = new Map<string, string>()
for (const e of newEntries) created.set(e.key, chk(await db.from('tournament_entries').insert(e.row).select('id'), 'entry')[0].id)
const resolve = (x: string) => x.startsWith('new:') ? created.get(x.slice(4))! : x
const plRows = newPl.map(p => ({ ...p, entry_id: resolve(p.entry_id) }))
if (plRows.length) chk(await db.from('placements').insert(plRows).select('id'), 'placements')
fs.writeFileSync(`docs/migrations/backups/20261105_district_forfeits${SFX}_inserted.json`, JSON.stringify({ entries: [...created.entries()], placements: plRows.length }, null, 1))
const q = (s: string) => `'${s.replace(/'/g, "''")}'`
fs.writeFileSync(SQL, `-- docs/migrations/20261105_district_forfeits_and_deductions.sql
--
-- Boys ${SEASON - 1}-${String(SEASON).slice(2)} district forfeits and team deductions (scripts/fix_district_forfeits_20261105.mts).
-- The 2026-03-20 load wrote every forfeit's loser as "FORFEIT", so 202 district forfeit bouts had
-- no loser. From TrackWrestling's text: ${setLoser.length} real losers put back (3 got a new bracket entry:
-- service role, ids in backups/20261105_district_forfeits_inserted.json), ${[...opp.values()].filter(v => v === 'filler').length} forfeits over a filler entry,
-- ${[...opp.values()].filter(v => v === 'empty').length} over an empty slot. ${plRows.length} placement rows were added by the service role.
--
-- 1. matches.forfeit_opponent: what a forfeit with no loser was over. 'filler' (an entry such as
--    "Forfeit") counts as a contested match for bye points; 'empty' (no one in the slot) does not.
-- 2. team_point_deductions: team points taken off a school at a tournament (unsportsmanlike, -1
--    each). Official totals include them; the scoring rules subtract them.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS forfeit_opponent text
  CHECK (forfeit_opponent IN ('filler', 'empty'));

${setLoser.map(s => `UPDATE matches SET loser_entry_id = ${q(resolve(s.loser))} WHERE id = ${q(s.id)} AND loser_entry_id IS NULL;  -- ${s.label}`).join('\n')}

UPDATE matches SET forfeit_opponent = 'filler' WHERE loser_entry_id IS NULL AND id IN (
  ${[...opp.entries()].filter(([, v]) => v === 'filler').map(([k]) => q(k)).join(',\n  ')});
UPDATE matches SET forfeit_opponent = 'empty' WHERE loser_entry_id IS NULL AND id IN (
  ${[...opp.entries()].filter(([, v]) => v === 'empty').map(([k]) => q(k)).join(',\n  ')});

CREATE TABLE IF NOT EXISTS team_point_deductions (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id integer NOT NULL REFERENCES tournaments(id),
  school_id     integer NOT NULL REFERENCES schools(id),
  points        numeric NOT NULL CHECK (points < 0),
  source        text    NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, school_id)
);
ALTER TABLE team_point_deductions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON team_point_deductions TO service_role;

INSERT INTO team_point_deductions (tournament_id, school_id, points, source) VALUES
${deductions.map(d => `  (${d.tournament_id}, ${d.school_id}, ${d.points}, 'official minus scoring rules, 2026-11-05')`).join(',\n')}
ON CONFLICT (tournament_id, school_id) DO NOTHING;

COMMIT;

-- Verify: expect ${setLoser.length} losers back, the forfeit marks, ${deductions.length} deductions
SELECT count(*) FILTER (WHERE forfeit_opponent = 'filler') AS filler, count(*) FILTER (WHERE forfeit_opponent = 'empty') AS empty,
       count(*) FILTER (WHERE loser_entry_id IS NULL AND forfeit_opponent IS NULL) AS unmarked_no_loser
FROM matches WHERE tournament_id IN (${tids.join(',')});
SELECT count(*) AS deductions, sum(points) AS total FROM team_point_deductions;

-- ROLLBACK: DROP TABLE team_point_deductions; ALTER TABLE matches DROP COLUMN forfeit_opponent;
-- UPDATE matches SET loser_entry_id = NULL WHERE id IN (the ${setLoser.length} ids above); then delete the
-- service-role rows by the ids in the backup files.
`)
console.log(`APPLIED: ${created.size} entries, ${plRows.length} placements. Run ${SQL} in the SQL editor.`)
