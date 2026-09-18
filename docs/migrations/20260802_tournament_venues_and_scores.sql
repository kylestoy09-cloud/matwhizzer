-- Add venue/location fields to in_season_tournaments
ALTER TABLE public.in_season_tournaments
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS location_school_id int REFERENCES public.schools(id),
  ADD COLUMN IF NOT EXISTS banner_bg text,
  ADD COLUMN IF NOT EXISTS banner_fg text,
  ADD COLUMN IF NOT EXISTS is_oos boolean NOT NULL DEFAULT false;

-- Team scores for in-season tournaments
CREATE TABLE IF NOT EXISTS public.in_season_tournament_team_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.in_season_tournaments(id) ON DELETE CASCADE,
  place int NOT NULL,
  school_name text NOT NULL,
  school_id int REFERENCES public.schools(id),
  score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ists_tournament_id ON public.in_season_tournament_team_scores(tournament_id);
CREATE INDEX IF NOT EXISTS idx_ists_school_id ON public.in_season_tournament_team_scores(school_id);
