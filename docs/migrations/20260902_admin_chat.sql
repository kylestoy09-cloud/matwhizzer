-- Polls must exist before messages can reference them
CREATE TABLE IF NOT EXISTS admin_chat_polls (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email          text NOT NULL,
  question            text NOT NULL,
  options             jsonb NOT NULL DEFAULT '[]',
  allow_multiple_votes boolean NOT NULL DEFAULT false,
  is_pinned           boolean NOT NULL DEFAULT false,
  is_closed           boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_chat_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  content    text,
  photo_url  text,
  poll_id    uuid REFERENCES admin_chat_polls(id) ON DELETE SET NULL,
  is_pinned  boolean NOT NULL DEFAULT false,
  pinned_by  text,
  pinned_at  timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT has_content CHECK (content IS NOT NULL OR photo_url IS NOT NULL OR poll_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS admin_chat_poll_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id      uuid NOT NULL REFERENCES admin_chat_polls(id) ON DELETE CASCADE,
  user_email   text NOT NULL,
  option_index integer NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE admin_chat_polls      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON admin_chat_polls      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON admin_chat_messages   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON admin_chat_poll_votes FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON admin_chat_polls      TO authenticated, anon;
GRANT ALL ON admin_chat_messages   TO authenticated, anon;
GRANT ALL ON admin_chat_poll_votes TO authenticated, anon;

-- Real-time (messages + vote updates broadcast live)
ALTER TABLE admin_chat_messages   REPLICA IDENTITY FULL;
ALTER TABLE admin_chat_poll_votes REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE admin_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_chat_poll_votes;
