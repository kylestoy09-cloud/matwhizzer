-- North I Groups 4 & 5 school profiles — verified via Wikipedia, MaxPreps, official websites

-- ============================================================
-- NORTH I - GROUP 5
-- ============================================================

-- 1. Bloomfield — Sources: Wikipedia, MaxPreps
-- APPLIED: 2026-04-01
UPDATE schools SET
  mascot = 'Bengals',
  primary_color = '#CC0022',
  secondary_color = '#454444',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Bloomfield',
  county = 'Essex',
  founded_year = 1871,
  website_url = 'https://bhs.bloomfield.k12.nj.us',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@07003BHS'
WHERE display_name = 'Bloomfield';

-- 2. East Orange Campus — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Jaguars',
  primary_color = '#CC0022',
  secondary_color = '#034CB2',
  tertiary_color = '#737272',
  nickname = NULL,
  town = 'East Orange',
  county = 'Essex',
  founded_year = 2002,
  website_url = 'https://campus.eastorange.k12.nj.us',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@eocathletics'
WHERE display_name = 'East Orange Campus';

-- 3. Eastside (Paterson) — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Ghosts',
  primary_color = '#034CB2',
  secondary_color = '#CC4E10',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Paterson',
  county = 'Passaic',
  founded_year = 1926,
  website_url = 'https://ehs.paterson.k12.nj.us',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@GhostAthletics_'
WHERE display_name ILIKE 'Eastside%Paterson%';

-- 4. JFK Paterson — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Knights',
  primary_color = '#CC0022',
  secondary_color = '#222222',
  tertiary_color = NULL,
  nickname = 'Kennedy',
  town = 'Paterson',
  county = 'Passaic',
  founded_year = 1965,
  website_url = 'https://jfk.paterson.k12.nj.us',
  athletic_conference = 'Big North Conference',
  twitter_handle = NULL
WHERE display_name = 'John F. Kennedy' OR display_name ILIKE 'JFK-Paterson%' OR display_name ILIKE 'John F. Kennedy Patterson%';

-- 5. Livingston — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Lancers',
  primary_color = '#1F331F',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Livingston',
  county = 'Essex',
  founded_year = 1954,
  website_url = 'https://lhs.livingston.org',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = NULL
WHERE display_name = 'Livingston';

-- 6. Montclair — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mounties',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Montclair',
  county = 'Essex',
  founded_year = 1886,
  website_url = 'https://mhs.montclair.k12.nj.us',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@mhsmounties'
WHERE display_name = 'Montclair';

-- 7. Morristown — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Colonials',
  primary_color = '#8F0018',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Morristown',
  county = 'Morris',
  founded_year = 1869,
  website_url = 'https://mhs.morrisschooldistrict.org',
  athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@MHSColonials'
WHERE display_name = 'Morristown';

-- 8. North Bergen — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bruins',
  primary_color = '#CC0022',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'North Bergen',
  county = 'Hudson',
  founded_year = 1961,
  website_url = 'https://nbhs.northbergen.k12.nj.us',
  athletic_conference = 'Hudson County Interscholastic League',
  twitter_handle = '@NBHS_Bruins'
WHERE display_name = 'North Bergen';

-- 9. Passaic County Technical Institute — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bulldogs',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = 'PCTI',
  town = 'Wayne',
  county = 'Passaic',
  founded_year = 1917,
  website_url = 'https://www.pctvs.org/o/pcti',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@PCTI1'
WHERE display_name ILIKE 'Passaic County Technical%' OR display_name ILIKE 'Passaic Co Tech%';

-- 10. Passaic — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Indians',
  primary_color = '#CC0022',
  secondary_color = '#034CB2',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Passaic',
  county = 'Passaic',
  founded_year = 1873,
  website_url = 'https://passaicschools.org/phs',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@phspassaic'
WHERE display_name = 'Passaic';

-- 11. Union City — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Soaring Eagles',
  primary_color = '#000080',
  secondary_color = '#C0C0C0',
  tertiary_color = '#FFFFFF',
  nickname = NULL,
  town = 'Union City',
  county = 'Hudson',
  founded_year = 2008,
  website_url = 'https://uchs.ucboe.us',
  athletic_conference = 'Hudson County Interscholastic League',
  twitter_handle = NULL
WHERE display_name = 'Union City';

-- 12. West Orange — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Mountaineers',
  primary_color = '#005580',
  secondary_color = '#0055A0',
  tertiary_color = '#000000',
  nickname = 'WOHS',
  town = 'West Orange',
  county = 'Essex',
  founded_year = 1898,
  website_url = 'https://wohs.woboe.org',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@wohssportsnj'
WHERE display_name = 'West Orange';

-- ============================================================
-- NORTH I - GROUP 4
-- ============================================================

-- 13. Belleville — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Buccaneers',
  primary_color = '#034CB2',
  secondary_color = '#C8880A',
  tertiary_color = '#FFFFFF',
  nickname = 'Bucs',
  town = 'Belleville',
  county = 'Essex',
  founded_year = NULL,
  website_url = 'https://hs.bellevilleschools.org/o/bhs',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@BellevilleBucs'
WHERE display_name = 'Belleville';

-- 14. Clifton — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mustangs',
  primary_color = '#8F0018',
  secondary_color = '#454444',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Clifton',
  county = 'Passaic',
  founded_year = 1906,
  website_url = 'https://www.clifton.k12.nj.us/clifton-high-school',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@mustangs_chs'
WHERE display_name = 'Clifton';

