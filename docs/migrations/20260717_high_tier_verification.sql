-- HIGH TIER SCHOOL ID MIGRATION — POST-APPLY VERIFICATION
-- Run each block after applying 20260717_high_tier_school_id_migration.sql
-- All function calls include explicit type casts to avoid overload ambiguity.
-- Expected: zero rows with NULL school_id; zero duplicate rows per function.

-- ===========================================================================
-- DISTRICT FUNCTIONS
-- ===========================================================================

-- district_bonus_pct: expect school_id non-null, no dupes per wrestler
SELECT 'district_bonus_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.district_bonus_pct(1, 'M'::gender_type, 2::smallint);

-- district_dominance: expect school_id non-null
SELECT 'district_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.district_dominance(1, 'M'::gender_type, 2::smallint);

-- district_mat_time: expect school_id non-null
SELECT 'district_mat_time' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.district_mat_time(1, 'M'::gender_type, 2::smallint);

-- district_wrestler_points: expect school_id non-null
SELECT 'district_wrestler_points' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.district_wrestler_points(1, 'M'::gender_type, 2::smallint);

-- ===========================================================================
-- REGION FUNCTIONS
-- ===========================================================================

SELECT 'region_bonus_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.region_bonus_pct(1::smallint, 'M'::gender_type, 2::smallint);

SELECT 'region_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.region_dominance(1::smallint, 'M'::gender_type, 2::smallint);

SELECT 'region_mat_time' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.region_mat_time(1::smallint, 'M'::gender_type, 2::smallint);

SELECT 'region_postseason_pts' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.region_postseason_pts(1::smallint, 'M'::gender_type, 2::smallint);

SELECT 'region_team_pts' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.region_team_pts(1::smallint, 'M'::gender_type, 2::smallint);

-- ===========================================================================
-- STATE FUNCTIONS
-- ===========================================================================

SELECT 'state_bonus_pct (season-aware)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.state_bonus_pct('M'::gender_type, 2::smallint);

SELECT 'state_bonus_pct (legacy)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.state_bonus_pct('M'::gender_type);

SELECT 'state_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.state_dominance('M'::gender_type, 2::smallint);

SELECT 'state_mat_time (season-aware)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.state_mat_time('M'::gender_type, 2::smallint);

SELECT 'state_mat_time (legacy)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.state_mat_time('M'::gender_type);

SELECT 'state_team_pts' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.state_team_pts('M'::gender_type, 2::smallint);

-- ===========================================================================
-- GIRLS REGION FUNCTIONS
-- ===========================================================================

SELECT 'girls_region_bonus_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.girls_region_bonus_pct(1::smallint, 2::smallint);

SELECT 'girls_region_dominance (integer)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.girls_region_dominance(1::integer, 2::smallint);

SELECT 'girls_region_mat_time (integer)' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.girls_region_mat_time(1::integer, 2::smallint);

SELECT 'girls_region_team_pts' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.girls_region_team_pts(1::smallint, 2::smallint);

-- ===========================================================================
-- GLOBAL LEADERBOARD FUNCTIONS
-- ===========================================================================

SELECT 'lb_bonus_wins' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_bonus_wins('M'::gender_type, 2::smallint);

SELECT 'lb_comebacks' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_comebacks('M'::gender_type, 2::smallint);

SELECT 'lb_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_dominance('M'::gender_type, 2::smallint);

SELECT 'lb_fastest_pin' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.lb_fastest_pin('M'::gender_type, 2::smallint);

SELECT 'lb_most_md' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_most_md('M'::gender_type, 2::smallint);

SELECT 'lb_most_pins' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_most_pins('M'::gender_type, 2::smallint);

SELECT 'lb_most_techfalls' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_most_techfalls('M'::gender_type, 2::smallint);

SELECT 'lb_school_depth' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT school_id) AS dup_schools
FROM public.lb_school_depth('M'::gender_type, 2::smallint);

SELECT 'lb_technical_masters' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_technical_masters('M'::gender_type, 2::smallint);

SELECT 'lb_win_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_win_pct('M'::gender_type, 2::smallint);

SELECT 'lb_revenge_matches (avenger)' AS fn,
  COUNT(*) FILTER (WHERE avenger_school_id IS NULL) AS null_avenger_school,
  COUNT(*) FILTER (WHERE opponent_school_id IS NULL) AS null_opponent_school
