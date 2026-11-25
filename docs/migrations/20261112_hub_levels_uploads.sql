-- docs/migrations/20261112_hub_levels_uploads.sql
--
-- Tournament hubs review (Kyle 2026-11-12):
--   * Each tournament has a level — national, regional or state — and a champion rating for rating
--     out-of-state wrestlers ("let's go 90, 75, 50": a national champion 90, regional 75, state 50).
--     The rating starts from the level and can be changed per tournament.
--   * Each event keeps a record of its upload: when, which files, and per division its style, weights,
--     places and how deep it was placed — so the list shows a tournament was uploaded for the season.
--   * A prospect keeps the club as the results list it (club_listed), so clubs show even before the
--     club is on the club list (club_id stays the link to wrestling_clubs).
-- Same columns on the boys_, girls_ and mixed_ tables. Run in the Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls', 'mixed'] LOOP
    EXECUTE format($f$
      ALTER TABLE %1$s_hub_tournaments ADD COLUMN IF NOT EXISTS level text;
      ALTER TABLE %1$s_hub_tournaments DROP CONSTRAINT IF EXISTS %1$s_hub_tournaments_level_check;
      ALTER TABLE %1$s_hub_tournaments ADD CONSTRAINT %1$s_hub_tournaments_level_check CHECK (level IS NULL OR level IN ('national', 'regional', 'state'));
      ALTER TABLE %1$s_hub_tournaments ADD COLUMN IF NOT EXISTS champion_rating integer CHECK (champion_rating IS NULL OR champion_rating BETWEEN 0 AND 100);

      ALTER TABLE %1$s_hub_events ADD COLUMN IF NOT EXISTS uploaded_at timestamptz;
      ALTER TABLE %1$s_hub_events ADD COLUMN IF NOT EXISTS upload_files text[];
      ALTER TABLE %1$s_hub_events ADD COLUMN IF NOT EXISTS upload_divisions jsonb;   -- [{division, style, weights, places, placed_through}]

      ALTER TABLE %1$s_prospects ADD COLUMN IF NOT EXISTS club_listed text;
    $f$, g);
  END LOOP;
END $$;

-- Levels (Kyle 2026-11-12) and the champion rating for each level
UPDATE boys_hub_tournaments  SET level = v.level FROM (VALUES
  ('Super 32 Challenge', 'national'), ('NHSCA High School Nationals', 'national'), ('USAW 16U & Junior National Championships (Fargo)', 'national'),
  ('Journeymen Fall Classic', 'regional'), ('USAW Northeast Regional Championships', 'regional'),
  ('Super 32 NJ Early Qualifier', 'state'), ('War at the Shore (HS Open)', 'state'), ('USAW-NJ Scholastic State Championships (Cadet/16U)', 'state'),
  ('USAW-NJ Freestyle & Greco State Championships', 'state'), ('Mobbin Classic Preseason Open', 'state')
) v(name, level) WHERE boys_hub_tournaments.name = v.name;
UPDATE girls_hub_tournaments t SET level = b.level FROM boys_hub_tournaments b WHERE b.name = t.name AND b.level IS NOT NULL;
UPDATE mixed_hub_tournaments SET level = v.level FROM (VALUES
  ('Super 32 Challenge (MS Division)', 'national'), ('NHSCA Middle School Nationals', 'national'), ('Tulsa Nationals', 'national'),
  ('Journeymen Fall Classic (Overflo MS Division)', 'regional'), ('Jersey Shore Junior Wrestling League (JSJWL) Championships', 'regional'),
  ('South Jersey Middle School Wrestling League (SJMSWL) Tournament', 'regional'), ('Raritan Valley League Tournament', 'regional'),
  ('Tri-County Middle School / Youth Championships', 'regional'),
  ('War at the Shore', 'state'), ('USAW-NJ Scholastic State Championships (NJUSA)', 'state'), ('Garden State Classic (GSW Duals & Individual)', 'state'),
  ('Mobbin Classic (Youth / MS Division)', 'state'), ('MSK Manalapan Preseason WAR Zone Series', 'state')
) v(name, level) WHERE mixed_hub_tournaments.name = v.name;
UPDATE boys_hub_tournaments  SET champion_rating = CASE level WHEN 'national' THEN 90 WHEN 'regional' THEN 75 WHEN 'state' THEN 50 END WHERE level IS NOT NULL AND champion_rating IS NULL;
UPDATE girls_hub_tournaments SET champion_rating = CASE level WHEN 'national' THEN 90 WHEN 'regional' THEN 75 WHEN 'state' THEN 50 END WHERE level IS NOT NULL AND champion_rating IS NULL;
UPDATE mixed_hub_tournaments SET champion_rating = CASE level WHEN 'national' THEN 90 WHEN 'regional' THEN 75 WHEN 'state' THEN 50 END WHERE level IS NOT NULL AND champion_rating IS NULL;

-- The events already loaded (Super 32, Fargo): their upload date is when their places went in
UPDATE boys_hub_events  e SET uploaded_at = (SELECT min(created_at) FROM boys_hub_placements  p WHERE p.event_id = e.id) WHERE uploaded_at IS NULL;
UPDATE girls_hub_events e SET uploaded_at = (SELECT min(created_at) FROM girls_hub_placements p WHERE p.event_id = e.id) WHERE uploaded_at IS NULL;
UPDATE mixed_hub_events e SET uploaded_at = (SELECT min(created_at) FROM mixed_hub_placements p WHERE p.event_id = e.id) WHERE uploaded_at IS NULL;

COMMIT;

-- Verify: tournaments per level on each list (shown ones), and the loaded events now marked uploaded
SELECT 'boys' AS list, level, champion_rating, count(*) FROM boys_hub_tournaments WHERE is_active GROUP BY 2, 3
UNION ALL SELECT 'girls', level, champion_rating, count(*) FROM girls_hub_tournaments WHERE is_active GROUP BY 2, 3
UNION ALL SELECT 'mixed', level, champion_rating, count(*) FROM mixed_hub_tournaments WHERE is_active GROUP BY 2, 3
UNION ALL SELECT 'uploaded events', NULL, NULL, (SELECT count(*) FROM boys_hub_events WHERE uploaded_at IS NOT NULL) + (SELECT count(*) FROM girls_hub_events WHERE uploaded_at IS NOT NULL) + (SELECT count(*) FROM mixed_hub_events WHERE uploaded_at IS NOT NULL)
ORDER BY 1, 2;

-- ROLLBACK: drop the added columns (level, champion_rating, uploaded_at, upload_files, upload_divisions, club_listed)
