-- docs/migrations/20260916_girls_coop_cleanup.sql
--
-- Comprehensive cleanup for girls co-op schools:
--   1. Fix is_combined=false for real co-op programs (3, 206, 381)
--   2. Fix Newton (24): revert display name, fix inactive_school_seasons
--   3. Fix Sparta (26): wrong gender in inactive_school_seasons (M → F)
--   4. Delete 4 artifact combined schools (360, 363, 372, 392) — move
--      girls data to proper primary host schools (287, 267, 4, 18)
--   5. Add primary co-op hosts to girls_schools with correct co-op names
--   6. Mark secondary schools inactive for girls season 2
--   7. Slash → dash display name cleanup in all three name tables

-- ── 1. Fix is_combined for real programs ─────────────────────────────────────

UPDATE schools
  SET is_combined = false
  WHERE id IN (3, 206, 381);

-- Girls tables
UPDATE girls_schools
  SET is_combined = false
  WHERE school_id IN (206, 381);

-- School 3 (Emerson-Park Ridge): permanent 35-year co-op, not an artifact
UPDATE boys_schools
  SET display_name = 'Emerson-Park Ridge', is_combined = false
  WHERE school_id = 3;

UPDATE girls_schools
  SET display_name = 'Emerson-Park Ridge', is_combined = false
  WHERE school_id = 3;

UPDATE schools
  SET display_name = 'Emerson-Park Ridge'
  WHERE id = 3;

-- ── 2. Fix Newton (school 24) ─────────────────────────────────────────────────

UPDATE schools
  SET display_name = 'Newton', is_combined = false
  WHERE id = 24;

UPDATE boys_schools
  SET display_name = 'Newton', is_combined = false
  WHERE school_id = 24;

-- Remove wrong inactive records for Kittatinny (315) added by the 20260826
-- migration — school 315 is an active boys program with 73 tournament entries.
DELETE FROM inactive_school_seasons
  WHERE school_id = 315 AND gender = 'M';

-- ── 3. Fix Sparta (26) inactive_school_seasons ───────────────────────────────
-- 20260826 migration inserted Sparta with no gender (backfilled to 'M').
-- Sparta is inactive only for GIRLS (they join Jefferson for the girls co-op).

DELETE FROM inactive_school_seasons
  WHERE school_id = 26 AND gender = 'M';

INSERT INTO inactive_school_seasons (school_id, season_id, gender)
  VALUES (26, 2, 'F')
  ON CONFLICT (school_id, season_id, gender) DO NOTHING;

-- ── 4. Slash → dash cleanup: confirmed permanent boys co-ops ─────────────────

-- School 76 girls: Morris Hills/Morris Knolls → Morris Hills-Morris Knolls
UPDATE girls_schools
  SET display_name = 'Morris Hills-Morris Knolls'
  WHERE school_id = 76;

-- Permanent boys co-ops in boys_schools and schools
UPDATE boys_schools SET display_name = 'Demarest-Old Tappan'       WHERE school_id = 314;
UPDATE boys_schools SET display_name = 'Lenape Valley-Hopatcong'   WHERE school_id = 62;
UPDATE boys_schools SET display_name = 'Becton-Wood-Ridge'         WHERE school_id = 321;
UPDATE boys_schools SET display_name = 'Leonia-Palisades'          WHERE school_id = 44;
UPDATE boys_schools SET display_name = 'Lyndhurst-North Arlington' WHERE school_id = 83;
UPDATE boys_schools SET display_name = 'Brearley-Dayton'           WHERE school_id = 130;
UPDATE boys_schools SET display_name = 'Middlesex-Dunellen'        WHERE school_id = 383;

UPDATE schools SET display_name = 'Demarest-Old Tappan'       WHERE id = 314;
UPDATE schools SET display_name = 'Lenape Valley-Hopatcong'   WHERE id = 62;
UPDATE schools SET display_name = 'Becton-Wood-Ridge'         WHERE id = 321;
UPDATE schools SET display_name = 'Leonia-Palisades'          WHERE id = 44;
UPDATE schools SET display_name = 'Lyndhurst-North Arlington' WHERE id = 83;
UPDATE schools SET display_name = 'Brearley-Dayton'           WHERE id = 130;
UPDATE schools SET display_name = 'Middlesex-Dunellen'        WHERE id = 383;

-- ── 5. Set up girls_schools for primary co-op hosts ──────────────────────────
-- Schools 4, 287, 267 were not yet in girls_schools.
-- School 18 (Ramsey) is already there but needs the co-op display name.

INSERT INTO girls_schools (school_id, display_name, is_combined)
  VALUES
    (4,   'Jefferson-Sparta',      true),
    (287, 'Buena-Vineland',        true),
    (267, 'Cherry Hill East-West', true)
  ON CONFLICT (school_id) DO UPDATE
    SET display_name = EXCLUDED.display_name,
        is_combined  = EXCLUDED.is_combined;

