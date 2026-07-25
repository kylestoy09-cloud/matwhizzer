-- =============================================================================
-- MIGRATION: 20260722_rewrite_top_postseason_team_scores.sql
-- =============================================================================
-- Rewrites top_postseason_team_scores to key on school_id throughout,
-- eliminating the LEFT JOIN schools ON display_name = c.school that was
-- silently dropping logos for any school whose precomputed_team_scores
-- school_name did not exactly match schools.display_name.
--
-- ROOT CAUSE CHAIN:
--   precomputed_team_scores stores school_name as the raw string from the
--   scoring pipeline (e.g. 'Christian Brothers Academy').  The canonical
--   display_name in schools is 'Christian Brothers'.  The old function
--   grouped all three level CTEs by pts.school_name and derived school_id
--   only at the end via LEFT JOIN schools ON sch.display_name = c.school —
--   a name-equality test that returns NULL for any mismatch.  The page
--   code correctly uses logos.byId.get(school_id), so NULL school_id → no
--   logo.  The school_id column in precomputed_team_scores was never read
--   by this function; every patch to that column was wasted.
--
-- FIX:
--   All three CTEs (district/region/state) now GROUP BY pts.school_id.
--   The combined CTE FULL OUTER JOINs on school_id.  The final SELECT does
--   an INNER JOIN schools ON sch.id = c.school_id to produce canonical
--   display_name and guaranteed non-null school_id in the output.
--
-- PRECONDITION:
--   20260722_patch_precomputed_team_scores_districts.sql must be applied
--   first.  After that migration, precomputed_team_scores has zero NULL
--   school_id rows.  If any remain when this function runs, those schools
--   are silently dropped from the leaderboard (the INNER JOIN excludes
--   them).  Run the guard query below and confirm 0 rows before applying.
--
-- RETURN SIGNATURE — unchanged, no page code updates needed:
--   school          text     — school_id::text; unique React key
--   school_name     text     — schools.display_name; canonical, never NULL
--   school_id       integer  — always non-null after this rewrite
--   district_points numeric  — season district total for this school
--   region_points   numeric  — season region total
--   state_points    numeric  — season state total
--   total_points    numeric  — sum of above three
--
-- SOURCE CONTROL:
--   top_postseason_team_scores previously existed only in the Supabase
--   dashboard — no migration file, no history, which is why the column
--   patch didn't fix logos.  This file is its canonical home going forward.
--   The original body (from pg_get_functiondef) is preserved verbatim in
--   the ROLLBACK section at the bottom of this file.
--
-- APPLY ORDER:
--   1. 20260722_patch_precomputed_team_scores_school_id.sql     (applied)
--   2. 20260722_patch_precomputed_team_scores_districts.sql     (apply first)
--   3. THIS FILE
-- =============================================================================


-- ── PRECONDITION GUARD ───────────────────────────────────────────────────────
-- Run before applying.  Expect 0 rows.  Any row here = school disappears
-- from leaderboard after this migration; apply districts patch first.
--
-- SELECT id, school_name, season_id
-- FROM   precomputed_team_scores
-- WHERE  school_id IS NULL;
-- -- Must return 0 rows before proceeding.


-- ── REWRITE ──────────────────────────────────────────────────────────────────
-- Only three things change from the original function body:
--   1. Each CTE selects pts.school_id instead of pts.school_name
--   2. Each CTE groups by pts.school_id instead of pts.school_name
--   3. combined: FULL OUTER JOINs on school_id instead of school_name
--   4. Final SELECT: JOIN schools ON sch.id instead of LEFT JOIN ON display_name
-- Everything else — the tournaments JOIN, all WHERE clauses, LIMIT — is
-- preserved verbatim from the live function body you retrieved.
--
-- SEASON FILTER: t.season_id = p_season — confirmed from live function body.

BEGIN;

