-- Central Groups 4 & 5 school profiles — verified via Wikipedia, MaxPreps, athletics sites

-- ============================================================
-- CENTRAL - GROUP 5
-- ============================================================

-- 1. East Brunswick — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Bears', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'EB', town = 'East Brunswick', county = 'Middlesex', founded_year = 1958,
  website_url = 'https://hs.ebnet.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@eb_athletics'
WHERE display_name ILIKE 'East Brunswick%';

-- 2. Edison — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Eagles', primary_color = '#CC0022', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Edison', county = 'Middlesex', founded_year = 1956,
  website_url = 'https://ehs.edison.k12.nj.us', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@EHSSouthside'
WHERE display_name = 'Edison';

-- 3. Franklin — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Warriors', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Somerset', county = 'Somerset', founded_year = 1961,
  website_url = 'https://www.franklinboe.org/o/fahs', athletic_conference = 'Skyland Conference',
  twitter_handle = '@TheFHSAthletics'
WHERE display_name = 'Franklin';

-- 4. Freehold Township — Sources: Wikipedia, MaxPreps
-- Note: Wikipedia says Navy Blue/Columbia Blue/White, not blue/gold
UPDATE schools SET
  mascot = 'Patriots', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'FTHS', town = 'Freehold Township', county = 'Monmouth', founded_year = 1972,
  website_url = 'https://freeholdtwp.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@FTHSPatriots'
WHERE display_name = 'Freehold Township';

-- 5. Jackson Memorial / Jackson Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Jaguars', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = 'JMHS', town = 'Jackson', county = 'Ocean', founded_year = 1963,
  website_url = 'https://jths.jacksonsd.org', athletic_conference = 'Shore Conference',
  twitter_handle = NULL
WHERE display_name ILIKE 'Jackson Memorial%' OR display_name ILIKE 'Jackson Township%';

-- 6. Hillsborough — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Raiders', primary_color = '#CC0022', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Hillsborough', county = 'Somerset', founded_year = 1969,
  website_url = 'https://hhs.htps.us', athletic_conference = 'Skyland Conference',
  twitter_handle = '@boro_raiders'
WHERE display_name = 'Hillsborough';

-- 7. Hunterdon Central — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Red Devils', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = 'HC', town = 'Flemington', county = 'Hunterdon', founded_year = 1956,
  website_url = 'https://www.hcrhs.org', athletic_conference = 'Skyland Conference',
  twitter_handle = '@HCRHSAthletics'
WHERE display_name ILIKE 'Hunterdon Central%';

-- 8. Monroe Township — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Falcons', primary_color = '#754ACC', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Monroe Township', county = 'Middlesex', founded_year = 1974,
  website_url = 'https://mths.monroe.k12.nj.us', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@MonroeTwpHS'
WHERE display_name = 'Monroe Township';

-- 9. New Brunswick — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Zebras', primary_color = '#034CB2', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'NBHS', town = 'New Brunswick', county = 'Middlesex', founded_year = 1875,
  website_url = 'https://hs.nbpschools.net', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@NBHSZebras'
WHERE display_name = 'New Brunswick';

-- 10. North Brunswick — Sources: Wikipedia, MaxPreps (3 colors)
UPDATE schools SET
  mascot = 'Raiders', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = '#FFFFFF',
  nickname = NULL, town = 'North Brunswick', county = 'Middlesex', founded_year = 1973,
  website_url = 'https://nbths.nbtschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@NB_RaiderNation'
WHERE display_name ILIKE 'North Brunswick%';

-- 11. Old Bridge — Sources: Wikipedia, MaxPreps (3 colors, purple/black/white)
UPDATE schools SET
  mascot = 'Knights', primary_color = '#754ACC', secondary_color = '#222222', tertiary_color = '#FFFFFF',
  nickname = 'OBHS', town = 'Old Bridge', county = 'Middlesex', founded_year = 1994,
  website_url = 'https://www.oldbridgeadmin.org/o/obhs', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@ob_kosb'
WHERE display_name = 'Old Bridge';

-- 12. Perth Amboy — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Panthers', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Perth Amboy', county = 'Middlesex', founded_year = 1881,
  website_url = 'https://pahs.paps.net', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = NULL
WHERE display_name = 'Perth Amboy';

-- 13. South Brunswick — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Vikings', primary_color = '#222222', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Monmouth Junction', county = 'Middlesex', founded_year = 1960,
  website_url = 'https://sbhs.sbschools.org', athletic_conference = 'Greater Middlesex Conference',
  twitter_handle = '@WeAreSBVikings'
WHERE display_name = 'South Brunswick';

-- 14. Trenton Central — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Tornadoes', primary_color = '#222222', secondary_color = '#CC0022', tertiary_color = NULL,
  nickname = NULL, town = 'Trenton', county = 'Mercer', founded_year = 1932,
  website_url = 'https://trentoncentralhs.ss20.sharpschool.com', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@TCHSTornadoes'
WHERE display_name = 'Trenton Central';

-- ============================================================
-- CENTRAL - GROUP 4
-- ============================================================

