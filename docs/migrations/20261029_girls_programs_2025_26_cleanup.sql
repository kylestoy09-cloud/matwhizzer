-- Girls programs for 2025-26, lined up with the Track girls rosters (255 teams).
--
--   Abraham Clark (358), East Orange (111) — real girls teams (Track rosters,
--     girls duals) that had no girls_schools row. Added as girls programs.
--   Barringer (80), Penns Grove (310) — a girl or two on a Track roster but no
--     team. Added as girls programs and marked inactive for 2025-26.
--   Ramapo (17) — no girls roster on Track or here. Inactive for 2025-26.
--   Kittatinny (315) — wrestles as Newton/Kittatinny (24). Its 2025-26 girls
--     tournament entries (23) and girls team-score rows (districts, regions,
--     state) move to Newton; Kittatinny is inactive for girls 2025-26 (merged
--     into 24) and Newton's girls program is marked combined.
--
-- Nothing is deleted. Boys rows at 315 are untouched (filtered on gender F).
-- The 12 girls aliased at Kittatinny already have Newton aliases.
-- Before: tournament_entries at 315 for girls 2026 = 23; precomputed girls rows
-- at 315 for 2026 = ids 1672, 1198, 1410.

DO $$
DECLARE n int;
BEGIN
  INSERT INTO girls_schools (school_id, display_name, is_combined)
  SELECT v.school_id, v.display_name, false
  FROM (VALUES (358, 'Abraham Clark'), (111, 'East Orange'), (80, 'Barringer'), (310, 'Penns Grove')) AS v(school_id, display_name)
  WHERE NOT EXISTS (SELECT 1 FROM girls_schools g WHERE g.school_id = v.school_id);

  INSERT INTO inactive_school_seasons (school_id, season_id, gender, merged_into_school_id)
  SELECT v.school_id, 2026, 'F', v.merged
  FROM (VALUES (80, NULL::int), (310, NULL), (17, NULL), (315, 24)) AS v(school_id, merged)
  WHERE NOT EXISTS (SELECT 1 FROM inactive_school_seasons i
                    WHERE i.school_id = v.school_id AND i.season_id = 2026 AND i.gender = 'F');

  UPDATE girls_schools SET is_combined = true WHERE school_id = 24;

  UPDATE tournament_entries te SET school_id = 24
  FROM tournaments t
  WHERE te.tournament_id = t.id AND te.school_id = 315 AND t.gender = 'F' AND t.season_id = 2026;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 23 THEN RAISE EXCEPTION 'expected 23 girls 2026 entries at 315, got %', n; END IF;

  UPDATE precomputed_team_scores SET school_id = 24
  WHERE school_id = 315 AND season_id = 2026 AND tournament_type LIKE 'girls_%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'expected 3 girls 2026 team-score rows at 315, got %', n; END IF;
END $$;

-- Verify: expect 4 new programs, 4 inactive (17, 80, 310, 315→24), Newton combined,
-- 0 girls 2026 entries left at 315
SELECT g.school_id, g.display_name, g.is_combined, i.merged_into_school_id,
       (i.school_id IS NOT NULL) AS inactive_2026
FROM girls_schools g
LEFT JOIN inactive_school_seasons i ON i.school_id = g.school_id AND i.season_id = 2026 AND i.gender = 'F'
WHERE g.school_id IN (358, 111, 80, 310, 17, 315, 24)
ORDER BY g.school_id;

SELECT COUNT(*) AS girls_2026_entries_left_at_315
FROM tournament_entries te JOIN tournaments t ON t.id = te.tournament_id
WHERE te.school_id = 315 AND t.gender = 'F' AND t.season_id = 2026;
