-- Add school metadata columns to wrestler_hammer_scores so the admin
-- hammer scores dashboard can filter by conference, section, group,
-- district, and region without a join.
-- All columns are nullable and populated during recalculation.

ALTER TABLE wrestler_hammer_scores
  ADD COLUMN IF NOT EXISTS school_id      integer,
  ADD COLUMN IF NOT EXISTS conference     text,
  ADD COLUMN IF NOT EXISTS section        text,
  ADD COLUMN IF NOT EXISTS classification text,
  ADD COLUMN IF NOT EXISTS district       integer,
  ADD COLUMN IF NOT EXISTS region         integer;
