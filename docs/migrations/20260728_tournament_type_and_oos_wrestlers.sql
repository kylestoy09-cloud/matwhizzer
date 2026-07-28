-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260728_tournament_type_and_oos_wrestlers.sql
--
-- 1. Add tournament_type to in_season_tournaments
--    Values: 'outside'        - NJ teams travel to another state's tournament
--            'inside_outside' - NJ host with mixed NJ + OOS teams
--            'inside'         - NJ host, all NJ participants
--
-- 2. Rename nj_wrestler1_id → wrestler1_id, nj_wrestler2_id → wrestler2_id
--    in tournament_bouts. These columns now hold ALL wrestler IDs (NJ + OOS),
--    not just NJ ones. Tables are empty so rename is safe.
--
-- 3. Rename nj_wrestler_id → wrestler_id in tournament_placements for the
--    same reason.
--
-- OOS schools: created as rows in public.schools with is_nj = false.
-- OOS wrestlers: created as rows in public.wrestlers with is_oos = true (new col).
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1. tournament_type ────────────────────────────────────────────────────────

ALTER TABLE public.in_season_tournaments
  ADD COLUMN IF NOT EXISTS tournament_type text
  CHECK (tournament_type IN ('outside', 'inside_outside', 'inside'));

-- ── 2. Rename wrestler ID columns in tournament_bouts ─────────────────────────

ALTER TABLE public.tournament_bouts
  RENAME COLUMN nj_wrestler1_id TO wrestler1_id;

ALTER TABLE public.tournament_bouts
  RENAME COLUMN nj_wrestler2_id TO wrestler2_id;

-- Recreate indexes under new names
DROP INDEX IF EXISTS public.idx_tournament_bouts_nj_wrestler1;
DROP INDEX IF EXISTS public.idx_tournament_bouts_nj_wrestler2;

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_wrestler1
  ON public.tournament_bouts (wrestler1_id);

CREATE INDEX IF NOT EXISTS idx_tournament_bouts_wrestler2
  ON public.tournament_bouts (wrestler2_id);

-- ── 3. Rename wrestler ID column in tournament_placements ─────────────────────

ALTER TABLE public.tournament_placements
  RENAME COLUMN nj_wrestler_id TO wrestler_id;

DROP INDEX IF EXISTS public.idx_tournament_placements_wrestler;

CREATE INDEX IF NOT EXISTS idx_tournament_placements_wrestler
  ON public.tournament_placements (wrestler_id);

-- ── 4. is_oos flag on wrestlers ───────────────────────────────────────────────
-- OOS wrestlers get real rows in wrestlers so they resolve for common-opponents
-- and match history queries. is_oos = true distinguishes them from NJ athletes.

ALTER TABLE public.wrestlers
  ADD COLUMN IF NOT EXISTS is_oos boolean NOT NULL DEFAULT false;

COMMIT;

-- ── ROLLBACK ──────────────────────────────────────────────────────────────────
--
-- BEGIN;
-- ALTER TABLE public.wrestlers DROP COLUMN IF EXISTS is_oos;
-- ALTER TABLE public.tournament_placements RENAME COLUMN wrestler_id TO nj_wrestler_id;
-- ALTER TABLE public.tournament_bouts RENAME COLUMN wrestler1_id TO nj_wrestler1_id;
-- ALTER TABLE public.tournament_bouts RENAME COLUMN wrestler2_id TO nj_wrestler2_id;
-- ALTER TABLE public.in_season_tournaments DROP COLUMN IF EXISTS tournament_type;
-- COMMIT;
-- ─────────────────────────────────────────────────────────────────────────────
