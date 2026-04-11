-- Add followed_wrestler_ids column to public.users
-- APPLIED: 2026-03-22
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS followed_wrestler_ids uuid[] DEFAULT '{}';

-- ROLLBACK:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS followed_wrestler_ids;
