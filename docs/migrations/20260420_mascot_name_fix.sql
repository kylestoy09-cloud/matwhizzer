-- =============================================================================
-- MIGRATION: 20260420_mascot_name_fix.sql
-- =============================================================================
-- Updates the mascot column for schools where the DB value was missing or
-- incorrect vs the authoritative School Master List CSV.
--
-- 19 updates in three categories:
--
--   16x NULL → value  (schools that had no mascot name in DB)
--    1x wrong value   (id=360 Buena/Vineland: Wildcats → Fighting Chiefs)
--    1x wrong value   (id=3   Emerson Boro:   Cavaliers → Cabos)
--    1x wrong value   (id=209 Nottingham:     Northstars → Patriots)
--
-- Decisions NOT applied:
--   - id=71 typo fixed to "Phoenix" (not "Pheonix" from CSV)
--   - id=146 Voorhees: kept DB "Vikings" (CSV "Mustangs" is wrong)
--   - id=270 Haddonfield: kept DB "Bulldawgs" (official school spelling)
--   - id=195 Red Bank Regional: kept DB "Buccaneers" (more complete than "Bucs")
--   - More-specific group (17,41,83,106,122,176,285,309,374): kept DB values
--   - id=300, 358: merged/deleted schools, skipped
--
-- ROLLBACK: see bottom of file
-- =============================================================================

BEGIN;

UPDATE schools SET mascot = v.mascot
FROM (VALUES
  -- NULL → value (16 schools)
  (20,  'Rebels'),
  (71,  'Phoenix'),
  (79,  'Eagles'),
  (85,  'Knights'),
  (168, 'Cougars'),
  (206, 'Panthers'),
  (227, 'Scotties'),
  (315, 'Cougars'),
  (321, 'Wildcats'),
  (363, 'Cougar Lions'),
  (365, 'Royal Raiders'),
  (372, 'Spartan Falcons'),
  (379, 'Ram Falcons'),
  (381, 'Blue Jays'),
  (385, 'Eagle Knights'),
  (392, 'Highlander Rams'),
  -- Wrong value → correct value (3 schools)
  (3,   'Cabos'),
  (209, 'Patriots'),
  (360, 'Fighting Chiefs')
) AS v(school_id, mascot)
WHERE schools.id = v.school_id;

COMMIT;


-- =============================================================================
-- ROLLBACK
-- =============================================================================
-- BEGIN;
-- UPDATE schools SET mascot = v.mascot
-- FROM (VALUES
--   (20,  NULL),
--   (71,  NULL),
--   (79,  NULL),
--   (85,  NULL),
--   (168, NULL),
--   (206, NULL),
--   (227, NULL),
--   (315, NULL),
--   (321, NULL),
--   (363, NULL),
--   (365, NULL),
--   (372, NULL),
--   (379, NULL),
--   (381, NULL),
--   (385, NULL),
--   (392, NULL),
--   (3,   'Cavaliers'),
--   (209, 'Northstars'),
--   (360, 'Wildcats')
-- ) AS v(school_id, mascot)
-- WHERE schools.id = v.school_id;
-- COMMIT;
