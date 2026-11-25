-- docs/migrations/20261120_match_projections_edge.sql
--
-- Who gets a dead-even projection, per tracked bout (Kyle 2026-11-20: the home team in a dual, the lower seed at a
-- tournament — the site already does this; the Lever Lab and the tracker now do the same, so toss-ups go away there too).
--   edge  'a' | 'b' — the side of the bout (A = the higher WRR going in) that gets a dead-even projection:
--         dual meet       → the home slot (dual_meet_matches.wrestler_b — team 2, "Home" on the match card)
--         postseason      → the lower seed (the bigger seed number; unseeded counts lowest)
--         in-season tournament → the second-listed wrestler (no seeds stored), as on the site
-- New bouts get it from src/lib/projectionTrack.ts. Run in the Supabase SQL editor.

BEGIN;

ALTER TABLE match_projections ADD COLUMN IF NOT EXISTS edge text CHECK (edge IN ('a', 'b'));

-- duals: whichever side is in the home slot
UPDATE match_projections p SET edge = CASE WHEN p.wrestler_a_id = m.wrestler_b_id THEN 'a' ELSE 'b' END
FROM dual_meet_matches m WHERE p.gender = 'M' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;
UPDATE match_projections p SET edge = CASE WHEN p.wrestler_a_id = m.wrestler_b_id THEN 'a' ELSE 'b' END
FROM dual_meet_matches_girls m WHERE p.gender = 'F' AND p.match_source = 'dual_meet' AND m.id::text = p.source_id;

-- in-season tournaments: the second-listed wrestler
UPDATE match_projections p SET edge = CASE WHEN p.wrestler_a_id = b.wrestler2_id THEN 'a' ELSE 'b' END
FROM tournament_bouts b WHERE p.gender = 'M' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;
UPDATE match_projections p SET edge = CASE WHEN p.wrestler_a_id = b.wrestler2_id THEN 'a' ELSE 'b' END
FROM tournament_bouts_girls b WHERE p.gender = 'F' AND p.match_source = 'tournament_bout' AND b.id::text = p.source_id;

-- postseason: the lower seed (bigger number; unseeded = 999)
UPDATE match_projections p SET edge = CASE
    WHEN (CASE WHEN we.wrestler_id = p.wrestler_a_id THEN coalesce(we.seed, 999) ELSE coalesce(le.seed, 999) END)
       > (CASE WHEN we.wrestler_id = p.wrestler_a_id THEN coalesce(le.seed, 999) ELSE coalesce(we.seed, 999) END)
    THEN 'a' ELSE 'b' END
FROM matches m
JOIN tournament_entries we ON we.id = m.winner_entry_id
JOIN tournament_entries le ON le.id = m.loser_entry_id
WHERE p.match_source = 'postseason' AND m.id::text = p.source_id;

COMMIT;

-- Verify: every tracked bout has an edge, by source
SELECT gender, match_source, count(*) AS bouts, count(edge) AS with_edge FROM match_projections GROUP BY 1, 2 ORDER BY 1, 2;
