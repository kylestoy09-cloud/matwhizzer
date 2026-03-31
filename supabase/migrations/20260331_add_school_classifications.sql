-- Add section and classification columns to schools
ALTER TABLE schools ADD COLUMN IF NOT EXISTS section text;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS classification text;

-- ============================================================
-- NON-PUBLIC A
-- ============================================================
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Bergen Catholic';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Christian Brothers Academy';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Delbarton School';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'Don Bosco Prep%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Notre Dame';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Paramus Catholic';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Paul VI';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name = 'Pingry School';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'St. Augustine%' OR display_name ILIKE 'Saint Augustine%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'St. Benedict%' OR display_name ILIKE 'St Benedict%' OR display_name ILIKE 'Saint Benedict%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'Saint John Vianney%' OR display_name ILIKE 'St. John Vianney%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'St. Joseph Metuchen%' OR display_name ILIKE 'Saint Joseph (Metuchen)%' OR display_name ILIKE 'St. Joseph%Metuchen%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'St Joseph Regional%' OR display_name ILIKE 'Saint Joseph Regional%' OR display_name ILIKE 'St Joseph (Montvale)%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'St. Peter%Prep%' OR display_name ILIKE 'St Peter%Prep%' OR display_name ILIKE 'Saint Peter%Prep%';
UPDATE schools SET section = 'Non-Public', classification = 'A' WHERE display_name ILIKE 'Seton Hall Prep%';

-- ============================================================
-- NON-PUBLIC B
-- ============================================================
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Camden Catholic';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'Depaul Catholic%' OR display_name ILIKE 'DePaul Catholic%';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Gloucester Catholic';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'Holy Cross%';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Holy Spirit';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Immaculata';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Newark Academy';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name = 'Pope John XXIII';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'Red Bank Catholic%';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'Rutgers Prep%';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'St. Mary%' OR display_name ILIKE 'Saint Mary%';
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE display_name ILIKE 'Saint Thomas Aquinas%' OR display_name ILIKE 'St. Thomas Aquinas%';

-- ============================================================
-- NORTH I - GROUP 5
-- ============================================================
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Bloomfield';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'East Orange Campus';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name ILIKE 'Eastside%Paterson%';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name ILIKE 'John F. Kennedy' AND display_name NOT ILIKE '%Iselin%' AND display_name NOT ILIKE '%Memorial%' AND display_name NOT ILIKE '%Patterson%';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name ILIKE 'JFK-Paterson%' OR display_name ILIKE 'John F. Kennedy Patterson%';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Livingston';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Montclair';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Morristown';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'North Bergen';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name ILIKE 'Passaic County Technical%' OR display_name ILIKE 'Passaic Co Tech%';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Passaic';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'Union City';
UPDATE schools SET section = 'North I', classification = '5' WHERE display_name = 'West Orange';

-- ============================================================
-- NORTH I - GROUP 4
-- ============================================================
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Belleville';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Clifton';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Fair Lawn';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Garfield';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Hackensack';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Millburn';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Morris Knolls';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name ILIKE 'Mt. Olive%' OR display_name ILIKE 'Mount Olive%';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name ILIKE 'Northern Highlands%';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Orange';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Phillipsburg';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Ridge';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Ridgewood';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name = 'Teaneck';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name ILIKE 'Leonia%';
UPDATE schools SET section = 'North I', classification = '4' WHERE display_name ILIKE 'Lyndhurst%';

-- ============================================================
-- NORTH I - GROUP 3
-- ============================================================
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Bergenfield';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Dover';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Dwight Morrow';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name ILIKE 'Montville Township%' OR display_name ILIKE 'Montville' OR display_name = 'Montville';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name ILIKE 'Northern Valley%Demarest%';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name ILIKE 'Northern Valley%Old Tappan%';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Paramus';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Ramapo';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'River Dell';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Sparta';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Tenafly';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Wayne Hills';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name = 'Wayne Valley';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name ILIKE 'Becton Regional%' OR display_name ILIKE '%Becton%' AND display_name NOT ILIKE '%East Rutherford%';
UPDATE schools SET section = 'North I', classification = '3' WHERE display_name ILIKE 'Lenape Valley%';

-- ============================================================
-- NORTH I - GROUP 2
-- ============================================================
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Dumont';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Glen Rock';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'High Point Regional%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'Jefferson TWP%' OR display_name ILIKE 'Jefferson Township%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'Lakeland Reg%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Mahwah';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Manchester Regional';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'Pascack Hills%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'Pascack Valley%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Ramsey';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name = 'Vernon Township';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'West Milford%';
UPDATE schools SET section = 'North I', classification = '2' WHERE display_name ILIKE 'Westwood%' AND display_name NOT ILIKE '%Boonton%';

