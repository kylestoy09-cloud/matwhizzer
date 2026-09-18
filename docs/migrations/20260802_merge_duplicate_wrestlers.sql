-- Merge duplicate wrestler records for Rocco Angelucci and Semaj Trotman.
-- tournament_bouts.wrestler1_id / wrestler2_id carry FK refs via a constraint
-- named nj_wrestler1_id_fkey (column was renamed; constraint kept old name).
-- Initial ref-check missed these because the wrong column name was queried.

-- Rocco Angelucci
--   KEEP:   44fd2e4d-9655-43f8-9e4f-37c926fea7b7  (1 dual_meet_match, 2 tournament_bouts as w2)
--   DELETE: c7e95b52-a0ae-4b4c-b1e0-098b8266eca3  (3 tournament_bouts refs — must remap first)

-- Semaj Trotman
--   KEEP:   043e30a5-9bb2-458b-aa23-d7ac55f2c544  (1 dual_meet_match)
--   DELETE: 99bcae59-ca2e-4bb6-9e07-a215585255d6  (2 tournament_bouts refs — must remap first)

BEGIN;

-- ── Rocco Angelucci: remap c7e95b52 → 44fd2e4d ──────────────────────────────
UPDATE public.tournament_bouts
SET wrestler1_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler1_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.tournament_bouts
SET wrestler2_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler2_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.dual_meet_matches
SET wrestler_a_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler_a_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.dual_meet_matches
SET wrestler_b_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler_b_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.dual_meet_matches
SET winner_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE winner_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.tournament_entries
SET wrestler_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

-- ── Semaj Trotman: remap 99bcae59 → 043e30a5 ────────────────────────────────
UPDATE public.tournament_bouts
SET wrestler1_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler1_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.tournament_bouts
SET wrestler2_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler2_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.dual_meet_matches
SET wrestler_a_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler_a_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.dual_meet_matches
SET wrestler_b_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler_b_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.dual_meet_matches
SET winner_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE winner_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.tournament_entries
SET wrestler_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

UPDATE public.tournament_placements
SET wrestler_id = '44fd2e4d-9655-43f8-9e4f-37c926fea7b7'
WHERE wrestler_id = 'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3';

UPDATE public.tournament_placements
SET wrestler_id = '043e30a5-9bb2-458b-aa23-d7ac55f2c544'
WHERE wrestler_id = '99bcae59-ca2e-4bb6-9e07-a215585255d6';

-- ── Delete both stubs (all FK refs remapped above) ──────────────────────────
DELETE FROM public.wrestlers
WHERE id IN (
  'c7e95b52-a0ae-4b4c-b1e0-098b8266eca3',  -- Rocco Angelucci stub
  '99bcae59-ca2e-4bb6-9e07-a215585255d6'   -- Semaj Trotman stub
);

COMMIT;
