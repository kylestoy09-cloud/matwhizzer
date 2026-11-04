-- Roster grade import: mark a school's roster review complete (2026-11-04)
--
-- The school list showed "Review" only when every Track roster row for the school had been
-- matched. Track rosters list wrestlers with no profile here; those rows can't be matched
-- and stay 'school_matched' as the grade pool (src/lib/rosterPool.ts reads them by status),
-- so most schools never left "Match Wrestlers" even when the review was finished.
-- This table holds the admin's own "this school is complete" mark, per school, roster
-- season and gender. Roster rows are not touched.
-- Read and written only by /api/admin/roster-grade-import{,-girls}/complete (service role).

CREATE TABLE IF NOT EXISTS public.roster_grade_school_complete (
  school_id    integer     NOT NULL REFERENCES public.schools(id),
  season_id    integer     NOT NULL,
  gender       text        NOT NULL CHECK (gender IN ('M', 'F')),
  completed_at timestamptz NOT NULL DEFAULT now(),
  completed_by text,
  PRIMARY KEY (school_id, season_id, gender)
);

ALTER TABLE public.roster_grade_school_complete ENABLE ROW LEVEL SECURITY;
-- no policies: only the service role (admin API routes) reads or writes it

-- Schools that already showed "Review" (no pending or school_matched rows left for the
-- 2025-26 roster season) start out complete, so the list looks the same on day one.
-- Today: 297 of 311 boys schools, 71 of 253 girls schools.
INSERT INTO public.roster_grade_school_complete (school_id, season_id, gender, completed_by)
SELECT school_id, season_id, gender::text, 'backfill 20261104: nothing left to match'
FROM public.roster_grade_import
WHERE season_id = 2026 AND school_id IS NOT NULL
GROUP BY school_id, season_id, gender
HAVING count(*) FILTER (WHERE status IN ('pending', 'school_matched')) = 0
ON CONFLICT DO NOTHING;

-- ROLLBACK: DROP TABLE public.roster_grade_school_complete;
