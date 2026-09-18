-- Tournament venue + team score import
-- Generated from scripts/generate_import_sql.mjs
-- Paste into Supabase SQL editor

-- Robin Leff
UPDATE public.in_season_tournaments SET
  venue_name = 'Southern Regional School District 11/12 High School',
  venue_address = '90 Cedar Bridge Rd, Stafford Township, NJ 08050',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Southern Regional%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Robin Leff%';

-- Crusader Classic
UPDATE public.in_season_tournaments SET
  venue_name = 'Elmwood Park Memorial High School',
  venue_address = '375 River Drive, Elmwood Park, NJ 07407',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Elmwood Park%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Crusader Classic%';

-- Dan Allen
UPDATE public.in_season_tournaments SET
  venue_name = 'Clayton High School',
  venue_address = '55 Pop Kramer Blvd, Clayton, NJ 08312',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Clayton%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Dan Allen%';

-- Irvington Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Irvington High School',
  venue_address = '1253 Clinton Ave, Irvington, NJ 07111',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Irvington%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Irvington Holiday%';

-- Vogeding
UPDATE public.in_season_tournaments SET
  venue_name = 'Paulsboro High School',
  venue_address = '670 North Delaware St, Paulsboro, NJ 08066',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Paulsboro%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Vogeding%';

-- Powerade
UPDATE public.in_season_tournaments SET
  venue_name = 'Canon-McMillan High School',
  venue_address = '314 Elm St Ext, Canonsburg, PA 15317',
  is_oos = true,
  location_school_id = NULL,
  banner_bg = '#00AEEF',
  banner_fg = '#FFFFFF'
WHERE name ILIKE '%Powerade%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 1, 'Lake Highland Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Highland Prep' LIMIT 1), 189.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 2, 'Malvern Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Malvern Prep' LIMIT 1), 176.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 3, 'Blair Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blair Academy' LIMIT 1), 165),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 4, 'Christian Brothers Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Christian Brothers Academy' LIMIT 1), 160.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 5, 'Wyoming Seminary', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wyoming Seminary' LIMIT 1), 156.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 6, 'Bishop McCort', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bishop McCort' LIMIT 1), 133.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 7, 'St. Joseph Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Joseph Regional' LIMIT 1), 128.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 8, 'Bishop McDevitt', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bishop McDevitt' LIMIT 1), 123.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 9, 'Notre Dame-Green Pond', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame-Green Pond' LIMIT 1), 105),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 10, 'St. Edwards', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Edwards' LIMIT 1), 101),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 11, 'Baylor School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Baylor School' LIMIT 1), 96.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 12, 'Chestnut Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Chestnut Ridge' LIMIT 1), 95.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 13, 'Kiski Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kiski Area' LIMIT 1), 88),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 14, 'Montoursville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Montoursville' LIMIT 1), 86.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 15, 'Trinity', (SELECT id FROM public.schools WHERE display_name ILIKE 'Trinity' LIMIT 1), 85.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 16, 'St. Francis', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Francis' LIMIT 1), 77),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 17, 'Norwin', (SELECT id FROM public.schools WHERE display_name ILIKE 'Norwin' LIMIT 1), 74.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 18, 'Derry Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Derry Area' LIMIT 1), 72.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 19, 'Penns Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Penns Valley' LIMIT 1), 67.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 20, 'University', (SELECT id FROM public.schools WHERE display_name ILIKE 'University' LIMIT 1), 67),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 21, 'Connellsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Connellsville' LIMIT 1), 65.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 22, 'Grove City', (SELECT id FROM public.schools WHERE display_name ILIKE 'Grove City' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 23, 'SLAM Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'SLAM Academy' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 24, 'Cedar Cliff', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Cliff' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 25, 'Cleveland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cleveland' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 26, 'Ponaganset', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ponaganset' LIMIT 1), 59.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 27, 'Reynolds', (SELECT id FROM public.schools WHERE display_name ILIKE 'Reynolds' LIMIT 1), 58.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 28, 'Bellefonte', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bellefonte' LIMIT 1), 58),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 29, 'Canon-McMillan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Canon-McMillan' LIMIT 1), 53),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 29, 'Line Mountain', (SELECT id FROM public.schools WHERE display_name ILIKE 'Line Mountain' LIMIT 1), 53),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 31, 'State College', (SELECT id FROM public.schools WHERE display_name ILIKE 'State College' LIMIT 1), 51.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 32, 'Franklin Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Franklin Regional' LIMIT 1), 47),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 33, 'Moon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Moon' LIMIT 1), 46.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 34, 'Altoona', (SELECT id FROM public.schools WHERE display_name ILIKE 'Altoona' LIMIT 1), 41),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 35, 'Parkersburg High', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parkersburg High' LIMIT 1), 40),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 35, 'Trinity', (SELECT id FROM public.schools WHERE display_name ILIKE 'Trinity' LIMIT 1), 40),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 37, 'Council Rock North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Council Rock North' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 38, 'Mountain View', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mountain View' LIMIT 1), 38),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 39, 'DuBois', (SELECT id FROM public.schools WHERE display_name ILIKE 'DuBois' LIMIT 1), 37.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 40, 'Germantown Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Germantown Academy' LIMIT 1), 36.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 41, 'SPIRE Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'SPIRE Academy' LIMIT 1), 35),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 42, 'Penn-Trafford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Penn-Trafford' LIMIT 1), 34.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 43, 'Archbishop Moeller', (SELECT id FROM public.schools WHERE display_name ILIKE 'Archbishop Moeller' LIMIT 1), 33),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 44, 'Parkersburg South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parkersburg South' LIMIT 1), 32),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 45, 'Loyola Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Loyola Academy' LIMIT 1), 30),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 46, 'Greater Latrobe', (SELECT id FROM public.schools WHERE display_name ILIKE 'Greater Latrobe' LIMIT 1), 29.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 47, 'West Greene', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Greene' LIMIT 1), 28),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 48, 'Abington Heights', (SELECT id FROM public.schools WHERE display_name ILIKE 'Abington Heights' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 48, 'Bentworth', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bentworth' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 48, 'Frank W. Cox', (SELECT id FROM public.schools WHERE display_name ILIKE 'Frank W. Cox' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 51, 'Thomas Jefferson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Thomas Jefferson' LIMIT 1), 25.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 52, 'Berks Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Berks Catholic' LIMIT 1), 24.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 53, 'Linsly School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Linsly School' LIMIT 1), 24),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 54, 'Battlefield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Battlefield' LIMIT 1), 22),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 55, 'Science Hill', (SELECT id FROM public.schools WHERE display_name ILIKE 'Science Hill' LIMIT 1), 19),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 56, 'Armstrong', (SELECT id FROM public.schools WHERE display_name ILIKE 'Armstrong' LIMIT 1), 18.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 57, 'Southern Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Southern Regional' LIMIT 1), 17),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 58, 'Homewood-Flossmoor', (SELECT id FROM public.schools WHERE display_name ILIKE 'Homewood-Flossmoor' LIMIT 1), 16.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 58, 'Jensen Beach', (SELECT id FROM public.schools WHERE display_name ILIKE 'Jensen Beach' LIMIT 1), 16.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 58, 'Mount Lebanon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount Lebanon' LIMIT 1), 16.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 58, 'Quaker Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Quaker Valley' LIMIT 1), 16.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 62, 'Cranberry', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cranberry' LIMIT 1), 16),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 63, 'AIM Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'AIM Academy' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 63, 'Brentsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brentsville' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 65, 'Williamstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Williamstown' LIMIT 1), 13),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 66, 'Athens Christian School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Athens Christian School' LIMIT 1), 12),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 66, 'Shaler', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shaler' LIMIT 1), 12),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 68, 'Franklin', (SELECT id FROM public.schools WHERE display_name ILIKE 'Franklin' LIMIT 1), 11.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 68, 'Muncy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Muncy' LIMIT 1), 11.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 70, 'Blacksburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blacksburg' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 70, 'Pittsburgh Central Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pittsburgh Central Catholic' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 70, 'Saegertown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saegertown' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 73, 'Waynesburg Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Waynesburg Central' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Powerade%' LIMIT 1), 74, 'St. John Neumann Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. John Neumann Catholic' LIMIT 1), 0);

