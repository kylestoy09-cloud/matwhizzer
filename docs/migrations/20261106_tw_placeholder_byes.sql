-- docs/migrations/20261106_tw_placeholder_byes.sql
--
-- Boys team scoring (tw_boys_entry_points), one more TrackWrestling rule (Kyle, 2026-11-06: add it).
-- TrackWrestling sometimes lists a quarterfinal bye against a placeholder opponent:
-- "Quarterfinal - Dennis Serra (Lower Cape May Reg) 17-7 received a bye Bye Bye () 0-1 (Bye)".
-- That round earns nothing itself, but counts as a won round when crediting the bye before it. The
-- placeholder bye itself is credited like any bye, if he wins the bout after it.
-- Evidence: all 11 cases in 2024-25 / 2025-26.
--   * Dennis Serra: Champ. Round 1 bye, "Bye Bye" quarterfinal, lost the semifinal. He gets 2 for the
--     first bye, which makes Lower Cape May exactly the official 157 (rules gave 155).
--   * The 9 other "Bye Bye" wrestlers won their semifinal and get both byes either way; their
--     schools already matched.
--   * Aidan Martorano (District 10, plain "received a bye ()" quarterfinal, lost the semifinal) gets
--     nothing, as before.
-- Byes aren't bouts, so these are kept in their own table (tw_placeholder_byes), read only by the
-- scoring rules: they never appear in records, profiles or ratings.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

CREATE TABLE IF NOT EXISTS tw_placeholder_byes (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id integer NOT NULL REFERENCES tournaments(id),
  entry_id      uuid    NOT NULL REFERENCES tournament_entries(id) ON DELETE CASCADE,
  round         text    NOT NULL,
  source        text    NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entry_id, round)
);
ALTER TABLE tw_placeholder_byes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON tw_placeholder_byes TO service_role;
GRANT SELECT ON tw_placeholder_byes TO anon, authenticated;
CREATE POLICY tw_placeholder_byes_read ON tw_placeholder_byes FOR SELECT USING (true);

-- the 10 in TrackWrestling's 2024-25 export (Match Data/2025 District Data.py), all District 29
INSERT INTO tw_placeholder_byes (tournament_id, entry_id, round, source) VALUES
  (121, 'b2e0544a-53db-458d-b6d8-d43942821407', 'QF', 'Quarterfinal - Liam Kisby (Absegami) 30-4 received a bye Bye Bye () 0-1 (Bye)'),
  (121, 'a7e239c0-8e46-4588-88be-8837e71e7cd4', 'QF', 'Quarterfinal - Calvin Parke (Middle Township) 30-4 received a bye Bye Bye () 0-1 (Bye)'),
  (121, '090da698-80f3-4662-a942-dfe1c8ddcc36', 'QF', 'Quarterfinal - Dom Digiacomo (Camden Catholic) 12-1 received a bye Bye Bye () 0-1 (Bye)'),
  (121, '5beb9d1c-1339-4b80-b0ae-fc5b3a8ebbc7', 'QF', 'Quarterfinal - Jayson Garcia (Egg Harbor) 20-9 received a bye Bye BYe () 0-1 (Bye)'),
  (121, '571cc50e-5ad3-4461-a781-b272ebdce901', 'QF', 'Quarterfinal - Chase Martino (Camden Catholic) 20-10 received a bye Bye Bye () 0-1 (Bye)'),
  (121, 'b5ccf1eb-115c-4165-89c6-f11b9616094c', 'QF', 'Quarterfinal - Chase Hansen (Lower Cape May Reg) 35-0 received a bye Bye Bye () 0-1 (Bye)'),
  (121, '0e4adfb6-6fa3-4559-945e-d17b059850e5', 'QF', 'Quarterfinal - Jaden Simpson (Camden Catholic) 28-5 received a bye Bye Bye () 0-1 (Bye)'),
  (121, 'e203c533-79e7-42f9-8f6d-06c3f5c2c3b0', 'QF', 'Quarterfinal - Maximus Adelizzi (Middle Township) 30-3 received a bye Bye Bye () 0-1 (Bye)'),
  (121, '5bdee2a7-fac6-40fb-a519-b44523720cb1', 'QF', 'Quarterfinal - Dennis Serra (Lower Cape May Reg) 17-7 received a bye Bye Bye () 0-1 (Bye)'),
  (121, '4d7a80e4-342b-4f77-8060-dad54a18aede', 'QF', 'Quarterfinal - Jacob Chapman (Ocean City) 20-8 received a bye Bye Bye () 0-1 (Bye)')
ON CONFLICT (entry_id, round) DO NOTHING;

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

  -- his championship "events" in bracket order: his bouts, plus any bye TrackWrestling listed against
  -- a placeholder opponent ("received a bye Bye Bye () 0-1", tw_placeholder_byes), which counts as a
  -- won round for crediting the bye before it but earns nothing itself
  -- byes before his first event: 2 per round, credited if he wins his next contested event
  WITH ev AS (
    SELECT array_position(v_ord, m.round::text) AS pos,
           m.winner_entry_id = p_entry_id AS won,
           m.forfeit_opponent IS DISTINCT FROM 'empty' AS contested,
           false AS placeholder
    FROM matches m
    WHERE m.tournament_id = v_tid AND m.validated = true AND m.bracket_side = 'championship'
      AND m.round::text = ANY (v_ord)
      AND (m.winner_entry_id = p_entry_id OR m.loser_entry_id = p_entry_id)
    UNION ALL
    SELECT array_position(v_ord, b.round), true, true, true
    FROM tw_placeholder_byes b WHERE b.entry_id = p_entry_id AND b.round = ANY (v_ord)
  ), ord AS (
    SELECT *, lag(pos) OVER (ORDER BY pos) AS prev_pos, lead(won) OVER (ORDER BY pos) AS next_won FROM ev
  )
  SELECT v_total
    -- before his first event
    + COALESCE((SELECT 2 * (MIN(pos) - 1) FROM ord HAVING MIN(pos) > 1
                AND (SELECT won FROM ord WHERE contested ORDER BY pos LIMIT 1)), 0)
    -- between two events (a round skipped after his first bout), credited if he wins the one after
    + COALESCE((SELECT SUM(2 * (pos - prev_pos - 1)) FROM ord WHERE prev_pos IS NOT NULL AND pos - prev_pos > 1 AND won AND contested), 0)
    -- a placeholder bye itself, credited if he wins the event after it
    + COALESCE((SELECT 2 * count(*) FROM ord WHERE placeholder AND next_won), 0)
  INTO v_total;

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

-- Verify: every District 29 2024-25 school against the official total (Lower Cape May, school 281,
-- should now be 157; the rest unchanged and equal)
SELECT p.school_id, p.total_points AS official, c.points AS rules
FROM precomputed_team_scores p JOIN tw_boys_school_points(121) c ON c.school_id = p.school_id
WHERE p.tournament_id = 121 AND p.total_points <> c.points;   -- expect no rows

-- ROLLBACK: re-run docs/migrations/20261105_tw_scoring_midbracket_bye.sql; DROP TABLE tw_placeholder_byes;
