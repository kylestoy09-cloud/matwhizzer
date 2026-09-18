-- docs/migrations/20260808_criteria_winner_school_id.sql
--
-- Adds criteria_winner_school_id to dual_meets to record the tiebreaker winner
-- when team1_score = team2_score. Winner determined by NJSIAA criteria:
-- most falls > most tech falls > most major decisions.
-- NULL = genuine draw (all criteria equal) or non-tied match.

ALTER TABLE dual_meets
  ADD COLUMN IF NOT EXISTS criteria_winner_school_id integer REFERENCES schools(id);

-- Team 1 wins (15 meets)
UPDATE dual_meets SET criteria_winner_school_id = team1_school_id
WHERE id IN (
  '42bd0d07-05cd-4953-b2bf-355740b3c6d8', -- Ramapo vs Middletown South
  '9990f622-5cce-45b0-a8aa-bee89b4761f3', -- Ridgefield Memorial vs South Hunterdon
  '8e73619b-0618-4b85-8e5c-4ec1ff6a734f', -- Mountain Lakes vs Lenape Valley
  'e0431ff1-e0ee-4259-a844-8d43d4fe725f', -- Kittatinny vs Ridge (falls 5-4)
  'cc393347-e59a-4cd8-8467-9462cb076d73', -- Lyndhurst vs Garfield (falls 6-4)
  '15a03fe4-9d90-42bf-9480-8464528c417c', -- Lodi/Saddle Brook vs Lyndhurst (falls 2-1)
  '25c33521-cbac-4e23-84c7-87e6266d1dbf', -- Riverside vs Willingboro (falls 3-1)
  '174cb660-dbd4-4aa5-a239-2e1429443ad9', -- Point Pleasant Boro vs Manasquan (falls 5-3)
  '7468f5ec-67f3-4030-9718-c2c91c332a2c', -- Summit vs New Providence (falls 4-3)
  'e5d6e894-1912-4fe0-88f5-0436d10ea06c', -- Watchung Hills vs Westfield (falls 5-1)
  'c778953f-1aca-4dec-9a94-54cca95ffbc9', -- North Star Academy vs Rutgers Prep (falls 3-2)
  'b495b668-b78c-411c-a0b9-d387d4c71484', -- Absegami vs Clayton (falls 5-4)
  '7dfec3f2-238c-49fe-9c23-0f7f8bc21d3e', -- Union City vs Bayonne (falls 4-3)
  'a5594caf-6798-4ec7-b812-0d12a92e533c', -- Cranford vs Morris Hills (falls 4-2)
  '8ed89e84-b078-4afb-98ee-923076da1b0e'  -- Pioneer Academy vs College Achieve Paterson (falls 1-0)
);

-- Team 2 wins (11 meets)
UPDATE dual_meets SET criteria_winner_school_id = team2_school_id
WHERE id IN (
  '72173593-ded6-4d7d-9aaa-e87f352ca8e8', -- Highland Park vs Pingry
  '9920ebf9-5344-496a-9019-3edf3be41b43', -- Gateway Reg/Woodbury vs Hammonton (falls 1-6)
  '102ead4a-5c83-4294-a57f-cba0b8d070ac', -- Ocean Township vs Robbinsville (falls 4-5)
  'dd28b436-ff47-4dc0-8d9d-c2ef3b0da3dc', -- Ridgefield Memorial vs Dwight Morrow (falls 5-6)
  'e9bf93bb-6bc0-4a11-aceb-9eb109ae1461', -- Brick Township vs Manalapan (TF 1-2)
  '150d3aac-978e-4118-b0fd-f1735b276b41', -- Keansburg vs West Orange (falls 3-4)
  '28bc5141-9be6-45ab-8c0d-8c1e46bae72f', -- Saint John Vianney vs Brick Memorial (falls 4-6)
  '4a517d46-9167-409e-bc44-ffa6df3e8009', -- Ocean Township vs Colts Neck (falls 4-5)
  'e2270193-91d5-4259-ad2b-f35b938fe127', -- New Milford vs Indian Hills (falls 1-5)
  '6eba0d82-8877-4941-8002-4a72db6c98b0', -- Nottingham vs Bordentown Regional/Florence (falls 3-4)
  '0a6edd13-c7da-4b06-81a7-564fb9289dbd'  -- Mahwah vs Pequannock (falls 2-3)
);