-- Iron Man
UPDATE public.in_season_tournaments SET
  venue_name = 'Walsh Jesuit High School',
  venue_address = '4550 Wyoga Lake Road, Cuyahoga Falls, OH 44224',
  is_oos = true,
  location_school_id = NULL,
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Iron Man%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 1, 'Faith Christian Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Faith Christian Academy' LIMIT 1), 141),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 2, 'Blair Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blair Academy' LIMIT 1), 129),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 3, 'Delbarton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delbarton' LIMIT 1), 122),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 4, 'Lake Highland Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Highland Prep' LIMIT 1), 120),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 5, 'Malvern Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Malvern Prep' LIMIT 1), 112),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 6, 'Bishop McCort', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bishop McCort' LIMIT 1), 88.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 7, 'Wyoming Seminary', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wyoming Seminary' LIMIT 1), 85),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 8, 'Christian Brothers Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Christian Brothers Academy' LIMIT 1), 80.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 9, 'Perrysburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Perrysburg' LIMIT 1), 72.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 10, 'Edmond North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Edmond North' LIMIT 1), 70),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 11, 'Union County', (SELECT id FROM public.schools WHERE display_name ILIKE 'Union County' LIMIT 1), 68.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 12, 'Stillwater', (SELECT id FROM public.schools WHERE display_name ILIKE 'Stillwater' LIMIT 1), 66.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 13, 'Massillon Perry', (SELECT id FROM public.schools WHERE display_name ILIKE 'Massillon Perry' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 14, 'St Edward', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Edward' LIMIT 1), 62.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 15, 'Brecksville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brecksville' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 16, 'Crown Point', (SELECT id FROM public.schools WHERE display_name ILIKE 'Crown Point' LIMIT 1), 56.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 17, 'Notre Dame-Green Pond', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame-Green Pond' LIMIT 1), 54.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 18, 'Green Farms Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Green Farms Academy' LIMIT 1), 53),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 19, 'Bixby', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bixby' LIMIT 1), 52.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 20, 'Allen', (SELECT id FROM public.schools WHERE display_name ILIKE 'Allen' LIMIT 1), 52),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 21, 'Brownsburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brownsburg' LIMIT 1), 50),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 22, 'Hononegah', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hononegah' LIMIT 1), 49),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 23, 'Dublin Coffman', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dublin Coffman' LIMIT 1), 48.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 24, 'Marmion Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Marmion Academy' LIMIT 1), 42.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 25, 'Pomona', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pomona' LIMIT 1), 37.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 26, 'Layton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Layton' LIMIT 1), 37),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 26, 'Sunnyside', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sunnyside' LIMIT 1), 37),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 28, 'IC Catholic Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'IC Catholic Prep' LIMIT 1), 36.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 28, 'Warren Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Warren Township' LIMIT 1), 36.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 30, 'St Charles East', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Charles East' LIMIT 1), 36),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 31, 'Bethlehem Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bethlehem Catholic' LIMIT 1), 35.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 32, 'Washington Community', (SELECT id FROM public.schools WHERE display_name ILIKE 'Washington Community' LIMIT 1), 35),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 33, 'Avon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Avon' LIMIT 1), 34),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 34, 'Broken Arrow', (SELECT id FROM public.schools WHERE display_name ILIKE 'Broken Arrow' LIMIT 1), 33.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 35, 'Mount Carmel', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount Carmel' LIMIT 1), 33),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 36, 'Lowell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lowell' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 36, 'Loyola Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Loyola Academy' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 38, 'Westfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westfield' LIMIT 1), 31.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 39, 'Graham', (SELECT id FROM public.schools WHERE display_name ILIKE 'Graham' LIMIT 1), 28.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 40, 'Providence Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Providence Catholic' LIMIT 1), 28),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 40, 'South Summit', (SELECT id FROM public.schools WHERE display_name ILIKE 'South Summit' LIMIT 1), 28),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 42, 'Coweta', (SELECT id FROM public.schools WHERE display_name ILIKE 'Coweta' LIMIT 1), 27.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 43, 'Lawrence North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lawrence North' LIMIT 1), 27),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 44, 'Edison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Edison' LIMIT 1), 26.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 45, 'Miami Southridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Miami Southridge' LIMIT 1), 25.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 45, 'Northampton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northampton' LIMIT 1), 25.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 47, 'Honeoye Falls-Lima', (SELECT id FROM public.schools WHERE display_name ILIKE 'Honeoye Falls-Lima' LIMIT 1), 25),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 47, 'Mount Vernon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount Vernon' LIMIT 1), 25),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 49, 'Center Grove', (SELECT id FROM public.schools WHERE display_name ILIKE 'Center Grove' LIMIT 1), 21),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 50, 'Spire Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Spire Academy' LIMIT 1), 19.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 50, 'Streetsboro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Streetsboro' LIMIT 1), 19.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 52, 'Marian Central Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Marian Central Catholic' LIMIT 1), 19),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 52, 'Stuart W. Cramer', (SELECT id FROM public.schools WHERE display_name ILIKE 'Stuart W. Cramer' LIMIT 1), 19),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 54, 'St Pius X', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Pius X' LIMIT 1), 18.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 55, 'AIM Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'AIM Academy' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 55, 'Lafayette', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lafayette' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 57, 'Baylor School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Baylor School' LIMIT 1), 17),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 57, 'Clay', (SELECT id FROM public.schools WHERE display_name ILIKE 'Clay' LIMIT 1), 17),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 59, 'Canyon Randall', (SELECT id FROM public.schools WHERE display_name ILIKE 'Canyon Randall' LIMIT 1), 16.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 60, 'Christian Brothers College', (SELECT id FROM public.schools WHERE display_name ILIKE 'Christian Brothers College' LIMIT 1), 15.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 60, 'Parkersburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parkersburg' LIMIT 1), 15.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 60, 'Ponderosa', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ponderosa' LIMIT 1), 15.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 63, 'Highland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Highland' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 63, 'Shoreham-Wading River', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shoreham-Wading River' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 65, 'Teurlings Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Teurlings Catholic' LIMIT 1), 14.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 66, 'Syracuse', (SELECT id FROM public.schools WHERE display_name ILIKE 'Syracuse' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 67, 'Cleveland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cleveland' LIMIT 1), 13.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 67, 'St Francis', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Francis' LIMIT 1), 13.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 69, 'Lake Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Catholic' LIMIT 1), 13),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 69, 'Skutt Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Skutt Catholic' LIMIT 1), 13),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 71, 'Bismarck Legacy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bismarck Legacy' LIMIT 1), 12.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 72, 'St Francis Desales', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Francis Desales' LIMIT 1), 12),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 73, 'Delta', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delta' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 73, 'SLAM Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'SLAM Academy' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 75, 'Mountain View', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mountain View' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 76, 'Archbishop Spalding', (SELECT id FROM public.schools WHERE display_name ILIKE 'Archbishop Spalding' LIMIT 1), 9.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 77, 'Lockport', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lockport' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 77, 'Seckman', (SELECT id FROM public.schools WHERE display_name ILIKE 'Seckman' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 77, 'West Holmes', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Holmes' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 80, 'St Viator', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Viator' LIMIT 1), 8.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 81, 'Staley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Staley' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 81, 'University', (SELECT id FROM public.schools WHERE display_name ILIKE 'University' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 83, 'Columbia', (SELECT id FROM public.schools WHERE display_name ILIKE 'Columbia' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 83, 'Merritt Island', (SELECT id FROM public.schools WHERE display_name ILIKE 'Merritt Island' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 83, 'Plainedge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Plainedge' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Central Arkansas Christian', (SELECT id FROM public.schools WHERE display_name ILIKE 'Central Arkansas Christian' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Corner Canyon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Corner Canyon' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Davis', (SELECT id FROM public.schools WHERE display_name ILIKE 'Davis' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Genoa Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Genoa Area' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Moeller', (SELECT id FROM public.schools WHERE display_name ILIKE 'Moeller' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'St Xavier', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Xavier' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 86, 'Westlake', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westlake' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 93, 'Beaver Local', (SELECT id FROM public.schools WHERE display_name ILIKE 'Beaver Local' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 93, 'Fox Lake', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fox Lake' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 93, 'Homewood-Flossmoor', (SELECT id FROM public.schools WHERE display_name ILIKE 'Homewood-Flossmoor' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 93, 'Lake Gibson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Gibson' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 93, 'South Rowan', (SELECT id FROM public.schools WHERE display_name ILIKE 'South Rowan' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Beachwood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Beachwood' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Creighton Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Creighton Prep' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Hersey', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hersey' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Lima Central Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lima Central Catholic' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Malad', (SELECT id FROM public.schools WHERE display_name ILIKE 'Malad' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'Montini Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Montini Catholic' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 98, 'St Christopher''s School', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Christopher''s School' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 105, 'St Vincent-St Mary', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Vincent-St Mary' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 105, 'Staunton River', (SELECT id FROM public.schools WHERE display_name ILIKE 'Staunton River' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 105, 'University', (SELECT id FROM public.schools WHERE display_name ILIKE 'University' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 108, 'Wadsworth', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wadsworth' LIMIT 1), 3.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 109, 'Cathedral', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cathedral' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 109, 'Elder', (SELECT id FROM public.schools WHERE display_name ILIKE 'Elder' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 109, 'Trotwood-Madison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Trotwood-Madison' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Barberton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Barberton' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Cuyahoga Valley Christian Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cuyahoga Valley Christian Academy' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Francis Howell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Francis Howell' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Medina Buckeye', (SELECT id FROM public.schools WHERE display_name ILIKE 'Medina Buckeye' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Ontario', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ontario' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Sheridan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sheridan' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 112, 'Walsh Jesuit', (SELECT id FROM public.schools WHERE display_name ILIKE 'Walsh Jesuit' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 119, 'Francis Howell North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Francis Howell North' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Iron Man%' LIMIT 1), 119, 'Great Bridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Great Bridge' LIMIT 1), 0);

-- Beast of the East
UPDATE public.in_season_tournaments SET
  venue_name = 'Bob Carpenter Center',
  venue_address = '631 South College Avenue, Newark, DE 19716',
  is_oos = true,
  location_school_id = NULL,
  banner_bg = '#00539B',
  banner_fg = '#FED141'
WHERE name ILIKE '%Beast of the East%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 1, 'Blair Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blair Academy' LIMIT 1), 250),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 2, 'Lake Highland Preparatory School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Highland Preparatory School' LIMIT 1), 247),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 3, 'Malvern Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Malvern Prep' LIMIT 1), 233),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 4, 'Bishop McCort', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bishop McCort' LIMIT 1), 176.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 5, 'Notre Dame Green Pond', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame Green Pond' LIMIT 1), 147),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 6, 'Brecksville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brecksville' LIMIT 1), 133.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 7, 'Bethlehem Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bethlehem Catholic' LIMIT 1), 110),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 7, 'St Peter Preparatory', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Peter Preparatory' LIMIT 1), 110),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 9, 'Grassfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Grassfield' LIMIT 1), 99.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 10, 'Nazareth', (SELECT id FROM public.schools WHERE display_name ILIKE 'Nazareth' LIMIT 1), 94),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 11, 'Bergen Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bergen Catholic' LIMIT 1), 89.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 12, 'Dobyns Bennett', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dobyns Bennett' LIMIT 1), 73),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 13, 'Norwin', (SELECT id FROM public.schools WHERE display_name ILIKE 'Norwin' LIMIT 1), 71),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 14, 'Whitehall', (SELECT id FROM public.schools WHERE display_name ILIKE 'Whitehall' LIMIT 1), 68),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 15, 'Archbishop Spalding', (SELECT id FROM public.schools WHERE display_name ILIKE 'Archbishop Spalding' LIMIT 1), 66.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 16, 'Camden Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Camden Catholic' LIMIT 1), 65.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 17, 'Mountain View', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mountain View' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 17, 'Seton Hall Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Seton Hall Prep' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 19, 'Cedar Cliff', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Cliff' LIMIT 1), 62),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 20, 'Loyola Blakefield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Loyola Blakefield' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 21, 'Germantown Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Germantown Academy' LIMIT 1), 59),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 21, 'Skyline', (SELECT id FROM public.schools WHERE display_name ILIKE 'Skyline' LIMIT 1), 59),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 21, 'St Paul VI Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Paul VI Catholic' LIMIT 1), 59),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 24, 'Don Bosco Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Don Bosco Prep' LIMIT 1), 58),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 24, 'Easton Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Easton Area' LIMIT 1), 58),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 24, 'Paramus Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paramus Catholic' LIMIT 1), 58),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 27, 'Cape Henlopen', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cape Henlopen' LIMIT 1), 57),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 28, 'Mount St Joseph', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount St Joseph' LIMIT 1), 54),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 28, 'Wyoming Seminary', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wyoming Seminary' LIMIT 1), 54),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 30, 'Christian Brothers Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Christian Brothers Academy' LIMIT 1), 53.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 30, 'Howell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Howell' LIMIT 1), 53.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 30, 'St Joseph Metuchen', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Joseph Metuchen' LIMIT 1), 53.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 33, 'Christiansburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Christiansburg' LIMIT 1), 52.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 33, 'Downingtown West', (SELECT id FROM public.schools WHERE display_name ILIKE 'Downingtown West' LIMIT 1), 52.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 33, 'Saucon Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saucon Valley' LIMIT 1), 52.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 36, 'The Hill School', (SELECT id FROM public.schools WHERE display_name ILIKE 'The Hill School' LIMIT 1), 51.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 37, 'Frank W Cox', (SELECT id FROM public.schools WHERE display_name ILIKE 'Frank W Cox' LIMIT 1), 51),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 38, 'Southern Lehigh', (SELECT id FROM public.schools WHERE display_name ILIKE 'Southern Lehigh' LIMIT 1), 50.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 39, 'Delaware Military Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delaware Military Academy' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 40, 'NY Military Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'NY Military Academy' LIMIT 1), 47.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 41, 'St John Vianney', (SELECT id FROM public.schools WHERE display_name ILIKE 'St John Vianney' LIMIT 1), 47),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 42, 'Hanover Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hanover Park' LIMIT 1), 45.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 43, 'Bethalto (Civic Memorial)', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bethalto (Civic Memorial)' LIMIT 1), 45),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 43, 'Immaculata', (SELECT id FROM public.schools WHERE display_name ILIKE 'Immaculata' LIMIT 1), 45),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 45, 'Northfield Mt Hermon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northfield Mt Hermon' LIMIT 1), 43),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 46, 'Rumson-Fair Haven Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rumson-Fair Haven Regional' LIMIT 1), 42.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 47, 'St Christopher', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Christopher' LIMIT 1), 42),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 48, 'Great Bridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Great Bridge' LIMIT 1), 41),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 48, 'Washington Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Washington Township' LIMIT 1), 41),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 50, 'Loudon County', (SELECT id FROM public.schools WHERE display_name ILIKE 'Loudon County' LIMIT 1), 40.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 51, 'Council Rock North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Council Rock North' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 51, 'West Springfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Springfield' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 53, 'Gilman School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gilman School' LIMIT 1), 38.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 54, 'Timberlane', (SELECT id FROM public.schools WHERE display_name ILIKE 'Timberlane' LIMIT 1), 37),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 55, 'Bullis Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bullis Prep' LIMIT 1), 36.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 55, 'Kennett', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kennett' LIMIT 1), 36.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 57, 'Toms River East', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River East' LIMIT 1), 36),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 58, 'Pope John XXIII', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pope John XXIII' LIMIT 1), 35.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 59, 'McDonogh', (SELECT id FROM public.schools WHERE display_name ILIKE 'McDonogh' LIMIT 1), 33.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 59, 'Northern Lebanon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Lebanon' LIMIT 1), 33.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 61, 'Holmdel', (SELECT id FROM public.schools WHERE display_name ILIKE 'Holmdel' LIMIT 1), 33),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 62, 'Benedictine College Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Benedictine College Prep' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 62, 'Caesar Rodney', (SELECT id FROM public.schools WHERE display_name ILIKE 'Caesar Rodney' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 62, 'Hatboro Horsham', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hatboro Horsham' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 62, 'Smyrna', (SELECT id FROM public.schools WHERE display_name ILIKE 'Smyrna' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 66, 'Watchung Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Watchung Hills' LIMIT 1), 32),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 66, 'Woodgrove', (SELECT id FROM public.schools WHERE display_name ILIKE 'Woodgrove' LIMIT 1), 32),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 66, 'Woodstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Woodstown' LIMIT 1), 32),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 69, 'Stafford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Stafford' LIMIT 1), 30.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 70, 'Oxford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Oxford' LIMIT 1), 30),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 71, 'Xavier', (SELECT id FROM public.schools WHERE display_name ILIKE 'Xavier' LIMIT 1), 29),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 72, 'Gettysburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gettysburg' LIMIT 1), 28.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 72, 'St Augustine', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Augustine' LIMIT 1), 28.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 74, 'Lacey', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lacey' LIMIT 1), 27),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 75, 'Long Beach', (SELECT id FROM public.schools WHERE display_name ILIKE 'Long Beach' LIMIT 1), 26.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 76, 'Brentsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brentsville' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 76, 'Dumont', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dumont' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 76, 'St Mary Ryken', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Mary Ryken' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 76, 'Westfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westfield' LIMIT 1), 26),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 80, 'Morris Community', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morris Community' LIMIT 1), 24),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 80, 'Salesianum', (SELECT id FROM public.schools WHERE display_name ILIKE 'Salesianum' LIMIT 1), 24),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 80, 'Teurlings Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Teurlings Catholic' LIMIT 1), 24),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 83, 'Fauquier', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fauquier' LIMIT 1), 23.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 84, 'AIM Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'AIM Academy' LIMIT 1), 23),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 84, 'Summit', (SELECT id FROM public.schools WHERE display_name ILIKE 'Summit' LIMIT 1), 23),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 86, 'Thomas Edison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Thomas Edison' LIMIT 1), 22),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 87, 'Belmont Hill', (SELECT id FROM public.schools WHERE display_name ILIKE 'Belmont Hill' LIMIT 1), 21.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 87, 'Eastern View', (SELECT id FROM public.schools WHERE display_name ILIKE 'Eastern View' LIMIT 1), 21.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 87, 'Kingsway', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kingsway' LIMIT 1), 21.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 87, 'St James Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'St James Academy' LIMIT 1), 21.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 91, 'Cranford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cranford' LIMIT 1), 21),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 91, 'North Burlington', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Burlington' LIMIT 1), 21),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 93, 'Haddonfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddonfield' LIMIT 1), 20),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 93, 'Salem', (SELECT id FROM public.schools WHERE display_name ILIKE 'Salem' LIMIT 1), 20),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 95, 'Caldwell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Caldwell' LIMIT 1), 18.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 95, 'JW Robinson', (SELECT id FROM public.schools WHERE display_name ILIKE 'JW Robinson' LIMIT 1), 18.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 97, 'Battlefield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Battlefield' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 97, 'Colts Neck', (SELECT id FROM public.schools WHERE display_name ILIKE 'Colts Neck' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 97, 'Conwell Egan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Conwell Egan' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 97, 'Kellam', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kellam' LIMIT 1), 18),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 101, 'Independence', (SELECT id FROM public.schools WHERE display_name ILIKE 'Independence' LIMIT 1), 17.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 101, 'Laurel', (SELECT id FROM public.schools WHERE display_name ILIKE 'Laurel' LIMIT 1), 17.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 103, 'Delone Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delone Catholic' LIMIT 1), 16),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 103, 'Pingry School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pingry School' LIMIT 1), 16),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 105, 'Acadiana', (SELECT id FROM public.schools WHERE display_name ILIKE 'Acadiana' LIMIT 1), 15.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 106, 'Calvert Hall College', (SELECT id FROM public.schools WHERE display_name ILIKE 'Calvert Hall College' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 106, 'Delran', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delran' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 106, 'Glenvar', (SELECT id FROM public.schools WHERE display_name ILIKE 'Glenvar' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 106, 'Hackettstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hackettstown' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 106, 'Independence VA', (SELECT id FROM public.schools WHERE display_name ILIKE 'Independence VA' LIMIT 1), 15),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 111, 'Brooke Point', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brooke Point' LIMIT 1), 14.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 111, 'LaSalle', (SELECT id FROM public.schools WHERE display_name ILIKE 'LaSalle' LIMIT 1), 14.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 111, 'The Peddie School', (SELECT id FROM public.schools WHERE display_name ILIKE 'The Peddie School' LIMIT 1), 14.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 114, 'John Jay Sr -East Fishkill', (SELECT id FROM public.schools WHERE display_name ILIKE 'John Jay Sr -East Fishkill' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 114, 'Passaic County Tech', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic County Tech' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 114, 'Ridgefield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ridgefield' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 114, 'Spotsylvania', (SELECT id FROM public.schools WHERE display_name ILIKE 'Spotsylvania' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 114, 'St Georges', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Georges' LIMIT 1), 14),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 119, 'First Colonial', (SELECT id FROM public.schools WHERE display_name ILIKE 'First Colonial' LIMIT 1), 13.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 119, 'Parsippany Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parsippany Hills' LIMIT 1), 13.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 119, 'Sussex Tech', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sussex Tech' LIMIT 1), 13.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 122, 'Hunterdon Central Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hunterdon Central Regional' LIMIT 1), 13),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 122, 'Phillips Exeter Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Phillips Exeter Academy' LIMIT 1), 13),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 124, 'Parkersburg South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parkersburg South' LIMIT 1), 12.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 125, 'Jackson Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Jackson Township' LIMIT 1), 12),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 125, 'Paulsboro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paulsboro' LIMIT 1), 12),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 127, 'DePaul Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'DePaul Catholic' LIMIT 1), 11.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 127, 'Goochland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Goochland' LIMIT 1), 11.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 129, 'Blacksburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blacksburg' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 129, 'Kinnelon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kinnelon' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 129, 'The Heights School', (SELECT id FROM public.schools WHERE display_name ILIKE 'The Heights School' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 132, 'Manhasset', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manhasset' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 132, 'Mount Airy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount Airy' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 132, 'New Kent', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Kent' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 132, 'Phillips Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Phillips Academy' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 132, 'Shawnee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shawnee' LIMIT 1), 10.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 137, 'Mercersburg Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mercersburg Academy' LIMIT 1), 10),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 137, 'Ocean Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ocean Lakes' LIMIT 1), 10),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 137, 'Paul VI', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paul VI' LIMIT 1), 10),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 140, 'Oakton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Oakton' LIMIT 1), 9.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 140, 'Pompton Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pompton Lakes' LIMIT 1), 9.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 140, 'Sussex Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sussex Central' LIMIT 1), 9.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 143, 'Lakeland Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lakeland Regional' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 143, 'Paramus', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paramus' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 143, 'Williamstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Williamstown' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 146, 'Manheim Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manheim Township' LIMIT 1), 8.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Cannon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cannon' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Clearview', (SELECT id FROM public.schools WHERE display_name ILIKE 'Clearview' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Danbury', (SELECT id FROM public.schools WHERE display_name ILIKE 'Danbury' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Fishburne Military School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fishburne Military School' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Patrick Henry', (SELECT id FROM public.schools WHERE display_name ILIKE 'Patrick Henry' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'Peninsula Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Peninsula Catholic' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 147, 'St John''s College', (SELECT id FROM public.schools WHERE display_name ILIKE 'St John''s College' LIMIT 1), 8),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 154, 'Haverford School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haverford School' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 154, 'North Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Brunswick' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 154, 'Warren Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Warren Hills' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 154, 'West Morris', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Morris' LIMIT 1), 7.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 158, 'Mount St Charles', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mount St Charles' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 158, 'Roselle Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Roselle Park' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 158, 'St John Paul the Great', (SELECT id FROM public.schools WHERE display_name ILIKE 'St John Paul the Great' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 158, 'Union', (SELECT id FROM public.schools WHERE display_name ILIKE 'Union' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 158, 'Valley Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Valley Central' LIMIT 1), 7),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 163, 'Riverheads', (SELECT id FROM public.schools WHERE display_name ILIKE 'Riverheads' LIMIT 1), 6.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 163, 'Sherando', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sherando' LIMIT 1), 6.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Bergenfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bergenfield' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Glen Allen', (SELECT id FROM public.schools WHERE display_name ILIKE 'Glen Allen' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Gonzaga', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gonzaga' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Northern Valley Regional - Old Tappan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Valley Regional - Old Tappan' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'St Marks', (SELECT id FROM public.schools WHERE display_name ILIKE 'St Marks' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Virginia Episcopal', (SELECT id FROM public.schools WHERE display_name ILIKE 'Virginia Episcopal' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 165, 'Western Branch', (SELECT id FROM public.schools WHERE display_name ILIKE 'Western Branch' LIMIT 1), 6),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 172, 'Fairfax', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fairfax' LIMIT 1), 5.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 172, 'James Wood', (SELECT id FROM public.schools WHERE display_name ILIKE 'James Wood' LIMIT 1), 5.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 174, 'Newark Charter', (SELECT id FROM public.schools WHERE display_name ILIKE 'Newark Charter' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 174, 'Notre Dame West Haven', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame West Haven' LIMIT 1), 5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 176, 'Cape Henry', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cape Henry' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 176, 'Chantilly', (SELECT id FROM public.schools WHERE display_name ILIKE 'Chantilly' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 176, 'Schalick', (SELECT id FROM public.schools WHERE display_name ILIKE 'Schalick' LIMIT 1), 4),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 179, 'Delmar', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delmar' LIMIT 1), 3.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 179, 'Heritage', (SELECT id FROM public.schools WHERE display_name ILIKE 'Heritage' LIMIT 1), 3.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 179, 'King George', (SELECT id FROM public.schools WHERE display_name ILIKE 'King George' LIMIT 1), 3.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 182, 'Broad Run', (SELECT id FROM public.schools WHERE display_name ILIKE 'Broad Run' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 182, 'Cosby', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cosby' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 182, 'Plainedge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Plainedge' LIMIT 1), 3),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 185, 'Amherst County', (SELECT id FROM public.schools WHERE display_name ILIKE 'Amherst County' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 185, 'Chancellor', (SELECT id FROM public.schools WHERE display_name ILIKE 'Chancellor' LIMIT 1), 2),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 187, 'Norfolk Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Norfolk Academy' LIMIT 1), 1),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 187, 'William Penn', (SELECT id FROM public.schools WHERE display_name ILIKE 'William Penn' LIMIT 1), 1),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'First State Military Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'First State Military Academy' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Hewlett', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hewlett' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Kempsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kempsville' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Morris Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morris Hills' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Northern Valley Demarest', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Valley Demarest' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Norwich', (SELECT id FROM public.schools WHERE display_name ILIKE 'Norwich' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'Patriot', (SELECT id FROM public.schools WHERE display_name ILIKE 'Patriot' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'River Dell Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'River Dell Regional' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'St. Paul''s School', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Paul''s School' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Beast of the East%' LIMIT 1), 189, 'William Penn Charter', (SELECT id FROM public.schools WHERE display_name ILIKE 'William Penn Charter' LIMIT 1), 0);

-- Bethlehem Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Liberty High School',
  venue_address = '1115 Linden Street, Bethlehem, PA 18018',
  is_oos = true,
  location_school_id = NULL,
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Bethlehem Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 1, 'Nazareth', (SELECT id FROM public.schools WHERE display_name ILIKE 'Nazareth' LIMIT 1), 171),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 2, 'Emmaus', (SELECT id FROM public.schools WHERE display_name ILIKE 'Emmaus' LIMIT 1), 147),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 3, 'Wilson West Lawn', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wilson West Lawn' LIMIT 1), 133.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 4, 'Whitehall', (SELECT id FROM public.schools WHERE display_name ILIKE 'Whitehall' LIMIT 1), 131),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 5, 'Parkland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parkland' LIMIT 1), 127),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 6, 'Council Rock South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Council Rock South' LIMIT 1), 125),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 7, 'Phillipsburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Phillipsburg' LIMIT 1), 122),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 8, 'North Allegheny', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Allegheny' LIMIT 1), 121.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 9, 'Kennett', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kennett' LIMIT 1), 120),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 10, 'Boyertown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Boyertown' LIMIT 1), 106.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 11, 'Hazleton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hazleton' LIMIT 1), 101),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 12, 'Saucon Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saucon Valley' LIMIT 1), 96.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 13, 'Quakertown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Quakertown' LIMIT 1), 96),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 14, 'Southern Lehigh', (SELECT id FROM public.schools WHERE display_name ILIKE 'Southern Lehigh' LIMIT 1), 91.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 15, 'Honesdale', (SELECT id FROM public.schools WHERE display_name ILIKE 'Honesdale' LIMIT 1), 87),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 16, 'Garnet Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Garnet Valley' LIMIT 1), 84),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 17, 'Liberty HS-Bethlehem', (SELECT id FROM public.schools WHERE display_name ILIKE 'Liberty HS-Bethlehem' LIMIT 1), 76.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 17, 'Northwestern Lehigh', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northwestern Lehigh' LIMIT 1), 76.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 19, 'Stroudsburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Stroudsburg' LIMIT 1), 73.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 20, 'West Scranton', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Scranton' LIMIT 1), 64),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 21, 'Williamsport Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Williamsport Area' LIMIT 1), 63),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 22, 'Freedom', (SELECT id FROM public.schools WHERE display_name ILIKE 'Freedom' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 23, 'North Penn', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Penn' LIMIT 1), 59),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 24, 'Hempfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hempfield' LIMIT 1), 53),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 25, 'Warwick', (SELECT id FROM public.schools WHERE display_name ILIKE 'Warwick' LIMIT 1), 45),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 26, 'Blue Mountain', (SELECT id FROM public.schools WHERE display_name ILIKE 'Blue Mountain' LIMIT 1), 42),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 26, 'Delaware Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delaware Valley' LIMIT 1), 42),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 26, 'Wilkes-Barre Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wilkes-Barre Area' LIMIT 1), 42),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 29, 'Wilson Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wilson Area' LIMIT 1), 9.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bethlehem Holiday%' LIMIT 1), 30, 'Wyoming Valley West', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wyoming Valley West' LIMIT 1), 2.5);

