-- docs/migrations/20261117_history_profiles.sql
--
-- Profiles for every pre-2013 place winner (Kyle 2026-11-17: "give everyone a profile"). Each boys NJ Wrestling History
-- finish before our postseason records (State 1–8, Region titles) is tied to one wrestler: a new profile, or the one a
-- wrestler already has when his career runs into 2012-13 (Anthony Ashnault: 2010–12 here, 2013 in our brackets). With
-- every finish on a profile, the History tabs count multi-time champions by person (Ashnault = 4, not 3 + 1).
--   history_finishes.wrestler_id   the profile a finish belongs to
--   history_finishes.school_id     the school it was matched to when linked (src/lib/historySchools.ts), so a profile
--                                  doesn't rerun the matcher; the printed name stays in `school` ("Washington (Warren Hills)")
--   wrestlers.origin               'history' = created from these finishes (no bouts, never offered by imports, rosters
--                                  or transfer matching; findable and reversible as a set)
--   wrestlers.history_note         a line on the profile (Kyle: same name at another school, maybe the same wrestler)
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE history_finishes ADD COLUMN IF NOT EXISTS wrestler_id uuid REFERENCES wrestlers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS history_finishes_wrestler_idx ON history_finishes (wrestler_id);
ALTER TABLE history_finishes ADD COLUMN IF NOT EXISTS school_id integer REFERENCES schools(id);
ALTER TABLE wrestlers
  ADD COLUMN IF NOT EXISTS origin       text CHECK (origin IN ('history')),
  ADD COLUMN IF NOT EXISTS history_note text;

COMMIT;

-- Verify: nothing linked or created yet
SELECT (SELECT count(wrestler_id) FROM history_finishes) AS linked_finishes, (SELECT count(*) FROM wrestlers WHERE origin = 'history') AS history_profiles;

-- ROLLBACK (before profiles exist): ALTER TABLE history_finishes DROP COLUMN wrestler_id, DROP COLUMN school_id; ALTER TABLE wrestlers DROP COLUMN origin, DROP COLUMN history_note;
