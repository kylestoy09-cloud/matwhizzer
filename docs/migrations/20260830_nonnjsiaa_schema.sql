-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260830_nonnjsiaa_schema.sql
--
-- Non-NJSIAA tracking system: clubs, MS wrestler identities, HS off-season
-- tournaments. Replaces the direct hs_wrestler_id link on ms_placements with
-- a stable ms_wrestlers identity table, and drops the now-unnecessary
-- ms_postseason_credit cache in favour of on-the-fly computation.
--
-- Apply in Supabase SQL editor.
-- Depends on: 20260829_ms_prospect_schema.sql (ms_placements must exist)
-- ─────────────────────────────────────────────────────────────────────────────


-- ─── nonnjsiaa_clubs ──────────────────────────────────────────────────────────
-- Club programs that compete in MS and HS off-season events. Not hard-linked to
-- wrestlers — the connection is captured per-placement via club_id on ms_placements
-- and hs_offseason_placements. A club profile aggregates all placements where
-- club_id = this club's id across both tables.

CREATE TABLE public.nonnjsiaa_clubs (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name         text        NOT NULL,
  abbreviation text,
  location     text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX nonnjsiaa_clubs_name_idx ON public.nonnjsiaa_clubs (lower(name));

ALTER TABLE public.nonnjsiaa_clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read nonnjsiaa_clubs"
  ON public.nonnjsiaa_clubs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write nonnjsiaa_clubs"
  ON public.nonnjsiaa_clubs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── ms_wrestlers ─────────────────────────────────────────────────────────────
-- Stable identity records for MS wrestlers. Created during MS import when a
-- parsed placement cannot be confidently matched to an existing record.
-- canonical_name is chosen by the admin during import review.
--
-- hs_wrestler_id is nullable — set only when the admin manually confirms the
-- link between an MS wrestler and a known NJSIAA HS wrestler (e.g. to display
-- "trained at Club X" on a HS wrestler's profile, or to surface MS credit
-- during the hammer score calculation for new HS wrestlers).
--
-- The hammer score formula reads ms_wrestlers.hs_wrestler_id to find the
-- matching ms_placements rows and computes credit on the fly from tier tables.
-- No separate credit cache is needed.

CREATE TABLE public.ms_wrestlers (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  canonical_name text        NOT NULL,
  hs_wrestler_id uuid        REFERENCES public.wrestlers(id) ON DELETE SET NULL,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ms_wrestlers_name_idx        ON public.ms_wrestlers (lower(canonical_name));
CREATE INDEX ms_wrestlers_hs_wrestler_idx ON public.ms_wrestlers (hs_wrestler_id);

ALTER TABLE public.ms_wrestlers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read ms_wrestlers"
  ON public.ms_wrestlers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write ms_wrestlers"
  ON public.ms_wrestlers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── ms_placements: replace hs_wrestler_id with ms_wrestler_id + club_id ──────
-- ms_wrestler_id links each placement to its stable MS wrestler identity.
-- club_id links to the club the wrestler represented at this tournament.
-- wrestler_name is kept raw for audit and fuzzy matching during import.
-- hs_wrestler_id is dropped — that link now lives on ms_wrestlers.

DROP INDEX  IF EXISTS ms_placements_wrestler_idx;

ALTER TABLE public.ms_placements
  DROP COLUMN IF EXISTS hs_wrestler_id,
  ADD  COLUMN ms_wrestler_id bigint REFERENCES public.ms_wrestlers(id)    ON DELETE SET NULL,
  ADD  COLUMN club_id        bigint REFERENCES public.nonnjsiaa_clubs(id) ON DELETE SET NULL;

CREATE INDEX ms_placements_ms_wrestler_idx ON public.ms_placements (ms_wrestler_id);
CREATE INDEX ms_placements_club_idx        ON public.ms_placements (club_id);


-- ─── ms_postseason_credit: drop ───────────────────────────────────────────────
-- Credit is now computed on the fly in the hammer score recalculation from
-- ms_placements joined with ms_tournament_tiers. No cached value needed.

DROP TABLE IF EXISTS public.ms_postseason_credit;


-- ─── hs_offseason_tournaments ─────────────────────────────────────────────────
-- HS off-season tournament events (summer duals, invitationals, national
-- folkstyle events, etc.). No tier system — results are reference data only
-- and do not feed into the hammer score formula.
-- gender: 'M' = boys, 'F' = girls, 'MF' = combined.

CREATE TABLE public.hs_offseason_tournaments (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text        NOT NULL,
  season     text        NOT NULL,   -- HS school year the tournament belongs to, e.g. '2025-26'
  date       date,
  gender     text        NOT NULL CHECK (gender IN ('M', 'F', 'MF')),
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hs_offseason_tournaments_season_idx ON public.hs_offseason_tournaments (season);

ALTER TABLE public.hs_offseason_tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read hs_offseason_tournaments"
  ON public.hs_offseason_tournaments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write hs_offseason_tournaments"
  ON public.hs_offseason_tournaments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ─── hs_offseason_placements ──────────────────────────────────────────────────
-- Individual podium finishes at HS off-season tournaments. One row per wrestler
-- per weight per tournament. Place is not strictly 1–8 (some events have larger
-- fields) so no CHECK constraint on place — use application-level validation.
--
-- wrestler_name is stored raw for audit; hs_wrestler_id is set after the import
-- review matches the raw name to a HS wrestler record using the standard
-- matchWrestler() lookup. club_id is the club the wrestler represented.

CREATE TABLE public.hs_offseason_placements (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tournament_id  bigint      NOT NULL REFERENCES public.hs_offseason_tournaments(id) ON DELETE CASCADE,
  wrestler_name  text        NOT NULL,
  school_name    text,
  weight_class   integer     NOT NULL,
  place          integer     NOT NULL CHECK (place >= 1),
  hs_wrestler_id uuid        REFERENCES public.wrestlers(id) ON DELETE SET NULL,
  club_id        bigint      REFERENCES public.nonnjsiaa_clubs(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hs_offseason_placements_tournament_idx  ON public.hs_offseason_placements (tournament_id);
CREATE INDEX hs_offseason_placements_wrestler_idx    ON public.hs_offseason_placements (hs_wrestler_id);
CREATE INDEX hs_offseason_placements_club_idx        ON public.hs_offseason_placements (club_id);
CREATE INDEX hs_offseason_placements_name_idx        ON public.hs_offseason_placements (lower(wrestler_name));

ALTER TABLE public.hs_offseason_placements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read hs_offseason_placements"
  ON public.hs_offseason_placements FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role write hs_offseason_placements"
  ON public.hs_offseason_placements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
