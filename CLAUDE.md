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

**Postseason team scores: the copied TrackWrestling standings are the TRUTH** (Kyle, 2026-11-05). `precomputed_team_scores` holds the official district / region / state team totals as TrackWrestling lists them, and that is what the site shows. The site's own formula (`district_team_score`, `girls_region_team_score`, `state_team_score` RPCs) exists so totals can eventually be calculated: it runs behind the scenes (admin-only comparison against the official figures) and must never write into that table or replace an official figure; a bout change must not change a stored total. A mismatch between calculated and official is a formula or data question to investigate, never a reason to overwrite the official number. The one approved correction (Kyle, 2026-11-06): TrackWrestling's "TF-1" tech falls were scored with a 1-point bonus instead of 1.5 (a scoring-table input error), so those schools' totals carry +0.5 per TF-1 (`scripts/fix_tf1_team_totals_20261106.mts`, 2025-26: Bergen Catholic, Fair Lawn, Bound Brook, North Hunterdon, Scotch Plains-Fanwood). Any other change to an official total needs Kyle's explicit say-so. To load or correct totals, copy the TrackWrestling team standings (template: `scripts/build_girls_official_team_scores.mts`, with backup). Nothing recalculates them automatically: the 2026-09-21 auto-refresh (`20260921_team_score_cache_auto_refresh.sql`) was never live (checked 2026-11-05: no pg_cron, none of its functions, table or triggers) — never run that file or re-insert RPC results. `top_postseason_team_scores` reads ONLY from this table — deleting rows removes schools from the leaderboard until the official rows are re-inserted.
