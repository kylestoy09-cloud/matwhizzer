-- docs/migrations/20261109_girls_d2_jimenez_entry.sql
--
-- Girls 2025-26 District 2, 120: Isabella Jimenez (Fair Lawn) has no entry, so her three bouts are missing.
-- Found by scripts/compare_girls_bracket_counts.mts. Two girls share the name: this is the Fair Lawn
-- profile 999466eb (13 Fair Lawn duals, class of 2029), split from the East Brunswick one (2c5cbb68,
-- District 7 138) on 2026-11-01. She had no District 2 entry then either, so nothing was lost in the split.
-- From the TrackWrestling export (Whizzer Upload/Match Data/2026 Girls District Data.py, District 2):
--   Champ. Round 1: bye (Round 1 byes are not stored for the 32-man girls districts)
--   Champ. Round 2: Isabella Jimenez (Fair Lawn) won by fall over Maya Espinosa (Boonton) (Fall 3:11)
--   Quarterfinal:   Noelanii Guzman Caban (Elmwood Park) won by fall over Isabella Jimenez (Fall 1:00)
--   Cons. Round 1:  Cristelle Fiestas (Passaic Co Tech-Voc) won by fall over Isabella Jimenez (Fall 5:14)
-- Entry fields follow the other District 2 120 entries (no seed; grade 9 / Fr for the class of 2029).
-- Run in the Supabase SQL editor.
-- ROLLBACK: DELETE FROM matches WHERE winner_entry_id = <new entry> OR loser_entry_id = <new entry>;
--           DELETE FROM tournament_entries WHERE id = <new entry>;  (the new id is printed by the NOTICE)

DO $$
DECLARE
  t_id   integer := 187;      -- Girl_s Districts District 2, 2025-26
  wc_id  integer := 70;       -- girls 120
  isa    uuid := '999466eb-f1c2-457a-a321-c1166e41f6e0';   -- Isabella Jimenez, Fair Lawn
  espin  uuid := '398981dd-91a3-469c-885a-11c96711c814';   -- Maya Espinosa (Boonton) entry
  guzman uuid := 'b31af868-6e64-45ee-941b-9c7dfc03d623';   -- Noelanii Guzman Caban (Elmwood Park) entry
  fiest  uuid := '51051ade-cc0c-4dbf-aaff-cd7aac1f7465';   -- Cristell Fiestas (Passaic Co Tech-Voc) entry
  e_id   uuid;
  n      integer;
BEGIN
  IF (SELECT name FROM tournaments WHERE id = t_id) <> 'Girl_s Districts District 2' THEN RAISE EXCEPTION 'tournament % is not Girls District 2', t_id; END IF;
  IF EXISTS (SELECT 1 FROM tournament_entries WHERE tournament_id = t_id AND wrestler_id = isa) THEN RAISE EXCEPTION 'she already has a District 2 entry'; END IF;
  SELECT count(*) INTO n FROM tournament_entries WHERE id IN (espin, guzman, fiest) AND tournament_id = t_id AND weight_class_id = wc_id;
  IF n <> 3 THEN RAISE EXCEPTION 'expected the 3 opponents in District 2 120, found %', n; END IF;

  INSERT INTO tournament_entries (wrestler_id, tournament_id, school_id, weight_class_id, seed, grade, grade_label, wins, losses, school_context_raw, team_points)
  VALUES (isa, t_id, 52, wc_id, NULL, 9, 'Fr', 0, 0, 'Fair Lawn', 0)
  RETURNING id INTO e_id;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
    (t_id, wc_id, 'championship', 'R2', e_id,   espin, 'FALL', NULL, NULL, 191, true),
    (t_id, wc_id, 'championship', 'QF', guzman, e_id,  'FALL', NULL, NULL,  60, true),
    (t_id, wc_id, 'consolation',  'C1', fiest,  e_id,  'FALL', NULL, NULL, 314, true);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 bouts, got %', n; END IF;
  RAISE NOTICE 'new entry %', e_id;
END $$;

-- Verify: her entry and three bouts
SELECT m.round, w1.last_name AS winner, w2.last_name AS loser, m.win_type, m.fall_time_seconds
FROM matches m
JOIN tournament_entries e1 ON e1.id = m.winner_entry_id JOIN wrestlers w1 ON w1.id = e1.wrestler_id
JOIN tournament_entries e2 ON e2.id = m.loser_entry_id  JOIN wrestlers w2 ON w2.id = e2.wrestler_id
WHERE m.tournament_id = 187 AND (e1.wrestler_id = '999466eb-f1c2-457a-a321-c1166e41f6e0' OR e2.wrestler_id = '999466eb-f1c2-457a-a321-c1166e41f6e0')
ORDER BY m.round;
