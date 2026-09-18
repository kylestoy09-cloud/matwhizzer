-- Merge duplicate Corner Canyon OOS schools.
-- Keep 768 (has all data), drop 809.
--
-- Data on 768: 14 wrestler_name_aliases, 1 school_alias
-- Data on 809: 1 in_season_tournament_team_scores (unknown at query time — handled below)

DO $$
BEGIN
  UPDATE tournament_bouts SET wrestler1_school_id = 768 WHERE wrestler1_school_id = 809;
  UPDATE tournament_bouts SET wrestler2_school_id = 768 WHERE wrestler2_school_id = 809;
  UPDATE tournament_placements SET school_id = 768 WHERE school_id = 809;
  UPDATE in_season_tournament_team_scores SET school_id = 768 WHERE school_id = 809;
  UPDATE wrestler_name_aliases SET school_id = 768 WHERE school_id = 809;

  DELETE FROM school_aliases sa
  WHERE sa.school_id = 809
    AND EXISTS (
      SELECT 1 FROM school_aliases sa2
      WHERE sa2.school_id = 768 AND sa2.alias = sa.alias
    );
  UPDATE school_aliases SET school_id = 768 WHERE school_id = 809;

  DELETE FROM schools WHERE id = 809;
END;
$$;
