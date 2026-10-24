-- docs/migrations/20260924_split_luke_miller_demarest.sql
--
-- Two different wrestlers named Luke Miller shared one record
-- (b2654654-…, Lacey, Jr from districts): the 2026-07-31 alias build gave that
-- record an alias at Demarest (314) as well as Lacey (249), so the Demarest
-- sophomore's roster grade import row matched the Lacey junior and his BCCA
-- tournament bout was credited to him. The Demarest wrestler's 4 dual matches
-- were imported with his name but no wrestler_id, so he never appeared on
-- Demarest's roster.
--
-- Fix: create the Demarest Luke Miller (So, from the roster import), move the
-- Demarest alias, the 4 Demarest dual sides (+ winner on the one he won by fall),
-- the BCCA bout and the Demarest import row to him. The Lacey import row (Jr)
-- confirms the existing record's grade.

DO $$
DECLARE
  lacey   uuid := 'b2654654-b493-436d-8c8a-87e49a09ea1f';
  dem     uuid;
BEGIN
  INSERT INTO wrestlers (first_name, last_name, gender, is_oos, grade, grade_confirmed_at, grade_confirmed_source)
    VALUES ('Luke', 'Miller', 'M', false, 'So', now(), 'roster_upload') RETURNING id INTO dem;

  UPDATE wrestler_name_aliases SET wrestler_id = dem WHERE wrestler_id = lacey AND school_id = 314;

  UPDATE dual_meet_matches SET wrestler_a_id = dem
    WHERE id IN ('3ffdaa43-b429-4919-8d67-e2833f8f7c75', '2f4aa6a3-245e-45e0-bd66-fb7ed7fbef09',
                 'b9c71813-5091-4bbe-8616-f51eb728437a', '4f461803-6c7b-4dc1-9d7f-21be1a1b441a')
      AND wrestler_a_id IS NULL AND school_a_id = 314;
  -- Won by fall vs Niranjan Mehta (winner was the unlinked side)
  UPDATE dual_meet_matches SET winner_id = dem
    WHERE id = '4f461803-6c7b-4dc1-9d7f-21be1a1b441a' AND winner_id IS NULL;

  UPDATE tournament_bouts SET wrestler2_id = dem
    WHERE id = 'e9c3fbe0-cf73-42de-99df-e25509cad4d2' AND wrestler2_id = lacey AND wrestler2_school_id = 314;
  DELETE FROM wrestler_match_score_log WHERE wrestler_id = lacey AND source_id = 'e9c3fbe0-cf73-42de-99df-e25509cad4d2';

  UPDATE roster_grade_import SET wrestler_id = dem, status = 'confirmed', confirmed_by = 'split: Luke Miller', confirmed_at = now()
    WHERE id = '5796e6ef-8479-4a26-83df-300773a63cf8';
  UPDATE roster_grade_import SET status = 'confirmed', confirmed_by = 'split: Luke Miller', confirmed_at = now()
    WHERE id = 'dbdbeb01-23f6-4a23-b0c6-89de8670a26d';
  UPDATE wrestlers SET grade_confirmed_at = now(), grade_confirmed_source = 'roster_upload' WHERE id = lacey AND grade = 'Jr';
END $$;
