-- Fix 7 active boys programs incorrectly flagged as is_combined=true.
-- All 7 appear in the official 2025-26 NJSIAA Power Points RTF with records and PP values,
-- and each has 15-23 boys dual meets in the DB for season 2.
-- Applied 2026-08-06

UPDATE schools SET is_combined = false WHERE id IN (
  227, -- Bordentown Regional/Florence  (Central Group 3, 21 boys meets)
  9,   -- Waldwick                      (North I Group 1, 18 boys meets)
  44,  -- Leonia                        (North I Group 4, 16 boys meets)
  83,  -- Lyndhurst                     (North I Group 4, 15 boys meets)
  130, -- Brearley                      (North II Group 3, 19 boys meets)
  291, -- Gateway Reg/Woodbury          (South Group 3, 21 boys meets)
  305  -- Clayton                       (South Group 3, 23 boys meets)
);

-- ROLLBACK:
-- UPDATE schools SET is_combined = true WHERE id IN (227, 9, 44, 83, 130, 291, 305);
