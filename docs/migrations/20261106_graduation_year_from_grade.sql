-- docs/migrations/20261106_graduation_year_from_grade.sql
--
-- wrestlers.graduation_year is the source of a wrestler's class in every season (class of 2027:
-- 2024-25 So, 2025-26 Jr, 2026-27 Sr). It was backfilled 2026-11-06 (scripts/backfill_graduation_
-- year_20261106.mts). Grades are written by many tools (imports, roster grade import, microcheck,
-- admin edits, rollover), so the database keeps graduation_year in step: when a grade is set or
-- changed and the same write doesn't set graduation_year itself, it becomes
--   (the season the grade column describes, by end year) + 12 - grade (Fr 9, So 10, Jr 11, Sr 12).
-- grade_season holds that season per program: 2025-26 (2026) for both, since no rollover has run.
-- Season Rollover advances it by one before advancing grades, so a rolled-over grade keeps its class.
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS grade_season (
  gender     text    PRIMARY KEY CHECK (gender IN ('M', 'F')),
  season_end integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO grade_season (gender, season_end) VALUES ('M', 2026), ('F', 2026) ON CONFLICT (gender) DO NOTHING;
ALTER TABLE grade_season ENABLE ROW LEVEL SECURITY;
GRANT ALL ON grade_season TO service_role;

CREATE OR REPLACE FUNCTION public.wrestlers_graduation_year_from_grade()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_idx integer;
  v_end integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.grade IS NOT DISTINCT FROM OLD.grade THEN RETURN NEW; END IF;
    IF NEW.graduation_year IS DISTINCT FROM OLD.graduation_year THEN RETURN NEW; END IF;   -- set by the caller
  ELSIF NEW.graduation_year IS NOT NULL THEN
    RETURN NEW;
  END IF;
  v_idx := CASE NEW.grade WHEN 'Fr' THEN 9 WHEN 'So' THEN 10 WHEN 'Jr' THEN 11 WHEN 'Sr' THEN 12 END;
  IF v_idx IS NULL THEN RETURN NEW; END IF;
  SELECT season_end INTO v_end FROM grade_season WHERE gender = NEW.gender::text;
  IF v_end IS NOT NULL THEN NEW.graduation_year := v_end + 12 - v_idx; END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS wrestlers_graduation_year_from_grade ON wrestlers;
CREATE TRIGGER wrestlers_graduation_year_from_grade
  BEFORE INSERT OR UPDATE OF grade ON wrestlers
  FOR EACH ROW EXECUTE FUNCTION wrestlers_graduation_year_from_grade();

COMMIT;

-- Verify: both programs on 2026; wrestlers with a grade but no graduation year (expect 30 boys+girls,
-- the conflicts in docs/reviews/grade_conflicts_20261106.md, plus out-of-state wrestlers)
SELECT * FROM grade_season ORDER BY gender;
SELECT gender, is_oos, count(*) FROM wrestlers WHERE grade IN ('Fr','So','Jr','Sr') AND graduation_year IS NULL GROUP BY 1, 2 ORDER BY 1, 2;
