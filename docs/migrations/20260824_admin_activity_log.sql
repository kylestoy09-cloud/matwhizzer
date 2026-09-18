-- Admin activity log table
-- Tracks every meaningful admin action: imports, edits, publishes, recalculations.
-- Written once per action (or once per batch where noted); never updated after insert.

CREATE TABLE IF NOT EXISTS admin_activity_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email   text        NOT NULL,
  action        text        NOT NULL,          -- e.g. 'dual_meet_import', 'bracket_edit', 'scoring_run'
  entity_type   text        NOT NULL,          -- e.g. 'dual_meet', 'wrestler', 'tournament'
  entity_id     text        NULL,              -- UUID or integer PK of the affected record (null for batch ops)
  details       jsonb       NULL,              -- before/after values, batch counts, error info, etc.
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_log_admin_email_idx ON admin_activity_log (admin_email);
CREATE INDEX IF NOT EXISTS admin_activity_log_created_at_idx  ON admin_activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_activity_log_entity_idx      ON admin_activity_log (entity_type, entity_id);

-- Helper function — call this from any admin API route or server action.
-- Parameters mirror the table columns; entity_id and details are optional.
CREATE OR REPLACE FUNCTION log_admin_activity(
  p_admin_email text,
  p_action      text,
  p_entity_type text,
  p_entity_id   text    DEFAULT NULL,
  p_details     jsonb   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO admin_activity_log (admin_email, action, entity_type, entity_id, details)
  VALUES (p_admin_email, p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
