-- Site functions name schools by id, never by the bracket's raw text (2026-11-02)
--
-- The postseason pages (district / region / state weight pages and overviews, Ghost Champions,
-- Bracket Buster, the wrestler profile's revenge wins) showed tournament_entries.school_context_raw,
-- the bracket's own abbreviation or truncated name ("Northern Highlands Regional Sc", "Waldwick /
-- Midland Park"), translated through school_names where a translation existed. Raw imported text
-- must never reach the site, and the logo lookup by those names missed about half the time.
--
-- Every function below now:
--   * returns the school id (new columns appended at the end, so existing readers keep working)
--   * fills its school / school_name text columns with the school's name for that season and
--     gender (school_display_name), or NULL when the entry has no school (the page shows TBD)
--   * no longer reads school_context_raw or school_names
-- Bodies are otherwise unchanged. A return type can't change in place, so each is dropped and
-- recreated; the whole file runs as one transaction.
-- ROLLBACK: docs/migrations/backups/20261102_site_functions_before.sql (drop these first).

BEGIN;

-- ── Brackets ──────────────────────────────────────────────────────────────────────────────
DROP FUNCTION public.district_bracket(integer, integer, gender_type, smallint);
CREATE FUNCTION public.district_bracket(p_district integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text, winner_school_id integer, loser_school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id, m.round::text, m.bracket_side::text, m.win_type::text,
    m.winner_score, m.loser_score, m.fall_time_seconds,
    te_w.id, te_w.wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, ''),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    te_w.seed, te_w.grade_label::text,
    te_l.id, te_l.wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END,
    school_display_name(te_l.school_id, p_season, p_gender::text),
    school_display_name(te_l.school_id, p_season, p_gender::text),
    te_l.seed, te_l.grade_label::text,
    te_w.school_id, te_l.school_id
  FROM matches m
  JOIN tournaments t   ON t.id  = m.tournament_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w          ON wr_w.id = te_w.wrestler_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l          ON wr_l.id = te_l.wrestler_id
  WHERE t.name   = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district::text)
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender   = p_gender
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text
$function$;

DROP FUNCTION public.region_bracket(integer, integer, gender_type, smallint);
CREATE FUNCTION public.region_bracket(p_region integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text, winner_school_id integer, loser_school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id, m.round::text, m.bracket_side::text, m.win_type::text,
    m.winner_score, m.loser_score, m.fall_time_seconds,
    te_w.id, te_w.wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, ''),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    te_w.seed, te_w.grade_label::text,
    te_l.id, te_l.wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END,
    school_display_name(te_l.school_id, p_season, p_gender::text),
    school_display_name(te_l.school_id, p_season, p_gender::text),
    te_l.seed, te_l.grade_label::text,
    te_w.school_id, te_l.school_id
  FROM matches m
  JOIN tournaments t ON t.id=m.tournament_id
  JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  WHERE t.name = 'Boy_s Regions r' || p_region::text
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender = p_gender
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text
$function$;

DROP FUNCTION public.girls_region_bracket(text, integer, smallint);
CREATE FUNCTION public.girls_region_bracket(p_region text, p_weight integer, p_season smallint DEFAULT 1)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score integer, loser_score integer, fall_time_seconds integer, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed integer, winner_grade text, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed integer, loser_grade text, winner_school_id integer, loser_school_id integer)
 LANGUAGE plpgsql SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.round::text, m.bracket_side::text, m.win_type::text,
    m.winner_score::integer, m.loser_score::integer, m.fall_time_seconds::integer,
    te_w.id, te_w.wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, ''),
    school_display_name(te_w.school_id, p_season, 'F'),
    school_display_name(te_w.school_id, p_season, 'F'),
    te_w.seed::integer, te_w.grade_label::text,
    te_l.id, te_l.wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END,
    school_display_name(te_l.school_id, p_season, 'F'),
    school_display_name(te_l.school_id, p_season, 'F'),
    te_l.seed::integer, te_l.grade_label::text,
    te_w.school_id, te_l.school_id
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id AND t.season_id = p_season
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id = te_w.wrestler_id
  LEFT JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id = te_l.wrestler_id
  WHERE t.name = ('Girl_s Regions r' || p_region)
    AND wc.weight = p_weight
    AND m.validated = true
    AND t.gender = 'F'
    AND t.season_id = p_season
  ORDER BY m.bracket_side, m.round::text;
END;
$function$;