-- King of The Castle
UPDATE public.in_season_tournaments SET
  venue_name = 'Sussex Central High School',
  venue_address = '26044 Patriots Way, Georgetown, DE 19947',
  is_oos = true,
  location_school_id = NULL,
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%King of The Castle%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 1, 'Spring Grove Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Spring Grove Area' LIMIT 1), 206),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 2, 'Sussex Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sussex Central' LIMIT 1), 178.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 3, 'Sussex Tech', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sussex Tech' LIMIT 1), 168.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 4, 'High Point Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'High Point Regional' LIMIT 1), 150),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 5, 'Milford Senior', (SELECT id FROM public.schools WHERE display_name ILIKE 'Milford Senior' LIMIT 1), 144.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 6, 'Laurel', (SELECT id FROM public.schools WHERE display_name ILIKE 'Laurel' LIMIT 1), 143),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 7, 'Lake Forest', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lake Forest' LIMIT 1), 130.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 8, 'Great Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Great Valley' LIMIT 1), 129.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 9, 'West Chester Henderson', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Chester Henderson' LIMIT 1), 105),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 10, 'Red Lion Area', (SELECT id FROM public.schools WHERE display_name ILIKE 'Red Lion Area' LIMIT 1), 88.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 11, 'Delmar Junior-Senior', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delmar Junior-Senior' LIMIT 1), 81),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 12, 'Charter School of Wilmington', (SELECT id FROM public.schools WHERE display_name ILIKE 'Charter School of Wilmington' LIMIT 1), 66.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 13, 'Palisades', (SELECT id FROM public.schools WHERE display_name ILIKE 'Palisades' LIMIT 1), 55.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 14, 'Delcastle', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delcastle' LIMIT 1), 30.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%King of The Castle%' LIMIT 1), 15, 'Sussex Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sussex Academy' LIMIT 1), 24.5);

