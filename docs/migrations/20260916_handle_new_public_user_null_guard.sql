-- Fix handle_new_public_user trigger to not fail when username is NULL.
-- Admin invite flow creates auth users with no raw_user_meta_data username,
-- causing a NOT NULL constraint violation on public.users.username.
-- Guard: skip the insert entirely if username is absent (admin users have no public.users row).
-- APPLIED: 2026-09-16

CREATE OR REPLACE FUNCTION public.handle_new_public_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.raw_user_meta_data ->> 'username' IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.users (id, username, primary_school_id, wrestling_preference)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    (NEW.raw_user_meta_data ->> 'primary_school_id')::bigint,
    COALESCE(NEW.raw_user_meta_data ->> 'wrestling_preference', 'both')
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    primary_school_id = EXCLUDED.primary_school_id,
    wrestling_preference = EXCLUDED.wrestling_preference;
  RETURN NEW;
END;
$function$;
