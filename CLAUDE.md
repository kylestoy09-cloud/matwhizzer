# MatWhizzer — Claude Code Rules

## Database Schema Changes

**NEVER make schema changes directly in the Supabase dashboard.**

All schema changes (ALTER TABLE, CREATE TABLE, new columns, indexes, RLS policies) must:

1. Have a `.sql` file in `/docs/migrations/` (filename: `YYYYMMDD_description.sql`)
2. Be logged in `/docs/db_changelog.md` using the standard format before or at the time they ship

If a change was made in the dashboard with no migration file, create the equivalent `.sql` retroactively and mark it `RECONSTRUCTED` in the changelog.

**No DB change ships without both a migration file and a changelog entry.**

## Deleting Data

**Never delete a school, wrestler, tournament entry, match, bout, dual meet or placement on the assumption that it is empty or orphaned.** Before any such delete:

1. Count the rows that reference it in every table that points at it, for both genders and all seasons, and show the counts.
2. Save the full rows that will be deleted to `docs/migrations/backups/`.
3. Get explicit approval for the delete with those counts in hand.

**A foreign-key error on a delete is proof the record has real data. Stop and report what is attached. Never add DELETE statements for the referencing tables to get past it.** The default for an unwanted school or wrestler that has data is to hide or re-point it (`is_nj = false`, merge), not to delete it. On 2026-09-17, deleting school 381 (Mary Help of Christians Academy) this way erased a state-placing wrestler's whole season (Kayla Coletta).

**Boys `precomputed_team_scores` refresh themselves** (20260921_team_score_cache_auto_refresh.sql): triggers on `tournament_entries` / `matches` mark the season dirty and pg_cron rebuilds it within 5 minutes via `refresh_boys_team_score_cache(season)`; run that function directly for an immediate refresh. **Girls rows still do NOT auto-recompute** — the rest of this note applies to them. `top_postseason_team_scores` reads ONLY from this cache table — deleting rows removes schools from the leaderboard permanently until rows are re-inserted. To refresh after a school merge or data change: delete the stale rows, then re-insert by calling the scoring RPCs (`district_team_score`, `girls_region_team_score`, `state_team_score`) for the affected season/gender and inserting results. See `20260720_rescue_girls_precomputed_team_scores.sql` for a template. `update_team_scoring.py` only recreates RPC functions; it does not repopulate the table.
