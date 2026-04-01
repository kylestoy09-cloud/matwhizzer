-- South Groups 1 & 2 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- SOUTH - GROUP 2
-- ============================================================

-- 1. Cedar Creek — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Pirates', primary_color = '#602121', secondary_color = '#234C28', tertiary_color = NULL,
  nickname = NULL, town = 'Egg Harbor City', county = 'Atlantic', founded_year = 2010,
  website_url = 'https://www.cedarcreekhs.net', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@PiratesCCHS'
WHERE display_name = 'Cedar Creek';

-- 2. Collingswood — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#0000FF', secondary_color = '#FFD700', tertiary_color = NULL,
  nickname = 'Colls', town = 'Collingswood', county = 'Camden', founded_year = 1910,
  website_url = 'https://www.collsk12.org/o/ch', athletic_conference = 'Colonial Conference',
  twitter_handle = '@Colls_HS'
WHERE display_name = 'Collingswood';

-- 3. Gloucester City — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Lions', primary_color = '#00274C', secondary_color = '#FFCB05', tertiary_color = NULL,
  nickname = NULL, town = 'Gloucester City', county = 'Camden', founded_year = NULL,
  website_url = 'https://ghs.gcsd.k12.nj.us', athletic_conference = 'Colonial Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Gloucester City%';

-- 4. Haddon Heights — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Garnets', primary_color = '#CC0022', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Haddon Heights', county = 'Camden', founded_year = 1904,
  website_url = 'https://highschool.gogarnets.com', athletic_conference = 'Colonial Conference',
  twitter_handle = NULL
WHERE display_name = 'Haddon Heights';

-- 5. Haddonfield Memorial — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bulldawgs', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = 'HMHS', town = 'Haddonfield', county = 'Camden', founded_year = 1927,
  website_url = 'https://high.haddonfieldschools.org', athletic_conference = 'Colonial Conference',
  twitter_handle = '@HMHSathletics'
WHERE display_name ILIKE 'Haddonfield%';

-- 6. Lindenwold — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Lions', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Lindenwold', county = 'Camden', founded_year = 2001,
  website_url = 'https://lhs.lindenwold.k12.nj.us', athletic_conference = 'Colonial Conference',
  twitter_handle = NULL
WHERE display_name = 'Lindenwold';

-- 7. Lower Cape May Regional — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Caper Tigers', primary_color = '#2B94FA', secondary_color = '#FCFC75', tertiary_color = '#000000',
  nickname = 'LCMR', town = 'Cape May', county = 'Cape May', founded_year = 1961,
  website_url = 'https://lcmrschooldistrict.com', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@lowercapemay'
WHERE display_name ILIKE 'Lower Cape May%';

-- 8. Manchester Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hawks', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Manchester Township', county = 'Ocean', founded_year = 1976,
  website_url = 'https://www.manchestertwp.org/o/mths', athletic_conference = 'Shore Conference',
  twitter_handle = '@MTHS_Sports'
WHERE display_name = 'Manchester Township';

-- 9. Middle Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Cape May Court House', county = 'Cape May', founded_year = 1907,
  website_url = 'https://highschool.middletownshippublicschools.org', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@MTHSAthletics1'
WHERE display_name = 'Middle Township';

-- 10. Oakcrest — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#034CB2', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Mays Landing', county = 'Atlantic', founded_year = 1960,
  website_url = 'https://www.oakcrest.net', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@Oakcrest_Sports'
WHERE display_name = 'Oakcrest';

-- 11. Overbrook — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#034CB2', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Pine Hill', county = 'Camden', founded_year = 1939,
  website_url = 'https://ohs.pinehillschools.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@OverbrookRAMS'
WHERE display_name ILIKE 'Overbrook%';

-- 12. Sterling — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Silver Knights', primary_color = '#034CB2', secondary_color = '#737272', tertiary_color = NULL,
  nickname = NULL, town = 'Somerdale', county = 'Camden', founded_year = 1960,
  website_url = 'https://www.sterling.k12.nj.us', athletic_conference = 'Colonial Conference',
  twitter_handle = NULL
WHERE display_name = 'Sterling';

