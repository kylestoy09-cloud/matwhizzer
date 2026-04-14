-- Non-Public A school profiles — verified via Wikipedia, MaxPreps, official websites
-- Add missing columns
-- APPLIED: 2026-04-01
ALTER TABLE schools ADD COLUMN IF NOT EXISTS tertiary_color text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS town text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS county text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS founded_year integer;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS athletic_conference text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS twitter_handle text;

-- ============================================================
-- 1. Delbarton School
-- Sources: Wikipedia, delbarton.org, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Green Wave',
  primary_color = '#00824B',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'Delbarton',
  town = 'Morristown',
  county = 'Morris',
  founded_year = 1939,
  website_url = 'https://www.delbarton.org',
  athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@delbarton'
WHERE display_name ILIKE 'Delbarton%';

-- ============================================================
-- 2. Bergen Catholic
-- Sources: Wikipedia, bergencatholic.org, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Crusaders',
  primary_color = '#CC0022',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = 'BC',
  town = 'Oradell',
  county = 'Bergen',
  founded_year = 1955,
  website_url = 'https://www.bergencatholic.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@bergencatholic'
WHERE display_name = 'Bergen Catholic';

-- ============================================================
-- 3. Christian Brothers Academy
-- Sources: Wikipedia, cbalincroftnj.org, MaxPreps
-- Colors: CBA website CSS uses #0C2340 (dark navy), MaxPreps #034CB2
-- Using school website value as more authoritative
-- ============================================================
UPDATE schools SET
  mascot = 'Colts',
  primary_color = '#0C2340',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'CBA',
  town = 'Lincroft',
  county = 'Monmouth',
  founded_year = 1959,
  website_url = 'https://www.cbalincroftnj.org',
  athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Christian Brothers Academy';

-- ============================================================
-- 4. Don Bosco Prep
-- Sources: Wikipedia, donboscoprep.org, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Ironmen',
  primary_color = '#8F0018',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'Don Bosco',
  town = 'Ramsey',
  county = 'Bergen',
  founded_year = 1915,
  website_url = 'https://www.donboscoprep.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@donboscoironmen'
WHERE display_name ILIKE 'Don Bosco%';

-- ============================================================
-- 5. Saint Peter's Prep
-- Sources: Wikipedia, spprep.org, MaxPreps
-- Colors: school website CSS uses #840029, MaxPreps #8F0018
-- Using school website value as more authoritative
-- ============================================================
UPDATE schools SET
  mascot = 'Marauders',
  primary_color = '#840029',
  secondary_color = '#737272',
  tertiary_color = NULL,
  nickname = 'St. Peter''s Prep',
  town = 'Jersey City',
  county = 'Hudson',
  founded_year = 1872,
  website_url = 'https://www.spprep.org',
  athletic_conference = 'Hudson County Interscholastic Athletic League',
  twitter_handle = '@spprep'
WHERE display_name ILIKE 'St. Peter%Prep%' OR display_name ILIKE 'Saint Peter%Prep%' OR display_name ILIKE 'St Peter%Prep%';

-- ============================================================
-- 6. Saint Joseph Regional (Montvale)
-- Sources: Wikipedia (explicit hex codes in infobox), saintjosephregional.org
-- ============================================================
UPDATE schools SET
  mascot = 'Green Knights',
  primary_color = '#013220',
  secondary_color = '#CFB53B',
  tertiary_color = NULL,
  nickname = 'SJR',
  town = 'Montvale',
  county = 'Bergen',
  founded_year = 1962,
  website_url = 'https://www.saintjosephregional.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@SJRHighSchool'
WHERE display_name ILIKE 'St Joseph Regional%' OR display_name ILIKE 'Saint Joseph Regional%' OR display_name ILIKE 'St Joseph (Montvale)%';

-- ============================================================
-- 7. Saint Joseph (Metuchen)
-- Sources: Wikipedia, stjoes.org
-- ============================================================
UPDATE schools SET
  mascot = 'Falcons',
  primary_color = '#008000',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'St. Joe''s',
  town = 'Metuchen',
  county = 'Middlesex',
  founded_year = 1961,
  website_url = 'https://www.stjoes.org',
  athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@StJoesMetuchen'
WHERE display_name ILIKE 'St. Joseph Metuchen%' OR display_name ILIKE 'Saint Joseph (Metuchen)%' OR display_name ILIKE 'St. Joseph%Metuchen%';

-- ============================================================
-- 8. Seton Hall Prep
-- Sources: Wikipedia (Royal Blue), shp.org, MaxPreps
-- Wikipedia explicitly uses CSS "Royalblue" = #4169E1
-- ============================================================
UPDATE schools SET
  mascot = 'Pirates',
  primary_color = '#4169E1',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'The Prep',
  town = 'West Orange',
  county = 'Essex',
  founded_year = 1856,
  website_url = 'https://www.shp.org',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@SetonHallPrep'
