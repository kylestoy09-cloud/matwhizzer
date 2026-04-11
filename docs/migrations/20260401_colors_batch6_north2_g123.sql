-- North II Groups 1, 2 & 3 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- NORTH II - GROUP 3
-- ============================================================

-- 1. Carteret — Sources: Wikipedia, MaxPreps
-- APPLIED: 2026-04-01
UPDATE schools SET
  mascot = 'Ramblers', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Carteret', county = 'Middlesex', founded_year = NULL,
  website_url = 'https://www.carteretschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@CarteretSchools'
WHERE display_name = 'Carteret';

-- 2. Cranford — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Cranford', county = 'Union', founded_year = 1902,
  website_url = 'https://chs.cranfordschools.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@CranfordCougars'
WHERE display_name = 'Cranford';

-- 3. David Brearley — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bears', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'Brearley', town = 'Kenilworth', county = 'Union', founded_year = 1966,
  website_url = 'https://www.kenilworthschools.com/schools/david_brearley_high_school', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@brearleysports'
WHERE display_name ILIKE 'Brearley%' OR display_name ILIKE 'David Brearley%';

-- 4. Fort Lee — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bridgemen', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Fort Lee', county = 'Bergen', founded_year = 1916,
  website_url = 'https://flhs.flboe.com', athletic_conference = 'Big North Conference',
  twitter_handle = '@FortLeeAD'
WHERE display_name = 'Fort Lee';

-- 5. Morris Hills — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Scarlet Knights', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Rockaway', county = 'Morris', founded_year = 1953,
  website_url = 'https://mh.mhrd.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@mhillsathletics'
WHERE display_name = 'Morris Hills';

-- 6. North Plainfield — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Canucks', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'North Plainfield', county = 'Somerset', founded_year = 1925,
  website_url = 'https://nphs.nplainfield.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@NP_Athletics'
WHERE display_name = 'North Plainfield';

-- 7. Nutley — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Maroon Raiders', primary_color = '#8F0018', secondary_color = '#454444', tertiary_color = NULL,
  nickname = 'Raiders', town = 'Nutley', county = 'Essex', founded_year = NULL,
  website_url = 'https://www.nutleyschools.org/schools/nhs', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@NutleyAthletics'
WHERE display_name = 'Nutley';

-- 8. Passaic Valley — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hornets', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'PV', town = 'Little Falls', county = 'Passaic', founded_year = 1940,
  website_url = 'https://www.pvrhs.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@PVHornets'
WHERE display_name = 'Passaic Valley';

-- 9. Randolph — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Rams', primary_color = '#022D58', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Randolph', county = 'Morris', founded_year = 1961,
  website_url = 'https://www.rtnj.org/our-schools/randolph-high-school', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@rhsramssports'
WHERE display_name ILIKE 'Randolph%';

-- 10. Roxbury — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Gaels', primary_color = '#00205C', secondary_color = '#D7B882', tertiary_color = NULL,
  nickname = NULL, town = 'Succasunna', county = 'Morris', founded_year = 1903,
  website_url = 'https://rhs.roxbury.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@roxburyhs'
WHERE display_name = 'Roxbury';

-- 11. South Plainfield — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tigers', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'SPHS', town = 'South Plainfield', county = 'Middlesex', founded_year = NULL,
  website_url = 'https://www.spboe.org/o/sphs', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@SoPlfdAthletics'
WHERE display_name = 'South Plainfield';

-- 12. Warren Hills Regional — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Blue Streaks', primary_color = '#4169E1', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Washington', county = 'Warren', founded_year = 1967,
  website_url = 'https://hs.warrenhills.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@WHRHighSchool'
WHERE display_name ILIKE 'Warren Hills%';

-- 13. West Essex Regional — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Knights', primary_color = '#FF1A24', secondary_color = '#000000', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'North Caldwell', county = 'Essex', founded_year = 1960,
  website_url = 'https://hs.westex.org', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@WEAthletics'
WHERE display_name ILIKE 'West Essex%';

-- 14. West Morris Central — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Wolfpack', primary_color = '#808080', secondary_color = '#000080', tertiary_color = NULL,
  nickname = 'WMC', town = 'Chester', county = 'Morris', founded_year = 1958,
  website_url = 'https://www.wmchs.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = NULL
WHERE display_name = 'West Morris Central';

-- 15. West Morris Mendham — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Minutemen', primary_color = '#AD0B0E', secondary_color = '#023051', tertiary_color = '#FFFFFF',
  nickname = 'Mendham', town = 'Mendham', county = 'Morris', founded_year = 1970,
  website_url = 'https://www.wmmhs.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@wmmathletics'
