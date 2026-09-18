-- Hammer Score system: persistent storage for calculated scores.
--
-- wrestler_hammer_scores  — one row per wrestler per season, stores the three
--   score components (postseason, tournament, match) and the combined total.
--   Rebuilt from scratch each time the recalculation engine runs.
--
-- wrestler_match_score_log — one row per scored match bout, used to derive
--   the rolling 20-match window and to show score history in the admin UI.
--   Cleared and rewritten on each full-season replay.

-- ── wrestler_hammer_scores ────────────────────────────────────────────────────

CREATE TABLE wrestler_hammer_scores (
  wrestler_id           uuid    NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  season                text    NOT NULL,                  -- e.g. '2025-26'

  -- Postseason component (0–50)
  postseason_base       numeric(6,2) NOT NULL DEFAULT 0,   -- raw score from 2024-25 finish
  postseason_adjusted   numeric(6,2) NOT NULL DEFAULT 0,   -- after mid-season PS adjustments

  -- Tournament component (0–20): average of tournament point awards
  tournament_score      numeric(6,2) NOT NULL DEFAULT 0,

  -- Match component (0–30): (avg_of_last_20_scores / 100) × 30
  match_score           numeric(6,2) NOT NULL DEFAULT 0,

  -- Combined total (sum of the three components above)
  hammer_score          numeric(6,2) NOT NULL DEFAULT 0,

  -- Rolling window info
  match_count           integer NOT NULL DEFAULT 0,        -- real matches scored so far
  last_match_date       date,

  last_calculated_at    timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (wrestler_id, season)
);

CREATE INDEX idx_whs_season_hammer
  ON wrestler_hammer_scores (season, hammer_score DESC);

-- ── wrestler_match_score_log ──────────────────────────────────────────────────

CREATE TABLE wrestler_match_score_log (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  wrestler_id               uuid        NOT NULL REFERENCES wrestlers(id) ON DELETE CASCADE,
  season                    text        NOT NULL,

  match_date                date        NOT NULL,
  match_source              text        NOT NULL
    CHECK (match_source IN ('dual_meet', 'tournament_bout', 'postseason')),
  source_id                 text        NOT NULL,           -- UUID of the source row (as text)

  opponent_wrestler_id      uuid        REFERENCES wrestlers(id),  -- null if unmatched opponent

  pre_match_hammer          numeric(6,2) NOT NULL,          -- this wrestler's score going in
  opponent_pre_match_hammer numeric(6,2) NOT NULL,          -- opponent's score going in

  outcome_rank              smallint    NOT NULL,            -- 1–16 win, 17–32 loss
  is_winner                 boolean     NOT NULL,
  score_earned              numeric(6,2) NOT NULL,

  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wmsl_wrestler_season_date
  ON wrestler_match_score_log (wrestler_id, season, match_date);

-- Grants — anon read only, service_role full access
GRANT SELECT ON wrestler_hammer_scores    TO anon, authenticated;
GRANT ALL    ON wrestler_hammer_scores    TO service_role;
GRANT SELECT ON wrestler_match_score_log  TO anon, authenticated;
GRANT ALL    ON wrestler_match_score_log  TO service_role;

-- Rollback:
--   DROP TABLE IF EXISTS wrestler_match_score_log;
--   DROP TABLE IF EXISTS wrestler_hammer_scores;
