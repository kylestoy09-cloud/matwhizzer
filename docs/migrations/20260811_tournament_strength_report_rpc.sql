-- Creates tournament_strength_report RPC.
-- Returns one row per in-season tournament showing how many district champions,
-- region top-4 finishers, and state qualifiers (from the postseason) competed.
--
-- Params:
--   p_season              text     '2024-25'  (in_season_tournaments.season)
--   p_postseason_season_id smallint  1         (tournaments.season_id, 1 = 2024-25)

CREATE OR REPLACE FUNCTION public.tournament_strength_report(
  p_season               text     DEFAULT '2025-26',
  p_postseason_season_id smallint DEFAULT 1
)
RETURNS TABLE(
  tournament_name    text,
  start_date         text,
  district_champs    integer,
  region_top4        integer,
  state_qualifiers   integer,
  total_nj_wrestlers integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $f$

WITH

-- ── Postseason tournament IDs (boys, 2024-25) ─────────────────────────────────
post_tournaments AS (
  SELECT id, tournament_type::text AS tt
  FROM   tournaments
  WHERE  gender    = 'M'
    AND  season_id = p_postseason_season_id
    AND  tournament_type::text IN ('districts', 'regions', 'boys_state')
),

-- ── All postseason entries ────────────────────────────────────────────────────
all_entries AS (
  SELECT te.id AS entry_id, te.wrestler_id, pt.tt
  FROM   tournament_entries te
  JOIN   post_tournaments pt ON pt.id = te.tournament_id
),

-- ── District champions: winner of the Final in a districts tournament ─────────
district_champs AS (
  SELECT DISTINCT ae.wrestler_id
  FROM   all_entries ae
  JOIN   matches m ON m.winner_entry_id = ae.entry_id
  WHERE  ae.tt      = 'districts'
    AND  m.round::text = 'F'
    AND  m.validated   = true
),

-- ── Region top-4: in Final or 3rd-Place match in a regions tournament ─────────
region_top4 AS (
  SELECT DISTINCT ae.wrestler_id
  FROM   all_entries ae
  JOIN   matches m
         ON (m.winner_entry_id = ae.entry_id OR m.loser_entry_id = ae.entry_id)
  WHERE  ae.tt = 'regions'
    AND  m.round::text IN ('F', '3rd_Place')
    AND  m.validated   = true
),

-- ── State qualifiers: anyone with an entry in the state tournament ─────────────
state_quals AS (
  SELECT DISTINCT wrestler_id
  FROM   all_entries
  WHERE  tt = 'boys_state'
),

-- ── In-season tournaments for the target season ───────────────────────────────
in_season AS (
  SELECT id, name, start_date::text
  FROM   in_season_tournaments
  WHERE  season = p_season
),

-- ── Unique NJ wrestlers per in-season tournament (both sides of each bout) ────
tournament_wrestlers AS (
  SELECT tb.in_season_tournament_id AS tid, tb.wrestler1_id AS wrestler_id
  FROM   tournament_bouts tb
  JOIN   in_season ist ON ist.id = tb.in_season_tournament_id
  WHERE  tb.wrestler1_id IS NOT NULL

  UNION

  SELECT tb.in_season_tournament_id, tb.wrestler2_id
  FROM   tournament_bouts tb
  JOIN   in_season ist ON ist.id = tb.in_season_tournament_id
  WHERE  tb.wrestler2_id IS NOT NULL
)

-- ── Final aggregation ─────────────────────────────────────────────────────────
SELECT
  ist.name::text                                                                              AS tournament_name,
  ist.start_date::text                                                                        AS start_date,
  COUNT(DISTINCT CASE WHEN dc.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer       AS district_champs,
  COUNT(DISTINCT CASE WHEN rt.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer       AS region_top4,
  COUNT(DISTINCT CASE WHEN sq.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer       AS state_qualifiers,
  COUNT(DISTINCT tw.wrestler_id)::integer                                                     AS total_nj_wrestlers
FROM      in_season ist
LEFT JOIN tournament_wrestlers tw ON tw.tid = ist.id
LEFT JOIN district_champs dc      ON dc.wrestler_id = tw.wrestler_id
LEFT JOIN region_top4 rt          ON rt.wrestler_id = tw.wrestler_id
LEFT JOIN state_quals sq           ON sq.wrestler_id = tw.wrestler_id
GROUP BY  ist.id, ist.name, ist.start_date
ORDER BY  ist.start_date

$f$;

GRANT EXECUTE ON FUNCTION public.tournament_strength_report(text, smallint) TO anon, authenticated, service_role;

-- Rollback: DROP FUNCTION public.tournament_strength_report(text, smallint);
