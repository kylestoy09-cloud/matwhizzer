-- Fix Powerade tournament start_date: was incorrectly set to 2024-12-29 (wrong year)
-- Tournament runs 2025-12-29 through 2025-12-31

UPDATE in_season_tournaments
SET start_date = '2025-12-29'
WHERE id = '930fc38c-966e-43b7-928b-66328ae2513b'
  AND name = 'Powerade';
