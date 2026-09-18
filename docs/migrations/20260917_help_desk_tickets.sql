-- Help Desk Tickets
-- Allows admins to log, track, and resolve site issues with optional screenshots.
--
-- NOTE: Also create a Supabase Storage bucket named 'ticket-attachments' (public: true)
-- in the Supabase Dashboard → Storage → New Bucket.

CREATE TABLE public.help_desk_tickets (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           timestamptz DEFAULT now() NOT NULL,
  description          text        NOT NULL,
  is_urgent            boolean     DEFAULT false NOT NULL,
  status               text        DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'resolved')),
  resolved_at          timestamptz,
  submitted_by_email   text        NOT NULL,
  submitted_by_name    text,
  screenshot_urls      text[]      DEFAULT '{}' NOT NULL
);

ALTER TABLE public.help_desk_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on help_desk_tickets"
  ON public.help_desk_tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
