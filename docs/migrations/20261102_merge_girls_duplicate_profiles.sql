-- Merge three duplicate girls profiles (2026-11-02, approved by Kyle)
--
-- Each pair is one girl (same school, same weight, 2024-26). Found when the truncated names were
-- completed (20261102 truncated-names fix):
--   Yuridia Figueroa → Yuridia Figueroa Bravo (Lakewood 107)
--   Madison Garcia → Madison Garcia-Xoloc (Rahway 132)
--   Ellis Beaumont-Torres 7d09c170 → 8b0b4c4e (Rahway 126)
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
  -- Yuridia Figueroa → Yuridia Figueroa Bravo (Lakewood 107)
  PERFORM pg_temp.merge_girl('0b2ebfc9-5156-4002-9e1c-db130d468998', '15a94ac5-8d58-4157-8f6c-6300de60e74d');
  -- Madison Garcia → Madison Garcia-Xoloc (Rahway 132)
  PERFORM pg_temp.merge_girl('f5a8199c-684b-4ce2-9df9-3584d2ce61e9', '22b60ad6-6207-49d5-9a65-d940c94228af');
  -- Ellis Beaumont-Torres 7d09c170 → 8b0b4c4e (Rahway 126)
  PERFORM pg_temp.merge_girl('7d09c170-b757-4f76-afc9-29ddcb3f9b52', '8b0b4c4e-5f92-4bab-9ae5-a231735bf804');
END $$;

-- ── Girls region placements to 6th (same run) ─────────────────────────────────────────────
-- Girls regions place six (5th place bouts in all four regions); girls_region_placements read
-- only the final and the 3rd place bout. ROLLBACK: the version in 20261102_site_school_ids.sql.
CREATE OR REPLACE FUNCTION public.girls_region_placements(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE m.round::text WHEN 'F' THEN 1 WHEN '3rd_Place' THEN 3 ELSE 5 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship')
        OR (m.round::text IN ('3rd_Place', '5th_Place') AND m.bracket_side = 'consolation'))
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')),
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    te.school_id
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2
$function$;