-- ============================================================
-- NORTH I - GROUP 1
-- ============================================================
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Boonton';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Butler';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Cresskill';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Hawthorne';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Indian Hills';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Kinnelon';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Kittatinny Regional%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'New Milford';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Newton';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'North Warren%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Pequannock%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name = 'Pompton Lakes';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Ridgefield Memorial%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Wallkill Valley%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Emerson%';
UPDATE schools SET section = 'North I', classification = '1' WHERE display_name ILIKE 'Waldwick%';

-- ============================================================
-- NORTH II - GROUP 5
-- ============================================================
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name ILIKE 'Barringer%';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Bayonne';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Bridgewater-Raritan';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Columbia';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Elizabeth';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Irvington';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'John P. Stevens';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Kearny';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Linden';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Piscataway' OR display_name ILIKE 'Piscataway High%';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Plainfield';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Union';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Woodbridge';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'East Side';
UPDATE schools SET section = 'North II', classification = '5' WHERE display_name = 'Summit' OR display_name ILIKE 'Summit/Chatham%';

-- ============================================================
-- NORTH II - GROUP 4
-- ============================================================
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Colonia';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Middletown North';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Middletown South';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Montgomery';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'North Hunterdon';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Princeton';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Rahway';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name ILIKE 'Sayreville%';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Scotch Plains-Fanwood';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name ILIKE 'Watchung Hills%';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Westfield';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name ILIKE 'JFK-Iselin%';
UPDATE schools SET section = 'North II', classification = '4' WHERE display_name = 'Lodi';

-- ============================================================
-- NORTH II - GROUP 3
-- ============================================================
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Carteret';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Cranford';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Fort Lee';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Morris Hills' OR display_name ILIKE 'Morris Hills/%';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'North Plainfield';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Nutley';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Passaic Valley';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name ILIKE 'Randolph%';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'Roxbury';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'South Plainfield';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name ILIKE 'Warren Hills%';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name ILIKE 'West Essex%';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name ILIKE 'West Morris%Mendham%' OR display_name ILIKE 'West Morris ( Mendham)%';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name = 'West Morris Central';
UPDATE schools SET section = 'North II', classification = '3' WHERE display_name ILIKE 'Brearley%' OR display_name ILIKE 'David Brearley%';

-- ============================================================
-- NORTH II - GROUP 2
-- ============================================================
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name = 'Abraham Clark';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name = 'Bernards';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Elmwood Park%';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Governor Livingston%';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name = 'Hackettstown';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Hillside%';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Caldwell%' OR display_name ILIKE 'James Caldwell%';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name = 'Madison';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name = 'Parsippany';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Parsippany Hills%' AND display_name NOT ILIKE '%Parsippany';
UPDATE schools SET section = 'North II', classification = '2' WHERE display_name ILIKE 'Voorhees%';

-- ============================================================
-- NORTH II - GROUP 1
-- ============================================================
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Belvidere';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Cedar Grove';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Glen Ridge';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name ILIKE 'Hanover Park%';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Hasbrouck Heights';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name ILIKE 'Hoboken%';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Mountain Lakes';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'New Providence';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Roselle Park';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Rutherford';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Secaucus';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name = 'Verona';
UPDATE schools SET section = 'North II', classification = '1' WHERE display_name ILIKE 'Whippany Park%';

-- ============================================================
-- CENTRAL - GROUP 5
-- ============================================================
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name ILIKE 'East Brunswick%';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Edison';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Franklin';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Freehold Township';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name ILIKE 'Jackson%Township%' OR display_name = 'Jackson Memorial' OR display_name ILIKE 'Jackson Memorial%';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Hillsborough';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name ILIKE 'Hunterdon Central%';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Monroe Township';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'New Brunswick';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name ILIKE 'North Brunswick%';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Old Bridge';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Perth Amboy';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'South Brunswick';
UPDATE schools SET section = 'Central', classification = '5' WHERE display_name = 'Trenton Central';

-- ============================================================
-- CENTRAL - GROUP 4
-- ============================================================
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Colts Neck';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name ILIKE 'Freehold Borough%' OR display_name ILIKE 'Freehold Boro%';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name ILIKE 'Hamilton East%';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Hamilton West';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Hightstown';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Lakewood';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Long Branch';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Manalapan';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name = 'Marlboro';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name ILIKE 'Red Bank Regional%';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name ILIKE 'West Windsor-Plainsboro N%';
UPDATE schools SET section = 'Central', classification = '4' WHERE display_name ILIKE 'West Windsor-Plainsboro S%';

