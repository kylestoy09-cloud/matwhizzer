-- ============================================================
-- School co-op consolidation
-- Season 1 = 2024-25, Season 2 = 2025-26
--
-- Policy:
--   Always-combo schools: keep the combined record as the only entity
--   Two programs that joined: primary school gets the combined name,
--     secondary is marked inactive per season
--   No program should have 3 records (A + B + A/B)
-- ============================================================

-- ── 1. Update display names to reflect co-op partnerships ────
-- These are on the schools row (shared identity), so affects both boys + girls display

UPDATE schools SET display_name = 'Emerson/Park Ridge'          WHERE id = 3;
UPDATE schools SET display_name = 'Newton/Kittatinny'           WHERE id = 24;
UPDATE schools SET display_name = 'Demarest/Old Tappan'         WHERE id = 314;
UPDATE schools SET display_name = 'Lenape Valley/Hopatcong'     WHERE id = 62;
UPDATE schools SET display_name = 'Morris Hills/Morris Knolls'  WHERE id = 76;
UPDATE schools SET display_name = 'Becton/Wood-Ridge'           WHERE id = 321;
UPDATE schools SET display_name = 'Leonia/Palisades'            WHERE id = 44;
UPDATE schools SET display_name = 'Lyndhurst/North Arlington'   WHERE id = 83;
UPDATE schools SET display_name = 'Mt. Olive/Randolph'          WHERE id = 56;
UPDATE schools SET display_name = 'Parsippany Hills/Parsippany' WHERE id = 78;
UPDATE schools SET display_name = 'Brearley/Dayton'             WHERE id = 130;
UPDATE schools SET display_name = 'Middlesex/Dunellen'          WHERE id = 383;

-- ── 2. Inactive season records ────────────────────────────────

-- Permanently inactive (all seasons) — merged/absorbed into primary school
INSERT INTO inactive_school_seasons (school_id, season_id) VALUES
  (315, 1), (315, 2),  -- Kittatinny: permanently part of Newton (24)
  (77,  1), (77,  2),  -- Morris Knolls: always was Morris Hills/Morris Knolls co-op
  (385, 1), (385, 2),  -- Morris Hills-Morris Knolls combined record: retired, data → 76
  (372, 1), (372, 2),  -- Jefferson-Sparta combined record: retired, data → 4
  (392, 1), (392, 2),  -- Ramsey/Northern Highlands combined record: retired, data → 18
  (365, 1), (365, 2),  -- Cliffside Park combo school: retired, data → 364
  (357, 1)             -- Ridgefield Memorial (357): first season is 2025-26, didn't exist in 2024-25
ON CONFLICT DO NOTHING;

-- Inactive for 2025-26 (season 2) only — co-op formed this season
INSERT INTO inactive_school_seasons (school_id, season_id) VALUES
  (26,  2),  -- Sparta: co-oped into Jefferson (4) for 2025-26
  (35,  2),  -- Northern Highlands: co-oped into Ramsey (18) for 2025-26
  (6,   2),  -- Old Tappan: co-oped into Demarest (314) for 2025-26
  (87,  2),  -- Randolph: co-oped into Mt. Olive/school 56 for 2025-26
  (64,  2)   -- Parsippany: co-oped into Parsippany Hills (78) for 2025-26
ON CONFLICT DO NOTHING;
