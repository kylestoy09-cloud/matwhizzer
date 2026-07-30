-- Drop school_names table.
--
-- This table stored abbreviation → display_name mappings used during the early
-- import pipeline before tournament_entries.school_id was reliably populated.
-- All downstream code has been migrated to use schools.id / schools.display_name
-- directly. No application code references this table as of 2026-07-30.
--
-- Verified zero references in src/ before dropping.

DROP TABLE IF EXISTS school_names;