-- 15. Fair Lawn — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Cutters',
  primary_color = '#52000E',
  secondary_color = '#454444',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Fair Lawn',
  county = 'Bergen',
  founded_year = 1943,
  website_url = 'https://flhs.fairlawnschools.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@FLHSCUTTERS'
WHERE display_name = 'Fair Lawn';

-- 16. Garfield — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Boilermakers',
  primary_color = '#754ACC',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Garfield',
  county = 'Bergen',
  founded_year = 1956,
  website_url = 'https://www.gboe.org',
  athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@BoilermakersGHS'
WHERE display_name = 'Garfield';

-- 17. Hackensack — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Comets',
  primary_color = '#034CB2',
  secondary_color = '#C8880A',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Hackensack',
  county = 'Bergen',
  founded_year = 1894,
  website_url = 'https://www.hackensackschools.org/highschool',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@HPSComets'
WHERE display_name = 'Hackensack';

-- 18. Millburn — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Millers',
  primary_color = '#034CB2',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Millburn',
  county = 'Essex',
  founded_year = 1892,
  website_url = 'https://mhs.millburn.org',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@mhsmillers'
WHERE display_name = 'Millburn';

-- 19. Morris Knolls — Sources: Wikipedia, en-academic
UPDATE schools SET
  mascot = 'Golden Eagles',
  primary_color = '#006400',
  secondary_color = '#FFD700',
  tertiary_color = NULL,
  nickname = 'Knolls',
  town = 'Denville',
  county = 'Morris',
  founded_year = 1964,
  website_url = 'https://mk.mhrd.org',
  athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@MorrisKnollsHS'
WHERE display_name = 'Morris Knolls';

-- 20. Mount Olive — Sources: Wikipedia, MaxPreps, Alchetron
UPDATE schools SET
  mascot = 'Marauders',
  primary_color = '#CC0022',
  secondary_color = '#FFD700',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Flanders',
  county = 'Morris',
  founded_year = 1972,
  website_url = 'https://mohs.motsd.org',
  athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@MOHSMarauders'
WHERE display_name ILIKE 'Mt. Olive%' OR display_name ILIKE 'Mount Olive%';

-- 21. Northern Highlands — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Highlanders',
  primary_color = '#CC0022',
  secondary_color = '#222222',
  tertiary_color = '#FFFFFF',
  nickname = NULL,
  town = 'Allendale',
  county = 'Bergen',
  founded_year = 1965,
  website_url = 'https://www.northernhighlands.org',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@nhrhs1'
WHERE display_name ILIKE 'Northern Highlands%';

-- 22. Orange — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tornadoes',
  primary_color = '#CC4E10',
  secondary_color = '#222222',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Orange',
  county = 'Essex',
  founded_year = 1869,
  website_url = 'https://ohs.orange.k12.nj.us',
  athletic_conference = 'Super Essex Conference',
  twitter_handle = '@OHS_Tornadoes'
WHERE display_name = 'Orange';

-- 23. Phillipsburg — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Stateliners',
  primary_color = '#52000E',
  secondary_color = '#454444',
  tertiary_color = NULL,
  nickname = 'P''burg',
  town = 'Phillipsburg',
  county = 'Warren',
  founded_year = 1871,
  website_url = 'https://phs.pburgsd.net',
  athletic_conference = 'Skyland Conference',
  twitter_handle = '@statelinerphs'
WHERE display_name = 'Phillipsburg';

-- 24. Ridge — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Red Devils',
  primary_color = '#00824B',
  secondary_color = '#FFFFFF',
  tertiary_color = '#000000',
  nickname = NULL,
  town = 'Basking Ridge',
  county = 'Somerset',
  founded_year = 1961,
  website_url = 'https://ridgehigh.bernardsboe.com',
  athletic_conference = 'Skyland Conference',
  twitter_handle = '@ridge_high'
WHERE display_name = 'Ridge';

-- 25. Ridgewood — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Maroons',
  primary_color = '#76232F',
  secondary_color = '#FFFFFF',
  tertiary_color = '#000000',
  nickname = NULL,
  town = 'Ridgewood',
  county = 'Bergen',
  founded_year = 1892,
  website_url = 'https://rhs.rpsnj.us',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@Maroon_Sports'
WHERE display_name = 'Ridgewood';

-- 26. Teaneck — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Highwaymen',
  primary_color = '#0000AE',
  secondary_color = '#FFFFFF',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Teaneck',
  county = 'Bergen',
  founded_year = 1922,
  website_url = 'https://www.teaneckschools.org/teaneckhighschool_home.aspx',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@TeaneckHigh'
WHERE display_name = 'Teaneck';

-- 27. Cliffside Park — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Red Raiders',
  primary_color = '#FF0000',
  secondary_color = '#000000',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Cliffside Park',
  county = 'Bergen',
  founded_year = NULL,
  website_url = 'https://www.cliffsidepark.edu/163748_3',
  athletic_conference = 'Big North Conference',
  twitter_handle = '@CPHS_Athletics'
WHERE display_name = 'Cliffside Park';

-- 28. Lyndhurst — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Golden Bears',
  primary_color = '#0000FF',
  secondary_color = '#FFD700',
  tertiary_color = NULL,
  nickname = NULL,
  town = 'Lyndhurst',
  county = 'Bergen',
  founded_year = 1926,
  website_url = 'https://lhs.lyndhurstschools.net',
  athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@WeAreLyndhurst'
WHERE display_name ILIKE 'Lyndhurst%';

-- Also update Leonia (combined with Palisades Park in database)
UPDATE schools SET
  town = 'Leonia',
  county = 'Bergen',
  athletic_conference = 'Big North Conference'
WHERE display_name ILIKE 'Leonia%';

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
