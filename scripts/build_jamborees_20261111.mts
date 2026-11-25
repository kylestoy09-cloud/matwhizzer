// Builds docs/migrations/20261111_jamborees.sql (Kyle 2026-11-11: "strong designations on tournament and
// jamboree", a Jamborees tab beside Tournaments, no year or number in event names).
//   - jamborees / jamborees_girls: one row per jamboree; dual_meets(_girls).jamboree_id links its pairings
//   - girls 2025-26: every "Other" event where 3+ schools wrestled and a school met 2+ of them, from the
//     importer report (docs/reviews/girls_other_events_report_20261111.json, written by
//     scripts/load_girls_jamboree_gaps_20261111.mts). Two-school events stay plain pairings.
//   - Del Val Kickoff, Hillsborough Holiday Brawl and Jack Welch leave the tournament list (same ids);
//     Central Regional Tournament (1/25) is removed: it didn't happen (Kyle)
//   - tournament_registry: jamboree rows point at the jamboree (jamboree_id), names follow the renames
//   - 2025-26 tournament renames, both sides
//   npx tsx --tsconfig tsconfig.json scripts/build_jamborees_20261111.mts
import fs from 'fs'
import { randomUUID } from 'crypto'

const report = JSON.parse(fs.readFileSync('docs/reviews/girls_other_events_report_20261111.json', 'utf8'))
const SEASON = '2025-26'

// source event name → jamboree name (no year, number, "Girls"; a tri/quad is named for the school that met every other)
const NAMES: Record<string, string> = {
  'Del Val Kickoff': 'Del Val Kickoff',
  'Opening Jamboree': 'Opening Jamboree',
  'Montville Jam': 'Montville Jam',
  'JFK, EHS, & CP Tri': 'Cliffside Park Tri',
  'Freehold Boro Girls Jamboree': 'Freehold Boro Jamboree',
  'Hillsborough Holiday Brawl': 'Hillsborough Holiday Brawl',
  'Garnet Girl’s Jamboree': 'Garnet Jamboree',
  'Duals For Danny': 'Duals for Danny',
  'Metuchen/ South Hunterdon/ New Providence': 'Metuchen Tri',
  'Quad - Deptford, Clayton, Palmyra, Sterling': 'Deptford / Clayton / Palmyra / Sterling Quad',
  'Matches @ Scotch Plains-Fanwood': 'Scotch Plains-Fanwood Tri',
  'Tri vs Princeton, Moorestown': 'Hightstown Tri',
  'Keansburg/Manville/Montgomery @ Verona': 'Verona Quad',
  'Pt. Beach Round Robin': 'Point Pleasant Beach Round Robin',
  'Par Hills Mini Jam': 'Parsippany Hills Mini Jam',
  'Par Hills Mini Jam II': 'Parsippany Hills Mini Jam',
  'Par Hills Mini Jam IV': 'Parsippany Hills Mini Jam',
  'PHHS Mini Jam V': 'Parsippany Hills Mini Jam',
  'Cherry Hill East': 'Cherry Hill East Tri',
  'Pompton,Tenafly,Lakeland - Jamboree': 'Lakeland Tri',
  'DOVER JAMBOREE': 'Dover Jamboree',
  'John P. Stevens Multidual Event': 'John P. Stevens Multi-Dual',
  'Jack Welch': 'Jack Welch',
  'lATA GIRLS DUAL': 'Immaculata Tri',
  'Passaic County Girls Jamboree': 'Passaic County Jamboree',
  '3rd Annual Bound Brook Lady Crusaders Wrestling Jamboree': 'Bound Brook Lady Crusaders Jamboree',
  '2026 Middlesex Girls Jamboree': 'Middlesex Jamboree',
  'LB Quad Matches': 'Long Branch Quad',
  'Delran Quad': 'Delran Quad',
  'BR/H. Central/Steinert/MHS Quad': 'Bridgewater-Raritan Quad',
  'Howell Girls Jamboree': 'Howell Jamboree',
  'Garfield Girl`s Jamboree': 'Garfield Jamboree',
  'Overbrook Girls Jamboree': 'Overbrook Jamboree',
  'Cherokee/Seneca Match Up': 'Seneca Tri',
  'LV/Montville/MtOlive Jamboree': 'Lenape Valley / Montville / Mount Olive Jamboree',
  'Feb Jamboree': 'February Jamboree',
  'New Prov/Montgomery/Glen Rock/Westfield Jamboree': 'New Providence / Montgomery / Glen Rock / Westfield Jamboree',
  'Nutley Jamboree': 'Nutley Jamboree',
  'PH Quad': 'Pascack Hills Quad',
  'pemberton/Riverside/HamiltonWest/BurlingtonCity': 'Pemberton / Riverside / Hamilton West / Burlington City Quad',
  'Belvidere, Rutherford, Union, @Bloomfield Jamboree': 'Bloomfield Jamboree',
  'Lakewood Jamboree': 'Lakewood Jamboree',
}
// jamborees that were tournament records: keep the id
const FROM_TOURNAMENT: Record<string, string> = {
  'Del Val Kickoff': '5bb2d261-6d45-4816-88cd-f0fe93002ad1',
  'Hillsborough Holiday Brawl': '1006f7a1-421c-4586-ba10-221ff81a118c',
  'Jack Welch': '4702ff38-d824-4588-b4b9-ff97688d0598',
}
const JACK_WELCH_END = '2026-01-17'
// registry rows for jamborees (Pt. Beach's was linked to the EB Lady Bear tournament by mistake)
const REGISTRY: Record<string, string> = {
  'Del Val Kickoff': 'c58cc783-2965-44a8-b157-399ec0919cb7',
  'Hillsborough Holiday Brawl': 'e035ffdd-974d-49ed-a292-b87b4e880975',
  'Jack Welch': '02800166-1eda-4fb4-bb03-c71248ad3d37',
  'Pt. Beach Round Robin': 'ef4e0f02-8ad5-40b2-8b93-3b0b7a68f1a1',
}
const CENTRAL_REGIONAL = '9638def8-f4d7-447d-b028-0468b687ca18'

