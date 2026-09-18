-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260826_tournament_bracket_slots.sql
--
-- Bracket slot model for in-season tournaments.
--
-- One row per match position in a bracket for a given weight class.
-- A standard 8-man bracket produces 12 slots:
--   Slots 1-4  : QF  (quarterfinals)
--   Slots 5-6  : SF  (championship semis)
--   Slots 7-8  : CSF (consolation semis / "blood round")
--   Slot  9    : F   (finals)
--   Slot  10   : 3rd (third-place)
--   Slot  11   : 5th (fifth-place)
--   Slot  12   : 7th (seventh-place)
--
-- The advances_winner_to_slot / advances_loser_to_slot columns encode the
-- bracket routing so the UI can auto-advance wrestlers after results are entered.
--
-- Apply in Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.tournament_bracket_slots (
  id                        bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  in_season_tournament_id   uuid        NOT NULL REFERENCES public.in_season_tournaments(id) ON DELETE CASCADE,
  weight_class              int         NOT NULL,
  round_name                text        NOT NULL,  -- 'QF' | 'SF' | 'CSF' | 'F' | '3rd' | '5th' | '7th'
  slot_number               int         NOT NULL,  -- sequential within weight class (1-12 for 8-man)
  bracket_size              int         NOT NULL DEFAULT 8,  -- 4 | 8 | 16

  -- Top position (typically higher seed number)
  top_wrestler_id           uuid        REFERENCES public.wrestlers(id),
  top_name_raw              text,
  top_school_id             int         REFERENCES public.schools(id),
  top_seed                  int,

  -- Bottom position
  bottom_wrestler_id        uuid        REFERENCES public.wrestlers(id),
  bottom_name_raw           text,
  bottom_school_id          int         REFERENCES public.schools(id),
  bottom_seed               int,

  -- Result (populated as matches are played)
  winner_position           text        CHECK (winner_position IN ('top', 'bottom')),
  winner_wrestler_id        uuid        REFERENCES public.wrestlers(id),
  result_type               text,   -- 'fall' | 'decision' | 'major' | 'tech' | 'forfeit' | 'bye'
  result_detail             text,   -- fall time (e.g. "3:42") or decision score (e.g. "8-2")

  -- Bracket routing — stored at generation time, fixed for the bracket structure
  advances_winner_to_slot   int,    -- slot_number the winner moves to (null for terminal rounds)
  advances_loser_to_slot    int,    -- slot_number the loser moves to (null for terminal rounds)
  winner_is_top_in_next     boolean, -- whether winner occupies top position in the next slot
  loser_is_top_in_next      boolean,

  created_at                timestamptz DEFAULT now(),

  UNIQUE (in_season_tournament_id, weight_class, slot_number)
);

-- Fast lookup for a whole tournament's bracket
CREATE INDEX tournament_bracket_slots_tid_idx
  ON public.tournament_bracket_slots (in_season_tournament_id);

-- Fast lookup per weight class (most common read pattern)
CREATE INDEX tournament_bracket_slots_weight_idx
  ON public.tournament_bracket_slots (in_season_tournament_id, weight_class);

-- RLS: public read, service_role write
ALTER TABLE public.tournament_bracket_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read"
  ON public.tournament_bracket_slots FOR SELECT USING (true);

CREATE POLICY "Service write"
  ON public.tournament_bracket_slots FOR ALL TO service_role USING (true);

GRANT SELECT ON public.tournament_bracket_slots TO anon, authenticated;
GRANT ALL    ON public.tournament_bracket_slots TO service_role;

-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
-- DROP TABLE IF EXISTS public.tournament_bracket_slots;
