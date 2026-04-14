-- Central Groups 1 & 2 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- CENTRAL - GROUP 2
-- ============================================================

-- 1. Arthur L. Johnson — Sources: Wikipedia, MaxPreps
-- APPLIED: 2026-04-01
UPDATE schools SET
  mascot = 'Crusaders', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'ALJ', town = 'Clark', county = 'Union', founded_year = 1956,
  website_url = 'https://alj.clarkschools.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@aljsports'
WHERE display_name ILIKE 'Arthur Johnson%';

-- 2. Cinnaminson — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Pirates', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Cinnaminson', county = 'Burlington', founded_year = NULL,
  website_url = 'https://chs.cinnaminson.com', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@CinnAthletics'
WHERE display_name = 'Cinnaminson';

-- 3. Delran — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bears', primary_color = '#503604', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Delran', county = 'Burlington', founded_year = 1975,
  website_url = 'https://dhs.delranschools.org', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@DelranAthletics'
WHERE display_name = 'Delran';

-- 4. Holmdel — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hornets', primary_color = '#034CB2', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Holmdel', county = 'Monmouth', founded_year = 1973,
  website_url = 'https://hhs.holmdelschools.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@HolmdelHornets'
WHERE display_name = 'Holmdel';

-- 5. Manasquan — Sources: Wikipedia (Navy Blue and Gray verified, hex unconfirmed)
UPDATE schools SET
  mascot = 'Warriors', primary_color = NULL, secondary_color = NULL, tertiary_color = NULL,
  nickname = 'Squan', town = 'Manasquan', county = 'Monmouth', founded_year = 1931,
  website_url = 'https://mhs.manasquanschools.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@SquanAthletics'
WHERE display_name = 'Manasquan';

-- 6. Monmouth Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Tinton Falls', county = 'Monmouth', founded_year = NULL,
  website_url = 'https://www.monmouthregional.net', athletic_conference = 'Shore Conference',
  twitter_handle = '@monreghs'
WHERE display_name ILIKE 'Monmouth Reg%';

-- 7. Ocean Township — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Spartans', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Oakhurst', county = 'Monmouth', founded_year = 1965,
  website_url = 'https://oths.oceanschools.org', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Ocean Township';

-- 8. Point Pleasant Boro — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#000000', secondary_color = '#FFD700', tertiary_color = NULL,
  nickname = 'Point Boro', town = 'Point Pleasant', county = 'Ocean', founded_year = 1963,
  website_url = 'https://ppbhs.pointpleasant.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@PPHS_Athletics'
WHERE display_name ILIKE 'Point Pleasant Boro%' OR display_name ILIKE 'Point Pleasant Borough%';

-- 9. Raritan — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rockets', primary_color = '#00824B', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Hazlet', county = 'Monmouth', founded_year = 1962,
  website_url = 'https://www.hazlet.org/o/rhs', athletic_conference = 'Shore Conference',
  twitter_handle = '@RaritanHigh'
WHERE display_name = 'Raritan';

-- 10. Rumson-Fair Haven — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#5C3068', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = 'RFH', town = 'Rumson', county = 'Monmouth', founded_year = 1933,
  website_url = 'https://www.rumsonfairhaven.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@RFH_Regional'
WHERE display_name ILIKE 'Rumson-Fair Haven%';

-- 11. Spotswood — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Chargers', primary_color = '#0250AB', secondary_color = '#FCE300', tertiary_color = NULL,
  nickname = NULL, town = 'Spotswood', county = 'Middlesex', founded_year = 1977,
  website_url = 'https://shs.spsd.us', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@SpotswoodAthle1'
WHERE display_name = 'Spotswood';

-- 12. Wall Township — Sources: Wikipedia, school site CSS
UPDATE schools SET
  mascot = 'Crimson Knights', primary_color = '#C61330', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Wall Township', county = 'Monmouth', founded_year = 1959,
  website_url = 'https://whs.wallpublicschools.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@WallAthletics'
WHERE display_name ILIKE 'Wall%' AND display_name NOT ILIKE 'Wallkill%';

-- 13. Willingboro — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Chimeras', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Willingboro', county = 'Burlington', founded_year = 1975,
  website_url = 'https://www.willingboroschools.org/o/willingboro-high-school', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@willingborohs'
WHERE display_name ILIKE 'Willingboro%';

-- ============================================================
-- CENTRAL - GROUP 1
-- ============================================================

