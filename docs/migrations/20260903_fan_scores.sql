-- Add optional match time to dual_meets
-- NULL means default to 18:00 Eastern when computing the fan-scoring window
ALTER TABLE dual_meets ADD COLUMN IF NOT EXISTS meet_time time;

-- Fan scoring table: stores a fan's scored bouts for a dual meet
CREATE TABLE IF NOT EXISTS fan_scores (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dual_meet_id   uuid        NOT NULL,
  bouts          jsonb       NOT NULL DEFAULT '[]',
  team_a_score   integer,
  team_b_score   integer,
  finalized_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dual_meet_id)
);

ALTER TABLE fan_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fan_scores_own_select" ON fan_scores FOR SELECT    TO authenticated USING  (user_id = auth.uid());
CREATE POLICY "fan_scores_own_insert" ON fan_scores FOR INSERT    TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fan_scores_own_update" ON fan_scores FOR UPDATE    TO authenticated USING  (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "fan_scores_own_delete" ON fan_scores FOR DELETE    TO authenticated USING  (user_id = auth.uid());

GRANT ALL ON fan_scores TO authenticated;
