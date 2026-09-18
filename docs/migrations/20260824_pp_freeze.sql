-- Step 15: Power Points freeze support
-- Adds frozen_power_points column to power_points table and a pp_freeze_log table.
-- When the admin freezes PP for a season/gender, frozen_power_points is populated
-- from the live power_points value. All live-site displays then read the frozen
-- value (if set) instead of recalculating from the live column.

-- 1. Add frozen column to power_points
ALTER TABLE power_points
  ADD COLUMN IF NOT EXISTS frozen_power_points numeric;

COMMENT ON COLUMN power_points.frozen_power_points
  IS 'Immutable snapshot written at freeze time. When not null, all public displays must read this value instead of the live power_points column.';

-- 2. Freeze log table
CREATE TABLE IF NOT EXISTS pp_freeze_log (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id    integer     NOT NULL REFERENCES seasons(id),
  gender       text        NOT NULL CHECK (gender IN ('M', 'F')),
  frozen_at    timestamptz NOT NULL DEFAULT now(),
  frozen_by    text        NOT NULL,
  school_count integer     NOT NULL DEFAULT 0,
  before_state jsonb       NOT NULL DEFAULT '[]'
);

GRANT SELECT ON pp_freeze_log TO anon, authenticated;
GRANT ALL   ON pp_freeze_log TO service_role;
