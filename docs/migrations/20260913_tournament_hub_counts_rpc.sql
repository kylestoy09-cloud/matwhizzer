-- Replaces per-row fetching in the tournament hub API with server-side aggregation.
-- The hub was hitting Supabase's 1000-row response cap when fetching individual bout
-- rows, causing all counts to silently return 0 for large tournaments.
-- This RPC aggregates counts in the DB and returns one row per tournament.

CREATE OR REPLACE FUNCTION public.tournament_hub_counts(
  p_tournament_ids uuid[],
  p_gender         text
)
RETURNS TABLE(
  tournament_id    uuid,
  bout_count       bigint,
  participant_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $f$

WITH bout_counts AS (
  SELECT in_season_tournament_id AS tid, COUNT(*)::bigint AS cnt
  FROM   tournament_bouts_girls
  WHERE  in_season_tournament_id = ANY(p_tournament_ids)
    AND  p_gender = 'F'
  GROUP  BY in_season_tournament_id

  UNION ALL

  SELECT in_season_tournament_id AS tid, COUNT(*)::bigint AS cnt
  FROM   tournament_bouts
  WHERE  in_season_tournament_id = ANY(p_tournament_ids)
    AND  p_gender = 'M'
  GROUP  BY in_season_tournament_id
),
participant_counts AS (
  SELECT in_season_tournament_id AS tid, COUNT(*)::bigint AS cnt
  FROM   in_season_tournament_participants_girls
  WHERE  in_season_tournament_id = ANY(p_tournament_ids)
    AND  p_gender = 'F'
  GROUP  BY in_season_tournament_id

  UNION ALL

  SELECT in_season_tournament_id AS tid, COUNT(*)::bigint AS cnt
  FROM   in_season_tournament_participants
  WHERE  in_season_tournament_id = ANY(p_tournament_ids)
    AND  p_gender = 'M'
  GROUP  BY in_season_tournament_id
)
SELECT
  COALESCE(b.tid, p.tid)  AS tournament_id,
  COALESCE(b.cnt, 0)      AS bout_count,
  COALESCE(p.cnt, 0)      AS participant_count
FROM       bout_counts b
FULL OUTER JOIN participant_counts p ON p.tid = b.tid

$f$;

GRANT EXECUTE ON FUNCTION public.tournament_hub_counts(uuid[], text)
  TO anon, authenticated, service_role;
