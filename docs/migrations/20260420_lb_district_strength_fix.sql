-- =============================================================================
-- MIGRATION: 20260420_lb_district_strength_fix.sql
-- =============================================================================
-- PARTIAL FIX — girls score lookup unblocked for districts.
--
-- OUTSTANDING: Full girls_districts enum rename is still planned as a separate
-- changeset. That work requires:
--   1. Adding 'girls_districts' to the tournament_type enum
--   2. UPDATE tournaments SET tournament_type = 'girls_districts'
--      WHERE gender = 'F' AND tournament_type = 'districts'  (12 rows)
--   3. Updating 6 RPCs: top_postseason_team_scores, district_team_score,
--      top_district_team_scores, girls_region_team_score,
--      lb_district_strength (again), lb_school_depth
--   4. Rerunning update_team_scoring.py for those 12 tournaments to refresh
--      precomputed_team_scores
-- Do not run update_rpcs.py until that changeset is complete — see note below.
--
-- WHAT THIS FIXES:
-- lb_district_strength was deployed with a base_tt CTE that routed girls
-- (gender = 'F') to tournament_type = 'girls_regions' instead of 'districts'.
-- This caused girls district wrestlers to return zero rows, breaking the girls
-- postseason score leaderboard. The fix removes the CASE WHEN routing and
-- filters directly on tournament_type = 'districts' AND gender = p_gender,
-- consistent with how all other district-aware RPCs handle gender.
--
-- A secondary bug in the same function: adv_types for girls was missing
-- 'girls_regions' (only had 'girls_state'), so girls wrestlers who advanced
-- to regions were not counted as advancers. Fixed in the same pass.
--
-- NOTE ON update_rpcs.py: The buggy version of this function still lives in
-- update_rpcs.py (the lb_district_strength block). That file has been updated
-- in this commit to match the correct version below. Do not run update_rpcs.py
-- from an older checkout — it will overwrite this fix.
--
-- STATUS: Live DB was already patched manually prior to this migration.
-- This file documents that state, makes the fix re-applicable and rollback-safe.
-- Applied: 2026-04-20
-- =============================================================================


-- ── APPLY ────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.lb_district_strength(
  p_gender gender_type DEFAULT 'M'::gender_type,
  p_season smallint DEFAULT 2
)
RETURNS TABLE(district_name text, wrestlers_advancing bigint, state_qualifiers bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $function$
  WITH district_wrestlers AS (
    SELECT DISTINCT te.wrestler_id, t.name AS district_name
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id AND t.season_id = p_season
      AND t.tournament_type = 'districts' AND t.gender = p_gender
    JOIN wrestler_completeness wc ON wc.wrestler_id = te.wrestler_id AND wc.passes_general
  ),
  adv_types AS (
    SELECT CASE p_gender
      WHEN 'M' THEN ARRAY['regions','boys_state']::tournament_type[]
      ELSE ARRAY['girls_regions','girls_state']::tournament_type[]
    END AS types
  ),
  state_types AS (
    SELECT CASE p_gender
      WHEN 'M' THEN ARRAY['boys_state']::tournament_type[]
      ELSE ARRAY['girls_state']::tournament_type[]
    END AS types
  ),
  advancers AS (
    SELECT DISTINCT dw.district_name, dw.wrestler_id
    FROM district_wrestlers dw
    WHERE EXISTS (
      SELECT 1 FROM tournament_entries te2
      JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
      CROSS JOIN adv_types
      WHERE te2.wrestler_id = dw.wrestler_id AND t2.tournament_type = ANY(adv_types.types)
    )
  ),
  state_quals AS (
    SELECT DISTINCT dw.district_name, dw.wrestler_id
    FROM district_wrestlers dw
    WHERE EXISTS (
      SELECT 1 FROM tournament_entries te2
      JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
      CROSS JOIN state_types
      WHERE te2.wrestler_id = dw.wrestler_id AND t2.tournament_type = ANY(state_types.types)
    )
  )
  SELECT
    regexp_replace(a.district_name, E'^Boy_s Districts |^Girl_s Districts ', ''),
    count(DISTINCT a.wrestler_id)::bigint,
    count(DISTINCT sq.wrestler_id)::bigint
  FROM advancers a
  LEFT JOIN state_quals sq ON sq.district_name = a.district_name AND sq.wrestler_id = a.wrestler_id
  GROUP BY a.district_name
  ORDER BY count(DISTINCT a.wrestler_id) DESC LIMIT 12;
$function$;


-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- WARNING: Restores the broken version. Girls score lookups will return zero
-- rows after applying this rollback. Only use if reverting intentionally.

-- CREATE OR REPLACE FUNCTION public.lb_district_strength(
--   p_gender gender_type DEFAULT 'M'
-- )
-- RETURNS TABLE(district_name text, wrestlers_advancing bigint, state_qualifiers bigint)
-- LANGUAGE sql STABLE SECURITY DEFINER AS $f$
--   WITH base_tt AS (
--     SELECT CASE p_gender WHEN 'M' THEN 'districts'::tournament_type
--                          ELSE 'girls_regions'::tournament_type END AS tt
--   ),
--   district_wrestlers AS (
--     SELECT DISTINCT te.wrestler_id, t.name AS district_name
--     FROM tournament_entries te
--     JOIN tournaments t ON t.id = te.tournament_id
--     JOIN base_tt ON t.tournament_type = base_tt.tt
--     JOIN wrestler_completeness wc ON wc.wrestler_id = te.wrestler_id AND wc.passes_general
--   ),
--   adv_types AS (
--     SELECT CASE p_gender WHEN 'M' THEN ARRAY['regions','boys_state']::tournament_type[]
--                          ELSE ARRAY['girls_state']::tournament_type[] END AS types
--   ),
--   state_types AS (
--     SELECT CASE p_gender WHEN 'M' THEN ARRAY['boys_state']::tournament_type[]
--                          ELSE ARRAY['girls_state']::tournament_type[] END AS types
--   ),
--   advancers AS (
--     SELECT DISTINCT dw.district_name, dw.wrestler_id
--     FROM district_wrestlers dw
--     WHERE EXISTS (
--       SELECT 1 FROM tournament_entries te2
--       JOIN tournaments t2 ON t2.id = te2.tournament_id
--       CROSS JOIN adv_types
--       WHERE te2.wrestler_id = dw.wrestler_id AND t2.tournament_type = ANY(adv_types.types)
--     )
--   ),
--   state_quals AS (
--     SELECT DISTINCT dw.district_name, dw.wrestler_id
--     FROM district_wrestlers dw
--     WHERE EXISTS (
--       SELECT 1 FROM tournament_entries te2
--       JOIN tournaments t2 ON t2.id = te2.tournament_id
--       CROSS JOIN state_types
--       WHERE te2.wrestler_id = dw.wrestler_id AND t2.tournament_type = ANY(state_types.types)
--     )
--   )
--   SELECT
--     regexp_replace(a.district_name, E'^Boy_s Districts |^Girl_s Districts |^Girl_s Regions ', ''),
--     count(DISTINCT a.wrestler_id)::bigint,
--     count(DISTINCT sq.wrestler_id)::bigint
--   FROM advancers a
--   LEFT JOIN state_quals sq ON sq.district_name = a.district_name AND sq.wrestler_id = a.wrestler_id
--   GROUP BY a.district_name
--   ORDER BY count(DISTINCT a.wrestler_id) DESC LIMIT 12;
-- $f$;
