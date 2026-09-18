-- ─────────────────────────────────────────────────────────────────────────────
-- Boys and girls competitive school data — fully separate tables.
-- No shared tables. No gender column discriminators.
-- Old tables (districts, regions, school_districts, school_regions,
-- school_conferences, coaches) are kept for safety and can be dropped
-- after verifying the new tables are correct.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Lookup tables ─────────────────────────────────────────────────────────

CREATE TABLE boys_districts (
  id   integer PRIMARY KEY,
  name text NOT NULL
);
-- Existing districts table holds all 32 boys districts
INSERT INTO boys_districts (id, name) SELECT id, name FROM districts;

CREATE TABLE girls_districts (
  id   serial PRIMARY KEY,
  name text NOT NULL
);
-- Girls districts must be entered — no existing data to migrate
-- (32 boys districts ≠ 12 girls districts; they are completely separate)

CREATE TABLE boys_regions (
  id   integer PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO boys_regions (id, name)
SELECT id, name FROM regions WHERE gender = 'M';

CREATE TABLE girls_regions (
  id   integer PRIMARY KEY,
  name text NOT NULL
);
INSERT INTO girls_regions (id, name)
SELECT id, name FROM regions WHERE gender = 'F';

-- ── 2. Assignment tables (school ↔ season ↔ lookup) ─────────────────────────

CREATE TABLE boys_school_districts (
  school_id   integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id   integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  district_id integer NOT NULL REFERENCES boys_districts(id),
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX bsd_district_season_idx ON boys_school_districts (district_id, season_id);
-- Migrate existing school_districts — all existing assignments are boys
INSERT INTO boys_school_districts (school_id, season_id, district_id)
SELECT school_id, season_id, district_id FROM school_districts
ON CONFLICT DO NOTHING;

CREATE TABLE girls_school_districts (
  school_id   integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id   integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  district_id integer NOT NULL REFERENCES girls_districts(id),
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX gsd_district_season_idx ON girls_school_districts (district_id, season_id);

CREATE TABLE boys_school_regions (
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  region_id integer NOT NULL REFERENCES boys_regions(id),
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX bsr_region_season_idx ON boys_school_regions (region_id, season_id);
INSERT INTO boys_school_regions (school_id, season_id, region_id)
SELECT sr.school_id, sr.season_id, sr.region_id
FROM school_regions sr
JOIN regions r ON r.id = sr.region_id
WHERE r.gender = 'M'
ON CONFLICT DO NOTHING;

CREATE TABLE girls_school_regions (
  school_id integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  region_id integer NOT NULL REFERENCES girls_regions(id),
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX gsr_region_season_idx ON girls_school_regions (region_id, season_id);
INSERT INTO girls_school_regions (school_id, season_id, region_id)
SELECT sr.school_id, sr.season_id, sr.region_id
FROM school_regions sr
JOIN regions r ON r.id = sr.region_id
WHERE r.gender = 'F'
ON CONFLICT DO NOTHING;

CREATE TABLE boys_school_conferences (
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  conference text    NOT NULL,
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX bsc_conf_season_idx ON boys_school_conferences (conference, season_id);
-- Existing school_conferences are all boys
INSERT INTO boys_school_conferences (school_id, season_id, conference)
SELECT school_id, season_id, conference FROM school_conferences
ON CONFLICT DO NOTHING;

CREATE TABLE girls_school_conferences (
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  conference text    NOT NULL,
  PRIMARY KEY (school_id, season_id)
);
CREATE INDEX gsc_conf_season_idx ON girls_school_conferences (conference, season_id);

-- ── 3. Program profiles (section + classification per program) ────────────────

CREATE TABLE boys_school_profiles (
  school_id      integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE PRIMARY KEY,
  section        text,
  classification text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
INSERT INTO boys_school_profiles (school_id, section, classification)
SELECT id, section, classification FROM schools WHERE is_nj = true
ON CONFLICT DO NOTHING;

CREATE TABLE girls_school_profiles (
  school_id      integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE PRIMARY KEY,
  section        text,
  classification text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- Girls section/classification backfilled from schools as a starting point;
-- admins should correct where programs differ
INSERT INTO girls_school_profiles (school_id, section, classification)
SELECT id, section, classification FROM schools WHERE is_nj = true
ON CONFLICT DO NOTHING;

-- ── 4. Coaches ────────────────────────────────────────────────────────────────

CREATE TABLE boys_coaches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer REFERENCES seasons(id),
  name       text NOT NULL,
  title      text NOT NULL DEFAULT 'Head Coach',
  email      text,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bc_school_season_idx ON boys_coaches (school_id, season_id);
-- Migrate existing coaches — all assumed boys (system was boys-first)
INSERT INTO boys_coaches (id, school_id, season_id, name, title, email, phone, is_active, created_at, updated_at)
SELECT id, school_id, season_id, name, title, email, phone, is_active, created_at, updated_at
FROM coaches
ON CONFLICT DO NOTHING;

CREATE TABLE girls_coaches (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  integer NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  season_id  integer REFERENCES seasons(id),
  name       text NOT NULL,
  title      text NOT NULL DEFAULT 'Head Coach',
  email      text,
  phone      text,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gc_school_season_idx ON girls_coaches (school_id, season_id);

-- ── 5. RLS for all new tables ─────────────────────────────────────────────────

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'boys_districts','girls_districts',
    'boys_regions','girls_regions',
    'boys_school_districts','girls_school_districts',
    'boys_school_regions','girls_school_regions',
    'boys_school_conferences','girls_school_conferences',
    'boys_school_profiles','girls_school_profiles',
    'boys_coaches','girls_coaches'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      t
    );
    EXECUTE format(
      'CREATE POLICY "public_read" ON %I FOR SELECT TO anon, authenticated USING (true)',
      t
    );
    EXECUTE format('GRANT ALL ON %I TO service_role', t);
    EXECUTE format('GRANT SELECT ON %I TO anon, authenticated', t);
  END LOOP;
END $$;

-- girls_districts uses a serial id, so grant its sequence
GRANT USAGE, SELECT ON SEQUENCE girls_districts_id_seq TO service_role, anon, authenticated;
