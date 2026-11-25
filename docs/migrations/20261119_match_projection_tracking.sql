-- docs/migrations/20261119_match_projection_tracking.sql
--
-- Projection tracking (Kyle 2026-11-19: "track every single match we enter this season. what were their scores pre
-- match, what was our prediction, what was the outcome and compare our prediction with the outcome as the year goes
-- on and we tweak the settings").
--
-- projection_settings: versioned projection settings per gender (src/lib/projection.ts ProjectionParams). One active
--   version per gender is what the site's projections use (H2H, match cards) and what newly tracked bouts are
--   projected with. Version 1 = the formula as it stood (finish-style levers off). Saving from Projection Accuracy
--   (/admin/{boys,girls}/projection-accuracy) adds the next version and makes it active.
-- match_projections: one row per NJ-vs-NJ bout of the season (src/lib/projectionTrack.ts) — both WRRs going in, the
--   projection's inputs, the settings version, what we projected (frozen when first recorded) and what happened
--   (refreshed if a result is corrected). Side A = the higher WRR going in. Written at the end of every WRR rebuild
--   (/api/admin/recalculate-hammer-scores) and by scripts/backfill_match_projections_20261119.mts (2025-26).
--   Ranks are from the winner's side (1 = 1st Minute Pin … 16 = OT win; OUTCOME_LABELS in hammerScore.ts).
--   No foreign keys to wrestlers: it's a record of what was projected, kept as it was.
-- Service role only (admin tools). Run in the Supabase SQL editor.

BEGIN;

CREATE TABLE IF NOT EXISTS projection_settings (
  id          bigserial PRIMARY KEY,
  gender      text NOT NULL CHECK (gender IN ('M', 'F')),
  version     int  NOT NULL,
  name        text,
  note        text,
  params      jsonb NOT NULL,
  is_active   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  UNIQUE (gender, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS projection_settings_one_active ON projection_settings (gender) WHERE is_active;

CREATE TABLE IF NOT EXISTS match_projections (
  id                bigserial PRIMARY KEY,
  gender            text NOT NULL CHECK (gender IN ('M', 'F')),
  season            text NOT NULL,
  match_date        date NOT NULL,
  match_source      text NOT NULL,
  source_id         text NOT NULL,
  wrestler_a_id     uuid NOT NULL,
  wrestler_b_id     uuid NOT NULL,
  a_pre_wrr         numeric NOT NULL,
  b_pre_wrr         numeric NOT NULL,
  common_opp_score  numeric,
  h2h_score         numeric,
  a_wins smallint NOT NULL, a_pins smallint NOT NULL, a_techs smallint NOT NULL, a_majors smallint NOT NULL,
  a_losses smallint NOT NULL, a_pinned smallint NOT NULL, a_teched smallint NOT NULL,
  b_wins smallint NOT NULL, b_pins smallint NOT NULL, b_techs smallint NOT NULL, b_majors smallint NOT NULL,
  b_losses smallint NOT NULL, b_pinned smallint NOT NULL, b_teched smallint NOT NULL,
  settings_id       bigint NOT NULL REFERENCES projection_settings(id),
  predicted_winner  text NOT NULL CHECK (predicted_winner IN ('a', 'b', 'even')),
  predicted_rank    smallint CHECK (predicted_rank BETWEEN 1 AND 16),
  predicted_score   numeric NOT NULL,
  actual_winner     text NOT NULL CHECK (actual_winner IN ('a', 'b')),
  actual_rank       smallint NOT NULL CHECK (actual_rank BETWEEN 1 AND 16),
  recorded_how      text NOT NULL CHECK (recorded_how IN ('live', 'backfill')),
  recorded_at       timestamptz NOT NULL DEFAULT now(),
  actual_updated_at timestamptz,
  UNIQUE (gender, match_source, source_id, wrestler_a_id, wrestler_b_id)
);
CREATE INDEX IF NOT EXISTS match_projections_season_idx ON match_projections (gender, season, id);

ALTER TABLE projection_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_projections   ENABLE ROW LEVEL SECURITY;
GRANT ALL ON projection_settings, match_projections TO service_role;
GRANT USAGE, SELECT ON SEQUENCE projection_settings_id_seq, match_projections_id_seq TO service_role;

-- Version 1 for each side: the formula as it stood (keep in step with V1_PARAMS in src/lib/projection.ts)
INSERT INTO projection_settings (gender, version, name, note, params, is_active, created_by)
SELECT g, 1, 'Version 1', 'The formula as it stood on 2026-11-19: WRR gap ladder blended with common opponents and past meetings; finish-style levers off.',
  '{"ladder":[38,36,34,32,30,28,26,24,22,20,18,17,13,9,5],"weights":{"all":[0.25,0.25,0.5],"meetings":[0.5,0.5],"common":[0.5,0.5]},"tossUp":0,"finishStyle":{"on":false,"minWins":8},"bonusCap":{"on":false,"minWins":8,"floorPct":20},"hardToPin":{"on":false,"minLosses":5,"floorPct":20}}'::jsonb,
  true, 'migration'
FROM (VALUES ('M'), ('F')) v(g)
ON CONFLICT (gender, version) DO NOTHING;

COMMIT;

-- Verify: one active version 1 per side, no bouts yet (the backfill script loads 2025-26)
SELECT gender, version, is_active, (SELECT count(*) FROM match_projections) AS bouts FROM projection_settings ORDER BY gender;
