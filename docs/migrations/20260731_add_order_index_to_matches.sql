-- Add order_index to dual_meet_matches so weight-by-weight results display in the
-- original import order (the order matches appeared in the source document) rather
-- than always ascending by weight class.
--
-- Existing rows are backfilled using ascending weight_class within each meet, which
-- matches the old display behavior. New imports set order_index from the parser's
-- match position (0-based).

ALTER TABLE dual_meet_matches ADD COLUMN order_index integer;

-- Backfill existing rows: 0-based rank within each meet ordered by weight_class
WITH ranked AS (
  SELECT id,
         (ROW_NUMBER() OVER (PARTITION BY dual_meet_id ORDER BY weight_class) - 1) AS rn
  FROM dual_meet_matches
)
UPDATE dual_meet_matches dmm
SET order_index = ranked.rn
FROM ranked
WHERE dmm.id = ranked.id;
