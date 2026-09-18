-- Individual Upsets Schema
-- Two tables to support per-weight upset review and publication alongside rankings.
--
-- Upset definition: a match where the winner had a lower hammer score going in
-- than the loser. Differential = loser_pre_hammer − winner_pre_hammer (always positive).
--
-- individual_upsets       — one row per upset match per week+weight.
--   Auto-populated by the compute API from wrestler_match_score_log for the
--   Mon–Sun date range ending on the week's publish date (Sunday).
--   editorial selects which to publish via include_in_publish.
--   Geographic context (district/region/section for both wrestlers) is
--   denormalized at compute time so publication queries are fast.
--
-- individual_upset_completion — one row per week+gender+weight when the admin
--   saves the upset review. Upset review is a single pass per weight (not per
--   district); completion marks the upset tab done for that weight.

-- ─── individual_upsets ────────────────────────────────────────────────────────

CREATE TABLE public.individual_upsets (
  id                  bigserial    PRIMARY KEY,
  week_id             integer      NOT NULL REFERENCES individual_ranking_weeks(id) ON DELETE CASCADE,
  gender              text         NOT NULL CHECK (gender IN ('M', 'F')),
  weight_class        smallint     NOT NULL,

  -- Match participants
  winner_id           uuid         NOT NULL REFERENCES wrestlers(id),
  loser_id            uuid         NOT NULL REFERENCES wrestlers(id),

  -- Hammer scores at the time of the match
  winner_pre_hammer   numeric(6,2) NOT NULL,
  loser_pre_hammer    numeric(6,2) NOT NULL,
  -- loser_pre_hammer - winner_pre_hammer; always positive by definition
  differential        numeric(6,2) NOT NULL CHECK (differential > 0),

  -- Match context
  win_type            text,        -- 'Fall', 'MD', 'Dec', 'TF', 'SV-1', 'UTB', etc.
  match_date          date         NOT NULL,
  match_source        text         CHECK (match_source IN ('dual_meet', 'tournament_bout')),
  source_id           text,        -- UUID of dual_meet_matches or tournament_bouts row

  -- Geographic context: denormalized at compute time from wrestler_hammer_scores
  winner_district     integer,
  winner_region       integer,
  winner_section      text,
  loser_district      integer,
  loser_region        integer,
  loser_section       text,

  -- Editorial: admin toggles this to include the upset in the published output
  include_in_publish  boolean      NOT NULL DEFAULT false,

  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),

  -- One row per unique matchup per week+weight (re-running compute is idempotent)
  UNIQUE (week_id, gender, weight_class, winner_id, loser_id, match_date)
);

CREATE INDEX individual_upsets_week_weight_idx
  ON individual_upsets (week_id, gender, weight_class);

CREATE INDEX individual_upsets_winner_idx
  ON individual_upsets (winner_id);

CREATE INDEX individual_upsets_loser_idx
  ON individual_upsets (loser_id);

-- Fast lookup for publication: all included upsets for a winner's district
CREATE INDEX individual_upsets_winner_district_idx
  ON individual_upsets (week_id, gender, weight_class, winner_district)
  WHERE include_in_publish = true;

-- ─── individual_upset_completion ─────────────────────────────────────────────

CREATE TABLE public.individual_upset_completion (
  id            bigserial    PRIMARY KEY,
  week_id       integer      NOT NULL REFERENCES individual_ranking_weeks(id) ON DELETE CASCADE,
  gender        text         NOT NULL CHECK (gender IN ('M', 'F')),
  weight_class  smallint     NOT NULL,
  completed_at  timestamptz  NOT NULL DEFAULT now(),
  completed_by  text,

  -- One row per week+gender+weight — upset review is a single pass, not per entity
  UNIQUE (week_id, gender, weight_class)
);

CREATE INDEX individual_upset_completion_week_idx
  ON individual_upset_completion (week_id, gender);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE individual_upsets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_upset_completion  ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read (admin UI only; public site reads via server-side API)
CREATE POLICY "authenticated read upsets"
  ON individual_upsets FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read upset completion"
  ON individual_upset_completion FOR SELECT TO authenticated USING (true);

-- Service role has full access (used by compute + save API routes)
CREATE POLICY "service write upsets"
  ON individual_upsets FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service write upset completion"
  ON individual_upset_completion FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON individual_upsets           TO authenticated;
GRANT SELECT ON individual_upset_completion TO authenticated;
GRANT ALL    ON individual_upsets           TO service_role;
GRANT ALL    ON individual_upset_completion TO service_role;
GRANT USAGE, SELECT ON SEQUENCE individual_upsets_id_seq           TO service_role;
GRANT USAGE, SELECT ON SEQUENCE individual_upset_completion_id_seq TO service_role;

-- ─── Rollback ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS individual_upset_completion CASCADE;
-- DROP TABLE IF EXISTS individual_upsets CASCADE;