// 2025-26 tournament renames: [table, id, from, to]
const RENAMES: [string, string, string][] = [
  ['in_season_tournaments', 'Wendy Pandy-Leh Wrestling Invitational', 'Wendy Pandy-Leh Invitational'],
  ['in_season_tournaments', 'Ronald Bond Wrestling Tournament', 'Ronald Bond Tournament'],
  ['in_season_tournaments', 'Ron Mazzola Memorial Wrestling Tournament', 'Ron Mazzola Memorial Tournament'],
  ['in_season_tournaments', '12th Annual Laker Holiday Tournament', 'Laker Holiday Tournament'],
  ['in_season_tournaments', 'Mustang Invitational Tournament', 'Mustang Invitational'],
  ['in_season_tournaments', 'Gator Beast Wrestling Tournament', 'Gator Beast Tournament'],
  ['in_season_tournaments', 'Palmyra Panther High School Wrestling Tournament', 'Palmyra Panther Tournament'],
  ['in_season_tournaments', '40th Marinelli - EHT Varsity Tournament', 'Marinelli EHT Tournament'],
  ['in_season_tournaments', 'Bethlehem Holiday Wrestling Classic', 'Bethlehem Holiday Classic'],
  ['in_season_tournaments', 'Overbrook Holiday Wrestling Tournament', 'Overbrook Holiday Tournament'],
  ['in_season_tournaments', '67th Annual John Goles Tournament', 'John Goles Tournament'],
  ['in_season_tournaments', '2026 Pioneer Classic', 'Pioneer Classic'],
  ['in_season_tournaments', '2026 East Coast Catholic Classic', 'East Coast Catholic Classic'],
  ['in_season_tournaments', 'Hunterdon/Warren/Sussex', 'Hunterdon/Warren/Sussex Tournament'],
  ['in_season_tournaments', '2026 BCCA George Jockish Wrestling Tornament', 'BCCA George Jockish Tournament'],
  ['in_season_tournaments', '2nd Annual Schulman Scuffle Tournament', 'Schulman Scuffle Tournament'],
  ['in_season_tournaments', '2026 Morris County Tournament', 'Morris County Tournament'],
  ['in_season_tournaments', 'Greater Middlesex Conference Tournament- 01/23', 'Greater Middlesex Conference Tournament'],
  ['in_season_tournaments', 'NJSIAA Shore Conference Individual Championship', 'Shore Conference Tournament'],
  ['in_season_tournaments', 'CVC Wrestling Tournament', 'CVC Tournament'],
  ['in_season_tournaments', 'Escape Gloucester County Cell Block 6', 'Escape Gloucester County Cell Block'],
  ['in_season_tournaments_girls', 'Garfield Girls Holiday Tournament', 'Garfield Holiday Tournament'],
  ['in_season_tournaments_girls', 'NH Lady Lions Classic Tournament', 'NH Lady Lions Classic'],
  ['in_season_tournaments_girls', 'Escape the Rock Girls at North Penn HS', 'Escape the Rock'],
  ['in_season_tournaments_girls', '4th Annual Girls Beast of the East', 'Beast of the East'],
  ['in_season_tournaments_girls', '2025 Ron Mazzola Memorial Girls Wrestling Tournament', 'Ron Mazzola Memorial Tournament'],
  ['in_season_tournaments_girls', '2025 Howdy Duncan Ladies Classic', 'Howdy Duncan Ladies Classic'],
  ['in_season_tournaments_girls', 'Bloomfield Holiday Girls Tournament', 'Bloomfield Holiday Tournament'],
  ['in_season_tournaments_girls', 'Ralph Wetzel Girls Classic', 'Ralph Wetzel Classic'],
  ['in_season_tournaments_girls', 'Sam Cali Invitational Girls Wrestling Tournament', 'Sam Cali Invitational'],
  ['in_season_tournaments_girls', 'Overbrook Girls Winter Open 2025', 'Overbrook Winter Open'],
  ['in_season_tournaments_girls', '2025 EB Lady Bear Invitational', 'East Brunswick Lady Bear Invitational'],
  ['in_season_tournaments_girls', '2025 Lady Cutter Classic', 'Lady Cutter Classic'],
  ['in_season_tournaments_girls', 'H/W/S Girls Wrestling 2026', 'Hunterdon/Warren/Sussex Tournament'],
  ['in_season_tournaments_girls', '2026 SJWHOF Girls Varsity', 'SJWHOF Tournament'],
  ['in_season_tournaments_girls', '2026 Lady Patriots Tournament', 'Lady Patriots Tournament'],
  ['in_season_tournaments_girls', '2026 Greater Middlesex Conference Girls', 'Greater Middlesex Conference Tournament'],
  ['in_season_tournaments_girls', 'Cherokee Girls Tournament', 'Cherokee Tournament'],
  ['in_season_tournaments_girls', 'Girls Shore Conference', 'Shore Conference Tournament'],
  ['in_season_tournaments_girls', 'Essex County Tournament 2026 Girls', 'Essex County Tournament'],
  ['in_season_tournaments_girls', '2026 Union County Girls Tournament', 'Union County Tournament'],
  ['in_season_tournaments_girls', 'CVC Girls Championships', 'CVC Tournament'],
  ['in_season_tournaments_girls', 'Girls Creek Classic', 'Creek Classic'],
  ['in_season_tournaments_girls', 'Cape Atlantic League Girls Tournament', 'Cape Atlantic League Tournament'],
  ['in_season_tournaments_girls', "2026 NJAC Girls' Wrestling Championships", 'NJAC Tournament'],
  ['in_season_tournaments_girls', '2026 Colonial Con. Girls Tournament', 'Colonial Conference Tournament'],
  ['in_season_tournaments_girls', 'Girls Skyland Conference Wrestling Tournament', 'Skyland Conference Tournament'],
  ['in_season_tournaments_girls', '2nd Annual Lady Kards Invitational', 'Lady Kards Invitational'],
  ['in_season_tournaments_girls', '2026 Queen of the Mat Wrestling Classic', 'Queen of the Mat Classic'],
]

