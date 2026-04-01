-- Add mascot and color columns to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS mascot text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS primary_color text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS secondary_color text;

-- ============================================================
-- Mascot + Colors combined per school
-- ============================================================

-- A
UPDATE schools SET mascot='Braves', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Absegami';
UPDATE schools SET mascot='Bishops', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Asbury Park';
UPDATE schools SET mascot='Braves', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Atlantic City';
UPDATE schools SET mascot='Wildcats', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'A.P. Schalick%';
UPDATE schools SET mascot='Falcons', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Audubon';
UPDATE schools SET mascot='Crusaders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Allentown%';

-- B
UPDATE schools SET mascot='Bengals', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Barnegat';
UPDATE schools SET mascot='Blue Bears', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Barringer%';
UPDATE schools SET mascot='Bees', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Bayonne';
UPDATE schools SET mascot='Wildcats', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Becton%' AND display_name NOT ILIKE '%/%';
UPDATE schools SET mascot='Buccaneers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Belleville';
UPDATE schools SET mascot='Crusaders', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Belvidere';
UPDATE schools SET mascot='Crusaders', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Bergen Catholic';
UPDATE schools SET mascot='Yellow Jackets', primary_color='#FFD700', secondary_color='#000000' WHERE display_name='Bergen Charter';
UPDATE schools SET mascot='Bears', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Bergenfield';
UPDATE schools SET mascot='Mountaineers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Bernards';
UPDATE schools SET mascot='Bengals', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Bloomfield';
UPDATE schools SET mascot='Crusaders', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Bound Brook%';
UPDATE schools SET mascot='Mustangs', primary_color='#003087', secondary_color='#000000' WHERE display_name='Brick Memorial';
UPDATE schools SET mascot='Dragons', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Brick Township';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Bridgewater-Raritan';
UPDATE schools SET mascot='Wildcats', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Buena Regional%';
UPDATE schools SET mascot='Blue Devils', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Burlington City';
UPDATE schools SET mascot='Falcons', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Burlington Township';
UPDATE schools SET mascot='Mustangs', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Boonton';
UPDATE schools SET mascot='Bulldogs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Butler';
UPDATE schools SET mascot='Crusaders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Bordentown%' AND display_name NOT ILIKE '%/%';

-- C
UPDATE schools SET mascot='Chiefs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Caldwell';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Camden' AND display_name NOT ILIKE '%Catholic%' AND display_name NOT ILIKE '%Eastside%' AND display_name NOT ILIKE '%/%';
UPDATE schools SET mascot='Irish', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Camden Catholic';
UPDATE schools SET mascot='Ramblers', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Carteret';
UPDATE schools SET mascot='Pirates', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Cedar Creek';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Cedar Grove';
UPDATE schools SET mascot='Golden Eagles', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Central Regional';
UPDATE schools SET mascot='Chiefs', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Cherokee';
UPDATE schools SET mascot='Cougars', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Cherry Hill East';
UPDATE schools SET mascot='Lions', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Cherry Hill West';
UPDATE schools SET mascot='Colts', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Christian Brothers Academy';
UPDATE schools SET mascot='Pirates', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Cinnaminson';
UPDATE schools SET mascot='Pioneers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Clearview%';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Cliffside Park';
UPDATE schools SET mascot='Mustangs', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Clifton';
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Collingswood';
UPDATE schools SET mascot='Patriots', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Colonia';
UPDATE schools SET mascot='Cougars', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Colts Neck';
UPDATE schools SET mascot='Cougars', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Columbia';
UPDATE schools SET mascot='Cougars', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Cranford';
UPDATE schools SET mascot='Cougars', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Cresskill';
UPDATE schools SET mascot='Crusaders', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Cumberland Regional%';