UPDATE girls_schools
  SET display_name = 'Ramsey-Northern Highlands', is_combined = true
  WHERE school_id = 18;

-- ── 6. Mark secondary schools inactive for girls season 2 ────────────────────
-- School 35 (Northern Highlands) already has inactive F season 2 — skip.
-- School 26 (Sparta) handled in step 3 above.

INSERT INTO inactive_school_seasons (school_id, season_id, gender)
  VALUES
    (294, 2, 'F'),   -- Vineland: girls join Buena (287) co-op
    (268, 2, 'F')    -- Cherry Hill West: girls join Cherry Hill East (267) co-op
  ON CONFLICT (school_id, season_id, gender) DO NOTHING;

-- ── 7. Move girls data: artifact 360 (Buena/Vineland) → 287 (Buena) ─────────

UPDATE dual_meets_girls       SET team1_school_id       = 287 WHERE team1_school_id       = 360;
UPDATE dual_meets_girls       SET team2_school_id       = 287 WHERE team2_school_id       = 360;
UPDATE dual_meet_matches_girls SET school_a_id          = 287 WHERE school_a_id           = 360;
UPDATE dual_meet_matches_girls SET school_b_id          = 287 WHERE school_b_id           = 360;
UPDATE tournament_entries     SET school_id             = 287 WHERE school_id             = 360;
UPDATE tournament_bouts_girls SET wrestler1_school_id   = 287 WHERE wrestler1_school_id   = 360;
UPDATE tournament_bouts_girls SET wrestler2_school_id   = 287 WHERE wrestler2_school_id   = 360;
UPDATE in_season_tournament_participants_girls SET school_id = 287 WHERE school_id        = 360;
UPDATE in_season_tournament_seeds_girls        SET school_id = 287 WHERE school_id        = 360;
UPDATE in_season_tournament_team_scores        SET school_id = 287 WHERE school_id        = 360;
UPDATE in_season_tournaments_girls SET location_school_id = 287 WHERE location_school_id  = 360;
UPDATE wrestler_school_history SET school_id = 287 WHERE school_id = 360;
UPDATE wrestler_name_aliases
  SET school_id = 287
  WHERE school_id = 360
    AND NOT EXISTS (
      SELECT 1 FROM wrestler_name_aliases w2
      WHERE w2.raw_name = wrestler_name_aliases.raw_name AND w2.school_id = 287
    );

-- ── 8. Move girls data: artifact 363 (Cherry Hill East/West) → 267 ───────────

UPDATE dual_meets_girls       SET team1_school_id       = 267 WHERE team1_school_id       = 363;
UPDATE dual_meets_girls       SET team2_school_id       = 267 WHERE team2_school_id       = 363;
UPDATE dual_meet_matches_girls SET school_a_id          = 267 WHERE school_a_id           = 363;
UPDATE dual_meet_matches_girls SET school_b_id          = 267 WHERE school_b_id           = 363;
UPDATE tournament_entries     SET school_id             = 267 WHERE school_id             = 363;
UPDATE tournament_bouts_girls SET wrestler1_school_id   = 267 WHERE wrestler1_school_id   = 363;
UPDATE tournament_bouts_girls SET wrestler2_school_id   = 267 WHERE wrestler2_school_id   = 363;
UPDATE in_season_tournament_participants_girls SET school_id = 267 WHERE school_id        = 363;
UPDATE in_season_tournament_seeds_girls        SET school_id = 267 WHERE school_id        = 363;
UPDATE in_season_tournament_team_scores        SET school_id = 267 WHERE school_id        = 363;
UPDATE in_season_tournaments_girls SET location_school_id = 267 WHERE location_school_id  = 363;
UPDATE wrestler_school_history SET school_id = 267 WHERE school_id = 363;
UPDATE wrestler_name_aliases
  SET school_id = 267
  WHERE school_id = 363
    AND NOT EXISTS (
      SELECT 1 FROM wrestler_name_aliases w2
      WHERE w2.raw_name = wrestler_name_aliases.raw_name AND w2.school_id = 267
    );

-- ── 9. Move girls data: artifact 372 (Jefferson-Sparta) → 4 (Jefferson) ──────

