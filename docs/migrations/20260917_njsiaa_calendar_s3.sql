-- docs/migrations/20260917_njsiaa_calendar_s3.sql
--
-- 1. Add start_date / end_date columns to the postseason `tournaments` table
--    so individual tournaments can be filtered by date on the public schedule.
--
-- 2. Seed season_calendar with all NJSIAA 2026-27 (Season 3) dates.
--    INSERT runs only if a season row for '2026-27' already exists.
--
-- 3. Set seasons.start_date / end_date for the 2026-27 season (Season 3).

-- ── 1. Postseason tournaments: date columns ───────────────────────────────────

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date;

CREATE INDEX IF NOT EXISTS idx_tournaments_start_date
  ON tournaments (start_date);

-- ── 2. Season calendar — NJSIAA 2026-27 ──────────────────────────────────────
-- Requires seasons row with year_label = '2026-27' to exist.
-- Two typos in the original user input corrected:
--   "02/03/2026" → 2027-02-03  (Public Sectional Finals)
--   "b02/04/2027f" → 2027-02-04 (Non-Public State Semifinals)

INSERT INTO season_calendar (season_id, season_label, event_date, event_date_end, event_category, event_type, label)
SELECT
  s.id,
  s.year_label,
  e.event_date,
  e.event_date_end,
  e.event_category,
  e.event_type,
  e.label
FROM seasons s
JOIN (VALUES
  ('2026-11-02'::date, NULL::date,           'preseason',  NULL,               'Weight Certification Begins'),
  ('2026-11-23'::date, '2026-11-25'::date,   'preseason',  NULL,               'Tryout Period'),
  ('2026-11-30'::date, NULL::date,           'preseason',  NULL,               'First Practice'),
  ('2026-12-07'::date, NULL::date,           'preseason',  NULL,               'First Day of Season'),
  ('2027-01-01'::date, NULL::date,           'season',     NULL,               'Two Pound Growth Allowance'),
  ('2027-01-23'::date, NULL::date,           'season',     NULL,               'Team Tournament Cutoff'),
  ('2027-01-24'::date, NULL::date,           'season',     NULL,               'Power Points Close at 11:59 PM'),
  ('2027-01-26'::date, NULL::date,           'season',     NULL,               'Team Tournament Seeding'),
  ('2027-01-30'::date, NULL::date,           'season',     NULL,               '30-Match Limit Cutoff'),
  ('2027-02-07'::date, NULL::date,           'season',     NULL,               'Regular Season Competition Ends'),
  ('2027-02-10'::date, NULL::date,           'postseason', 'seeding',          'District Seeding'),
  ('2027-02-16'::date, '2027-02-17'::date,   'postseason', 'seeding',          'Region Seeding'),
  ('2027-02-23'::date, NULL::date,           'postseason', 'seeding',          'Individual State Seeding'),
  ('2027-02-01'::date, NULL::date,           'postseason', 'team_playoff',     'Public Team Playoff — Rounds 1 & 2'),
  ('2027-02-03'::date, NULL::date,           'postseason', 'team_playoff',     'Public Team Playoff — Sectional Finals'),
  ('2027-02-05'::date, NULL::date,           'postseason', 'team_playoff',     'Public Team Playoff — State Semifinals'),
  ('2027-02-07'::date, NULL::date,           'postseason', 'team_playoff',     'Public Team Playoff — State Finals'),
  ('2027-02-02'::date, NULL::date,           'postseason', 'team_playoff',     'Non-Public Team Playoff — Rounds 1 & 2'),
  ('2027-02-04'::date, NULL::date,           'postseason', 'team_playoff',     'Non-Public Team Playoff — State Semifinals'),
  ('2027-02-07'::date, NULL::date,           'postseason', 'team_playoff',     'Non-Public Team Playoff — State Finals'),
  ('2027-02-13'::date, NULL::date,           'postseason', 'districts',        'Individual Post Season — Districts'),
  ('2027-02-19'::date, '2027-02-20'::date,   'postseason', 'regions',          'Individual Post Season — Regions'),
  ('2027-02-25'::date, '2027-02-27'::date,   'postseason', 'state',            'Individual Post Season — State Championships')
) AS e (event_date, event_date_end, event_category, event_type, label)
  ON s.year_label = '2026-27'
ON CONFLICT DO NOTHING;

-- ── 3. Season date range for 2026-27 ─────────────────────────────────────────

UPDATE seasons
SET
  start_date = '2026-12-07',
  end_date   = '2027-02-27'
WHERE year_label = '2026-27';