-- D
UPDATE schools SET mascot='Green Wave', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Delbarton%';
UPDATE schools SET mascot='Terriers', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'Delaware Valley%';
UPDATE schools SET mascot='Crusaders', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Delsea%';
UPDATE schools SET mascot='Spartans', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Depaul%' OR display_name ILIKE 'DePaul%';
UPDATE schools SET mascot='Destroyers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Deptford%';
UPDATE schools SET mascot='Ironmen', primary_color='#CC0000', secondary_color='#003087' WHERE display_name ILIKE 'Don Bosco%';
UPDATE schools SET mascot='Tigers', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Dover';
UPDATE schools SET mascot='Huskies', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Dumont';
UPDATE schools SET mascot='Maroon Raiders', primary_color='#800000', secondary_color='#FFD700' WHERE display_name='Dwight Morrow';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Delran';

-- E
UPDATE schools SET mascot='Bears', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'East Brunswick%';
UPDATE schools SET mascot='Jaguars', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='East Orange Campus';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='East Side';
UPDATE schools SET mascot='Vikings', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Eastern';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Edison';
UPDATE schools SET mascot='Eagles', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'Egg Harbor%';
UPDATE schools SET mascot='Minutemen', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Elizabeth';
UPDATE schools SET mascot='Crusaders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Elmwood Park%';
UPDATE schools SET mascot='Cavaliers', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Emerson%';
UPDATE schools SET mascot='Blue Demons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Ewing';
UPDATE schools SET mascot='Vikings', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Eastside%Paterson%';

-- F
UPDATE schools SET mascot='Cutters', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Fair Lawn';
UPDATE schools SET mascot='Bridgemen', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Fort Lee';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Franklin';
UPDATE schools SET mascot='Colonials', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Freehold Borough%' OR display_name ILIKE 'Freehold Boro%';
UPDATE schools SET mascot='Patriots', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Freehold Township';

-- G
UPDATE schools SET mascot='Boilermakers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Garfield';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Glen Rock';
UPDATE schools SET mascot='Rams', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Gloucester Catholic';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Gloucester City%';
UPDATE schools SET mascot='Highlanders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Governor Livingston%';
UPDATE schools SET mascot='Chargers', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Gateway%';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Glen Ridge';

-- H
UPDATE schools SET mascot='Comets', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Hackensack';
UPDATE schools SET mascot='Tigers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Hackettstown';
UPDATE schools SET mascot='Red Devils', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Haddon Heights%';
UPDATE schools SET mascot='Haddons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Haddon Twp%' OR display_name ILIKE 'Haddon Township%';
UPDATE schools SET mascot='Bulldawgs', primary_color='#6A0DAD', secondary_color='#FFD700' WHERE display_name ILIKE 'Haddonfield%';
UPDATE schools SET mascot='Hornets', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Hamilton East%';
UPDATE schools SET mascot='Hornets', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Hamilton North%';
UPDATE schools SET mascot='Hornets', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Hamilton West';
UPDATE schools SET mascot='Blue Devils', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Hammonton';
UPDATE schools SET mascot='Hornets', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Hanover Park%';
UPDATE schools SET mascot='Aviators', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Hasbrouck Heights';
UPDATE schools SET mascot='Bears', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Hawthorne';
UPDATE schools SET mascot='Wildcats', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'High Point%';
UPDATE schools SET mascot='Tartans', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Highland Regional%';
UPDATE schools SET mascot='Owls', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Highland Park';
UPDATE schools SET mascot='Raiders', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Hillsborough';
UPDATE schools SET mascot='Comets', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Hillside%';
UPDATE schools SET mascot='Redwings', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Hoboken%';
UPDATE schools SET mascot='Hornets', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Holmdel';
UPDATE schools SET mascot='Lancers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Holy Cross%';
UPDATE schools SET mascot='Spartans', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Holy Spirit';
UPDATE schools SET mascot='Bulldogs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Hopewell Valley%';
UPDATE schools SET mascot='Rebels', primary_color='#000000', secondary_color='#FFD700' WHERE display_name='Howell';
UPDATE schools SET mascot='Red Devils', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Hunterdon Central%';
UPDATE schools SET mascot='Rams', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Hightstown%';

-- I
UPDATE schools SET mascot='Spartans', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Immaculata';
UPDATE schools SET mascot='Braves', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Indian Hills';
UPDATE schools SET mascot='Blue Knights', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Irvington';