-- 14. Asbury Park — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Blue Bishops', primary_color = '#92CCFE', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Asbury Park', county = 'Monmouth', founded_year = 1926,
  website_url = 'https://aphs.asburypark.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name = 'Asbury Park';

-- 15. Bound Brook — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Crusaders', primary_color = '#BB271A', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Bound Brook', county = 'Somerset', founded_year = 1908,
  website_url = 'https://bbhs.bbrook.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@BBAthletics'
WHERE display_name ILIKE 'Bound Brook%';

-- 16. Burlington City — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Burlington', county = 'Burlington', founded_year = NULL,
  website_url = 'https://hsbc.burlington-nj.net', athletic_conference = 'Burlington County Scholastic League',
  twitter_handle = '@bchsbluedevils'
WHERE display_name = 'Burlington City';

-- 17. Delaware Valley Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Terriers', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'Del Val', town = 'Frenchtown', county = 'Hunterdon', founded_year = 1959,
  website_url = 'https://www.dvrhs.org', athletic_conference = 'Skyland Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Delaware Valley%';

-- 18. Highland Park — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Owls', primary_color = '#8C2526', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Highland Park', county = 'Middlesex', founded_year = 1926,
  website_url = 'https://hs.hpschools.net', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@HPHS_Owls'
WHERE display_name = 'Highland Park';

-- 19. Keansburg — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Titans', primary_color = '#FF2F00', secondary_color = '#2D00E1', tertiary_color = '#000000',
  nickname = NULL, town = 'Keansburg', county = 'Monmouth', founded_year = 1968,
  website_url = 'https://www.keansburg.k12.nj.us/keansburghs', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Keansburg%';

-- 20. Keyport — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Red Raiders', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Keyport', county = 'Monmouth', founded_year = 1927,
  website_url = 'https://www.kpsdschools.org/o/highschool', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Keyport%';

-- 21. Manville — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#0A1A79', secondary_color = '#F3A707', tertiary_color = NULL,
  nickname = NULL, town = 'Manville', county = 'Somerset', founded_year = 1957,
  website_url = 'https://mhs.manvilleschools.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@manville_hs'
WHERE display_name ILIKE 'Manville%';

-- 22. Metuchen — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#4169E1', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Metuchen', county = 'Middlesex', founded_year = 1909,
  website_url = 'https://www.metuchenschools.org/o/mhs', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@MetuchenHS'
WHERE display_name = 'Metuchen';

-- 23. New Egypt — Sources: Wikipedia, school site CSS
UPDATE schools SET
  mascot = 'Warriors', primary_color = '#222245', secondary_color = '#DBB235', tertiary_color = NULL,
  nickname = NULL, town = 'New Egypt', county = 'Ocean', founded_year = 1999,
  website_url = 'https://nehs.newegypt.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@NewEgyptSports'
WHERE display_name ILIKE 'New Egypt%';

-- 24. Point Pleasant Beach — Sources: Wikipedia, athletics site JSON
UPDATE schools SET
  mascot = 'Garnet Gulls', primary_color = '#AC1E2C', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'Point Beach', town = 'Point Pleasant Beach', county = 'Ocean', founded_year = 1908,
  website_url = 'https://www.ptbeach.com/o/ppbhs', athletic_conference = 'Shore Conference',
  twitter_handle = '@PointBeachHS'
WHERE display_name ILIKE 'Point Pleasant Beach%';

-- 25. Shore Regional — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#1B5997', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = 'Shore', town = 'West Long Branch', county = 'Monmouth', founded_year = 1962,
  website_url = 'https://www.shoreregional.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@ShoreRegional'
WHERE display_name ILIKE 'Shore Regional%';

-- 26. South Hunterdon Regional — Sources: Wikipedia, school site CSS
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#07073D', secondary_color = '#6F777B', tertiary_color = NULL,
  nickname = NULL, town = 'Lambertville', county = 'Hunterdon', founded_year = 1960,
  website_url = 'https://hs.shrsd.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@SHRHSEagles'
WHERE display_name ILIKE 'South Hunterdon%';

-- 27. South River — Sources: Wikipedia, athletics site JSON (3 colors)
UPDATE schools SET
  mascot = 'Rams', primary_color = '#5C0006', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'South River', county = 'Middlesex', founded_year = 1961,
  website_url = 'https://hs.srivernj.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@SR_RamsSports'
WHERE display_name = 'South River';

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
