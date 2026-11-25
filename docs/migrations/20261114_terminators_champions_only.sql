-- docs/migrations/20261114_terminators_champions_only.sql
--
-- "The Terminators" (least total postseason mat time) — Kyle 2026-11-14: "some leaders for the state page have 3 wins,
-- they shouldn't be listed that deep into the playoffs with only 3 wins". The boards ranked every wrestler who was
-- unbeaten (forfeit losses ignored) with 3+ wins, so someone who won 3 district bouts and then medical-forfeited out
-- topped the state board (2025-26: Anthony Jackson, 3 wins, 1:47) above real champions (Jayden James, 11 wins).
-- Now a Terminator is a CHAMPION of the board's level — state champions on the state board, region champions on a
-- region page, district champions on a district page — unbeaten on the way (forfeits aside), ranked by mat time.
-- Same five functions, only the champion filter added (girls_region_mat_time also stops counting losses as 6:00 bouts
-- with a 5-bout minimum: it now ranks undefeated region champions like the others). Run in the Supabase SQL editor.

BEGIN;


CREATE OR REPLACE FUNCTION public.lb_p_mat_time(p_gender gender_type, p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = p_gender AND season_id = p_season AND (
      (p_pool = 'district' AND name LIKE 'Boy_s Districts%') OR
      (p_pool = 'region'   AND (name LIKE 'Boy_s Districts%' OR name LIKE 'Boy_s Regions%')) OR
      (p_pool = 'state'    AND name LIKE 'Boy_s%')
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = p_gender
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type IN ('regions','girls_regions') THEN 0 ELSE 1 END
  ),
  champs AS (   -- the board's level: state / region / district champions
    SELECT DISTINCT te.wrestler_id AS cid
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE t.gender = p_gender AND t.season_id = p_season AND m.validated = true
      AND m.round = 'F' AND m.bracket_side = 'championship'
      AND ((p_pool = 'state' AND t.tournament_type IN ('boys_state', 'girls_state'))
        OR (p_pool = 'region' AND t.tournament_type IN ('regions', 'girls_regions'))
        OR (p_pool IN ('district', 'districts') AND t.tournament_type = 'districts'))
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
      AND te.wrestler_id IN (SELECT cid FROM champs)
  ),
  agg AS (
    SELECT wins.wid, wins.school_id, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lb_gp_mat_time(p_pool text, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  pool_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season AND (
      (p_pool = 'region'    AND (name LIKE 'Girl_s Districts%' OR name LIKE 'Girl_s Regions%')) OR
      (p_pool = 'state'     AND name LIKE 'Girl_s%') OR
      (p_pool = 'districts' AND tournament_type = 'districts'::tournament_type)
    )
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season AND t2.gender = 'F'
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'girls_regions' THEN 0 ELSE 1 END
  ),
  champs AS (   -- the board's level: state / region / district champions
    SELECT DISTINCT te.wrestler_id AS cid
    FROM matches m JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE t.gender = 'F' AND t.season_id = p_season AND m.validated = true
      AND m.round = 'F' AND m.bracket_side = 'championship'
      AND ((p_pool = 'state' AND t.tournament_type IN ('boys_state', 'girls_state'))
        OR (p_pool = 'region' AND t.tournament_type IN ('regions', 'girls_regions'))
        OR (p_pool IN ('district', 'districts') AND t.tournament_type = 'districts'))
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      COALESCE(te.school_id, sl.school_id) AS school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN pool_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    LEFT JOIN school_lookup sl ON sl.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
      AND te.wrestler_id IN (SELECT cid FROM champs)
  ),
  agg AS (
    SELECT wins.wid, wins.school_id, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(s.id, p_season, 'F'), school_display_name(s.id, p_season, 'F'), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  LEFT JOIN schools s ON s.id = agg.school_id
  ORDER BY total_seconds ASC LIMIT 25;
END;
$function$;

CREATE OR REPLACE FUNCTION public.region_mat_time(p_region integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH region_tournament AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Regions r' || p_region
      AND season_id = p_season
  ),
  region_wrestlers AS (   -- the region's champions
    SELECT DISTINCT te.wrestler_id AS wid
    FROM matches m JOIN region_tournament rt ON m.tournament_id = rt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.round = 'F' AND m.bracket_side = 'championship'
  ),
  scope_tournaments AS (
    SELECT id FROM tournaments
    WHERE gender = p_gender AND season_id = p_season
      AND (tournament_type = 'districts' OR tournament_type = 'regions'
           OR tournament_type = 'girls_regions')
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id AS wid, te2.school_id
    FROM tournament_entries te2 JOIN tournaments t2 ON t2.id = te2.tournament_id
    WHERE te2.school_id IS NOT NULL
      AND t2.season_id = p_season AND t2.gender = p_gender
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.tournament_type = 'districts' THEN 0 ELSE 1 END
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
      AND te.wrestler_id IN (SELECT wid FROM region_wrestlers)
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN scope_tournaments st ON m.tournament_id = st.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN region_wrestlers rw ON rw.wid = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_secs, COUNT(*)::integer AS mcnt
    FROM wins GROUP BY wid HAVING COUNT(*) >= 3
  )
  SELECT agg.wid,
    TRIM(COALESCE(w.first_name,'') || ' ' || COALESCE(w.last_name,'')),
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_secs, agg.mcnt
  FROM agg
  JOIN wrestlers w    ON w.id   = agg.wid
  JOIN school_lookup sl ON sl.wid = agg.wid
  JOIN schools s      ON s.id   = sl.school_id
  ORDER BY agg.total_secs ASC LIMIT 8;
END;
$function$;

CREATE OR REPLACE FUNCTION public.district_mat_time(p_district integer, p_gender gender_type, p_season smallint)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
                 || ' Districts District ' || p_district
      AND season_id = p_season
  ),
  losers AS (
    SELECT DISTINCT te.wrestler_id AS lid
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.loser_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND m.loser_entry_id IS NOT NULL
  ),
  wins AS (
    SELECT te.wrestler_id AS wid,
      te.school_id,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
      AND te.wrestler_id NOT IN (SELECT lid FROM losers)
      AND te.school_id IS NOT NULL
      AND te.wrestler_id IN (   -- the district's champions
        SELECT te2.wrestler_id FROM matches m2 JOIN t ON m2.tournament_id = t.id
        JOIN tournament_entries te2 ON te2.id = m2.winner_entry_id
        WHERE m2.validated = true AND m2.round = 'F' AND m2.bracket_side = 'championship')
  ),
  agg AS (
    SELECT wins.wid, wins.school_id,
      SUM(secs)::integer AS total_seconds,
      COUNT(*)::integer  AS match_count
    FROM wins GROUP BY wins.wid, wins.school_id HAVING COUNT(*) >= 3
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(s.id, p_season, p_gender::text), school_display_name(s.id, p_season, p_gender::text), s.id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr ON wr.id = agg.wid
  JOIN schools   s  ON s.id  = agg.school_id
  ORDER BY total_seconds ASC LIMIT 8;
END;
$function$;

CREATE OR REPLACE FUNCTION public.girls_region_mat_time(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer, total_seconds integer, match_count integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH region_tournament AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  ),
  region_wrestlers AS (   -- the region's champions
    SELECT DISTINCT te.wrestler_id
    FROM matches m JOIN region_tournament rt ON m.tournament_id = rt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    WHERE m.validated = true AND m.round = 'F' AND m.bracket_side = 'championship'
  ),
  postseason_tournaments AS (
    SELECT id FROM tournaments WHERE gender = 'F' AND season_id = p_season
  ),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN postseason_tournaments pt ON te2.tournament_id = pt.id
    WHERE te2.school_id IS NOT NULL
    ORDER BY te2.wrestler_id, te2.school_id
  ),
  champ_all AS (
    SELECT te.wrestler_id AS wid,
      CASE WHEN m.win_type = 'FALL'::win_type OR m.win_type::text LIKE 'TF%%'
           THEN COALESCE(NULLIF(m.fall_time_seconds, 0), 360) ELSE 360 END AS secs
    FROM matches m
    JOIN postseason_tournaments pt ON m.tournament_id = pt.id
    JOIN tournament_entries te ON te.id = m.winner_entry_id
    JOIN region_wrestlers rw ON rw.wrestler_id = te.wrestler_id
    WHERE m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type != 'FORF'::win_type AND m.win_type != 'BYE'::win_type
  ),
  agg AS (
    SELECT wid, SUM(secs)::integer AS total_seconds, COUNT(*)::integer AS match_count
    FROM champ_all GROUP BY wid
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')) AS wrestler_name,
    school_display_name(s.id, p_season, 'F') AS school,
    school_display_name(s.id, p_season, 'F') AS school_name,
    s.id           AS school_id,
    agg.total_seconds, agg.match_count
  FROM agg
  JOIN wrestlers wr   ON wr.id  = agg.wid
  JOIN school_lookup sl ON sl.wrestler_id = agg.wid
  JOIN schools s      ON s.id  = sl.school_id
  ORDER BY total_seconds ASC LIMIT 8
$function$;

COMMIT;

-- Verify: 2025-26 boys state Terminators are all state champions (expect every row's champion = true)
SELECT r.wrestler_name, r.match_count, r.total_seconds,
       EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id JOIN tournament_entries te ON te.id = m.winner_entry_id
               WHERE t.season_id = 2026 AND t.tournament_type = 'boys_state' AND m.round = 'F' AND te.wrestler_id = r.wrestler_id) AS champion
FROM lb_p_mat_time('M', 'state', 2026::smallint) r LIMIT 8;

-- ROLLBACK: re-run the five function definitions from docs/migrations/20261103_school_names_by_season.sql