-- J
UPDATE schools SET mascot='Lions', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Jackson Liberty';
UPDATE schools SET mascot='Jaguars', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Jackson Memorial%';
UPDATE schools SET mascot='Jaguars', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Jackson Township%';
UPDATE schools SET mascot='Falcons', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Jefferson TWP%' OR display_name ILIKE 'Jefferson Township%';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'JFK-Iselin%';
UPDATE schools SET mascot='Knights', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'JFK-Paterson%';
UPDATE schools SET mascot='Knights', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'John F. Kennedy%';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='John P. Stevens';

-- K
UPDATE schools SET mascot='Titans', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Keansburg%';
UPDATE schools SET mascot='Kardinals', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Kearny';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Keyport%';
UPDATE schools SET mascot='Dragons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Kingsway%';
UPDATE schools SET mascot='Colts', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Kinnelon';
UPDATE schools SET mascot='Cougars', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Kittatinny%';

-- L
UPDATE schools SET mascot='Lions', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Lacey Township';
UPDATE schools SET mascot='Lancers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Lakeland Reg%';
UPDATE schools SET mascot='Piners', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Lakewood';
UPDATE schools SET mascot='Indians', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Lenape';
UPDATE schools SET mascot='Lions', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Lenape Valley%';
UPDATE schools SET mascot='Lions', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Leonia%';
UPDATE schools SET mascot='Tigers', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Linden';
UPDATE schools SET mascot='Lancers', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Livingston';
UPDATE schools SET mascot='Rams', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Lodi';
UPDATE schools SET mascot='Green Wave', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Long Branch';
UPDATE schools SET mascot='Tigers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Lower Cape May%';
UPDATE schools SET mascot='Bears', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Lyndhurst%';
UPDATE schools SET mascot='Seniors', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Lawrence%';
UPDATE schools SET mascot='Tigers', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Lindenwold';

-- M
UPDATE schools SET mascot='Dodgers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Madison';
UPDATE schools SET mascot='Thunderbirds', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Mahwah';
UPDATE schools SET mascot='Mustangs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Mainland%';
UPDATE schools SET mascot='Warriors', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Manasquan';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Manchester Regional';
UPDATE schools SET mascot='Hawks', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Manchester Township';
UPDATE schools SET mascot='Bulldogs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Manville%';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Manalapan';
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Maple Shade';
UPDATE schools SET mascot='Mustangs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Marlboro';
UPDATE schools SET mascot='Huskies', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Matawan%';
UPDATE schools SET mascot='Bulldogs', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Metuchen';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Middle Township';
UPDATE schools SET mascot='Blue Jays', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Middlesex%' AND display_name NOT ILIKE '%/%';
UPDATE schools SET mascot='Lions', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Middletown North';
UPDATE schools SET mascot='Eagles', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Middletown South';
UPDATE schools SET mascot='Millers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Millburn';
UPDATE schools SET mascot='Thunderbolts', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Millville';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Monroe Township';
UPDATE schools SET mascot='Mounties', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Montclair';
UPDATE schools SET mascot='Cougars', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Montgomery';
UPDATE schools SET mascot='Mustangs', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Montville Township%' OR display_name='Montville';
UPDATE schools SET mascot='Quakers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Moorestown';
UPDATE schools SET mascot='Scarlet Knights', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Morris Hills';
UPDATE schools SET mascot='Golden Eagles', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Morris Knolls';
UPDATE schools SET mascot='Colonials', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Morristown';
UPDATE schools SET mascot='Marauders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Mt. Olive%' OR display_name ILIKE 'Mount Olive%';
UPDATE schools SET mascot='Lakers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Mountain Lakes';