DROP FUNCTION public.state_bracket(integer, gender_type, smallint);
CREATE FUNCTION public.state_bracket(p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(match_id uuid, round text, bracket_side text, win_type text, winner_score smallint, loser_score smallint, fall_time_seconds smallint, bout_number integer, winner_entry_id uuid, winner_wrestler_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, winner_grade text, winner_bracket_position smallint, loser_entry_id uuid, loser_wrestler_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, loser_grade text, loser_bracket_position smallint, winner_school_id integer, loser_school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    m.id, m.round::text, m.bracket_side::text, m.win_type::text,
    m.winner_score, m.loser_score, m.fall_time_seconds,
    m.bout_number,
    te_w.id, te_w.wrestler_id,
    COALESCE(wr_w.first_name || ' ' || wr_w.last_name, ''),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    te_w.seed, te_w.grade_label::text,
    te_w.bracket_position,
    te_l.id, te_l.wrestler_id,
    CASE WHEN te_l.id IS NULL THEN NULL ELSE COALESCE(wr_l.first_name || ' ' || wr_l.last_name, '') END,
    school_display_name(te_l.school_id, p_season, p_gender::text),
    school_display_name(te_l.school_id, p_season, p_gender::text),
    te_l.seed, te_l.grade_label::text,
    te_l.bracket_position,
    te_w.school_id, te_l.school_id
  FROM matches m
  JOIN tournaments t ON t.id=m.tournament_id
  JOIN weight_classes wc ON wc.id=m.weight_class_id
  LEFT JOIN tournament_entries te_w ON te_w.id=m.winner_entry_id
  LEFT JOIN wrestlers wr_w ON wr_w.id=te_w.wrestler_id
  LEFT JOIN tournament_entries te_l ON te_l.id=m.loser_entry_id
  LEFT JOIN wrestlers wr_l ON wr_l.id=te_l.wrestler_id
  WHERE t.name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END
    AND wc.weight=p_weight AND m.validated=true AND t.gender=p_gender
    AND t.season_id=p_season
  ORDER BY m.bracket_side, m.round::text, m.bout_number NULLS LAST
$function$;

-- ── Bracket entries (seeded field for a weight) ─────────────────────────────────────────────
DROP FUNCTION public.region_bracket_entries_v2(integer, integer, gender_type, smallint);
CREATE FUNCTION public.region_bracket_entries_v2(p_region integer, p_weight integer, p_gender gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer, bracket_position smallint, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id, w.id, w.first_name || ' ' || w.last_name,
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    te.seed, te.grade_label::text, te.wins, te.losses,
    (SELECT SUBSTRING(dt.name FROM 'District (\d+)')::int
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = p_gender LIMIT 1),
    (SELECT CASE
       WHEN m.round = 'F' AND m.winner_entry_id = dte.id THEN 1
       WHEN m.round = 'F' AND m.loser_entry_id = dte.id THEN 2
       WHEN m.round = '3rd_Place' AND m.winner_entry_id = dte.id THEN 3
       WHEN m.round = '3rd_Place' AND m.loser_entry_id = dte.id THEN 4 END
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     JOIN matches m ON (m.winner_entry_id = dte.id OR m.loser_entry_id = dte.id) AND m.round::text IN ('F','3rd_Place')
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = p_gender LIMIT 1),
    t.id::int, wc.id::int, te.bracket_position,
    te.school_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE t.tournament_type = 'regions' AND t.season_id = p_season
    AND t.name = CASE WHEN p_gender = 'M' THEN 'Boy_s Regions r' ELSE 'Girl_s Regions r' END || p_region
    AND wc.weight = p_weight
  ORDER BY te.bracket_position NULLS LAST, te.seed NULLS LAST
$function$;

DROP FUNCTION public.girls_region_bracket_entries_v2(text, integer, smallint);
CREATE FUNCTION public.girls_region_bracket_entries_v2(p_region text, p_weight integer, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer, bracket_position smallint, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id, w.id, w.first_name || ' ' || w.last_name,
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    te.seed, te.grade_label::text, te.wins, te.losses,
    (SELECT SUBSTRING(dt.name FROM 'District (\d+)')::int
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = 'F' LIMIT 1),
    (SELECT CASE
       WHEN m.round = 'F' AND m.winner_entry_id = dte.id THEN 1
       WHEN m.round = 'F' AND m.loser_entry_id = dte.id THEN 2
       WHEN m.round = '3rd_Place' AND m.winner_entry_id = dte.id THEN 3
       WHEN m.round = '3rd_Place' AND m.loser_entry_id = dte.id THEN 4 END
     FROM tournament_entries dte JOIN tournaments dt ON dt.id = dte.tournament_id
     JOIN matches m ON (m.winner_entry_id = dte.id OR m.loser_entry_id = dte.id) AND m.round::text IN ('F','3rd_Place')
     WHERE dte.wrestler_id = w.id AND dt.tournament_type = 'districts'
       AND dt.season_id = p_season AND dt.gender = 'F' LIMIT 1),
    t.id::int, wc.id::int, te.bracket_position,
    te.school_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE t.tournament_type = 'girls_regions' AND t.season_id = p_season
    AND t.name = 'Girl_s Regions r' || p_region
    AND wc.weight = p_weight
  ORDER BY te.bracket_position NULLS LAST, te.seed NULLS LAST
$function$;

DROP FUNCTION public.state_bracket_entries_v2(integer, gender_type, smallint);
CREATE FUNCTION public.state_bracket_entries_v2(p_weight integer, p_gender gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(entry_id uuid, wrestler_id uuid, wrestler_name text, school text, school_name text, seed smallint, grade text, wins smallint, losses smallint, district_num integer, district_place integer, tournament_id integer, weight_class_id integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    te.id, w.id, w.first_name || ' ' || w.last_name,
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    te.seed, te.grade_label::text, te.wins, te.losses,
    -- region number (column name kept from the district version)
    (SELECT CASE
       WHEN rt.tournament_type = 'regions' THEN SUBSTRING(rt.name FROM 'r(\d+)')::int
       WHEN rt.tournament_type = 'girls_regions' THEN
         CASE
           WHEN rt.name LIKE '%Central%' THEN 1
           WHEN rt.name LIKE '%North 1%' THEN 2
           WHEN rt.name LIKE '%North 2%' THEN 3
           WHEN rt.name LIKE '%South%'   THEN 4
         END
     END
     FROM tournament_entries rte
     JOIN tournaments rt ON rt.id = rte.tournament_id
     WHERE rte.wrestler_id = w.id
       AND rt.tournament_type IN ('regions', 'girls_regions')
       AND rt.season_id = p_season
     LIMIT 1),
    -- region place
    (SELECT
       CASE
         WHEN m.round = 'F' AND m.winner_entry_id = rte.id THEN 1
         WHEN m.round = 'F' AND m.loser_entry_id = rte.id THEN 2
         WHEN m.round = '3rd_Place' AND m.winner_entry_id = rte.id THEN 3
         WHEN m.round = '3rd_Place' AND m.loser_entry_id = rte.id THEN 4
         WHEN m.round = '5th_Place' AND m.winner_entry_id = rte.id THEN 5
         WHEN m.round = '5th_Place' AND m.loser_entry_id = rte.id THEN 6
       END
     FROM tournament_entries rte
     JOIN tournaments rt ON rt.id = rte.tournament_id
     JOIN matches m ON (m.winner_entry_id = rte.id OR m.loser_entry_id = rte.id)
                    AND m.round::text IN ('F', '3rd_Place', '5th_Place')
     WHERE rte.wrestler_id = w.id
       AND rt.tournament_type IN ('regions', 'girls_regions')
       AND rt.season_id = p_season
     ORDER BY
       CASE
         WHEN m.round = 'F' AND m.winner_entry_id = rte.id THEN 1
         WHEN m.round = 'F' AND m.loser_entry_id = rte.id THEN 2
         WHEN m.round = '3rd_Place' AND m.winner_entry_id = rte.id THEN 3
         WHEN m.round = '3rd_Place' AND m.loser_entry_id = rte.id THEN 4
         WHEN m.round = '5th_Place' AND m.winner_entry_id = rte.id THEN 5
         WHEN m.round = '5th_Place' AND m.loser_entry_id = rte.id THEN 6
       END
     LIMIT 1),
    t.id::int, te.weight_class_id::int,
    te.school_id
  FROM tournament_entries te
  JOIN tournaments t ON t.id = te.tournament_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  WHERE t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END)
    AND wc.weight = p_weight
    AND t.season_id = p_season
  ORDER BY te.seed ASC NULLS LAST, w.last_name ASC;
$function$;

-- ── Placements (top 4 / top 8 per weight) ──────────────────────────────────────────────────
-- One shared body: the four (or eight) place-deciding bouts, winner and loser side.
DROP FUNCTION public.district_placements(integer, gender_type, smallint);
CREATE FUNCTION public.district_placements(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district::text
      AND gender = p_gender AND season_id = p_season
  ),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE WHEN m.round = 'F' THEN 1 ELSE 3 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship') OR m.round = '3rd_Place')
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    te.school_id
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2;
$function$;

DROP FUNCTION public.region_placements(integer, gender_type, smallint);
CREATE FUNCTION public.region_placements(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE WHEN m.round = 'F' THEN 1 ELSE 3 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship') OR (m.round = '3rd_Place' AND m.bracket_side = 'consolation'))
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    te.school_id
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2
$function$;

DROP FUNCTION public.girls_region_placements(text, smallint);
CREATE FUNCTION public.girls_region_placements(p_region text, p_season smallint DEFAULT 1)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE WHEN m.round = 'F' THEN 1 ELSE 3 END + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship') OR (m.round = '3rd_Place' AND m.bracket_side = 'consolation'))
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    TRIM(COALESCE(wr.first_name, '') || ' ' || COALESCE(wr.last_name, '')),
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    te.school_id
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2
$function$;

-- State: places 1-8 from the placement bouts. The school is the state entry's; an entry
-- without one falls back to the wrestler's region (then district) entry that season, as before.
DROP FUNCTION public.state_placements(gender_type, smallint);
CREATE FUNCTION public.state_placements(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(weight integer, place integer, wrestler_id uuid, wrestler_name text, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (SELECT id FROM tournaments WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s States' ELSE 'Girl_s States' END AND gender = p_gender AND season_id = p_season),
  school_lookup AS (
    SELECT DISTINCT ON (te2.wrestler_id) te2.wrestler_id, te2.school_id
    FROM tournament_entries te2
    JOIN tournaments t2 ON t2.id = te2.tournament_id AND t2.season_id = p_season
    WHERE te2.school_id IS NOT NULL
      AND t2.name NOT LIKE '%States%'
    ORDER BY te2.wrestler_id,
      CASE WHEN t2.name LIKE '%Regions%' THEN 0 ELSE 1 END
  ),
  sides AS (
    SELECT wc.weight::int AS w,
      CASE m.round::text WHEN 'F' THEN 1 WHEN '3rd_Place' THEN 3 WHEN '5th_Place' THEN 5 ELSE 7 END
        + CASE WHEN s.won THEN 0 ELSE 1 END AS p,
      CASE WHEN s.won THEN m.winner_entry_id ELSE m.loser_entry_id END AS entry_id
    FROM matches m JOIN t ON m.tournament_id = t.id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    CROSS JOIN (VALUES (true), (false)) s(won)
    WHERE m.validated = true
      AND ((m.round = 'F' AND m.bracket_side = 'championship')
        OR (m.round::text IN ('3rd_Place', '5th_Place', '7th_Place') AND m.bracket_side = 'consolation'))
  )
  SELECT sd.w, sd.p, te.wrestler_id,
    wrestler_name_with_grade(wr.first_name, wr.last_name, wr.id),
    school_display_name(COALESCE(te.school_id, sl.school_id), p_season, p_gender::text),
    school_display_name(COALESCE(te.school_id, sl.school_id), p_season, p_gender::text),
    COALESCE(te.school_id, sl.school_id)
  FROM sides sd
  JOIN tournament_entries te ON te.id = sd.entry_id
  LEFT JOIN wrestlers wr ON wr.id = te.wrestler_id
  LEFT JOIN school_lookup sl ON sl.wrestler_id = te.wrestler_id
  WHERE te.wrestler_id IS NOT NULL
  ORDER BY 1, 2
$function$;

-- ── District champs feeding a region weight ─────────────────────────────────────────────────
DROP FUNCTION public.region_district_champs(integer, integer, gender_type, smallint);
CREATE FUNCTION public.region_district_champs(p_region integer, p_weight integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, place integer, wrestler_name text, wrestler_id uuid, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    CAST(regexp_replace(t.name, '.*District ', '') AS int) AS district_num,
    CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END AS place,
    w.first_name || ' ' || w.last_name,
    w.id,
    school_display_name(te.school_id, p_season, p_gender::text),
    te.school_id
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
    AND t.tournament_type = 'districts' AND t.gender = p_gender AND t.season_id = p_season
  JOIN tournament_entries te ON te.id IN (m.winner_entry_id, m.loser_entry_id)
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id AND wc.weight = p_weight
  WHERE m.round IN ('F', '3rd_Place')
    AND CAST(regexp_replace(t.name, '.*District ', '') AS int) = ANY(
      CASE p_region
        WHEN 1 THEN ARRAY[1,2,3,4]
        WHEN 2 THEN ARRAY[5,6,7,8]
        WHEN 3 THEN ARRAY[9,10,11,12]
        WHEN 4 THEN ARRAY[13,14,15,16]
        WHEN 5 THEN ARRAY[17,18,19,20]
        WHEN 6 THEN ARRAY[21,22,23,24]
        WHEN 7 THEN ARRAY[25,26,27,28]
        WHEN 8 THEN ARRAY[29,30,31,32]
      END
    )
    AND CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END IS NOT NULL
  ORDER BY 1, 2
$function$;

DROP FUNCTION public.girls_region_district_champs(text, integer, smallint);
CREATE FUNCTION public.girls_region_district_champs(p_region text, p_weight integer, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, place integer, wrestler_name text, wrestler_id uuid, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT
    CAST(regexp_replace(t.name, '.*District ', '') AS int) AS district_num,
    CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END AS place,
    w.first_name || ' ' || w.last_name,
    w.id,
    school_display_name(te.school_id, p_season, 'F'),
    te.school_id
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
    AND t.tournament_type = 'districts' AND t.gender = 'F' AND t.season_id = p_season
  JOIN tournament_entries te ON te.id IN (m.winner_entry_id, m.loser_entry_id)
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id AND wc.weight = p_weight
  WHERE m.round IN ('F', '3rd_Place')
    AND CAST(regexp_replace(t.name, '.*District ', '') AS int) = ANY(
      CASE p_region
        WHEN '1' THEN ARRAY[1,2,3]
        WHEN '2' THEN ARRAY[4,5,6]
        WHEN '3' THEN ARRAY[7,8,9]
        WHEN '4' THEN ARRAY[10,11,12]
      END
    )
    AND CASE
      WHEN m.round = 'F' AND m.winner_entry_id = te.id THEN 1
      WHEN m.round = 'F' AND m.loser_entry_id = te.id THEN 2
      WHEN m.round = '3rd_Place' AND m.winner_entry_id = te.id THEN 3
      WHEN m.round = '3rd_Place' AND m.loser_entry_id = te.id THEN 4
    END IS NOT NULL
  ORDER BY 1, 2
$function$;

-- ── Fastest pins / tech falls (district and region overview pages) ─────────────────────────
DROP FUNCTION public.district_fastest_pin(integer, gender_type, smallint);
CREATE FUNCTION public.district_fastest_pin(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district
    AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

DROP FUNCTION public.district_fastest_tf(integer, gender_type, smallint);
CREATE FUNCTION public.district_fastest_tf(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district
    AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

DROP FUNCTION public.region_fastest_pin(integer, gender_type, smallint);
CREATE FUNCTION public.region_fastest_pin(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

DROP FUNCTION public.region_fastest_tf(integer, gender_type, smallint);
CREATE FUNCTION public.region_fastest_tf(p_region integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Boy_s Regions r' || p_region AND gender = p_gender AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, p_gender::text),
    school_display_name(te.school_id, p_season, p_gender::text),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8
$function$;

DROP FUNCTION public.girls_region_fastest_pin(text, smallint);
CREATE FUNCTION public.girls_region_fastest_pin(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type = 'FALL'::win_type AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8;
$function$;

DROP FUNCTION public.girls_region_fastest_tf(text, smallint);
CREATE FUNCTION public.girls_region_fastest_tf(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, fall_time_seconds integer, weight integer, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH t AS (
    SELECT id FROM tournaments
    WHERE name = 'Girl_s Regions r' || p_region AND gender = 'F' AND season_id = p_season
  )
  SELECT wr.id,
    TRIM(COALESCE(wr.first_name,'') || ' ' || COALESCE(wr.last_name,'')),
    school_display_name(te.school_id, p_season, 'F'),
    school_display_name(te.school_id, p_season, 'F'),
    m.fall_time_seconds, wc.weight, te.school_id
  FROM matches m JOIN t ON m.tournament_id = t.id
  JOIN tournament_entries te ON te.id = m.winner_entry_id
  JOIN wrestlers wr ON wr.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  WHERE m.validated = true AND m.win_type::text LIKE 'TF%' AND m.fall_time_seconds > 0
  ORDER BY m.fall_time_seconds ASC LIMIT 8;
$function$;

-- ── District team points by wrestler ──────────────────────────────────────────────────────
DROP FUNCTION public.district_team_pts(integer, gender_type, smallint);
CREATE FUNCTION public.district_team_pts(p_district integer, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2)
 RETURNS TABLE(wrestler_id uuid, wrestler_name text, school text, school_name text, weight integer, team_points numeric, school_id integer)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_tid integer;
  v_level text;
BEGIN
  SELECT id INTO v_tid FROM tournaments
  WHERE name = CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END
    || ' Districts District ' || p_district
  AND season_id = p_season;

  IF v_tid IS NULL THEN RETURN; END IF;

  v_level := CASE WHEN p_gender = 'M' THEN 'district' ELSE 'district_32' END;

  RETURN QUERY
  SELECT te.wrestler_id,
         w.first_name || ' ' || w.last_name,
         school_display_name(te.school_id, p_season, p_gender::text),
         school_display_name(te.school_id, p_season, p_gender::text),
         wc.weight::integer,
         ROUND(tw_wrestler_points(te.id, v_tid, v_level), 1) AS team_points,
         te.school_id
  FROM tournament_entries te
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = te.weight_class_id
  WHERE te.tournament_id = v_tid
    AND te.school_id IS NOT NULL
    AND tw_wrestler_points(te.id, v_tid, v_level) > 0
  ORDER BY team_points DESC;
END;
$function$;

-- ── Schools in a district / region (one row per school) ─────────────────────────────────────
DROP FUNCTION public.district_schools(smallint, gender_type, smallint);
CREATE FUNCTION public.district_schools(p_district smallint, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT school_display_name(s.school_id, p_season, p_gender::text),
         school_display_name(s.school_id, p_season, p_gender::text),
         s.school_id
  FROM (
    SELECT DISTINCT te.school_id
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    WHERE t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || p_district)
      AND t.gender = p_gender AND t.season_id = p_season
      AND te.school_id IS NOT NULL
  ) s
  ORDER BY 1
$function$;

DROP FUNCTION public.region_schools(smallint, gender_type, smallint);
CREATE FUNCTION public.region_schools(p_region smallint, p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 1)
 RETURNS TABLE(district_num integer, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH feeding_districts AS (
    SELECT d::int AS district_num, t.id AS dist_tid
    FROM unnest(
      CASE WHEN p_gender = 'M' THEN
        CASE p_region
          WHEN 1 THEN ARRAY[1,2,3,4] WHEN 2 THEN ARRAY[5,6,7,8]
          WHEN 3 THEN ARRAY[9,10,11,12] WHEN 4 THEN ARRAY[13,14,15,16]
          WHEN 5 THEN ARRAY[17,18,19,20] WHEN 6 THEN ARRAY[21,22,23,24]
          WHEN 7 THEN ARRAY[25,26,27,28] WHEN 8 THEN ARRAY[29,30,31,32]
        END
      ELSE
        CASE p_region
          WHEN 1 THEN ARRAY[1,2,3] WHEN 2 THEN ARRAY[4,5,6]
          WHEN 3 THEN ARRAY[7,8,9] WHEN 4 THEN ARRAY[10,11,12]
        END
      END
    ) AS d
    JOIN tournaments t
      ON t.name = (CASE WHEN p_gender = 'M' THEN 'Boy_s' ELSE 'Girl_s' END || ' Districts District ' || d)
     AND t.gender = p_gender AND t.season_id = p_season
  ),
  s AS (
    SELECT DISTINCT fd.district_num, te.school_id
    FROM feeding_districts fd
    JOIN tournament_entries te ON te.tournament_id = fd.dist_tid
    WHERE te.school_id IS NOT NULL
  )
  SELECT s.district_num,
         school_display_name(s.school_id, p_season, p_gender::text),
         school_display_name(s.school_id, p_season, p_gender::text),
         s.school_id
  FROM s
  ORDER BY 1, 2
$function$;

DROP FUNCTION public.girls_region_schools(text, smallint);
CREATE FUNCTION public.girls_region_schools(p_region text, p_season smallint DEFAULT 2)
 RETURNS TABLE(district_num integer, school text, school_name text, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH feeding_districts AS (
    SELECT d::int AS district_num, t.id AS dist_tid
    FROM unnest(
      CASE p_region
        WHEN '1' THEN ARRAY[1,2,3]
        WHEN '2' THEN ARRAY[4,5,6]
        WHEN '3' THEN ARRAY[7,8,9]
        WHEN '4' THEN ARRAY[10,11,12]
      END
    ) AS d
    JOIN tournaments t
      ON t.name = 'Girl_s Districts District ' || d
     AND t.gender    = 'F'
     AND t.season_id = p_season
  ),
  s AS (
    SELECT DISTINCT fd.district_num, te.school_id
    FROM feeding_districts fd
    JOIN tournament_entries te ON te.tournament_id = fd.dist_tid
    WHERE te.school_id IS NOT NULL
  )
  SELECT s.district_num,
         school_display_name(s.school_id, p_season, 'F'),
         school_display_name(s.school_id, p_season, 'F'),
         s.school_id
  FROM s
  ORDER BY 1, 2
$function$;

-- ── Ghost champions (champions seeded 5th or lower) ─────────────────────────────────────────
-- Each win on the path now carries the opponent's id and school id too.
DROP FUNCTION public.ghost_champions(smallint);
CREATE FUNCTION public.ghost_champions(p_season smallint DEFAULT 2)
 RETURNS TABLE(seed smallint, wrestler_id uuid, wrestler_name text, school text, weight smallint, gender text, tournament_name text, tournament_type text, wins_on_path jsonb, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT te.seed,
         te.wrestler_id,
         w.first_name || ' ' || w.last_name,
         school_display_name(te.school_id, t.season_id, t.gender::text),
         wc.weight::smallint,
         t.gender::text,
         t.name,
         t.tournament_type::text,
         (SELECT jsonb_agg(jsonb_build_object(
            'round', m2.round::text,
            'opponent', TRIM(COALESCE(wr2.first_name,'') || ' ' || COALESCE(wr2.last_name,'')),
            'opponent_id', wr2.id,
            'opponent_school_id', te2.school_id,
            'opponent_seed', te2.seed,
            'win_type', m2.win_type::text,
            'fall_time', m2.fall_time_seconds
          ) ORDER BY CASE m2.round::text
            WHEN 'R1' THEN 1 WHEN 'R2' THEN 2 WHEN 'QF' THEN 3 WHEN 'SF' THEN 4 WHEN 'F' THEN 5 ELSE 6
          END)
          FROM matches m2
          JOIN tournament_entries te2 ON te2.id = m2.loser_entry_id
          JOIN wrestlers wr2 ON wr2.id = te2.wrestler_id
          WHERE m2.winner_entry_id = p.entry_id
            AND m2.validated = true
            AND m2.bracket_side = 'championship'
            AND m2.win_type::text NOT IN ('BYE','FORF')
         ),
         te.school_id
  FROM placements p
  JOIN tournament_entries te ON te.id = p.entry_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = p.weight_class_id
  JOIN tournaments t ON t.id = p.tournament_id
  WHERE p.place = 1
    AND te.seed IS NOT NULL AND te.seed >= 5
    AND t.season_id = p_season
  ORDER BY te.seed DESC, t.name, wc.weight;
$function$;

CREATE OR REPLACE FUNCTION public.get_wrestler_ghost_championships(p_wrestler_id uuid)
 RETURNS TABLE(season_id smallint, tournament_type text, tournament_name text, weight integer, seed smallint, wins_on_path jsonb)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH champ_wins AS (
    SELECT te.tournament_id, te.id AS entry_id, te.seed, wc.weight,
           t.season_id, t.tournament_type::text, t.name
    FROM tournament_entries te
    JOIN tournaments t ON t.id = te.tournament_id
    JOIN weight_classes wc ON wc.id = te.weight_class_id
    JOIN matches m ON m.winner_entry_id = te.id
      AND m.round = 'F' AND m.bracket_side = 'championship' AND m.validated = true
    WHERE te.wrestler_id = p_wrestler_id
      AND te.seed IS NOT NULL AND te.seed >= 5
  )
  SELECT cw.season_id, cw.tournament_type, cw.name, cw.weight, cw.seed,
    (SELECT jsonb_agg(jsonb_build_object(
        'round', m2.round::text,
        'opponent', TRIM(COALESCE(wr2.first_name,'') || ' ' || COALESCE(wr2.last_name,'')),
        'opponent_id', wr2.id,
        'opponent_school_id', te2.school_id,
        'opponent_seed', te2.seed,
        'win_type', m2.win_type::text,
        'fall_time', m2.fall_time_seconds
      ) ORDER BY CASE m2.round::text
        WHEN 'R1' THEN 1 WHEN 'R2' THEN 2 WHEN 'QF' THEN 3 WHEN 'SF' THEN 4 WHEN 'F' THEN 5 ELSE 6
      END)
    FROM matches m2
    JOIN tournament_entries te2 ON te2.id = m2.loser_entry_id
    JOIN wrestlers wr2 ON wr2.id = te2.wrestler_id
    WHERE m2.winner_entry_id = cw.entry_id
      AND m2.validated = true
      AND m2.bracket_side = 'championship'
      AND m2.win_type::text NOT IN ('BYE','FORF')
    ) AS wins_on_path
  FROM champ_wins cw
  ORDER BY cw.season_id, cw.tournament_type
$function$;

-- ── State champions (home pages, postseason pages) ──────────────────────────────────────────
DROP FUNCTION public.state_champions(integer);
CREATE FUNCTION public.state_champions(p_tournament_id integer)
 RETURNS TABLE(weight smallint, wrestler_id uuid, wrestler_name text, school text, seed smallint, school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT wc.weight::smallint, te.wrestler_id,
    wrestler_name_with_grade(w.first_name, w.last_name, w.id),
    school_display_name(te.school_id, t.season_id, t.gender::text),
    te.seed,
    te.school_id
  FROM placements p
  JOIN tournament_entries te ON te.id = p.entry_id
  JOIN tournaments t ON t.id = p.tournament_id
  JOIN wrestlers w ON w.id = te.wrestler_id
  JOIN weight_classes wc ON wc.id = p.weight_class_id
  WHERE p.tournament_id = p_tournament_id AND p.place = 1
  ORDER BY wc.weight;
$function$;

-- ── Bracket Buster (biggest seed upsets) ────────────────────────────────────────────────────
DROP FUNCTION public.bracket_buster_detail(gender_type, smallint, text, integer, integer, integer);
CREATE FUNCTION public.bracket_buster_detail(p_gender gender_type DEFAULT 'M'::gender_type, p_season smallint DEFAULT 2, p_tournament_type text DEFAULT 'all'::text, p_region integer DEFAULT NULL::integer, p_district integer DEFAULT NULL::integer, p_limit integer DEFAULT 25)
 RETURNS TABLE(winner_id uuid, winner_name text, winner_school text, winner_school_name text, winner_seed smallint, loser_id uuid, loser_name text, loser_school text, loser_school_name text, loser_seed smallint, seed_gap smallint, win_type text, weight integer, round text, tournament_name text, tournament_label text, winner_school_id integer, loser_school_id integer)
 LANGUAGE plpgsql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    te_w.wrestler_id,
    TRIM(COALESCE(ww.first_name,'') || ' ' || COALESCE(ww.last_name,''))::text,
    school_display_name(te_w.school_id, p_season, p_gender::text),
    school_display_name(te_w.school_id, p_season, p_gender::text),
    te_w.seed,
    te_l.wrestler_id,
    TRIM(COALESCE(wl.first_name,'') || ' ' || COALESCE(wl.last_name,''))::text,
    school_display_name(te_l.school_id, p_season, p_gender::text),
    school_display_name(te_l.school_id, p_season, p_gender::text),
    te_l.seed,
    (te_w.seed - te_l.seed)::smallint,
    m.win_type::text,
    wc.weight::integer,
    m.round::text,
    t.name::text,
    CASE t.tournament_type
      WHEN 'districts'::tournament_type THEN
        'District ' || regexp_replace(t.name, '^.*District ', '')
      WHEN 'regions'::tournament_type THEN
        'Region ' || regexp_replace(t.name, '^.*r', '')
      WHEN 'girls_regions'::tournament_type THEN
        'Region ' || regexp_replace(t.name, '^.*r', '')
      WHEN 'boys_state'::tournament_type THEN 'State'
      WHEN 'girls_state'::tournament_type THEN 'State'
      ELSE t.name
    END::text,
    te_w.school_id,
    te_l.school_id
  FROM matches m
  JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
  JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
  JOIN wrestlers ww ON ww.id = te_w.wrestler_id
  JOIN wrestlers wl ON wl.id = te_l.wrestler_id
  JOIN weight_classes wc ON wc.id = m.weight_class_id
  JOIN tournaments t ON t.id = m.tournament_id
  WHERE te_w.seed > te_l.seed
    AND te_w.seed IS NOT NULL
    AND te_l.seed IS NOT NULL
    AND m.winner_entry_id IS NOT NULL
    AND m.loser_entry_id IS NOT NULL
    AND m.win_type IS NOT NULL
    AND m.win_type IN (
      'FALL'::win_type, 'TF'::win_type, 'TF-1'::win_type, 'TF-1.5'::win_type,
      'DEC'::win_type, 'MD'::win_type, '2-OT'::win_type, 'UTB'::win_type,
      'SV-1'::win_type, 'TB-1'::win_type, 'TB-2'::win_type
    )
    AND m.win_type NOT IN (
      'DQ'::win_type, 'FORF'::win_type, 'INJ'::win_type, 'BYE'::win_type
    )
    AND m.bracket_side = 'championship'::bracket_side
    AND t.season_id = p_season
    AND t.gender = p_gender
    AND m.validated = true
    AND (
      p_tournament_type = 'all'
      OR (p_tournament_type = 'districts' AND t.tournament_type IN ('districts'::tournament_type))
      OR (p_tournament_type = 'regions' AND t.tournament_type IN ('regions'::tournament_type, 'girls_regions'::tournament_type))
      OR (p_tournament_type = 'state' AND t.tournament_type IN ('boys_state'::tournament_type, 'girls_state'::tournament_type))
    )
    AND (
      p_region IS NULL
      OR t.name LIKE '%r' || p_region
    )
    AND (
      p_district IS NULL
      OR t.name LIKE '%District ' || p_district
    )
  ORDER BY
    (te_w.seed - te_l.seed) DESC,
    te_l.seed ASC,
    CASE m.round
      WHEN 'F' THEN 1
      WHEN 'SF' THEN 2
      WHEN 'QF' THEN 3
      ELSE 4
    END ASC
  LIMIT p_limit;
END;
$function$;

-- ── Wrestler profile: revenge wins ─────────────────────────────────────────────────────────
-- The opponent's school: his entry in the revenge bout's tournament.
DROP FUNCTION public.get_wrestler_revenge_wins(uuid);
CREATE FUNCTION public.get_wrestler_revenge_wins(p_wrestler_id uuid)
 RETURNS TABLE(season_id smallint, revenge_tournament_type text, revenge_tournament_name text, revenge_round text, weight integer, revenge_win_type text, revenge_fall_time integer, revenge_winner_score smallint, revenge_loser_score smallint, opponent_id uuid, opponent_name text, opponent_school text, opponent_school_name text, original_tournament_type text, original_tournament_name text, original_round text, original_win_type text, original_fall_time integer, original_winner_score smallint, original_loser_score smallint, opponent_school_id integer)
 LANGUAGE sql STABLE SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH my_losses AS (
    SELECT te_l.wrestler_id AS me, te_w.wrestler_id AS opponent,
           m.id AS match_id, t.season_id, t.tournament_type::text AS tt, t.name AS tname,
           m.round::text, m.win_type::text AS wt, m.fall_time_seconds, m.winner_score, m.loser_score,
           wc.weight,
           CASE t.tournament_type::text
             WHEN 'districts' THEN 1 WHEN 'regions' THEN 2 WHEN 'girls_regions' THEN 2
             WHEN 'boys_state' THEN 3 WHEN 'girls_state' THEN 3 ELSE 0
           END AS level_order
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    WHERE te_l.wrestler_id = p_wrestler_id
      AND m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type::text NOT IN ('BYE','FORF')
  ),
  my_wins AS (
    SELECT te_w.wrestler_id AS me, te_l.wrestler_id AS opponent,
           m.id AS match_id, t.season_id, t.gender::text AS g, t.tournament_type::text AS tt, t.name AS tname,
           m.round::text, m.win_type::text AS wt, m.fall_time_seconds, m.winner_score, m.loser_score,
           wc.weight, te_l.school_id AS opp_school_id,
           CASE t.tournament_type::text
             WHEN 'districts' THEN 1 WHEN 'regions' THEN 2 WHEN 'girls_regions' THEN 2
             WHEN 'boys_state' THEN 3 WHEN 'girls_state' THEN 3 ELSE 0
           END AS level_order
    FROM matches m
    JOIN tournaments t ON t.id = m.tournament_id
    JOIN tournament_entries te_w ON te_w.id = m.winner_entry_id
    JOIN tournament_entries te_l ON te_l.id = m.loser_entry_id
    JOIN weight_classes wc ON wc.id = m.weight_class_id
    WHERE te_w.wrestler_id = p_wrestler_id
      AND m.validated = true AND m.win_type IS NOT NULL
      AND m.win_type::text NOT IN ('BYE','FORF')
  )
  SELECT
    w.season_id,
    w.tt, w.tname, w.round, w.weight,
    w.wt, w.fall_time_seconds::integer, w.winner_score, w.loser_score,
    wr_opp.id,
    TRIM(COALESCE(wr_opp.first_name,'') || ' ' || COALESCE(wr_opp.last_name,'')),
    school_display_name(w.opp_school_id, w.season_id, w.g),
    school_display_name(w.opp_school_id, w.season_id, w.g),
    l.tt, l.tname, l.round, l.wt, l.fall_time_seconds::integer, l.winner_score, l.loser_score,
    w.opp_school_id
  FROM my_wins w
  JOIN my_losses l ON l.opponent = w.opponent
    AND (l.season_id < w.season_id
         OR (l.season_id = w.season_id AND l.level_order < w.level_order))
  JOIN wrestlers wr_opp ON wr_opp.id = w.opponent
  ORDER BY w.season_id, w.level_order, w.round
$function$;

GRANT EXECUTE ON FUNCTION
  public.district_bracket(integer, integer, gender_type, smallint),
  public.region_bracket(integer, integer, gender_type, smallint),
  public.girls_region_bracket(text, integer, smallint),
  public.state_bracket(integer, gender_type, smallint),
  public.region_bracket_entries_v2(integer, integer, gender_type, smallint),
  public.girls_region_bracket_entries_v2(text, integer, smallint),
  public.state_bracket_entries_v2(integer, gender_type, smallint),
  public.district_placements(integer, gender_type, smallint),
  public.region_placements(integer, gender_type, smallint),
  public.girls_region_placements(text, smallint),
  public.state_placements(gender_type, smallint),
  public.region_district_champs(integer, integer, gender_type, smallint),
  public.girls_region_district_champs(text, integer, smallint),
  public.district_fastest_pin(integer, gender_type, smallint),
  public.district_fastest_tf(integer, gender_type, smallint),
  public.region_fastest_pin(integer, gender_type, smallint),
  public.region_fastest_tf(integer, gender_type, smallint),
  public.girls_region_fastest_pin(text, smallint),
  public.girls_region_fastest_tf(text, smallint),
  public.district_team_pts(integer, gender_type, smallint),
  public.district_schools(smallint, gender_type, smallint),
  public.region_schools(smallint, gender_type, smallint),
  public.girls_region_schools(text, smallint),
  public.ghost_champions(smallint),
  public.state_champions(integer),
  public.bracket_buster_detail(gender_type, smallint, text, integer, integer, integer),
  public.get_wrestler_revenge_wins(uuid)
TO anon, authenticated, service_role;

COMMIT;