-- 13. West Deptford — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'West Deptford', county = 'Gloucester', founded_year = 1960,
  website_url = 'https://hs.wdeptford.k12.nj.us', athletic_conference = 'Colonial Conference',
  twitter_handle = '@WDHSAthletics'
WHERE display_name ILIKE 'West Deptford%';

-- ============================================================
-- SOUTH - GROUP 1
-- ============================================================

-- 14. Arthur P. Schalick — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#195821', secondary_color = '#FEC000', tertiary_color = '#000000',
  nickname = 'Schalick', town = 'Pittsgrove', county = 'Salem', founded_year = 1976,
  website_url = 'https://schalick.pittsgrove.net', athletic_conference = 'Tri-County Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'A.P. Schalick%' OR display_name ILIKE 'Arthur P. Schalick%';

-- 15. Audubon — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Green Wave', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Audubon', county = 'Camden', founded_year = 1926,
  website_url = 'https://ahs.audubonschools.org', athletic_conference = 'Colonial Conference',
  twitter_handle = '@AudubonAD'
WHERE display_name = 'Audubon';

-- 16. Buena Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Chiefs', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Buena', county = 'Atlantic', founded_year = 1971,
  website_url = 'https://brhs.buenaschools.org', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = NULL
WHERE display_name ILIKE 'Buena Regional%' AND display_name NOT ILIKE '%/%';

-- 17. Haddon Township — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Hawks', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Westmont', county = 'Camden', founded_year = 1962,
  website_url = 'https://hths.htsd.us', athletic_conference = 'Colonial Conference',
  twitter_handle = '@HadTwpSports'
WHERE display_name ILIKE 'Haddon Twp%' OR display_name ILIKE 'Haddon Township%';

-- 18. Maple Shade — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Wildcats', primary_color = '#014488', secondary_color = '#FCAE04', tertiary_color = NULL,
  nickname = NULL, town = 'Maple Shade', county = 'Burlington', founded_year = 1972,
  website_url = 'https://www.mapleshade.org/o/mapleshadehs', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = NULL
WHERE display_name = 'Maple Shade';

-- 19. Palmyra — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Palmyra', county = 'Burlington', founded_year = 1895,
  website_url = 'https://www.palmyraschools.com', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = NULL
WHERE display_name = 'Palmyra';

-- 20. Paulsboro — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Red Raiders', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Paulsboro', county = 'Gloucester', founded_year = 1917,
  website_url = 'https://phs.paulsboro.k12.nj.us', athletic_conference = 'Colonial Conference',
  twitter_handle = '@paulsborosports'
WHERE display_name ILIKE 'Paulsboro%';

-- 21. Penns Grove — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Red Devils', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Carneys Point', county = 'Salem', founded_year = NULL,
  website_url = 'https://www.pgcpschools.org/o/pghs', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@AdPghs'
WHERE display_name ILIKE 'Penns Grove%';

-- 22. Pennsville Memorial — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Pennsville', county = 'Salem', founded_year = 1955,
  website_url = 'https://www.psdnet.org/o/phs', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@PMHSAthletics'
WHERE display_name ILIKE 'Pennsville%';

-- 23. Pitman — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#CC4E10', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Pitman', county = 'Gloucester', founded_year = 1922,
  website_url = 'https://phs.pitman.k12.nj.us', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@PitmanAthletics'
WHERE display_name = 'Pitman';

-- 24. Riverside — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Riverside', county = 'Burlington', founded_year = NULL,
  website_url = 'https://highschool.riverside.k12.nj.us', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@rhsramsnj'
WHERE display_name = 'Riverside';

-- 25. Salem — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Salem', county = 'Salem', founded_year = NULL,
  website_url = 'https://www.salemnj.org/schools/salem_high_school', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@SalemHSRocks'
WHERE display_name = 'Salem';

-- 26. Woodstown — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Wolverines', primary_color = '#1328A4', secondary_color = '#F09817', tertiary_color = '#000000',
  nickname = NULL, town = 'Woodstown', county = 'Salem', founded_year = 1905,
  website_url = 'https://whs.woodstown.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@WHS_AthleticDir'
WHERE display_name = 'Woodstown';
