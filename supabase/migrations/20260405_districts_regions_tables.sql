CREATE TABLE IF NOT EXISTS districts (number int PRIMARY KEY, logo_url text);
CREATE TABLE IF NOT EXISTS regions (number int PRIMARY KEY, logo_url text);
INSERT INTO districts (number) SELECT generate_series(1,32) ON CONFLICT DO NOTHING;
INSERT INTO regions (number) SELECT generate_series(1,8) ON CONFLICT DO NOTHING;
GRANT SELECT ON districts, regions TO anon, authenticated;
GRANT ALL ON districts, regions TO service_role;