-- Blue Devil
UPDATE public.in_season_tournaments SET
  venue_name = 'Ewing High School',
  venue_address = '900 Parkway Avenue, Ewing Township, NJ 08618',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Ewing%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Blue Devil%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%' LIMIT 1), 1, 'Cinnaminson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cinnaminson' LIMIT 1), 256.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%' LIMIT 1), 2, 'Robbinsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Robbinsville' LIMIT 1), 189),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%' LIMIT 1), 3, 'Maple Shade', (SELECT id FROM public.schools WHERE display_name ILIKE 'Maple Shade' LIMIT 1), 169),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%' LIMIT 1), 4, 'Trenton Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Trenton Central' LIMIT 1), 121),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Blue Devil%' LIMIT 1), 5, 'Ewing', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ewing' LIMIT 1), 81);

-- Wendy Pandy
UPDATE public.in_season_tournaments SET
  venue_name = 'Delaware Valley High School',
  venue_address = '19 Senator Stout Rd, Frenchtown, NJ 08825',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Delaware Valley%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Wendy Pandy%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 1, 'Delaware Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delaware Valley' LIMIT 1), 179.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 2, 'Ocean Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ocean Township' LIMIT 1), 178.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 3, 'Wall', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wall' LIMIT 1), 153.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 4, 'Cherokee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cherokee' LIMIT 1), 111),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 5, 'Metuchen', (SELECT id FROM public.schools WHERE display_name ILIKE 'Metuchen' LIMIT 1), 107),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 6, 'South Hunterdon', (SELECT id FROM public.schools WHERE display_name ILIKE 'South Hunterdon' LIMIT 1), 96.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 7, 'Voorhees', (SELECT id FROM public.schools WHERE display_name ILIKE 'Voorhees' LIMIT 1), 80),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 8, 'Newton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Newton' LIMIT 1), 76.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 9, 'Bound Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bound Brook' LIMIT 1), 56.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 10, 'Manville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manville' LIMIT 1), 46.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Wendy Pandy%' LIMIT 1), 11, 'High Point Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'High Point Regional' LIMIT 1), 26.5);

-- Ramsey Invitational
UPDATE public.in_season_tournaments SET
  venue_name = 'Ramsey High School',
  venue_address = '256 East Main St, Ramsey, NJ 07446',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Ramsey%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Ramsey Invitational%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 1, 'Cedar Grove', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Grove' LIMIT 1), 197.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 2, 'Old Tappan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Old Tappan' LIMIT 1), 169.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 3, 'Ramapo', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ramapo' LIMIT 1), 124),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 4, 'North Bergen', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Bergen' LIMIT 1), 118),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 5, 'Lakeland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lakeland' LIMIT 1), 95.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 6, 'Manchester', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manchester' LIMIT 1), 88.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 7, 'Pompton Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pompton Lakes' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 8, 'Ramsey', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ramsey' LIMIT 1), 55),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 9, 'Waldwick/Midland Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Waldwick/Midland Park' LIMIT 1), 54.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 9, 'Wallkill Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wallkill Valley' LIMIT 1), 54.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ramsey Invitational%' LIMIT 1), 11, 'Sparta', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sparta' LIMIT 1), 10);

-- Schalick
UPDATE public.in_season_tournaments SET
  venue_name = 'Schalick High School',
  venue_address = '718 Centerton Rd, Pittsgrove, NJ 08318',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Schalick%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Schalick%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 1, 'Schalick', (SELECT id FROM public.schools WHERE display_name ILIKE 'Schalick' LIMIT 1), 208.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 2, 'Haddon Heights', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddon Heights' LIMIT 1), 173),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 3, 'Pennsauken', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pennsauken' LIMIT 1), 155),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 4, 'Mainland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mainland' LIMIT 1), 154.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 5, 'Cedar Creek', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Creek' LIMIT 1), 110),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 6, 'Oakcrest', (SELECT id FROM public.schools WHERE display_name ILIKE 'Oakcrest' LIMIT 1), 102.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 7, 'Willingboro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Willingboro' LIMIT 1), 65.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 8, 'Holy Spirit', (SELECT id FROM public.schools WHERE display_name ILIKE 'Holy Spirit' LIMIT 1), 62.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Schalick%' LIMIT 1), 9, 'Penns Grove', (SELECT id FROM public.schools WHERE display_name ILIKE 'Penns Grove' LIMIT 1), 33.5);

