-- Add Athletic Director contact fields to schools
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS ad_name  text,
  ADD COLUMN IF NOT EXISTS ad_email text;

COMMENT ON COLUMN public.schools.ad_name  IS 'Athletic Director name';
COMMENT ON COLUMN public.schools.ad_email IS 'Athletic Director email';
