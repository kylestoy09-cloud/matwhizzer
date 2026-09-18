-- Page sections ordering and visibility config
-- Controls display order and visibility of named sections on public pages.
-- Keyed by page_type + section_key; section_key must match identifiers used
-- in the page component's switch statement.

CREATE TABLE IF NOT EXISTS page_sections (
  id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  page_type     text    NOT NULL,
  section_key   text    NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  UNIQUE (page_type, section_key)
);

GRANT SELECT ON page_sections TO anon, authenticated;
GRANT ALL    ON page_sections TO service_role;

-- Seed: wrestler profile
INSERT INTO page_sections (page_type, section_key, display_order, is_visible) VALUES
  ('wrestler_profile', 'placements',     0, true),
  ('wrestler_profile', 'ghost_champion', 1, true),
  ('wrestler_profile', 'career_stats',   2, true),
  ('wrestler_profile', 'rankings',       3, true),
  ('wrestler_profile', 'revenge_wins',   4, true),
  ('wrestler_profile', 'match_history',  5, true)
ON CONFLICT (page_type, section_key) DO NOTHING;

-- Seed: school profile (boys + girls share one config)
INSERT INTO page_sections (page_type, section_key, display_order, is_visible) VALUES
  ('school', 'team_points',      0, true),
  ('school', 'champions',        1, true),
  ('school', 'team_leaderboard', 2, true),
  ('school', 'wrestlers',        3, true)
ON CONFLICT (page_type, section_key) DO NOTHING;
