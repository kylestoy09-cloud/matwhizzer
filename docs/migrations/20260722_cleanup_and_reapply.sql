-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260722_cleanup_and_reapply.sql
--
-- Prerequisite cleanup before re-running the OOS support migration and the
-- Sam Cali abbreviation patch.
--
-- Context:
--   20260722_school_aliases_oos_support.sql partially applied:
--     ✓ school_aliases.school_id is now nullable (ALTER ran and auto-committed)
--     ✓ school_aliases_alias_unique constraint is dropped (DROP ran and auto-committed)
--     ✗ CREATE UNIQUE INDEX school_aliases_nj_alias_unique → FAILED (KIRE duplicate)
--     ✗ CREATE UNIQUE INDEX school_aliases_oos_alias_unique → did not run
--     ✗ ADD COLUMN confirmed_at → did not run
--
--   20260722_patch_sam_cali_school_abbreviations.sql fully rolled back:
--     The BEGIN/COMMIT wrapper caused a complete rollback when the OOS INSERT
--     failed (school_id NOT NULL at time of execution).  All 206 bout UPDATEs
--     and all alias INSERTs are still pending.
--
-- This script:
--   Step 1 — Delete all 40 duplicate alias rows that block index creation.
--   Step 2 — Run the 3 remaining OOS support statements.
--
-- After this script: run the full apply sequence Steps 3-11 from the
-- migration README.  Sam Cali patch (Step 8) is NOT yet applied.
--
-- Manual apply only — do NOT auto-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: Delete all duplicate alias rows ───────────────────────────────────
--
-- 23 alias strings have 2+ rows; we need ≤ 1 row per alias (school_id IS NOT
-- NULL) for the partial unique index to succeed.
--
-- Category A (5 rows) — same school_id on all copies; delete the extras.
-- Category B (4 rows) — different school_ids; delete the clearly wrong school.
-- Category C (31 rows) — genuinely ambiguous; delete all copies.
--   Sam Cali patch (Step 8) will re-insert HILL→188, LAKE→5, MANA→220,
--   PISC→183 with the correct school_ids.  Other Category C aliases
--   (LIND, MARE, MILL, MONT, MORR, PETO, PVS, RIDG, WEST, WILL, WOOD)
--   will be absent after cleanup and must be re-seeded manually if needed.

DELETE FROM school_aliases WHERE id IN (

  -- ── Category A: same school_id ─────────────────────────────────────────────
  1617,  -- KIRE dup          (keep 1607, both school 260 Kingsway)
  1668,  -- SPP dup           (keep 1667, both school 167 St. Peter's Prep)
  1670,  -- Haddon Twp Hgh School run 1 of 2  (keep 263, school 240 Haddon Twp)
  1672,  -- Haddon Twp Hgh School run 2 of 2  (keep 263, school 240 Haddon Twp)
  1673,  -- Passaic Co Tech-Voc dup            (keep 1671, school 391)

  -- ── Category B: different school_ids — delete the clearly wrong school ──────
  -- HACK → Hackensack (43).  Hackettstown (112) uses HTWN, not HACK.
  1440,  -- HACK → school 112 (Hackettstown)   DELETE; keep 1404 → school 43 (Hackensack)
  -- HAHE → Hasbrouck Heights (54).  Haddon Heights (239) abbreviates as HDHG/HDNHTS.
  1568,  -- HAHE → school 239 (Haddon Heights) DELETE; keep 1395 → school 54 (Hasbrouck Heights)
  -- MAHS → Mahwah (14).  MAHS = MaHwah High School.  Manville (171) doesn't fit.
  1509,  -- MAHS → school 171 (Manville)        DELETE; keep 1366 → school 14 (Mahwah)
  -- WHS → Wayne Hills (38).  WHS = Wayne Hills School.  Weehawken (99) uses WEEH.
  1417,  -- WHS → school 99 (Weehawken)          DELETE; keep 1361 → school 38 (Wayne Hills)

  -- ── Category C: genuinely ambiguous — delete all copies ────────────────────
  -- HILL: Hillside (124) vs Hillsborough (188)
  1484, 1488,
  -- LAKE: Lakeland (5) vs Lakewood (203)
  1346, 1559,
  -- LIND: Linden (152) vs Lindenwold (308)
  1474, 1608,
  -- MANA: Manasquan (220) vs Manalapan (204)
  1540, 1561,
  -- MARE: Manchester Regional (45) vs Mainland (282)
  1356, 1618,
  -- MILL: Millburn (133) vs Millville (292)
  1452, 1630,
  -- MONT: Montville (75) vs Montclair (105) vs Montgomery (173)
  1375, 1424, 1510,
  -- MORR: Morris Hills (76) vs Morristown (114)
  1376, 1433,
  -- PETO: Pequannock (36) vs Pemberton (273)
  1358, 1579,
  -- PISC: Pingry (144) vs Piscataway (183)
  1475, 1503,
  -- PVS: Pascack Valley (16) vs Passaic Valley (46)
  1368, 1407,
  -- RIDG: Ridgewood (19) vs Ridge (156)
  1371, 1427,
  -- WEST: Westwood (10) vs Westfield (128)
  1362, 1458,
  -- WILL: Willingboro (265) vs Williamstown (303)
  1593, 1612,
  -- WOOD: Woodbridge (187) vs Woodstown (295)
  1506, 1633

);

-- Verify: zero duplicates remain
-- SELECT alias, COUNT(*) AS n
-- FROM school_aliases
-- WHERE school_id IS NOT NULL
-- GROUP BY alias HAVING COUNT(*) > 1;


-- ── Step 2: Resume the 3 remaining OOS support statements ─────────────────────
--
-- Statements 1 and 2 of 20260722_school_aliases_oos_support.sql already ran
-- (school_id is nullable, global unique constraint is dropped).
-- These are statements 3-5 from that file.

-- NJ uniqueness: one alias string → at most one NJ school.
CREATE UNIQUE INDEX school_aliases_nj_alias_unique
  ON public.school_aliases (alias)
  WHERE school_id IS NOT NULL;

-- OOS uniqueness: one OOS decision per alias string.
CREATE UNIQUE INDEX school_aliases_oos_alias_unique
  ON public.school_aliases (alias)
  WHERE alias_type = 'oos';

-- Timestamp column for new inserts.
ALTER TABLE public.school_aliases
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT now();


-- ── Rollback (uncomment to reverse Step 2 only — Step 1 DELETEs are not reversible) ──
/*
DROP INDEX IF EXISTS public.school_aliases_nj_alias_unique;
DROP INDEX IF EXISTS public.school_aliases_oos_alias_unique;
ALTER TABLE public.school_aliases DROP COLUMN IF EXISTS confirmed_at;
*/
