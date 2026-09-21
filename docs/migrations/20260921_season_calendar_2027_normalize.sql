-- docs/migrations/20260921_season_calendar_2027_normalize.sql
--
-- The 2026-27 (season 2027) calendar rows from 20260917_njsiaa_calendar_s3.sql used a
-- different vocabulary (categories season/postseason; event types districts/regions/
-- state/team_playoff; no gender) than 2025-26. The About page only renders the
-- 2025-26 categories, and wrestler profiles / playoff detection look up the 2025-26
-- event types, so those rows were invisible or unmatched.
--
-- Converts them to the canonical (2025-26) vocabulary. All rows are boys (per Kyle).
-- Girls 2026-27 dates have not been entered yet.

UPDATE season_calendar c SET event_category = v.cat, event_type = v.typ, gender = v.gen
FROM (VALUES
  (124, 'weight',          NULL,                                  NULL),
  (125, 'team_entry',      NULL,                                  NULL),
  (126, 'team_entry',      'pp_cutoff',                           NULL),
  (127, 'team_entry',      NULL,                                  NULL),
  (128, 'team_entry',      NULL,                                  NULL),
  (129, 'team_entry',      NULL,                                  NULL),
  (133, 'team_public_boys','team_playoff_r12_public',             'M'),
  (134, 'team_public_boys','team_playoff_sectional_final_public', 'M'),
  (135, 'team_public_boys','team_playoff_state_sf_public',        'M'),
  (136, 'team_public_boys','team_playoff_state_final_public',     'M'),
  (137, 'team_np_boys',    'team_playoff_r12_np',                 'M'),
  (138, 'team_np_boys',    'team_playoff_state_sf_np',            'M'),
  (139, 'team_np_boys',    'team_playoff_state_final_np',         'M'),
  (130, 'individual_boys', NULL,                                  'M'),
  (131, 'individual_boys', NULL,                                  'M'),
  (132, 'individual_boys', NULL,                                  NULL),
  (140, 'individual_boys', 'individual_district_boys',            'M'),
  (141, 'individual_boys', 'individual_region_boys',              'M'),
  (142, 'individual_boys', 'individual_state_boys',               'M')
) AS v(id, cat, typ, gen)
WHERE c.id = v.id AND c.season_id = 2027;

-- Reverse: restore from 20260917_njsiaa_calendar_s3.sql values
-- (categories season/postseason; event types team_playoff/seeding/districts/regions/state; gender NULL).
