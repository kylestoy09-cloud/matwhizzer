-- ============================================================
-- MatWhizzer: Logo upload + header_background update, all 325 schools
-- Date: 2026-07-16
-- Applies: logo_url (new Supabase Storage path) + header_background
--          for all 325 schools. Unconditional overwrite.
-- NOTE: School 358 (Roselle) UPDATE below is a no-op until
--       20260716_restore_roselle_358.sql is applied first.
-- DO NOT RUN DIRECTLY — paste into Supabase SQL editor.
-- ============================================================

BEGIN;

-- ── FORWARD: set logo_url and header_background ──────────────────

UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/1.png',  header_background = '#000000'  WHERE id = 1; -- Cresskill
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/2.png',  header_background = '#503604'  WHERE id = 2; -- Dumont
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/3.png',  header_background = '#FFFFFF'  WHERE id = 3; -- Emerson Boro
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/4.png',  header_background = '#FFDF00'  WHERE id = 4; -- Jefferson
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/5.png',  header_background = '#CC0022'  WHERE id = 5; -- Lakeland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/6.png',  header_background = '#05024B'  WHERE id = 6; -- Old Tappan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/7.png',  header_background = '#454444'  WHERE id = 7; -- Phillipsburg
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/8.png',  header_background = '#C8880A'  WHERE id = 8; -- River Dell
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/9.png',  header_background = '#034CB2'  WHERE id = 9; -- Waldwick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/10.png',  header_background = '#000000'  WHERE id = 10; -- Westwood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/11.png',  header_background = '#8F0018'  WHERE id = 11; -- Don Bosco Prep
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/12.png',  header_background = '#CC0022'  WHERE id = 12; -- Glen Rock
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/13.png',  header_background = '#034CB2'  WHERE id = 13; -- Indian Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/14.png',  header_background = '#91BCD4'  WHERE id = 14; -- Mahwah
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/15.png',  header_background = '#000000'  WHERE id = 15; -- Pascack Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/16.png',  header_background = '#00824B'  WHERE id = 16; -- Pascack Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/17.png',  header_background = '#00824B'  WHERE id = 17; -- Ramapo
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/18.png',  header_background = '#FFFFFF'  WHERE id = 18; -- Ramsey
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/19.png',  header_background = '#76232F'  WHERE id = 19; -- Ridgewood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/20.png',  header_background = '#FFFFFF'  WHERE id = 20; -- Saddle River Day
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/21.png',  header_background = '#FFFFFF'  WHERE id = 21; -- Bergen Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/22.png',  header_background = '#025B40'  WHERE id = 22; -- Depaul Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/24.png',  header_background = '#000000'  WHERE id = 24; -- Newton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/25.png',  header_background = '#034CB2'  WHERE id = 25; -- North Warren
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/26.png',  header_background = '#7AABDE'  WHERE id = 26; -- Sparta
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/27.png',  header_background = '#034CB2'  WHERE id = 27; -- Vernon
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/28.png',  header_background = '#FFFFFF'  WHERE id = 28; -- Wallkill Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/29.png',  header_background = '#FCBC2E'  WHERE id = 29; -- West Milford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/30.png',  header_background = '#034CB2'  WHERE id = 30; -- Butler
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/31.png',  header_background = '#FFFFFF'  WHERE id = 31; -- Hawthorne
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/32.png',  header_background = '#034CB2'  WHERE id = 32; -- High Point
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/33.png',  header_background = '#00824B'  WHERE id = 33; -- Kinnelon
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/34.png',  header_background = '#00824B'  WHERE id = 34; -- New Milford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/35.png',  header_background = '#CC0022'  WHERE id = 35; -- Northern Highlands
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/36.png',  header_background = '#C8880A'  WHERE id = 36; -- Pequannock
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/37.png',  header_background = '#CC0022'  WHERE id = 37; -- Pompton Lakes
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/38.png',  header_background = '#8F0018'  WHERE id = 38; -- Wayne Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/39.png',  header_background = '#034CB2'  WHERE id = 39; -- West Essex
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/40.png',  header_background = '#FFFFFF'  WHERE id = 40; -- Bergenfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/41.png',  header_background = '#8F0018'  WHERE id = 41; -- Dwight Morrow
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/42.png',  header_background = '#000000'  WHERE id = 42; -- Fort Lee
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/43.png',  header_background = '#FFFFFF'  WHERE id = 43; -- Hackensack
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/44.png',  header_background = '#C3BFC0'  WHERE id = 44; -- Leonia
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/45.png',  header_background = '#CC0022'  WHERE id = 45; -- Manchester Regional
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/46.png',  header_background = '#00824B'  WHERE id = 46; -- Passaic Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/48.png',  header_background = '#0000AE'  WHERE id = 48; -- Teaneck
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/49.png',  header_background = '#CC4E10'  WHERE id = 49; -- Tenafly
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/50.png',  header_background = '#454444'  WHERE id = 50; -- Clifton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/51.png',  header_background = '#FFFFFF'  WHERE id = 51; -- Elmwood Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/52.png',  header_background = '#52000E'  WHERE id = 52; -- Fair Lawn
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/53.png',  header_background = '#000000'  WHERE id = 53; -- Garfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/54.png',  header_background = '#FFFFFF'  WHERE id = 54; -- Hasbrouck Heights
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/55.png',  header_background = '#034CB2'  WHERE id = 55; -- Lodi
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/56.png',  header_background = '#CC0022'  WHERE id = 56; -- Mt. Olive
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/57.png',  header_background = '#034CB2'  WHERE id = 57; -- Paramus
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/58.png',  header_background = '#CC0022'  WHERE id = 58; -- Passaic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/59.png',  header_background = '#006400'  WHERE id = 59; -- Saddle Brook
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/60.png',  header_background = '#C8880A'  WHERE id = 60; -- Cedar Grove
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/61.png',  header_background = '#D38B3C'  WHERE id = 61; -- Dover
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/62.png',  header_background = '#034CB2'  WHERE id = 62; -- Lenape Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/63.png',  header_background = '#FFA500'  WHERE id = 63; -- Mountain Lakes
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/64.png',  header_background = '#454444'  WHERE id = 64; -- Parsippany
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/66.png',  header_background = '#D7B882'  WHERE id = 66; -- Roxbury
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/67.png',  header_background = '#808080'  WHERE id = 67; -- Warren Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/68.png',  header_background = '#689BFF'  WHERE id = 68; -- Wayne Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/70.png',  header_background = '#CC0022'  WHERE id = 70; -- Boonton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/71.png',  header_background = '#FFD700'  WHERE id = 71; -- College Achieve Paterson
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/72.png',  header_background = '#CC4E10'  WHERE id = 72; -- Paterson Eastside
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/73.png',  header_background = '#FFFFFF'  WHERE id = 73; -- Immaculata
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/74.png',  header_background = '#CC0022'  WHERE id = 74; -- John F. Kennedy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/75.png',  header_background = '#FFFFFF'  WHERE id = 75; -- Montville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/76.png',  header_background = '#CC0022'  WHERE id = 76; -- Morris Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/77.png',  header_background = '#FFD700'  WHERE id = 77; -- Morris Knolls
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/78.png',  header_background = '#034CB2'  WHERE id = 78; -- Parsippany Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/79.png',  header_background = '#FFD700'  WHERE id = 79; -- Pioneer Academy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/80.png',  header_background = '#000000'  WHERE id = 80; -- Barringer
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/81.png',  header_background = '#454444'  WHERE id = 81; -- Bloomfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/82.png',  header_background = '#183820'  WHERE id = 82; -- Delbarton School
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/83.png',  header_background = '#C8880A'  WHERE id = 83; -- Lyndhurst
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/84.png',  header_background = '#8F0018'  WHERE id = 84; -- Madison
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/85.png',  header_background = '#034CB2'  WHERE id = 85; -- Newark Collegiate
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/86.png',  header_background = '#CC4E10'  WHERE id = 86; -- Orange
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/87.png',  header_background = '#FFFFFF'  WHERE id = 87; -- Randolph
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/88.png',  header_background = '#034CB2'  WHERE id = 88; -- St. Mary High School (Rutherford)
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/89.png',  header_background = '#AD0B0E'  WHERE id = 89; -- Mendham
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/91.png',  header_background = '#0039A6'  WHERE id = 91; -- Caldwell
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/93.png',  header_background = '#034CB2'  WHERE id = 93; -- Cranford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/94.png',  header_background = '#CC0022'  WHERE id = 94; -- Hoboken High School
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/95.png',  header_background = '#C8880A'  WHERE id = 95; -- North Bergen
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/96.png',  header_background = '#004679'  WHERE id = 96; -- Rutherford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/97.png',  header_background = '#C52033'  WHERE id = 97; -- Secaucus
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/98.png',  header_background = '#C0C0C0'  WHERE id = 98; -- Union City
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/99.png',  header_background = '#818181'  WHERE id = 99; -- Weehawken High School
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/100.png',  header_background = '#034CB2'  WHERE id = 100; -- Belleville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/101.png',  header_background = '#FFFFFF'  WHERE id = 101; -- Glen Ridge
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/102.png',  header_background = '#C42027'  WHERE id = 102; -- Governor Livingston
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/103.png',  header_background = '#FFFFFF'  WHERE id = 103; -- Kearny
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/104.png',  header_background = '#1F331F'  WHERE id = 104; -- Livingston
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/105.png',  header_background = '#034CB2'  WHERE id = 105; -- Montclair
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/106.png',  header_background = '#8F0018'  WHERE id = 106; -- Nutley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/107.png',  header_background = '#8F0018'  WHERE id = 107; -- Verona
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/108.png',  header_background = '#1F4679'  WHERE id = 108; -- West Morris
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/109.png',  header_background = '#8F0018'  WHERE id = 109; -- West Orange
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/110.png',  header_background = '#CC0022'  WHERE id = 110; -- Belvidere
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/111.png',  header_background = '#CC0022'  WHERE id = 111; -- East Orange
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/112.png',  header_background = '#DE470E'  WHERE id = 112; -- Hackettstown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/113.png',  header_background = '#C8880A'  WHERE id = 113; -- Hanover Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/114.png',  header_background = '#8F0018'  WHERE id = 114; -- Morristown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/115.png',  header_background = '#003087'  WHERE id = 115; -- Newark Academy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/116.png',  header_background = '#003087'  WHERE id = 116; -- North Star Academy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/117.png',  header_background = '#B59C63'  WHERE id = 117; -- Pope John XXIII
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/118.png',  header_background = '#737373'  WHERE id = 118; -- St. Benedicts Prep School
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/119.png',  header_background = '#CC0022'  WHERE id = 119; -- Whippany Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/120.png',  header_background = '#9A2A2A'  WHERE id = 120; -- Bayonne
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/121.png',  header_background = '#000000'  WHERE id = 121; -- Columbia
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/122.png',  header_background = '#BA1B26'  WHERE id = 122; -- Newark East Side
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/123.png',  header_background = '#FF1120'  WHERE id = 123; -- Elizabeth
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/124.png',  header_background = '#FFFFFF'  WHERE id = 124; -- Hillside High School
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/125.png',  header_background = '#CC0022'  WHERE id = 125; -- Roselle Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/126.png',  header_background = '#034CB2'  WHERE id = 126; -- Scotch Plains-Fanwood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/127.png',  header_background = '#4169E1'  WHERE id = 127; -- Seton Hall Prep
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/128.png',  header_background = '#0504C3'  WHERE id = 128; -- Westfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/129.png',  header_background = '#034CB2'  WHERE id = 129; -- Johnson
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/130.png',  header_background = '#CC0022'  WHERE id = 130; -- Brearley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/131.png',  header_background = '#000000'  WHERE id = 131; -- Bridgewater-Raritan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/132.png',  header_background = '#090580'  WHERE id = 132; -- Irvington
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/133.png',  header_background = '#034CB2'  WHERE id = 133; -- Millburn
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/134.png',  header_background = '#FFDD00'  WHERE id = 134; -- New Providence
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/135.png',  header_background = '#00824B'  WHERE id = 135; -- North Hunterdon
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/136.png',  header_background = '#6F777B'  WHERE id = 136; -- South Hunterdon
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/138.png',  header_background = '#8F0018'  WHERE id = 138; -- Union
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/139.png',  header_background = '#CC0022'  WHERE id = 139; -- Bernards
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/141.png',  header_background = '#040559'  WHERE id = 141; -- Delaware Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/143.png',  header_background = '#FFFFFF'  WHERE id = 143; -- North Plainfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/144.png',  header_background = '#034CB2'  WHERE id = 144; -- Pingry
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/145.png',  header_background = '#FFA500'  WHERE id = 145; -- Somerville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/146.png',  header_background = '#FDB837'  WHERE id = 146; -- Voorhees
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/147.png',  header_background = '#503604'  WHERE id = 147; -- Watchung Hills
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/148.png',  header_background = '#034CB2'  WHERE id = 148; -- Carteret
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/149.png',  header_background = '#F2B214'  WHERE id = 149; -- Colonia
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/150.png',  header_background = '#454444'  WHERE id = 150; -- Iselin Kennedy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/151.png',  header_background = '#C8880A'  WHERE id = 151; -- John P. Stevens
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/152.png',  header_background = '#FFFFFF'  WHERE id = 152; -- Linden
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/153.png',  header_background = '#C5B358'  WHERE id = 153; -- Paramus Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/154.png',  header_background = '#034CB2'  WHERE id = 154; -- Plainfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/155.png',  header_background = '#CC0022'  WHERE id = 155; -- Rahway
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/156.png',  header_background = '#00824B'  WHERE id = 156; -- Ridge
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/157.png',  header_background = '#00824B'  WHERE id = 157; -- South Plainfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/158.png',  header_background = '#00824B'  WHERE id = 158; -- East Brunswick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/159.png',  header_background = '#FC7701'  WHERE id = 159; -- Middletown North
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/160.png',  header_background = '#034CB2'  WHERE id = 160; -- Middletown South
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/162.png',  header_background = '#C8880A'  WHERE id = 162; -- North Brunswick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/163.png',  header_background = '#754ACC'  WHERE id = 163; -- Old Bridge
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/164.png',  header_background = '#C8880A'  WHERE id = 164; -- South Brunswick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/165.png',  header_background = '#5C0006'  WHERE id = 165; -- South River
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/166.png',  header_background = '#FFFFFF'  WHERE id = 166; -- Spotswood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/167.png',  header_background = '#840029'  WHERE id = 167; -- St. Peter's Prep
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/168.png',  header_background = '#1A1A2E'  WHERE id = 168; -- Central Jersey College Prep
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/169.png',  header_background = '#C8880A'  WHERE id = 169; -- Franklin
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/170.png',  header_background = '#FAD703'  WHERE id = 170; -- Hopewell Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/171.png',  header_background = '#F3A707'  WHERE id = 171; -- Manville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/172.png',  header_background = '#C8880A'  WHERE id = 172; -- Monroe
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/173.png',  header_background = '#00824B'  WHERE id = 173; -- Montgomery
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/174.png',  header_background = '#94BED7'  WHERE id = 174; -- Princeton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/175.png',  header_background = '#5C3068'  WHERE id = 175; -- Rumson-Fair Haven
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/176.png',  header_background = '#022C66'  WHERE id = 176; -- West Windsor-Plainsboro North
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/177.png',  header_background = '#00824B'  WHERE id = 177; -- West Windsor-Plainsboro South
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/178.png',  header_background = '#C8880A'  WHERE id = 178; -- Edison
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/179.png',  header_background = '#831E24'  WHERE id = 179; -- Highland Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/180.png',  header_background = '#000000'  WHERE id = 180; -- Metuchen
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/181.png',  header_background = '#FFFFFF'  WHERE id = 181; -- New Brunswick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/182.png',  header_background = '#CC0022'  WHERE id = 182; -- Perth Amboy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/183.png',  header_background = '#222222'  WHERE id = 183; -- Piscataway
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/184.png',  header_background = '#00824B'  WHERE id = 184; -- Raritan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/185.png',  header_background = '#454444'  WHERE id = 185; -- Sayreville War Memorial
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/186.png',  header_background = '#008000'  WHERE id = 186; -- St. Joseph Metuchen
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/187.png',  header_background = '#FFFFFF'  WHERE id = 187; -- Woodbridge
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/188.png',  header_background = '#C8880A'  WHERE id = 188; -- Hillsborough
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/189.png',  header_background = '#454444'  WHERE id = 189; -- Holmdel
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/190.png',  header_background = '#222222'  WHERE id = 190; -- Hunterdon Central
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/191.png',  header_background = '#034CB2'  WHERE id = 191; -- Keansburg
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/193.png',  header_background = '#1E3265'  WHERE id = 193; -- Marlboro
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/195.png',  header_background = '#034CB2'  WHERE id = 195; -- Red Bank Regional
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/196.png',  header_background = '#FFFFFF'  WHERE id = 196; -- Rutgers Prep
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/197.png',  header_background = '#B0E0E6'  WHERE id = 197; -- Christian Brothers
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/198.png',  header_background = '#FFFFFF'  WHERE id = 198; -- Colts Neck
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/199.png',  header_background = '#E8B827'  WHERE id = 199; -- Freehold Borough
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/200.png',  header_background = '#C8880A'  WHERE id = 200; -- Freehold Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/201.png',  header_background = '#8F0018'  WHERE id = 201; -- Holy Cross
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/203.png',  header_background = '#FFFFFF'  WHERE id = 203; -- Lakewood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/204.png',  header_background = '#CC0022'  WHERE id = 204; -- Manalapan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/205.png',  header_background = '#DBB235'  WHERE id = 205; -- New Egypt
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/206.png',  header_background = '#034CB2'  WHERE id = 206; -- Ranney
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/207.png',  header_background = '#C8880A'  WHERE id = 207; -- Brick Memorial
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/208.png',  header_background = '#006000'  WHERE id = 208; -- Steinert
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/209.png',  header_background = '#C8880A'  WHERE id = 209; -- Nottingham
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/210.png',  header_background = '#000000'  WHERE id = 210; -- Lawrence
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/211.png',  header_background = '#00824B'  WHERE id = 211; -- Long Branch
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/213.png',  header_background = '#4169E1'  WHERE id = 213; -- Notre Dame
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/214.png',  header_background = '#8F0018'  WHERE id = 214; -- Riverside
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/215.png',  header_background = '#A7192E'  WHERE id = 215; -- Robbinsville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/216.png',  header_background = '#222222'  WHERE id = 216; -- Trenton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/217.png',  header_background = '#92CCFE'  WHERE id = 217; -- Asbury Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/218.png',  header_background = '#00824B'  WHERE id = 218; -- Brick Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/219.png',  header_background = '#EE151E'  WHERE id = 219; -- Jackson Liberty
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/220.png',  header_background = '#0D2C89'  WHERE id = 220; -- Manasquan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/221.png',  header_background = '#000000'  WHERE id = 221; -- Neptune
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/222.png',  header_background = '#CC0022'  WHERE id = 222; -- Ocean Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/223.png',  header_background = '#FFFFFF'  WHERE id = 223; -- Point Pleasant Beach
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/224.png',  header_background = '#FFD700'  WHERE id = 224; -- Point Pleasant Boro
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/225.png',  header_background = '#1B5997'  WHERE id = 225; -- Shore
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/226.png',  header_background = '#000000'  WHERE id = 226; -- Allentown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/227.png',  header_background = '#1A1A2E'  WHERE id = 227; -- Bordentown Regional/Florence
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/228.png',  header_background = '#034CB2'  WHERE id = 228; -- Burlington City
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/229.png',  header_background = '#C8880A'  WHERE id = 229; -- Burlington Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/230.png',  header_background = '#034CB2'  WHERE id = 230; -- Ewing
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/231.png',  header_background = '#FE7722'  WHERE id = 231; -- Hamilton West
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/232.png',  header_background = '#13275D'  WHERE id = 232; -- Hightstown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/233.png',  header_background = '#737272'  WHERE id = 233; -- Howell
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/234.png',  header_background = '#CC0022'  WHERE id = 234; -- Saint Thomas Aquinas
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/235.png',  header_background = '#C61330'  WHERE id = 235; -- Wall
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/236.png',  header_background = '#F7D416'  WHERE id = 236; -- Audubon
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/237.png',  header_background = '#754ACC'  WHERE id = 237; -- Camden
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/238.png',  header_background = '#01015B'  WHERE id = 238; -- Collingswood
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/239.png',  header_background = '#CC0022'  WHERE id = 239; -- Haddon Heights
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/240.png',  header_background = '#A6A6A6'  WHERE id = 240; -- Haddon Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/241.png',  header_background = '#034CB2'  WHERE id = 241; -- Paul VI
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/242.png',  header_background = '#000000'  WHERE id = 242; -- Pennsauken
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/243.png',  header_background = '#C8880A'  WHERE id = 243; -- Saint John Vianney
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/244.png',  header_background = '#034CB2'  WHERE id = 244; -- Sterling
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/245.png',  header_background = '#00824B'  WHERE id = 245; -- West Deptford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/246.png',  header_background = '#CC4E10'  WHERE id = 246; -- Barnegat
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/247.png',  header_background = '#C8880A'  WHERE id = 247; -- Central Regional
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/248.png',  header_background = '#003087'  WHERE id = 248; -- Donovan Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/249.png',  header_background = '#8A2432'  WHERE id = 249; -- Lacey
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/250.png',  header_background = '#C8880A'  WHERE id = 250; -- Manchester Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/251.png',  header_background = '#C8880A'  WHERE id = 251; -- Pinelands Regional
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/252.png',  header_background = '#000000'  WHERE id = 252; -- Southern Regional
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/253.png',  header_background = '#CC0022'  WHERE id = 253; -- Toms River East
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/254.png',  header_background = '#88878F'  WHERE id = 254; -- Toms River North
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/255.png',  header_background = '#818181'  WHERE id = 255; -- Toms River South
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/256.png',  header_background = '#454444'  WHERE id = 256; -- Westampton Tech
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/257.png',  header_background = '#CC0022'  WHERE id = 257; -- Cinnaminson
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/258.png',  header_background = '#503604'  WHERE id = 258; -- Delran
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/259.png',  header_background = '#00274C'  WHERE id = 259; -- Gloucester City JR/SR
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/260.png',  header_background = '#CC0022'  WHERE id = 260; -- Kingsway
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/261.png',  header_background = '#FDB604'  WHERE id = 261; -- Moorestown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/262.png',  header_background = '#CC0022'  WHERE id = 262; -- Palmyra
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/263.png',  header_background = '#DD1931'  WHERE id = 263; -- Rancocas Valley
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/264.png',  header_background = '#000000'  WHERE id = 264; -- Red Bank Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/265.png',  header_background = '#034CB2'  WHERE id = 265; -- Willingboro
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/266.png',  header_background = '#FFFFFF'  WHERE id = 266; -- Cherokee
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/267.png',  header_background = '#FFFFFF'  WHERE id = 267; -- Cherry Hill East
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/268.png',  header_background = '#754ACC'  WHERE id = 268; -- Cherry Hill West
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/269.png',  header_background = '#8F0018'  WHERE id = 269; -- Gloucester Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/270.png',  header_background = '#000000'  WHERE id = 270; -- Haddonfield
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/271.png',  header_background = '#CA0814'  WHERE id = 271; -- Lenape
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/272.png',  header_background = '#FCAE04'  WHERE id = 272; -- Maple Shade
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/273.png',  header_background = '#00824B'  WHERE id = 273; -- Pemberton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/274.png',  header_background = '#C8880A'  WHERE id = 274; -- Seneca
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/275.png',  header_background = '#00205C'  WHERE id = 275; -- Shawnee
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/276.png',  header_background = '#FFFFFF'  WHERE id = 276; -- Absegami
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/277.png',  header_background = '#022C66'  WHERE id = 277; -- Atlantic City
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/278.png',  header_background = '#00824B'  WHERE id = 278; -- Camden Catholic
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/279.png',  header_background = '#000000'  WHERE id = 279; -- Egg Harbor
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/280.png',  header_background = '#C5B358'  WHERE id = 280; -- Holy Spirit
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/281.png',  header_background = '#174259'  WHERE id = 281; -- Lower Cape May
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/282.png',  header_background = '#000000'  WHERE id = 282; -- Mainland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/283.png',  header_background = '#CC4E10'  WHERE id = 283; -- Middle Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/284.png',  header_background = '#034CB2'  WHERE id = 284; -- Oakcrest
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/285.png',  header_background = '#A6A6A6'  WHERE id = 285; -- Ocean City
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/286.png',  header_background = '#195821'  WHERE id = 286; -- Schalick
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/287.png',  header_background = '#034CB2'  WHERE id = 287; -- Buena
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/288.png',  header_background = '#602121'  WHERE id = 288; -- Cedar Creek
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/289.png',  header_background = '#DB5B2A'  WHERE id = 289; -- Cumberland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/290.png',  header_background = '#FFFFFF'  WHERE id = 290; -- Delsea
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/291.png',  header_background = '#034CB2'  WHERE id = 291; -- Gateway Reg/ Woodbury
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/292.png',  header_background = '#CC4E10'  WHERE id = 292; -- Millville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/293.png',  header_background = '#263586'  WHERE id = 293; -- Pennsville
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/294.png',  header_background = '#FFFFFF'  WHERE id = 294; -- Vineland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/295.png',  header_background = '#F09817'  WHERE id = 295; -- Woodstown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/296.png',  header_background = '#042D65'  WHERE id = 296; -- Eastern
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/297.png',  header_background = '#034CB2'  WHERE id = 297; -- Hammonton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/299.png',  header_background = '#FFFFFF'  WHERE id = 299; -- Overbrook
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/301.png',  header_background = '#FFFFFF'  WHERE id = 301; -- Timber Creek
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/302.png',  header_background = '#CF0A2C'  WHERE id = 302; -- Washington Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/303.png',  header_background = '#034CB2'  WHERE id = 303; -- Williamstown
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/304.png',  header_background = '#00824B'  WHERE id = 304; -- Winslow
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/305.png',  header_background = '#ECDF43'  WHERE id = 305; -- Clayton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/306.png',  header_background = '#FFDD00'  WHERE id = 306; -- Clearview
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/307.png',  header_background = '#AE8524'  WHERE id = 307; -- Deptford
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/308.png',  header_background = '#034CB2'  WHERE id = 308; -- Lindenwold
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/309.png',  header_background = '#CC0022'  WHERE id = 309; -- Paulsboro
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/310.png',  header_background = '#CC0022'  WHERE id = 310; -- Penns Grove
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/311.png',  header_background = '#CC4E10'  WHERE id = 311; -- Pitman
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/312.png',  header_background = '#034CB2'  WHERE id = 312; -- Salem
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/313.png',  header_background = '#9CBEE1'  WHERE id = 313; -- St. Augustine
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/314.png',  header_background = '#034CB2'  WHERE id = 314; -- Demarest
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/315.png',  header_background = '#FFFFFF'  WHERE id = 315; -- Kittatinny
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/321.png',  header_background = '#8F0018'  WHERE id = 321; -- Becton
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/322.png',  header_background = '#BB271A'  WHERE id = 322; -- Bound Brook
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/356.png',  header_background = '#ED1C24'  WHERE id = 356; -- St. Joseph's (Hammonton)
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/357.png',  header_background = '#034CB2'  WHERE id = 357; -- Ridgefield Memorial
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/358.png',  header_background = '#FFFFFF'  WHERE id = 358; -- Roselle
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/359.png',  header_background = '#FFD700'  WHERE id = 359; -- Bergen Charter
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/360.png',  header_background = '#034CB2'  WHERE id = 360; -- Buena Regional/Vineland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/363.png',  header_background = '#754ACC'  WHERE id = 363; -- Cherry Hill East/Cherry Hill West
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/364.png',  header_background = '#FF0000'  WHERE id = 364; -- Cliffside Park
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/365.png',  header_background = '#034CB2'  WHERE id = 365; -- Cliffside Park/Ridgefield Memorial
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/369.png',  header_background = '#034CB2'  WHERE id = 369; -- Highland
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/370.png',  header_background = '#222222'  WHERE id = 370; -- Jackson Township
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/372.png',  header_background = '#FFFFFF'  WHERE id = 372; -- Jefferson-Sparta
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/374.png',  header_background = '#000000'  WHERE id = 374; -- Keyport
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/379.png',  header_background = '#006400'  WHERE id = 379; -- Lodi/Saddle Brook
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/381.png',  header_background = '#FFFFFF'  WHERE id = 381; -- Mary Help of Christians Academy
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/382.png',  header_background = '#580615'  WHERE id = 382; -- Matawan
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/383.png',  header_background = '#0000FF'  WHERE id = 383; -- Middlesex
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/384.png',  header_background = '#C8880A'  WHERE id = 384; -- Monmouth
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/385.png',  header_background = '#CC0022'  WHERE id = 385; -- Morris Hills-Morris Knolls
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/388.png',  header_background = '#454444'  WHERE id = 388; -- Northern Burlington
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/391.png',  header_background = '#034CB2'  WHERE id = 391; -- Passaic Tech
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/392.png',  header_background = '#034CB2'  WHERE id = 392; -- Ramsey/Northern Highlands
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/393.png',  header_background = '#FFFFFF'  WHERE id = 393; -- Ridgefield Park/Bogota
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/394.png',  header_background = '#013220'  WHERE id = 394; -- St Joseph (Montvale) HS
UPDATE schools SET  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/397.png',  header_background = '#56122A'  WHERE id = 397; -- Summit