WHERE display_name ILIKE 'West Morris%Mendham%' OR display_name ILIKE 'West Morris ( Mendham)%';

-- ============================================================
-- NORTH II - GROUP 2
-- ============================================================

-- 16. Abraham Clark — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Roselle', county = 'Union', founded_year = NULL,
  website_url = 'https://www.roselleschools.org/achs', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = NULL
WHERE display_name = 'Abraham Clark';

-- 17. Bernards — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mountaineers', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Bernardsville', county = 'Somerset', founded_year = 1905,
  website_url = 'https://bhs.shsd.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@BernardsHS'
WHERE display_name = 'Bernards';

-- 18. Elmwood Park Memorial — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Crusaders', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Elmwood Park', county = 'Bergen', founded_year = 1954,
  website_url = 'https://hs.elmwoodparkschools.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@EPPS_HighSchool'
WHERE display_name ILIKE 'Elmwood Park%';

-- 19. Governor Livingston — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Highlanders', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = 'GL', town = 'Berkeley Heights', county = 'Union', founded_year = 1960,
  website_url = 'https://www.bhpsnj.org/livingston', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Governor Livingston%';

-- 20. Hackettstown — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tigers', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Hackettstown', county = 'Warren', founded_year = NULL,
  website_url = 'https://hhs.hackettstown.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = NULL
WHERE display_name = 'Hackettstown';

-- 21. Hillside — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Comets', primary_color = '#8F0018', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Hillside', county = 'Union', founded_year = 1940,
  website_url = 'https://hhs.hillsidek12.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Hillside%';

-- 22. James Caldwell — Sources: Wikipedia, Prep Sportswear (Pantone 286 C)
UPDATE schools SET
  mascot = 'Chiefs', primary_color = '#0039A6', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'JCHS', town = 'West Caldwell', county = 'Essex', founded_year = 1960,
  website_url = 'https://www.cwcboe.org/o/jchs', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@CWCJCHS'
WHERE display_name = 'Caldwell' OR display_name ILIKE 'James Caldwell%';

-- 23. Madison — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Dodgers', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Madison', county = 'Morris', founded_year = 1958,
  website_url = 'https://www.madisonpublicschools.org/o/mhs', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@DodgerAthletics'
WHERE display_name = 'Madison';

-- 24. Parsippany — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Red Hawks', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Parsippany', county = 'Morris', founded_year = 1957,
  website_url = 'https://phs.pthsd.k12.nj.us', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = NULL
WHERE display_name = 'Parsippany';

-- 25. Parsippany Hills — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#034CB2', secondary_color = '#000000', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Morris Plains', county = 'Morris', founded_year = 1969,
  website_url = 'https://phhs.pthsd.k12.nj.us', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@ParHillsHS'
WHERE display_name ILIKE 'Parsippany Hills%' AND display_name NOT ILIKE '%/%';

-- 26. Voorhees — Sources: Wikipedia, MaxPreps CSS
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#CC0022', secondary_color = '#FFB81C', tertiary_color = NULL,
  nickname = NULL, town = 'Glen Gardner', county = 'Hunterdon', founded_year = 1975,
  website_url = 'https://www.nhvweb.net/vhs/home', athletic_conference = 'Skyland Conference',
  twitter_handle = '@VOO_Athletics'
WHERE display_name ILIKE 'Voorhees%';

-- ============================================================
-- NORTH II - GROUP 1
-- ============================================================

-- 27. Belvidere — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'County Seaters', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Belvidere', county = 'Warren', founded_year = NULL,
  website_url = 'https://bhs.belvideresd.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@BHSSeaters'
WHERE display_name = 'Belvidere';

-- 28. Cedar Grove — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Cedar Grove', county = 'Essex', founded_year = 1961,
  website_url = 'https://www.cgschools.org/o/cghs', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@cghs_athletics'
WHERE display_name = 'Cedar Grove';

-- 29. Glen Ridge — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Ridgers', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Glen Ridge', county = 'Essex', founded_year = 1900,
  website_url = 'https://grhs.glenridge.org', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@ridgersgr'
WHERE display_name = 'Glen Ridge';

-- 30. Hanover Park — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hornets', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'East Hanover', county = 'Morris', founded_year = 1956,
  website_url = 'https://www.hanoverpark.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@HanoverParkHS1'
WHERE display_name ILIKE 'Hanover Park%';

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
