-- MIGRATION: 20260414_create_school_coops.sql
-- DESCRIPTION: Create school_coops table to formally record co-op program membership.
--              Each row links a co-op school record to one of its member schools,
--              with season, gender, and a flag for the primary (host) member.
-- APPLIED: 2026-04-14
--
-- ── TABLE DEFINITION ─────────────────────────────────────────────────────────
--
--   school_coops
--     id               serial primary key
--     coop_school_id   integer references schools(id)   -- the co-op school record
--     member_school_id integer references schools(id)   -- an individual member school
--     season           integer                          -- season_id (1 = 2024-25, 2 = 2025-26)
--     gender           text check ('M','F','B')         -- M=boys, F=girls, B=both
--     is_primary       boolean not null default false   -- true = host/primary school
--
-- ── SEED DATA ─────────────────────────────────────────────────────────────────
--
--   coop_school_id  member_school_id  season  gender  is_primary  co-op name
--   365             364               1       B       true        Cliffside Park/Ridgefield Memorial → Cliffside Park (primary)
--   365             357               1       B       false       Cliffside Park/Ridgefield Memorial → Ridgefield Memorial
--   372             4                 2       F       true        Jefferson-Sparta → Jefferson (primary)
--   372             26                2       F       false       Jefferson-Sparta → Sparta
--   379             55                2       B       true        Lodi/Saddle Brook → Lodi (primary)
--   379             59                2       B       false       Lodi/Saddle Brook → Saddle Brook
--   385             76                2       F       true        Morris Hills-Morris Knolls → Morris Hills (primary)
--   385             77                2       F       false       Morris Hills-Morris Knolls → Morris Knolls
--   392             18                2       F       true        Ramsey/Northern Highlands → Ramsey (primary)
--   392             35                2       F       false       Ramsey/Northern Highlands → Northern Highlands
--
-- ── VERIFICATION (run first) ──────────────────────────────────────────────────
--
-- SELECT s1.display_name AS coop_name, s2.display_name AS member_name,
--        sc.season, sc.gender, sc.is_primary
-- FROM school_coops sc
-- JOIN schools s1 ON s1.id = sc.coop_school_id
-- JOIN schools s2 ON s2.id = sc.member_school_id
-- ORDER BY sc.coop_school_id, sc.is_primary DESC;
-- Expected: 10 rows matching seed data above
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Step 1: Create the table
CREATE TABLE school_coops (
  id               serial primary key,
  coop_school_id   integer references schools(id),
  member_school_id integer references schools(id),
  season           integer,
  gender           text check (gender in ('M', 'F', 'B')),
  is_primary       boolean not null default false
);

-- Step 2: Seed co-op membership rows
INSERT INTO school_coops (coop_school_id, member_school_id, season, gender, is_primary)
VALUES
  -- Cliffside Park/Ridgefield Memorial (season 1, both genders)
  (365, 364, 1, 'B', true),   -- Cliffside Park (primary)
  (365, 357, 1, 'B', false),  -- Ridgefield Memorial

  -- Jefferson-Sparta (season 2, girls)
  (372, 4,   2, 'F', true),   -- Jefferson (primary)
  (372, 26,  2, 'F', false),  -- Sparta

  -- Lodi/Saddle Brook (season 2, both genders)
  (379, 55,  2, 'B', true),   -- Lodi (primary)
  (379, 59,  2, 'B', false),  -- Saddle Brook

  -- Morris Hills-Morris Knolls (season 2, girls)
  (385, 76,  2, 'F', true),   -- Morris Hills (primary)
  (385, 77,  2, 'F', false),  -- Morris Knolls

  -- Ramsey/Northern Highlands (season 2, girls)
  (392, 18,  2, 'F', true),   -- Ramsey (primary)
  (392, 35,  2, 'F', false);  -- Northern Highlands

-- Verify
SELECT COUNT(*) AS total_rows FROM school_coops; -- expect 10

SELECT s1.display_name AS coop_name, s2.display_name AS member_name,
       sc.season, sc.gender, sc.is_primary
FROM school_coops sc
JOIN schools s1 ON s1.id = sc.coop_school_id
JOIN schools s2 ON s2.id = sc.member_school_id
ORDER BY sc.coop_school_id, sc.is_primary DESC;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
-- BEGIN;
-- DROP TABLE school_coops;
-- COMMIT;
