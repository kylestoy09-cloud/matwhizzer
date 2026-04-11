-- APPLIED: 2026-04-05
CREATE TABLE IF NOT EXISTS districts (number int PRIMARY KEY, logo_url text);
CREATE TABLE IF NOT EXISTS regions (number int PRIMARY KEY, logo_url text);
INSERT INTO districts (number) SELECT generate_series(1,32) ON CONFLICT DO NOTHING;
INSERT INTO regions (number) SELECT generate_series(1,8) ON CONFLICT DO NOTHING;
GRANT SELECT ON districts, regions TO anon, authenticated;
GRANT ALL ON districts, regions TO service_role;

-- ROLLBACK:
-- -- The CREATE TABLE IF NOT EXISTS statements were no-ops (tables already existed).
-- -- Rollback the grants only:
-- REVOKE SELECT ON districts FROM anon, authenticated;
-- REVOKE SELECT ON regions FROM anon, authenticated;
-- -- NOTE: Seeded district/region rows (1-32, 1-8) may have FK references.
-- --       Delete with caution: DELETE FROM districts WHERE number BETWEEN 1 AND 32;
