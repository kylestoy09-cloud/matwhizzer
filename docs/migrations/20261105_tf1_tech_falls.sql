-- docs/migrations/20261105_tf1_tech_falls.sql
--
-- TF-1 tech falls (TrackWrestling: "won by tech. fall … (TF-1 m:ss (a-b))", worth 1 bonus point).
-- The 2026-03-20 postseason load mapped every "Tech Fall" to TF-1.5, so these 6 bouts were stored
-- as TF-1.5 and their wrestlers got 0.5 too many team points (the site's per-wrestler points use
-- tw_win_bonus, which already prices TF-1 at 1.0). The 7th TF-1 bout in the exports (girls 2024-25
-- North 2, Adelaide Reist over Hayden Wagner) is not in the database at all.
--   2025-26 districts: Riotto over Willoe (D7 113 QF), Perrota over Robinson (D7 113 QF),
--     Romaniello over Casas (D14 175 QF), Delacruz over Vazquez (D14 150 F),
--     Pincus over Davis (D16 R2)
--   2024-25 regions:   Borrometi over Duque (final)
-- Times: TrackWrestling lists 0:00 for Delacruz, Romaniello and Pincus, as stored.
--
-- Functions that name tech-fall types in a list or CASE left TF-1 out (tech-fall and bonus-win
-- counts, and the site's own point formulas, which only run behind the scenes). Each is edited
-- in place from its live definition: only the tech-fall text changes, TF-1 counted as a tech fall
-- with 1 bonus point (team-point CASEs: TF 2.5/2.0 → TF-1 2.0/1.5; duals: 5 like any tech fall).
-- Functions already handling TF-1 (tw_win_bonus, bracket_buster_detail, lb_technical_masters,
-- lb_p/lb_gp_fastest_tf, bout_is_bonus) and the LIKE 'TF%' ones are untouched, except
-- state_team_score, whose LIKE gave TF-1 the TF-1.5 value.
--
-- Run in the Supabase SQL editor. All or nothing: any edit that doesn't apply stops the block.

DO $$
DECLARE
  f record; d text; nd text; changed int;
  edits jsonb := '{
    "district_leaders":         [["''TF'', ''TF-1.5''", "''TF'', ''TF-1'', ''TF-1.5''"]],
    "lb_bonus_wins":            [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"]],
    "lb_most_techfalls":        [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"]],
    "school_leaderboard":       [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"]],
    "dual_meet_bonus_ranks":    [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"]],
    "lb_rs_individual_stats":   [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"]],
    "lb_rs_team_stats":         [["''TF'',''TF-1.5''", "''TF'',''TF-1'',''TF-1.5''"],
                                 ["WHEN ''TF-1.5''  THEN 5", "WHEN ''TF-1.5''  THEN 5 WHEN ''TF-1'' THEN 5"]],
    "district_wrestler_points": [["WHEN ''TF-1.5'' THEN 1.5", "WHEN ''TF-1.5'' THEN 1.5 WHEN ''TF-1'' THEN 1.0"]],
    "lb_p_wrestler_points":     [["WHEN ''TF-1.5'' THEN 1.5", "WHEN ''TF-1.5'' THEN 1.5 WHEN ''TF-1'' THEN 1.0"]],
    "lb_team_points":           [["WHEN ''TF'' THEN 2.5", "WHEN ''TF'' THEN 2.5 WHEN ''TF-1'' THEN 2.0"],
                                 ["WHEN ''TF'' THEN 2.0", "WHEN ''TF'' THEN 2.0 WHEN ''TF-1'' THEN 1.5"]],
    "school_directory":         [["WHEN ''TF'' THEN 2.5", "WHEN ''TF'' THEN 2.5 WHEN ''TF-1'' THEN 2.0"],
                                 ["WHEN ''TF'' THEN 2.0", "WHEN ''TF'' THEN 2.0 WHEN ''TF-1'' THEN 1.5"]],
    "school_points_breakdown":  [["WHEN ''TF'' THEN 2.5", "WHEN ''TF'' THEN 2.5 WHEN ''TF-1'' THEN 2.0"],
                                 ["WHEN ''TF'' THEN 2.0", "WHEN ''TF'' THEN 2.0 WHEN ''TF-1'' THEN 1.5"]],
    "state_team_score":         [["WHEN m.win_type::text LIKE ''TF%'' THEN 2.5", "WHEN m.win_type::text = ''TF-1'' THEN 2.0 WHEN m.win_type::text LIKE ''TF%'' THEN 2.5"],
                                 ["WHEN m.win_type::text LIKE ''TF%'' THEN 2.0", "WHEN m.win_type::text = ''TF-1'' THEN 1.5 WHEN m.win_type::text LIKE ''TF%'' THEN 2.0"]]
  }';
  fname text; e jsonb; n int;
BEGIN
  -- 1. the 6 bouts
  UPDATE matches SET win_type = 'TF-1'
  WHERE win_type = 'TF-1.5' AND id IN (
    '44ce0c23-c474-42cb-88ba-46e052ff3584',  -- Riotto over Willoe
    'c761d2c7-5ee3-4e2f-854f-8d373144439e',  -- Perrota over Robinson
    '648a363f-eb0d-43ef-a410-e2fcf55a3be5',  -- Romaniello over Casas
    'b4b8131e-7112-45d9-97ab-844ae5b7c51e',  -- Delacruz over Vazquez
    'ea6dcc73-e9d6-43a7-bc83-987bf66163b1',  -- Pincus over Davis
    'b7fe1bdd-fb8f-4e54-9179-dd9825f0612a'); -- Borrometi over Duque
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 6 THEN RAISE EXCEPTION 'expected 6 bouts, updated %', n; END IF;

  -- 2. functions: each edit must apply to the live definition
  FOR fname, e IN SELECT key, value FROM jsonb_each(edits) LOOP
    changed := 0;
    FOR f IN SELECT p.oid FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
             WHERE s.nspname = 'public' AND p.proname = fname LOOP
      d := pg_get_functiondef(f.oid); nd := d;
      FOR i IN 0 .. jsonb_array_length(e) - 1 LOOP
        nd := replace(nd, e->i->>0, e->i->>1);
      END LOOP;
      IF nd <> d THEN EXECUTE nd; changed := changed + 1; END IF;
    END LOOP;
    IF changed = 0 THEN RAISE EXCEPTION 'function %: no edit applied', fname; END IF;
    RAISE NOTICE '%: % definition(s) edited', fname, changed;
  END LOOP;
END $$;

-- Verify: 6 TF-1 bouts; every edited function now mentions TF-1
SELECT count(*) AS tf1_bouts FROM matches WHERE win_type = 'TF-1';
SELECT p.proname, (p.prosrc LIKE '%TF-1''%') AS handles_tf1
FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
WHERE s.nspname = 'public' AND p.proname IN ('district_leaders','lb_bonus_wins','lb_most_techfalls',
  'school_leaderboard','dual_meet_bonus_ranks','lb_rs_individual_stats','lb_rs_team_stats',
  'district_wrestler_points','lb_p_wrestler_points','lb_team_points','school_directory',
  'school_points_breakdown','state_team_score')
ORDER BY 1;

-- ROLLBACK: UPDATE matches SET win_type = 'TF-1.5' WHERE id IN (the 6 ids above); for the
-- functions, run this block's edits in reverse (replace each new text with the old).
