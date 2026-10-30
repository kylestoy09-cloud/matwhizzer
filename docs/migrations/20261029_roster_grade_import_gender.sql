-- roster_grade_import.gender — boys and girls rosters are separate imports.
--
-- The table was built for the boys Track rosters (2026-09-15, 12,225 rows, all
-- boys, season 2026). Girls 2025-26 rosters are loaded next; without a gender
-- column they would share one pool with the boys rows for the same season.
-- Every existing row is boys.

ALTER TABLE roster_grade_import ADD COLUMN IF NOT EXISTS gender text;

UPDATE roster_grade_import SET gender = 'M' WHERE gender IS NULL;

ALTER TABLE roster_grade_import ALTER COLUMN gender SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roster_grade_import_gender_check') THEN
    ALTER TABLE roster_grade_import ADD CONSTRAINT roster_grade_import_gender_check CHECK (gender IN ('M','F'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rgi_season_gender_status ON roster_grade_import (season_id, gender, status);
CREATE INDEX IF NOT EXISTS idx_rgi_school_gender        ON roster_grade_import (school_id, gender);

-- Verify: expect one row, M / 2026 / 12225
SELECT gender, season_id, COUNT(*) FROM roster_grade_import GROUP BY gender, season_id ORDER BY 1, 2;
