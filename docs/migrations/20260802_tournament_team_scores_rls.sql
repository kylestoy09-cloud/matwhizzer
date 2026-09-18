GRANT SELECT ON public.in_season_tournament_team_scores TO anon;
GRANT SELECT ON public.in_season_tournament_team_scores TO authenticated;

ALTER TABLE public.in_season_tournament_team_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON public.in_season_tournament_team_scores
  FOR SELECT USING (true);
