-- Batch 13: North II missing schools — verified via Wikipedia, MaxPreps, athletics sites

-- 1. Hasbrouck Heights — MaxPreps
UPDATE schools SET
  mascot = 'Aviators', primary_color = '#CC4E10', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Hasbrouck Heights', county = 'Bergen', founded_year = NULL,
  website_url = 'https://www.hhschools.org/o/hhhs', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@HHvarsitysports'
WHERE display_name = 'Hasbrouck Heights';

-- 2. Hoboken — MaxPreps
UPDATE schools SET
  mascot = 'Redwings', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Hoboken', county = 'Hudson', founded_year = NULL,
  website_url = 'https://www.hoboken.k12.nj.us/schools/hoboken_high_school', athletic_conference = 'Hudson County Interscholastic Athletic League',
  twitter_handle = '@hobokenredwings'
WHERE display_name ILIKE 'Hoboken%';

-- 3. Mountain Lakes — athletics site CSS
UPDATE schools SET
  mascot = 'Lakers', primary_color = '#0000FF', secondary_color = '#FFA500', tertiary_color = NULL,
  nickname = NULL, town = 'Mountain Lakes', county = 'Morris', founded_year = 1911,
  website_url = 'https://hs.mlschools.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@MLHS_athletics'
WHERE display_name = 'Mountain Lakes';

-- 4. New Providence — athletics site JSON
UPDATE schools SET
  mascot = 'Pioneers', primary_color = '#006325', secondary_color = '#FFDD00', tertiary_color = NULL,
  nickname = NULL, town = 'New Providence', county = 'Union', founded_year = 1958,
  website_url = 'https://nphs.npsd.k12.nj.us', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@NPPioneers'
WHERE display_name = 'New Providence';

-- 5. Roselle Park — MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Roselle Park', county = 'Union', founded_year = 1909,
  website_url = 'https://hs.rpsd.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@rparkathletics'
WHERE display_name = 'Roselle Park';

-- 6. Rutherford — athletics site
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#004679', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Rutherford', county = 'Bergen', founded_year = 1922,
  website_url = 'https://www.rutherfordschools.org/rhs', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@RutherfordHSAD'
WHERE display_name = 'Rutherford';

-- 7. Secaucus — MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = '#034CB2',
  nickname = NULL, town = 'Secaucus', county = 'Hudson', founded_year = 1976,
  website_url = 'https://shs.sboe.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = NULL
WHERE display_name = 'Secaucus';

-- 8. Verona — MaxPreps
UPDATE schools SET
  mascot = 'Hillbillies', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Verona', county = 'Essex', founded_year = NULL,
  website_url = 'https://www.veronaschools.org/o/vhs', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@VeronaAthletics'
WHERE display_name = 'Verona';

-- 9. Whippany Park — MaxPreps
UPDATE schools SET
  mascot = 'Wildcats', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Whippany', county = 'Morris', founded_year = 1967,
  website_url = 'https://www.whippanypark.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@wpwildcats1'
WHERE display_name ILIKE 'Whippany Park%';
