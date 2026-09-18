-- docs/migrations/20260803_merge_holy_cross_prep_into_holy_cross.sql
--
-- Merges school 1009 (Holy Cross Prep, is_nj=false) into school 201 (Holy Cross, is_nj=true).
-- Holy Cross Prep was auto-created as a duplicate; all data belongs under Holy Cross.

DO $$
BEGIN

  -- ── wrestler_name_aliases ───────────────────────────────────────────────────
  -- Delete any alias at 1009 that already exists at 201 (would violate unique constraint)
  DELETE FROM public.wrestler_name_aliases a
  USING public.wrestler_name_aliases b
  WHERE a.school_id = 1009
    AND b.school_id = 201
    AND a.raw_name = b.raw_name;

  UPDATE public.wrestler_name_aliases SET school_id = 201 WHERE school_id = 1009;

  -- ── tournament_bouts ────────────────────────────────────────────────────────
  UPDATE public.tournament_bouts SET wrestler1_school_id = 201 WHERE wrestler1_school_id = 1009;
  UPDATE public.tournament_bouts SET wrestler2_school_id = 201 WHERE wrestler2_school_id = 1009;

  -- ── tournament_entries ──────────────────────────────────────────────────────
  UPDATE public.tournament_entries SET school_id = 201 WHERE school_id = 1009;

  -- ── tournament_placements ───────────────────────────────────────────────────
  UPDATE public.tournament_placements SET school_id = 201 WHERE school_id = 1009;

  -- ── in_season_tournament_team_scores ────────────────────────────────────────
  UPDATE public.in_season_tournament_team_scores SET school_id = 201 WHERE school_id = 1009;

  -- ── precomputed_team_scores ─────────────────────────────────────────────────
  UPDATE public.precomputed_team_scores SET school_id = 201 WHERE school_id = 1009;

  -- ── conference_standings ────────────────────────────────────────────────────
  UPDATE public.conference_standings SET school_id = 201 WHERE school_id = 1009;

  -- ── dual_meets ──────────────────────────────────────────────────────────────
  UPDATE public.dual_meets SET team1_school_id = 201 WHERE team1_school_id = 1009;
  UPDATE public.dual_meets SET team2_school_id = 201 WHERE team2_school_id = 1009;

  -- ── dual_meet_matches ───────────────────────────────────────────────────────
  UPDATE public.dual_meet_matches SET school_a_id = 201 WHERE school_a_id = 1009;
  UPDATE public.dual_meet_matches SET school_b_id = 201 WHERE school_b_id = 1009;

  -- ── Delete duplicate school record ──────────────────────────────────────────
  DELETE FROM public.schools WHERE id = 1009;

END $$;
