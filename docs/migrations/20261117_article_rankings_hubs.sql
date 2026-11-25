-- docs/migrations/20261117_article_rankings_hubs.sql
--
-- Article Hub + Rankings Hub plumbing (Kyle 2026-11-17).
--
-- Articles: an article EVENT is a publish slot (preseason day, match-day recap at 8 AM the day after a match day,
-- weekly rankings, or one added by hand). Its article is the {g}_articles rows that point at it — one per section
-- (boys North I / North II / Central / South, girls North / South; NULL = statewide). Each section is saved on its
-- own (status 'finalized'); then the whole article is saved (event status 'ready'). The publisher (cron, every
-- 5 minutes) publishes a ready event at publish_at; one not ready by then is marked 'missed' and stays unpublished.
-- The Emergency Extension moves publish_at (extended_from keeps the original time).
--
-- Rankings (Whiz Rank): each week is a row of individual_ranking_weeks (week_date = Sunday); rankings publish
-- Monday 8 AM Eastern (publish_at). Orders are individual_rankings rows (stage 'section', stage_entity = the
-- section, manual_rank = Whiz Rank 1–25); "Submit" on a weight/section = an individual_ranking_completion row.
-- When every weight/section is submitted the week is ready (ready_at); the publisher sets published_at.
--
-- Written by /api/admin/article-hub, /api/admin/whiz-rank and /api/cron/publish (service role).
-- Run in the Supabase SQL editor.

BEGIN;

-- ── Article events, one table per side ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_article_events (
        id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
        season_id      integer     NOT NULL REFERENCES seasons(id),
        kind           text        NOT NULL CHECK (kind IN ('preseason', 'match_day', 'rankings', 'feature')),
        title          text        NOT NULL DEFAULT '',
        covers_date    date,                     -- the match day / ranking week / preseason day it is about
        publish_at     timestamptz NOT NULL,
        status         text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ready', 'published', 'missed')),
        ready_at       timestamptz,
        ready_by       text,
        published_at   timestamptz,
        extended_from  timestamptz,              -- the original publish time, once extended
        extended_by    text,
        auto           boolean     NOT NULL DEFAULT false,   -- created from the calendar / master schedule
        created_at     timestamptz NOT NULL DEFAULT now(),
        created_by     text
      );
      CREATE UNIQUE INDEX IF NOT EXISTS %1$s_article_events_auto_uq ON %1$s_article_events (season_id, kind, covers_date) WHERE auto;
      CREATE INDEX IF NOT EXISTS %1$s_article_events_due_idx ON %1$s_article_events (status, publish_at);
      ALTER TABLE %1$s_article_events ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_article_events TO service_role;

      ALTER TABLE %1$s_articles ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES %1$s_article_events(id) ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS %1$s_articles_event_idx ON %1$s_articles (event_id);
      -- girls sections are North / South; 'feature' = an article added by hand
      ALTER TABLE %1$s_articles DROP CONSTRAINT IF EXISTS %1$s_articles_section_check;
      ALTER TABLE %1$s_articles ADD CONSTRAINT %1$s_articles_section_check CHECK (section IN ('north_i', 'north_ii', 'central', 'south', 'north'));
      ALTER TABLE %1$s_articles DROP CONSTRAINT IF EXISTS %1$s_articles_article_type_check;
      ALTER TABLE %1$s_articles ADD CONSTRAINT %1$s_articles_article_type_check CHECK (article_type IN ('preseason', 'season', 'postseason', 'rankings', 'feature'));
    $f$, g);
  END LOOP;
END $$;

-- ── Ranking weeks: publish Monday 8 AM Eastern ──────────────────────────────────────────────────────────────
ALTER TABLE individual_ranking_weeks
  ADD COLUMN IF NOT EXISTS publish_at   timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at     timestamptz,
  ADD COLUMN IF NOT EXISTS ready_by     text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
UPDATE individual_ranking_weeks
   SET publish_at = ((week_date + 1)::timestamp + time '08:00') AT TIME ZONE 'America/New_York'
 WHERE publish_at IS NULL;
GRANT ALL ON individual_ranking_weeks, individual_rankings, individual_ranking_completion TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;

-- Verify: the event tables exist and are empty; every ranking week has a Monday 8 AM publish time
SELECT (SELECT count(*) FROM boys_article_events)  AS boys_events,
       (SELECT count(*) FROM girls_article_events) AS girls_events,
       (SELECT count(*) FROM individual_ranking_weeks WHERE publish_at IS NULL) AS weeks_without_publish_time,
       (SELECT min(publish_at AT TIME ZONE 'America/New_York') FROM individual_ranking_weeks WHERE season_id = 2027) AS first_publish_eastern;

-- ROLLBACK: ALTER TABLE boys_articles DROP COLUMN event_id; ALTER TABLE girls_articles DROP COLUMN event_id;
--   DROP TABLE boys_article_events, girls_article_events;
--   ALTER TABLE individual_ranking_weeks DROP COLUMN publish_at, DROP COLUMN ready_at, DROP COLUMN ready_by, DROP COLUMN published_at;
--   (the section / article_type checks: re-add the originals from 20260917_articles_system.sql)
