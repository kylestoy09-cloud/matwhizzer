-- Fix handle_new_user trigger to not fail when a row already exists in app_users.
-- The admin invite flow explicitly upserts the correct role after inviteUserByEmail,
-- so the trigger's fan-row insert must be a no-op on conflict.
-- APPLIED: 2026-09-16

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  INSERT INTO public.app_users (id, role)
  VALUES (new.id, 'fan')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$function$;
