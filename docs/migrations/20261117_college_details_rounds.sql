-- docs/migrations/20261117_college_details_rounds.sql
--
-- Kyle 2026-11-17: the college page should look like a high school's — city and state under the name, the mascot, the
-- conference ("all things easily searched"); and every NCAA bout labeled with its round ("i would like to track
-- consolation wins and see which jersey wrestler is the back side warrior").
--   colleges.city / state / conference / mascot   conference = the wrestling conference now (2026-27), or the last
--                                                  one for a program that was dropped; NULL where it isn't known
--   {boys,girls}_college_bouts.round              pigtail r1 r2 qf sf f · cpig c1 c2 c3 c4 cqf csf · 3rd 5th 7th
--                                                  (src/lib/ncaa/parse.ts; filled by reloading the championships)
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE colleges ADD COLUMN IF NOT EXISTS city text, ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS conference text, ADD COLUMN IF NOT EXISTS mascot text;

UPDATE colleges c SET city = v.city, state = v.state, conference = v.conference, mascot = v.mascot
FROM (VALUES
  (1, 'Air Force', 'USAF Academy', 'CO', 'Pac-12', 'Falcons'),
  (2, 'American', 'Washington', 'DC', 'EIWA', 'Eagles'),
  (3, 'Appalachian State', 'Boone', 'NC', 'SoCon', 'Mountaineers'),
  (4, 'Arizona State', 'Tempe', 'AZ', 'Big 12', 'Sun Devils'),
  (5, 'Army', 'West Point', 'NY', 'EIWA', 'Black Knights'),
  (6, 'Bellarmine', 'Louisville', 'KY', 'SoCon', 'Knights'),
  (7, 'Binghamton', 'Vestal', 'NY', 'EIWA', 'Bearcats'),
  (8, 'Bloomsburg', 'Bloomsburg', 'PA', 'MAC', 'Huskies'),
  (9, 'Boise State', 'Boise', 'ID', 'Pac-12', 'Broncos'),
  (10, 'Boston College', 'Chestnut Hill', 'MA', 'CAA', 'Eagles'),
  (11, 'Boston University', 'Boston', 'MA', 'EIWA', 'Terriers'),
  (12, 'BYU', 'Provo', 'UT', NULL, 'Cougars'),
  (13, 'Brown', 'Providence', 'RI', 'EIWA', 'Bears'),
  (14, 'Bucknell', 'Lewisburg', 'PA', 'EIWA', 'Bison'),
  (15, 'Buffalo', 'Buffalo', 'NY', 'MAC', 'Bulls'),
  (16, 'Cal Poly', 'San Luis Obispo', 'CA', 'Pac-12', 'Mustangs'),
  (17, 'CSU Bakersfield', 'Bakersfield', 'CA', 'Pac-12', 'Roadrunners'),
  (18, 'Cal State Fullerton', 'Fullerton', 'CA', 'Pac-10', 'Titans'),
  (19, 'California Baptist', 'Riverside', 'CA', 'Big 12', 'Lancers'),
  (20, 'UC Davis', 'Davis', 'CA', 'Pac-10', 'Aggies'),
  (21, 'Campbell', 'Buies Creek', 'NC', 'SoCon', 'Fighting Camels'),
  (22, 'Central Michigan', 'Mount Pleasant', 'MI', 'MAC', 'Chippewas'),
  (23, 'Chattanooga', 'Chattanooga', 'TN', 'SoCon', 'Mocs'),
  (24, 'The Citadel', 'Charleston', 'SC', 'SoCon', 'Bulldogs'),
  (25, 'Clarion', 'Clarion', 'PA', 'MAC', 'Golden Eagles'),
  (26, 'Cleveland State', 'Cleveland', 'OH', 'MAC', 'Vikings'),
  (27, 'Columbia', 'New York', 'NY', 'EIWA', 'Lions'),
  (28, 'Coppin State', 'Baltimore', 'MD', 'MEAC', 'Eagles'),
  (29, 'Cornell', 'Ithaca', 'NY', 'EIWA', 'Big Red'),
  (30, 'Davidson', 'Davidson', 'NC', 'SoCon', 'Wildcats'),
  (31, 'Delaware State', 'Dover', 'DE', 'MEAC', 'Hornets'),
  (32, 'Drexel', 'Philadelphia', 'PA', 'EIWA', 'Dragons'),
  (33, 'Duke', 'Durham', 'NC', 'ACC', 'Blue Devils'),
  (34, 'Duquesne', 'Pittsburgh', 'PA', 'EWL', 'Dukes'),
  (35, 'East Stroudsburg', 'East Stroudsburg', 'PA', 'EWL', 'Warriors'),
  (36, 'Eastern Illinois', 'Charleston', 'IL', NULL, 'Panthers'),
  (37, 'Eastern Michigan', 'Ypsilanti', 'MI', 'MAC', 'Eagles'),
  (38, 'Edinboro', 'Edinboro', 'PA', 'MAC', 'Fighting Scots'),
  (39, 'Franklin & Marshall', 'Lancaster', 'PA', 'EIWA', 'Diplomats'),
  (40, 'Fresno State', 'Fresno', 'CA', 'Big 12', 'Bulldogs'),
  (41, 'Gardner-Webb', 'Boiling Springs', 'NC', 'SoCon', 'Runnin'' Bulldogs'),
  (42, 'George Mason', 'Fairfax', 'VA', 'MAC', 'Patriots'),
  (43, 'Harvard', 'Cambridge', 'MA', 'EIWA', 'Crimson'),
  (44, 'Hofstra', 'Hempstead', 'NY', 'EIWA', 'Pride'),
  (45, 'Howard', 'Washington', 'DC', 'MEAC', 'Bison'),
  (46, 'Illinois', 'Champaign', 'IL', 'Big Ten', 'Fighting Illini'),
  (47, 'Indiana', 'Bloomington', 'IN', 'Big Ten', 'Hoosiers'),
  (48, 'Iowa', 'Iowa City', 'IA', 'Big Ten', 'Hawkeyes'),
  (49, 'Iowa State', 'Ames', 'IA', 'Big 12', 'Cyclones'),
  (50, 'James Madison', 'Harrisonburg', 'VA', 'CAA', 'Dukes'),
  (51, 'Kent State', 'Kent', 'OH', 'MAC', 'Golden Flashes'),
  (52, 'Lehigh', 'Bethlehem', 'PA', 'EIWA', 'Mountain Hawks'),
  (53, 'Liberty', 'Lynchburg', 'VA', 'Independent', 'Flames'),
  (54, 'LIU', 'Brooklyn', 'NY', 'EIWA', 'Sharks'),
  (55, 'Little Rock', 'Little Rock', 'AR', 'Pac-12', 'Trojans'),
  (56, 'Lock Haven', 'Lock Haven', 'PA', 'MAC', 'Bald Eagles'),
  (57, 'Marquette', 'Milwaukee', 'WI', NULL, 'Golden Eagles'),
  (58, 'Maryland', 'College Park', 'MD', 'Big Ten', 'Terrapins'),
  (59, 'Michigan', 'Ann Arbor', 'MI', 'Big Ten', 'Wolverines'),
  (60, 'Michigan State', 'East Lansing', 'MI', 'Big Ten', 'Spartans'),
  (61, 'Millersville', 'Millersville', 'PA', NULL, 'Marauders'),
  (62, 'Minnesota', 'Minneapolis', 'MN', 'Big Ten', 'Golden Gophers'),
  (63, 'Missouri', 'Columbia', 'MO', 'Big 12', 'Tigers'),
  (64, 'Morgan State', 'Baltimore', 'MD', 'EIWA', 'Bears'),
  (65, 'Navy', 'Annapolis', 'MD', 'EIWA', 'Midshipmen'),
  (66, 'Nebraska', 'Lincoln', 'NE', 'Big Ten', 'Cornhuskers'),
  (67, 'North Carolina', 'Chapel Hill', 'NC', 'ACC', 'Tar Heels'),
  (68, 'NC State', 'Raleigh', 'NC', 'ACC', 'Wolfpack'),
  (69, 'UNC Greensboro', 'Greensboro', 'NC', 'SoCon', 'Spartans'),
  (70, 'North Dakota State', 'Fargo', 'ND', 'Pac-12', 'Bison'),
  (71, 'Northern Colorado', 'Greeley', 'CO', 'Pac-12', 'Bears'),
  (72, 'Northern Illinois', 'DeKalb', 'IL', 'Pac-12', 'Huskies'),
  (73, 'Northern Iowa', 'Cedar Falls', 'IA', 'Big 12', 'Panthers'),
  (74, 'Northwest Missouri State', 'Maryville', 'MO', 'MIAA', 'Bearcats'),
  (75, 'Northwestern', 'Evanston', 'IL', 'Big Ten', 'Wildcats'),
  (76, 'Ohio', 'Athens', 'OH', 'MAC', 'Bobcats'),
  (77, 'Ohio State', 'Columbus', 'OH', 'Big Ten', 'Buckeyes'),
  (78, 'Oklahoma', 'Norman', 'OK', 'Big 12', 'Sooners'),
  (79, 'Oklahoma State', 'Stillwater', 'OK', 'Big 12', 'Cowboys'),
  (80, 'Old Dominion', 'Norfolk', 'VA', 'MAC', 'Monarchs'),
  (81, 'Oregon', 'Eugene', 'OR', 'Pac-10', 'Ducks'),
  (82, 'Oregon State', 'Corvallis', 'OR', 'Pac-12', 'Beavers'),
  (83, 'Penn State', 'University Park', 'PA', 'Big Ten', 'Nittany Lions'),
  (84, 'Pennsylvania', 'Philadelphia', 'PA', 'EIWA', 'Quakers'),
  (85, 'Pittsburg State', 'Pittsburg', 'KS', 'MIAA', 'Gorillas'),
  (86, 'Pittsburgh', 'Pittsburgh', 'PA', 'ACC', 'Panthers'),
  (87, 'Portland State', 'Portland', 'OR', 'Pac-10', 'Vikings'),
  (88, 'Princeton', 'Princeton', 'NJ', 'EIWA', 'Tigers'),
  (89, 'Purdue', 'West Lafayette', 'IN', 'Big Ten', 'Boilermakers'),
  (90, 'Rider', 'Lawrenceville', 'NJ', 'MAC', 'Broncs'),
  (91, 'Rutgers', 'New Brunswick', 'NJ', 'Big Ten', 'Scarlet Knights'),
  (92, 'Sacred Heart', 'Fairfield', 'CT', 'EIWA', 'Pioneers'),
  (93, 'Seton Hall', 'South Orange', 'NJ', NULL, 'Pirates'),
  (94, 'SIU Edwardsville', 'Edwardsville', 'IL', 'MAC', 'Cougars'),
  (95, 'Slippery Rock', 'Slippery Rock', 'PA', NULL, 'The Rock'),
  (96, 'South Dakota State', 'Brookings', 'SD', 'Pac-12', 'Jackrabbits'),
  (97, 'Stanford', 'Stanford', 'CA', 'ACC', 'Cardinal'),
  (98, 'Utah Valley', 'Orem', 'UT', 'Big 12', 'Wolverines'),
  (99, 'Virginia', 'Charlottesville', 'VA', 'ACC', 'Cavaliers'),
  (100, 'VMI', 'Lexington', 'VA', 'SoCon', 'Keydets'),
  (101, 'Virginia Tech', 'Blacksburg', 'VA', 'ACC', 'Hokies'),
  (102, 'West Virginia', 'Morgantown', 'WV', 'Big 12', 'Mountaineers'),
  (103, 'Wisconsin', 'Madison', 'WI', 'Big Ten', 'Badgers'),
  (104, 'Wyoming', 'Laramie', 'WY', 'Big 12', 'Cowboys')
) AS v(id, name, city, state, conference, mascot)
WHERE c.id = v.id AND c.name = v.name;

ALTER TABLE boys_college_bouts  ADD COLUMN IF NOT EXISTS round text CHECK (round IN ('pigtail','r1','r2','qf','sf','f','cpig','c1','c2','c3','c4','cqf','csf','3rd','5th','7th'));
ALTER TABLE girls_college_bouts ADD COLUMN IF NOT EXISTS round text CHECK (round IN ('pigtail','r1','r2','qf','sf','f','cpig','c1','c2','c3','c4','cqf','csf','3rd','5th','7th'));

COMMIT;

-- Verify: 104 colleges with a city; the round columns exist (empty until the reload)
SELECT count(*) FILTER (WHERE city IS NOT NULL) AS with_city, count(*) FILTER (WHERE conference IS NOT NULL) AS with_conference,
  (SELECT count(round) FROM boys_college_bouts) AS rounds_filled FROM colleges;

-- ROLLBACK: ALTER TABLE colleges DROP COLUMN city, DROP COLUMN state, DROP COLUMN conference, DROP COLUMN mascot;
--           ALTER TABLE boys_college_bouts DROP COLUMN round; ALTER TABLE girls_college_bouts DROP COLUMN round;