-- Ronald Bond
UPDATE public.in_season_tournaments SET
  venue_name = 'Haddonfield Memorial High School',
  venue_address = '401 Kings Hwy E, Haddonfield, NJ 08033',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Haddonfield%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Ronald Bond%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 1, 'Haddonfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddonfield' LIMIT 1), 236),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 2, 'Moorestown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Moorestown' LIMIT 1), 171),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 3, 'Cherry Hill East', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cherry Hill East' LIMIT 1), 153),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 4, 'Allentown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Allentown' LIMIT 1), 151),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 5, 'Hamilton North-Nottingham', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hamilton North-Nottingham' LIMIT 1), 102),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 6, 'Timber Creek', (SELECT id FROM public.schools WHERE display_name ILIKE 'Timber Creek' LIMIT 1), 95.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ronald Bond%' LIMIT 1), 7, 'St. Joseph (Hammonton)', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Joseph (Hammonton)' LIMIT 1), 71);

-- Dawson
UPDATE public.in_season_tournaments SET
  venue_name = 'Garfield High School',
  venue_address = '500 Palisade Ave, Garfield, NJ 07026',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Garfield%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Dawson%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 1, 'Hasbrouck Heights', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hasbrouck Heights' LIMIT 1), 198.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 2, 'Garfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Garfield' LIMIT 1), 158),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 3, 'Westwood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westwood' LIMIT 1), 121.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 4, 'New Milford', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Milford' LIMIT 1), 85),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 5, 'Lodi/Saddle Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lodi/Saddle Brook' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 6, 'Dwight Morrow', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dwight Morrow' LIMIT 1), 52),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 7, 'Ridgefield Park/Bogota', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ridgefield Park/Bogota' LIMIT 1), 50.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 8, 'Fort Lee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fort Lee' LIMIT 1), 32.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 9, 'St. Mary (Rutherford)', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Mary (Rutherford)' LIMIT 1), 23),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 10, 'College Achieve Paterson', (SELECT id FROM public.schools WHERE display_name ILIKE 'College Achieve Paterson' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dawson%' LIMIT 1), 10, 'Saddle River Day', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saddle River Day' LIMIT 1), 0);

-- Caldwell Tournament
UPDATE public.in_season_tournaments SET
  venue_name = 'James Caldwell High School',
  venue_address = '265 Westville Ave, West Caldwell, NJ 07006',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Caldwell%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Caldwell Tournament%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 1, 'Bergen Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bergen Catholic' LIMIT 1), 329),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 2, 'Passaic County Tech-Vocational', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic County Tech-Vocational' LIMIT 1), 183.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 3, 'West Morris Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Morris Central' LIMIT 1), 182.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 4, 'Caldwell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Caldwell' LIMIT 1), 143),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 5, 'Kittatinny Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kittatinny Regional' LIMIT 1), 103),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 6, 'River Dell', (SELECT id FROM public.schools WHERE display_name ILIKE 'River Dell' LIMIT 1), 97),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 7, 'Hunterdon Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hunterdon Central' LIMIT 1), 89.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 8, 'Emerson/Park Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Emerson/Park Ridge' LIMIT 1), 85.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Caldwell Tournament%' LIMIT 1), 9, 'St. Benedict''s Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Benedict''s Prep' LIMIT 1), 78);

-- McLaughlin
UPDATE public.in_season_tournaments SET
  venue_name = 'Ramapo Ridge Middle School',
  venue_address = '150 Ridge Rd, Mahwah, NJ 07430',
  is_oos = false,
  location_school_id = NULL,
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%McLaughlin%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 1, 'Northern Highlands Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Highlands Regional' LIMIT 1), 174),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 2, 'Passaic Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic Valley' LIMIT 1), 150.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 3, 'Mahwah', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mahwah' LIMIT 1), 135),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 4, 'Suffern', (SELECT id FROM public.schools WHERE display_name ILIKE 'Suffern' LIMIT 1), 93),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 5, 'Paramus', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paramus' LIMIT 1), 88.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 6, 'Cresskill', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cresskill' LIMIT 1), 83),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 6, 'Lyndhurst/North Arlington', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lyndhurst/North Arlington' LIMIT 1), 83),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 8, 'Leonia/Palisades Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Leonia/Palisades Park' LIMIT 1), 77.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%McLaughlin%' LIMIT 1), 9, 'Bergenfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bergenfield' LIMIT 1), 52);

-- Pete Adams
UPDATE public.in_season_tournaments SET
  venue_name = 'Vineland High School South',
  venue_address = '2880 East Chestnut Ave, Vineland, NJ 08361',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Vineland%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Pete Adams%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 1, 'Lower Cape May', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lower Cape May' LIMIT 1), 227.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 2, 'Clearview Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Clearview Regional' LIMIT 1), 169),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 3, 'Absegami', (SELECT id FROM public.schools WHERE display_name ILIKE 'Absegami' LIMIT 1), 119),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 4, 'Audubon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Audubon' LIMIT 1), 115.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 5, 'Middle Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middle Township' LIMIT 1), 112),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 6, 'Highland Regional/Triton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Highland Regional/Triton' LIMIT 1), 104),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 7, 'Haddon Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddon Township' LIMIT 1), 102),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 8, 'Eastern', (SELECT id FROM public.schools WHERE display_name ILIKE 'Eastern' LIMIT 1), 89),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 9, 'Millville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Millville' LIMIT 1), 58),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 10, 'Vineland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Vineland' LIMIT 1), 46),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Pete Adams%' LIMIT 1), 11, 'Salem', (SELECT id FROM public.schools WHERE display_name ILIKE 'Salem' LIMIT 1), 7);

-- Ricky I
UPDATE public.in_season_tournaments SET
  venue_name = 'Governor Livingston High School',
  venue_address = '175 Watchung Blvd, Berkeley Heights, NJ 07922',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Governor Livingston%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Ricky I%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 1, 'Matawan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Matawan' LIMIT 1), 196.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 2, 'Saint Mary''s Ryken', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saint Mary''s Ryken' LIMIT 1), 156),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 3, 'Hillsborough', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hillsborough' LIMIT 1), 144),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 4, 'Colonia', (SELECT id FROM public.schools WHERE display_name ILIKE 'Colonia' LIMIT 1), 139.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 5, 'Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ridge' LIMIT 1), 127.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 6, 'Bayonne', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bayonne' LIMIT 1), 118),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 7, 'Saint Thomas Aquinas', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saint Thomas Aquinas' LIMIT 1), 115),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 8, 'Saint Joseph Metuchen', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saint Joseph Metuchen' LIMIT 1), 113.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 9, 'Governor Livingston', (SELECT id FROM public.schools WHERE display_name ILIKE 'Governor Livingston' LIMIT 1), 95),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 10, 'Bound Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bound Brook' LIMIT 1), 93.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 11, 'Rumson Fair Haven', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rumson Fair Haven' LIMIT 1), 84),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 12, 'New Providence', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Providence' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 13, 'North Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Brunswick' LIMIT 1), 27),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Ricky I%' LIMIT 1), 14, 'Hoboken', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hoboken' LIMIT 1), 21);

-- Dover Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Dover High School',
  venue_address = '100 Grace St, Dover, NJ 07801',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Dover%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Dover Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 1, 'Union', (SELECT id FROM public.schools WHERE display_name ILIKE 'Union' LIMIT 1), 216.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 2, 'West Orange', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Orange' LIMIT 1), 151),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 3, 'Randolph', (SELECT id FROM public.schools WHERE display_name ILIKE 'Randolph' LIMIT 1), 145.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 4, 'Lenape Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lenape Valley' LIMIT 1), 138),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 5, 'Wayne Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wayne Hills' LIMIT 1), 137.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 6, 'West Milford Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Milford Township' LIMIT 1), 122.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 7, 'Columbia', (SELECT id FROM public.schools WHERE display_name ILIKE 'Columbia' LIMIT 1), 91),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 8, 'North Warren Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Warren Regional' LIMIT 1), 87),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 9, 'Arthur L. Johnson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Arthur L. Johnson' LIMIT 1), 83),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 10, 'Dover', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dover' LIMIT 1), 62),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dover Holiday%' LIMIT 1), 11, 'Summit/Chatham', (SELECT id FROM public.schools WHERE display_name ILIKE 'Summit/Chatham' LIMIT 1), 27);

-- Central Regional
UPDATE public.in_season_tournaments SET
  venue_name = 'Central Regional High School',
  venue_address = '509 Forest Hills Pkwy, Berkeley Township, NJ 08721',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Central Regional%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Central Regional%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 1, 'Toms River South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River South' LIMIT 1), 218.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 2, 'Central Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Central Regional' LIMIT 1), 177),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 3, 'Brick Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brick Township' LIMIT 1), 173.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 4, 'Toms River North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River North' LIMIT 1), 152),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 5, 'Barnegat', (SELECT id FROM public.schools WHERE display_name ILIKE 'Barnegat' LIMIT 1), 143.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 6, 'Pinelands', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pinelands' LIMIT 1), 112.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 7, 'Manchester Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manchester Township' LIMIT 1), 97.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Central Regional%' LIMIT 1), 8, 'Shore Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shore Regional' LIMIT 1), 58);

-- Dessino
UPDATE public.in_season_tournaments SET
  venue_name = 'Middlesex High School',
  venue_address = '300 John F Kennedy Dr, Middlesex, NJ 08846',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Middlesex%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Dessino%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 1, 'Middletown North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middletown North' LIMIT 1), 229),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 2, 'Bridgewater', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bridgewater' LIMIT 1), 177),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 3, 'Rahway', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rahway' LIMIT 1), 146),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 4, 'Edison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Edison' LIMIT 1), 118.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 5, 'JFK Iselin', (SELECT id FROM public.schools WHERE display_name ILIKE 'JFK Iselin' LIMIT 1), 114),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 6, 'Piscataway', (SELECT id FROM public.schools WHERE display_name ILIKE 'Piscataway' LIMIT 1), 84.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 7, 'Montgomery', (SELECT id FROM public.schools WHERE display_name ILIKE 'Montgomery' LIMIT 1), 77.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 8, 'Notre Dame', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame' LIMIT 1), 73),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 9, 'Brearley/Dayton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brearley/Dayton' LIMIT 1), 69),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 10, 'Somerville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Somerville' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 11, 'Middlesex', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middlesex' LIMIT 1), 59.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 12, 'Belvidere', (SELECT id FROM public.schools WHERE display_name ILIKE 'Belvidere' LIMIT 1), 58.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 13, 'North Plainfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Plainfield' LIMIT 1), 45),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Dessino%' LIMIT 1), 14, 'Plainfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Plainfield' LIMIT 1), 44.5);

