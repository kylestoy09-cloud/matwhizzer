-- Individual Rankings Workbench Schema
-- Three tables to support the district → region → section → state ranking workflow.
-- Safe to run at any time; does NOT require Season 3 to exist yet.
-- See 20260829_individual_ranking_season3_seed.sql for the week-date rows (run after rollover).

-- ─── individual_ranking_weeks ───────────────────────────────────────────────
-- One row per week per gender per season. Seeded by the post-rollover script.

CREATE TABLE public.individual_ranking_weeks (
  id          serial      PRIMARY KEY,
  season_id   integer     NOT NULL REFERENCES seasons(id),
  week_number smallint    NOT NULL CHECK (week_number BETWEEN 1 AND 9),
  week_date   date        NOT NULL,
  gender      text        NOT NULL CHECK (gender IN ('M', 'F')),
  UNIQUE (season_id, week_number, gender)
);

-- ─── individual_rankings ────────────────────────────────────────────────────
-- One row per wrestler per stage-entity per week per weight.
-- stage:        'district' | 'region' | 'section' | 'state'
-- stage_entity: district_id (text), region_id (text), section name, or 'state'
-- manual_rank:  NULL until the user assigns a rank; updated on save
-- hammer_score_snapshot: copied at load time so the leaderboard is stable even
--               if scores are later recalculated

CREATE TABLE public.individual_rankings (
  id                     bigserial   PRIMARY KEY,
  week_id                integer     NOT NULL REFERENCES individual_ranking_weeks(id),
  gender                 text        NOT NULL CHECK (gender IN ('M', 'F')),
  weight_class           smallint    NOT NULL,
  stage                  text        NOT NULL CHECK (stage IN ('district', 'region', 'section', 'state')),
  stage_entity           text        NOT NULL,
  wrestler_id            uuid        NOT NULL REFERENCES wrestlers(id),
  school_id              integer     REFERENCES schools(id),
  manual_rank            smallint,
  hammer_score_snapshot  numeric(6,2),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_id, gender, weight_class, stage, stage_entity, wrestler_id)
);

CREATE INDEX individual_rankings_pool_idx
  ON individual_rankings (week_id, gender, weight_class, stage, stage_entity);

CREATE INDEX individual_rankings_wrestler_idx
  ON individual_rankings (wrestler_id);

-- ─── individual_ranking_completion ──────────────────────────────────────────
-- Written when a stage-entity is saved/locked for a given week + weight.
-- Presence of a row means that stage is complete and the next stage can unlock.
-- Gating rules (enforced in application code):
--   All 32 boys districts (per weight) complete → regions unlock
--   All 8 regions (per weight) complete → sections unlock
--   All 4 sections (per weight) complete → state unlocks
--   (Girls: 12 districts, 4 regions, 4 sections)

CREATE TABLE public.individual_ranking_completion (
  id              bigserial   PRIMARY KEY,
  week_id         integer     NOT NULL REFERENCES individual_ranking_weeks(id),
  gender          text        NOT NULL CHECK (gender IN ('M', 'F')),
  weight_class    smallint    NOT NULL,
  stage           text        NOT NULL CHECK (stage IN ('district', 'region', 'section', 'state')),
  stage_entity    text        NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  completed_by    text,
  UNIQUE (week_id, gender, weight_class, stage, stage_entity)
);

CREATE INDEX individual_ranking_completion_lookup_idx
  ON individual_ranking_completion (week_id, gender, weight_class, stage);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE individual_ranking_weeks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_rankings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_ranking_completion  ENABLE ROW LEVEL SECURITY;

-- Public read on week dates (the UI needs to know the schedule)
CREATE POLICY "public read weeks"
  ON individual_ranking_weeks FOR SELECT USING (true);

-- Authenticated read on rankings and completion (admin UI only)
CREATE POLICY "authenticated read rankings"
  ON individual_rankings FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated read completion"
  ON individual_ranking_completion FOR SELECT TO authenticated USING (true);

-- Service role has full access (used by admin API routes)
CREATE POLICY "service write weeks"
  ON individual_ranking_weeks FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service write rankings"
  ON individual_rankings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service write completion"
  ON individual_ranking_completion FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT SELECT ON individual_ranking_weeks TO anon, authenticated;
GRANT SELECT ON individual_rankings TO authenticated;
GRANT SELECT ON individual_ranking_completion TO authenticated;
GRANT ALL ON individual_ranking_weeks TO service_role;
GRANT ALL ON individual_rankings TO service_role;
GRANT ALL ON individual_ranking_completion TO service_role;
GRANT USAGE, SELECT ON SEQUENCE individual_ranking_weeks_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE individual_rankings_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE individual_ranking_completion_id_seq TO service_role;
