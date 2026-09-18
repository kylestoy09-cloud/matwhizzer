-- Schools flagged for manual roster review via grade import.
-- These have system wrestlers with no plausible import match (score < 0.3),
-- indicating either stale aliases or a source mismatch.
-- Skipped by the microcheck engine for roster_match tasks.

CREATE TABLE IF NOT EXISTS public.microcheck_roster_flags (
  school_id     integer     PRIMARY KEY,
  gender        char(1)     NOT NULL DEFAULT 'M',
  suspect_count integer     NOT NULL DEFAULT 0,
  resolved      boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.microcheck_roster_flags TO authenticated, service_role;
GRANT SELECT ON TABLE public.microcheck_roster_flags TO anon;

-- Flagged schools from 2026-09-16 analysis (boys, true misses score < 0.3)
INSERT INTO public.microcheck_roster_flags (school_id, gender, suspect_count) VALUES
  (197, 'M', 18),  -- Christian Brothers
  (43,  'M', 12),  -- Hackensack
  (259, 'M',  9),  -- Gloucester
  (89,  'M',  6),  -- Mendham
  (52,  'M',  3),  -- Fair Lawn
  (61,  'M',  3),  -- Dover
  (310, 'M',  2),  -- Penns Grove
  (2,   'M',  1),  -- Dumont
  (57,  'M',  1),  -- Paramus
  (75,  'M',  1),  -- Montville
  (97,  'M',  1),  -- Secaucus
  (112, 'M',  1),  -- Hackettstown
  (120, 'M',  1),  -- Bayonne
  (262, 'M',  1)   -- Palmyra
ON CONFLICT (school_id) DO NOTHING;