-- Cutter Classic
UPDATE public.in_season_tournaments SET
  venue_name = 'Fair Lawn High School',
  venue_address = '14-00 Berdan Ave, Fair Lawn, NJ 07410',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Fair Lawn%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Cutter Classic%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 1, 'River Dell', (SELECT id FROM public.schools WHERE display_name ILIKE 'River Dell' LIMIT 1), 176),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 2, 'Fair Lawn', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fair Lawn' LIMIT 1), 157),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 3, 'Indian Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Indian Hills' LIMIT 1), 149),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 4, 'Teaneck', (SELECT id FROM public.schools WHERE display_name ILIKE 'Teaneck' LIMIT 1), 115),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 5, 'Lakeland', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lakeland' LIMIT 1), 107),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 6, 'Tenafly', (SELECT id FROM public.schools WHERE display_name ILIKE 'Tenafly' LIMIT 1), 101),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 7, 'Waldwick/Midland Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Waldwick/Midland Park' LIMIT 1), 89),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 8, 'Elmwood Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Elmwood Park' LIMIT 1), 87),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 9, 'Saddle Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saddle Brook' LIMIT 1), 74),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 10, 'Hackensack', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hackensack' LIMIT 1), 64),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 11, 'Waldwick', (SELECT id FROM public.schools WHERE display_name ILIKE 'Waldwick' LIMIT 1), 9),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Cutter Classic%' LIMIT 1), 12, 'Indian Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Indian Hills' LIMIT 1), 0);

-- Mustang Invitational
UPDATE public.in_season_tournaments SET
  venue_name = 'Clifton High School',
  venue_address = '333 Colfax Ave, Clifton, NJ 07013',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Clifton%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Mustang Invitational%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 1, 'Passaic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic' LIMIT 1), 193),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 2, 'Clifton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Clifton' LIMIT 1), 190.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 3, 'Becton/Wood-Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Becton/Wood-Ridge' LIMIT 1), 166.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 4, 'Morristown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morristown' LIMIT 1), 102),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 5, 'Montclair', (SELECT id FROM public.schools WHERE display_name ILIKE 'Montclair' LIMIT 1), 100.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 6, 'Hawthorne', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hawthorne' LIMIT 1), 88.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 7, 'Vernon Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Vernon Township' LIMIT 1), 73.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 8, 'Cliffside Park/Ridgefield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cliffside Park/Ridgefield' LIMIT 1), 71),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 9, 'Eastside (Paterson)', (SELECT id FROM public.schools WHERE display_name ILIKE 'Eastside (Paterson)' LIMIT 1), 32),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 10, 'John F. Kennedy', (SELECT id FROM public.schools WHERE display_name ILIKE 'John F. Kennedy' LIMIT 1), 31),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Invitational%' LIMIT 1), 11, 'Pioneer Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pioneer Academy' LIMIT 1), 8);

-- A-Nice
UPDATE public.in_season_tournaments SET
  venue_name = 'Roselle Park High School',
  venue_address = '185 West Webster Ave, Roselle Park, NJ 07204',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Roselle Park%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%A-Nice%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 1, 'Glen Rock', (SELECT id FROM public.schools WHERE display_name ILIKE 'Glen Rock' LIMIT 1), 169.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 2, 'Westfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westfield' LIMIT 1), 163.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 3, 'East Side', (SELECT id FROM public.schools WHERE display_name ILIKE 'East Side' LIMIT 1), 111),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 4, 'Hoboken', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hoboken' LIMIT 1), 85),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 5, 'Roselle Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Roselle Park' LIMIT 1), 80.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 6, 'Carteret', (SELECT id FROM public.schools WHERE display_name ILIKE 'Carteret' LIMIT 1), 79),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 7, 'Dumont', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dumont' LIMIT 1), 78),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 8, 'South River', (SELECT id FROM public.schools WHERE display_name ILIKE 'South River' LIMIT 1), 70),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 9, 'Glen Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Glen Ridge' LIMIT 1), 62),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%A-Nice%' LIMIT 1), 10, 'Wallkill Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wallkill Valley' LIMIT 1), 29);

-- Gator Beast
UPDATE public.in_season_tournaments SET
  venue_name = 'Gateway Regional High School',
  venue_address = '775 Tanyard Rd, Woodbury Heights, NJ 08097',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Gateway Regional%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Gator Beast%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 1, 'Lower Cape May Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lower Cape May Regional' LIMIT 1), 283.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 2, 'Lenape', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lenape' LIMIT 1), 219),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 3, 'Gateway Regional/Woodbury', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gateway Regional/Woodbury' LIMIT 1), 124),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 4, 'Maple Shade', (SELECT id FROM public.schools WHERE display_name ILIKE 'Maple Shade' LIMIT 1), 114.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 5, 'Red Bank Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Red Bank Regional' LIMIT 1), 94),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 6, 'Buena Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Buena Regional' LIMIT 1), 80.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 7, 'Winslow Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Winslow Township' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 8, 'Lindenwold', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lindenwold' LIMIT 1), 48.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 9, 'Palmyra', (SELECT id FROM public.schools WHERE display_name ILIKE 'Palmyra' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Gator Beast%' LIMIT 1), 10, 'Overbrook Regional Senior', (SELECT id FROM public.schools WHERE display_name ILIKE 'Overbrook Regional Senior' LIMIT 1), 43);

-- Laker Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Mountain Lakes High School',
  venue_address = '96 Powerville Rd, Mountain Lakes, NJ 07046',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Mountain Lakes%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Laker Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 1, 'Manville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manville' LIMIT 1), 195),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 2, 'Wayne Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wayne Valley' LIMIT 1), 160.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 3, 'Newton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Newton' LIMIT 1), 110.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 4, 'Madison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Madison' LIMIT 1), 105),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 5, 'Pequannock Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pequannock Township' LIMIT 1), 94),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 6, 'Hanover Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hanover Park' LIMIT 1), 87.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 7, 'Butler', (SELECT id FROM public.schools WHERE display_name ILIKE 'Butler' LIMIT 1), 70),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 8, 'West Morris (Mendham)', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Morris (Mendham)' LIMIT 1), 66.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 9, 'Boonton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Boonton' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 10, 'Parsippany Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parsippany Hills' LIMIT 1), 57.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 11, 'Ridgewood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ridgewood' LIMIT 1), 55),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 12, 'Mountain Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mountain Lakes' LIMIT 1), 41),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 13, 'Whippany Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Whippany Park' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 14, 'Kinnelon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kinnelon' LIMIT 1), 29.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 15, 'Columbia', (SELECT id FROM public.schools WHERE display_name ILIKE 'Columbia' LIMIT 1), 28),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Laker Holiday%' LIMIT 1), 16, 'Parsippany', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parsippany' LIMIT 1), 4);

-- Mazzola
UPDATE public.in_season_tournaments SET
  venue_name = 'Old Bridge High School',
  venue_address = '4209 County Rd 516, Matawan, NJ 07747',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Old Bridge%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Mazzola%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 1, 'Old Bridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Old Bridge' LIMIT 1), 197),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 2, 'North Brunswick Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Brunswick Township' LIMIT 1), 190.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 3, 'Hillsborough', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hillsborough' LIMIT 1), 164),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 4, 'Marlboro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Marlboro' LIMIT 1), 148),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 5, 'North Hunterdon', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Hunterdon' LIMIT 1), 147),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 6, 'Linden', (SELECT id FROM public.schools WHERE display_name ILIKE 'Linden' LIMIT 1), 125),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 7, 'Manalapan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manalapan' LIMIT 1), 121),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 8, 'Hunterdon Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hunterdon Central' LIMIT 1), 116.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 9, 'Collingswood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Collingswood' LIMIT 1), 115),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 10, 'Warren Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Warren Hills' LIMIT 1), 113),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 11, 'Phillipsburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Phillipsburg' LIMIT 1), 110.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 12, 'Northern Burlington', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Burlington' LIMIT 1), 78),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 13, 'Princeton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Princeton' LIMIT 1), 77),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mazzola%' LIMIT 1), 14, 'Bound Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bound Brook' LIMIT 1), 47);

-- Kearny Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Kearny High School',
  venue_address = '336 Devon St, Kearny, NJ 07032',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Kearny%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Kearny Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 1, 'Bayonne', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bayonne' LIMIT 1), 162.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 2, 'Union City', (SELECT id FROM public.schools WHERE display_name ILIKE 'Union City' LIMIT 1), 144),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 3, 'Kearny', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kearny' LIMIT 1), 128.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 4, 'Randolph', (SELECT id FROM public.schools WHERE display_name ILIKE 'Randolph' LIMIT 1), 116),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 5, 'Notre Dame', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame' LIMIT 1), 113.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 6, 'Millburn', (SELECT id FROM public.schools WHERE display_name ILIKE 'Millburn' LIMIT 1), 107),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 7, 'Cranford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cranford' LIMIT 1), 99.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 8, 'Belleville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Belleville' LIMIT 1), 84),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 9, 'Verona', (SELECT id FROM public.schools WHERE display_name ILIKE 'Verona' LIMIT 1), 74.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 10, 'Bloomfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bloomfield' LIMIT 1), 68),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 11, 'Rutherford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rutherford' LIMIT 1), 66.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 12, 'Point Pleasant Beach', (SELECT id FROM public.schools WHERE display_name ILIKE 'Point Pleasant Beach' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 13, 'Fort Lee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Fort Lee' LIMIT 1), 61),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 14, 'Northern Valley Demarest', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Valley Demarest' LIMIT 1), 46.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 15, 'Orange', (SELECT id FROM public.schools WHERE display_name ILIKE 'Orange' LIMIT 1), 16),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Kearny Holiday%' LIMIT 1), 16, 'Pingry School', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pingry School' LIMIT 1), 6);

-- Garden State Classic
UPDATE public.in_season_tournaments SET
  venue_name = 'Barnegat High School',
  venue_address = '180 Bengal Blvd, Barnegat Township, NJ 08005',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Barnegat%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Garden State Classic%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 1, 'Barnegat', (SELECT id FROM public.schools WHERE display_name ILIKE 'Barnegat' LIMIT 1), 203),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 2, 'Cinnaminson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cinnaminson' LIMIT 1), 193),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 3, 'Asbury Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Asbury Park' LIMIT 1), 143),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 4, 'Cedar Creek', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Creek' LIMIT 1), 119.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 5, 'Monmouth Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Monmouth Regional' LIMIT 1), 113.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 6, 'Immaculata', (SELECT id FROM public.schools WHERE display_name ILIKE 'Immaculata' LIMIT 1), 109),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 7, 'Haddon Heights', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddon Heights' LIMIT 1), 95.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 8, 'Lakewood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lakewood' LIMIT 1), 82.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 9, 'Bordentown/Florence', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bordentown/Florence' LIMIT 1), 65.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 10, 'Holy Cross', (SELECT id FROM public.schools WHERE display_name ILIKE 'Holy Cross' LIMIT 1), 60),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 11, 'New Egypt', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Egypt' LIMIT 1), 49.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 12, 'Atlantic City', (SELECT id FROM public.schools WHERE display_name ILIKE 'Atlantic City' LIMIT 1), 27),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Garden State Classic%' LIMIT 1), 13, 'South Hunterdon', (SELECT id FROM public.schools WHERE display_name ILIKE 'South Hunterdon' LIMIT 1), 8);

