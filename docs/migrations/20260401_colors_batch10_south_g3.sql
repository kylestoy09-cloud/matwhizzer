-- South Group 3 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- 1. Absegami — Sources: Wikipedia, athletics site CSS
-- APPLIED: 2026-04-01
UPDATE schools SET
  mascot = 'Braves', primary_color = '#583925', secondary_color = '#F5BE49', tertiary_color = NULL,
  nickname = 'Gami', town = 'Galloway', county = 'Atlantic', founded_year = 1982,
  website_url = 'https://www.absegami.net', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@Absegami_Sports'
WHERE display_name = 'Absegami';

-- 2. Barnegat — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bengals', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Barnegat', county = 'Ocean', founded_year = 2004,
  website_url = 'https://www.barnegatschools.com/o/bhs', athletic_conference = 'Shore Conference',
  twitter_handle = '@Barnegat_HS'
WHERE display_name = 'Barnegat';

-- 3. Clayton — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Clippers', primary_color = '#192F59', secondary_color = '#ECDF43', tertiary_color = NULL,
  nickname = NULL, town = 'Clayton', county = 'Gloucester', founded_year = NULL,
  website_url = 'https://www.claytonps.org/o/chs', athletic_conference = 'Tri-County Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Clayton%';

-- 4. Cumberland Regional — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Colts', primary_color = '#FF8C00', secondary_color = '#A52A2A', tertiary_color = '#000000',
  nickname = NULL, town = 'Seabrook', county = 'Cumberland', founded_year = 1977,
  website_url = 'https://www.crhsd.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@CRHSD'
WHERE display_name = 'Cumberland Regional';

-- 5. Delsea Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Crusaders', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Franklinville', county = 'Gloucester', founded_year = 1960,
  website_url = 'https://delsearegional.us', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@delseaathletics'
WHERE display_name ILIKE 'Delsea%';

-- 6. Deptford Township — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Spartans', primary_color = '#000000', secondary_color = '#AE8524', tertiary_color = NULL,
  nickname = NULL, town = 'Deptford', county = 'Gloucester', founded_year = NULL,
  website_url = 'https://deptfordhs.deptfordschools.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@deptfordschools'
WHERE display_name ILIKE 'Deptford%';

-- 7. Gateway Regional — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Gators', primary_color = '#2542B4', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Woodbury Heights', county = 'Gloucester', founded_year = 1964,
  website_url = 'https://www.gatewayhs.com', athletic_conference = 'Colonial Conference',
  twitter_handle = '@GRHSGators'
WHERE display_name ILIKE 'Gateway%';

-- 8. Lacey Township — Sources: Wikipedia, school site CSS
UPDATE schools SET
  mascot = 'Lions', primary_color = '#0A2240', secondary_color = '#8A2432', tertiary_color = NULL,
  nickname = NULL, town = 'Lanoka Harbor', county = 'Ocean', founded_year = 1981,
  website_url = 'https://lths.laceyschools.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@Lacey_Athletics'
WHERE display_name = 'Lacey Township';

-- 9. Mainland Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Linwood', county = 'Atlantic', founded_year = 1961,
  website_url = 'https://www.mainlandregional.net', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@MainlandRegHS'
WHERE display_name ILIKE 'Mainland%';

-- 10. Moorestown — Sources: Wikipedia (Gold and Black confirmed, hex unverified)
UPDATE schools SET
  mascot = 'Quakers', primary_color = NULL, secondary_color = NULL, tertiary_color = NULL,
  nickname = NULL, town = 'Moorestown', county = 'Burlington', founded_year = 1898,
  website_url = 'https://mhs.mtps.com', athletic_conference = 'Olympic Conference',
  twitter_handle = '@MHSQuakers'
WHERE display_name = 'Moorestown';

-- 11. Ocean City — Sources: Wikipedia, MaxPreps CSS
UPDATE schools SET
  mascot = 'Red Raiders', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'OC', town = 'Ocean City', county = 'Cape May', founded_year = 1904,
  website_url = 'https://www.ocsdnj.org/o/ochs', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@OCRedRaiders'
WHERE display_name = 'Ocean City';

-- 12. Pemberton Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hornets', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Pemberton', county = 'Burlington', founded_year = 1990,
  website_url = 'https://pths.pemberton.k12.nj.us', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@pthshornets'
WHERE display_name = 'Pemberton Township';

-- 13. Pinelands Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Wildcats', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Tuckerton', county = 'Ocean', founded_year = 1979,
  website_url = 'https://www.pinelandsregional.org', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Pinelands Regional';

-- 14. Seneca — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Golden Eagles', primary_color = '#00341E', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Tabernacle', county = 'Burlington', founded_year = 2003,
  website_url = 'https://seneca.lrhsd.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@SenecaAthletic1'
WHERE display_name = 'Seneca';

-- 15. Timber Creek — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Chargers', primary_color = '#022C66', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Erial', county = 'Camden', founded_year = 2001,
  website_url = 'https://tchs.bhprsd.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@TCreekSports'
WHERE display_name = 'Timber Creek';

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
