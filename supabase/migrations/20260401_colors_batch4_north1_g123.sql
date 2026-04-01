-- North I Groups 1, 2 & 3 school profiles — verified via Wikipedia, MaxPreps, official websites

-- ============================================================
-- NORTH I - GROUP 3
-- ============================================================

-- 1. Bergenfield — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bears', primary_color = '#CC0022', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Bergenfield', county = 'Bergen', founded_year = 1941,
  website_url = 'https://bhs.bergenfield.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@Bears_Athletics'
WHERE display_name = 'Bergenfield';

-- 2. Dover — Sources: Wikipedia, MaxPreps, school site
UPDATE schools SET
  mascot = 'Tigers', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Dover', county = 'Morris', founded_year = 1885,
  website_url = 'https://dhs.dover-nj.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@DoverHSNJ'
WHERE display_name = 'Dover';

-- 3. Dwight Morrow — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Maroon Raiders', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'DMHS', town = 'Englewood', county = 'Bergen', founded_year = 1932,
  website_url = 'https://dmhs.epsd.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@DMRaiderNation'
WHERE display_name = 'Dwight Morrow';

-- 4. Henry P. Becton — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Wildcats', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'Becton', town = 'East Rutherford', county = 'Bergen', founded_year = 1971,
  website_url = 'https://www.bectonhs.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@BectonHS'
WHERE display_name ILIKE 'Becton Regional%' OR display_name ILIKE 'Henry P. Becton%';

-- 5. Lenape Valley — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Stanhope', county = 'Sussex', founded_year = 1974,
  website_url = 'https://www.lvhs.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@lvrpatriots'
WHERE display_name ILIKE 'Lenape Valley%';

-- 6. Montville Township — Sources: Wikipedia, MaxPreps CSS
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Montville', county = 'Morris', founded_year = 1971,
  website_url = 'https://www.montville.net/mths', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@MustangsMTHS'
WHERE display_name ILIKE 'Montville Township%' OR display_name = 'Montville';

-- 7. Northern Valley at Demarest — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Norsemen', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'NV/Demarest', town = 'Demarest', county = 'Bergen', founded_year = 1955,
  website_url = 'https://nvd.nvnet.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@NVDemarest'
WHERE display_name ILIKE 'Northern Valley%Demarest%';

-- 8. Northern Valley at Old Tappan — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Golden Knights', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'NVOT', town = 'Old Tappan', county = 'Bergen', founded_year = 1962,
  website_url = 'https://nvot.nvnet.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@NVOT_Athletics'
WHERE display_name ILIKE 'Northern Valley%Old Tappan%';

-- 9. Paramus — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Spartans', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Paramus', county = 'Bergen', founded_year = 1957,
  website_url = 'https://phs.paramus.k12.nj.us', athletic_conference = 'Big North Conference',
  twitter_handle = '@Spartan_AD'
WHERE display_name = 'Paramus';

-- 10. Ramapo — Sources: Wikipedia, MaxPreps, NJSIAA (Dark Green/White)
UPDATE schools SET
  mascot = 'Green Raiders', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Franklin Lakes', county = 'Bergen', founded_year = 1957,
  website_url = 'https://ramapo.rih.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@RamapoAthletics'
WHERE display_name = 'Ramapo';

-- 11. River Dell — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Golden Hawks', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Oradell', county = 'Bergen', founded_year = NULL,
  website_url = 'https://rdhs.riverdell.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@RiverDellHawks'
WHERE display_name = 'River Dell';

-- 12. Sparta — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Spartans', primary_color = '#0F3063', secondary_color = '#7AABDE', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Sparta', county = 'Sussex', founded_year = 1959,
  website_url = 'https://www.sparta.org/o/shs', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@SpartaAthletics'
WHERE display_name = 'Sparta';

-- 13. Tenafly — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tigers', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Tenafly', county = 'Bergen', founded_year = 1924,
  website_url = 'https://ths.tenaflyschools.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@GoTigersTHS'
WHERE display_name = 'Tenafly';

-- 14. Wayne Hills — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Wayne', county = 'Passaic', founded_year = 1966,
  website_url = 'https://www.wayneschools.com/o/whhs', athletic_conference = 'Big North Conference',
  twitter_handle = '@whillsathletics'
WHERE display_name = 'Wayne Hills';

-- 15. Wayne Valley — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Indians', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Wayne', county = 'Passaic', founded_year = 1952,
  website_url = 'https://www.wayneschools.com/o/wvhs', athletic_conference = 'Big North Conference',
  twitter_handle = '@wvalleyathletic'
WHERE display_name = 'Wayne Valley';

-- ============================================================
-- NORTH I - GROUP 2
-- ============================================================

-- 16. Dumont — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Huskies', primary_color = '#503604', secondary_color = '#CC4E10', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Dumont', county = 'Bergen', founded_year = 1932,
  website_url = 'https://dhs.dumontnj.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@DumontHuskies'
