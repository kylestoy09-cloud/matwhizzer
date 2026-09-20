-- docs/migrations/20260920_school_coops_season_rekey_and_grants.sql
--
-- Follow-up to 20260919_rekey_seasons_championship_year.sql.
--
-- school_coops.season holds season IDs (verified 2026-09-20: 1=M, 2=F) but has
-- no FK to seasons, so the re-key skipped it. Remap to championship years and
-- add the FK so future season key changes cascade.
--
-- Also grants service_role/authenticated on school_coops and
-- precomputed_team_scores: the API gets "permission denied" on both today,
-- which is why the school-enrollment route silently found no co-ops.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM school_coops WHERE season NOT BETWEEN 1 AND 3) THEN
    RAISE EXCEPTION 'school_coops.season already holds non-sequence values — check before remapping';
  END IF;

  UPDATE school_coops SET season = season + 2024;   -- 1→2025, 2→2026, 3→2027

  ALTER TABLE school_coops
    ADD CONSTRAINT school_coops_season_fkey
    FOREIGN KEY (season) REFERENCES seasons(id) ON UPDATE CASCADE;
END $$;

GRANT ALL ON public.school_coops            TO postgres, service_role, authenticated;
GRANT ALL ON public.precomputed_team_scores TO postgres, service_role, authenticated;

-- Verify: expect 2025|M|1 and 2026|F|1
SELECT season, gender, count(*) FROM school_coops GROUP BY 1, 2 ORDER BY 1, 2;