-- TCNJ Pride
UPDATE public.in_season_tournaments SET
  venue_name = 'Robbinsville High School',
  venue_address = '155 Robbinsville Edinburg Rd, Robbinsville, NJ 08691',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Robbinsville%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%TCNJ Pride%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 1, 'Pascack Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pascack Valley' LIMIT 1), 161.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 2, 'Rancocas Valley Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rancocas Valley Regional' LIMIT 1), 160),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 3, 'Brick Memorial', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brick Memorial' LIMIT 1), 119),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 4, 'Lacey Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lacey Township' LIMIT 1), 117.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 4, 'Robbinsville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Robbinsville' LIMIT 1), 117.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 6, 'Hamilton East-Steinert', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hamilton East-Steinert' LIMIT 1), 115.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 7, 'Point Pleasant Boro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Point Pleasant Boro' LIMIT 1), 106.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 8, 'Morris Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morris Hills' LIMIT 1), 104.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 9, 'Nutley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Nutley' LIMIT 1), 94),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 10, 'Manalapan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manalapan' LIMIT 1), 75.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 11, 'Shawnee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shawnee' LIMIT 1), 67.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 12, 'Colts Neck', (SELECT id FROM public.schools WHERE display_name ILIKE 'Colts Neck' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 13, 'Allentown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Allentown' LIMIT 1), 43.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%TCNJ Pride%' LIMIT 1), 14, 'Livingston', (SELECT id FROM public.schools WHERE display_name ILIKE 'Livingston' LIMIT 1), 29);

-- Hammonton Kick
UPDATE public.in_season_tournaments SET
  venue_name = 'Hammonton High School',
  venue_address = '566 Old Forks Rd, Hammonton, NJ 08037',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Hammonton%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Hammonton Kick%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 1, 'Seneca', (SELECT id FROM public.schools WHERE display_name ILIKE 'Seneca' LIMIT 1), 194),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 2, 'Middle Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middle Township' LIMIT 1), 186.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 3, 'Hightstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hightstown' LIMIT 1), 182),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 4, 'West Deptford', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Deptford' LIMIT 1), 177.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 5, 'Delran', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delran' LIMIT 1), 162.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 6, 'Deptford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Deptford' LIMIT 1), 138.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 7, 'Hammonton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hammonton' LIMIT 1), 97.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hammonton Kick%' LIMIT 1), 8, 'Haddonfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddonfield' LIMIT 1), 83.5);

-- Palmyra
UPDATE public.in_season_tournaments SET
  venue_name = 'Palmyra High School',
  venue_address = '311 W 5th St, Palmyra, NJ 08065',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Palmyra%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Palmyra%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 1, 'Pemberton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pemberton' LIMIT 1), 71),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 2, 'Middle Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middle Township' LIMIT 1), 67),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 3, 'Pennsauken', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pennsauken' LIMIT 1), 60),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 4, 'New Egypt', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Egypt' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 5, 'Hamilton North-Nottingham', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hamilton North-Nottingham' LIMIT 1), 46),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Palmyra%' LIMIT 1), 6, 'BCIT Westampton', (SELECT id FROM public.schools WHERE display_name ILIKE 'BCIT Westampton' LIMIT 1), 40);

-- Holmdel Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Holmdel High School',
  venue_address = '36 Crawfords Corner Rd, Holmdel, NJ 07733',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Holmdel%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Holmdel Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 1, 'Immaculata', (SELECT id FROM public.schools WHERE display_name ILIKE 'Immaculata' LIMIT 1), 209.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 2, 'Holmdel', (SELECT id FROM public.schools WHERE display_name ILIKE 'Holmdel' LIMIT 1), 198),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 3, 'Toms River North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River North' LIMIT 1), 156),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 4, 'Raritan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Raritan' LIMIT 1), 155),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 5, 'Sayreville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sayreville' LIMIT 1), 124.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 6, 'Scotch Plains-Fanwood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Scotch Plains-Fanwood' LIMIT 1), 100.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 7, 'Barnegat', (SELECT id FROM public.schools WHERE display_name ILIKE 'Barnegat' LIMIT 1), 96),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 8, 'Neptune', (SELECT id FROM public.schools WHERE display_name ILIKE 'Neptune' LIMIT 1), 89),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 9, 'Hamilton West', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hamilton West' LIMIT 1), 79),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 10, 'Matawan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Matawan' LIMIT 1), 75),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 11, 'Oakcrest', (SELECT id FROM public.schools WHERE display_name ILIKE 'Oakcrest' LIMIT 1), 71.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Holmdel Holiday%' LIMIT 1), 12, 'Shore Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shore Regional' LIMIT 1), 65);

-- Linn Crawn
UPDATE public.in_season_tournaments SET
  venue_name = 'Kittatinny Regional High School',
  venue_address = '77 Halsey Rd, Newton, NJ 07860',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Kittatinny%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Linn Crawn%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 1, 'Montville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Montville' LIMIT 1), 198.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 2, 'Morris Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morris Hills' LIMIT 1), 167.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 3, 'Kittatinny Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kittatinny Regional' LIMIT 1), 158.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 4, 'Roxbury', (SELECT id FROM public.schools WHERE display_name ILIKE 'Roxbury' LIMIT 1), 143),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 5, 'Randolph', (SELECT id FROM public.schools WHERE display_name ILIKE 'Randolph' LIMIT 1), 111.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 6, 'North Warren Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Warren Regional' LIMIT 1), 67.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 7, 'Boonton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Boonton' LIMIT 1), 57.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 8, 'Pequannock Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pequannock Township' LIMIT 1), 57),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 9, 'Pompton Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pompton Lakes' LIMIT 1), 45.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 10, 'Sparta', (SELECT id FROM public.schools WHERE display_name ILIKE 'Sparta' LIMIT 1), 42.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 11, 'Belvidere', (SELECT id FROM public.schools WHERE display_name ILIKE 'Belvidere' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Linn Crawn%' LIMIT 1), 12, 'West Morris (Mendham)', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Morris (Mendham)' LIMIT 1), 22.5);

-- Hunterdon Central Invitational
UPDATE public.in_season_tournaments SET
  venue_name = 'Hunterdon Central Regional High School',
  venue_address = '84 NJ-31, Flemington, NJ 08822',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Hunterdon Central%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Hunterdon Central Invitational%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 1, 'Shawnee', (SELECT id FROM public.schools WHERE display_name ILIKE 'Shawnee' LIMIT 1), 200),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 2, 'Southern Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Southern Regional' LIMIT 1), 165),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 3, 'Gloucester City', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gloucester City' LIMIT 1), 157),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 4, 'Delran', (SELECT id FROM public.schools WHERE display_name ILIKE 'Delran' LIMIT 1), 149.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 5, 'Hunterdon Central', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hunterdon Central' LIMIT 1), 138),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 6, 'Collingswood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Collingswood' LIMIT 1), 137),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 7, 'Notre Dame', (SELECT id FROM public.schools WHERE display_name ILIKE 'Notre Dame' LIMIT 1), 104),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 7, 'Toms River East', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River East' LIMIT 1), 104),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 9, 'Cherry Hill East', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cherry Hill East' LIMIT 1), 90.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 10, 'Governor Livingston', (SELECT id FROM public.schools WHERE display_name ILIKE 'Governor Livingston' LIMIT 1), 65.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 11, 'Buena Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Buena Regional' LIMIT 1), 55),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 12, 'Voorhees', (SELECT id FROM public.schools WHERE display_name ILIKE 'Voorhees' LIMIT 1), 49),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 13, 'Jefferson Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Jefferson Township' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 14, 'Bound Brook', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bound Brook' LIMIT 1), 40.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 15, 'Edison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Edison' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 15, 'North Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Brunswick' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 15, 'Old Bridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Old Bridge' LIMIT 1), 0),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Hunterdon Central Invitational%' LIMIT 1), 15, 'Saint Thomas Aquinas', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saint Thomas Aquinas' LIMIT 1), 0);

-- Bart Payne
UPDATE public.in_season_tournaments SET
  venue_name = 'Haddon Township High School',
  venue_address = '406 Memorial Ave, Haddon Township, NJ 08108',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Haddon Township%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Bart Payne%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 1, 'Hamilton East-Steinert', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hamilton East-Steinert' LIMIT 1), 206.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 2, 'Cinnaminson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cinnaminson' LIMIT 1), 164.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 3, 'Gateway Regional/Woodbury', (SELECT id FROM public.schools WHERE display_name ILIKE 'Gateway Regional/Woodbury' LIMIT 1), 154),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 4, 'Cherry Hill West', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cherry Hill West' LIMIT 1), 152.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 5, 'Paul VI', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paul VI' LIMIT 1), 149),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 6, 'Highland Regional/Triton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Highland Regional/Triton' LIMIT 1), 142),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bart Payne%' LIMIT 1), 7, 'Haddon Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Haddon Township' LIMIT 1), 111);

-- Lenape Valley Tournament
UPDATE public.in_season_tournaments SET
  venue_name = 'Lenape Valley Regional High School',
  venue_address = '28 Stanhope Rd, Stanhope, NJ 07874',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Lenape Valley%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Lenape Valley Tournament%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 1, 'Manville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manville' LIMIT 1), 218.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 2, 'Hanover Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hanover Park' LIMIT 1), 159.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 3, 'Lenape Valley/Hopatcong', (SELECT id FROM public.schools WHERE display_name ILIKE 'Lenape Valley/Hopatcong' LIMIT 1), 121),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 4, 'Mahwah', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mahwah' LIMIT 1), 101.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 5, 'Passaic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic' LIMIT 1), 90.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 6, 'Whippany Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Whippany Park' LIMIT 1), 82),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 7, 'Manchester Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manchester Regional' LIMIT 1), 68.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 8, 'Waldwick/Midland Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Waldwick/Midland Park' LIMIT 1), 52),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 9, 'Vernon Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Vernon Township' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 10, 'Hackettstown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hackettstown' LIMIT 1), 18.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 11, 'Wallkill Valley Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wallkill Valley Regional' LIMIT 1), 11),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Lenape Valley Tournament%' LIMIT 1), 12, 'Kinnelon', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kinnelon' LIMIT 1), 3.5);

-- Walter Woods
UPDATE public.in_season_tournaments SET
  venue_name = 'Middletown High School South',
  venue_address = '900 Nutswamp Rd, Middletown Township, NJ 07748',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Middletown South%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Walter Woods%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 1, 'Toms River South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Toms River South' LIMIT 1), 189),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 2, 'West Essex', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Essex' LIMIT 1), 179),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 3, 'Middletown South', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middletown South' LIMIT 1), 155.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 4, 'Manalapan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manalapan' LIMIT 1), 138),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 5, 'Manasquan', (SELECT id FROM public.schools WHERE display_name ILIKE 'Manasquan' LIMIT 1), 130),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 6, 'Allentown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Allentown' LIMIT 1), 129.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 7, 'Eastern', (SELECT id FROM public.schools WHERE display_name ILIKE 'Eastern' LIMIT 1), 120.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 8, 'Keansburg', (SELECT id FROM public.schools WHERE display_name ILIKE 'Keansburg' LIMIT 1), 96),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 9, 'Livingston', (SELECT id FROM public.schools WHERE display_name ILIKE 'Livingston' LIMIT 1), 94),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 10, 'Freehold Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Freehold Township' LIMIT 1), 41.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 11, 'New Providence', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Providence' LIMIT 1), 25.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Walter Woods%' LIMIT 1), 12, 'Salem', (SELECT id FROM public.schools WHERE display_name ILIKE 'Salem' LIMIT 1), 3);

