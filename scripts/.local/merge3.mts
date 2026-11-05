import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pairs: { from: string; into: string; who: string }[] = []
const find = async (f: string, l: string, pre?: string) => { const { data } = await db.from('wrestlers').select('*').eq('first_name', f).eq('last_name', l).eq('gender', 'F'); return pre ? data!.find(w => w.id.startsWith(pre))! : data![0] }
pairs.push({ from: (await find('Yuridia', 'Figueroa')).id, into: (await find('Yuridia', 'Figueroa Bravo')).id, who: 'Yuridia Figueroa → Yuridia Figueroa Bravo (Lakewood 107)' })
pairs.push({ from: (await find('Madison', 'Garcia')).id, into: (await find('Madison', 'Garcia-Xoloc')).id, who: 'Madison Garcia → Madison Garcia-Xoloc (Rahway 132)' })
pairs.push({ from: (await find('Ellis', 'Beaumont-Torres', '7d09c170')).id, into: (await find('Ellis', 'Beaumont-Torres', '8b0b4c4e')).id, who: 'Ellis Beaumont-Torres 7d09c170 → 8b0b4c4e (Rahway 126)' })
const backup: any = { pairs, rows: {} }
const T: [string, string[]][] = [['wrestlers', ['id']], ['tournament_entries', ['wrestler_id']], ['dual_meet_matches_girls', ['wrestler_a_id', 'wrestler_b_id', 'winner_id']], ['tournament_bouts_girls', ['wrestler1_id', 'wrestler2_id']], ['wrestler_name_aliases', ['wrestler_id']], ['wrestler_hammer_scores', ['wrestler_id']], ['wrestler_match_score_log', ['wrestler_id']], ['lb_rs_wrestler', ['wrestler_id']], ['lb_ps_wrestler', ['wrestler_id']]]
for (const p of pairs) for (const [t, cols] of T) for (const c of cols) { const { data } = await db.from(t).select('*').eq(c, p.from); if (data?.length) (backup.rows[t] ??= []).push(...data) }
// alias clash check: same raw_name + school already on the kept profile
for (const p of pairs) { const { data: a } = await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', p.from); const { data: b } = await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', p.into); for (const x of a!) if (b!.some(y => y.raw_name === x.raw_name && y.school_id === x.school_id)) console.log('alias clash', p.who, x) }
fs.writeFileSync('docs/migrations/backups/20261102_girls_duplicate_profiles_before.json', JSON.stringify(backup, null, 1))
console.log(Object.fromEntries(Object.entries(backup.rows).map(([k, v]: any) => [k, v.length])))
const L = pairs.map(p => `-- ${p.who}\n  PERFORM pg_temp.merge_girl('${p.from}', '${p.into}');`).join('\n  ')
const sql = `-- Merge three duplicate girls profiles (2026-11-02, approved by Kyle)
--
-- Each pair is one girl (same school, same weight, 2024-26). Found when the truncated names were
-- completed (20261102 truncated-names fix):
${pairs.map(p => `--   ${p.who}`).join('\n')}
-- Bouts, entries and the name alias move to the kept profile. The duplicate's rating, rating-log
-- and leaderboard rows are derived data, rebuilt by the next girls ratings run and leaderboard
-- refresh. Then the empty profile is deleted. A foreign-key error means something else still
-- points at it: the whole block rolls back.
-- Backup: docs/migrations/backups/20261102_girls_duplicate_profiles_before.json
-- ROLLBACK: re-insert the backed-up wrestlers rows and point the moved rows back (ids in the backup).

CREATE OR REPLACE FUNCTION pg_temp.merge_girl(p_from uuid, p_into uuid) RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM wrestlers WHERE id = p_from AND gender = 'F')
     OR NOT EXISTS (SELECT 1 FROM wrestlers WHERE id = p_into AND gender = 'F') THEN
    RAISE EXCEPTION 'merge %: both profiles must exist and be girls', p_from;
  END IF;
  UPDATE tournament_entries      SET wrestler_id   = p_into WHERE wrestler_id   = p_from;
  UPDATE dual_meet_matches_girls SET wrestler_a_id = p_into WHERE wrestler_a_id = p_from;
  UPDATE dual_meet_matches_girls SET wrestler_b_id = p_into WHERE wrestler_b_id = p_from;
  UPDATE dual_meet_matches_girls SET winner_id     = p_into WHERE winner_id     = p_from;
  UPDATE tournament_bouts_girls  SET wrestler1_id  = p_into WHERE wrestler1_id  = p_from;
  UPDATE tournament_bouts_girls  SET wrestler2_id  = p_into WHERE wrestler2_id  = p_from;
  UPDATE wrestler_name_aliases   SET wrestler_id   = p_into WHERE wrestler_id   = p_from;
  DELETE FROM wrestler_match_score_log WHERE wrestler_id = p_from;
  DELETE FROM wrestler_hammer_scores   WHERE wrestler_id = p_from;
  DELETE FROM lb_rs_wrestler           WHERE wrestler_id = p_from;
  DELETE FROM lb_ps_wrestler           WHERE wrestler_id = p_from;
  DELETE FROM wrestlers WHERE id = p_from;
END $f$;

DO $$
BEGIN
  -- counted, backed up, approved: open the protected-delete guard for this transaction only
  PERFORM set_config('matwhizzer.allow_protected_delete', 'on', true);
  ${L}
END $$;
`
fs.writeFileSync('docs/migrations/20261102_merge_girls_duplicate_profiles.sql', sql)
console.log('written')
