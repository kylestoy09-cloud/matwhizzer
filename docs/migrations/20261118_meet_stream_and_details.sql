-- docs/migrations/20261118_meet_stream_and_details.sql
--
-- Editing a meet (Kyle 2026-11-18): an admin "Edit meet" panel on the meet page and the Match Card can change a dual's
-- date, time, stream link, premier label (and, before any bouts are in, which team is home). Two new fields per dual:
--   stream_url     the meet's own stream. Shown as "Stream"; without it the match card falls back to the home
--                  program's link (boys_/girls_streaming_links) as "Possible Stream".
--   premier_label  set = a premier dual, shown in its header ("Premier Dual" or the text given); empty = not one.
-- In-season tournaments (the tournament pages: in_season_tournaments / _girls) get a stream_url too — a quiet field
-- Kyle fills when he finds one; nothing shows on the page until it's set.
-- Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE dual_meets       ADD COLUMN IF NOT EXISTS stream_url    text;
ALTER TABLE dual_meets       ADD COLUMN IF NOT EXISTS premier_label text;
ALTER TABLE dual_meets_girls ADD COLUMN IF NOT EXISTS stream_url    text;
ALTER TABLE dual_meets_girls ADD COLUMN IF NOT EXISTS premier_label text;
ALTER TABLE in_season_tournaments       ADD COLUMN IF NOT EXISTS stream_url text;
ALTER TABLE in_season_tournaments_girls ADD COLUMN IF NOT EXISTS stream_url text;

COMMIT;

-- Verify: six columns, all empty
SELECT (SELECT count(stream_url) FROM dual_meets) AS boys_streams, (SELECT count(premier_label) FROM dual_meets) AS boys_premier,
       (SELECT count(stream_url) FROM dual_meets_girls) AS girls_streams, (SELECT count(premier_label) FROM dual_meets_girls) AS girls_premier,
       (SELECT count(stream_url) FROM in_season_tournaments) AS boys_tournament_streams,
       (SELECT count(stream_url) FROM in_season_tournaments_girls) AS girls_tournament_streams;

-- ROLLBACK:
--   ALTER TABLE dual_meets DROP COLUMN stream_url, DROP COLUMN premier_label;
--   ALTER TABLE dual_meets_girls DROP COLUMN stream_url, DROP COLUMN premier_label;
--   ALTER TABLE in_season_tournaments DROP COLUMN stream_url; ALTER TABLE in_season_tournaments_girls DROP COLUMN stream_url;