-- Mustang Classic
UPDATE public.in_season_tournaments SET
  venue_name = 'Brick Memorial High School',
  venue_address = '2001 Lanes Mill Rd, Brick Township, NJ 08724',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Brick Memorial%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Mustang Classic%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 1, 'Camden Catholic', (SELECT id FROM public.schools WHERE display_name ILIKE 'Camden Catholic' LIMIT 1), 272),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 2, 'Jackson Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Jackson Township' LIMIT 1), 150),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 3, 'Middletown North', (SELECT id FROM public.schools WHERE display_name ILIKE 'Middletown North' LIMIT 1), 140),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 4, 'Washington Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Washington Township' LIMIT 1), 98.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 5, 'Cedar Grove', (SELECT id FROM public.schools WHERE display_name ILIKE 'Cedar Grove' LIMIT 1), 91),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 6, 'West Deptford', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Deptford' LIMIT 1), 83),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 7, 'Kingsway Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Kingsway Regional' LIMIT 1), 79),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 8, 'Ocean Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Ocean Township' LIMIT 1), 77.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 9, 'Caldwell', (SELECT id FROM public.schools WHERE display_name ILIKE 'Caldwell' LIMIT 1), 71.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 10, 'Colts Neck', (SELECT id FROM public.schools WHERE display_name ILIKE 'Colts Neck' LIMIT 1), 68),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 11, 'Saint John Vianney', (SELECT id FROM public.schools WHERE display_name ILIKE 'Saint John Vianney' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 12, 'Point Pleasant Boro', (SELECT id FROM public.schools WHERE display_name ILIKE 'Point Pleasant Boro' LIMIT 1), 60.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 13, 'Brick Memorial', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brick Memorial' LIMIT 1), 57.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 14, 'Mt. Olive', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mt. Olive' LIMIT 1), 49),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Mustang Classic%' LIMIT 1), 15, 'Arthur L. Johnson', (SELECT id FROM public.schools WHERE display_name ILIKE 'Arthur L. Johnson' LIMIT 1), 46);

-- Overbrook Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Overbrook High School',
  venue_address = '1200 Turnersville Rd, Pine Hill, NJ 08021',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Overbrook%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Overbrook Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 1, 'Pennsville Memorial', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pennsville Memorial' LIMIT 1), 149),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 2, 'Hammonton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hammonton' LIMIT 1), 136.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 3, 'Burlington Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Burlington Township' LIMIT 1), 119.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 4, 'Deptford', (SELECT id FROM public.schools WHERE display_name ILIKE 'Deptford' LIMIT 1), 118),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 5, 'Millville', (SELECT id FROM public.schools WHERE display_name ILIKE 'Millville' LIMIT 1), 105),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 6, 'Timber Creek', (SELECT id FROM public.schools WHERE display_name ILIKE 'Timber Creek' LIMIT 1), 71.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 7, 'Mainland Regional', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mainland Regional' LIMIT 1), 63),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 8, 'Overbrook Regional Senior', (SELECT id FROM public.schools WHERE display_name ILIKE 'Overbrook Regional Senior' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 9, 'Winslow Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Winslow Township' LIMIT 1), 34.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Overbrook Holiday%' LIMIT 1), 10, 'St. Joseph (Hammonton)', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Joseph (Hammonton)' LIMIT 1), 10);

-- Parsippany Hills Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Parsippany Hills High School',
  venue_address = '20 Rita Drive, Morris Plains, NJ 07950',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Parsippany Hills%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Parsippany Hills Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 1, 'Union', (SELECT id FROM public.schools WHERE display_name ILIKE 'Union' LIMIT 1), 139.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 2, 'Northern Valley Regional (Old Tappan)', (SELECT id FROM public.schools WHERE display_name ILIKE 'Northern Valley Regional (Old Tappan)' LIMIT 1), 135.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 3, 'Wayne Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Wayne Valley' LIMIT 1), 130),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 4, 'Passaic County Tech-Vocational', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic County Tech-Vocational' LIMIT 1), 101),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 5, 'Pope John XXIII', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pope John XXIII' LIMIT 1), 89.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 6, 'Parsippany Hills', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parsippany Hills' LIMIT 1), 81),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 7, 'Paramus', (SELECT id FROM public.schools WHERE display_name ILIKE 'Paramus' LIMIT 1), 64.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 8, 'Morristown', (SELECT id FROM public.schools WHERE display_name ILIKE 'Morristown' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 9, 'Parsippany', (SELECT id FROM public.schools WHERE display_name ILIKE 'Parsippany' LIMIT 1), 48),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 10, 'Clifton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Clifton' LIMIT 1), 36),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 11, 'St. Benedict''s Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'St. Benedict''s Prep' LIMIT 1), 33.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Parsippany Hills Holiday%' LIMIT 1), 12, 'Mountain Lakes', (SELECT id FROM public.schools WHERE display_name ILIKE 'Mountain Lakes' LIMIT 1), 33);

-- Rahway Holiday
UPDATE public.in_season_tournaments SET
  venue_name = 'Rahway High School',
  venue_address = '1012 Madison Avenue, Rahway, NJ 07065',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%Rahway%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Rahway Holiday%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 1, 'Rahway', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rahway' LIMIT 1), 232),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 2, 'Colonia', (SELECT id FROM public.schools WHERE display_name ILIKE 'Colonia' LIMIT 1), 230),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 3, 'North Plainfield', (SELECT id FROM public.schools WHERE display_name ILIKE 'North Plainfield' LIMIT 1), 170),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 4, 'Linden', (SELECT id FROM public.schools WHERE display_name ILIKE 'Linden' LIMIT 1), 116.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 5, 'JFK Iselin', (SELECT id FROM public.schools WHERE display_name ILIKE 'JFK Iselin' LIMIT 1), 114),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 6, 'Dover', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dover' LIMIT 1), 88),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 7, 'Irvington', (SELECT id FROM public.schools WHERE display_name ILIKE 'Irvington' LIMIT 1), 83),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 8, 'Carteret', (SELECT id FROM public.schools WHERE display_name ILIKE 'Carteret' LIMIT 1), 80.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 9, 'Xavier', (SELECT id FROM public.schools WHERE display_name ILIKE 'Xavier' LIMIT 1), 61.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 10, 'Glen Ridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Glen Ridge' LIMIT 1), 52),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Rahway Holiday%' LIMIT 1), 11, 'Hillside', (SELECT id FROM public.schools WHERE display_name ILIKE 'Hillside' LIMIT 1), 40);

-- Tim Groves
UPDATE public.in_season_tournaments SET
  venue_name = 'West Orange High School',
  venue_address = '51 Conforti Ave, West Orange, NJ 07052',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%West Orange%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Tim Groves%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 1, 'West Orange', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Orange' LIMIT 1), 253),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 2, 'Passaic Valley', (SELECT id FROM public.schools WHERE display_name ILIKE 'Passaic Valley' LIMIT 1), 237.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 3, 'Westwood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Westwood' LIMIT 1), 201),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 4, 'Brick Township', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brick Township' LIMIT 1), 187.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 5, 'Asbury Park', (SELECT id FROM public.schools WHERE display_name ILIKE 'Asbury Park' LIMIT 1), 158.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 6, 'Keyport', (SELECT id FROM public.schools WHERE display_name ILIKE 'Keyport' LIMIT 1), 78.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 7, 'Summit', (SELECT id FROM public.schools WHERE display_name ILIKE 'Summit' LIMIT 1), 69.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 8, 'Camden', (SELECT id FROM public.schools WHERE display_name ILIKE 'Camden' LIMIT 1), 39),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 9, 'Newark Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Newark Academy' LIMIT 1), 25.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 10, 'Dwight Morrow', (SELECT id FROM public.schools WHERE display_name ILIKE 'Dwight Morrow' LIMIT 1), 17),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Tim Groves%' LIMIT 1), 11, 'Pioneer Academy', (SELECT id FROM public.schools WHERE display_name ILIKE 'Pioneer Academy' LIMIT 1), 7);

-- Bear Invitational
UPDATE public.in_season_tournaments SET
  venue_name = 'Churchill Junior High School',
  venue_address = '18 Norton Rd, East Brunswick, NJ 08816',
  is_oos = false,
  location_school_id = (SELECT id FROM public.schools WHERE display_name ILIKE '%East Brunswick%' AND is_nj = true LIMIT 1),
  banner_bg = NULL,
  banner_fg = NULL
WHERE name ILIKE '%Bear Invitational%';

DELETE FROM public.in_season_tournament_team_scores
WHERE tournament_id IN (SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%');

INSERT INTO public.in_season_tournament_team_scores (tournament_id, place, school_name, school_id, score) VALUES
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 1, 'Brearley/Dayton', (SELECT id FROM public.schools WHERE display_name ILIKE 'Brearley/Dayton' LIMIT 1), 183.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 2, 'East Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'East Brunswick' LIMIT 1), 169.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 3, 'Edison', (SELECT id FROM public.schools WHERE display_name ILIKE 'Edison' LIMIT 1), 157),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 4, 'Bernards', (SELECT id FROM public.schools WHERE display_name ILIKE 'Bernards' LIMIT 1), 144.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 5, 'South Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'South Brunswick' LIMIT 1), 130.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 6, 'Point Pleasant Beach', (SELECT id FROM public.schools WHERE display_name ILIKE 'Point Pleasant Beach' LIMIT 1), 126.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 7, 'Spotswood', (SELECT id FROM public.schools WHERE display_name ILIKE 'Spotswood' LIMIT 1), 111.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 8, 'Woodbridge', (SELECT id FROM public.schools WHERE display_name ILIKE 'Woodbridge' LIMIT 1), 99.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 9, 'South River', (SELECT id FROM public.schools WHERE display_name ILIKE 'South River' LIMIT 1), 65),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 10, 'Rumson Fair Haven', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rumson Fair Haven' LIMIT 1), 64.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 11, 'West Windsor-Plainsboro South', (SELECT id FROM public.schools WHERE display_name ILIKE 'West Windsor-Plainsboro South' LIMIT 1), 63.5),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 12, 'New Brunswick', (SELECT id FROM public.schools WHERE display_name ILIKE 'New Brunswick' LIMIT 1), 40),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 13, 'JP Stevens', (SELECT id FROM public.schools WHERE display_name ILIKE 'JP Stevens' LIMIT 1), 25),
  ((SELECT id FROM public.in_season_tournaments WHERE name ILIKE '%Bear Invitational%' LIMIT 1), 14, 'Rutgers Prep', (SELECT id FROM public.schools WHERE display_name ILIKE 'Rutgers Prep' LIMIT 1), 12);

