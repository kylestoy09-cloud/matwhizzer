-- Central Group 3 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- 1. Allentown — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Redbirds', primary_color = '#CC0022', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Allentown', county = 'Monmouth', founded_year = 1924,
  website_url = 'https://ahs.ufrsd.net', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@ATownRedbirds'
WHERE display_name = 'Allentown';

-- 2. Bordentown — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Scotties', primary_color = '#000000', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Bordentown', county = 'Burlington', founded_year = 1965,
  website_url = 'https://brhs.bordentown.k12.nj.us', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@BRHSAthletics'
WHERE display_name ILIKE 'Bordentown%' AND display_name NOT ILIKE '%/%';

-- 3. Brick Memorial — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#00341E', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Brick', county = 'Ocean', founded_year = 1980,
  website_url = 'https://www.brickschools.org/bmhs', athletic_conference = 'Shore Conference',
  twitter_handle = '@BrickMemorialHS'
WHERE display_name = 'Brick Memorial';

-- 4. Brick Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Green Dragons', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Brick', county = 'Ocean', founded_year = 1958,
  website_url = 'https://www.brickschools.org/bths', athletic_conference = 'Shore Conference',
  twitter_handle = '@BTHS_SPORTS'
WHERE display_name = 'Brick Township';

-- 5. Burlington Township — Sources: Wikipedia, Burlington Co Football Club (3 colors)
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#000000', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Burlington Township', county = 'Burlington', founded_year = 1964,
  website_url = 'https://hs.burltwpsch.org', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@bthsathletics'
WHERE display_name = 'Burlington Township';

-- 6. Ewing — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Ewing', county = 'Mercer', founded_year = 1951,
  website_url = 'https://ehs.ewing.k12.nj.us', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@EwingAthletics'
WHERE display_name = 'Ewing';

-- 7. Hamilton North (Nottingham) — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Northstars', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'Nottingham', town = 'Hamilton', county = 'Mercer', founded_year = NULL,
  website_url = 'https://hhn.htsdnj.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@NorthstarsAD'
WHERE display_name ILIKE 'Hamilton North%';

-- 8. Hopewell Valley — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#080206', secondary_color = '#FAD703', tertiary_color = NULL,
  nickname = NULL, town = 'Pennington', county = 'Mercer', founded_year = 1907,
  website_url = 'https://hvchs.hvrsd.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@HVCentralHS'
WHERE display_name ILIKE 'Hopewell Valley%';

-- 9. Lawrence — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Cardinals', primary_color = '#BF0000', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Lawrenceville', county = 'Mercer', founded_year = 1966,
  website_url = 'https://lhs.ltps.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@CardinalsLHS'
WHERE display_name ILIKE 'Lawrence%';

-- 10. Matawan Regional — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Huskies', primary_color = '#580615', secondary_color = '#818181', tertiary_color = NULL,
  nickname = NULL, town = 'Aberdeen', county = 'Monmouth', founded_year = 1962,
  website_url = 'https://mrhs.marsd.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@MRHSNJ'
WHERE display_name ILIKE 'Matawan%';

-- 11. Middlesex — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Blue Jays', primary_color = '#0605B3', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Middlesex', county = 'Middlesex', founded_year = 1959,
  website_url = 'https://mhs.mbschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@GoJaysAthletics'
WHERE display_name ILIKE 'Middlesex%' AND display_name NOT ILIKE '%/%';

-- 12. Neptune — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Scarlet Fliers', primary_color = '#D90000', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Neptune', county = 'Monmouth', founded_year = 1897,
  website_url = 'https://hs.neptune.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@Scarlet_Fliers'
WHERE display_name = 'Neptune';

-- 13. Robbinsville — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Ravens', primary_color = '#A7192E', secondary_color = '#030303', tertiary_color = NULL,
  nickname = NULL, town = 'Robbinsville', county = 'Mercer', founded_year = 2004,
  website_url = 'https://rhs.robbinsville.k12.nj.us', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = NULL
WHERE display_name = 'Robbinsville';

-- 14. Somerville — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Pioneers', primary_color = '#000000', secondary_color = '#FFA500', tertiary_color = NULL,
  nickname = NULL, town = 'Somerville', county = 'Somerset', founded_year = 1909,
  website_url = 'https://www.somervilleschools.org/o/shs', athletic_conference = 'Skyland Conference',
  twitter_handle = '@SomervilleHSNJ'
WHERE display_name = 'Somerville';
