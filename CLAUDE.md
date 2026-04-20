# MatWhizzer — Claude Code Rules

## Database Schema Changes

**NEVER make schema changes directly in the Supabase dashboard.**

All schema changes (ALTER TABLE, CREATE TABLE, new columns, indexes, RLS policies) must:

1. Have a `.sql` file in `/docs/migrations/` (filename: `YYYYMMDD_description.sql`)
2. Be logged in `/docs/db_changelog.md` using the standard format before or at the time they ship

If a change was made in the dashboard with no migration file, create the equivalent `.sql` retroactively and mark it `RECONSTRUCTED` in the changelog.

**No DB change ships without both a migration file and a changelog entry.**

To refresh `precomputed_team_scores` after a school merge or data change, delete the stale rows — the RPC recomputes live. `update_team_scoring.py` only recreates RPC functions, it does not repopulate the table.
