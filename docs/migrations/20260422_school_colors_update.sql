-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260422_school_colors_update.sql
--
-- Updates header_background for schools with new values from the 2026-04-22
-- mascot CSV ("School Master List.csv") and normalises colour format globally.
--
-- Scope:
--   Part 1 — Set header_background for 32 schools that currently have NULL.
--             Only fires when the column IS NULL to avoid clobbering any
--             value set since the CSV was generated. ID 289 (Cumberland,
--             #DB5B2A) is explicitly excluded.
--   Part 2 — Global normalisation: name strings → canonical hex, bare hex
--             (no leading #) → prefixed hex. Safe to re-run.
--
-- ROLLBACK at bottom of file.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Part 1: NULL → new values ─────────────────────────────────────────────────

UPDATE schools
SET    header_background = v.color
FROM  (VALUES
  (4,   '#FFDF00'),  -- Jefferson
  (41,  '#8F0018'),  -- Dwight Morrow
  (45,  '#CC0022'),  -- Manchester Regional
  (77,  '#FFD700'),  -- Morris Knolls
  (79,  '#FFD700'),  -- Pioneer Academy
  (98,  '#C0C0C0'),  -- Union City
  (128, '#0504C3'),  -- Westfield
  (136, '#6F777B'),  -- South Hunterdon
  (156, '#00824B'),  -- Ridge
  (160, '#034CB2'),  -- Middletown South
  (162, '#C8880A'),  -- North Brunswick
  (172, '#C8880A'),  -- Monroe
  (178, '#C8880A'),  -- Edison
  (186, '#008000'),  -- St. Joseph Metuchen
  (190, '#222222'),  -- Hunterdon Central
  (218, '#00824B'),  -- Brick Township
  (225, '#1B5997'),  -- Shore
  (228, '#034CB2'),  -- Burlington City
  (229, '#C8880A'),  -- Burlington Township
  (230, '#034CB2'),  -- Ewing
  (241, '#034CB2'),  -- Paul VI
  (245, '#00824B'),  -- West Deptford
  (247, '#C8880A'),  -- Central Regional
  (260, '#CC0022'),  -- Kingsway
  (263, '#DD1931'),  -- Rancocas Valley
  (274, '#C8880A'),  -- Seneca
  (279, '#000000'),  -- Egg Harbor
  (293, '#263586'),  -- Pennsville
  (297, '#034CB2'),  -- Hammonton
  (304, '#00824B'),  -- Winslow
  (310, '#CC0022'),  -- Penns Grove
  (385, '#CC0022')   -- Morris Hills-Morris Knolls
) AS v(id, color)
WHERE schools.id = v.id
  AND schools.header_background IS NULL;

-- ── Part 2: Global format normalisation ───────────────────────────────────────
-- Converts any name-string or bare-hex values to canonical #RRGGBB format.
-- These UPDATE statements are no-ops if no rows match.

UPDATE schools SET header_background = '#000000' WHERE header_background ILIKE 'black';
UPDATE schools SET header_background = '#FFFFFF' WHERE header_background ILIKE 'white';
UPDATE schools SET header_background = '#808080' WHERE header_background ILIKE 'gray'
                                                    OR header_background ILIKE 'grey';
UPDATE schools SET header_background = '#0000FF' WHERE header_background ILIKE 'blue';

-- Bare 6-char hex (no leading #) → add prefix
UPDATE schools
SET    header_background = '#' || header_background
WHERE  header_background ~ '^[0-9A-Fa-f]{6}$';

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- Part 1 — restore the 32 schools to NULL:
--
-- BEGIN;
-- UPDATE schools
-- SET    header_background = NULL
-- WHERE  id IN (4,41,45,77,79,98,128,136,156,160,162,172,178,186,190,
--               218,225,228,229,230,241,245,247,260,263,274,279,293,297,
--               304,310,385);
-- COMMIT;
--
-- Part 2 — not reversible without a prior snapshot. These rows had
-- non-canonical values that are not desirable to restore; the normalisation
-- is safe to leave in place permanently.
-- ─────────────────────────────────────────────────────────────────────────────
