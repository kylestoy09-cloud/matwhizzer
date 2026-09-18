-- docs/migrations/20260917_wrestler_merges_camden_delbarton.sql
--
-- Camden:
--   DELETE  (Camden/Camden Eastside) phantom — school name imported as wrestler name
--   MERGE   Ahmad Clossen → Ahmad Crosson
--
-- Delbarton:
--   MERGE   C.j. Betz      → Carl Betz
--   MERGE   Nico Marchetti → Nicolas Marchetti
--   MERGE   Nick Schwartz  → Nicholas Schwartz

DO $$
DECLARE
  phantom_id    uuid := '631c7b83-cc76-41bd-ab9f-7c9abccec019';

  clossen_id    uuid := '2cb72062-d7e4-438b-a932-c988ad6f3507';
  crosson_id    uuid := '24942001-9a8e-45e3-a39c-c10a4cec07cc';

  betz_cj_id    uuid := '61c4d732-43ea-45f2-8429-b96fd2e24883';
  betz_carl_id  uuid := '68fad72c-c444-4808-923a-a32bd19aed69';

  nico_id       uuid := '463f89bf-28d5-49e6-ae29-6a165e7de35e';
  nicolas_id    uuid := '30d89fe4-a79e-47ca-a61b-94c0a3d3e8c4';

  nick_s_id     uuid := '5eb83cb8-6294-48a9-884e-636b4232b50d';
  nicholas_s_id uuid := 'f2a25bc8-e718-4c90-961b-4d102899ae0b';

  src uuid;
  tgt uuid;

