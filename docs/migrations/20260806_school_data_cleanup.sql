-- School data cleanup: fix is_combined flags and add missing section/classification
-- Applied 2026-08-06

-- =========================================================
-- 1. SET is_combined = true (exclude from boys listings)
--    These schools either have no boys program or are
--    inactive standalone schools subsumed by a co-op record.
-- =========================================================

-- Lodi (id=55): standalone school, no boys meets; program runs as Lodi/Saddle Brook (id=379)
UPDATE schools SET is_combined = true WHERE id = 55;

-- Saddle Brook (id=59): no boys meets; part of Lodi/Saddle Brook co-op (id=379)
UPDATE schools SET is_combined = true WHERE id = 59;

-- Cherry Hill East/Cherry Hill West (id=363): girls co-op, no boys team
UPDATE schools SET is_combined = true WHERE id = 363;

-- Cliffside Park/Ridgefield Memorial (id=365): co-op record with no boys meets;
-- both standalone schools (Cliffside Park id=364, Ridgefield Memorial id=357) are active
UPDATE schools SET is_combined = true WHERE id = 365;

-- Jefferson-Sparta (id=372): girls co-op, no boys team
UPDATE schools SET is_combined = true WHERE id = 372;

-- Mary Help of Christians Academy (id=381): all-girls school, no boys team
UPDATE schools SET is_combined = true WHERE id = 381;

-- Morris Hills-Morris Knolls (id=385): girls co-op, no boys team
UPDATE schools SET is_combined = true WHERE id = 385;

-- Ramsey/Northern Highlands (id=392): girls co-op, no boys team
UPDATE schools SET is_combined = true WHERE id = 392;

-- Ranney (id=206): no boys wrestling team
UPDATE schools SET is_combined = true WHERE id = 206;

-- =========================================================
-- 2. SET is_combined = false (active boys programs incorrectly
--    flagged as combined)
-- =========================================================

-- Kittatinny (id=315): solo boys program (19 boys meets); combined only for girls
-- (girls program is Newton/Kittatinny co-op)
UPDATE schools SET is_combined = false WHERE id = 315;

-- Becton (id=321): boys co-op (Becton-Woodridge), 15 boys meets
UPDATE schools SET is_combined = false WHERE id = 321;

-- =========================================================
-- 3. SET section + classification for schools missing them
-- =========================================================

-- Boys co-ops with meet data
UPDATE schools SET section = 'North I',    classification = '1' WHERE id = 315; -- Kittatinny
UPDATE schools SET section = 'North I',    classification = '3' WHERE id = 321; -- Becton (Becton-Woodridge co-op)
UPDATE schools SET section = 'North II',   classification = '4' WHERE id = 379; -- Lodi/Saddle Brook
UPDATE schools SET section = 'North II',   classification = '2' WHERE id = 393; -- Ridgefield Park/Bogota (listed as "Ridgefield" in NJSIAA docs)

-- Standalone public schools
UPDATE schools SET section = 'North I',    classification = '1' WHERE id = 359; -- Bergen Charter
UPDATE schools SET section = 'Central',    classification = '1' WHERE id = 168; -- Central Jersey College Prep
UPDATE schools SET section = 'North I',    classification = '1' WHERE id = 71;  -- College Achieve Paterson
UPDATE schools SET section = 'Central',    classification = '3' WHERE id = 219; -- Jackson Liberty
UPDATE schools SET section = 'North II',   classification = '2' WHERE id = 85;  -- Newark Collegiate
UPDATE schools SET section = 'North II',   classification = '4' WHERE id = 116; -- North Star Academy
UPDATE schools SET section = 'North II',   classification = '1' WHERE id = 99;  -- Weehawken

-- Non-Public schools
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE id = 248; -- Donovan Catholic
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE id = 79;  -- Pioneer Academy
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE id = 20;  -- Saddle River Day
UPDATE schools SET section = 'Non-Public', classification = 'B' WHERE id = 356; -- St. Joseph's (Hammonton)

-- ROLLBACK (reverse order):
-- UPDATE schools SET section = null, classification = null WHERE id IN (248, 79, 20, 356, 99, 116, 85, 219, 71, 168, 359, 393, 379, 321, 315);
-- UPDATE schools SET is_combined = true  WHERE id IN (315, 321);
-- UPDATE schools SET is_combined = false WHERE id IN (55, 59, 206, 363, 365, 372, 381, 385, 392);
