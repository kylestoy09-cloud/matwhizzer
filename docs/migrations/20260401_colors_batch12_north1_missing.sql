-- Batch 12: North I missing schools — verified via Wikipedia, MaxPreps, athletics sites

-- 1. Cresskill — MaxPreps
-- APPLIED: 2026-04-01
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Cresskill', county = 'Bergen', founded_year = 1962,
  website_url = 'https://www.cresskillboe.k12.nj.us/o/cmshs', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@cresskillmshs'
WHERE display_name = 'Cresskill';

-- 2. Hawthorne — MaxPreps
UPDATE schools SET
  mascot = 'Bears', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Hawthorne', county = 'Passaic', founded_year = 1933,
  website_url = 'https://hhs.hawthorneschools.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = NULL
WHERE display_name = 'Hawthorne';

-- 3. Indian Hills — MaxPreps
UPDATE schools SET
  mascot = 'Braves', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Oakland', county = 'Bergen', founded_year = 1964,
  website_url = 'https://indianhills.rih.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@IHHS_ATHLETICS'
WHERE display_name = 'Indian Hills';

-- 4. Kinnelon — MaxPreps
UPDATE schools SET
  mascot = 'Colts', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Kinnelon', county = 'Morris', founded_year = 1962,
  website_url = 'https://khs.kinnelonpublicschools.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@KHS_Sports'
WHERE display_name = 'Kinnelon';

-- 5. Kittatinny Regional — athletics site CSS
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#4169E1', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Newton', county = 'Sussex', founded_year = 1975,
  website_url = 'https://www.krhs.net', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@CougsSports'
WHERE display_name ILIKE 'Kittatinny%';

-- 6. New Milford — MaxPreps
UPDATE schools SET
  mascot = 'Knights', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'New Milford', county = 'Bergen', founded_year = NULL,
  website_url = 'https://highschool.nmpsd.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@NMHS_Athletics'
WHERE display_name = 'New Milford';

-- 7. Newton — MaxPreps
UPDATE schools SET
  mascot = 'Braves', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Newton', county = 'Sussex', founded_year = 1920,
  website_url = 'https://www.newtonnj.org/o/nhs', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@NHSBraves'
WHERE display_name = 'Newton';

-- 8. North Warren Regional — MaxPreps
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Blairstown', county = 'Warren', founded_year = 1970,
  website_url = 'https://www.northwarren.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@NorthWarrenHS'
WHERE display_name ILIKE 'North Warren%';

-- 9. Pequannock Township — MaxPreps
UPDATE schools SET
  mascot = 'Golden Panthers', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Pompton Plains', county = 'Morris', founded_year = 1956,
  website_url = 'https://hs.pequannock.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@AthleticsPTHS'
WHERE display_name ILIKE 'Pequannock%';

-- 10. Pompton Lakes — MaxPreps
UPDATE schools SET
  mascot = 'Cardinals', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Pompton Lakes', county = 'Passaic', founded_year = 1932,
  website_url = 'https://www.plps-k12.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@PLHSathletics'
WHERE display_name = 'Pompton Lakes';

-- 11. Ridgefield Memorial — MaxPreps
UPDATE schools SET
  mascot = 'Royals', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Ridgefield', county = 'Bergen', founded_year = 1958,
  website_url = 'https://rmhs.ridgefieldschools.com', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@RMHSridgefield'
WHERE display_name ILIKE 'Ridgefield Memorial%';

-- 12. Wallkill Valley Regional — MaxPreps
UPDATE schools SET
  mascot = 'Rangers', primary_color = '#222222', secondary_color = '#737272', tertiary_color = NULL,
  nickname = NULL, town = 'Hamburg', county = 'Sussex', founded_year = 1982,
  website_url = 'https://www.wallkillvrhs.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@WVRHSAthletics'
WHERE display_name ILIKE 'Wallkill Valley%';

-- 13. Emerson — MaxPreps
UPDATE schools SET
  mascot = 'Cavaliers', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = 'Cavos', town = 'Emerson', county = 'Bergen', founded_year = 1963,
  website_url = 'https://ejshs.emersonschools.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@EmersonJSHS'
WHERE display_name ILIKE 'Emerson%';

-- 14. Waldwick — MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Warriors', primary_color = '#022C66', secondary_color = '#046DFF', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Waldwick', county = 'Bergen', founded_year = 1963,
  website_url = 'https://whs.waldwickschools.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@WHSWarrior_ATHL'
WHERE display_name ILIKE 'Waldwick%';

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
