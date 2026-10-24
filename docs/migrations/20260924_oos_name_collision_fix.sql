-- docs/migrations/20260924_oos_name_collision_fix.sql
--
-- Same failure as 20260924_dover_de_oos_mixup_fix.sql, found by scanning every
-- out-of-state tournament for NJ schools that appear only once: an OOS program
-- whose name exactly matches an NJ school was imported as that NJ school
-- (exact matches skipped school review; the RTF importer now makes every school
-- at an Outside event go through review).
--
--   Powerade (PA)                       "Franklin"        -> Franklin (169)        : John Montgomery, Max Firestine, Titus Colangelo
--   Bethlehem Holiday Classic (PA)      "Delaware Valley" -> Delaware Valley (141) : Nick D`Ambola
--   WSAZ Invitational (WV)              "Williamstown"    -> Williamstown (303)    : Cole Smith (Williamstown, WV — per Kyle)
--
-- The first four were created by those imports (one bout each, no duals, no
-- aliases): re-home them to new OOS schools and mark is_oos, like other OOS
-- wrestlers. Cole Smith is different: the WSAZ bout was attached to an existing
-- NJ Cole Smith (2024-25 NJ postseason, grade Sr), so the bout moves to a new
-- OOS wrestler and the NJ record keeps its own history.
--
-- Hammer/match-score-log rows built from these bouts are deleted (the
-- recalculation skips OOS wrestlers; the NJ Cole Smith's only 2025-26 match
-- was the WSAZ bout).

DO $$
DECLARE
  franklin_pa    int;
  del_valley_pa  int;
  williamstown_wv int;
  cole_wv        uuid;
  franklin_ids   uuid[] := ARRAY[
    '98688ed5-fa8f-420c-bc1b-cf11773fe707', -- John Montgomery
    '18c46cd9-b29d-4a7c-ae9b-3bd961b370bf', -- Max Firestine
    '786d8187-6aac-4686-a2a0-e79931805312'  -- Titus Colangelo
  ];
  dambola        uuid := '96e1b7dc-bfe3-4b71-bbc1-fbb1e713852a';
  cole_nj        uuid := 'd9cbf450-d71c-4cb3-a492-bc44264e8540';
  wsaz_bout      uuid := '8b414fa8-b8ec-441d-bffb-4418a692224c';
BEGIN
  INSERT INTO schools (display_name, is_nj, is_combined) VALUES ('Franklin, PA', false, false)        RETURNING id INTO franklin_pa;
  INSERT INTO schools (display_name, is_nj, is_combined) VALUES ('Delaware Valley, PA', false, false) RETURNING id INTO del_valley_pa;
  INSERT INTO schools (display_name, is_nj, is_combined) VALUES ('Williamstown, WV', false, false)    RETURNING id INTO williamstown_wv;

  -- Franklin, PA
  UPDATE wrestlers SET is_oos = true WHERE id = ANY(franklin_ids);
  INSERT INTO wrestler_name_aliases (raw_name, school_id, wrestler_id)
    SELECT first_name || ' ' || last_name, franklin_pa, id FROM wrestlers WHERE id = ANY(franklin_ids);
  UPDATE tournament_bouts SET wrestler1_school_id = franklin_pa WHERE wrestler1_id = ANY(franklin_ids) AND wrestler1_school_id = 169;
  UPDATE tournament_bouts SET wrestler2_school_id = franklin_pa WHERE wrestler2_id = ANY(franklin_ids) AND wrestler2_school_id = 169;

  -- Delaware Valley, PA
  UPDATE wrestlers SET is_oos = true WHERE id = dambola;
  INSERT INTO wrestler_name_aliases (raw_name, school_id, wrestler_id) VALUES ('Nick D`Ambola', del_valley_pa, dambola);
  UPDATE tournament_bouts SET wrestler1_school_id = del_valley_pa WHERE wrestler1_id = dambola AND wrestler1_school_id = 141;
  UPDATE tournament_bouts SET wrestler2_school_id = del_valley_pa WHERE wrestler2_id = dambola AND wrestler2_school_id = 141;

  DELETE FROM wrestler_hammer_scores   WHERE wrestler_id = ANY(franklin_ids || dambola);
  DELETE FROM wrestler_match_score_log WHERE wrestler_id = ANY(franklin_ids || dambola);

  -- Williamstown, WV: split the WSAZ bout off the NJ Cole Smith
  INSERT INTO wrestlers (first_name, last_name, gender, is_oos) VALUES ('Cole', 'Smith', 'M', true) RETURNING id INTO cole_wv;
  INSERT INTO wrestler_name_aliases (raw_name, school_id, wrestler_id) VALUES ('Cole Smith', williamstown_wv, cole_wv);
  UPDATE tournament_bouts SET wrestler1_id = cole_wv, wrestler1_school_id = williamstown_wv
    WHERE id = wsaz_bout AND wrestler1_id = cole_nj;
  DELETE FROM wrestler_match_score_log WHERE wrestler_id = cole_nj AND source_id = wsaz_bout::text;
  DELETE FROM wrestler_hammer_scores   WHERE wrestler_id = cole_nj AND season = '2025-26';
END $$;

-- Applied 2026-09-24: Franklin, PA = 1199, Delaware Valley, PA = 1200,
-- Williamstown, WV = 1201, new OOS Cole Smith = dadb7236-4a4b-4b76-a97b-cddab5699319.
--
-- Rollback:
-- UPDATE tournament_bouts SET wrestler1_id = 'd9cbf450-d71c-4cb3-a492-bc44264e8540', wrestler1_school_id = 303 WHERE id = '8b414fa8-b8ec-441d-bffb-4418a692224c';
-- DELETE FROM wrestler_name_aliases WHERE school_id IN (1199, 1200, 1201);
-- DELETE FROM wrestlers WHERE id = 'dadb7236-4a4b-4b76-a97b-cddab5699319';
-- UPDATE tournament_bouts SET wrestler1_school_id = 169 WHERE wrestler1_school_id = 1199;
-- UPDATE tournament_bouts SET wrestler2_school_id = 169 WHERE wrestler2_school_id = 1199;
-- UPDATE tournament_bouts SET wrestler2_school_id = 141 WHERE wrestler2_school_id = 1200;
-- UPDATE wrestlers SET is_oos = false WHERE id IN (<franklin ids>, <dambola>);
-- DELETE FROM schools WHERE id IN (1199, 1200, 1201);
-- (hammer / match-score-log rows return on the next boys 2025-26 recalculation)