-- 15. Colts Neck — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Cougars', primary_color = '#0f6c0f', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Colts Neck', county = 'Monmouth', founded_year = 1998,
  website_url = 'https://coltsneck.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@CNHSAthletics'
WHERE display_name = 'Colts Neck';

-- 16. Freehold Boro — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Colonials', primary_color = '#001b64', secondary_color = '#e8b827', tertiary_color = '#000000',
  nickname = 'Freehold Boro', town = 'Freehold', county = 'Monmouth', founded_year = 1923,
  website_url = 'https://freehold.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@FBHSathletics'
WHERE display_name ILIKE 'Freehold Borough%' OR display_name ILIKE 'Freehold Boro%';

-- 17. Hamilton East (Steinert) — Sources: Wikipedia, athletics site CSS (3 colors)
UPDATE schools SET
  mascot = 'Spartans', primary_color = '#006000', secondary_color = '#FFFFFF', tertiary_color = '#000000',
  nickname = 'Steinert', town = 'Hamilton', county = 'Mercer', founded_year = 1967,
  website_url = 'https://hhe.htsdnj.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@htsd_steinert'
WHERE display_name ILIKE 'Hamilton East%';

-- 18. Hamilton West — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Hornets', primary_color = '#fe7722', secondary_color = '#000000', tertiary_color = NULL,
  nickname = NULL, town = 'Hamilton', county = 'Mercer', founded_year = 1929,
  website_url = 'https://hhw.htsdnj.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@hwathleticdept'
WHERE display_name = 'Hamilton West';

-- 19. Hightstown — Sources: Wikipedia, athletics site CSS
UPDATE schools SET
  mascot = 'Rams', primary_color = '#13275d', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Hightstown', county = 'Mercer', founded_year = 1913,
  website_url = 'https://hhs.ewrsd.org', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@HHSRamsAthletic'
WHERE display_name = 'Hightstown';

-- 20. Lakewood — Sources: Wikipedia, school site CSS
UPDATE schools SET
  mascot = 'Piners', primary_color = '#003e7e', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Lakewood', county = 'Ocean', founded_year = 1903,
  website_url = 'https://lhs.lakewoodpiners.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@LkwdAthletics'
WHERE display_name = 'Lakewood';

-- 21. Long Branch — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Green Wave', primary_color = '#00824B', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Long Branch', county = 'Monmouth', founded_year = 1899,
  website_url = 'https://lbhs.longbranch.k12.nj.us', athletic_conference = 'Shore Conference',
  twitter_handle = '@WAVEPRIDE'
WHERE display_name = 'Long Branch';

-- 22. Manalapan — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Braves', primary_color = '#CC0022', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = NULL, town = 'Englishtown', county = 'Monmouth', founded_year = 1971,
  website_url = 'https://manalapan.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@MHSBravesSports'
WHERE display_name = 'Manalapan';

-- 23. Marlboro — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Mustangs', primary_color = '#034CB2', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = NULL, town = 'Marlboro', county = 'Monmouth', founded_year = 1968,
  website_url = 'https://marlboro.frhsd.com', athletic_conference = 'Shore Conference',
  twitter_handle = '@MarlboroHSinNJ'
WHERE display_name = 'Marlboro';

-- 24. Red Bank Regional — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Buccaneers', primary_color = '#8F0018', secondary_color = '#FFFFFF', tertiary_color = NULL,
  nickname = 'RBR', town = 'Little Silver', county = 'Monmouth', founded_year = 1975,
  website_url = 'https://www.rbrhs.org', athletic_conference = 'Shore Conference',
  twitter_handle = '@rbrathletics'
WHERE display_name ILIKE 'Red Bank Regional%';

-- 25. West Windsor-Plainsboro North — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Northern Knights', primary_color = '#022C66', secondary_color = '#737272', tertiary_color = NULL,
  nickname = 'WW-P North', town = 'Plainsboro', county = 'Middlesex', founded_year = 1997,
  website_url = 'https://www.west-windsor-plainsboro.k12.nj.us/schools/high_school_north', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@WWP_Athletics'
WHERE display_name ILIKE 'West Windsor-Plainsboro N%';

-- 26. West Windsor-Plainsboro South — Sources: Wikipedia, MaxPreps
UPDATE schools SET
  mascot = 'Pirates', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  nickname = 'WW-P South', town = 'West Windsor', county = 'Mercer', founded_year = 1973,
  website_url = 'https://www.west-windsor-plainsboro.k12.nj.us/schools/high_school_south', athletic_conference = 'Colonial Valley Conference',
  twitter_handle = '@WWP_Athletics'
WHERE display_name ILIKE 'West Windsor-Plainsboro S%';

-- Also update the generic WW-P entry
UPDATE schools SET
  mascot = 'Pirates', primary_color = '#00824B', secondary_color = '#C8880A', tertiary_color = NULL,
  town = 'West Windsor', county = 'Mercer',
  athletic_conference = 'Colonial Valley Conference'
WHERE display_name = 'West Windsor-Plainsboro' AND display_name NOT ILIKE '%N%' AND display_name NOT ILIKE '%S%';
