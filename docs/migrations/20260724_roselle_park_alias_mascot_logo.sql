-- MIGRATION: 20260724_roselle_park_alias_mascot_logo.sql
--
-- Roselle Park (school_id 358) data fixes:
--   1. Add "Abraham Clark" alias — the school appears under this name in dual meet imports
--   2. Set mascot to 'Rams'
--   3. Set logo_url to the uploaded 512px PNG in Supabase storage
--
-- Logo upload: SVG from "Mascot Library/Clean SVG/125 - Roselle Park.svg"
-- converted to 512×512 PNG via sharp and uploaded to
--   school-logos/colored/512/358.png
-- Upload script: scripts/upload-roselle-logo.mjs (run once, not in CI)
--
-- Apply in Supabase SQL editor.

-- 1. Alias
INSERT INTO school_aliases (school_id, alias, alias_type, notes)
VALUES (358, 'Abraham Clark', 'school_name', 'Roselle Park HS appears as "Abraham Clark" in dual meet schedules')
ON CONFLICT DO NOTHING;

-- 2. Mascot + logo
UPDATE public.schools
SET
  mascot   = 'Rams',
  logo_url = 'https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/358.png'
WHERE id = 358;
