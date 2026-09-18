-- docs/migrations/20260916_fix_mt_olive_parsippany_hills.sql
--
-- Revert display names for two schools incorrectly merged by the 20260826
-- migration. Mount Olive/Randolph and Parsippany Hills/Parsippany are two
-- separate boys programs each — not co-ops.

UPDATE schools SET display_name = 'Mount Olive'      WHERE id = 56;
UPDATE boys_schools SET display_name = 'Mount Olive',      is_combined = false WHERE school_id = 56;

UPDATE schools SET display_name = 'Parsippany Hills' WHERE id = 78;
UPDATE boys_schools SET display_name = 'Parsippany Hills', is_combined = false WHERE school_id = 78;
