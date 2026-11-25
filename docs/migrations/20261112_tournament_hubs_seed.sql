-- docs/migrations/20261112_tournament_hubs_seed.sql
--
-- Seed rows for the tournament hubs (run after 20261112_tournament_hubs.sql):
-- * the 17 middle school and 20 offseason tournaments researched Aug 30–31
--   (Off Season Stuff/Middle School Tournaments.csv, Offseason Tournaments.csv), on both sides,
--   except an event named for one gender ("MS Boys Division"), which goes on that side only;
-- * the NJ club list (Off Season Stuff/NJ Wrestling Clubs.csv, USAW registry pull Aug 2026 plus
--   researched additions; its trailing source-note row is left out).
-- Generated from the CSVs. Safe to re-run: existing names are skipped.
-- Run in the Supabase SQL editor.

BEGIN;

INSERT INTO boys_hub_tournaments (hub, name, location, time_of_year, in_state, format, platform, notes, sort_order) VALUES
  ('ms', 'USAW-NJ Scholastic State Championships (NJUSA)', 'Trenton / CURE Arena, NJ', 'February / March', 'In state', 'Folkstyle Individual', 'FloArena / Trackwrestling', 'Definitive scholastic state championship; top 3 from 9 regional qualifiers compete across Junior/Intermediate/Cadet.', 10),
  ('ms', 'War at the Shore', 'Wildwood Convention Center, NJ', 'March / April', 'In state', 'Folkstyle Individual', 'Trackwrestling / FloArena', 'Premier in-state spring folkstyle tournament featuring elite middle school & youth brackets.', 20),
  ('ms', 'NHSCA Middle School Nationals', 'Virginia Beach, VA', 'Late March', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Elite national individual championship run alongside HS Nationals; crowns All-Americans across 6th-8th grade.', 30),
  ('ms', 'NHSCA National Duals (MS Division)', 'Virginia Beach Sports Center, VA', 'May (Memorial Day)', 'Out of state', 'Folkstyle Duals', 'FloArena', 'The largest and toughest spring MS folkstyle club dual tournament in the nation (480+ teams overall).', 40),
  ('ms', 'National Freestyle Duals (MS Boys Division)', 'Manalapan / Jersey Shore, NJ', 'April / May', 'In state', 'Freestyle Duals', 'Garden State Wrestling / FloArena', 'Premier in-state freestyle duals hosted by Garden State Wrestling attracting elite MS and youth rosters.', 50),
  ('ms', 'Super 32 Challenge (MS Division)', 'Greensboro, NC', 'October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'The premier national individual preseason tournament for middle schoolers.', 60),
  ('ms', 'Virginia Challenge Holiday Duals (VAC Duals)', 'Virginia Beach, VA', 'December', 'Out of state', 'Folkstyle Duals', 'Trackwrestling', 'Premier national middle school all-star duals; NJ sends elite club squads.', 70),
  ('ms', 'Jersey Shore Junior Wrestling League (JSJWL) Championships', 'Brick Memorial / Shore Region, NJ', 'February', 'In state', 'Folkstyle Duals / League Tournament', 'FloArena / JSJWL', 'Arguably the deepest in-season youth/MS league in NJ (Monmouth/Ocean/Middlesex powerhouse programs).', 80),
  ('ms', 'South Jersey Middle School Wrestling League (SJMSWL) Tournament', 'Moorestown HS / South Jersey Hosts, NJ', 'Late Jan / Early Feb', 'In state', 'Folkstyle League / Individual', 'WrestlingTournaments.com / FloArena', 'Premier winter in-season tournament circuit for South Jersey middle school wrestling programs.', 90),
  ('ms', 'Raritan Valley League Tournament', 'Bridgewater-Raritan / Central Jersey, NJ', 'Late January', 'In state', 'Folkstyle League Tournament', 'Local League / FloArena', 'Premier Central Jersey middle school league championship.', 100),
  ('ms', 'Tri-County Middle School / Youth Championships', 'Williamstown HS / Monroe, NJ', 'March', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'Top South Jersey post-season scholastic open tournament for Tri-County programs.', 110),
  ('ms', 'Garden State Classic (GSW Duals & Individual)', 'Peddie School (Hightstown, NJ)', 'November (Thanksgiving)', 'In state', 'Folkstyle Duals & Individual', 'Garden State Wrestling / FloArena', 'Major preseason in-state open and club duals for top U10/U12/U14 wrestlers.', 120),
  ('ms', 'Mobbin Classic (Youth / MS Division)', 'RWJBarnabas Arena, Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'High-profile early preseason folkstyle open drawing ranked middle schoolers from across NJ.', 130),
  ('ms', 'Journeymen Fall Classic (Overflo MS Division)', 'Schenectady, NY', 'September / October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Modified round-robin / hammer brackets against top northeast middle school competition.', 140),
  ('ms', 'Tulsa Nationals', 'Tulsa, OK', 'January', 'Out of state', 'Folkstyle Individual', 'Trackwrestling', 'Prestigious national youth/middle school leg of the Trinity Award.', 150),
  ('ms', 'Easter National Youth Duals / NUWAY Duals', 'Atlantic City / Ocean City, MD', 'April', 'Regional', 'Folkstyle Duals', 'Trackwrestling', 'Top club teams from NJ/PA competing in dual meet brackets.', 160),
  ('ms', 'MSK Manalapan Preseason WAR Zone Series', 'Manalapan, NJ', 'September - November', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'High-frequency local NJ proving ground for middle schoolers getting live bouts before winter season.', 170)
ON CONFLICT (hub, lower(name)) DO NOTHING;

INSERT INTO girls_hub_tournaments (hub, name, location, time_of_year, in_state, format, platform, notes, sort_order) VALUES
  ('ms', 'USAW-NJ Scholastic State Championships (NJUSA)', 'Trenton / CURE Arena, NJ', 'February / March', 'In state', 'Folkstyle Individual', 'FloArena / Trackwrestling', 'Definitive scholastic state championship; top 3 from 9 regional qualifiers compete across Junior/Intermediate/Cadet.', 10),
  ('ms', 'War at the Shore', 'Wildwood Convention Center, NJ', 'March / April', 'In state', 'Folkstyle Individual', 'Trackwrestling / FloArena', 'Premier in-state spring folkstyle tournament featuring elite middle school & youth brackets.', 20),
  ('ms', 'NHSCA Middle School Nationals', 'Virginia Beach, VA', 'Late March', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Elite national individual championship run alongside HS Nationals; crowns All-Americans across 6th-8th grade.', 30),
  ('ms', 'NHSCA National Duals (MS Division)', 'Virginia Beach Sports Center, VA', 'May (Memorial Day)', 'Out of state', 'Folkstyle Duals', 'FloArena', 'The largest and toughest spring MS folkstyle club dual tournament in the nation (480+ teams overall).', 40),
  ('ms', 'Super 32 Challenge (MS Division)', 'Greensboro, NC', 'October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'The premier national individual preseason tournament for middle schoolers.', 60),
  ('ms', 'Virginia Challenge Holiday Duals (VAC Duals)', 'Virginia Beach, VA', 'December', 'Out of state', 'Folkstyle Duals', 'Trackwrestling', 'Premier national middle school all-star duals; NJ sends elite club squads.', 70),
  ('ms', 'Jersey Shore Junior Wrestling League (JSJWL) Championships', 'Brick Memorial / Shore Region, NJ', 'February', 'In state', 'Folkstyle Duals / League Tournament', 'FloArena / JSJWL', 'Arguably the deepest in-season youth/MS league in NJ (Monmouth/Ocean/Middlesex powerhouse programs).', 80),
  ('ms', 'South Jersey Middle School Wrestling League (SJMSWL) Tournament', 'Moorestown HS / South Jersey Hosts, NJ', 'Late Jan / Early Feb', 'In state', 'Folkstyle League / Individual', 'WrestlingTournaments.com / FloArena', 'Premier winter in-season tournament circuit for South Jersey middle school wrestling programs.', 90),
  ('ms', 'Raritan Valley League Tournament', 'Bridgewater-Raritan / Central Jersey, NJ', 'Late January', 'In state', 'Folkstyle League Tournament', 'Local League / FloArena', 'Premier Central Jersey middle school league championship.', 100),
  ('ms', 'Tri-County Middle School / Youth Championships', 'Williamstown HS / Monroe, NJ', 'March', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'Top South Jersey post-season scholastic open tournament for Tri-County programs.', 110),
  ('ms', 'Garden State Classic (GSW Duals & Individual)', 'Peddie School (Hightstown, NJ)', 'November (Thanksgiving)', 'In state', 'Folkstyle Duals & Individual', 'Garden State Wrestling / FloArena', 'Major preseason in-state open and club duals for top U10/U12/U14 wrestlers.', 120),
  ('ms', 'Mobbin Classic (Youth / MS Division)', 'RWJBarnabas Arena, Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'High-profile early preseason folkstyle open drawing ranked middle schoolers from across NJ.', 130),
  ('ms', 'Journeymen Fall Classic (Overflo MS Division)', 'Schenectady, NY', 'September / October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Modified round-robin / hammer brackets against top northeast middle school competition.', 140),
  ('ms', 'Tulsa Nationals', 'Tulsa, OK', 'January', 'Out of state', 'Folkstyle Individual', 'Trackwrestling', 'Prestigious national youth/middle school leg of the Trinity Award.', 150),
  ('ms', 'Easter National Youth Duals / NUWAY Duals', 'Atlantic City / Ocean City, MD', 'April', 'Regional', 'Folkstyle Duals', 'Trackwrestling', 'Top club teams from NJ/PA competing in dual meet brackets.', 160),
  ('ms', 'MSK Manalapan Preseason WAR Zone Series', 'Manalapan, NJ', 'September - November', 'In state', 'Folkstyle Individual', 'WrestlingTournaments.com / FloArena', 'High-frequency local NJ proving ground for middle schoolers getting live bouts before winter season.', 170)
ON CONFLICT (hub, lower(name)) DO NOTHING;

INSERT INTO boys_hub_tournaments (hub, name, location, time_of_year, in_state, format, platform, notes, sort_order) VALUES
  ('offseason', 'Super 32 Challenge', 'Greensboro Coliseum, Greensboro, NC', 'Mid-October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier national preseason tournament; major college recruiting stage for top NJ varsity wrestlers', 10),
  ('offseason', 'Super 32 NJ Early Qualifier', 'Manalapan / Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'FloArena', 'Direct in-state qualification path for the Super 32 main draw', 20),
  ('offseason', 'Who''s Number One (FloWrestling WNO)', 'Coralville, IA / Rotating Venue', 'Early/Mid-October', 'Out of state', 'Folkstyle Match Series', 'FloWrestling', 'Elite made-for-broadcast #1 vs #2 individual showcase; regularly features top NJ hammers', 30),
  ('offseason', 'Journeymen Fall Classic', 'Schenectady, NY', 'September / October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier northeast preseason individual tournament with elite modified round-robin / hammer pools', 40),
  ('offseason', 'Beast of the East', 'Bob Carpenter Center (Univ of Delaware), Newark, DE', 'Mid-December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Top mid-Atlantic in-season major; features NJ powers like Delbarton, Blair Academy, and Bergen Catholic', 50),
  ('offseason', 'Walsh Jesuit Ironman', 'Walsh Jesuit HS, Cuyahoga Falls, OH', 'Early December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Considered the toughest in-season individual high school tournament in the US (Blair Academy regular)', 60),
  ('offseason', 'PowerAde Tournament', 'Canon-McMillan HS, Canonsburg, PA', 'Late December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Marquee holiday national high school tournament attracting top national and NJ talent', 70),
  ('offseason', 'Escape the Rock', 'Council Rock South HS, Holland, PA', 'Mid-January', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier mid-season individual tournament featuring CBA, St. Joseph Regional, and Bergen Catholic', 80),
  ('offseason', 'National Prep Championship', 'Stabler Arena (Lehigh Univ), Bethlehem, PA', 'Late February', 'Out of state', 'Folkstyle Individual', 'FloArena', 'National championship for top independent/prep schools; perennial battleground for Blair Academy', 90),
  ('offseason', 'NHSCA High School Nationals', 'Virginia Beach Convention Center, VA', 'Late March', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Largest postseason individual HS tournament in the country; crowns Fresh/Soph/Jr/Sr national champions', 100),
  ('offseason', 'NHSCA National Duals', 'Virginia Beach Sports Center, VA', 'May (Memorial Day)', 'Out of state', 'Folkstyle Duals', 'FloArena', 'Largest HS club dual tournament (480+ teams); top NJ clubs field fully stacked varsity rosters', 110),
  ('offseason', 'AAU Scholastic Duals (Disney Duals)', 'Orlando, FL', 'June', 'Out of state', 'Folkstyle Duals', 'Trackwrestling', 'Historic club team tournament; NJ wrestlers log 8-12 dual matches against national competition', 120),
  ('offseason', 'War at the Shore (HS Open)', 'Wildwood Convention Center, NJ', 'March / April', 'In state', 'Folkstyle Individual', 'Trackwrestling', 'Major in-state spring open tournament with heavy varsity starter participation', 130),
  ('offseason', 'USAW 16U & Junior National Championships (Fargo)', 'Fargodome, Fargo, ND', 'Mid-July', 'Out of state', 'Freestyle & Greco Individual', 'FloArena', 'The pinnacle true-offseason national championship; Team NJ sends full rosters in Freestyle and Greco', 140),
  ('offseason', 'USAW-NJ Scholastic State Championships (Cadet/16U)', 'CURE Insurance Arena, Trenton, NJ', 'Mid-to-late March', 'In state', 'Folkstyle Individual', 'Trackwrestling / FloArena', 'Scholastic state championship for 9th/10th grade (Cadet) division immediately following NJSIAA states', 150),
  ('offseason', 'USAW-NJ Freestyle & Greco State Championships', 'Branchburg / Union, NJ', 'April / May', 'In state', 'Freestyle & Greco Individual', 'Trackwrestling / FloArena', 'Official state qualifier for the Team New Jersey Fargo roster', 160),
  ('offseason', 'UWW U17 & U20 World Team Trials', 'Las Vegas, NV / Louisville, KY', 'April / May', 'Out of state', 'Freestyle & Greco Individual', 'FloArena', 'Determines the US World Championship teams; draws elite NJ state champions & All-Americans', 170),
  ('offseason', 'USAW Northeast Regional Championships', 'Atlantic City, NJ / Pocono, PA', 'May', 'In state / Regional', 'Freestyle & Greco Individual', 'Trackwrestling / FloArena', 'Regional qualifying and seeding tournament for 16U/Junior nationals and national ranking boards', 180),
  ('offseason', 'Mobbin Classic Preseason Open', 'RWJBarnabas Arena, Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'FloArena / Trackwrestling', 'Rapidly growing in-state preseason open drawing Shore & South/Central NJ state placers', 190),
  ('offseason', 'Tyrant Fall & Spring Duals', 'Wildwood, NJ / York, PA', 'Spring & Fall', 'In state / Regional', 'Folkstyle Duals', 'FloArena / Trackwrestling', 'Mid-Atlantic club team duals attracting top NJ varsity lineups', 200)
ON CONFLICT (hub, lower(name)) DO NOTHING;

INSERT INTO girls_hub_tournaments (hub, name, location, time_of_year, in_state, format, platform, notes, sort_order) VALUES
  ('offseason', 'Super 32 Challenge', 'Greensboro Coliseum, Greensboro, NC', 'Mid-October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier national preseason tournament; major college recruiting stage for top NJ varsity wrestlers', 10),
  ('offseason', 'Super 32 NJ Early Qualifier', 'Manalapan / Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'FloArena', 'Direct in-state qualification path for the Super 32 main draw', 20),
  ('offseason', 'Who''s Number One (FloWrestling WNO)', 'Coralville, IA / Rotating Venue', 'Early/Mid-October', 'Out of state', 'Folkstyle Match Series', 'FloWrestling', 'Elite made-for-broadcast #1 vs #2 individual showcase; regularly features top NJ hammers', 30),
  ('offseason', 'Journeymen Fall Classic', 'Schenectady, NY', 'September / October', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier northeast preseason individual tournament with elite modified round-robin / hammer pools', 40),
  ('offseason', 'Beast of the East', 'Bob Carpenter Center (Univ of Delaware), Newark, DE', 'Mid-December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Top mid-Atlantic in-season major; features NJ powers like Delbarton, Blair Academy, and Bergen Catholic', 50),
  ('offseason', 'Walsh Jesuit Ironman', 'Walsh Jesuit HS, Cuyahoga Falls, OH', 'Early December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Considered the toughest in-season individual high school tournament in the US (Blair Academy regular)', 60),
  ('offseason', 'PowerAde Tournament', 'Canon-McMillan HS, Canonsburg, PA', 'Late December', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Marquee holiday national high school tournament attracting top national and NJ talent', 70),
  ('offseason', 'Escape the Rock', 'Council Rock South HS, Holland, PA', 'Mid-January', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Premier mid-season individual tournament featuring CBA, St. Joseph Regional, and Bergen Catholic', 80),
  ('offseason', 'National Prep Championship', 'Stabler Arena (Lehigh Univ), Bethlehem, PA', 'Late February', 'Out of state', 'Folkstyle Individual', 'FloArena', 'National championship for top independent/prep schools; perennial battleground for Blair Academy', 90),
  ('offseason', 'NHSCA High School Nationals', 'Virginia Beach Convention Center, VA', 'Late March', 'Out of state', 'Folkstyle Individual', 'FloArena', 'Largest postseason individual HS tournament in the country; crowns Fresh/Soph/Jr/Sr national champions', 100),
  ('offseason', 'NHSCA National Duals', 'Virginia Beach Sports Center, VA', 'May (Memorial Day)', 'Out of state', 'Folkstyle Duals', 'FloArena', 'Largest HS club dual tournament (480+ teams); top NJ clubs field fully stacked varsity rosters', 110),
  ('offseason', 'AAU Scholastic Duals (Disney Duals)', 'Orlando, FL', 'June', 'Out of state', 'Folkstyle Duals', 'Trackwrestling', 'Historic club team tournament; NJ wrestlers log 8-12 dual matches against national competition', 120),
  ('offseason', 'War at the Shore (HS Open)', 'Wildwood Convention Center, NJ', 'March / April', 'In state', 'Folkstyle Individual', 'Trackwrestling', 'Major in-state spring open tournament with heavy varsity starter participation', 130),
  ('offseason', 'USAW 16U & Junior National Championships (Fargo)', 'Fargodome, Fargo, ND', 'Mid-July', 'Out of state', 'Freestyle & Greco Individual', 'FloArena', 'The pinnacle true-offseason national championship; Team NJ sends full rosters in Freestyle and Greco', 140),
  ('offseason', 'USAW-NJ Scholastic State Championships (Cadet/16U)', 'CURE Insurance Arena, Trenton, NJ', 'Mid-to-late March', 'In state', 'Folkstyle Individual', 'Trackwrestling / FloArena', 'Scholastic state championship for 9th/10th grade (Cadet) division immediately following NJSIAA states', 150),
  ('offseason', 'USAW-NJ Freestyle & Greco State Championships', 'Branchburg / Union, NJ', 'April / May', 'In state', 'Freestyle & Greco Individual', 'Trackwrestling / FloArena', 'Official state qualifier for the Team New Jersey Fargo roster', 160),
  ('offseason', 'UWW U17 & U20 World Team Trials', 'Las Vegas, NV / Louisville, KY', 'April / May', 'Out of state', 'Freestyle & Greco Individual', 'FloArena', 'Determines the US World Championship teams; draws elite NJ state champions & All-Americans', 170),
  ('offseason', 'USAW Northeast Regional Championships', 'Atlantic City, NJ / Pocono, PA', 'May', 'In state / Regional', 'Freestyle & Greco Individual', 'Trackwrestling / FloArena', 'Regional qualifying and seeding tournament for 16U/Junior nationals and national ranking boards', 180),
  ('offseason', 'Mobbin Classic Preseason Open', 'RWJBarnabas Arena, Toms River, NJ', 'September', 'In state', 'Folkstyle Individual', 'FloArena / Trackwrestling', 'Rapidly growing in-state preseason open drawing Shore & South/Central NJ state placers', 190),
  ('offseason', 'Tyrant Fall & Spring Duals', 'Wildwood, NJ / York, PA', 'Spring & Fall', 'In state / Regional', 'Folkstyle Duals', 'FloArena / Trackwrestling', 'Mid-Atlantic club team duals attracting top NJ varsity lineups', 200)
ON CONFLICT (hub, lower(name)) DO NOTHING;

INSERT INTO wrestling_clubs (name, town, state, region, website, leadership, pipelines, tournaments, notes) VALUES
  ('Academy Wrestling Club', 'Lincroft', 'NJ', NULL, 'theacademywrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Agoge Wrestling Training', 'Paramus', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('All I See Is Gold Academy', 'Collingswood', 'NJ', NULL, 'allseeisgoldacademy.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Paul''s home town'),
  ('Apex Wrestling Academy', 'Pompton Lakes', 'NJ', NULL, 'apexwrestlingschool.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Beat The Streets Newark', 'Newark', 'NJ', NULL, 'btsnewark.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Urban youth-development nonprofit wrestling program'),
  ('Black Knights Wrestling Club', 'Clayton', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Blairstown Wrestling Club', 'Blairstown', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Bordentown Youth Wrestling', 'Bordentown', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Broncs Wrestling Club', 'Lawrenceville', 'NJ', NULL, 'broncswrestling.com', NULL, 'Based at Rider University', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Rider University'),
  ('Brook RTC', 'Bound Brook', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Regional Training Center'),
  ('Cumberland Junior Wrestling', 'Bridgeton', 'NJ', NULL, NULL, NULL, 'Based at Cumberland Regional HS', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Cumberland Regional HS'),
  ('DC Trained', NULL, 'NJ', NULL, 'dctrainednj.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Edge Wrestling', 'Warren', 'NJ', 'North/Central Jersey (Hoboken / Kenilworth, NJ)', 'edgewrestling.com', 'Ernie Monaco / Jeff Buxton lineage', 'Bergen, Essex, Union, and Morris county top programs', 'Fargo, Super 32, Journeymen, UWW World Team Trials, NHSCA Duals', 'Premier state & national tournament club'),
  ('Filipe Trained Wrestling Academy', 'Belford', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Florian Techniques Wrestling Club', 'Wyckoff', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Frezzo''s Fight Factory', 'Carlstadt', 'NJ', NULL, 'frezzosfightfactory.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Haddonfield Wrestling Club', 'Haddonfield', 'NJ', NULL, 'haddonfieldwrestling.com', NULL, 'Based at Haddonfield Memorial HS', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Haddonfield Memorial HS'),
  ('Hammonton Wrestling Club', 'Hammonton', 'NJ', NULL, 'hammontonwrestling.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('High Pace Wrestling Club', 'South Plainfield', 'NJ', NULL, 'highpacewrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Hopewell-Pennington Wrestling Club', 'Pennington', 'NJ', NULL, 'PalkerSportsPerformance.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Iron Horse Wrestling Club', 'Newton', 'NJ', 'Morris / North Jersey (Succasunna, NJ)', 'ironhorsewrestling.com', 'Gary Mezzacapo / Iron Horse staff', 'Morris Knolls, Mount Olive, Delbarton, Sussex County', 'Fargo, Super 32, NHSCA Duals, NJUSA States', 'Premier state & national tournament club'),
  ('Jersey 74 Wrestling School', 'Cedar Knolls', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Jersey Devil Wrestling Club', 'New Egypt', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Mat Rat Wrestling Club', 'Randolph', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Mat-Time School of Wrestling', 'Lodi', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Metuchen Grapplers', 'Metuchen', 'NJ', NULL, 'MetuchenGrapplers.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('New Jersey RTC', 'Princeton', 'NJ', NULL, 'newjerseyrtc.com', NULL, 'Regional Training Center based at Princeton University''s Jadwin Gym — elite/post-collegiate level', 'Local Leagues / NJUSA Qualifiers & Opens', 'Regional Training Center based at Princeton University''s Jadwin Gym — elite/post-collegiate level'),
  ('New Milford Wrestling Foundation', 'New Milford', 'NJ', NULL, 'nmwrestling.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('NJ Scorpions Wrestling School', 'Fairfield', 'NJ', 'North Jersey (Fairfield / Wayne, NJ)', 'Scorpionswrestlingschool.com', 'Bryan Panzano / Mario Mason', 'Bergen Catholic, Delbarton, St. Joseph Regional, Passaic/Essex powers', 'Super 32, Journeymen, Fargo, NHSCA Duals, NJUSA States', 'Premier state & national tournament club'),
  ('Pascack Hills Jr Wrestling Club', 'Oradell', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Pascack Wrestling', 'Twp of Washington', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Pinelands Wrestling Club', 'Little Egg Harbor', 'NJ', NULL, 'pinelandswrestlingclub.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Power Half Wrestling Academy', 'Cookstown', 'NJ', 'Central Jersey (Somerset / Middlesex)', NULL, 'Power Half Coaching Staff', 'Middlesex, Somerset, and Union county programs', 'NJUSA States, War at the Shore, Tyrant Duals', 'Premier state & national tournament club'),
  ('Pretty Strong Girls Wrestling Club', 'Belleville', 'NJ', NULL, 'legacyboxingnj.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Girls-focused program'),
  ('Princeton Wrestling Club', 'Princeton', 'NJ', NULL, 'princetonwrestling.com', NULL, 'Based at Princeton University', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Princeton University'),
  ('RedNose Wrestling School', 'Hackensack', 'NJ', NULL, 'rednosewrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('RFH Youth Wrestling Club', 'Tinton Falls', 'NJ', NULL, 'rfhyouthwrestling.com', NULL, 'Feeder program for Rumson-Fair Haven', 'Local Leagues / NJUSA Qualifiers & Opens', 'Feeder program for Rumson-Fair Haven'),
  ('Roadrunner Wrestling Club', 'Sewell', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Ruff House Wrestling Club', 'Manasquan', 'NJ', NULL, 'ruffhousewrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Ruthless Wrestling Club', 'Pine Brook', 'NJ', NULL, 'ruthlesswrestlingclub.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Scarlet Knights Wrestling Club', 'Piscataway', 'NJ', NULL, 'scarletknightswrestlingclub.com', NULL, 'Based at Rutgers University — Regional Training Center', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Rutgers University — Regional Training Center'),
  ('Seagull Wrestling Club', 'Gloucester City', 'NJ', NULL, 'seagullwrestlingclub.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Near Paul''s location'),
  ('Shore Thing Wrestling Club', 'Lakewood', 'NJ', 'Ocean County (Lakewood, NJ)', 'Shorethingwrestlingclub.com', 'John Gagliano lineage / Shore coaches', 'Howell, Southern Regional, Brick, Jackson, Shore area studs', 'NHSCA Duals, Super 32, Disney Duals, War at the Shore', 'Premier state & national tournament club'),
  ('Shore Wrestling Club', 'Monmouth Beach', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Spazz Wrestling', 'Cherry Hill', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Talents Wrestling Club', 'Trenton', 'NJ', NULL, 'talentswrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Team Irish Wrestling Club', 'Cherry Hill', 'NJ', NULL, NULL, NULL, 'Likely tied to Camden Catholic ("Irish") pipeline', 'Local Leagues / NJUSA Qualifiers & Opens', 'Likely tied to Camden Catholic ("Irish") pipeline'),
  ('The Hive Wrestling', 'Cream Ridge', 'NJ', NULL, 'Thehivejj.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('The Lab WC', 'Bergenfield', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('The Outsiders Wrestling Club (OWC)', 'East Hanover', 'NJ', NULL, 'theoutsiderswc.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Coaching staff incl. multi-time NJ finalist / Fargo All-American'),
  ('Thunderstrike', 'Ridgefield', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Toms River Wrestling Club', 'Toms River', 'NJ', NULL, 'eteamz.com/TRWC', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Top Dawg Academy', 'Toms River', 'NJ', NULL, 'topdawgatc.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Trenton Youth Wrestling', 'Hamilton', 'NJ', NULL, 'trentonyouthwrestling.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Triumph Wrestling', 'Ocean', 'NJ', 'Ocean / Monmouth County (Bayville, NJ)', NULL, 'Nick Roy / Nick Suriano affiliates', 'Shore Conference, South Jersey public powers, CBA', 'NHSCA Duals, Super 32, Disney Duals, Tyrant Duals, Fargo', 'Premier state & national tournament club'),
  ('Ursa Major Wrestling Club', 'Hamilton', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Warriors University Wrestling Club', 'Freehold', 'NJ', NULL, 'Warriors-University.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Watchung Hills Wrestling Association', 'Warren', 'NJ', NULL, 'leaguelineup.com/whwa', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Wrecking Crew Academy', 'Medford', 'NJ', NULL, 'wreckingcrewwrestling.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Wrestling Club of Livingston', 'Livingston', 'NJ', NULL, NULL, NULL, 'Based at Livingston HS wrestling room', 'Local Leagues / NJUSA Qualifiers & Opens', 'Based at Livingston HS wrestling room'),
  ('Wrestling University', 'Nutley', 'NJ', NULL, 'wrestleunj.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'USAW Registered Club'),
  ('Apex Wrestling NYC LLC', 'Warwick', 'NY', NULL, 'theapexwrestlingschool.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Listed under NJ association; NY address'),
  ('New York City RTC', 'New York', 'NY', NULL, 'nycrtc.org', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Listed under NJ association; NY address'),
  ('Tiger Claws', 'Bristol', 'PA', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Listed under NJ association; PA address'),
  ('Tri State Training Center', 'Tomkins', 'NY', NULL, 'tristatetrainingcenter.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Listed under NJ association; NY address'),
  ('Elite Wrestling Club', 'Jackson', 'NJ', NULL, NULL, NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Not in USAW directory pull; verified via SI.com wrestler profile (trains CBA''s Sean Kenny)'),
  ('Bitetto Trained Wrestling Club', 'Buena / Vineland area', 'NJ', 'Bergen / Passaic County', 'bitettotrained.com', 'Chris Bitetto', 'Don Bosco, Bergen Catholic, North Jersey scholastic stars', 'Super 32, Journeymen, NJUSA States, VAC Duals', 'Not in USAW directory pull; alumni incl. Robbie Howard (Bergen Catholic/Penn State)'),
  ('Rhino Wrestling', NULL, 'NJ', NULL, 'rhinowrestlingnj.com', NULL, NULL, 'Local Leagues / NJUSA Qualifiers & Opens', 'Not in USAW directory pull; founded by Anthony Knox Sr., father of #1-ranked Anthony Knox Jr.'),
  ('Team Buxton Wrestling Club', NULL, 'NJ', 'North/West Jersey', NULL, 'Steve Buxton', 'Sussex, Morris, Warren, and North Jersey hammers', 'NHSCA Duals, Disney Duals, Super 32, Tyrant Duals', 'Premier elite club (independent verified)'),
  ('South Jersey Wrestling Academy (SJWA) / Orchard South', NULL, 'NJ', 'South Jersey (Turnersville / Egg Harbor, NJ)', NULL, 'Gene Mills / South Jersey staff', 'Paulsboro, Delsea, St. Augustine, Camden Catholic, Tri-County powers', 'NHSCA Duals, VAC Duals, Super 32, War at the Shore', 'Premier elite club (independent verified)'),
  ('Cordoba Trained', NULL, 'NJ', 'North/Central Jersey (Fairfield, NJ)', NULL, 'Mike Cordoba', 'Top North Jersey / Essex / Morris youth & HS starters', 'Super 32, Journeymen, VAC Duals, NJUSA States', 'Premier elite club (independent verified)')
ON CONFLICT (lower(name)) DO NOTHING;

COMMIT;

-- Verify: boys ms 17, boys offseason 20, girls ms 16, girls offseason 20, clubs 71
SELECT 'boys ' || hub AS list, count(*) FROM boys_hub_tournaments GROUP BY hub
UNION ALL SELECT 'girls ' || hub, count(*) FROM girls_hub_tournaments GROUP BY hub
UNION ALL SELECT 'clubs', count(*) FROM wrestling_clubs ORDER BY 1;

-- ROLLBACK: DELETE FROM boys_hub_tournaments; DELETE FROM girls_hub_tournaments; DELETE FROM wrestling_clubs;
--           (only while nothing has been imported: events/placements hang off these rows)