-- N
UPDATE schools SET mascot='Zebras', primary_color='#000000', secondary_color='#FFFFFF' WHERE display_name='New Brunswick';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='New Milford';
UPDATE schools SET mascot='Pioneers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='New Providence';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'New Egypt%';
UPDATE schools SET mascot='Minutemen', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Newark Academy';
UPDATE schools SET mascot='Braves', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Newton';
UPDATE schools SET mascot='Bears', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='North Bergen';
UPDATE schools SET mascot='Raiders', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'North Brunswick%';
UPDATE schools SET mascot='Lions', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='North Hunterdon';
UPDATE schools SET mascot='Patriots', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='North Plainfield';
UPDATE schools SET mascot='Patriots', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'North Warren%';
UPDATE schools SET mascot='Greyhounds', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Northern Burlington%';
UPDATE schools SET mascot='Highlanders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Northern Highlands%';
UPDATE schools SET mascot='Norsemen', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Northern Valley%Demarest%';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Northern Valley%Old Tappan%';
UPDATE schools SET mascot='Irish', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Notre Dame';
UPDATE schools SET mascot='Raiders', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Nutley';
UPDATE schools SET mascot='Stars', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'North Star%';

-- O
UPDATE schools SET mascot='Falcons', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name='Oakcrest';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Ocean City';
UPDATE schools SET mascot='Spartans', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Ocean Township';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Old Bridge';
UPDATE schools SET mascot='Tornadoes', primary_color='#FF8C00', secondary_color='#000000' WHERE display_name='Orange';
UPDATE schools SET mascot='Rams', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Overbrook%';

-- P
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Palmyra';
UPDATE schools SET mascot='Spartans', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Paramus';
UPDATE schools SET mascot='Paladins', primary_color='#6A0DAD', secondary_color='#FFD700' WHERE display_name='Paramus Catholic';
UPDATE schools SET mascot='Red Hawks', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Parsippany';
UPDATE schools SET mascot='Vikings', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Parsippany Hills%' AND display_name NOT ILIKE '%/%';
UPDATE schools SET mascot='Cowboys', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Pascack Hills%';
UPDATE schools SET mascot='Indians', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Pascack Valley%';
UPDATE schools SET mascot='Indians', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Passaic';
UPDATE schools SET mascot='Hornets', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Passaic Valley';
UPDATE schools SET mascot='Indians', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Passaic County Technical%' OR display_name ILIKE 'Passaic Co Tech%';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Paul VI';
UPDATE schools SET mascot='Red Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Paulsboro%';
UPDATE schools SET mascot='Buccaneers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Pemberton Township';
UPDATE schools SET mascot='Red Devils', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Penns Grove%';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Pennsauken';
UPDATE schools SET mascot='Eagles', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Pennsville%';
UPDATE schools SET mascot='Golden Panthers', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'Pequannock%';
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Perth Amboy';
UPDATE schools SET mascot='Stateliners', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Phillipsburg';
UPDATE schools SET mascot='Wildcats', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Pinelands Regional';
UPDATE schools SET mascot='Big Blue', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Pingry%';
UPDATE schools SET mascot='Chiefs', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Piscataway' OR display_name ILIKE 'Piscataway High%';
UPDATE schools SET mascot='Cardinals', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Plainfield';
UPDATE schools SET mascot='Garnet Gulls', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Point Pleasant Beach%';
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Point Pleasant Boro%' OR display_name ILIKE 'Point Pleasant Borough%';
UPDATE schools SET mascot='Rams', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Pompton Lakes';
UPDATE schools SET mascot='Lions', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Pope John XXIII';
UPDATE schools SET mascot='Tigers', primary_color='#FF8C00', secondary_color='#000000' WHERE display_name='Princeton';
UPDATE schools SET mascot='Panthers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Pitman';

-- R
UPDATE schools SET mascot='Indians', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Rahway';
UPDATE schools SET mascot='Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Ramapo';
UPDATE schools SET mascot='Rams', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Ramsey';
UPDATE schools SET mascot='Red Devils', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Rancocas Valley%';
UPDATE schools SET mascot='Rams', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Randolph%';
UPDATE schools SET mascot='Rockets', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Raritan';
UPDATE schools SET mascot='Caseys', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Red Bank Catholic%';
UPDATE schools SET mascot='Bucs', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Red Bank Regional%';
UPDATE schools SET mascot='Red Devils', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Ridge';
UPDATE schools SET mascot='Royals', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Ridgefield Memorial%';
UPDATE schools SET mascot='Scarlets', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Ridgefield Park%';
UPDATE schools SET mascot='Maroons', primary_color='#800000', secondary_color='#FFFFFF' WHERE display_name='Ridgewood';
UPDATE schools SET mascot='Hawks', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='River Dell';
UPDATE schools SET mascot='Rams', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Riverside';
UPDATE schools SET mascot='Ravens', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Robbinsville';
UPDATE schools SET mascot='Panthers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Roselle Park';
UPDATE schools SET mascot='Gaels', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Roxbury';
UPDATE schools SET mascot='Bulldogs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Rumson-Fair Haven%';
UPDATE schools SET mascot='Argonauts', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Rutgers Prep%';
UPDATE schools SET mascot='Bulldogs', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Rutherford';

