-- North II Groups 4 & 5 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- NORTH II - GROUP 5
-- ============================================================

-- 1. Barringer — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Blue Bears', primary_color = '#0000FF', secondary_color = '#FFFFFF', tertiary_color = '#EE0700',
  nickname = NULL, town = 'Newark', county = 'Essex', founded_year = 1838,
  website_url = 'https://www.nps.k12.nj.us/barringer', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@NPSBarringer'
WHERE display_name ILIKE 'Barringer%';

-- 2. Bayonne — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Bees', primary_color = '#9A2A2A', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Bayonne', county = 'Hudson', founded_year = 1936,
  website_url = 'https://bhs.bboed.org', athletic_conference = 'Hudson County Interscholastic Athletic League',
  twitter_handle = '@BayonneHigh'
WHERE display_name = 'Bayonne';

-- 3. Bridgewater-Raritan — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#000000', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'BRHS', town = 'Bridgewater', county = 'Somerset', founded_year = 1959,
  website_url = 'https://hs.brrsd.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@BRRSDBRHS'
WHERE display_name = 'Bridgewater-Raritan';

-- 4. Columbia (Maplewood) — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#BA2400', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Maplewood', county = 'Essex', founded_year = 1814,
  website_url = 'https://columbia.somsdk12.org', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@CHSPrincipalNJ'
WHERE display_name = 'Columbia';

-- 5. East Side (Newark) — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Red Raiders', primary_color = '#BA1B26', secondary_color = '#1F1C1E', tertiary_color = NULL,
  nickname = NULL, town = 'Newark', county = 'Essex', founded_year = 1912,
  website_url = 'https://www.nps.k12.nj.us/EAS', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@ESHSathletics'
WHERE display_name = 'East Side';

-- 6. Elizabeth — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Minutemen', primary_color = '#ff1120', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Elizabeth', county = 'Union', founded_year = 1977,
  website_url = 'https://ehs.elizabethschooldistrict.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@ElizabethAthle1'
WHERE display_name = 'Elizabeth';

-- 7. Irvington — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Blue Knights', primary_color = '#090580', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Irvington', county = 'Essex', founded_year = 1895,
  website_url = 'https://irvington.k12.nj.us/schools/irvington-high-school', athletic_conference = 'Super Essex Conference',
  twitter_handle = '@irvblueknights'
WHERE display_name = 'Irvington';

-- 8. John P. Stevens — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Hawks', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'JPS', town = 'Edison', county = 'Middlesex', founded_year = 1964,
  website_url = 'https://jps.edison.k12.nj.us', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = NULL
WHERE display_name = 'John P. Stevens';

-- 9. Kearny — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Kardinals', primary_color = '#CC0022', secondary_color = '#222222', tertiary_color = NULL,
  nickname = NULL, town = 'Kearny', county = 'Hudson', founded_year = 1894,
  website_url = 'https://www.kearnyschools.com/o/khs', athletic_conference = 'Hudson County Interscholastic Athletic League',
  twitter_handle = '@KardsAthletics'
WHERE display_name = 'Kearny';

-- 10. Linden — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tigers', primary_color = '#222222', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Linden', county = 'Union', founded_year = 1910,
  website_url = 'https://www.lindenps.org/o/lhs', athletic_conference = 'Union County Conference',
  twitter_handle = '@AthleticsLinden'
WHERE display_name = 'Linden';

-- 11. Piscataway — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Chiefs', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Piscataway', county = 'Middlesex', founded_year = 1957,
  website_url = 'https://phs.piscatawayschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@Piscataway_HS'
WHERE display_name = 'Piscataway' OR display_name ILIKE 'Piscataway High%';

-- 12. Plainfield — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Cardinals', primary_color = '#034CB2', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Plainfield', county = 'Union', founded_year = 1857,
  website_url = 'https://phs.plainfieldnjk12.org', athletic_conference = 'Union County Conference',
  twitter_handle = '@plainfield_high'
WHERE display_name = 'Plainfield';

-- 13. Union — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Farmers', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Union', county = 'Union', founded_year = 1881,
  website_url = 'https://uhs.twpunionschools.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@UnionHS_Sports'
WHERE display_name = 'Union';

-- 14. Woodbridge — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Barrons', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Woodbridge', county = 'Middlesex', founded_year = 1911,
  website_url = 'https://www.woodbridge.k12.nj.us/o/whs', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@BarronsSports'
WHERE display_name = 'Woodbridge';

-- 15. Summit — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Hilltoppers', primary_color = '#8F0018', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'Summit', county = 'Union', founded_year = 1888,
  website_url = 'https://www.summit.k12.nj.us/schools/summit-high-school', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@ADSummitNJ'
