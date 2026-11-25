-- docs/migrations/20261119_streaming_two_links_microcheck_reset.sql
--
-- Kyle 2026-11-19: "schools have both nfhs and hudl so i grabbed both … we will create a new micro check where we
-- manually look at both links and pick which we think is their home account … NFHS, Hudl, Both or Neither … all micro
-- checks should be able to be reset and rechecked since things like coaches and ads change year to year."
--
--   {boys,girls}_streaming_links
--     hudl_url, nfhs_url   the program's Hudl and NFHS Network pages (the old single `url` stays for history, unused)
--     choice               the microcheck's pick: 'hudl' | 'nfhs' | 'both' | 'neither' — NULL = not checked yet
--                          (the site shows both links until a pick; 'neither' shows none)
--     choice_at, choice_by when and who
--   microcheck_task_types.reset_at   a check's reset: answers before it no longer count, so every school is asked
--                                    again (with what's on file shown to confirm or change)
--   microcheck_task_types: Stream Account (Boys) / (Girls) — field 'stream_choice', after the other checks, on
--
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE boys_streaming_links  ALTER COLUMN url DROP NOT NULL;
ALTER TABLE girls_streaming_links ALTER COLUMN url DROP NOT NULL;
ALTER TABLE boys_streaming_links
  ADD COLUMN IF NOT EXISTS hudl_url  text,
  ADD COLUMN IF NOT EXISTS nfhs_url  text,
  ADD COLUMN IF NOT EXISTS choice    text CHECK (choice IN ('hudl', 'nfhs', 'both', 'neither')),
  ADD COLUMN IF NOT EXISTS choice_at timestamptz,
  ADD COLUMN IF NOT EXISTS choice_by text;
ALTER TABLE girls_streaming_links
  ADD COLUMN IF NOT EXISTS hudl_url  text,
  ADD COLUMN IF NOT EXISTS nfhs_url  text,
  ADD COLUMN IF NOT EXISTS choice    text CHECK (choice IN ('hudl', 'nfhs', 'both', 'neither')),
  ADD COLUMN IF NOT EXISTS choice_at timestamptz,
  ADD COLUMN IF NOT EXISTS choice_by text;

ALTER TABLE microcheck_task_types ADD COLUMN IF NOT EXISTS reset_at timestamptz;

INSERT INTO microcheck_task_types (key, label, gender, source, field, sort_order, enabled)
VALUES ('stream_choice_m', 'Stream Account', 'M', 'school_field', 'stream_choice', (SELECT coalesce(max(sort_order), 0) + 1 FROM microcheck_task_types), true),
       ('stream_choice_f', 'Stream Account', 'F', 'school_field', 'stream_choice', (SELECT coalesce(max(sort_order), 0) + 2 FROM microcheck_task_types), true)
ON CONFLICT (key) DO NOTHING;

-- College spot check (Kyle 2026-11-19: "confirm college matches randomly"): a queue per side of the careers the importer
-- matched by itself (src/lib/ncaa/spotCheck.ts); resettable like the school checks
INSERT INTO microcheck_task_types (key, label, gender, source, queue_type, sort_order, enabled)
VALUES ('boys_college_spot',  'College spot check', 'M', 'queue', 'college_spot', (SELECT coalesce(max(sort_order), 0) + 1 FROM microcheck_task_types), true),
       ('girls_college_spot', 'College spot check', 'F', 'queue', 'college_spot', (SELECT coalesce(max(sort_order), 0) + 2 FROM microcheck_task_types), true)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- Verify: the new columns exist (all NULL until the load) and the two checks are in the Task Order list
SELECT (SELECT count(*) FROM boys_streaming_links WHERE hudl_url IS NOT NULL OR nfhs_url IS NOT NULL) AS boys_with_new_links,
       (SELECT count(*) FROM girls_streaming_links WHERE hudl_url IS NOT NULL OR nfhs_url IS NOT NULL) AS girls_with_new_links,
       (SELECT count(*) FROM microcheck_task_types WHERE field = 'stream_choice') AS stream_checks,
       (SELECT count(*) FROM microcheck_task_types WHERE queue_type = 'college_spot') AS spot_checks,
       (SELECT count(*) FROM microcheck_task_types WHERE reset_at IS NOT NULL) AS checks_reset;

-- ROLLBACK: DELETE FROM microcheck_task_types WHERE field = 'stream_choice' OR queue_type = 'college_spot';
--   ALTER TABLE microcheck_task_types DROP COLUMN reset_at;
--   ALTER TABLE boys_streaming_links  DROP COLUMN hudl_url, DROP COLUMN nfhs_url, DROP COLUMN choice, DROP COLUMN choice_at, DROP COLUMN choice_by;
--   ALTER TABLE girls_streaming_links DROP COLUMN hudl_url, DROP COLUMN nfhs_url, DROP COLUMN choice, DROP COLUMN choice_at, DROP COLUMN choice_by;
--   (url: SET NOT NULL only after every row has one)