WHERE display_name = 'Dumont';

-- 17. Glen Rock — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Glen Rock', county = 'Bergen', founded_year = 1956,
  website_url = 'https://mshs.glenrocknj.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@grpshighschool'
WHERE display_name = 'Glen Rock';

-- 18. High Point Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Wildcats', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Sussex', county = 'Sussex', founded_year = 1966,
  website_url = 'https://www.hpregional.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@HPRwildcats'
WHERE display_name ILIKE 'High Point%';

-- 19. Jefferson Township — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#002E62', secondary_color = '#FFDF00', tertiary_color = '#000000',
  nickname = NULL, town = 'Oak Ridge', county = 'Morris', founded_year = 1964,
  website_url = 'https://jths.jefftwp.org', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@JTHSFalcons'
WHERE display_name ILIKE 'Jefferson TWP%' OR display_name ILIKE 'Jefferson Township%';

-- 20. Lakeland Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Lancers', primary_color = '#CC0022', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Wanaque', county = 'Passaic', founded_year = 1958,
  website_url = 'https://www.lakeland.k12.nj.us', athletic_conference = 'Big North Conference',
  twitter_handle = '@LRHSNJ'
WHERE display_name ILIKE 'Lakeland Reg%';

-- 21. Mahwah — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Thunderbirds', primary_color = '#91BCD4', secondary_color = '#000000', tertiary_color = NULL,
  nickname = 'T-Birds', town = 'Mahwah', county = 'Bergen', founded_year = 1959,
  website_url = 'https://hs.mahwah.k12.nj.us', athletic_conference = 'Big North Conference',
  twitter_handle = '@MahwahHS'
WHERE display_name = 'Mahwah';

-- 22. Manchester Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Haledon', county = 'Passaic', founded_year = 1960,
  website_url = 'https://www.mrhs.net', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = NULL
WHERE display_name = 'Manchester Regional';

-- 23. Pascack Hills — Sources: Wikipedia, MaxPreps
-- Note: mascot changed from Cowboys to Broncos in 2021
UPDATE schools SET
  mascot = 'Broncos', primary_color = '#503604', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'Hills', town = 'Montvale', county = 'Bergen', founded_year = 1964,
  website_url = 'https://hills.pascack.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@PHathletics'
WHERE display_name ILIKE 'Pascack Hills%';

-- 24. Pascack Valley — Sources: Wikipedia, MaxPreps
-- Note: mascot changed from Indians to Panthers in 2021
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'PV', town = 'Hillsdale', county = 'Bergen', founded_year = 1955,
  website_url = 'https://valley.pascack.org', athletic_conference = 'Big North Conference',
  twitter_handle = '@PVALLEY_SPORTS'
WHERE display_name ILIKE 'Pascack Valley%';

-- 25. Ramsey — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Ramsey', county = 'Bergen', founded_year = 1909,
  website_url = 'https://www.ramsey.k12.nj.us/o/rhs', athletic_conference = 'Big North Conference',
  twitter_handle = '@RamseyAthletics'
WHERE display_name = 'Ramsey';

-- 26. Vernon Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Vernon', county = 'Sussex', founded_year = 1975,
  website_url = 'https://www.vtsd.com/o/vths', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@VTHSVikings'
WHERE display_name = 'Vernon Township';

-- 27. West Milford — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Highlanders', primary_color = '#231F20', secondary_color = '#FED604', tertiary_color = NULL,
  nickname = NULL, town = 'West Milford', county = 'Passaic', founded_year = 1962,
  website_url = 'https://www.wmtps.org/o/wmhs', athletic_conference = 'Big North Conference',
  twitter_handle = '@WMAthleticDept'
WHERE display_name ILIKE 'West Milford%';

-- 28. Westwood Regional — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Cardinals', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = NULL, town = 'Township of Washington', county = 'Bergen', founded_year = NULL,
  website_url = 'https://www.wwrsd.org/o/westwood-hs', athletic_conference = 'Big North Conference',
  twitter_handle = '@WWRSDAthletics'
WHERE display_name ILIKE 'Westwood%' AND display_name NOT ILIKE '%Boonton%';

-- ============================================================
-- NORTH I - GROUP 1
-- ============================================================

-- 29. Boonton — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bombers', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Boonton', county = 'Morris', founded_year = 1875,
  website_url = 'https://www.boontonschools.org/o/bhs', athletic_conference = 'Northwest Jersey Athletic Conference',
  twitter_handle = '@bomberathletics'
WHERE display_name = 'Boonton';

-- 30. Butler — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bulldogs', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Butler', county = 'Morris', founded_year = 1903,
  website_url = 'https://bhs.butlerboe.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@bhsbulldogsnj'
WHERE display_name = 'Butler';
