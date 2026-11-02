-- Track roster players are kept and advanced every year (2026-11-01).
-- roster_grade_import rows not tied to one of our wrestlers stay on file, so a grade
-- is ready when the player shows up in a match upload. Roll Over Roster advances them
-- with the wrestlers (grade + 1, season + 1); seniors become 'graduated', kept for
-- history and never suggested. This adds that status, and a place on dual import drafts
-- for the grade chosen in the import review.
-- Also records the girls step 1 run on 2026-11-01: all 2,876 girls rows linked to their
-- schools (253 school names, all exact matches) by scripts/link_girls_roster_schools.mts.
DO $$
DECLARE
  c record;
BEGIN
  -- The status check was declared inline, so find it by what it checks rather than by name
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.roster_grade_import'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.roster_grade_import DROP CONSTRAINT %I', c.conname);
  END LOOP;
  ALTER TABLE public.roster_grade_import ADD CONSTRAINT roster_grade_import_status_check
    CHECK (status IN ('pending', 'school_matched', 'wrestler_matched', 'confirmed', 'no_match', 'skipped', 'graduated'));

  -- Grade choices made in the dual import review, saved with the draft:
  -- { "<raw name>|<school id>": { "grade": "Jr" | null, "rosterId": "<roster row id>" | null } }
  ALTER TABLE public.dual_import_drafts ADD COLUMN IF NOT EXISTS grade_choices jsonb NOT NULL DEFAULT '{}';
END $$;

SELECT pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'public.roster_grade_import'::regclass AND conname = 'roster_grade_import_status_check';
