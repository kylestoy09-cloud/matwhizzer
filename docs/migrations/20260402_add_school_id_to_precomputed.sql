-- Add school_id to precomputed_team_scores for reliable joins
-- APPLIED: 2026-04-02
ALTER TABLE precomputed_team_scores ADD COLUMN IF NOT EXISTS school_id integer REFERENCES schools(id);

-- Populate school_id by matching school_name to schools.display_name
UPDATE precomputed_team_scores pts
SET school_id = s.id
FROM schools s
WHERE s.display_name = pts.school_name
AND pts.school_id IS NULL;

-- Fix the 4 unmatched names manually
UPDATE precomputed_team_scores SET school_id = (SELECT id FROM schools WHERE display_name = 'Eastside (Paterson)') WHERE school_name = 'Eastside ( Paterson)';
UPDATE precomputed_team_scores SET school_id = (SELECT id FROM schools WHERE display_name ILIKE 'Saint Joseph%Academy%' LIMIT 1) WHERE school_name = 'Saint Joseph?s Academy';
UPDATE precomputed_team_scores SET school_id = (SELECT id FROM schools WHERE display_name ILIKE 'St. Peter%Prep%' LIMIT 1) WHERE school_name = 'St. Peter`s Prep';
UPDATE precomputed_team_scores SET school_id = (SELECT id FROM schools WHERE display_name ILIKE 'West Windsor-Plainsboro N%' LIMIT 1) WHERE school_name = 'West Windsor-Plainsboro North';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_precomputed_team_scores_school_id ON precomputed_team_scores(school_id);
CREATE INDEX IF NOT EXISTS idx_precomputed_team_scores_school_season ON precomputed_team_scores(school_id, season_id);

-- ROLLBACK:
-- DROP INDEX IF EXISTS idx_precomputed_team_scores_school_season;
-- DROP INDEX IF EXISTS idx_precomputed_team_scores_school_id;
-- ALTER TABLE precomputed_team_scores DROP COLUMN IF EXISTS school_id;
