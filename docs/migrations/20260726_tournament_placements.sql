-- Add source_format to in_season_tournaments and create tournament_placements.
--
-- source_format: 'full_bracket' = Format A (all participants, full bracket data);
--               'school_tracking' = Format B (per-school TW export with Yes/No flags).
-- This drives how the tournament detail page renders (full champs vs NJ podium only).
--
-- tournament_placements: one row per place winner per weight per tournament.
-- Populated by the RTF parser for Format A (from Nth Place Match rounds) and
-- inferred for Format B (from the last round a tracked school reached + outcome).

ALTER TABLE public.in_season_tournaments
  ADD COLUMN IF NOT EXISTS source_format text
  CHECK (source_format IN ('full_bracket', 'school_tracking'));

CREATE TABLE IF NOT EXISTS public.tournament_placements (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  in_season_tournament_id uuid        NOT NULL REFERENCES public.in_season_tournaments(id) ON DELETE CASCADE,
  weight_class            integer     NOT NULL,
  place                   integer     NOT NULL CHECK (place BETWEEN 1 AND 8),
  wrestler_name_raw       text        NOT NULL,
  school_name_raw         text        NOT NULL,
  school_id               integer     REFERENCES public.schools(id),
  nj_wrestler_id          uuid        REFERENCES public.wrestlers(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (in_season_tournament_id, weight_class, place)
);

CREATE INDEX IF NOT EXISTS idx_tournament_placements_tournament
  ON public.tournament_placements (in_season_tournament_id);

CREATE INDEX IF NOT EXISTS idx_tournament_placements_school
  ON public.tournament_placements (school_id);

CREATE INDEX IF NOT EXISTS idx_tournament_placements_wrestler
  ON public.tournament_placements (nj_wrestler_id);

GRANT ALL    ON TABLE public.tournament_placements TO service_role;
GRANT SELECT ON TABLE public.tournament_placements TO anon, authenticated;

ALTER TABLE public.tournament_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.tournament_placements FOR SELECT USING (true);
