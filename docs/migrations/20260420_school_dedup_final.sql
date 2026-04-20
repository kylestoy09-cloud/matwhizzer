-- =============================================================================
-- MIGRATION: 20260420_school_dedup_final.sql
-- =============================================================================
-- Five changes after 6 prior dedup batches:
--   1. Merge school 300 (Saint Joseph's Academy, Hammonton) → 356 (St. Joseph's (Hammonton))
--   2. Delete orphan 358 (Roselle) — real profile, zero tournament entries
--   3. Rename display_name: 94 → 'Hoboken'
--   4. Rename display_name: 99 → 'Weehawken'
--   5. Rename display_name: 124 → 'Hillside'
--
-- POST-RUN: Rerun update_team_scoring.py for tournament_id 123 to refresh
-- precomputed_team_scores for the 8 re-pointed St. Joseph's entries.
--
-- REGION NOTE: School 300 was in Region 8 (boys); school 356 is in Region 7 (boys).
-- Region 8 link dropped — confirmed artifact from when school 300 had no district
-- assignment. School 356 stays on Region 7 as canonical.
-- =============================================================================

BEGIN;

-- ── 1. MERGE school 300 → 356 ─────────────────────────────────────────────────

-- 8 tournament entries, all in tournament 123
UPDATE tournament_entries
SET school_id = 356
WHERE school_id = 300;

-- 1 alias row (alias_id 326, 'Saint Joseph?s Academy' — corrupted apostrophe
-- is a pre-existing PDF import artifact, left as-is)
UPDATE school_aliases
SET school_id = 356
WHERE school_id = 300;

-- 1 school_names row (abbreviation 'STJA')
UPDATE school_names
SET school_id = 356
WHERE school_id = 300;

-- school_regions: drop 300's Region 8 link — confirmed import artifact.
-- School 356 keeps its existing Region 7 assignment.
DELETE FROM school_regions
WHERE school_id = 300;

-- Drop precomputed scores for 300 — recompute via update_team_scoring.py after
DELETE FROM precomputed_team_scores
WHERE school_id = 300;

DELETE FROM schools WHERE id = 300;

-- ── 2. DELETE orphan 358 (Roselle) ────────────────────────────────────────────

-- 1 conference_standings row (Mountain division, season 2, 3W-14L)
DELETE FROM conference_standings WHERE school_id = 358;

-- 1 school_districts row (District 16)
DELETE FROM school_districts WHERE school_id = 358;

DELETE FROM schools WHERE id = 358;

-- ── 3–5. Rename HS-suffix display_names ───────────────────────────────────────

UPDATE schools SET display_name = 'Hoboken'   WHERE id = 94;
UPDATE schools SET display_name = 'Weehawken' WHERE id = 99;
UPDATE schools SET display_name = 'Hillside'  WHERE id = 124;

COMMIT;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
--
-- -- Restore display_names
-- UPDATE schools SET display_name = 'Hoboken High School'   WHERE id = 94;
-- UPDATE schools SET display_name = 'Weehawken High School' WHERE id = 99;
-- UPDATE schools SET display_name = 'Hillside High School'  WHERE id = 124;
--
-- -- Restore school 358 (Roselle)
-- INSERT INTO schools (id, display_name, short_name, is_combined, section, classification,
--   mascot, primary_color, secondary_color, tertiary_color, nickname, town, county,
--   founded_year, website_url, athletic_conference, twitter_handle, logo_url)
-- VALUES (358, 'Roselle', NULL, false, 'North II', '2', 'Rams', '#CC0022', '#454444',
--   NULL, NULL, 'Roselle', 'Union', NULL,
--   'https://www.roselleschools.org/achs',
--   'union-county-interscholastic-athletic-conference', NULL, NULL);
--
-- INSERT INTO school_districts (school_id, district_id) VALUES (358, 16);
--
-- INSERT INTO conference_standings
--   (id, conference_slug, division, school_id, school_name, season_id,
--    overall_wins, overall_losses, div_wins, div_losses, pf, pa)
-- VALUES (895, 'union-county-interscholastic-athletic-conference', 'Mountain', 358,
--   'Roselle', 2, 3, 14, 0, 7, 349, 930);
--
-- -- Restore school 300 (Saint Joseph's Academy)
-- INSERT INTO schools (id, display_name, short_name, is_combined, section, classification,
--   mascot, primary_color, secondary_color, tertiary_color, nickname, town, county,
--   founded_year, website_url, athletic_conference, twitter_handle, logo_url)
-- VALUES (300, 'Saint Joseph''s Academy', NULL, false, NULL, NULL, 'Wildcats', NULL,
--   NULL, NULL, 'SJA', 'Hammonton', 'Atlantic', 2020,
--   'https://www.stjosephacademy.com', 'Cape-Atlantic League',
--   '@SJA_HammontonNJ', NULL);
--
-- INSERT INTO school_regions (school_id, region_id) VALUES (300, 8);
--
-- INSERT INTO precomputed_team_scores
--   (id, tournament_id, school_name, total_points, season_id, tournament_type, school_id)
-- VALUES (291, 123, 'Saint Joseph?s Academy', 6.0, 1, 'boys_districts', 300);
--
-- UPDATE school_names    SET school_id = 300 WHERE school_id = 356 AND abbreviation = 'STJA';
-- UPDATE school_aliases  SET school_id = 300 WHERE id = 326;
--
-- UPDATE tournament_entries SET school_id = 300 WHERE id IN (
--   '08467f03-1e44-4fb3-84c4-1536cdd7c305',
--   '0ba586f7-966a-48c0-93f3-d73dbd1a3476',
--   '6b19040b-3678-469a-bbbc-ccb6d5a80684',
--   'a0503ed8-47ea-4728-933e-9739ac7bcdf4',
--   'a5c0340b-3650-4377-acff-dd3efe4f5f06',
--   'b17397e0-c496-4d8d-a29e-f5d38ae89397',
--   'c598b3f6-f534-49f5-a745-8b23fc9927da',
--   'cf060ca8-69e6-45d4-b22c-eef3164eab18'
-- );
--
-- COMMIT;
