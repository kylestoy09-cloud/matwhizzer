-- 7 Things article system.
--
-- boys_articles and girls_articles are fully separate tables (gender separation rule).
-- article_type: 'preseason' | 'season' | 'postseason'
-- section: NULL = state level (preseason only); 'north_i' | 'north_ii' | 'central' | 'south'
-- article_key: identifies which preseason article (e.g. 'top_teams'); NULL for season/postseason
-- match_date: the game day (season/postseason); article publishes next morning at 8 AM ET
-- completed: preseason only — stored on the section=NULL row; drives dropdown checkmark
-- status flow: draft → finalized → published (finalized = ready for 8 AM auto-publish)

CREATE TABLE IF NOT EXISTS boys_articles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id            integer     REFERENCES seasons(id),
  article_type         text        NOT NULL CHECK (article_type IN ('preseason', 'season', 'postseason')),
  article_key          text,
  section              text        CHECK (section IN ('north_i', 'north_ii', 'central', 'south')),
  match_date           date,
  title                text        NOT NULL DEFAULT '',
  body                 text        NOT NULL DEFAULT '',
  author               text        NOT NULL DEFAULT '',
  status               text        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'finalized', 'published')),
  completed            boolean     NOT NULL DEFAULT false,
  scheduled_publish_at timestamptz,
  published_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Preseason: one body per article_key + section combo per season
CREATE UNIQUE INDEX IF NOT EXISTS boys_articles_preseason_uq
  ON boys_articles (season_id, article_key, section)
  WHERE article_type = 'preseason' AND section IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS boys_articles_preseason_state_uq
  ON boys_articles (season_id, article_key)
  WHERE article_type = 'preseason' AND section IS NULL;

-- Season/postseason: one article per section per match day per season
CREATE UNIQUE INDEX IF NOT EXISTS boys_articles_season_uq
  ON boys_articles (season_id, article_type, match_date, section)
  WHERE article_type IN ('season', 'postseason');

CREATE TABLE IF NOT EXISTS girls_articles (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id            integer     REFERENCES seasons(id),
  article_type         text        NOT NULL CHECK (article_type IN ('preseason', 'season', 'postseason')),
  article_key          text,
  section              text        CHECK (section IN ('north_i', 'north_ii', 'central', 'south')),
  match_date           date,
  title                text        NOT NULL DEFAULT '',
  body                 text        NOT NULL DEFAULT '',
  author               text        NOT NULL DEFAULT '',
  status               text        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft', 'finalized', 'published')),
  completed            boolean     NOT NULL DEFAULT false,
  scheduled_publish_at timestamptz,
  published_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS girls_articles_preseason_uq
  ON girls_articles (season_id, article_key, section)
  WHERE article_type = 'preseason' AND section IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS girls_articles_preseason_state_uq
  ON girls_articles (season_id, article_key)
  WHERE article_type = 'preseason' AND section IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS girls_articles_season_uq
  ON girls_articles (season_id, article_type, match_date, section)
  WHERE article_type IN ('season', 'postseason');

-- Grants
GRANT SELECT ON boys_articles  TO anon, authenticated;
GRANT SELECT ON girls_articles TO anon, authenticated;
GRANT ALL    ON boys_articles  TO service_role;
GRANT ALL    ON girls_articles TO service_role;

-- newsletter_subscribed on app_users
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean NOT NULL DEFAULT false;

-- Season date range (for Day X of Y in the season report card)
ALTER TABLE seasons
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date   date;
