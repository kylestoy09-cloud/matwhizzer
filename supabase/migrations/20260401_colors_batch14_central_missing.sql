-- Batch 14: Central missing schools — data from batch 8a research, repackaged

-- 1. Allentown
UPDATE schools SET
  mascot = 'Redbirds', primary_color = '#CC0022', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Allentown', county = 'Monmouth', founded_year = 1924,
  website_url = 'https://ahs.ufrsd.net', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@ATownRedbirds'
WHERE display_name = 'Allentown';

-- 2. Bordentown
UPDATE schools SET
  mascot = 'Scotties', primary_color = '#000000', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Bordentown', county = 'Burlington', founded_year = 1965,
  website_url = 'https://brhs.bordentown.k12.nj.us', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@BRHSAthletics'
WHERE display_name ILIKE 'Bordentown%' AND display_name NOT ILIKE '%/%';

-- 3. Burlington Township
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#000000', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Burlington Township', county = 'Burlington', founded_year = 1964,
  website_url = 'https://hs.burltwpsch.org', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@bthsathletics'
WHERE display_name = 'Burlington Township';

-- 4. Ewing
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Ewing', county = 'Mercer', founded_year = 1951,
  website_url = 'https://ehs.ewing.k12.nj.us', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@EwingAthletics'
WHERE display_name = 'Ewing';

-- 5. Hamilton North (Nottingham)
UPDATE schools SET
  mascot = 'Northstars', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'Nottingham', town = 'Hamilton', county = 'Mercer', founded_year = NULL,
  website_url = 'https://hhn.htsdnj.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@NorthstarsAD'
WHERE display_name ILIKE 'Hamilton North%';

-- 6. Hopewell Valley
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#080206', secondary_color = '#FAD703', tertiary_color = NULL,
  nickname = NULL, town = 'Pennington', county = 'Mercer', founded_year = 1907,
  website_url = 'https://hvchs.hvrsd.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@HVCentralHS'
WHERE display_name ILIKE 'Hopewell Valley%';

-- 7. Lawrence
UPDATE schools SET
  mascot = 'Cardinals', primary_color = '#BF0000', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Lawrenceville', county = 'Mercer', founded_year = 1966,
  website_url = 'https://lhs.ltps.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@CardinalsLHS'
WHERE display_name ILIKE 'Lawrence%';

-- 8. Middlesex
UPDATE schools SET
  mascot = 'Blue Jays', primary_color = '#0605B3', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Middlesex', county = 'Middlesex', founded_year = 1959,
  website_url = 'https://mhs.mbschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@GoJaysAthletics'
WHERE display_name ILIKE 'Middlesex%' AND display_name NOT ILIKE '%/%';

-- 9. Neptune
UPDATE schools SET
  mascot = 'Scarlet Fliers', primary_color = '#D90000', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Neptune', county = 'Monmouth', founded_year = 1897,
  website_url = 'https://hs.neptune.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@Scarlet_Fliers'
WHERE display_name = 'Neptune';

-- 10. Robbinsville
UPDATE schools SET
  mascot = 'Ravens', primary_color = '#A7192E', secondary_color = '#030303', tertiary_color = NULL,
  nickname = NULL, town = 'Robbinsville', county = 'Mercer', founded_year = 2004,
  website_url = 'https://rhs.robbinsville.k12.nj.us', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = NULL
WHERE display_name = 'Robbinsville';

-- 11. Somerville
UPDATE schools SET
  mascot = 'Pioneers', primary_color = '#000000', secondary_color = '#FFA500', tertiary_color = NULL,
  nickname = NULL, town = 'Somerville', county = 'Somerset', founded_year = 1909,
  website_url = 'https://www.somervilleschools.org/o/shs', athletic_conference = 'Skyland Conference',
  twitter_handle = '@SomervilleHSNJ'
WHERE display_name = 'Somerville';
