-- Whizzer Resume Rating bio editable from the admin (2026-10-31).
-- rating_settings holds text about the rating that admins edit on the Whizzer Resume
-- Rating page without touching code. 'blurb' is the bio shown under the rating's table
-- on the boys and girls Regular Season leaderboards. Code falls back to
-- src/lib/rating.ts (RATING_BLURB) when a row is missing.
DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS public.rating_settings (
    key         text        PRIMARY KEY,
    value       text        NOT NULL,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    updated_by  text
  );

  INSERT INTO public.rating_settings (key, value) VALUES (
    'blurb',
    'The Whizzer Resume Rating rates what a wrestler has accomplished — who they beat, the tournaments they placed in and their postseason finish, weighted toward the last 20 matches. It rates the past, not who would win next.'
  ) ON CONFLICT (key) DO NOTHING;
END $$;

ALTER TABLE public.rating_settings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.rating_settings TO service_role;

SELECT key, value FROM public.rating_settings;
