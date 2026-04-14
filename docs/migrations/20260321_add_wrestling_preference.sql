-- Add wrestling_preference column to public.users
-- APPLIED: 2026-03-21
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS wrestling_preference text NOT NULL DEFAULT 'both'
CHECK (wrestling_preference IN ('boys', 'girls', 'both'));

-- Update the trigger to capture both primary_school_id and wrestling_preference
CREATE OR REPLACE FUNCTION public.handle_new_public_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;

-- ROLLBACK:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS wrestling_preference;
-- -- NOTE: The previous version of handle_new_public_user() is not stored here.
-- --       Restore it from git history: git show HEAD~1:migrations/add_wrestling_preference.sql
