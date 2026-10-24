-- docs/migrations/20260924_dover_de_oos_mixup_fix.sql
--
-- The 2026-08-10 import of the Howdy Duncan tournament (2025-12-19/20, a
-- Delaware event Pennsville attended; source_format 'school_tracking') put
-- every out-of-state opponent school on an OOS stub (604–626), including
-- 608 "Dover, DE". But the raw school name was just "Dover", which exactly
-- matches NJ Dover's display_name alias (school 61), so the three Dover, DE
-- wrestlers were created as NJ wrestlers on Dover NJ's roster.
--
-- They have one bout each (all at Howdy Duncan), no duals, no roster-grade
-- import rows and no rankings. The fix makes them look like the other OOS
-- wrestlers from the same tournament: alias + bout school on 608, is_oos =
-- true, and no hammer score / match score log rows (the recalculation skips
-- OOS wrestlers, so those rows would only reappear if is_oos were reverted).

DO $$
DECLARE
  oos_ids uuid[] := ARRAY[
    'e3431f0b-ef0e-4cf9-8ef5-cec4da18cce1', -- Jahziah Jimenez
    '1be16637-16a6-446c-818a-1c6177175f04', -- Maxtin Kiesel
    '7c855dec-35bd-4296-8d6d-15e9af0024f8'  -- Silas Sheranko
  ];
  howdy_duncan uuid := '2d09cb17-98c4-4437-912c-4a7ff2268a95';
BEGIN
  UPDATE wrestler_name_aliases
    SET school_id = 608
    WHERE wrestler_id = ANY(oos_ids) AND school_id = 61;

  UPDATE wrestlers
    SET is_oos = true
    WHERE id = ANY(oos_ids);

  UPDATE tournament_bouts
    SET wrestler1_school_id = 608
    WHERE in_season_tournament_id = howdy_duncan
      AND wrestler1_id = ANY(oos_ids) AND wrestler1_school_id = 61;

  UPDATE tournament_bouts
    SET wrestler2_school_id = 608
    WHERE in_season_tournament_id = howdy_duncan
      AND wrestler2_id = ANY(oos_ids) AND wrestler2_school_id = 61;

  DELETE FROM wrestler_hammer_scores   WHERE wrestler_id = ANY(oos_ids);
  DELETE FROM wrestler_match_score_log WHERE wrestler_id = ANY(oos_ids);
END $$;

-- Rollback (hammer/log rows come back on the next boys 2025-26 recalculation):
-- UPDATE wrestler_name_aliases SET school_id = 61 WHERE id IN (41888, 41892, 41899);
-- UPDATE wrestlers SET is_oos = false WHERE id IN (<the 3 ids above>);
-- UPDATE tournament_bouts SET wrestler1_school_id = 61 WHERE id = '9d5af14b-883d-41dc-b94e-81cd01d0fdb9';
-- UPDATE tournament_bouts SET wrestler2_school_id = 61 WHERE id IN ('7e6561aa-00f1-40e0-bfc0-1045b6ef6fbc', 'a6c0a7ec-1b6f-4936-8fd1-df80fb64f723');
