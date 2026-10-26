-- docs/migrations/20261026_dual_meet_matches_wrestler_indexes.sql
--
-- Wrestler profile dual-match lookups filter on
-- (wrestler_a_id = X OR wrestler_b_id = X). Neither column was indexed on
-- dual_meet_matches or dual_meet_matches_girls (only id and dual_meet_id), so
-- every profile view did a full table scan: ~100k boys calls at ~140 ms
-- (~6B rows read) and ~32k girls calls at ~99 ms. This triggered Supabase's
-- Disk IO budget warning. Separate single-column indexes let Postgres combine
-- both sides of the OR with a BitmapOr.
--
-- Also refreshes planner stats; pg_stat_user_tables showed n_live_tup = 0 on
-- dual_meet_matches, tournament_entries and matches.
--
-- Run in the Supabase SQL editor.

CREATE INDEX IF NOT EXISTS idx_dmm_wrestler_a       ON public.dual_meet_matches       (wrestler_a_id);
CREATE INDEX IF NOT EXISTS idx_dmm_wrestler_b       ON public.dual_meet_matches       (wrestler_b_id);
CREATE INDEX IF NOT EXISTS idx_dmm_girls_wrestler_a ON public.dual_meet_matches_girls (wrestler_a_id);
CREATE INDEX IF NOT EXISTS idx_dmm_girls_wrestler_b ON public.dual_meet_matches_girls (wrestler_b_id);

ANALYZE public.dual_meet_matches;
ANALYZE public.dual_meet_matches_girls;
ANALYZE public.tournament_entries;
ANALYZE public.matches;

-- ROLLBACK
-- DROP INDEX IF EXISTS public.idx_dmm_wrestler_a;
-- DROP INDEX IF EXISTS public.idx_dmm_wrestler_b;
-- DROP INDEX IF EXISTS public.idx_dmm_girls_wrestler_a;
-- DROP INDEX IF EXISTS public.idx_dmm_girls_wrestler_b;