-- S
UPDATE schools SET mascot='Falcons', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Saddle Brook';
UPDATE schools SET mascot='Hermits', primary_color='#6A0DAD', secondary_color='#FFD700' WHERE display_name ILIKE 'St. Augustine%' OR display_name ILIKE 'Saint Augustine%';
UPDATE schools SET mascot='Gray Bees', primary_color='#808080', secondary_color='#FFD700' WHERE display_name ILIKE 'St. Benedict%' OR display_name ILIKE 'St Benedict%' OR display_name ILIKE 'Saint Benedict%';
UPDATE schools SET mascot='Lancers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Saint John Vianney%' OR display_name ILIKE 'St. John Vianney%';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'St. Joseph Metuchen%' OR display_name ILIKE 'Saint Joseph (Metuchen)%' OR display_name ILIKE 'St. Joseph%Metuchen%';
UPDATE schools SET mascot='Green Knights', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'St Joseph Regional%' OR display_name ILIKE 'Saint Joseph Regional%' OR display_name ILIKE 'St Joseph (Montvale)%';
UPDATE schools SET mascot='Marauders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'St. Peter%Prep%' OR display_name ILIKE 'St Peter%Prep%' OR display_name ILIKE 'Saint Peter%Prep%';
UPDATE schools SET mascot='Gaels', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'St. Mary%' OR display_name ILIKE 'Saint Mary%';
UPDATE schools SET mascot='Trojans', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Saint Thomas Aquinas%' OR display_name ILIKE 'St. Thomas Aquinas%';
UPDATE schools SET mascot='Wildcats', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Saint Joseph%Academy%' OR display_name ILIKE 'St. Joseph%Academy%';
UPDATE schools SET mascot='Pirates', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Seton Hall%';
UPDATE schools SET mascot='Rams', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Salem';
UPDATE schools SET mascot='Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Scotch Plains-Fanwood';
UPDATE schools SET mascot='Patriots', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Secaucus';
UPDATE schools SET mascot='Golden Eagles', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Seneca';
UPDATE schools SET mascot='Renegades', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Shawnee';
UPDATE schools SET mascot='Blue Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Shore Regional%';
UPDATE schools SET mascot='Rams', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='South River';
UPDATE schools SET mascot='Vikings', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='South Brunswick';
UPDATE schools SET mascot='Eagles', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'South Hunterdon%';
UPDATE schools SET mascot='Tigers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='South Plainfield';
UPDATE schools SET mascot='Rams', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Southern Regional';
UPDATE schools SET mascot='Spartans', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Sparta';
UPDATE schools SET mascot='Chargers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Spotswood';
UPDATE schools SET mascot='Silver Knights', primary_color='#808080', secondary_color='#C0C0C0' WHERE display_name='Sterling';
UPDATE schools SET mascot='Hilltoppers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Summit' OR display_name ILIKE 'Summit/%';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Sayreville%';
UPDATE schools SET mascot='Bulldogs', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Somerville';

-- T
UPDATE schools SET mascot='Highwaymen', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Teaneck';
UPDATE schools SET mascot='Tigers', primary_color='#CC0000', secondary_color='#000000' WHERE display_name='Tenafly';
UPDATE schools SET mascot='Chargers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Timber Creek';
UPDATE schools SET mascot='Raiders', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Toms River East%';
UPDATE schools SET mascot='Mariners', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Toms River North';
UPDATE schools SET mascot='Indians', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Toms River South';
UPDATE schools SET mascot='Tornadoes', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Trenton Central';

