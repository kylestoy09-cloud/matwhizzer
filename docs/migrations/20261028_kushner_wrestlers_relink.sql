-- docs/migrations/20261028_kushner_wrestlers_relink.sql
--
-- Boys 2025-26. Scotch Plains-Fanwood vs Kushner Academy (2025-12-10,
-- dual_meets 9a25d510): 9 bouts pointed at Kushner wrestlers whose records
-- had been deleted (initials-only records: "J Lankry", "B Strub", ...); found
-- when the hammer log's opponent FK rejected them. Kushner's 2026-01-08 dual
-- (Rutgers Prep) has full-name wrestlers; matched by initial, surname and weight:
--   J Lankry  106 → Jordan Lankary 106     B Strub   120 → Brian Straw 120
--   M Sher    126 → Matanel Sher   132     J Rojas   150 → Josh Rojas  144
--   A Yarkony 157 → Aidan Urcony   150
-- Re-points those 5 bouts (and their wrestler_name_aliases rows) to the
-- existing wrestlers. Recreates the other 4 under their original ids:
-- O Lazanowitz, J Sperber, E Kestler, S Weill (boys, OOS like the rest of 748).
--
-- APPLIED 2026-10-28 with scripts/apply_kushner_wrestlers_relink.mts (service
-- role). Backup: docs/migrations/backups/20261028_kushner_wrestlers_relink.json
--
-- Verify: expect 0 rows (every wrestler id in the meet exists)
SELECT b.id FROM dual_meet_matches b
LEFT JOIN wrestlers wa ON wa.id = b.wrestler_a_id
LEFT JOIN wrestlers wb ON wb.id = b.wrestler_b_id
WHERE b.dual_meet_id = '9a25d510-74cf-48dd-9556-1c09d2e40dbc'
  AND ((b.wrestler_a_id IS NOT NULL AND wa.id IS NULL) OR (b.wrestler_b_id IS NOT NULL AND wb.id IS NULL));
-- ROLLBACK: restore dual_meet_matches / wrestler_name_aliases rows from the
-- backup; DELETE FROM wrestlers WHERE id IN ('7d0c6170-363c-4bb2-b616-83800df63f1d',
-- '0b7a3edc-3218-47a7-9a5a-9c8abae45800','bb24f137-e0b0-463a-afed-1b3e4ef94d32','4a084088-51e3-45e9-9939-693649cb8071');
