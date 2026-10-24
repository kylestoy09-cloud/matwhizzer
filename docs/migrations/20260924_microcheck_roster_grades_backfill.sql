-- docs/migrations/20260924_microcheck_roster_grades_backfill.sql
--
-- The microcheck roster_match task (MicrocheckPanel) saved each reviewed match
-- as roster_grade_import.status = 'wrestler_matched' but never ran the confirm
-- step that writes the grade to wrestlers. 6,679 human-reviewed matches from
-- 2026-09-20..22 (296 schools) never reached wrestler profiles; only 77 grades
-- written through /admin/roster-grade-import did. The panel now confirms on
-- submit; this backfills the rest.
--
-- Written: every wrestler_matched row (season 2026) whose wrestler has no grade
-- or the same grade. grade_confirmed_at = when the match was reviewed.
-- Held back for manual review (left as wrestler_matched):
--   * wrestlers whose current grade differs from the import grade
--   * wrestlers matched by two import rows with different grades

DO $$
BEGIN
  CREATE TEMP TABLE held ON COMMIT DROP AS
    SELECT r.wrestler_id
    FROM roster_grade_import r
    JOIN wrestlers w ON w.id = r.wrestler_id
    WHERE r.season_id = 2026 AND r.status = 'wrestler_matched'
    GROUP BY r.wrestler_id, w.grade
    HAVING count(DISTINCT r.grade) > 1
        OR (w.grade IS NOT NULL AND w.grade <> min(r.grade));

  UPDATE wrestlers w
  SET grade = r.grade,
      grade_confirmed_at = r.updated_at,
      grade_confirmed_source = 'roster_upload'
  FROM (
    SELECT DISTINCT ON (wrestler_id) wrestler_id, grade, updated_at
    FROM roster_grade_import
    WHERE season_id = 2026 AND status = 'wrestler_matched'
      AND wrestler_id NOT IN (SELECT wrestler_id FROM held)
    ORDER BY wrestler_id, updated_at DESC
  ) r
  WHERE w.id = r.wrestler_id AND w.gender = 'M';

  UPDATE roster_grade_import
  SET status = 'confirmed', confirmed_by = 'backfill: microcheck roster_match', confirmed_at = updated_at
  WHERE season_id = 2026 AND status = 'wrestler_matched'
    AND wrestler_id NOT IN (SELECT wrestler_id FROM held);
END $$;

-- Rollback (grades that were NULL before cannot be told apart from ones that
-- matched, so restore from the pre-apply snapshot saved in the session scratchpad):
-- UPDATE roster_grade_import SET status = 'wrestler_matched', confirmed_by = NULL, confirmed_at = NULL
--   WHERE confirmed_by = 'backfill: microcheck roster_match';
