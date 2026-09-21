-- ─────────────────────────────────────────────────────────────────────────────
-- 20260920_dual_meets_girls_meet_kind.sql
--
-- Girls only. Distinguishes what kind of event a dual_meets_girls row is, and
-- whether it counts toward a school's dual W-L / Power Points.
--
--   meet_kind            'dual'     full team dual (default)
--                        'partial'  1-2 bouts between two schools (looks like a
--                                   one-match dual). Bouts stay in the data as
--                                   varsity results; team record is opt-in.
--                        'jamboree' pairwise meet derived from a jamboree
--
--   counts_toward_record  true  → included in school W-L / Power Points
--                         false → bouts still count for wrestler records,
--                                 rankings and profiles; team W-L ignores it
--
-- Defaults keep the existing importer working unchanged (every new row is
-- 'dual' / true) until the importer is updated to set the kind.
--
-- Run the DRY RUN first, then the DO block, then the backfill.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── DRY RUN (read-only): how many meets the backfill will mark 'partial' ──────
SELECT
  CASE
    WHEN bouts = 0            THEN '0 bouts (left as dual)'
    WHEN bouts BETWEEN 1 AND 2 THEN '1-2 bouts (→ partial)'
    ELSE '3+ bouts (stay dual)'
  END AS bucket,
  COUNT(*) AS meets
FROM (
  SELECT d.id, COUNT(m.id) AS bouts
  FROM dual_meets_girls d
  LEFT JOIN dual_meet_matches_girls m ON m.dual_meet_id = d.id
  GROUP BY d.id
) x
GROUP BY 1
ORDER BY 1;

-- ── SCHEMA ────────────────────────────────────────────────────────────────────
DO $$ BEGIN

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dual_meets_girls' AND column_name = 'meet_kind'
  ) THEN
    ALTER TABLE dual_meets_girls
      ADD COLUMN meet_kind text NOT NULL DEFAULT 'dual'
      CHECK (meet_kind IN ('dual', 'partial', 'jamboree'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dual_meets_girls' AND column_name = 'counts_toward_record'
  ) THEN
    ALTER TABLE dual_meets_girls
      ADD COLUMN counts_toward_record boolean NOT NULL DEFAULT true;
  END IF;

END $$;

-- ── BACKFILL (safe to re-run) ─────────────────────────────────────────────────
-- Existing meets with 1-2 bouts are the "random" one/two-wrestler meets.
-- They are excluded from team record by default; flip counts_toward_record to
-- true on any that an official standings source includes.
UPDATE dual_meets_girls d
SET meet_kind = 'partial',
    counts_toward_record = false
WHERE d.meet_kind = 'dual'
  AND (
    SELECT COUNT(*) FROM dual_meet_matches_girls m WHERE m.dual_meet_id = d.id
  ) BETWEEN 1 AND 2;

-- ROLLBACK:
-- ALTER TABLE dual_meets_girls DROP COLUMN counts_toward_record;
-- ALTER TABLE dual_meets_girls DROP COLUMN meet_kind;
