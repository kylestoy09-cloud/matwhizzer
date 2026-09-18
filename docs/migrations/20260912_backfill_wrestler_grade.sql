-- Backfill wrestlers.grade from tournament_entries.grade_label
--
-- wrestlers.grade was added in 20260824_roster_enrollment.sql but never backfilled.
-- tournament_entries.grade_label already stores the same short codes ('Fr','So','Jr','Sr')
-- captured at import time. This migration copies the most-recent grade_label per wrestler
-- into wrestlers.grade, skipping wrestlers that already have a grade set.
--
-- Strategy: per wrestler, prefer the grade_label from the highest season_id entry,
-- and within ties prefer a non-null grade_label.

UPDATE wrestlers w
SET
  grade                   = latest.grade_label,
  grade_confirmed_at      = now(),
  grade_confirmed_source  = 'districts'
FROM (
  SELECT DISTINCT ON (te.wrestler_id)
    te.wrestler_id,
    te.grade_label
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  WHERE te.grade_label IS NOT NULL
    AND te.grade_label IN ('Fr', 'So', 'Jr', 'Sr')
  ORDER BY te.wrestler_id, t.season_id DESC, te.grade_label
) latest
WHERE w.id      = latest.wrestler_id
  AND w.grade   IS NULL;

-- Verify: count of wrestlers updated
-- SELECT COUNT(*) FROM wrestlers WHERE grade IS NOT NULL AND grade_confirmed_source = 'districts';

-- Rollback:
-- UPDATE wrestlers SET grade = NULL, grade_confirmed_at = NULL, grade_confirmed_source = NULL
-- WHERE grade_confirmed_source = 'districts';