-- ============================================================
-- CENTRAL - GROUP 3
-- ============================================================
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Allentown';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Brick Memorial';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Brick Township';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Burlington Township';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Ewing';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Hamilton North%';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Hopewell Valley%';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Lawrence%';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Matawan Reg%' OR display_name ILIKE 'Matawan Regional%';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Neptune';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Robbinsville';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name = 'Somerville';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Bordentown%';
UPDATE schools SET section = 'Central', classification = '3' WHERE display_name ILIKE 'Middlesex%';

-- ============================================================
-- CENTRAL - GROUP 2
-- ============================================================
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Arthur Johnson%';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Cinnaminson';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Delran';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Holmdel';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Manasquan';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Monmouth Reg%';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Ocean Township';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Point Pleasant Boro%' OR display_name ILIKE 'Point Pleasant Borough%';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Raritan';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Rumson-Fair Haven%';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name = 'Spotswood';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Wall%' AND display_name NOT ILIKE 'Wallkill%';
UPDATE schools SET section = 'Central', classification = '2' WHERE display_name ILIKE 'Willingboro%';

-- ============================================================
-- CENTRAL - GROUP 1
-- ============================================================
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'Asbury Park';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Bound Brook%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'Burlington City';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Delaware Valley%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'Highland Park';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Keyport%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Manville%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'Metuchen';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'New Egypt';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Point Pleasant Beach%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Shore Regional%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'South Hunterdon%';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name = 'South River';
UPDATE schools SET section = 'Central', classification = '1' WHERE display_name ILIKE 'Keansburg%';

-- ============================================================
-- SOUTH - GROUP 5
-- ============================================================
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Atlantic City';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Cherokee';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Cherry Hill East';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Eastern';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name ILIKE 'Egg Harbor%';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Howell';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name ILIKE 'Kingsway%';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Lenape';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name ILIKE 'Rancocas Valley%';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Southern Regional';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Toms River North';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Vineland';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name = 'Washington Township';
UPDATE schools SET section = 'South', classification = '5' WHERE display_name ILIKE 'Highland Regional%';

-- ============================================================
-- SOUTH - GROUP 4
-- ============================================================
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Central Regional';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Cherry Hill West';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Clearview Regional';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Hammonton';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Millville';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name ILIKE 'Northern Burlington%';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Pennsauken';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Shawnee';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name ILIKE 'Toms River East%';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Toms River South';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Williamstown';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name ILIKE 'Winslow%';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name ILIKE 'BCIT%Westampton%' OR display_name ILIKE 'Burlington Co Inst%';
UPDATE schools SET section = 'South', classification = '4' WHERE display_name = 'Camden';

-- ============================================================
-- SOUTH - GROUP 3
-- ============================================================
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Absegami';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Barnegat';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Cumberland Regional';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name ILIKE 'Delsea%';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name ILIKE 'Deptford%';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Lacey Township';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name ILIKE 'Mainland%';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Moorestown';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Ocean City';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Pemberton Township';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Pinelands Regional';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Seneca';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name = 'Timber Creek';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name ILIKE 'Clayton%';
UPDATE schools SET section = 'South', classification = '3' WHERE display_name ILIKE 'Gateway%';

-- ============================================================
-- SOUTH - GROUP 2
-- ============================================================
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Cedar Creek';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Collingswood';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name ILIKE 'Gloucester City%';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Haddon Heights';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name ILIKE 'Haddonfield%';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Lindenwold';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name ILIKE 'Lower Cape May%';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Manchester Township';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Middle Township';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Oakcrest';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name ILIKE 'Overbrook%';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name = 'Sterling';
UPDATE schools SET section = 'South', classification = '2' WHERE display_name ILIKE 'West Deptford%';

-- ============================================================
-- SOUTH - GROUP 1
-- ============================================================
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'A.P. Schalick%' OR display_name ILIKE 'Arthur P. Schalick%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Audubon';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'Buena Regional%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'Haddon Twp%' OR display_name ILIKE 'Haddon Township%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Maple Shade';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Palmyra';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'Paulsboro%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'Penns Grove%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name ILIKE 'Pennsville%';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Pitman';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Riverside';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Salem';
UPDATE schools SET section = 'South', classification = '1' WHERE display_name = 'Woodstown';
