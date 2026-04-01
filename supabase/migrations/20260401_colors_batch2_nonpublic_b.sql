-- Non-Public B school profiles — verified via Wikipedia, MaxPreps, official websites

-- ============================================================
-- 1. Camden Catholic
-- Sources: Wikipedia, camdencatholic.org, MaxPreps
-- MaxPreps: Green #00824B, White
-- ============================================================
UPDATE schools SET
  mascot = 'Fighting Irish',
  primary_color = '#00824B',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Cherry Hill',
  county = 'Camden',
  founded_year = 1887,
  website_url = 'https://www.camdencatholic.org',
  athletic_conference = 'Olympic Conference',
  twitter_handle = '@camdencatholic'
WHERE display_name = 'Camden Catholic';

-- ============================================================
-- 2. DePaul Catholic
-- Sources: Wikipedia, depaulcatholic.org, athletics site CSS #025B40
-- ============================================================
UPDATE schools SET
  mascot = 'Spartans',
  primary_color = '#025B40',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'DePaul',
  town = 'Wayne',
  county = 'Passaic',
  founded_year = 1956,
  website_url = 'https://www.depaulcatholic.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@depaulcatholic'
WHERE display_name ILIKE 'Depaul Catholic%' OR display_name ILIKE 'DePaul Catholic%';

-- ============================================================
-- 3. Gloucester Catholic
-- Sources: Wikipedia, gchsrams.org, MaxPreps
-- MaxPreps: Maroon #8F0018, Gold #C8880A
-- ============================================================
UPDATE schools SET
  mascot = 'Rams',
  primary_color = '#8F0018',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Gloucester City',
  county = 'Camden',
  founded_year = 1926,
  website_url = 'https://gchsrams.org',
  athletic_conference = 'Tri-County Conference',
  twitter_handle = '@GCHSRams'
WHERE display_name = 'Gloucester Catholic';

-- ============================================================
-- 4. Holy Cross Prep
-- Sources: Wikipedia, hcprep.org, MaxPreps
-- MaxPreps: Maroon #8F0018, Gray #454444
-- ============================================================
UPDATE schools SET
  mascot = 'Lancers',
  primary_color = '#8F0018',
  secondary_color = '#454444',
  tertiary_color = NULL,
  nickname = 'Holy Cross Prep',
  town = 'Delran',
  county = 'Burlington',
  founded_year = 1957,
  website_url = 'https://www.hcprep.org',
  athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@hcpreplancers'
WHERE display_name ILIKE 'Holy Cross%';

-- ============================================================
-- 5. Holy Spirit
-- Sources: Wikipedia (explicit hex: Navy #000080, Vegas Gold #C5B358),
--          holyspirithighschool.com
-- Using Wikipedia hex values as they are explicit
-- ============================================================
UPDATE schools SET
  mascot = 'Spartans',
  primary_color = '#000080',
  secondary_color = '#C5B358',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Absecon',
  county = 'Atlantic',
  founded_year = 1922,
  website_url = 'https://www.holyspirithighschool.com',
  athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@HSHS_Athletics'
WHERE display_name = 'Holy Spirit';

-- ============================================================
-- 6. Immaculata
-- Sources: Wikipedia (explicit hex: Blue #002856, White),
--          immaculatahighschool.org
-- ============================================================
UPDATE schools SET
  mascot = 'Spartans',
  primary_color = '#002856',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Somerville',
  county = 'Somerset',
  founded_year = 1962,
  website_url = 'https://www.immaculatahighschool.org',
  athletic_conference = 'Skyland Conference',
  twitter_handle = '@ImmaculataHSNJ'
WHERE display_name = 'Immaculata';

-- ============================================================
-- 7. Red Bank Catholic
-- Sources: Wikipedia (Green #228B22, Gold), MaxPreps (#00824B, #C8880A)
--          redbankcatholic.org
-- Using Wikipedia hex for green, MaxPreps for gold
-- ============================================================
UPDATE schools SET
  mascot = 'Caseys',
  primary_color = '#228B22',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = 'RBC',
  town = 'Red Bank',
  county = 'Monmouth',
  founded_year = 1927,
  website_url = 'https://www.redbankcatholic.org',
  athletic_conference = 'Shore Conference',
  twitter_handle = '@RBCCaseys'
WHERE display_name ILIKE 'Red Bank Catholic%';

-- ============================================================
-- 8. Rutgers Prep
-- Sources: Wikipedia (Maroon, White), MaxPreps (#8F0018)
--          rutgersprep.org
-- ============================================================
UPDATE schools SET
  mascot = 'Argonauts',
  primary_color = '#8F0018',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'Rutgers Prep',
  town = 'Somerset',
  county = 'Somerset',
  founded_year = 1766,
  website_url = 'https://www.rutgersprep.org',
  athletic_conference = 'Skyland Conference',
  twitter_handle = '@RPSathletics'
WHERE display_name ILIKE 'Rutgers Prep%';

-- ============================================================
-- 9. Saint Mary's (Rutherford)
-- Sources: MaxPreps (Blue #034CB2, White), stmaryhs.org
-- Silver listed by spirit wear vendor but no verified hex
-- ============================================================
UPDATE schools SET
  mascot = 'Gaels',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'St. Mary''s',
  town = 'Rutherford',
  county = 'Bergen',
  founded_year = 1929,
  website_url = 'https://www.stmaryhs.org',
  athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@smhsrutherford'
WHERE display_name ILIKE 'St. Mary%' OR display_name ILIKE 'Saint Mary%';

-- ============================================================
-- 10. Saint Thomas Aquinas (Edison)
-- Sources: Wikipedia, stahs.net, MaxPreps (Scarlet #CC0022, White)
-- Formerly Bishop George Ahr HS; renamed 2019
-- ============================================================
UPDATE schools SET
  mascot = 'Trojans',
  primary_color = '#CC0022',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'STA',
  town = 'Edison',
  county = 'Middlesex',
  founded_year = 1969,
  website_url = 'https://www.stahs.net',
  athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@stahstrojans'
WHERE display_name ILIKE 'Saint Thomas Aquinas%' OR display_name ILIKE 'St. Thomas Aquinas%';

-- ============================================================
-- 11. Pope John XXIII
-- Sources: Wikipedia, popejohn.org, athletics site config
-- Athletics site: Navy #000080, White, Gold #5C4E00
-- ============================================================
UPDATE schools SET
  mascot = 'Lions',
  primary_color = '#000080',
  secondary_color = '#FFFFFF',
  tertiary_color = '#5C4E00',
  nickname = 'Pope John',
  town = 'Sparta',
  county = 'Sussex',
  founded_year = 1956,
  website_url = 'https://www.popejohn.org',
  athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@PopeJohnLions'
WHERE display_name = 'Pope John XXIII';

-- ============================================================
-- 12. Saint Joseph Academy (Hammonton)
-- Sources: Wikipedia, stjosephacademy.com, MaxPreps
-- NOTE: Colors uncertain — MaxPreps says Red/White but website
-- uses navy/gold. Using MaxPreps data with caution.
-- Successor to St. Joseph HS (est. 1942), reopened 2020 as Academy
-- ============================================================
UPDATE schools SET
  mascot = 'Wildcats',
  primary_color = NULL,
  secondary_color = NULL,
  tertiary_color = NULL,
  nickname = 'SJA',
  town = 'Hammonton',
  county = 'Atlantic',
  founded_year = 2020,
  website_url = 'https://www.stjosephacademy.com',
  athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@SJA_HammontonNJ'
WHERE display_name ILIKE 'St. Joseph%Hammonton%' OR display_name ILIKE 'Saint Joseph%Academy%';