const q = (s: string | null) => s == null ? 'NULL' : `'${s.replace(/'/g, "''")}'`
type Jam = { id: string; source: string; name: string; date: string; end: string | null; meets: string[]; teams: Set<number>; bouts: number }
const jams: Jam[] = []
const claimed = new Map<string, string>()
for (const e of report.events) {
  const opp = new Map<number, Set<number>>(); const meets = new Set<string>(); let bouts = 0
  for (const p of e.pairings) {
    if (p.status !== 'exists') continue
    const a = p.team1.id, b = p.team2.id
    if (!opp.has(a)) opp.set(a, new Set()); if (!opp.has(b)) opp.set(b, new Set())
    opp.get(a)!.add(b); opp.get(b)!.add(a); meets.add(p.existing.id); bouts += p.bouts.length
  }
  const isJam = opp.size >= 3 && Math.max(...[...opp.values()].map(s => s.size)) >= 2
  if (!isJam) continue
  const name = NAMES[e.name]
  if (!name) throw new Error(`no name for jamboree "${e.name}"`)
  // the same event listed twice in the source (Par Hills Mini Jam II) is one jamboree
  const same = jams.find(j => j.source === e.name && j.date === e.date)
  const jam: Jam = same ?? { id: FROM_TOURNAMENT[e.name] ?? randomUUID(), source: e.name, name, date: e.date, end: e.name === 'Jack Welch' ? JACK_WELCH_END : null, meets: [], teams: new Set(), bouts: 0 }
  for (const m of meets) {
    const prev = claimed.get(m)
    if (prev && prev !== jam.id) throw new Error(`meet ${m} in two jamborees`)
    if (!prev) { claimed.set(m, jam.id); jam.meets.push(m) }
  }
  for (const t of opp.keys()) jam.teams.add(t)
  jam.bouts += bouts
  if (!same) jams.push(jam)
}
for (const n of Object.keys(NAMES)) if (!jams.some(j => j.source === n)) throw new Error(`named event "${n}" not found as a jamboree`)

