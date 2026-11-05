import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts')
const del: any[] = [], kept: string[] = []
for (const t of ts!) {
  const { data: m } = await db.from('matches').select('*').eq('tournament_id', t.id).order('id')
  const seen = new Map<string, any>()
  for (const x of m!) {
    const k = `${x.weight_class_id}|${x.round}|${x.bracket_side}|${x.winner_entry_id}|${x.loser_entry_id}`
    const first = seen.get(k)
    if (!first) { seen.set(k, x); continue }
    // a true copy: same result too
    if (first.win_type !== x.win_type || first.winner_score !== x.winner_score || first.loser_score !== x.loser_score || first.fall_time_seconds !== x.fall_time_seconds) { console.log('NOT IDENTICAL', t.name, x.round, first.id, x.id); continue }
    del.push({ ...x, tournament_name: t.name }); kept.push(first.id)
  }
}
fs.writeFileSync('docs/migrations/backups/20261102_girls_district_duplicate_bouts_before.json', JSON.stringify(del, null, 1))
const ids = del.map(d => d.id)
const by = del.reduce((a: any, d) => (a[d.tournament_name] = (a[d.tournament_name] ?? 0) + 1, a), {})
const sql = `-- Delete duplicate copies of girls 2025-26 district bouts (2026-11-02, approved by Kyle)
--
-- ${ids.length} bouts were stored twice: ${Object.entries(by).map(([k, v]) => `${k.replace("Girl_s Districts ", '')} ${v}`).join(', ')}. Each deleted row has the same
-- tournament, weight, round, side, winner, loser and result as an earlier row, which stays.
-- They doubled those bouts in win counts, postseason leaderboards and ratings. Nothing references
-- matches by foreign key; the rating log keeps bout ids as text and is rebuilt afterwards.
-- Backup: docs/migrations/backups/20261102_girls_district_duplicate_bouts_before.json
-- ROLLBACK: re-insert the backed-up rows.

DO $$
DECLARE n integer;
BEGIN
  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);  -- counted, backed up, approved
  DELETE FROM matches WHERE id IN (
    ${ids.map(i => `'${i}'`).join(',\n    ')});
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${ids.length} THEN RAISE EXCEPTION 'expected ${ids.length} duplicate bouts deleted, got %', n; END IF;
END $$;
`
fs.writeFileSync('docs/migrations/20261102_girls_district_duplicate_bouts.sql', sql)
console.log(ids.length, 'duplicates', JSON.stringify(by), '| kept originals all distinct:', new Set(kept).size === kept.length || 'some originals have several copies')