WHERE display_name = 'Summit' OR display_name ILIKE 'Summit/%';

-- ============================================================
-- NORTH II - GROUP 4
-- ============================================================

-- 16. Colonia — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Colonia', county = 'Middlesex', founded_year = 1967,
  website_url = 'https://www.woodbridge.k12.nj.us/o/chs', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@CTown_NJsports'
WHERE display_name = 'Colonia';

-- 17. JFK Memorial (Iselin) — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'JFK', town = 'Iselin', county = 'Middlesex', founded_year = 1964,
  website_url = 'https://www.woodbridge.k12.nj.us/o/jfk', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'JFK-Iselin%' OR display_name ILIKE 'John F. Kennedy Memorial%';

-- 18. Middletown North — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Lions', primary_color = '#FC7701', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Middletown', county = 'Monmouth', founded_year = 1966,
  website_url = 'https://north.middletownk12.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@HighSchoolNorth'
WHERE display_name = 'Middletown North';

-- 19. Middletown South — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#034CB2', secondary_color = '#737272', tertiary_color = NULL,
  nickname = NULL, town = 'Middletown', county = 'Monmouth', founded_year = 1976,
  website_url = 'https://south.middletownk12.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@MHSSathletics'
WHERE display_name = 'Middletown South';

-- 20. Montgomery — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Skillman', county = 'Somerset', founded_year = 1969,
  website_url = 'https://mhs.mtsd.k12.nj.us', athletic_conference = 'Skyland Conference',
  twitter_handle = '@MHSCougarSports'
WHERE display_name = 'Montgomery';

-- 21. North Hunterdon — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Lions', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Annandale', county = 'Hunterdon', founded_year = 1951,
  website_url = 'https://www.nhvweb.net/nhhs/home', athletic_conference = 'Skyland Conference',
  twitter_handle = '@NHHS_Lions'
WHERE display_name = 'North Hunterdon';

-- 22. Princeton — Sources: Wikipedia, NJSIAA (Royal Blue/White)
-- Colors confirmed as Royal Blue and White but no verified hex from official source
UPDATE schools SET
  mascot = 'Little Tigers', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'PHS', town = 'Princeton', county = 'Mercer', founded_year = 1898,
  website_url = 'https://www.princetonk12.org/princeton-high-school', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = NULL
WHERE display_name = 'Princeton';

-- 23. Rahway — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Indians', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Rahway', county = 'Union', founded_year = 1941,
  website_url = 'https://rhs.rahway.net', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@RahwayHigh'
WHERE display_name = 'Rahway';

-- 24. Sayreville — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bombers', primary_color = '#034CB2', secondary_color = '#454444', tertiary_color = NULL,
  nickname = NULL, town = 'Parlin', county = 'Middlesex', founded_year = 1939,
  website_url = 'https://swmhs.sayrevillek12.net', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@SWMHSbombers'
WHERE display_name ILIKE 'Sayreville%';

-- 25. Scotch Plains-Fanwood — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Raiders', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'SPF', town = 'Scotch Plains', county = 'Union', founded_year = 1957,
  website_url = 'https://spfhs.spfk12.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@SPFProud'
WHERE display_name = 'Scotch Plains-Fanwood';

-- 26. Watchung Hills Regional — Sources: Wikipedia, MaxPreps, branding page (3 colors)
UPDATE schools SET
  mascot = 'Warriors', primary_color = '#503604', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = 'WHRHS', town = 'Warren', county = 'Somerset', founded_year = 1957,
  website_url = 'https://www.whrhs.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@WHRHS_Athletics'
WHERE display_name ILIKE 'Watchung Hills%';

-- 27. Westfield — Sources: Wikipedia, athletics site config
UPDATE schools SET
  mascot = 'Blue Devils', primary_color = '#0504C3', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Westfield', county = 'Union', founded_year = 1869,
  website_url = 'https://whs.westfieldnjk12.org', athletic_conference = 'Union County Interscholastic Athletic Conference',
  twitter_handle = '@WHS_BlueDevils'
WHERE display_name = 'Westfield';

-- 28. Lodi — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Rams', primary_color = '#034CB2', secondary_color = '#CC4E10', tertiary_color = NULL,
  nickname = NULL, town = 'Lodi', county = 'Bergen', founded_year = 1896,
  website_url = 'https://www.lodinjschools.org', athletic_conference = 'North Jersey Interscholastic Conference',
  twitter_handle = '@LodiHS_NJ'
WHERE display_name = 'Lodi';
