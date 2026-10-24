-- docs/migrations/20260924_roster_upload_grade_confirmed_at.sql
--
-- The roster grade import's confirm step (api/admin/roster-grade-import/confirm)
-- wrote grade + grade_confirmed_source = 'roster_upload' but never set
-- grade_confirmed_at, so those wrestlers still counted as "without confirmed
-- grade" in data health and showed no "Last confirmed" date on the admin
-- profile. The route now sets it; this backfills the rows already written,
-- using the import row's confirmed_at (falling back to now()).

UPDATE wrestlers w
SET grade_confirmed_at = COALESCE(
  (SELECT max(r.confirmed_at) FROM roster_grade_import r
    WHERE r.wrestler_id = w.id AND r.status = 'confirmed'),
  now())
WHERE w.grade_confirmed_source = 'roster_upload'
  AND w.grade_confirmed_at IS NULL
  AND w.grade IS NOT NULL;

-- Rollback: UPDATE wrestlers SET grade_confirmed_at = NULL WHERE id IN (<the 40 ids,
-- saved at apply time in the session scratchpad>); values are informational only.