CREATE OR REPLACE FUNCTION public.top_postseason_team_scores(
  p_gender gender_type DEFAULT 'M',
  p_season smallint    DEFAULT 2,
  p_limit  integer     DEFAULT 25
)
RETURNS TABLE(
  school          text,
  school_name     text,
  school_id       integer,
  district_points numeric,
  region_points   numeric,
  state_points    numeric,
  total_points    numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH districts AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS district_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type = 'districts'         -- preserved from live body
      AND  t.gender          = p_gender            -- preserved from live body
      AND  t.season_id       = p_season            -- preserved from live body
      AND  pts.school_id IS NOT NULL               -- guard: NULL rows excluded (currently 0)
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  regions AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS region_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type IN ('regions', 'girls_regions')  -- preserved
      AND  t.gender           = p_gender           -- preserved
      AND  t.season_id        = p_season           -- preserved
      AND  pts.school_id IS NOT NULL
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  state AS (
    SELECT pts.school_id,                          -- was: pts.school_name
           SUM(pts.total_points) AS state_pts
    FROM   precomputed_team_scores pts
    JOIN   tournaments t ON t.id = pts.tournament_id
    WHERE  t.tournament_type IN ('boys_state', 'girls_state')  -- preserved
      AND  t.gender           = p_gender           -- preserved
      AND  t.season_id        = p_season           -- preserved
      AND  pts.school_id IS NOT NULL
    GROUP  BY pts.school_id                        -- was: pts.school_name
  ),
  combined AS (
    SELECT COALESCE(d.school_id, r.school_id, s.school_id) AS school_id,
           COALESCE(d.district_pts, 0)                      AS district_points,
           COALESCE(r.region_pts,   0)                      AS region_points,
           COALESCE(s.state_pts,    0)                      AS state_points,
           COALESCE(d.district_pts, 0)
             + COALESCE(r.region_pts, 0)
             + COALESCE(s.state_pts,  0)                    AS total_points
    FROM            districts d
    FULL OUTER JOIN regions   r ON r.school_id = d.school_id  -- was: school_name
    FULL OUTER JOIN state     s ON s.school_id = COALESCE(d.school_id, r.school_id)
  )
  SELECT sch.id::text     AS school,
         sch.display_name AS school_name,          -- canonical, never NULL
         sch.id           AS school_id,            -- never NULL
         c.district_points,
         c.region_points,
         c.state_points,
         c.total_points
  FROM   combined c
  JOIN   schools sch ON sch.id = c.school_id       -- was: LEFT JOIN ON display_name
  ORDER  BY c.total_points DESC
  LIMIT  p_limit;
END;
$$;

COMMIT;


-- =============================================================================
-- VERIFY — run after applying
-- =============================================================================
--
-- 1. Confirm no NULL school_ids in output for either gender:
--
-- SELECT school_id, school_name, total_points
-- FROM   top_postseason_team_scores('M', 2, 30)
-- WHERE  school_id IS NULL;
-- -- Expect: 0 rows
--
-- SELECT school_id, school_name, total_points
-- FROM   top_postseason_team_scores('F', 2, 30)
-- WHERE  school_id IS NULL;
-- -- Expect: 0 rows
--
-- 2. Spot-check the previously-naked schools (name-mismatch cases):
--
-- SELECT school_id, school_name, district_points, region_points, state_points, total_points
-- FROM   top_postseason_team_scores('M', 2, 30)
-- WHERE  school_id IN (197, 167, 11, 313, 175, 281, 16, 141, 108)
-- ORDER  BY total_points DESC;
-- -- Expect: rows for Christian Brothers (197), St. Peter's Prep (167),
-- --   Don Bosco Prep (11), St. Augustine (313), Rumson-Fair Haven (175),
-- --   Lower Cape May (281), Pascack Valley (16), Delaware Valley (141),
-- --   West Morris (108) — all with non-null school_id and logos will render.
--
-- 3. Confirm totals didn't shift for schools that were already working:
--
-- SELECT school_id, school_name, total_points
-- FROM   top_postseason_team_scores('M', 2, 10)
-- ORDER  BY total_points DESC;
-- -- Delbarton (82) and Bergen Catholic (21) should hold their ranks and
-- -- their total_points should be unchanged from before this migration.


-- =============================================================================
-- ROLLBACK — paste pg_get_functiondef output here
-- =============================================================================
-- To rollback: re-apply the original function body you captured from
-- pg_get_functiondef.  Paste it below and uncomment.  The DROP IF EXISTS
-- targets the same signature so it will replace this version cleanly.
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.top_postseason_team_scores(gender_type, smallint, integer);
-- CREATE OR REPLACE FUNCTION public.top_postseason_team_scores(...)
-- ... [paste original body from pg_get_functiondef here] ...
-- COMMIT;
