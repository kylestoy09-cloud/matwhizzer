-- Backfill fall_time_seconds for TF matches where the time was stored
-- in result_detail (e.g. "17-2 3:07") but never extracted to fall_time_seconds.
-- Also strips the trailing time from result_detail so it holds score only.

UPDATE tournament_bouts
SET
  fall_time_seconds = (
    (regexp_match(result_detail, '(\d+):(\d{2})$'))[1]::int * 60 +
    (regexp_match(result_detail, '(\d+):(\d{2})$'))[2]::int
  ),
  result_detail = trim(regexp_replace(result_detail, '\s*\d+:\d{2}$', ''))
WHERE result_type ILIKE 'TF%'
  AND fall_time_seconds IS NULL
  AND result_detail ~ '\d+:\d{2}$';

UPDATE dual_meet_matches
SET
  fall_time_seconds = (
    (regexp_match(result_detail, '(\d+):(\d{2})$'))[1]::int * 60 +
    (regexp_match(result_detail, '(\d+):(\d{2})$'))[2]::int
  ),
  result_detail = trim(regexp_replace(result_detail, '\s*\d+:\d{2}$', ''))
WHERE result_type ILIKE 'TF%'
  AND fall_time_seconds IS NULL
  AND result_detail ~ '\d+:\d{2}$';
