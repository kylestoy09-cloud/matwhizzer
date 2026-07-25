-- wrestler_name_aliases
-- Persists confirmed raw-name → wrestler_id mappings so future imports
-- resolve the same name at the same school to 'exact' confidence without
-- re-running fuzzy matching.
--
-- Populated automatically by import-meets route after each successful import.
-- One row per (raw_name, school_id) pair; on conflict the newest import wins.

CREATE TABLE IF NOT EXISTS public.wrestler_name_aliases (
  id          bigserial PRIMARY KEY,
  raw_name    text    NOT NULL,
  school_id   integer NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  wrestler_id uuid    NOT NULL REFERENCES public.wrestlers(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raw_name, school_id)
);

CREATE INDEX IF NOT EXISTS wrestler_name_aliases_school_idx
  ON public.wrestler_name_aliases (school_id);