FROM public.lb_revenge_matches('M'::gender_type, 2::smallint);

-- ===========================================================================
-- GIRLS GRAND PRIX (GP) LEADERBOARD FUNCTIONS
-- ===========================================================================

SELECT 'lb_gp_bonus_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_bonus_pct('state'::text, 2::smallint);

SELECT 'lb_gp_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_dominance('state'::text, 2::smallint);

SELECT 'lb_gp_fastest_pin' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.lb_gp_fastest_pin('state'::text, 2::smallint);

SELECT 'lb_gp_fastest_tf' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.lb_gp_fastest_tf('state'::text, 2::smallint);

SELECT 'lb_gp_mat_time' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_mat_time('state'::text, 2::smallint);

SELECT 'lb_gp_most_bonus' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_most_bonus('state'::text, 2::smallint);

SELECT 'lb_gp_most_pins' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_most_pins('state'::text, 2::smallint);

SELECT 'lb_gp_most_tf' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_most_tf('state'::text, 2::smallint);

SELECT 'lb_gp_wrestler_points' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_gp_wrestler_points('state'::text, 2::smallint);

-- ===========================================================================
-- BOYS POSTSEASON LEADERBOARD FUNCTIONS
-- ===========================================================================

SELECT 'lb_p_bonus_pct' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_bonus_pct('M'::gender_type, 'state'::text, 2::smallint);

SELECT 'lb_p_dominance' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_dominance('M'::gender_type, 'state'::text, 2::smallint);

SELECT 'lb_p_fastest_pin' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.lb_p_fastest_pin('M'::gender_type, 'state'::text, 2::smallint);

SELECT 'lb_p_fastest_tf' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) AS rows
FROM public.lb_p_fastest_tf('M'::gender_type, 'state'::text, 2::smallint);

SELECT 'lb_p_mat_time' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_mat_time('M'::gender_type, 'state'::text, 2::smallint);

SELECT 'lb_p_most_bonus' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_most_bonus('M'::gender_type, 'state'::text, 2::smallint);

-- NOTE: lb_p_most_pins and lb_p_most_tf take p_gender TEXT, not gender_type
SELECT 'lb_p_most_pins' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_most_pins('M'::text, 'state'::text, 2::smallint);

SELECT 'lb_p_most_tf' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_most_tf('M'::text, 'state'::text, 2::smallint);

SELECT 'lb_p_wrestler_points' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT wrestler_id) AS dup_wrestlers
FROM public.lb_p_wrestler_points('M'::gender_type, 'state'::text, 2::smallint);

-- ===========================================================================
-- OTHER
-- ===========================================================================

SELECT 'top_active_schools' AS fn,
  COUNT(*) FILTER (WHERE school_id IS NULL) AS null_school,
  COUNT(*) - COUNT(DISTINCT school_id) AS dup_schools
FROM public.top_active_schools('M'::gender_type, 2::smallint, 20::integer);

-- ===========================================================================
-- SMOKE TEST: school names should be real school display_names (not raw abbrevs)
-- Spot-check a few functions — should return known full school names
-- ===========================================================================

SELECT 'spot_check_lb_dominance_schools' AS check,
  school, school_name, school_id
FROM public.lb_dominance('M'::gender_type, 2::smallint)
WHERE school IS NOT NULL
LIMIT 5;

SELECT 'spot_check_state_bonus_pct_schools' AS check,
  school, school_name, school_id
FROM public.state_bonus_pct('M'::gender_type, 2::smallint)
WHERE school IS NOT NULL
LIMIT 5;

SELECT 'spot_check_lb_p_wrestler_points_schools' AS check,
  school, school_name, school_id
FROM public.lb_p_wrestler_points('M'::gender_type, 'state'::text, 2::smallint)
WHERE school IS NOT NULL
LIMIT 5;

-- Confirm old text-overload functions are gone (each should error "does not exist")
-- Run these individually after the migration:
--   SELECT public.school_leaderboard('DELPB', 2::smallint);      -- should ERROR
--   SELECT public.school_wrestlers('DELPB', 2::smallint);         -- should ERROR
--   SELECT public.school_points_breakdown('DELPB', 2::smallint);  -- should ERROR
--   SELECT public.girls_school_wrestlers('DELPB', 2::smallint);   -- should ERROR
