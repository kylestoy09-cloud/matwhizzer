-- docs/migrations/20260916_fix_demarest_old_tappan.sql
--
-- Demarest (314) / Old Tappan (6) co-op is girls-only.
-- The 20260916_girls_coop_cleanup migration incorrectly applied the co-op
-- name to boys_schools. Demarest has its own independent boys program.

UPDATE boys_schools SET display_name = 'Demarest', is_combined = false WHERE school_id = 314;
UPDATE schools SET display_name = 'Demarest' WHERE id = 314;

INSERT INTO girls_schools (school_id, display_name, is_combined)
  VALUES (314, 'Demarest-Old Tappan', true)
  ON CONFLICT (school_id) DO UPDATE SET display_name = 'Demarest-Old Tappan', is_combined = true;

-- Old Tappan (6): inactive for girls season 2 only, not boys
DELETE FROM inactive_school_seasons WHERE school_id = 6 AND gender = 'M';
INSERT INTO inactive_school_seasons (school_id, season_id, gender)
  VALUES (6, 2, 'F')
  ON CONFLICT (school_id, season_id, gender) DO NOTHING;
