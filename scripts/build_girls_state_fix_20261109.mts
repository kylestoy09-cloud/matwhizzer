// Girls 2025-26 State (tournament 185): 24 consolation semifinals stored twice, and the 107 7th place bout
// missing (2026-11-09). Found by scripts/compare_girls_bracket_counts.mts: the export has 24 cons. semis
// (stored 48, each pair twice with the same result) and 12 7th place bouts (stored 11; 107 missing).
// The 107 bout (export: "Olivia Mitchell (East Brunswick) won by tech fall over Kayla Coletta (Mary Help of
// Christians Academy) (TF-1.5 2:10 (18-3))") is the one the 2026-10-26 Coletta restore missed; her 8th and
// Mitchell's 7th placement rows are stored.
// Writes the backup of the 24 copies to delete and the migration. Read-only otherwise.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_state_fix_20261109.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 185
const t = (await db.from('tournaments').select('name, season_id, gender').eq('id', T).single()).data!
if (t.season_id !== 2026 || t.gender !== 'F') throw new Error(`tournament ${T} is not the 2025-26 girls state`)
const { data: c4 } = await db.from('matches').select('*').eq('tournament_id', T).eq('round', 'C4')
const groups = new Map<string, any[]>()
for (const m of c4 ?? []) { const k = [m.weight_class_id, m.winner_entry_id, m.loser_entry_id, m.win_type, m.winner_score, m.loser_score, m.fall_time_seconds].join('|'); groups.set(k, [...(groups.get(k) ?? []), m]) }
const dups = [...groups.values()].filter(g => g.length === 2)
const odd = [...groups.values()].filter(g => g.length > 2)
if (odd.length || dups.length !== 24 || (c4 ?? []).length !== 48) throw new Error(`expected 48 C4 rows in 24 identical pairs; got ${(c4 ?? []).length} rows, ${dups.length} pairs, ${odd.length} larger groups`)
// keep the copy with the smaller id, delete the other (the two are identical in every scored field)
const del = dups.map(g => g.sort((a, b) => a.id.localeCompare(b.id))[1])
const BACKUP = 'docs/migrations/backups/20261109_girls_state_duplicate_cons_semis_before.json'
fs.writeFileSync(BACKUP, JSON.stringify({ deleted: del, kept: dups.map(g => g[0]) }, null, 1))
console.log(`backup: ${BACKUP} (${del.length} to delete, ${del.length} kept)`)

const sql = `-- Girls 2025-26 State (tournament ${T}): remove 24 duplicate consolation semifinals; add the 107 7th place bout (2026-11-09)
--
-- 1. The 24 cons. semifinals (round C4) are each stored twice, identical (same wrestlers, result, score, time):
--    48 rows where the TrackWrestling export has 24. Each wrestler's record counts the bout twice. Deletes one
--    copy of each (the larger id); the other stays. Delete approval: pending (Kyle). Backup of every deleted
--    row and its kept twin: ${BACKUP}. Nothing references a match row by id.
-- 2. The 107 7th place bout: Olivia Mitchell (East Brunswick) won by tech fall over Kayla Coletta (Mary Help of
--    Christians Academy), TF-1.5 2:10 (18-3), from the export. The 2026-10-26 Coletta restore
--    (20261026_restore_mary_help_kayla_coletta.sql) missed it; their 7th and 8th placement rows are stored.
-- Built by scripts/build_girls_state_fix_20261109.mts.
-- ROLLBACK: re-insert the deleted rows from the backup; DELETE the 7th place bout (round 7th_Place, weight class 68).
-- Run in the Supabase SQL editor.

DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n FROM matches WHERE tournament_id = ${T} AND round = 'C4';
  IF n <> 48 THEN RAISE EXCEPTION 'expected 48 cons. semifinals before, found %', n; END IF;

  DELETE FROM matches WHERE tournament_id = ${T} AND round = 'C4' AND id IN (
${del.map(m => `    '${m.id}'`).join(',\n')}
  );
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 24 THEN RAISE EXCEPTION 'expected to delete 24 duplicates, deleted %', n; END IF;

  IF EXISTS (SELECT 1 FROM matches WHERE tournament_id = ${T} AND round = '7th_Place' AND weight_class_id = 68) THEN
    RAISE EXCEPTION '107 already has a 7th place bout';
  END IF;
  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES (${T}, 68, 'consolation', '7th_Place', '0d569475-1b84-445f-90ec-5f4e06f4633d', 'd4470f4a-0eab-4c3f-aa4c-4aac80bab9c5', 'TF-1.5', 18, 3, 130, true);
END $$;

-- Verify: 24 cons. semifinals, 12 7th place bouts
SELECT round, count(*) FROM matches WHERE tournament_id = ${T} AND round IN ('C4', '7th_Place') GROUP BY round ORDER BY round;
`
fs.writeFileSync('docs/migrations/20261109_girls_state_dup_cons_semis_and_7th.sql', sql)
console.log('wrote docs/migrations/20261109_girls_state_dup_cons_semis_and_7th.sql')
const wcs = new Map((await db.from('weight_classes').select('id, weight').eq('gender', 'F')).data!.map(x => [x.id, x.weight]))
const by = new Map<number, number>(); for (const m of del) by.set(wcs.get(m.weight_class_id)!, (by.get(wcs.get(m.weight_class_id)!) ?? 0) + 1)
console.log('duplicates by weight:', JSON.stringify(Object.fromEntries([...by].sort((a, b) => a[0] - b[0]))))
