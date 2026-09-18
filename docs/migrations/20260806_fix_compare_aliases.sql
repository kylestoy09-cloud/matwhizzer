-- Fix and add school aliases used by RTF comparison scripts (compare_pp, compare_wl).
-- RTF names that don't match display_name exactly need an alias so the scripts
-- resolve via school_aliases instead of fragile name similarity.
-- Applied 2026-08-06

-- Fix: "Lodi" alias currently points to standalone Lodi (55, is_combined=true).
-- Boys program runs as Lodi/Saddle Brook (379).
UPDATE school_aliases SET school_id = 379 WHERE alias = 'Lodi' AND school_id = 55;

-- Add missing RTF → school mappings
INSERT INTO school_aliases (alias, school_id) VALUES
  ('Ridgefield',       357),  -- RTF "Ridgefield" = Ridgefield Memorial (highschoolsports slug: ridgefield-ridgefield)
  ('Ridgefield Park',  393),  -- RTF "Ridgefield Park" = Ridgefield Park/Bogota co-op (slug: ridgefield-park-ridgefield-park)
  ('Paterson Kennedy', 74),   -- RTF "Paterson Kennedy" = John F. Kennedy, Paterson (slug: paterson-paterson-kennedy)
  ('Delbarton',        82)    -- RTF "Delbarton" = Delbarton School (slug: morristown-delbarton)
ON CONFLICT DO NOTHING;

-- ROLLBACK:
-- UPDATE school_aliases SET school_id = 55 WHERE alias = 'Lodi' AND school_id = 379;
-- DELETE FROM school_aliases WHERE alias IN ('Ridgefield','Ridgefield Park','Paterson Kennedy','Delbarton');
