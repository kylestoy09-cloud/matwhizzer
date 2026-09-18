-- Individual Rankings — Season 3 Week Seeds
-- ⚠️  RUN AFTER Season 3 is created via the season rollover process.
--     Season 3 must exist in the `seasons` table with year_label = '2026-27'.
--     Run 20260829_individual_ranking_schema.sql first if not already applied.
--
-- Creates one row per week per gender (9 weeks × 2 genders = 18 rows).
-- Week dates are the 9 Saturday ranking deadlines for the 2026-27 season.

DO $$
DECLARE
  v_season_id integer;
BEGIN
  SELECT id INTO v_season_id FROM seasons WHERE year_label = '2026-27';

  IF v_season_id IS NULL THEN
    RAISE EXCEPTION 'Season 3 (year_label = ''2026-27'') does not exist yet. '
      'Complete the season rollover first, then re-run this script.';
  END IF;

  INSERT INTO individual_ranking_weeks (season_id, week_number, week_date, gender)
  SELECT
    v_season_id,
    w.week_number,
    w.week_date,
    g.gender
  FROM (VALUES
    (1, '2026-12-13'::date),
    (2, '2026-12-20'::date),
    (3, '2026-12-27'::date),
    (4, '2027-01-03'::date),
    (5, '2027-01-10'::date),
    (6, '2027-01-17'::date),
    (7, '2027-01-24'::date),
    (8, '2027-01-31'::date),
    (9, '2027-02-07'::date)
  ) AS w(week_number, week_date)
  CROSS JOIN (VALUES ('M'::text), ('F'::text)) AS g(gender)
  ON CONFLICT (season_id, week_number, gender) DO NOTHING;

  RAISE NOTICE 'Seeded % rows into individual_ranking_weeks for Season 3.',
    (SELECT COUNT(*) FROM individual_ranking_weeks WHERE season_id = v_season_id);
END;
$$;
