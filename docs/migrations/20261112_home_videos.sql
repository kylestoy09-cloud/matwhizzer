-- docs/migrations/20261112_home_videos.sql
--
-- Home Video (Kyle 2026-11-12): a historical match video on each side's home page, changed weekly. The
-- team pastes the YouTube link for each week (weeks start Monday, Eastern) with the creator's name and
-- channel link for credit. home_video_settings turns the feature on or off per side. The home page shows
-- the current week's video, or the latest earlier one when a week is empty. One table per side.
-- Written by /api/admin/home-videos (admin); read by the home page through the server. Run in the
-- Supabase SQL editor.

BEGIN;

DO $$
DECLARE g text;
BEGIN
  FOREACH g IN ARRAY ARRAY['boys', 'girls'] LOOP
    EXECUTE format($f$
      CREATE TABLE IF NOT EXISTS %1$s_home_videos (
        week_start    date        PRIMARY KEY,   -- the Monday the video goes up
        youtube_url   text        NOT NULL,
        video_id      text        NOT NULL,      -- from the link, for the player
        title         text,
        creator_name  text,
        creator_url   text,                      -- their channel, for credit
        notes         text,
        updated_at    timestamptz NOT NULL DEFAULT now(),
        updated_by    text
      );
      ALTER TABLE %1$s_home_videos ENABLE ROW LEVEL SECURITY;
      GRANT ALL ON %1$s_home_videos TO service_role;
    $f$, g);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS home_video_settings (
  gender      char(1)     PRIMARY KEY CHECK (gender IN ('M', 'F')),
  enabled     boolean     NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text
);
INSERT INTO home_video_settings (gender, enabled) VALUES ('M', false), ('F', false) ON CONFLICT (gender) DO NOTHING;
ALTER TABLE home_video_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON home_video_settings TO service_role;

COMMIT;

-- Verify: both sides off, no videos yet
SELECT gender, enabled, (SELECT count(*) FROM boys_home_videos) AS boys_videos, (SELECT count(*) FROM girls_home_videos) AS girls_videos
FROM home_video_settings ORDER BY gender;

-- ROLLBACK: DROP TABLE boys_home_videos, girls_home_videos, home_video_settings;
