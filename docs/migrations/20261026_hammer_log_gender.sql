-- docs/migrations/20261026_hammer_log_gender.sql
--
-- Hammer scores: keep boys and girls apart.
--
-- 1. wrestler_match_score_log had no gender, and the recalc deleted the whole
--    season's log before writing its own gender's rows. The girls run on
--    2026-10-26 wiped the boys log (150,981 rows → 50,844 girls rows). Adds
--    gender, filled from wrestlers, so each run deletes only its own rows
--    (src/app/api/admin/recalculate-hammer-scores/route.ts).
-- 2. 2,011 girls held gender 'M' rows in wrestler_hammer_scores from an earlier
--    boys run that scored every NJ wrestler in a boys bout regardless of gender.
--    The table holds one row per wrestler per season, so those rows made every
--    girls insert batch fail (silently). Deletes rows whose gender doesn't match
--    the wrestler's. Backup: docs/migrations/backups/20261026_hammer_wrong_gender_rows.json
--
-- wrestlers.gender is the gender_type enum; the other two columns are text,
-- hence the casts. Every statement is safe to re-run.
--
-- After running: re-run the boys AND girls hammer recalculations (the boys log
-- has to be rebuilt).

ALTER TABLE wrestler_match_score_log ADD COLUMN IF NOT EXISTS gender text;

UPDATE wrestler_match_score_log l
SET    gender = w.gender::text
FROM   wrestlers w
WHERE  w.id = l.wrestler_id AND l.gender IS NULL;

CREATE INDEX IF NOT EXISTS idx_wrestler_match_score_log_season_gender
  ON wrestler_match_score_log (season, gender);

DELETE FROM wrestler_hammer_scores h
USING  wrestlers w
WHERE  w.id = h.wrestler_id AND h.gender IS DISTINCT FROM w.gender::text;

-- Verify: expect 0 rows with no gender, 0 wrong-gender hammer rows
SELECT 'log rows without gender' AS what, COUNT(*) FROM wrestler_match_score_log WHERE gender IS NULL
UNION ALL
SELECT 'wrong-gender hammer rows', COUNT(*) FROM wrestler_hammer_scores h JOIN wrestlers w ON w.id = h.wrestler_id
WHERE h.gender IS DISTINCT FROM w.gender::text;

-- ROLLBACK: re-insert the backup rows; DROP INDEX idx_wrestler_match_score_log_season_gender;
-- ALTER TABLE wrestler_match_score_log DROP COLUMN gender;
