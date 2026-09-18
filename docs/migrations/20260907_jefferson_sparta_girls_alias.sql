-- Fix: Jefferson-Sparta girls co-op school alias
--
-- Problem: the RTF import parser was matching "Jefferson" (raw name from
-- TrackWrestling) to the NJ school "Jefferson" (a boys school) instead of
-- "Jefferson-Sparta" (the 2025-26 girls co-op school). The school matcher
-- checks exact NJ display_name first and found Jefferson before ever looking
-- at aliases. Girls wrestlers were being linked to Jefferson's school_id.
--
-- Fix (code side): matchSchoolNames now checks gender-specific aliases BEFORE
-- the exact NJ match step. Aliases opt in via notes = 'gender:F' / 'gender:M'.
--
-- Fix (DB side, this file):
--   1. Add gender-specific alias so "Jefferson" → Jefferson-Sparta for girls
--   2. Re-link wrestler_name_aliases rows that used Jefferson's school_id for
--      girls wrestlers (that's how the wrestler↔school bond is stored)
--   3. Re-link tournament_bouts wrestler1/2_school_id for girls
--   4. Re-link tournament_placements school_id for girls
--   5. Re-link dual_meets team school_id for girls meets
--   6. Re-link dual_meet_matches school_a_id/school_b_id for girls meets
--
-- Schema notes:
--   wrestlers        — no school_id column; school stored in wrestler_name_aliases
--   wrestler_name_aliases (raw_name, school_id, wrestler_id) — the join table
--   tournament_bouts — wrestler1_school_id, wrestler2_school_id, wrestler1_id, wrestler2_id
--   dual_meet_matches — school_a_id, school_b_id (team-level, inherited from dual_meets)
--   dual_meets       — team1_school_id, team2_school_id, gender
--
-- Run this in the Supabase SQL editor. Verify Step 1 returns both rows
-- before running the UPDATE statements.

-- ── Step 1: verify school IDs ─────────────────────────────────────────────────
SELECT id, display_name, is_nj
FROM schools
WHERE display_name IN ('Jefferson', 'Jefferson-Sparta')
  AND is_nj = true
ORDER BY display_name;

-- ── Step 2: add gender-specific alias ────────────────────────────────────────
-- "Jefferson" (raw name in RTF) → Jefferson-Sparta school_id, girls only.
-- For boys, the exact NJ match to Jefferson still fires first (unchanged).
INSERT INTO school_aliases (school_id, alias, alias_type, notes)
SELECT
  s.id,
  'Jefferson',
  'nj',
  'gender:F'
FROM schools s
WHERE s.display_name = 'Jefferson-Sparta'
  AND s.is_nj = true
ON CONFLICT DO NOTHING;

-- ── Step 3: re-link wrestler_name_aliases ─────────────────────────────────────
-- This is the primary wrestler↔school bond used by the match/import pipeline.
-- Fix aliases where a girls wrestler was anchored to Jefferson's school_id.
UPDATE wrestler_name_aliases wna
SET school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE wna.school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND wna.wrestler_id IN (
    SELECT id FROM wrestlers WHERE gender = 'F'
  );

-- ── Step 4: re-link tournament_bouts rows ────────────────────────────────────
-- Wrestler1 side
UPDATE tournament_bouts tb
SET wrestler1_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE tb.wrestler1_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND tb.wrestler1_id IN (
    SELECT id FROM wrestlers WHERE gender = 'F'
  );

-- Wrestler2 side
UPDATE tournament_bouts tb
SET wrestler2_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE tb.wrestler2_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND tb.wrestler2_id IN (
    SELECT id FROM wrestlers WHERE gender = 'F'
  );

-- ── Step 5: re-link tournament_placements rows ────────────────────────────────
-- tournament_placements has its own school_id column.
UPDATE tournament_placements tp
SET school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE tp.school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND tp.wrestler_id IN (
    SELECT id FROM wrestlers WHERE gender = 'F'
  );

-- ── Step 6: re-link tournament_entries (postseason brackets) ─────────────────
-- tournament_entries has its own school_id; drives the school_directory RPC.
UPDATE tournament_entries te
SET school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE te.school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND te.tournament_id IN (
    SELECT id FROM tournaments WHERE gender = 'F'
  );

-- ── Step 7: re-link dual_meets team school IDs ───────────────────────────────
-- dual_meets stores the two competing schools; fix girls meets only.
UPDATE dual_meets
SET team1_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE team1_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND gender = 'F';

UPDATE dual_meets
SET team2_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE team2_school_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND gender = 'F';

-- ── Step 8: re-link dual_meet_matches school_a/b_id ─────────────────────────
-- These inherit their school IDs from the dual_meets team school IDs.
-- Fix rows scoped to girls meets.
UPDATE dual_meet_matches dmm
SET school_a_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE dmm.school_a_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND dmm.dual_meet_id IN (
    SELECT id FROM dual_meets WHERE gender = 'F'
  );

UPDATE dual_meet_matches dmm
SET school_b_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson-Sparta' AND s.is_nj = true LIMIT 1
)
WHERE dmm.school_b_id = (
  SELECT s.id FROM schools s WHERE s.display_name = 'Jefferson' AND s.is_nj = true LIMIT 1
)
  AND dmm.dual_meet_id IN (
    SELECT id FROM dual_meets WHERE gender = 'F'
  );

-- ── Step 9: re-link precomputed_team_scores girls rows ───────────────────────
-- tournament_type 'girls_regions' etc. identifies girls rows (no gender column).
UPDATE precomputed_team_scores
SET school_id = 372,
    school_name = 'Jefferson-Sparta'
WHERE school_id = 4
  AND tournament_type IN ('girls_regions', 'district_32', 'girls_districts');

-- ── Verify ────────────────────────────────────────────────────────────────────
-- After running, confirm no girls wrestlers remain aliased to Jefferson.
SELECT wna.wrestler_id, wna.raw_name, w.gender, s.display_name AS school
FROM wrestler_name_aliases wna
JOIN schools s ON s.id = wna.school_id
JOIN wrestlers w ON w.id = wna.wrestler_id
WHERE s.display_name = 'Jefferson'
  AND s.is_nj = true
  AND w.gender = 'F';
-- Should return 0 rows.
