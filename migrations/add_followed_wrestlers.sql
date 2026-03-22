-- Add followed_wrestler_ids column to public.users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS followed_wrestler_ids uuid[] DEFAULT '{}';
