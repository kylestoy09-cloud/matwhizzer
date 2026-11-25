-- Kyle 2026-11-18: the college Progress grid (admin → Non-NJSIAA → College, first tab) turns a championship green
-- once its year has been reviewed. Who marked it, and when, per side.
DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      ALTER TABLE %1$s_college_events ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
      ALTER TABLE %1$s_college_events ADD COLUMN IF NOT EXISTS reviewed_by text;
    $f$, g);
  END LOOP;
END $$;

-- check: both 0 (no championship marked yet)
SELECT (SELECT count(*) FROM boys_college_events WHERE reviewed_at IS NOT NULL) AS boys,
       (SELECT count(*) FROM girls_college_events WHERE reviewed_at IS NOT NULL) AS girls;
