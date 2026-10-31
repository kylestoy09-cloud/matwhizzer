-- Microcheck task control (2026-10-31).
--
-- One combined queue for boys and girls, ordered by hand on the Task Order page:
--   microcheck_task_types  every kind of check, with its gender (NULL = shared school
--                          data, asked once for both programs), its place in the order,
--                          on/off, an optional "do next" pin and an optional list of
--                          schools to limit it to. Within a type, schools go A→Z.
--   microcheck_focus       single school + check pairs pushed to the front (from the
--                          Missing Data page); dealt before everything else.
--   microcheck_claims      a task handed to someone is held for them for 10 minutes so
--                          the next person who asks gets the next task.
-- microcheck_roster_flags is keyed by school only, so a school could not be flagged for
-- both genders: the key (still named microdose_roster_flags_pkey from before the rename)
-- becomes (school_id, gender).
-- microcheck_task_priority (the old two-row order) is no longer read.
DO $$
DECLARE
  pk_name text;
  pk_cols text[];
BEGIN
  CREATE TABLE IF NOT EXISTS public.microcheck_task_types (
    key         text        PRIMARY KEY,
    label       text        NOT NULL,
    gender      text        CHECK (gender IN ('M', 'F')),          -- NULL = shared school data
    source      text        NOT NULL CHECK (source IN ('school_field', 'queue')),
    field       text,                                               -- school_field: which field
    queue_type  text,                                               -- queue: microcheck_tasks.task_type
    sort_order  integer     NOT NULL DEFAULT 0,
    enabled     boolean     NOT NULL DEFAULT true,
    pinned_at   timestamptz,                                        -- set = "do next"
    school_ids  integer[],                                          -- set = only these schools
    updated_at  timestamptz NOT NULL DEFAULT now(),
    CHECK ((source = 'school_field' AND field IS NOT NULL) OR (source = 'queue' AND queue_type IS NOT NULL))
  );

  INSERT INTO public.microcheck_task_types (key, label, gender, source, field, queue_type, sort_order) VALUES
    ('girls_roster',      'Roster grades',            'F',  'school_field', 'roster_match',   NULL,             1),
    ('boys_roster',       'Roster grades',            'M',  'school_field', 'roster_match',   NULL,             2),
    ('address',           'School address',           NULL, 'school_field', 'address',        NULL,             3),
    ('website_url',       'Website',                  NULL, 'school_field', 'website_url',    NULL,             4),
    ('twitter_handle',    'Twitter / X',              NULL, 'school_field', 'twitter_handle', NULL,             5),
    ('facebook_url',      'Facebook',                 NULL, 'school_field', 'facebook_url',   NULL,             6),
    ('boys_coach_name',   'Head coach name',          'M',  'school_field', 'coach_name',     NULL,             7),
    ('boys_coach_email',  'Head coach email',         'M',  'school_field', 'coach_email',    NULL,             8),
    ('girls_coach_name',  'Head coach name',          'F',  'school_field', 'coach_name',     NULL,             9),
    ('girls_coach_email', 'Head coach email',         'F',  'school_field', 'coach_email',    NULL,            10),
    ('ad_name',           'Athletic director name',   NULL, 'school_field', 'ad_name',        NULL,            11),
    ('ad_email',          'Athletic director email',  NULL, 'school_field', 'ad_email',       NULL,            12),
    ('boys_ties',         'Tie resolution',           'M',  'queue',        NULL,             'tie_resolution', 13),
    ('girls_ties',        'Tie resolution',           'F',  'queue',        NULL,             'tie_resolution', 14)
  ON CONFLICT (key) DO NOTHING;

  CREATE TABLE IF NOT EXISTS public.microcheck_focus (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_key    text        NOT NULL REFERENCES public.microcheck_task_types(key) ON DELETE CASCADE,
    school_id   integer     NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    created_by  uuid,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (task_key, school_id)
  );

  CREATE TABLE IF NOT EXISTS public.microcheck_claims (
    claim_key   text        PRIMARY KEY,      -- '<task_key>:<school_id>' or 'queue:<microcheck_tasks.id>'
    claimed_by  uuid        NOT NULL,
    claimed_at  timestamptz NOT NULL DEFAULT now()
  );

  -- The key kept its pre-rename name, so find it by table rather than by name
  SELECT c.conname, array_agg(a.attname::text ORDER BY a.attname)
    INTO pk_name, pk_cols
  FROM pg_constraint c
  JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
  WHERE c.conrelid = 'public.microcheck_roster_flags'::regclass AND c.contype = 'p'
  GROUP BY c.conname;
  IF pk_cols IS DISTINCT FROM ARRAY['gender', 'school_id'] THEN
    IF pk_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.microcheck_roster_flags DROP CONSTRAINT %I', pk_name);
    END IF;
    ALTER TABLE public.microcheck_roster_flags ADD PRIMARY KEY (school_id, gender);
  END IF;
END $$;

ALTER TABLE public.microcheck_task_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microcheck_focus      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.microcheck_claims     ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.microcheck_task_types, public.microcheck_focus, public.microcheck_claims TO service_role;

-- Check: 14 task types, girls roster grades first
SELECT sort_order, key, label, gender FROM public.microcheck_task_types ORDER BY sort_order;
