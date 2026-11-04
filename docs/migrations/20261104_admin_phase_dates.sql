-- Admin phase dates per side and season (2026-11-04)
--
-- The admin dashboards (Preseason, Season, Postseason, Off Season) follow dates, but there was
-- no way to set them: boys read one hand-made admin_season_config row; girls had no dates (the
-- calendar guessed them from season_calendar events, the admin home followed the season stage).
-- This holds the four dates for each side and season, edited in the Calendar tool's Season Dates
-- panel. Off season = after postseason_end until the next season's preseason_start.
-- Admin dashboards only: what the public site shows still follows season_gender_state.
-- Read and written only by the service role (admin pages and /api/admin/phase-dates).

CREATE TABLE IF NOT EXISTS public.admin_phase_dates (
  season_id        integer     NOT NULL REFERENCES public.seasons(id),
  gender           text        NOT NULL CHECK (gender IN ('M', 'F')),
  preseason_start  date        NOT NULL,
  season_start     date        NOT NULL,
  postseason_start date        NOT NULL,
  postseason_end   date        NOT NULL,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       text,
  PRIMARY KEY (season_id, gender),
  CHECK (preseason_start < season_start AND season_start < postseason_start AND postseason_start <= postseason_end)
);

ALTER TABLE public.admin_phase_dates ENABLE ROW LEVEL SECURITY;
-- no policies: only the service role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_phase_dates TO service_role;

-- Boys 2026-27: the dates already in admin_season_config (its season_end is not used)
INSERT INTO public.admin_phase_dates (season_id, gender, preseason_start, season_start, postseason_start, postseason_end, updated_by)
SELECT s.id, 'M', c.preseason_start::date, c.season_start::date, c.postseason_start::date, c.postseason_end::date, 'from admin_season_config'
FROM public.admin_season_config c JOIN public.seasons s ON s.label = c.season_label
WHERE c.is_current
ON CONFLICT DO NOTHING;
-- Girls: none yet (girls 2026-27 dates are pending); until entered, girls keep today's behavior.

-- ROLLBACK: DROP TABLE public.admin_phase_dates;
