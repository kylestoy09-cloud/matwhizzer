-- 20260821_dedupe_matches_and_unique_constraints.sql
--
-- Removes duplicate match rows introduced by non-idempotent imports,
-- then adds unique constraints to prevent recurrence.
--
-- Duplicates found: 11 dual_meet_matches slots, 55 tournament_bouts.
-- Root cause: importer ran against same source data more than once with
-- no existence check before INSERT.

-- ── Step 1: Remove duplicate dual meet match slots ──────────────────────────
-- Within a single dual meet, each weight class should appear exactly once.
-- Keep the row with the most wrestler IDs filled in; on tie keep lowest UUID.

DELETE FROM dual_meet_matches
WHERE id IN (
    SELECT id FROM (
        SELECT m.id,
               ROW_NUMBER() OVER (
                   PARTITION BY m.dual_meet_id, m.weight_class
                   ORDER BY
                       (CASE WHEN m.wrestler_a_id IS NOT NULL THEN 1 ELSE 0 END +
                        CASE WHEN m.wrestler_b_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
                       m.id ASC
               ) AS rn
        FROM dual_meet_matches m
        JOIN dual_meets dm ON dm.id = m.dual_meet_id
        WHERE dm.season_id = 2 AND dm.gender = 'M'
    ) ranked
    WHERE rn > 1
);

-- ── Step 2: Remove duplicate tournament bouts ────────────────────────────────
-- Same two wrestlers, same weight, same round, same tournament, same score
-- = duplicate. Keep earliest created_at. LEAST/GREATEST normalises wrestler
-- slot ordering so swapped imports are caught too.

DELETE FROM tournament_bouts
WHERE id IN (
    SELECT id FROM (
        SELECT tb.id,
               ROW_NUMBER() OVER (
                   PARTITION BY
                       LEAST(tb.wrestler1_id::text, tb.wrestler2_id::text),
                       GREATEST(tb.wrestler1_id::text, tb.wrestler2_id::text),
                       tb.weight_class, tb.round, tb.in_season_tournament_id,
                       tb.winner_score, tb.loser_score
                   ORDER BY tb.created_at ASC
               ) AS rn
        FROM tournament_bouts tb
        JOIN in_season_tournaments ist ON ist.id = tb.in_season_tournament_id
        WHERE tb.wrestler1_id IS NOT NULL AND tb.wrestler2_id IS NOT NULL
          AND ist.season = '2025-26' AND ist.gender = 'M'
    ) ranked
    WHERE rn > 1
);

-- ── Step 3: Unique constraints to prevent future duplicates ─────────────────

-- One weight class per dual meet
ALTER TABLE dual_meet_matches
    ADD CONSTRAINT dmm_unique_weight_per_meet
    UNIQUE (dual_meet_id, weight_class);

-- One dual meet per school pair per date per season/gender
ALTER TABLE dual_meets
    ADD CONSTRAINT dm_unique_matchup
    UNIQUE (season_id, gender, team1_school_id, team2_school_id, meet_date);

-- One bout per wrestler pair per round per weight per tournament.
-- round differentiates a legitimate consolation rematch from a duplicate.
-- score (winner_score, loser_score) included so a genuinely different result
-- at the same round is not blocked (data error, but not a duplicate row).
ALTER TABLE tournament_bouts
    ADD CONSTRAINT tb_unique_bout
    UNIQUE (in_season_tournament_id, weight_class, round,
            wrestler1_id, wrestler2_id, winner_score, loser_score);
