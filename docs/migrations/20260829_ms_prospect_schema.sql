-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260829_ms_prospect_schema.sql
--
-- Middle school prospect tracking system.
--
-- Three tables store MS tournament tiers, MS tournament events, and individual
-- podium placements. Placements can later be linked to a HS wrestler record via
-- hs_wrestler_id. The link drives a postseason-score credit on the wrestler's
-- hammer score until real HS postseason data is available.
--
-- Apply in Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── ms_tournament_tiers ───────────────────────────────────────────────────
-- Named tier definitions that determine how much a placement at that tier of
-- tournament is worth as a postseason score credit.
-- credit_1 through credit_8 are the postseason score equivalents for each
-- place at a tournament in this tier. NULL means the place earns no credit
-- (e.g. a regional-level tournament might only credit top 3).
-- Credits are expressed on the same scale as the hammer score postseason
-- component (0–50). For reference: state champ = 50, state qualifier with
-- 1 win = 36, district champion = 20.

CREATE TABLE public.ms_tournament_tiers (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text        NOT NULL,
  description text,
  credit_1    numeric(5,2),
  credit_2    numeric(5,2),
  credit_3    numeric(5,2),
  credit_4    numeric(5,2),
  credit_5    numeric(5,2),
  credit_6    numeric(5,2),
  credit_7    numeric(5,2),
  credit_8    numeric(5,2),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ms_tournament_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ms_tournament_tiers"
  ON public.ms_tournament_tiers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write ms_tournament_tiers"
  ON public.ms_tournament_tiers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── ms_tournaments ────────────────────────────────────────────────────────
-- Individual MS tournament events. Each event belongs to a tier, which
-- determines placement credit values. Changing the tier on an existing
-- tournament retroactively affects all credit calculations for its placements.
-- gender: 'M' = boys only, 'F' = girls only, 'MF' = combined event.

CREATE TABLE public.ms_tournaments (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        text        NOT NULL,
  tier_id     bigint      NOT NULL REFERENCES public.ms_tournament_tiers(id),
  season      text        NOT NULL,   -- school year, e.g. '2024-25'
  date        date,
  gender      text        NOT NULL CHECK (gender IN ('M', 'F', 'MF')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ms_tournaments_season_idx ON public.ms_tournaments (season);
CREATE INDEX ms_tournaments_tier_idx   ON public.ms_tournaments (tier_id);

ALTER TABLE public.ms_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ms_tournaments"
  ON public.ms_tournaments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write ms_tournaments"
  ON public.ms_tournaments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── ms_placements ─────────────────────────────────────────────────────────
-- Individual podium finishes at MS tournaments. One row per wrestler per
-- weight per tournament. Does not track every match — only final placements.
--
-- wrestler_name / school_name are stored raw as they appear in the source
-- results. hs_wrestler_id is set after a human confirms the link between
-- this MS record and a HS wrestler profile (happens during HS import review
-- when a new wrestler is detected and a name match exists here).
--
-- weight_class is stored as-is from the MS tournament (MS weights differ from
-- HS weights — no mapping is applied).

CREATE TABLE public.ms_placements (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ms_tournament_id  bigint      NOT NULL REFERENCES public.ms_tournaments(id) ON DELETE CASCADE,
  wrestler_name     text        NOT NULL,
  school_name       text,
  weight_class      integer     NOT NULL,
  place             integer     NOT NULL CHECK (place BETWEEN 1 AND 8),
  hs_wrestler_id    uuid        REFERENCES public.wrestlers(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ms_placements_tournament_idx   ON public.ms_placements (ms_tournament_id);
CREATE INDEX ms_placements_wrestler_idx     ON public.ms_placements (hs_wrestler_id);
-- Index on wrestler_name to accelerate the cross-reference query during HS import
CREATE INDEX ms_placements_name_idx         ON public.ms_placements (lower(wrestler_name));

ALTER TABLE public.ms_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ms_placements"
  ON public.ms_placements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write ms_placements"
  ON public.ms_placements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── ms_postseason_credit ──────────────────────────────────────────────────
-- Stores the confirmed MS-to-HS link and the computed postseason credit for a
-- wrestler. Written when an admin confirms a MS profile match during HS import
-- review. The credit field is the final postseason score value applied to the
-- hammer score until the wrestler accumulates real HS postseason data.
--
-- superseded_at: set to now() once the wrestler has a real HS postseason
-- result (district entry or better), at which point the hammer score formula
-- ignores this credit and uses actual postseason data instead.

CREATE TABLE public.ms_postseason_credit (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  hs_wrestler_id   uuid        NOT NULL REFERENCES public.wrestlers(id) ON DELETE CASCADE,
  credit_value     numeric(5,2) NOT NULL,
  confirmed_at     timestamptz NOT NULL DEFAULT now(),
  confirmed_by     uuid        REFERENCES auth.users(id),
  superseded_at    timestamptz,
  notes            text,
  UNIQUE (hs_wrestler_id)   -- one credit record per wrestler
);

CREATE INDEX ms_postseason_credit_wrestler_idx ON public.ms_postseason_credit (hs_wrestler_id);

ALTER TABLE public.ms_postseason_credit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ms_postseason_credit"
  ON public.ms_postseason_credit FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write ms_postseason_credit"
  ON public.ms_postseason_credit FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
