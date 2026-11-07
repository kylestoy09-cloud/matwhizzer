-- docs/migrations/20261107_site_aesthetic_versions.sql
--
-- Saved looks from the Aesthetic Tool (Admin → Settings → Aesthetic Tool). Every Save adds a row; the
-- newest row is the look in effect. The tool loads it, and the public pages will read it when the
-- standard look goes live. Earlier rows are the history (load any one back in the tool).
-- settings: the tool's settings (region colors, number colors, stencil font, title font and size,
-- page summaries, tile size / corners / border, logo, header layout).
-- Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS site_aesthetic_versions (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  settings   jsonb       NOT NULL,
  note       text,
  saved_by   text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS site_aesthetic_versions_created_idx ON site_aesthetic_versions (created_at DESC);

ALTER TABLE site_aesthetic_versions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON site_aesthetic_versions TO service_role;
-- the public pages read the saved look (writes stay admin-only, through the service role)
GRANT SELECT ON site_aesthetic_versions TO anon, authenticated;
DROP POLICY IF EXISTS site_aesthetic_versions_read ON site_aesthetic_versions;
CREATE POLICY site_aesthetic_versions_read ON site_aesthetic_versions FOR SELECT USING (true);

COMMIT;

-- Verify: the table exists and is empty
SELECT count(*) FROM site_aesthetic_versions;