UPDATE dual_meets_girls       SET team1_school_id       = 4  WHERE team1_school_id       = 372;
UPDATE dual_meets_girls       SET team2_school_id       = 4  WHERE team2_school_id       = 372;
UPDATE dual_meet_matches_girls SET school_a_id          = 4  WHERE school_a_id           = 372;
UPDATE dual_meet_matches_girls SET school_b_id          = 4  WHERE school_b_id           = 372;
UPDATE tournament_entries     SET school_id             = 4  WHERE school_id             = 372;
UPDATE tournament_bouts_girls SET wrestler1_school_id   = 4  WHERE wrestler1_school_id   = 372;
UPDATE tournament_bouts_girls SET wrestler2_school_id   = 4  WHERE wrestler2_school_id   = 372;
UPDATE in_season_tournament_participants_girls SET school_id = 4  WHERE school_id        = 372;
UPDATE in_season_tournament_seeds_girls        SET school_id = 4  WHERE school_id        = 372;
UPDATE in_season_tournament_team_scores        SET school_id = 4  WHERE school_id        = 372;
UPDATE in_season_tournaments_girls SET location_school_id = 4  WHERE location_school_id  = 372;
UPDATE wrestler_school_history SET school_id = 4 WHERE school_id = 372;
UPDATE wrestler_name_aliases
  SET school_id = 4
  WHERE school_id = 372
    AND NOT EXISTS (
      SELECT 1 FROM wrestler_name_aliases w2
      WHERE w2.raw_name = wrestler_name_aliases.raw_name AND w2.school_id = 4
    );

-- ── 10. Move girls data: artifact 392 (Ramsey/NH) → 18 (Ramsey) ──────────────

UPDATE dual_meets_girls       SET team1_school_id       = 18 WHERE team1_school_id       = 392;
UPDATE dual_meets_girls       SET team2_school_id       = 18 WHERE team2_school_id       = 392;
UPDATE dual_meet_matches_girls SET school_a_id          = 18 WHERE school_a_id           = 392;
UPDATE dual_meet_matches_girls SET school_b_id          = 18 WHERE school_b_id           = 392;
UPDATE tournament_entries     SET school_id             = 18 WHERE school_id             = 392;
UPDATE tournament_bouts_girls SET wrestler1_school_id   = 18 WHERE wrestler1_school_id   = 392;
UPDATE tournament_bouts_girls SET wrestler2_school_id   = 18 WHERE wrestler2_school_id   = 392;
UPDATE in_season_tournament_participants_girls SET school_id = 18 WHERE school_id        = 392;
UPDATE in_season_tournament_seeds_girls        SET school_id = 18 WHERE school_id        = 392;
UPDATE in_season_tournament_team_scores        SET school_id = 18 WHERE school_id        = 392;
UPDATE in_season_tournaments_girls SET location_school_id = 18 WHERE location_school_id  = 392;
UPDATE wrestler_school_history SET school_id = 18 WHERE school_id = 392;
UPDATE wrestler_name_aliases
  SET school_id = 18
  WHERE school_id = 392
    AND NOT EXISTS (
      SELECT 1 FROM wrestler_name_aliases w2
      WHERE w2.raw_name = wrestler_name_aliases.raw_name AND w2.school_id = 18
    );

-- ── 11. Safety: clear any stray boys-table refs (no-ops if no data) ──────────
-- These artifacts are girls-only co-ops but if any boys-table FK exists the
-- DELETE FROM schools below will fail. Update to the respective primary hosts.

UPDATE dual_meets            SET team1_school_id           = 287 WHERE team1_school_id           = 360;
UPDATE dual_meets            SET team2_school_id           = 287 WHERE team2_school_id           = 360;
UPDATE dual_meet_matches     SET school_a_id               = 287 WHERE school_a_id               = 360;
UPDATE dual_meet_matches     SET school_b_id               = 287 WHERE school_b_id               = 360;
UPDATE tournament_bouts      SET wrestler1_school_id       = 287 WHERE wrestler1_school_id       = 360;
UPDATE tournament_bouts      SET wrestler2_school_id       = 287 WHERE wrestler2_school_id       = 360;
UPDATE tournament_placements SET school_id                 = 287 WHERE school_id                 = 360;
UPDATE in_season_tournament_participants SET school_id     = 287 WHERE school_id                 = 360;
UPDATE in_season_tournament_seeds        SET school_id     = 287 WHERE school_id                 = 360;
UPDATE in_season_tournaments SET location_school_id        = 287 WHERE location_school_id        = 360;
UPDATE pending_wrestler_transfers SET current_school_id    = 287 WHERE current_school_id         = 360;
UPDATE pending_wrestler_transfers SET suspected_school_id  = 287 WHERE suspected_school_id       = 360;