const sql: string[] = []
sql.push(`-- docs/migrations/20261111_jamborees.sql
--
-- Tournaments and jamborees as separate things (Kyle 2026-11-11: a Jamborees tab beside Tournaments on the
-- Tournaments page, same month layout; a jamboree's best team by standard dual scoring).
--   1. jamborees / jamborees_girls (one per program, like dual_meets / dual_meets_girls), and
--      dual_meets(_girls).jamboree_id: a jamboree's pairings. tournament_registry.jamboree_id for the master list.
--   2. Girls 2025-26: ${jams.length} jamborees (every "Other" event where 3+ schools wrestled and a school met 2+ of
--      them; two-school events stay plain pairings), linking ${claimed.size} pairings. Del Val Kickoff, Hillsborough
--      Holiday Brawl and Jack Welch move here from the tournament list, keeping their ids.
--   3. Central Regional Tournament (girls, 1/25/2026) removed: it didn't happen (Kyle). No bouts, placements,
--      standings or registry row.
--   4. 2025-26 tournament names: no year, edition number, "Girls" or "Wrestling" (Kyle: the names repeat yearly).
-- Generated by scripts/build_jamborees_20261111.mts. Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS jamborees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season          text NOT NULL,
  name            text NOT NULL,
  start_date      date NOT NULL,
  end_date        date,
  host_school_id  integer REFERENCES schools(id),
  source_name     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS jamborees_girls (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season          text NOT NULL,
  name            text NOT NULL,
  start_date      date NOT NULL,
  end_date        date,
  host_school_id  integer REFERENCES schools(id),
  source_name     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jamborees_season_idx ON jamborees (season, start_date);
CREATE INDEX IF NOT EXISTS jamborees_girls_season_idx ON jamborees_girls (season, start_date);
ALTER TABLE jamborees ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamborees_girls ENABLE ROW LEVEL SECURITY;
GRANT ALL ON jamborees, jamborees_girls TO service_role;
GRANT SELECT ON jamborees, jamborees_girls TO anon, authenticated;
DROP POLICY IF EXISTS jamborees_read ON jamborees;
DROP POLICY IF EXISTS jamborees_girls_read ON jamborees_girls;
CREATE POLICY jamborees_read       ON jamborees       FOR SELECT USING (true);
CREATE POLICY jamborees_girls_read ON jamborees_girls FOR SELECT USING (true);

ALTER TABLE dual_meets       ADD COLUMN IF NOT EXISTS jamboree_id uuid REFERENCES jamborees(id) ON DELETE SET NULL;
ALTER TABLE dual_meets_girls ADD COLUMN IF NOT EXISTS jamboree_id uuid REFERENCES jamborees_girls(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS dual_meets_jamboree_idx ON dual_meets (jamboree_id) WHERE jamboree_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS dual_meets_girls_jamboree_idx ON dual_meets_girls (jamboree_id) WHERE jamboree_id IS NOT NULL;
ALTER TABLE tournament_registry ADD COLUMN IF NOT EXISTS jamboree_id uuid;   -- jamborees or jamborees_girls, by gender
`)

