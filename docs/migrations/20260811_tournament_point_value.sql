-- Adds point_value to in_season_tournaments for Hammer Score calculation.
-- Also rebuilds tournament_strength_report RPC to include tournament_id,
-- point_value, and bracket completeness flags (has_finals, has_3rd_place,
-- has_5th_place, has_7th_place) so the admin UI can show both strength data
-- and placement coverage in one call.
--
-- Must DROP the old function first because the return type changes.

-- ── 1. Add point_value column ─────────────────────────────────────────────────
ALTER TABLE in_season_tournaments
  ADD COLUMN IF NOT EXISTS point_value smallint
    CHECK (point_value IN (1, 5, 10, 15, 20));

-- ── 2. Rebuild RPC ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.tournament_strength_report(text, smallint);

CREATE FUNCTION public.tournament_strength_report(
  p_season               text     DEFAULT '2025-26',
  p_postseason_season_id smallint DEFAULT 1
)
RETURNS TABLE(
  tournament_id      uuid,
  tournament_name    text,
  start_date         text,
  point_value        smallint,
  has_finals         boolean,
  has_3rd_place      boolean,
  has_5th_place      boolean,
  has_7th_place      boolean,
  district_champs    integer,
  region_top4        integer,
  state_qualifiers   integer,
  total_nj_wrestlers integer
)
LANGUAGE sql STABLE SECURITY DEFINER AS $f$

WITH

post_tournaments AS (
  SELECT id, tournament_type::text AS tt
  FROM   tournaments
  WHERE  gender    = 'M'
    AND  season_id = p_postseason_season_id
    AND  tournament_type::text IN ('districts', 'regions', 'boys_state')
),

all_entries AS (
  SELECT te.id AS entry_id, te.wrestler_id, pt.tt
  FROM   tournament_entries te
  JOIN   post_tournaments pt ON pt.id = te.tournament_id
),

district_champs AS (
  SELECT DISTINCT ae.wrestler_id
  FROM   all_entries ae
  JOIN   matches m ON m.winner_entry_id = ae.entry_id
  WHERE  ae.tt         = 'districts'
    AND  m.round::text = 'F'
    AND  m.validated   = true
),

region_top4 AS (
  SELECT DISTINCT ae.wrestler_id
  FROM   all_entries ae
  JOIN   matches m
         ON (m.winner_entry_id = ae.entry_id OR m.loser_entry_id = ae.entry_id)
  WHERE  ae.tt = 'regions'
    AND  m.round::text IN ('F', '3rd_Place')
    AND  m.validated   = true
),

state_quals AS (
  SELECT DISTINCT wrestler_id
  FROM   all_entries
  WHERE  tt = 'boys_state'
),

in_season AS (
  SELECT id, name, start_date::text, point_value
  FROM   in_season_tournaments
  WHERE  season = p_season
),

bracket_status AS (
  SELECT
    in_season_tournament_id                    AS tid,
    bool_or(round = 'Finals')                  AS has_finals,
    bool_or(round = '3rd Place')               AS has_3rd_place,
    bool_or(round = '5th Place')               AS has_5th_place,
    bool_or(round = '7th Place')               AS has_7th_place
  FROM tournament_bouts
  GROUP BY in_season_tournament_id
),

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

SELECT
  ist.id                                                                                        AS tournament_id,
  ist.name::text                                                                                AS tournament_name,
  ist.start_date::text                                                                          AS start_date,
  ist.point_value                                                                               AS point_value,
  COALESCE(bs.has_finals,    false)                                                            AS has_finals,
  COALESCE(bs.has_3rd_place, false)                                                            AS has_3rd_place,
  COALESCE(bs.has_5th_place, false)                                                            AS has_5th_place,
  COALESCE(bs.has_7th_place, false)                                                            AS has_7th_place,
  COUNT(DISTINCT CASE WHEN dc.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer        AS district_champs,
  COUNT(DISTINCT CASE WHEN rt.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer        AS region_top4,
  COUNT(DISTINCT CASE WHEN sq.wrestler_id IS NOT NULL THEN tw.wrestler_id END)::integer        AS state_qualifiers,
  COUNT(DISTINCT tw.wrestler_id)::integer                                                      AS total_nj_wrestlers
FROM      in_season ist
LEFT JOIN bracket_status bs     ON bs.tid         = ist.id
LEFT JOIN tournament_wrestlers tw ON tw.tid        = ist.id
LEFT JOIN district_champs dc    ON dc.wrestler_id  = tw.wrestler_id
LEFT JOIN region_top4 rt        ON rt.wrestler_id  = tw.wrestler_id
LEFT JOIN state_quals sq        ON sq.wrestler_id  = tw.wrestler_id
GROUP BY  ist.id, ist.name, ist.start_date, ist.point_value,
          bs.has_finals, bs.has_3rd_place, bs.has_5th_place, bs.has_7th_place
ORDER BY  ist.start_date

$f$;

GRANT EXECUTE ON FUNCTION public.tournament_strength_report(text, smallint)
  TO anon, authenticated, service_role;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.tournament_strength_report(text, smallint);
--   ALTER TABLE in_season_tournaments DROP COLUMN IF EXISTS point_value;