UPDATE dual_meets            SET team1_school_id           = 267 WHERE team1_school_id           = 363;
UPDATE dual_meets            SET team2_school_id           = 267 WHERE team2_school_id           = 363;
UPDATE dual_meet_matches     SET school_a_id               = 267 WHERE school_a_id               = 363;
UPDATE dual_meet_matches     SET school_b_id               = 267 WHERE school_b_id               = 363;
UPDATE tournament_bouts      SET wrestler1_school_id       = 267 WHERE wrestler1_school_id       = 363;
UPDATE tournament_bouts      SET wrestler2_school_id       = 267 WHERE wrestler2_school_id       = 363;
UPDATE tournament_placements SET school_id                 = 267 WHERE school_id                 = 363;
UPDATE in_season_tournament_participants SET school_id     = 267 WHERE school_id                 = 363;
UPDATE in_season_tournament_seeds        SET school_id     = 267 WHERE school_id                 = 363;
UPDATE in_season_tournaments SET location_school_id        = 267 WHERE location_school_id        = 363;
UPDATE pending_wrestler_transfers SET current_school_id    = 267 WHERE current_school_id         = 363;
UPDATE pending_wrestler_transfers SET suspected_school_id  = 267 WHERE suspected_school_id       = 363;

UPDATE dual_meets            SET team1_school_id           = 4   WHERE team1_school_id           = 372;
UPDATE dual_meets            SET team2_school_id           = 4   WHERE team2_school_id           = 372;
UPDATE dual_meet_matches     SET school_a_id               = 4   WHERE school_a_id               = 372;
UPDATE dual_meet_matches     SET school_b_id               = 4   WHERE school_b_id               = 372;
UPDATE tournament_bouts      SET wrestler1_school_id       = 4   WHERE wrestler1_school_id       = 372;
UPDATE tournament_bouts      SET wrestler2_school_id       = 4   WHERE wrestler2_school_id       = 372;
UPDATE tournament_placements SET school_id                 = 4   WHERE school_id                 = 372;
UPDATE in_season_tournament_participants SET school_id     = 4   WHERE school_id                 = 372;
UPDATE in_season_tournament_seeds        SET school_id     = 4   WHERE school_id                 = 372;
UPDATE in_season_tournaments SET location_school_id        = 4   WHERE location_school_id        = 372;
UPDATE pending_wrestler_transfers SET current_school_id    = 4   WHERE current_school_id         = 372;
UPDATE pending_wrestler_transfers SET suspected_school_id  = 4   WHERE suspected_school_id       = 372;

UPDATE dual_meets            SET team1_school_id           = 18  WHERE team1_school_id           = 392;
UPDATE dual_meets            SET team2_school_id           = 18  WHERE team2_school_id           = 392;
UPDATE dual_meet_matches     SET school_a_id               = 18  WHERE school_a_id               = 392;
UPDATE dual_meet_matches     SET school_b_id               = 18  WHERE school_b_id               = 392;
UPDATE tournament_bouts      SET wrestler1_school_id       = 18  WHERE wrestler1_school_id       = 392;
UPDATE tournament_bouts      SET wrestler2_school_id       = 18  WHERE wrestler2_school_id       = 392;
UPDATE tournament_placements SET school_id                 = 18  WHERE school_id                 = 392;
UPDATE in_season_tournament_participants SET school_id     = 18  WHERE school_id                 = 392;
UPDATE in_season_tournament_seeds        SET school_id     = 18  WHERE school_id                 = 392;
UPDATE in_season_tournaments SET location_school_id        = 18  WHERE location_school_id        = 392;
UPDATE pending_wrestler_transfers SET current_school_id    = 18  WHERE current_school_id         = 392;
UPDATE pending_wrestler_transfers SET suspected_school_id  = 18  WHERE suspected_school_id       = 392;

-- ── 12. Remove artifact school rows ──────────────────────────────────────────

DELETE FROM conference_standings   WHERE school_id IN (360, 363, 372, 392);
DELETE FROM girls_schools          WHERE school_id IN (360, 363, 372, 392);
DELETE FROM boys_schools           WHERE school_id IN (360, 363, 372, 392);
DELETE FROM school_names           WHERE school_id IN (360, 363, 372, 392);
DELETE FROM inactive_school_seasons WHERE school_id IN (360, 363, 372, 392);
DELETE FROM school_coops           WHERE coop_school_id   IN (360, 363, 372, 392)
                                      OR member_school_id  IN (360, 363, 372, 392);
DELETE FROM school_aliases         WHERE school_id IN (360, 363, 372, 392);
DELETE FROM confirmed_schools      WHERE school_id IN (360, 363, 372, 392);
DELETE FROM roster_grade_import    WHERE school_id IN (360, 363, 372, 392);
DELETE FROM individual_rankings    WHERE school_id IN (360, 363, 372, 392);
DELETE FROM playoff_seeds          WHERE school_id IN (360, 363, 372, 392);
DELETE FROM precomputed_team_scores WHERE school_id IN (360, 363, 372, 392);
DELETE FROM wrestler_name_aliases  WHERE school_id IN (360, 363, 372, 392);
DELETE FROM schools                WHERE id        IN (360, 363, 372, 392);