sql.push(`-- 2. Girls jamborees`)
sql.push(`INSERT INTO jamborees_girls (id, season, name, start_date, end_date, source_name) VALUES`)
sql.push(jams.map(j => `  (${q(j.id)}, '${SEASON}', ${q(j.name)}, '${j.date}', ${q(j.end)}, ${q(j.source)})`).join(',\n') + ';')
for (const j of jams) {
  sql.push(`UPDATE dual_meets_girls SET jamboree_id = ${q(j.id)} WHERE id IN (${j.meets.map(q).join(',')});   -- ${j.name}, ${j.date}: ${j.meets.length} pairings`)
}
sql.push(`
-- the three that were tournament records: registry rows follow, then the tournament rows go
UPDATE tournament_registry SET event_type = 'jamboree', in_season_tournament_id = NULL, jamboree_id = v.jid::uuid, name = v.name, imported = true
FROM (VALUES ${Object.entries(REGISTRY).map(([src, rid]) => { const j = jams.find(x => x.source === src)!; return `(${q(rid)}, ${q(j.id)}, ${q(j.name)})` }).join(', ')}) AS v(rid, jid, name)
WHERE tournament_registry.id = v.rid::uuid;
INSERT INTO tournament_registry (season, name, date_start, date_end, state, event_type, gender, imported, jamboree_id)
SELECT j.season, j.name, j.start_date, j.end_date, 'NJ', 'jamboree', 'F', true, j.id
FROM jamborees_girls j WHERE NOT EXISTS (SELECT 1 FROM tournament_registry r WHERE r.jamboree_id = j.id);

DO $$
DECLARE n int;
BEGIN
  SELECT (SELECT count(*) FROM tournament_bouts_girls WHERE in_season_tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
       + (SELECT count(*) FROM tournament_placements WHERE in_season_tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
       + (SELECT count(*) FROM in_season_tournament_team_scores WHERE tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
       + (SELECT count(*) FROM tournament_registry WHERE in_season_tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
       + (SELECT count(*) FROM in_season_tournament_participants_girls WHERE in_season_tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
       + (SELECT count(*) FROM in_season_tournament_seeds_girls WHERE in_season_tournament_id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')}))
    INTO n;
  IF n > 0 THEN RAISE EXCEPTION 'tournament rows to remove still have % bouts/placements/standings/registry links/participants/seeds', n; END IF;
END $$;
-- 3. Del Val Kickoff, Hillsborough Holiday Brawl, Jack Welch Girls (now jamborees) and Central Regional Tournament
DELETE FROM in_season_tournaments_girls WHERE id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')});
`)
sql.push(`-- 4. Tournament names (2025-26). The registry rows linked to them follow.`)
for (const [t, from, to] of RENAMES) sql.push(`UPDATE ${t} SET name = ${q(to)} WHERE season = '${SEASON}' AND name = ${q(from)};`)
for (const t of ['in_season_tournaments', 'in_season_tournaments_girls']) {
  const to = RENAMES.filter(r => r[0] === t).map(r => q(r[2])).join(',')
  sql.push(`UPDATE tournament_registry r SET name = t.name FROM ${t} t WHERE r.in_season_tournament_id = t.id AND t.season = '${SEASON}' AND t.name IN (${to}) AND r.name <> t.name;`)
}
sql.push(`
COMMIT;

-- Verify: ${jams.length} girls jamborees, ${claimed.size} linked pairings, 0 jamboree pairings left out of a jamboree that should be in one,
-- 3 + 1 tournament rows gone, ${RENAMES.length} names changed
SELECT (SELECT count(*) FROM jamborees_girls) AS girls_jamborees,
       (SELECT count(*) FROM dual_meets_girls WHERE jamboree_id IS NOT NULL) AS linked_pairings,
       (SELECT count(*) FROM in_season_tournaments_girls WHERE id IN (${[...Object.values(FROM_TOURNAMENT), CENTRAL_REGIONAL].map(q).join(',')})) AS removed_left,
       (SELECT count(*) FROM tournament_registry WHERE event_type = 'jamboree' AND gender = 'F') AS registry_jamborees,
       (SELECT count(*) FROM in_season_tournaments WHERE season = '${SEASON}' AND name IN (${RENAMES.filter(r => r[0] === 'in_season_tournaments').map(r => q(r[2])).join(',')})) AS boys_renamed,
       (SELECT count(*) FROM in_season_tournaments_girls WHERE season = '${SEASON}' AND name IN (${RENAMES.filter(r => r[0] !== 'in_season_tournaments').map(r => q(r[2])).join(',')})) AS girls_renamed;
-- expect: ${jams.length}, ${claimed.size}, 0, ${jams.length}, ${RENAMES.filter(r => r[0] === 'in_season_tournaments').length}, ${new Set(RENAMES.filter(r => r[0] !== 'in_season_tournaments').map(r => r[2])).size} (distinct names)

-- ROLLBACK (names): the RENAMES list in scripts/build_jamborees_20261111.mts. Tables: DROP TABLE jamborees, jamborees_girls CASCADE.
`)
fs.writeFileSync('docs/migrations/20261111_jamborees.sql', sql.join('\n'))
const csv = ['date,jamboree,source_name,teams,pairings,bouts', ...jams.map(j => [j.date, j.name, j.source, j.teams.size, j.meets.length, j.bouts].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))]
fs.writeFileSync('docs/reviews/girls_jamborees_2025_26.csv', csv.join('\n') + '\n')
console.log('jamborees', jams.length, 'pairings', claimed.size)
