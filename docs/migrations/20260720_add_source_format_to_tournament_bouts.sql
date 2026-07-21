-- ============================================================
-- Migration: add source_format column to tournament_bouts
-- Date: 2026-07-20
-- Why: Track which pipeline produced each bout row so bracket
--      fidelity (PDF full bracket) vs. results-only (pipe/bullet
--      CSV, RTF) can be distinguished in queries and admin UI.
-- Values expected: 'pipe', 'bullet', 'rtf', 'pdf'
-- ============================================================

ALTER TABLE tournament_bouts
  ADD COLUMN IF NOT EXISTS source_format text;

COMMENT ON COLUMN tournament_bouts.source_format IS
  'Import pipeline that produced this row: pipe = pipe-delimited CSV export, bullet = bullet-format CSV export, rtf = RTF bracket file, pdf = bracket PDF reconstruction.';

-- Back-fill existing rows (all pre-migration data came from RTF imports)
UPDATE tournament_bouts
   SET source_format = 'rtf'
 WHERE source_format IS NULL;

-- Verify: all rows should now have a source_format
-- SELECT source_format, COUNT(*) FROM tournament_bouts GROUP BY source_format;