-- U
UPDATE schools SET mascot='Farmers', primary_color='#006400', secondary_color='#FFD700' WHERE display_name='Union';
UPDATE schools SET mascot='Soaring Eagles', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Union City';

-- V
UPDATE schools SET mascot='Vikings', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Vernon Township';
UPDATE schools SET mascot='Hillbillies', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Verona';
UPDATE schools SET mascot='Fighting Clan', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Vineland';
UPDATE schools SET mascot='Vikings', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Voorhees%';

-- W
UPDATE schools SET mascot='Warriors', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Waldwick%';
UPDATE schools SET mascot='Crimson Knights', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Wall%' AND display_name NOT ILIKE 'Wallkill%';
UPDATE schools SET mascot='Rangers', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Wallkill Valley%';
UPDATE schools SET mascot='Blue Streaks', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Warren Hills%';
UPDATE schools SET mascot='Minutemen', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Washington Township';
UPDATE schools SET mascot='Warriors', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Watchung Hills%';
UPDATE schools SET mascot='Patriots', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Wayne Hills';
UPDATE schools SET mascot='Indians', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Wayne Valley';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'West Essex%';
UPDATE schools SET mascot='Highlanders', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'West Milford%';
UPDATE schools SET mascot='Wolfpack', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='West Morris Central';
UPDATE schools SET mascot='Minutemen', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name ILIKE 'West Morris%Mendham%' OR display_name ILIKE 'West Morris ( Mendham)%';
UPDATE schools SET mascot='Mountaineers', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='West Orange';
UPDATE schools SET mascot='Eagles', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'West Deptford%';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'West Windsor-Plainsboro N%';
UPDATE schools SET mascot='Pirates', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'West Windsor-Plainsboro S%';
UPDATE schools SET mascot='Knights', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='West Windsor-Plainsboro' AND display_name NOT ILIKE '%N%' AND display_name NOT ILIKE '%S%';
UPDATE schools SET mascot='Blue Devils', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Westfield';
UPDATE schools SET mascot='Cardinals', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Westwood%';
UPDATE schools SET mascot='Wildcats', primary_color='#003087', secondary_color='#FFD700' WHERE display_name ILIKE 'Whippany Park%';
UPDATE schools SET mascot='Braves', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Williamstown';
UPDATE schools SET mascot='Eagles', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Winslow%';
UPDATE schools SET mascot='Eagles', primary_color='#1a1a2e', secondary_color='#FFD700' WHERE display_name ILIKE 'Willingboro%';
UPDATE schools SET mascot='Barrons', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Woodbridge';
UPDATE schools SET mascot='Wolverines', primary_color='#006400', secondary_color='#FFFFFF' WHERE display_name='Woodstown';

UPDATE schools SET mascot='Bulldogs', primary_color='#6A0DAD', secondary_color='#FFD700' WHERE display_name ILIKE 'BCIT%' OR display_name ILIKE 'Burlington Co Inst%';

-- Neptune was missing
UPDATE schools SET mascot='Scarlet Fliers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Neptune';

-- Donovan Catholic
UPDATE schools SET mascot='Griffins', primary_color='#003087', secondary_color='#FFD700' WHERE display_name='Donovan Catholic';

-- Additional individual schools
UPDATE schools SET mascot='Crusaders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name='Abraham Clark';
UPDATE schools SET mascot='Crusaders', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Arthur Johnson%';
UPDATE schools SET mascot='Falcons', primary_color='#003087', secondary_color='#FFFFFF' WHERE display_name ILIKE 'Monmouth Reg%';
UPDATE schools SET mascot='Indians', primary_color='#CC0000', secondary_color='#000000' WHERE display_name ILIKE 'Weehawken%';
UPDATE schools SET mascot='Panthers', primary_color='#006400', secondary_color='#FFD700' WHERE display_name ILIKE 'Brearley%';
UPDATE schools SET mascot='Bombers', primary_color='#CC0000', secondary_color='#FFFFFF' WHERE display_name='Boonton';

-- Default fallback: set remaining NULLs to generic dark/gold
UPDATE schools SET primary_color='#1a1a2e', secondary_color='#FFD700' WHERE primary_color IS NULL;
