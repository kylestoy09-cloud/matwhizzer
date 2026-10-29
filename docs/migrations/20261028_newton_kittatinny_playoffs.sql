-- docs/migrations/20261028_newton_kittatinny_playoffs.sql
--
-- Girls 2025-26. The Newton/Kittatinny girls co-op is school 24 (girls_schools
-- display name "Newton/Kittatinny"; official standings row 12-5, North). School
-- alias 577 ("Newton/Kittatinny" → 315 Kittatinny, July 2026, "girls combined
-- program") sent its two 2026-02-17 team playoff duals to 315, leaving Newton
-- 11-4. Moves both meets (and their bouts' school ids) to 24 and points the
-- alias at 24, so the girls importers resolve the co-op name correctly.
-- Applied with a service-role script; backup:
-- docs/migrations/backups/20261028_newton_kittatinny_playoffs.json

DO $$
BEGIN
  UPDATE dual_meets_girls SET team1_school_id = 24 WHERE season_id = 2026 AND is_playoff AND team1_school_id = 315;
  UPDATE dual_meets_girls SET team2_school_id = 24 WHERE season_id = 2026 AND is_playoff AND team2_school_id = 315;
  UPDATE dual_meet_matches_girls SET school_a_id = 24 WHERE school_a_id = 315
    AND dual_meet_id IN (SELECT id FROM dual_meets_girls WHERE season_id = 2026 AND is_playoff);
  UPDATE dual_meet_matches_girls SET school_b_id = 24 WHERE school_b_id = 315
    AND dual_meet_id IN (SELECT id FROM dual_meets_girls WHERE season_id = 2026 AND is_playoff);
  UPDATE school_aliases SET school_id = 24 WHERE id = 577 AND alias = 'Newton/Kittatinny';
END $$;

-- Verify: expect 0 girls meets on 315; Newton (24) counted record 12-5
SELECT COUNT(*) FROM dual_meets_girls WHERE season_id = 2026 AND 315 IN (team1_school_id, team2_school_id);
