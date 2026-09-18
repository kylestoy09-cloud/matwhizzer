-- ─────────────────────────────────────────────────────────────────────────────
-- docs/migrations/20260827_hammer_score_config.sql
--
-- Hammer score formula configuration table.
--
-- Stores every tunable parameter of the hammer score formula as a JSONB blob,
-- keyed by gender + season. Multiple named drafts can exist; exactly one row
-- per gender/season has is_active = true, which is what the recalculation
-- script and preview endpoint read.
--
-- Apply in Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE public.hammer_score_config (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gender      text        NOT NULL CHECK (gender IN ('M', 'F')),
  season      text        NOT NULL,
  name        text        NOT NULL DEFAULT 'Default',
  is_active   boolean     NOT NULL DEFAULT false,
  config      jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only one active config per gender/season at a time
CREATE UNIQUE INDEX hammer_score_config_active_idx
  ON public.hammer_score_config (gender, season)
  WHERE is_active = true;

-- RLS
ALTER TABLE public.hammer_score_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read hammer_score_config"
  ON public.hammer_score_config FOR SELECT USING (true);

CREATE POLICY "Service role write hammer_score_config"
  ON public.hammer_score_config FOR ALL USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: active configs for both genders, 2025-26 season.
-- Values match the current hardcoded formula exactly.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.hammer_score_config (gender, season, name, is_active, config)
VALUES
  ('M', '2025-26', 'Default', true, '{
    "matches": {
      "group_weights": { "a": 8, "b": 6, "c": 4, "d": 2 },
      "fall_time_buckets_seconds": [60, 120, 180, 240, 300],
      "expected_outcome_thresholds": [38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 17, 13, 9, 5],
      "score_rates": {
        "favored_better_per_tier": 0.25,
        "favored_worse_per_tier": 4,
        "favored_loss_to_ot_per_tier": 4,
        "favored_loss_past_ot_per_tier": 0.5,
        "underdog_better_per_tier": 4,
        "underdog_upset_per_tier": 0.5,
        "underdog_worse_per_tier": 0.25,
        "cap_diff": 40
      },
      "weight_class_adjustment": {
        "up_per_class": 8,
        "down_per_class": 6
      },
      "oos_bands": {
        "tier_20":    { "lo": 50, "hi": 90 },
        "tier_15":    { "lo": 40, "hi": 75 },
        "tier_other": { "lo": 10, "hi": 30 }
      },
      "bootstrap_multiplier": 2,
      "ps_elevation_threshold": 16
    },
    "tournaments": {
      "place_points": {
        "20": { "1": 20, "2": 19, "3": 18, "4": 17, "5": 16, "6": 15, "7": 14, "8": 13 },
        "15": { "1": 15, "2": 14, "3": 13, "4": 12, "5": 11, "6": 10, "7":  9, "8":  8 },
        "10": { "1": 10, "2":  9, "3":  8, "4":  7, "5":  0, "6":  0, "7":  0, "8":  0 },
        "5":  { "1":  5, "2":  3, "3":  1, "4":  0, "5":  0, "6":  0, "7":  0, "8":  0 },
        "1":  { "1":  1, "2":  0, "3":  0, "4":  0, "5":  0, "6":  0, "7":  0, "8":  0 }
      },
      "exclude_winner_below_avg": true,
      "component_ceiling": 20
    },
    "postseason": {
      "state": {
        "place_1": 50,
        "place_2": 49,
        "place_3_4": 48,
        "place_5_6": 47,
        "place_7_8": 46,
        "wins_3plus": 40,
        "wins_2": 38,
        "wins_1": 36,
        "wins_0": 32
      },
      "district": {
        "champion":  20,
        "runner_up": 16,
        "third":     10,
        "entry":      4
      },
      "component_ceiling": 50
    },
    "component_ceilings": {
      "postseason": 50,
      "tournament": 20,
      "match": 30
    }
  }'),
  ('F', '2025-26', 'Default', true, '{
    "matches": {
      "group_weights": { "a": 8, "b": 6, "c": 4, "d": 2 },
      "fall_time_buckets_seconds": [60, 120, 180, 240, 300],
      "expected_outcome_thresholds": [38, 36, 34, 32, 30, 28, 26, 24, 22, 20, 18, 17, 13, 9, 5],
      "score_rates": {
        "favored_better_per_tier": 0.25,
        "favored_worse_per_tier": 4,
        "favored_loss_to_ot_per_tier": 4,
        "favored_loss_past_ot_per_tier": 0.5,
        "underdog_better_per_tier": 4,
        "underdog_upset_per_tier": 0.5,
        "underdog_worse_per_tier": 0.25,
        "cap_diff": 40
      },
      "weight_class_adjustment": {
        "up_per_class": 8,
        "down_per_class": 6
      },
      "oos_bands": {
        "tier_20":    { "lo": 50, "hi": 90 },
        "tier_15":    { "lo": 40, "hi": 75 },
        "tier_other": { "lo": 10, "hi": 30 }
      },
      "bootstrap_multiplier": 2,
      "ps_elevation_threshold": 16
    },
    "tournaments": {
      "place_points": {
        "20": { "1": 20, "2": 19, "3": 18, "4": 17, "5": 16, "6": 15, "7": 14, "8": 13 },
        "15": { "1": 15, "2": 14, "3": 13, "4": 12, "5": 11, "6": 10, "7":  9, "8":  8 },
        "10": { "1": 10, "2":  9, "3":  8, "4":  7, "5":  0, "6":  0, "7":  0, "8":  0 },
        "5":  { "1":  5, "2":  3, "3":  1, "4":  0, "5":  0, "6":  0, "7":  0, "8":  0 },
        "1":  { "1":  1, "2":  0, "3":  0, "4":  0, "5":  0, "6":  0, "7":  0, "8":  0 }
      },
      "exclude_winner_below_avg": true,
      "component_ceiling": 20
    },
    "postseason": {
      "state": {
        "place_1": 50,
        "place_2": 49,
        "place_3_4": 48,
        "place_5_6": 47,
        "place_7_8": 46,
        "wins_3plus": 40,
        "wins_2": 38,
        "wins_1": 36,
        "wins_0": 32
      },
      "district": {
        "champion":  20,
        "runner_up": 16,
        "third":     10,
        "entry":      4
      },
      "component_ceiling": 50
    },
    "component_ceilings": {
      "postseason": 50,
      "tournament": 20,
      "match": 30
    }
  }');
