-- Duplicate dual meet: Collingswood vs Gateway Reg/Woodbury on 2025-12-17 was
-- imported twice. Both rows have identical scores (54-12) and 14 match records.
-- Keep 15b3d1c7 (has raw school/wrestler names). Delete 13efc311 (null raw names).

DELETE FROM dual_meet_matches
WHERE dual_meet_id = '13efc311-cc2b-4621-b6dd-2a7a924863ff';

DELETE FROM dual_meets
WHERE id = '13efc311-cc2b-4621-b6dd-2a7a924863ff';
