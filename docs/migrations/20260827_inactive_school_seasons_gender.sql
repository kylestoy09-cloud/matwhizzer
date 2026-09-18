-- Migration: Add gender to inactive_school_seasons; fix school_coops gender inconsistency
-- Date: 2026-08-27
-- Reason: inactive_school_seasons had no gender column, making it impossible to distinguish
--         boys vs girls enrollment status. school_coops used 'B' for boys instead of 'M'.

-- ── 1. Fix school_coops: 'B' → 'M' ───────────────────────────────────────────

UPDATE public.school_coops
SET gender = 'M'
WHERE gender = 'B';

ALTER TABLE public.school_coops
  DROP CONSTRAINT IF EXISTS school_coops_gender_check;

ALTER TABLE public.school_coops
  ADD CONSTRAINT school_coops_gender_check
  CHECK (gender IN ('M', 'F'));

-- ── 2. Add gender column to inactive_school_seasons ──────────────────────────

ALTER TABLE public.inactive_school_seasons
  ADD COLUMN IF NOT EXISTS gender text;

-- ── 3. Backfill gender for coop member schools (authoritative via school_coops) ──

UPDATE public.inactive_school_seasons iss
SET gender = sc.gender
FROM public.school_coops sc
WHERE iss.school_id = sc.member_school_id
  AND iss.season_id = sc.season
  AND iss.gender IS NULL;

-- ── 4. Default remaining nulls to 'M' ────────────────────────────────────────
-- Existing entries without coop context were entered without gender distinction
-- and primarily relate to boys programs. Admin should review and correct any
-- that belong to girls programs.

UPDATE public.inactive_school_seasons
SET gender = 'M'
WHERE gender IS NULL;

-- ── 5. Enforce NOT NULL and check constraint ──────────────────────────────────

ALTER TABLE public.inactive_school_seasons
  ALTER COLUMN gender SET NOT NULL;

ALTER TABLE public.inactive_school_seasons
  DROP CONSTRAINT IF EXISTS inactive_school_seasons_gender_check;

ALTER TABLE public.inactive_school_seasons
  ADD CONSTRAINT inactive_school_seasons_gender_check
  CHECK (gender IN ('M', 'F'));

-- ── 6. Replace unique constraint to include gender ────────────────────────────
-- Old constraint was (school_id, season_id) — now (school_id, season_id, gender)
-- so a school can be inactive for boys but active for girls in the same season.

ALTER TABLE public.inactive_school_seasons
  DROP CONSTRAINT IF EXISTS inactive_school_seasons_school_id_season_id_key;

ALTER TABLE public.inactive_school_seasons
  ADD CONSTRAINT inactive_school_seasons_school_id_season_id_gender_key
  UNIQUE (school_id, season_id, gender);
