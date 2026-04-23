-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260422_school_colors_update2.sql
--
-- Two parts:
--
-- Part 1 — Set header_background for 12 schools with new SVGs (NULL → new
--           value). Also sets Oakcrest (284) which already had an SVG.
--           Only fires when the column IS NULL to avoid clobbering any
--           value set since the CSV was generated.
--
-- Part 2 — Correct genuinely wrong color_primary/secondary/tertiary values
--           for Gateway (291) and Pennsville (293). These are real data
--           errors: Gateway was green/gold in the DB but is royal blue/white;
--           Pennsville had green/gold but is navy/yellow.
--
-- Excludes ID 289 (Cumberland, stays at #DB5B2A).
--
-- ROLLBACK at bottom of file.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Part 1: NULL header_background → new values ───────────────────────────────

UPDATE schools
SET    header_background = v.color
FROM  (VALUES
  (59,  '#006400'),  -- Saddle Brook
  (72,  '#CC4E10'),  -- Paterson Eastside
  (84,  '#8F0018'),  -- Madison
  (138, '#8F0018'),  -- Union
  (213, '#4169E1'),  -- Notre Dame
  (221, '#000000'),  -- Neptune
  (223, '#FFFFFF'),  -- Point Pleasant Beach
  (239, '#CC0022'),  -- Haddon Heights
  (248, '#003087'),  -- Donovan Catholic
  (278, '#00824B'),  -- Camden Catholic
  (284, '#034CB2'),  -- Oakcrest
  (291, '#034CB2'),  -- Gateway Reg/Woodbury
  (388, '#454444')   -- Northern Burlington
) AS v(id, color)
WHERE schools.id = v.id
  AND schools.header_background IS NULL;

-- ── Part 2: Correct wrong color columns for Gateway and Pennsville ────────────

-- Gateway (291): DB had green/gold (wrong) — correct to royal blue/white/black
UPDATE schools
SET    color_primary   = '#034CB2',
       color_secondary = '#FFFFFF',
       color_tertiary  = '#000000'
WHERE  id = 291;

-- Pennsville (293): DB had green/gold (wrong) — correct to navy/yellow
-- header_background (#263586) was set correctly in the 20260422_school_colors_update migration.
UPDATE schools
SET    color_primary   = '#263586',
       color_secondary = '#FCE80B'
WHERE  id = 293;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- Part 1 — restore the 13 schools to NULL:
--
-- BEGIN;
-- UPDATE schools
-- SET    header_background = NULL
-- WHERE  id IN (59,72,84,138,213,221,223,239,248,278,284,291,388);
-- COMMIT;
--
-- Part 2 — restore Gateway and Pennsville to prior (incorrect) values:
--
-- BEGIN;
-- UPDATE schools
-- SET    color_primary = '#006400', color_secondary = '#C8880A', color_tertiary = '#FFFFFF'
-- WHERE  id = 291;
-- UPDATE schools
-- SET    color_primary = '#006400', color_secondary = '#C8880A'
-- WHERE  id = 293;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
