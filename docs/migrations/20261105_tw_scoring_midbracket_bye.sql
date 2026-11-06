-- docs/migrations/20261105_tw_scoring_midbracket_bye.sql
--
-- Boys team scoring (20261105_tw_scoring_rules.sql), one addition: a bye in the middle of the
-- bracket (a championship round skipped after his first bout) earns 2 per round skipped, credited
-- if he wins the bout after it, the same as a bye before his first bout.
-- Evidence: across both seasons' district brackets only two wrestlers have such a bye, Massimo
-- Gonzalez and Owen Garriques (Phillipsburg, District 1 2024-25: Champ. Round 1 forfeit over an
-- empty slot, quarterfinal bye, then won the semifinal). Phillipsburg was 4 under the official
-- 258; with this it is exact. No 2025-26 total changes.
-- Run in the Supabase SQL editor.

BEGIN;

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

  -- a bye between two of his championship bouts (a round skipped after his first bout): 2 per
  -- round skipped, credited if he wins the bout after it
  SELECT v_total + COALESCE(SUM(2 * (g.pos - g.prev_pos - 1)) FILTER (WHERE g.won AND g.pos - g.prev_pos > 1), 0) INTO v_total
  FROM (
    SELECT array_position(v_ord, m.round::text) AS pos,
           lag(array_position(v_ord, m.round::text)) OVER (ORDER BY array_position(v_ord, m.round::text)) AS prev_pos,
           m.winner_entry_id = p_entry_id AND m.forfeit_opponent IS DISTINCT FROM 'empty' AS won
    FROM matches m
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.bracket_side = 'championship'
      AND m.round::text = ANY (v_ord)
      AND (m.winner_entry_id = p_entry_id OR m.loser_entry_id = p_entry_id)
  ) g
  WHERE g.prev_pos IS NOT NULL;

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

GRANT EXECUTE ON FUNCTION public.tw_boys_entry_points(uuid) TO anon, authenticated, service_role;

COMMIT;

-- Verify: Phillipsburg (school 7) at District 1 2024-25 (tournament 93) should be 258
SELECT points FROM tw_boys_school_points(93) WHERE school_id = 7;

-- ROLLBACK: re-run the tw_boys_entry_points definition from 20261105_tw_scoring_rules.sql
