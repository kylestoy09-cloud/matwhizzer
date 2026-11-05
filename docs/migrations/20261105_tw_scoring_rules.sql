-- docs/migrations/20261105_tw_scoring_rules.sql
--
-- Boys postseason team scoring = TrackWrestling's rules, proven 2026-11-05
-- (docs/reviews/trackwrestling_team_scoring.md): per wrestler against TrackWrestling's own points
-- (2,135 / 2,135, Districts 1-18 2025-26); per school against the official totals (state and
-- regions exact; districts exact apart from deductions, TrackWrestling's 5 TF-1 errors, Montville).
--
-- A wrestler's points:
--   advancement  2 per championship win, 1 per consolation win, none for a placement match
--                (1st, 3rd, 5th, 7th)
--   byes         2 per championship round skipped, only if he wins his next contested match
--                (a forfeit over an empty slot, matches.forfeit_opponent = 'empty', is not one)
--   bonus        fall / forfeit / injury default / DQ 2 (a win with no opponent is a forfeit win),
--                tech fall 1.5 (every TF-*), major 1, decision / sudden victory / tiebreaker 0
--   placement    districts 14/10/7/4; regions 16/12/9/7/5/3; state 16/12/9/7/5/3/2/1
-- A school's points: the sum, plus team_point_deductions (negative).
--
-- 1. tw_wrestler_points(entry, tournament, level), used by district_team_pts,
--    region_postseason_pts, district_team_score and others, keeps its inputs. For a boys tournament
--    it now returns these rules; for girls it runs the previous code, kept as
--    tw_wrestler_points_legacy (girls scoring is unverified and unchanged).
-- 2. tw_boys_entry_points(entry): the rules for one boys entry.
-- 3. tw_boys_school_points(tournament): each school's total, deductions included.
-- 4. lb_p_wrestler_points (state section, leaderboards): rebuilt on tw_boys_entry_points, same
--    columns, order and limit.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

ALTER FUNCTION public.tw_wrestler_points(uuid, integer, text) RENAME TO tw_wrestler_points_legacy;

CREATE OR REPLACE FUNCTION public.tw_boys_entry_points(p_entry_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid   integer;
  v_type  text;
  v_ord   text[];
  v_total numeric := 0;
  v_first integer;
  v_next  uuid;
  v_place integer;
BEGIN
  SELECT te.tournament_id, t.tournament_type INTO v_tid, v_type
  FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
  WHERE te.id = p_entry_id AND t.gender = 'M';
  IF v_tid IS NULL THEN RETURN 0; END IF;

  -- championship rounds in bracket order (Champ. Round 1 is stored as R2 at districts/regions)
  v_ord := CASE WHEN v_type = 'boys_state' THEN ARRAY['R1','R2','QF','SF','F'] ELSE ARRAY['R2','QF','SF','F'] END;

  -- wins: advancement + bonus
  SELECT COALESCE(SUM(
      CASE WHEN m.round::text IN ('F','3rd_Place','5th_Place','7th_Place') THEN 0
           WHEN m.bracket_side = 'championship' THEN 2 ELSE 1 END
    + CASE WHEN m.loser_entry_id IS NULL OR m.win_type::text IN ('FALL','FORF','M-FORF','INJ','DQ') THEN 2
           WHEN m.win_type::text LIKE 'TF%' THEN 1.5
           WHEN m.win_type::text = 'MD' THEN 1 ELSE 0 END), 0)
  INTO v_total
  FROM matches m
  WHERE m.tournament_id = v_tid AND m.winner_entry_id = p_entry_id AND m.validated = true;

  -- byes: championship rounds before his first championship bout, credited if he wins his next
  -- contested championship match
  SELECT MIN(array_position(v_ord, m.round::text)) INTO v_first
  FROM matches m
  WHERE m.tournament_id = v_tid AND m.validated = true AND m.bracket_side = 'championship'
    AND m.round::text = ANY (v_ord)
    AND (m.winner_entry_id = p_entry_id OR m.loser_entry_id = p_entry_id);
  IF v_first > 1 THEN
    SELECT m.winner_entry_id INTO v_next
    FROM matches m
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.bracket_side = 'championship'
      AND m.round::text = ANY (v_ord) AND m.forfeit_opponent IS DISTINCT FROM 'empty'
      AND (m.winner_entry_id = p_entry_id OR m.loser_entry_id = p_entry_id)
    ORDER BY array_position(v_ord, m.round::text)
    LIMIT 1;
    IF v_next = p_entry_id THEN v_total := v_total + 2 * (v_first - 1); END IF;
  END IF;

  -- placement: the placements table, else the placement match
  SELECT p.place INTO v_place FROM placements p
  WHERE p.entry_id = p_entry_id AND p.tournament_id = v_tid ORDER BY p.place LIMIT 1;
  IF v_place IS NULL THEN
    SELECT CASE WHEN m.winner_entry_id = p_entry_id THEN x.w ELSE x.l END INTO v_place
    FROM matches m
    JOIN (VALUES ('F', 1, 2), ('3rd_Place', 3, 4), ('5th_Place', 5, 6), ('7th_Place', 7, 8)) AS x(r, w, l) ON x.r = m.round::text
    WHERE m.tournament_id = v_tid AND m.validated = true
      AND (m.winner_entry_id = p_entry_id OR m.loser_entry_id = p_entry_id)
    LIMIT 1;
  END IF;
  IF v_place IS NOT NULL THEN
    v_total := v_total + COALESCE((CASE WHEN v_type = 'districts' THEN ARRAY[14,10,7,4]
                                        ELSE ARRAY[16,12,9,7,5,3,2,1] END)[v_place], 0);
  END IF;

  RETURN v_total;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tw_wrestler_points(p_entry_id uuid, p_tournament_id integer, p_level text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE WHEN (SELECT gender FROM tournaments WHERE id = p_tournament_id) = 'M'
              THEN tw_boys_entry_points(p_entry_id)
              ELSE tw_wrestler_points_legacy(p_entry_id, p_tournament_id, p_level) END
$function$;

CREATE OR REPLACE FUNCTION public.tw_boys_school_points(p_tournament_id integer)
 RETURNS TABLE(school_id integer, points numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT te.school_id,
         SUM(tw_boys_entry_points(te.id))
           + COALESCE((SELECT d.points FROM team_point_deductions d
                       WHERE d.tournament_id = p_tournament_id AND d.school_id = te.school_id), 0)
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id AND t.gender = 'M'
  WHERE te.tournament_id = p_tournament_id AND te.school_id IS NOT NULL
  GROUP BY te.school_id
$function$;

CREATE OR REPLACE FUNCTION public.lb_p_wrestler_points(p_gender gender_type DEFAULT 'M'::gender_type, p_pool text DEFAULT 'district'::text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_points numeric, win_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pool_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
      (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
      (p_pool = 'state'    AND name LIKE 'Boy_s%')
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  per_entry AS (
    SELECT te.wrestler_id, tw_boys_entry_points(te.id) AS pts,
           (SELECT count(*) FROM matches m WHERE m.winner_entry_id = te.id AND m.validated = true)::integer AS wins
    FROM tournament_entries te JOIN pool_tournaments pt ON pt.id = te.tournament_id
  ),
  totals AS (
    SELECT wrestler_id, ROUND(SUM(pts), 1) AS total_points, SUM(wins)::integer AS win_count
    FROM per_entry GROUP BY wrestler_id
    HAVING SUM(wins) >= 1
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    school_display_name(s.id, p_season, p_gender::text) AS school,
    school_display_name(s.id, p_season, p_gender::text) AS school_name,
    s.id           AS school_id,
    tot.total_points, tot.win_count
  FROM totals tot
  JOIN wrestlers wr ON wr.id = tot.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = tot.wrestler_id
  LEFT JOIN schools s        ON s.id = sl.school_id
  ORDER BY tot.total_points DESC LIMIT 25
$function$;

GRANT EXECUTE ON FUNCTION public.tw_boys_entry_points(uuid)              TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tw_wrestler_points(uuid, integer, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tw_boys_school_points(integer)          TO anon, authenticated, service_role;

COMMIT;

-- Verify: Fort Lee at District 8 2025-26 should be 76.5 (official 76.5, no deduction)
SELECT points FROM tw_boys_school_points(147) WHERE school_id = 42;

-- ROLLBACK:
-- BEGIN;
-- DROP FUNCTION public.tw_wrestler_points(uuid, integer, text);
-- ALTER FUNCTION public.tw_wrestler_points_legacy(uuid, integer, text) RENAME TO tw_wrestler_points;
-- DROP FUNCTION public.tw_boys_entry_points(uuid); DROP FUNCTION public.tw_boys_school_points(integer);
-- re-run the lb_p_wrestler_points definition from 20261103_school_names_by_season.sql
-- COMMIT;
