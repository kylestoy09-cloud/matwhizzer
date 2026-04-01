-- South Groups 4 & 5 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- SOUTH - GROUP 5
-- ============================================================

-- 1. Atlantic City — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#022C66', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'ACHS', town = 'Atlantic City', county = 'Atlantic', founded_year = 1895,
  website_url = 'https://achs.acboe.org', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@atlanticcityhs'
WHERE display_name = 'Atlantic City';

-- 2. Cherokee — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Chiefs', primary_color = '#503604', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Marlton', county = 'Burlington', founded_year = 1975,
  website_url = 'https://cherokee.lrhsd.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@Cherokee_HS'
WHERE display_name = 'Cherokee';

-- 3. Cherry Hill East — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'CHE', town = 'Cherry Hill', county = 'Camden', founded_year = 1966,
  website_url = 'https://east.chclc.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@CHEastAthletics'
WHERE display_name = 'Cherry Hill East';

-- 4. Eastern — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Voorhees', county = 'Camden', founded_year = 1965,
  website_url = 'https://www.eccrsd.us', athletic_conference = 'Olympic Conference',
  twitter_handle = '@easternviking'
WHERE display_name = 'Eastern';

-- 5. Egg Harbor Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#222222', secondary_color = '#737272', tertiary_color = NULL,
  nickname = 'EHT', town = 'Egg Harbor Township', county = 'Atlantic', founded_year = 1983,
  website_url = 'https://hs.eht.k12.nj.us', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@EHTNJHS'
WHERE display_name ILIKE 'Egg Harbor%';

-- 6. Howell — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rebels', primary_color = '#034CB2', secondary_color = '#737272', tertiary_color = NULL,
  nickname = NULL, town = 'Farmingdale', county = 'Monmouth', founded_year = 1964,
  website_url = 'https://howell.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@HowellAthletics'
WHERE display_name = 'Howell';

-- 7. Kingsway Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Dragons', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Woolwich Township', county = 'Gloucester', founded_year = 1963,
  website_url = 'https://www.krsd.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@Dragons_AD'
WHERE display_name ILIKE 'Kingsway%';

-- 8. Lenape — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Indians', primary_color = '#CA0814', secondary_color = '#333333', tertiary_color = '#000000',
  nickname = NULL, town = 'Medford', county = 'Burlington', founded_year = 1958,
  website_url = 'https://lenape.lrhsd.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@LenapeAthletics'
WHERE display_name = 'Lenape';

-- 9. Rancocas Valley — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Red Devils', primary_color = '#DD1931', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = 'RV', town = 'Mount Holly', county = 'Burlington', founded_year = 1937,
  website_url = 'https://www.rvrhs.com', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@RVRHS_Athletics'
WHERE display_name ILIKE 'Rancocas Valley%';

-- 10. Southern Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#000000', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Manahawkin', county = 'Ocean', founded_year = 1957,
  website_url = 'https://www.srsd.net/HighSchool', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Southern Regional';

-- 11. Toms River North — Sources: Wikipedia (Navy Blue and Gold confirmed, hex unverified)
UPDATE schools SET
  mascot = 'Mariners', primary_color = NULL, secondary_color = NULL, tertiary_color = NULL,
  nickname = 'TRN', town = 'Toms River', county = 'Ocean', founded_year = 1969,
  website_url = 'https://www.trschools.com/hsnorth', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Toms River North';

-- 12. Vineland — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Fighting Clan', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Vineland', county = 'Cumberland', founded_year = 1870,
  website_url = 'https://www.vineland.org/o/vshs', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = NULL
WHERE display_name = 'Vineland';

-- 13. Washington Township — Sources: Wikipedia, school site CSS (3 colors)
UPDATE schools SET
  mascot = 'Minutemen', primary_color = '#0D2C89', secondary_color = '#CF0A2C', tertiary_color = '#FFFFFF',
  nickname = 'WTHS', town = 'Sewell', county = 'Gloucester', founded_year = 1963,
  website_url = 'https://wths.wtps.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@WTHS_Athletics'
WHERE display_name = 'Washington Township';

-- 14. Highland Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tartans', primary_color = '#034CB2', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Blackwood', county = 'Camden', founded_year = 1967,
  website_url = 'https://hhs.bhprsd.org', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@HighlandTartans'
WHERE display_name ILIKE 'Highland Regional%';

-- ============================================================
-- SOUTH - GROUP 4
-- ============================================================