WHERE display_name ILIKE 'Seton Hall%';

-- ============================================================
-- 9. Paramus Catholic
-- Sources: Wikipedia (explicit hex for gold), paramuscatholic.com
-- ============================================================
UPDATE schools SET
  mascot = 'Paladins',
  primary_color = '#000000',
  secondary_color = '#C5B358',
  tertiary_color = NULL,
  nickname = 'PC',
  town = 'Paramus',
  county = 'Bergen',
  founded_year = 1965,
  website_url = 'https://www.paramuscatholic.com',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@ParamusCathHS'
WHERE display_name = 'Paramus Catholic';

-- ============================================================
-- 10. Notre Dame (Lawrenceville)
-- Sources: Wikipedia, ndnj.org
-- Wikipedia lists Royal Blue, Navy, White
-- ============================================================
UPDATE schools SET
  mascot = 'Irish',
  primary_color = '#4169E1',
  secondary_color = '#000080',
  tertiary_color = '#FFFFFF',
  nickname = NULL,
  town = 'Lawrenceville',
  county = 'Mercer',
  founded_year = 1957,
  website_url = 'https://www.ndnj.org',
  athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@Notre_Dame_HS'
WHERE display_name = 'Notre Dame';

-- ============================================================
-- 11. Paul VI
-- Sources: Wikipedia, pvihs.org, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Eagles',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'PVI',
  town = 'Haddon Township',
  county = 'Camden',
  founded_year = 1966,
  website_url = 'https://www.pvihs.org',
  athletic_conference = 'Olympic Conference',
  twitter_handle = '@PaulVIathletics'
WHERE display_name = 'Paul VI';

-- ============================================================
-- 12. Pingry School
-- Sources: Wikipedia, pingry.org, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Big Blue',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'Pingry',
  town = 'Basking Ridge',
  county = 'Somerset',
  founded_year = 1861,
  website_url = 'https://www.pingry.org',
  athletic_conference = 'Skyland Conference',
  twitter_handle = '@PingryAthletics'
WHERE display_name ILIKE 'Pingry%';

-- ============================================================
-- 13. Saint Benedict's Prep
-- Sources: Wikipedia, sbp.org (CSS: #752828 garnet, #7F8588 gray)
-- Using school website CSS values as most authoritative
-- ============================================================
UPDATE schools SET
  mascot = 'Gray Bees',
  primary_color = '#752828',
  secondary_color = '#7F8588',
  tertiary_color = NULL,
  nickname = 'SBP',
  town = 'Newark',
  county = 'Essex',
  founded_year = 1868,
  website_url = 'https://www.sbp.org',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@StBenedictsNJ'
WHERE display_name ILIKE 'St. Benedict%' OR display_name ILIKE 'St Benedict%' OR display_name ILIKE 'Saint Benedict%';

-- ============================================================
-- 14. Saint Augustine Prep
-- Sources: Wikipedia, hermits.com, MaxPreps
-- ============================================================
UPDATE schools SET
  mascot = 'Hermits',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'St. Aug''s',
  town = 'Richland',
  county = 'Atlantic',
  founded_year = 1959,
  website_url = 'https://www.hermits.com',
  athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@HermitAthletics'
WHERE display_name ILIKE 'St. Augustine%' OR display_name ILIKE 'Saint Augustine%';

-- ============================================================
-- 15. Saint John Vianney
-- Sources: Wikipedia, sjvhs.com, MaxPreps
-- Wikipedia lists Black, Gold, White (three colors)
-- ============================================================
UPDATE schools SET
  mascot = 'Lancers',
  primary_color = '#222222',
  secondary_color = '#C8880A',
  tertiary_color = '#FFFFFF',
  nickname = 'SJV',
  town = 'Holmdel',
  county = 'Monmouth',
  founded_year = 1969,
  website_url = 'https://www.sjvhs.com',
  athletic_conference = 'Shore Conference',
  twitter_handle = '@SJVHS'
WHERE display_name ILIKE 'Saint John Vianney%' OR display_name ILIKE 'St. John Vianney%';

-- ROLLBACK:
-- -- Column drops (only needed once — all batches share these columns):
-- ALTER TABLE schools DROP COLUMN IF EXISTS tertiary_color;
-- ALTER TABLE schools DROP COLUMN IF EXISTS nickname;
-- ALTER TABLE schools DROP COLUMN IF EXISTS town;
-- ALTER TABLE schools DROP COLUMN IF EXISTS county;
-- ALTER TABLE schools DROP COLUMN IF EXISTS founded_year;
-- ALTER TABLE schools DROP COLUMN IF EXISTS website_url;
-- ALTER TABLE schools DROP COLUMN IF EXISTS athletic_conference;
-- ALTER TABLE schools DROP COLUMN IF EXISTS twitter_handle;
-- -- NOTE: All school profile data from all 14 batches will be lost.
