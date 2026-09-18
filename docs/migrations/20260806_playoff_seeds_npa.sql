-- Expand playoff_seeds seed range to support NP-A 13-team bracket (seeds 1-13)
ALTER TABLE playoff_seeds DROP CONSTRAINT IF EXISTS playoff_seeds_seed_check;
ALTER TABLE playoff_seeds ADD CONSTRAINT playoff_seeds_seed_check CHECK (seed BETWEEN 1 AND 13);