-- 15. Central Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Golden Eagles', primary_color = '#8F0018', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Bayville', county = 'Ocean', founded_year = 1956,
  website_url = 'https://www.centralreg.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@CR_athletics'
WHERE display_name = 'Central Regional';

-- 16. Cherry Hill West — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Lions', primary_color = '#754ACC', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'CHW', town = 'Cherry Hill', county = 'Camden', founded_year = 1966,
  website_url = 'https://west.chclc.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@CHWestAthletics'
WHERE display_name = 'Cherry Hill West';

-- 17. Clearview Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Pioneers', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Mullica Hill', county = 'Gloucester', founded_year = 1960,
  website_url = 'https://www.clearviewregional.edu', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@Clearview_NJ'
WHERE display_name ILIKE 'Clearview%';

-- 18. Hammonton — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Hammonton', county = 'Atlantic', founded_year = 1925,
  website_url = 'https://hhs.hammontonschools.org', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@HammontonHigh'
WHERE display_name = 'Hammonton';

-- 19. Millville — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Thunderbolts', primary_color = '#034CB2', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Millville', county = 'Cumberland', founded_year = 1925,
  website_url = 'https://mhs.millville.org', athletic_conference = 'Cape-Atlantic League',
  twitter_handle = '@TBoltAthletics'
WHERE display_name = 'Millville';

-- 20. Northern Burlington — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Greyhounds', primary_color = '#034CB2', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Columbus', county = 'Burlington', founded_year = 1960,
  website_url = 'https://www.nburlington.com', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = NULL
WHERE display_name ILIKE 'Northern Burlington%';

-- 21. Pennsauken — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Indians', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = '#1580A5',
  nickname = NULL, town = 'Pennsauken', county = 'Camden', founded_year = 1959,
  website_url = 'https://high.pennsauken.net', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@PennsaukenAD'
WHERE display_name = 'Pennsauken';

-- 22. Shawnee — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Renegades', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Medford', county = 'Burlington', founded_year = 1970,
  website_url = 'https://shawnee.lrhsd.org', athletic_conference = 'Olympic Conference',
  twitter_handle = '@SHSRenegades'
WHERE display_name = 'Shawnee';

-- 23. Toms River East — Sources: Wikipedia (Black/Gray/Columbia Blue, hex unverified)
UPDATE schools SET
  mascot = 'Raiders', primary_color = NULL, secondary_color = NULL, tertiary_color = NULL,
  nickname = 'TR East', town = 'Toms River', county = 'Ocean', founded_year = 1979,
  website_url = 'https://www.trschools.com/hseast', athletic_conference = 'Shore Conference',
  twitter_handle = '@TRE_Athletics'
WHERE display_name ILIKE 'Toms River East%';

-- 24. Toms River South — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Indians', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'TR South', town = 'Toms River', county = 'Ocean', founded_year = 1891,
  website_url = 'https://www.trschools.com/hssouth', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Toms River South';

-- 25. Williamstown — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Braves', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Williamstown', county = 'Gloucester', founded_year = 1958,
  website_url = 'https://whs.monroetwp.k12.nj.us', athletic_conference = 'Tri-County Conference',
  twitter_handle = '@WilliamstownHS'
WHERE display_name = 'Williamstown';

-- 26. Winslow Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Atco', county = 'Camden', founded_year = 2000,
  website_url = 'https://highschool.winslow-schools.com', athletic_conference = 'Olympic Conference',
  twitter_handle = '@winslowhsath'
WHERE display_name ILIKE 'Winslow%';

-- 27. BCIT Westampton — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#022C66', secondary_color = '#454444', tertiary_color = '#FFFFFF',
  nickname = 'Westampton Tech', town = 'Westampton', county = 'Burlington', founded_year = NULL,
  website_url = 'https://www.bcit.cc/o/bcitwc', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@BcitWestampton'
WHERE display_name ILIKE 'BCIT%' OR display_name ILIKE 'Burlington Co Inst%';

-- 28. Camden — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#754ACC', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'The High', town = 'Camden', county = 'Camden', founded_year = 1891,
  website_url = 'https://camdencityschools.org/chs', athletic_conference = 'Olympic Conference',
  twitter_handle = '@CamdenHigh_NJ'
WHERE display_name = 'Camden' AND display_name NOT ILIKE '%Catholic%' AND display_name NOT ILIKE '%/%';