BEGIN

  -- ── Macro: delete all references to a phantom wrestler ────────────────────
  -- Used only for the Camden school-name-as-wrestler phantom.
  DELETE FROM dual_meet_matches        WHERE wrestler_a_id = phantom_id OR wrestler_b_id = phantom_id OR winner_id = phantom_id;
  DELETE FROM tournament_bouts         WHERE wrestler1_id  = phantom_id OR wrestler2_id  = phantom_id;
  DELETE FROM tournament_entries       WHERE wrestler_id   = phantom_id;
  DELETE FROM tournament_placements    WHERE wrestler_id   = phantom_id;
  DELETE FROM wrestler_name_aliases    WHERE wrestler_id   = phantom_id;
  DELETE FROM wrestler_hammer_scores   WHERE wrestler_id   = phantom_id;
  DELETE FROM wrestler_match_score_log WHERE wrestler_id   = phantom_id OR opponent_wrestler_id = phantom_id;
  DELETE FROM wrestler_school_history  WHERE wrestler_id   = phantom_id;
  DELETE FROM pending_wrestler_transfers WHERE wrestler_id = phantom_id;
  DELETE FROM in_season_tournament_seeds WHERE wrestler_id = phantom_id;
  DELETE FROM tournament_bracket_slots WHERE top_wrestler_id = phantom_id OR bottom_wrestler_id = phantom_id OR winner_wrestler_id = phantom_id;
  DELETE FROM individual_rankings      WHERE wrestler_id   = phantom_id;
  DELETE FROM individual_upsets        WHERE winner_id     = phantom_id OR loser_id = phantom_id;
  DELETE FROM snapshot_streak_state    WHERE wrestler_id   = phantom_id;
  DELETE FROM roster_grade_import      WHERE wrestler_id   = phantom_id;
  DELETE FROM bracket_picks            WHERE pick_1st = phantom_id OR pick_2nd = phantom_id OR pick_3rd = phantom_id OR pick_4th = phantom_id;
  DELETE FROM ms_wrestlers             WHERE hs_wrestler_id = phantom_id;
  DELETE FROM hs_offseason_placements  WHERE hs_wrestler_id = phantom_id;
  DELETE FROM wrestlers                WHERE id = phantom_id;

  -- ── Merge helper — runs for each (src, tgt) pair ─────────────────────────

  FOREACH src IN ARRAY ARRAY[clossen_id, betz_cj_id, nico_id, nick_s_id] LOOP
    tgt := CASE src
      WHEN clossen_id  THEN crosson_id
      WHEN betz_cj_id  THEN betz_carl_id
      WHEN nico_id     THEN nicolas_id
      WHEN nick_s_id   THEN nicholas_s_id
    END;

    -- Match / bout results
    UPDATE dual_meet_matches  SET wrestler_a_id = tgt WHERE wrestler_a_id = src;
    UPDATE dual_meet_matches  SET wrestler_b_id = tgt WHERE wrestler_b_id = src;
    UPDATE dual_meet_matches  SET winner_id     = tgt WHERE winner_id     = src;
    UPDATE tournament_bouts   SET wrestler1_id  = tgt WHERE wrestler1_id  = src;
    UPDATE tournament_bouts   SET wrestler2_id  = tgt WHERE wrestler2_id  = src;

    -- Tournament entries (conflict-safe: delete source where target already exists)
    DELETE FROM tournament_entries te_src
      WHERE te_src.wrestler_id = src
        AND EXISTS (SELECT 1 FROM tournament_entries te_tgt
                    WHERE te_tgt.wrestler_id = tgt AND te_tgt.tournament_id = te_src.tournament_id);
    UPDATE tournament_entries SET wrestler_id = tgt WHERE wrestler_id = src;

    -- Postseason bracket entries
    DELETE FROM tournament_placements WHERE wrestler_id = src;

    -- Seedings
    UPDATE in_season_tournament_seeds SET wrestler_id = tgt WHERE wrestler_id = src;

    -- Bracket slots
    UPDATE tournament_bracket_slots SET top_wrestler_id    = tgt WHERE top_wrestler_id    = src;
    UPDATE tournament_bracket_slots SET bottom_wrestler_id = tgt WHERE bottom_wrestler_id = src;
    UPDATE tournament_bracket_slots SET winner_wrestler_id = tgt WHERE winner_wrestler_id = src;

    -- Score logs and hammer scores (recalculated scores will overwrite anyway)
    UPDATE wrestler_match_score_log SET wrestler_id        = tgt WHERE wrestler_id        = src;
    UPDATE wrestler_match_score_log SET opponent_wrestler_id = tgt WHERE opponent_wrestler_id = src;
    DELETE FROM wrestler_hammer_scores WHERE wrestler_id   = src;

    -- School history and aliases
    UPDATE wrestler_school_history SET wrestler_id = tgt WHERE wrestler_id = src;
    UPDATE wrestler_name_aliases   SET wrestler_id = tgt WHERE wrestler_id = src;

    -- Individual rankings and upsets
    UPDATE individual_rankings SET wrestler_id = tgt WHERE wrestler_id = src;
    UPDATE individual_upsets   SET winner_id   = tgt WHERE winner_id   = src;
    UPDATE individual_upsets   SET loser_id    = tgt WHERE loser_id    = src;

    -- Snapshot streak state (computed — just drop stale source rows)
    DELETE FROM snapshot_streak_state WHERE wrestler_id = src;

    -- Roster import tracking
    UPDATE roster_grade_import SET wrestler_id = tgt WHERE wrestler_id = src;

    -- Fantasy bracket picks (user picks for wrong wrestler — remove)
    DELETE FROM bracket_picks WHERE pick_1st = src OR pick_2nd = src OR pick_3rd = src OR pick_4th = src;

    -- Misc
    UPDATE ms_wrestlers            SET hs_wrestler_id = tgt WHERE hs_wrestler_id = src;
    UPDATE hs_offseason_placements SET hs_wrestler_id = tgt WHERE hs_wrestler_id = src;
    DELETE FROM pending_wrestler_transfers WHERE wrestler_id = src;

    DELETE FROM wrestlers WHERE id = src;
  END LOOP;

END $$;
