-- Adds p_gender parameter to tournament_strength_report so it returns
-- girls or boys tournaments independently.
-- Must DROP first because the signature changes.
--
-- NOT APPLIED — user reviews and runs manually in the Supabase SQL editor.

DROP FUNCTION IF EXISTS public.tournament_strength_report(text, smallint);
DROP FUNCTION IF EXISTS public.tournament_strength_report(text, smallint, gender_type);

CREATE FUNCTION public.tournament_strength_report(
  p_season               text     DEFAULT '2025-26',
  p_postseason_season_id smallint DEFAULT 1,
  p_gender               text     DEFAULT 'M'
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

-- Postseason tournament IDs for the given gender.
-- Boys:  districts / regions   / boys_state
-- Girls: districts / girls_regions / girls_state
-- Normalize all to generic 'districts', 'regions', 'state' for CTE reuse.
post_tournaments AS (
  SELECT
    id,
    CASE tournament_type::text
      WHEN 'districts'     THEN 'districts'
      WHEN 'regions'       THEN 'regions'
      WHEN 'girls_regions' THEN 'regions'
      WHEN 'boys_state'    THEN 'state'
      WHEN 'girls_state'   THEN 'state'
    END AS tt
  FROM   tournaments
  WHERE  gender    = p_gender::gender_type
    AND  season_id = p_postseason_season_id
    AND  (
      ( p_gender = 'M' AND tournament_type::text IN ('districts', 'regions', 'boys_state') )
      OR
      ( p_gender = 'F' AND tournament_type::text IN ('districts', 'girls_regions', 'girls_state') )
    )
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
  WHERE  tt = 'state'
),

-- Filter in-season tournaments by gender (column is text, p_gender is text — no cast needed)
in_season AS (
  SELECT id, name, start_date::text, point_value
  FROM   in_season_tournaments
  WHERE  season = p_season
    AND  gender = p_gender
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
LEFT JOIN bracket_status bs       ON bs.tid        = ist.id
LEFT JOIN tournament_wrestlers tw ON tw.tid        = ist.id
LEFT JOIN district_champs dc      ON dc.wrestler_id = tw.wrestler_id
LEFT JOIN region_top4 rt          ON rt.wrestler_id = tw.wrestler_id
LEFT JOIN state_quals sq          ON sq.wrestler_id = tw.wrestler_id
GROUP BY  ist.id, ist.name, ist.start_date, ist.point_value,
          bs.has_finals, bs.has_3rd_place, bs.has_5th_place, bs.has_7th_place
ORDER BY  ist.start_date

$f$;

GRANT EXECUTE ON FUNCTION public.tournament_strength_report(text, smallint, text)
  TO anon, authenticated, service_role;

-- Rollback:
--   DROP FUNCTION IF EXISTS public.tournament_strength_report(text, smallint, text);
--   Then re-run 20260811_tournament_point_value.sql to restore the old signature.