-- ── ROLLBACK: restore prior logo_url + header_background ─────────
-- To undo, paste the block below into Supabase SQL editor:
--
-- BEGIN;
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 1; -- Cresskill
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 2; -- Dumont
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 3; -- Emerson Boro
-- UPDATE schools SET logo_url = NULL, header_background = '#FFDF00'  WHERE id = 4; -- Jefferson
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 5; -- Lakeland
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/nvr-old-tappan.png', header_background = NULL  WHERE id = 6; -- Old Tappan
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/phillipsburg.png', header_background = NULL  WHERE id = 7; -- Phillipsburg
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/river-dell.png', header_background = NULL  WHERE id = 8; -- River Dell
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 9; -- Waldwick
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/westwood.png', header_background = '#000000'  WHERE id = 10; -- Westwood
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 11; -- Don Bosco Prep
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 12; -- Glen Rock
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 13; -- Indian Hills
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/mahwah.png', header_background = NULL  WHERE id = 14; -- Mahwah
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/pascack-hills.png', header_background = NULL  WHERE id = 15; -- Pascack Hills
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/pascack-valley.png', header_background = NULL  WHERE id = 16; -- Pascack Valley
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ramapo.png', header_background = NULL  WHERE id = 17; -- Ramapo
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ramsey.png', header_background = NULL  WHERE id = 18; -- Ramsey
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ridgewood.png', header_background = NULL  WHERE id = 19; -- Ridgewood
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 20; -- Saddle River Day
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 21; -- Bergen Catholic
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 22; -- Depaul Catholic
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 24; -- Newton
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 25; -- North Warren
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 26; -- Sparta
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/vernon-township.png', header_background = NULL  WHERE id = 27; -- Vernon
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/wallkill-valley.png', header_background = NULL  WHERE id = 28; -- Wallkill Valley
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 29; -- West Milford
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 30; -- Butler
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 31; -- Hawthorne
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 32; -- High Point
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 33; -- Kinnelon
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 34; -- New Milford
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 35; -- Northern Highlands
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 36; -- Pequannock
-- UPDATE schools SET logo_url = NULL, header_background = '#CC0022'  WHERE id = 37; -- Pompton Lakes
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/wayne-hills.png', header_background = NULL  WHERE id = 38; -- Wayne Hills
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 39; -- West Essex
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 40; -- Bergenfield
-- UPDATE schools SET logo_url = NULL, header_background = '#8F0018'  WHERE id = 41; -- Dwight Morrow
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 42; -- Fort Lee
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 43; -- Hackensack
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 44; -- Leonia
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/manchester-regional.png', header_background = '#CC0022'  WHERE id = 45; -- Manchester Regional
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 46; -- Passaic Valley
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 48; -- Teaneck
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 49; -- Tenafly
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/clifton.png', header_background = NULL  WHERE id = 50; -- Clifton
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 51; -- Elmwood Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/fairlawn.png', header_background = NULL  WHERE id = 52; -- Fair Lawn
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/garfield.png', header_background = '#000000'  WHERE id = 53; -- Garfield
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 54; -- Hasbrouck Heights
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 55; -- Lodi
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/mount-olive.png', header_background = NULL  WHERE id = 56; -- Mt. Olive
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/paramus.png', header_background = NULL  WHERE id = 57; -- Paramus
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/passaic.png', header_background = NULL  WHERE id = 58; -- Passaic
-- UPDATE schools SET logo_url = NULL, header_background = '#006400'  WHERE id = 59; -- Saddle Brook
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cedar-grove.png', header_background = NULL  WHERE id = 60; -- Cedar Grove
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/dover.png', header_background = NULL  WHERE id = 61; -- Dover
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 62; -- Lenape Valley
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 63; -- Mountain Lakes
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 64; -- Parsippany
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 66; -- Roxbury
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/warren-hills.png', header_background = '#808080'  WHERE id = 67; -- Warren Hills
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/wayne-valley.png', header_background = NULL  WHERE id = 68; -- Wayne Valley
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/boonton.png', header_background = '#CC0022'  WHERE id = 70; -- Boonton
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 71; -- College Achieve Paterson
-- UPDATE schools SET logo_url = NULL, header_background = '#CC4E10'  WHERE id = 72; -- Paterson Eastside
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/immaculata.png', header_background = NULL  WHERE id = 73; -- Immaculata
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 74; -- John F. Kennedy
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 75; -- Montville
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/morris-hills.png', header_background = NULL  WHERE id = 76; -- Morris Hills
-- UPDATE schools SET logo_url = NULL, header_background = '#FFD700'  WHERE id = 77; -- Morris Knolls
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 78; -- Parsippany Hills
-- UPDATE schools SET logo_url = NULL, header_background = '#FFD700'  WHERE id = 79; -- Pioneer Academy
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 80; -- Barringer
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/bloomfield.png', header_background = NULL  WHERE id = 81; -- Bloomfield
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/delbarton.png', header_background = NULL  WHERE id = 82; -- Delbarton School
-- UPDATE schools SET logo_url = NULL, header_background = '#C8880A'  WHERE id = 83; -- Lyndhurst
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/madison.png', header_background = '#8F0018'  WHERE id = 84; -- Madison
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 85; -- Newark Collegiate
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 86; -- Orange
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 87; -- Randolph
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 88; -- St. Mary High School (Rutherford)
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 89; -- Mendham
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 91; -- Caldwell
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 93; -- Cranford
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 94; -- Hoboken High School
-- UPDATE schools SET logo_url = NULL, header_background = '#C8880A'  WHERE id = 95; -- North Bergen
-- UPDATE schools SET logo_url = NULL, header_background = '#004679'  WHERE id = 96; -- Rutherford
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 97; -- Secaucus
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/union-city.png', header_background = '#C0C0C0'  WHERE id = 98; -- Union City
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 99; -- Weehawken High School
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/belleville.png', header_background = NULL  WHERE id = 100; -- Belleville
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 101; -- Glen Ridge
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 102; -- Governor Livingston
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/kearny.png', header_background = '#FFFFFF'  WHERE id = 103; -- Kearny
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 104; -- Livingston
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/montclair.png', header_background = NULL  WHERE id = 105; -- Montclair
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/nutley.png', header_background = NULL  WHERE id = 106; -- Nutley
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 107; -- Verona
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 108; -- West Morris
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/west-orange.png', header_background = NULL  WHERE id = 109; -- West Orange
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/belvidere.png', header_background = NULL  WHERE id = 110; -- Belvidere
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 111; -- East Orange
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 112; -- Hackettstown
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hanover-park.png', header_background = NULL  WHERE id = 113; -- Hanover Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/morristown.png', header_background = NULL  WHERE id = 114; -- Morristown
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 115; -- Newark Academy
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 116; -- North Star Academy
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/pope-john-xxiii.png', header_background = NULL  WHERE id = 117; -- Pope John XXIII
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 118; -- St. Benedicts Prep School
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 119; -- Whippany Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/bayonne.png', header_background = NULL  WHERE id = 120; -- Bayonne
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/columbia.png', header_background = '#000000'  WHERE id = 121; -- Columbia
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 122; -- Newark East Side
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/elizabeth.png', header_background = NULL  WHERE id = 123; -- Elizabeth
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 124; -- Hillside High School
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/roselle-park.png', header_background = NULL  WHERE id = 125; -- Roselle Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/scotch-plains.png', header_background = NULL  WHERE id = 126; -- Scotch Plains-Fanwood
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 127; -- Seton Hall Prep
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/westfield.png', header_background = '#0504C3'  WHERE id = 128; -- Westfield
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 129; -- Johnson
-- UPDATE schools SET logo_url = NULL, header_background = '#CC0022'  WHERE id = 130; -- Brearley
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/bridgewater-raritan.png', header_background = '#000000'  WHERE id = 131; -- Bridgewater-Raritan
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/irvington.png', header_background = NULL  WHERE id = 132; -- Irvington
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 133; -- Millburn
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 134; -- New Providence
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/northhunterdon.png', header_background = NULL  WHERE id = 135; -- North Hunterdon
-- UPDATE schools SET logo_url = NULL, header_background = '#6F777B'  WHERE id = 136; -- South Hunterdon
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/union.png', header_background = '#8F0018'  WHERE id = 138; -- Union
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/bernards.png', header_background = NULL  WHERE id = 139; -- Bernards
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 141; -- Delaware Valley
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/north-plainfield.png', header_background = '#FFFFFF'  WHERE id = 143; -- North Plainfield
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 144; -- Pingry
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/sommerville.png', header_background = NULL  WHERE id = 145; -- Somerville
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 146; -- Voorhees
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/watchung.png', header_background = NULL  WHERE id = 147; -- Watchung Hills
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/carteret.png', header_background = NULL  WHERE id = 148; -- Carteret
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 149; -- Colonia
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 150; -- Iselin Kennedy
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/john-p-stevens.png', header_background = NULL  WHERE id = 151; -- John P. Stevens
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/linden.png', header_background = NULL  WHERE id = 152; -- Linden
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/paramus-catholic.png', header_background = NULL  WHERE id = 153; -- Paramus Catholic
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/plainsfield.png', header_background = '#034CB2'  WHERE id = 154; -- Plainfield
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/rahway.png', header_background = NULL  WHERE id = 155; -- Rahway
-- UPDATE schools SET logo_url = NULL, header_background = '#00824B'  WHERE id = 156; -- Ridge
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/south-plainfield.png', header_background = NULL  WHERE id = 157; -- South Plainfield
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/east-brunswick.png', header_background = '#00824B'  WHERE id = 158; -- East Brunswick
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/middletown-north.png', header_background = NULL  WHERE id = 159; -- Middletown North
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/middletown-south.png', header_background = '#034CB2'  WHERE id = 160; -- Middletown South
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/north-brunswick.png', header_background = '#C8880A'  WHERE id = 162; -- North Brunswick
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/old-bridge.png', header_background = NULL  WHERE id = 163; -- Old Bridge
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 164; -- South Brunswick
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 165; -- South River
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 166; -- Spotswood
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 167; -- St. Peter's Prep
-- UPDATE schools SET logo_url = NULL, header_background = '#1a1a2e'  WHERE id = 168; -- Central Jersey College Prep
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 169; -- Franklin
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hopewell-valley.png', header_background = '#FAD703'  WHERE id = 170; -- Hopewell Valley
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/manville.png', header_background = NULL  WHERE id = 171; -- Manville
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/monroe-township.png', header_background = '#C8880A'  WHERE id = 172; -- Monroe
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/montgomery.png', header_background = '#00824B'  WHERE id = 173; -- Montgomery
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/princeton.png', header_background = NULL  WHERE id = 174; -- Princeton
-- UPDATE schools SET logo_url = NULL, header_background = '#5C3068'  WHERE id = 175; -- Rumson-Fair Haven
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 176; -- West Windsor-Plainsboro North
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/west-windsor-plainsboro-south.png', header_background = NULL  WHERE id = 177; -- West Windsor-Plainsboro South
-- UPDATE schools SET logo_url = NULL, header_background = '#C8880A'  WHERE id = 178; -- Edison
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 179; -- Highland Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/metuchen.png', header_background = '#000000'  WHERE id = 180; -- Metuchen
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/new-brunswick.png', header_background = NULL  WHERE id = 181; -- New Brunswick
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/perth-amboy.png', header_background = NULL  WHERE id = 182; -- Perth Amboy
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/piscataway.png', header_background = NULL  WHERE id = 183; -- Piscataway
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/raritan.png', header_background = NULL  WHERE id = 184; -- Raritan
-- UPDATE schools SET logo_url = NULL, header_background = '#454444'  WHERE id = 185; -- Sayreville War Memorial
-- UPDATE schools SET logo_url = NULL, header_background = '#008000'  WHERE id = 186; -- St. Joseph Metuchen
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/woodbridge.png', header_background = '#FFFFFF'  WHERE id = 187; -- Woodbridge
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hillsborough.png', header_background = NULL  WHERE id = 188; -- Hillsborough
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/holmdel.png', header_background = '#454444'  WHERE id = 189; -- Holmdel
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hunterdon-central.png', header_background = '#222222'  WHERE id = 190; -- Hunterdon Central
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 191; -- Keansburg
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/marlboro.png', header_background = NULL  WHERE id = 193; -- Marlboro
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 195; -- Red Bank Regional
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 196; -- Rutgers Prep
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cba.png', header_background = NULL  WHERE id = 197; -- Christian Brothers
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/colts-neck.png', header_background = '#FFFFFF'  WHERE id = 198; -- Colts Neck
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/freehold.png', header_background = NULL  WHERE id = 199; -- Freehold Borough
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/freehold-township.png', header_background = NULL  WHERE id = 200; -- Freehold Township
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 201; -- Holy Cross
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lakewood.png', header_background = NULL  WHERE id = 203; -- Lakewood
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/manalapan.png', header_background = NULL  WHERE id = 204; -- Manalapan
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 205; -- New Egypt
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 206; -- Ranney
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/brick-memorial.png', header_background = NULL  WHERE id = 207; -- Brick Memorial
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/steinert.png', header_background = NULL  WHERE id = 208; -- Steinert
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 209; -- Nottingham
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lawrence.png', header_background = '#000000'  WHERE id = 210; -- Lawrence
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/long-branch.png', header_background = NULL  WHERE id = 211; -- Long Branch
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/notre-dame.png', header_background = '#4169E1'  WHERE id = 213; -- Notre Dame
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 214; -- Riverside
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/robbinsville.png', header_background = NULL  WHERE id = 215; -- Robbinsville
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/trenton-central.png', header_background = NULL  WHERE id = 216; -- Trenton
-- UPDATE schools SET logo_url = NULL, header_background = '#92CCFE'  WHERE id = 217; -- Asbury Park
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/brick-township.png', header_background = '#00824B'  WHERE id = 218; -- Brick Township
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 219; -- Jackson Liberty
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/manasquan.png', header_background = NULL  WHERE id = 220; -- Manasquan
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 221; -- Neptune
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ocean-township.png', header_background = NULL  WHERE id = 222; -- Ocean Township
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/point-pleasant-beach.png', header_background = '#FFFFFF'  WHERE id = 223; -- Point Pleasant Beach
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/point-pleasant-boro.png', header_background = NULL  WHERE id = 224; -- Point Pleasant Boro
-- UPDATE schools SET logo_url = NULL, header_background = '#1B5997'  WHERE id = 225; -- Shore
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 226; -- Allentown
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 227; -- Bordentown Regional/Florence
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 228; -- Burlington City
-- UPDATE schools SET logo_url = NULL, header_background = '#C8880A'  WHERE id = 229; -- Burlington Township
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ewing.png', header_background = '#034CB2'  WHERE id = 230; -- Ewing
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hamilton-west.png', header_background = NULL  WHERE id = 231; -- Hamilton West
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hightstown.png', header_background = NULL  WHERE id = 232; -- Hightstown
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/howell.png', header_background = NULL  WHERE id = 233; -- Howell
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/saint-thomas-aquinas.png', header_background = NULL  WHERE id = 234; -- Saint Thomas Aquinas
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/wall.png', header_background = NULL  WHERE id = 235; -- Wall
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/audubon.png', header_background = NULL  WHERE id = 236; -- Audubon
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 237; -- Camden
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/collingswood.png?v=2', header_background = NULL  WHERE id = 238; -- Collingswood
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/haddon-heights.png', header_background = '#CC0022'  WHERE id = 239; -- Haddon Heights
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/haddon-township.png', header_background = NULL  WHERE id = 240; -- Haddon Township
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 241; -- Paul VI
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/pennsauken.png', header_background = NULL  WHERE id = 242; -- Pennsauken
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 243; -- Saint John Vianney
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/sterling.png', header_background = NULL  WHERE id = 244; -- Sterling
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/west-deptford.png', header_background = '#00824B'  WHERE id = 245; -- West Deptford
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 246; -- Barnegat
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/central-regional.png', header_background = '#C8880A'  WHERE id = 247; -- Central Regional
-- UPDATE schools SET logo_url = NULL, header_background = '#003087'  WHERE id = 248; -- Donovan Catholic
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lacey-township.png', header_background = NULL  WHERE id = 249; -- Lacey
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/manchester-township.png', header_background = NULL  WHERE id = 250; -- Manchester Township
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 251; -- Pinelands Regional
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/southern-regional.png', header_background = NULL  WHERE id = 252; -- Southern Regional
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/toms-river-east.png', header_background = NULL  WHERE id = 253; -- Toms River East
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 254; -- Toms River North
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 255; -- Toms River South
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/westampton-tech.png', header_background = NULL  WHERE id = 256; -- Westampton Tech
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cinnaminson.png', header_background = NULL  WHERE id = 257; -- Cinnaminson
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/delran.png', header_background = '#503604'  WHERE id = 258; -- Delran
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/gloucester-city.png', header_background = NULL  WHERE id = 259; -- Gloucester City JR/SR
-- UPDATE schools SET logo_url = NULL, header_background = '#CC0022'  WHERE id = 260; -- Kingsway
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/moorestown.png', header_background = NULL  WHERE id = 261; -- Moorestown
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 262; -- Palmyra
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/rancocas-valley.png', header_background = '#DD1931'  WHERE id = 263; -- Rancocas Valley
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 264; -- Red Bank Catholic
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 265; -- Willingboro
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cherokee.png', header_background = NULL  WHERE id = 266; -- Cherokee
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cherry-hill-east.png', header_background = '#FFFFFF'  WHERE id = 267; -- Cherry Hill East
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cherry-hill-west.png', header_background = NULL  WHERE id = 268; -- Cherry Hill West
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 269; -- Gloucester Catholic
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 270; -- Haddonfield
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lenape.png', header_background = NULL  WHERE id = 271; -- Lenape
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/maple-shade.png', header_background = NULL  WHERE id = 272; -- Maple Shade
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/pemberton.png', header_background = NULL  WHERE id = 273; -- Pemberton
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/seneca.png', header_background = '#C8880A'  WHERE id = 274; -- Seneca
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/shawnee.png', header_background = NULL  WHERE id = 275; -- Shawnee
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/absegami.png', header_background = NULL  WHERE id = 276; -- Absegami
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 277; -- Atlantic City
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/camden-catholic.png', header_background = '#00824B'  WHERE id = 278; -- Camden Catholic
-- UPDATE schools SET logo_url = NULL, header_background = '#000000'  WHERE id = 279; -- Egg Harbor
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 280; -- Holy Spirit
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lower-cape-may.png', header_background = '#174259'  WHERE id = 281; -- Lower Cape May
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 282; -- Mainland
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/middle-township.png', header_background = NULL  WHERE id = 283; -- Middle Township
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 284; -- Oakcrest
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/ocean-city.png', header_background = NULL  WHERE id = 285; -- Ocean City
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/schalick.png', header_background = '#195821'  WHERE id = 286; -- Schalick
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 287; -- Buena
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/cedar-creek.png', header_background = NULL  WHERE id = 288; -- Cedar Creek
-- UPDATE schools SET logo_url = NULL, header_background = '#DB5B2A'  WHERE id = 289; -- Cumberland
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/delsea.png', header_background = '#FFFFFF'  WHERE id = 290; -- Delsea
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 291; -- Gateway Reg/ Woodbury
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 292; -- Millville
-- UPDATE schools SET logo_url = NULL, header_background = '#263586'  WHERE id = 293; -- Pennsville
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 294; -- Vineland
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 295; -- Woodstown
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/eastern.png', header_background = NULL  WHERE id = 296; -- Eastern
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/hammonton.png', header_background = '#034CB2'  WHERE id = 297; -- Hammonton
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 299; -- Overbrook
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 301; -- Timber Creek
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/washington-township.png', header_background = NULL  WHERE id = 302; -- Washington Township
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/williamstown.png', header_background = NULL  WHERE id = 303; -- Williamstown
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/winslow-township.png', header_background = '#00824B'  WHERE id = 304; -- Winslow
-- UPDATE schools SET logo_url = NULL, header_background = '#ECDF43'  WHERE id = 305; -- Clayton
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 306; -- Clearview
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/deptford.png', header_background = NULL  WHERE id = 307; -- Deptford
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/lindenwold.png', header_background = NULL  WHERE id = 308; -- Lindenwold
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/paulsboro.png', header_background = NULL  WHERE id = 309; -- Paulsboro
-- UPDATE schools SET logo_url = NULL, header_background = '#CC0022'  WHERE id = 310; -- Penns Grove
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 311; -- Pitman
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 312; -- Salem
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 313; -- St. Augustine
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 314; -- Demarest
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 315; -- Kittatinny
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 321; -- Becton
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/bound-brook.png', header_background = '#BB271A'  WHERE id = 322; -- Bound Brook
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 356; -- St. Joseph's (Hammonton)
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 357; -- Ridgefield Memorial
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 358; -- Roselle
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 359; -- Bergen Charter
-- UPDATE schools SET logo_url = NULL, header_background = '#034CB2'  WHERE id = 360; -- Buena Regional/Vineland
-- UPDATE schools SET logo_url = NULL, header_background = '#754ACC'  WHERE id = 363; -- Cherry Hill East/Cherry Hill West
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 364; -- Cliffside Park
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 365; -- Cliffside Park/Ridgefield Memorial
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/highland.png', header_background = NULL  WHERE id = 369; -- Highland
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 370; -- Jackson Township
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 372; -- Jefferson-Sparta
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 374; -- Keyport
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 379; -- Lodi/Saddle Brook
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 381; -- Mary Help of Christians Academy
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/matawan.png', header_background = NULL  WHERE id = 382; -- Matawan
-- UPDATE schools SET logo_url = NULL, header_background = '#0000FF'  WHERE id = 383; -- Middlesex
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 384; -- Monmouth
-- UPDATE schools SET logo_url = NULL, header_background = '#CC0022'  WHERE id = 385; -- Morris Hills-Morris Knolls
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/northern-burlington.png', header_background = '#454444'  WHERE id = 388; -- Northern Burlington
-- UPDATE schools SET logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/passaic-co-tech-voc.png', header_background = '#034CB2'  WHERE id = 391; -- Passaic Tech
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 392; -- Ramsey/Northern Highlands
-- UPDATE schools SET logo_url = NULL, header_background = '#FFFFFF'  WHERE id = 393; -- Ridgefield Park/Bogota
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 394; -- St Joseph (Montvale) HS
-- UPDATE schools SET logo_url = NULL, header_background = NULL  WHERE id = 397; -- Summit
-- COMMIT;

COMMIT;

-- Forward:  325 schools
-- Skipped:  0 schools (upload failed)
