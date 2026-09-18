-- Merge Joe Gray (duplicate/nickname) into Joseph Gray (canonical) at Gloucester (school_id 259).
-- Both appear at 113 lbs. "Joe" is a nickname entry; "Joseph" is the full legal name and was
-- imported first. Joe has 1 tournament_bout ref; Joseph has 1.
--   KEEP:   5018885f-c900-4825-ad2c-f6a411af8bde  (Joseph Gray — 1 tournament_bout)
--   DELETE: 4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913  (Joe Gray    — 1 tournament_bout, 0 elsewhere)

BEGIN;

UPDATE public.tournament_bouts
SET wrestler1_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler1_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.tournament_bouts
SET wrestler2_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler2_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.dual_meet_matches
SET wrestler_a_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler_a_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.dual_meet_matches
SET wrestler_b_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler_b_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.dual_meet_matches
SET winner_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE winner_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.tournament_entries
SET wrestler_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

UPDATE public.tournament_placements
SET wrestler_id = '5018885f-c900-4825-ad2c-f6a411af8bde'
WHERE wrestler_id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

DELETE FROM public.wrestlers
WHERE id = '4ee0ed1f-ae4a-4ef0-81ac-32cd483b0913';

COMMIT;
