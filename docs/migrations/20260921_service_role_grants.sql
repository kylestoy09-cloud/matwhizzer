-- docs/migrations/20260921_service_role_grants.sql
--
-- 33 public tables/views return "permission denied" (403) to the service_role key,
-- found by probing every PostgREST endpoint on 2026-09-21. Server code using
-- createSupabaseAdmin() on these tables fails silently, e.g. the hammer score formula
-- config editor could not load/save, and every hammer recalculation fell back to the
-- hardcoded default formula.
--
-- service_role is the server-only admin key (bypasses RLS by design). This grants it
-- access; anon/authenticated privileges are NOT changed.
--
-- Run in the Supabase SQL editor.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_season_config',
    'admin_build_health_tasks',
    'snapshot_team_season_highs_girls',
    'confirmed_districts',
    'hs_offseason_placements',
    'admin_chat_polls',
    'wrestler_school_history',
    'wrestler_completeness',
    'ms_placements',
    'alias_flags',
    'help_desk_tickets',
    'hs_offseason_tournaments',
    'coaches',
    'school_districts',
    'admin_chat_messages',
    'ms_tournament_tiers',
    'districts',
    'snapshot_team_season_highs',
    'school_names',
    'admin_tasks',
    'bracket_picks',
    'fan_scores',
    'placements',
    'hammer_score_config',
    'nonnjsiaa_clubs',
    'ms_wrestlers',
    'regions',
    'confirmed_schools',
    'ms_tournaments',
    'admin_chat_poll_votes',
    'users',
    'girls_schools',
    'school_regions'
  ]
  LOOP
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- Reverse: REVOKE ALL ON public.<table> FROM service_role; for each table above.

-- ── One-time: carry the 2025-26 hammer score formula forward to 2026-27 ──────
-- Finalize Season now does this automatically for future rollovers; 2026-27 was
-- created before that existed. Only inserts where 2026-27 has no active row.
INSERT INTO hammer_score_config (season, gender, name, config, is_active)
SELECT '2026-27', c.gender, c.name, c.config, true
FROM hammer_score_config c
WHERE c.season = '2025-26' AND c.is_active
  AND NOT EXISTS (
    SELECT 1 FROM hammer_score_config n
    WHERE n.season = '2026-27' AND n.gender = c.gender AND n.is_active
  );

-- Check:
-- SELECT season, gender, name, is_active FROM hammer_score_config ORDER BY season, gender;
