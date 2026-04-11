# MatWhizzer Database Changelog

All database changes must be recorded here before or at the time they ship.
No schema migration, backfill, or structural change leaves this file untouched.

---

## 2026-04-10 — Data Health admin page (read-only queries, no schema changes)

**Tables affected:** `schools`, `wrestlers`, `tournament_entries`, `weight_classes`, `conference_standings`, `precomputed_team_scores`, `placements`

**What changed:** No schema changes. New admin page at `/admin/data-health` runs read-only SELECT queries via the service-role client to surface data integrity issues. New endpoints: `GET /api/health` (public), `GET /api/admin/data-health` (auth-gated). New service-role client at `src/lib/supabase/service.ts`.

**Reversible?** Yes — page and API routes can be deleted; no DB mutations made
**Verified?** No — pending deploy

---

## UNKNOWN — Initial schema creation (`schema.sql`)

**Tables affected:** `seasons`, `regions`, `districts`, `schools`, `school_aliases`, `school_districts`, `school_regions`, `tournaments`, `weight_classes`, `wrestlers`, `tournament_entries`, `matches`, `placements`

**What changed:**
- Created all 13 base tables from scratch (DROP SCHEMA public CASCADE first)
- Created 6 ENUM types: `tournament_type`, `gender_type`, `win_type`, `round_type`, `grade_label`, `bracket_side`
- Created indexes: `idx_wrestlers_name`, `idx_entries_wrestler`, `idx_entries_tournament`, `idx_entries_school`, `idx_matches_tournament`, `idx_matches_winner`, `idx_matches_loser`, `idx_placements_tournament`, `idx_placements_entry`
- Enabled RLS with "public read" policy on all 13 tables
- Note: `school_aliases` at this stage had columns `(id serial, school_id, alias, alias_type, notes)` — different from the later migration version
- Note: `tournament_entries.school_context_raw` may or may not have been in this version (see alter_schema entry below)

**Reversible?** No — full schema wipe and rebuild
**Verified?** Yes — schema confirmed against live DB structure

---

## UNKNOWN — Seed lookup data (`seed_lookups.sql`)

**Tables affected:** `seasons`, `weight_classes`, `tournaments`

**What changed:**
- Inserted season 1: `2024-25` (2024–2025)
- Inserted 14 boys weight classes (106–285 lb) and 12 girls weight classes (100–235 lb) — 26 total
- Inserted 48 tournaments: 32 boys districts, 8 boys regions, 1 boys state, 4 girls regions, 1 girls state, 2 combined tables

**Reversible?** Yes — DELETE by id range
**Verified?** Yes — confirmed row counts in live DB

---

## UNKNOWN — Add match import columns (`alter_schema.sql`)

**Tables affected:** `tournament_entries`, `wrestlers`

**What changed:**
- `tournament_entries`: `ADD COLUMN school_context_raw text` — raw school name/abbreviation from source PDF/CSV, intended for future FK resolution
- `wrestlers`: `CREATE UNIQUE INDEX wrestlers_name_gender_unique ON wrestlers(first_name, last_name, gender)` — enables `ON CONFLICT` upserts during import

**Reversible?** Yes — DROP COLUMN / DROP INDEX
**Verified?** Yes — both confirmed present in live DB

---

## UNKNOWN — Users profile table created

**Tables affected:** `users`

**What changed:**
- Created `users` table: `id uuid` (FK to Supabase auth.users), `username text`, `user_type text DEFAULT 'fan'`, `truth_score integer DEFAULT 50`, `truth_tier text DEFAULT 'Novice'`, `created_at`, `updated_at`, `primary_school_id integer`
- This is the public profile table synced from Supabase Auth on signup via trigger

**Reversible?** No (auth-integrated)
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — App users table created

**Tables affected:** `app_users`

**What changed:**
- Created `app_users` table: `id uuid`, `role user_role DEFAULT 'fan'` (custom enum), `display_name text`, `school_id integer`, `created_at`, `updated_at`
- Purpose appears to be a secondary auth layer or admin role table, distinct from `users`

**Reversible?** Yes — DROP TABLE
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — Bracket picks feature

**Tables affected:** `bracket_picks`

**What changed:**
- Created `bracket_picks` table: `id uuid`, `tournament_id`, `weight_class_id`, `visitor_id text` (anonymous session), `pick_1st` through `pick_4th` (uuid refs to tournament_entries), `created_at`, `updated_at`
- Later expanded to `pick_5th` through `pick_8th` (see below)

**Reversible?** Yes — DROP TABLE
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — Bracket picks expanded to 8 places

**Tables affected:** `bracket_picks`

**What changed:**
- `bracket_picks`: `ADD COLUMN pick_5th uuid`, `pick_6th uuid`, `pick_7th uuid`, `pick_8th uuid`
- Expands bracket prediction from top 4 to top 8 (All-State depth)

**Reversible?** Yes — DROP COLUMN
**Verified?** Yes — columns confirmed in live DB; migration file not found

---

## UNKNOWN — Confirmed districts / confirmed schools tables

**Tables affected:** `confirmed_districts`, `confirmed_schools`

**What changed:**
- Created `confirmed_districts`: `id`, `district_id`, `gender`, `confirmed_by uuid`, `confirmed_at`
- Created `confirmed_schools`: `id`, `school_id`, `district_id`, `canonical_alias text`, `alias text`, `confirmed_by uuid`, `confirmed_at`
- Used to lock in school-to-district assignments during the import/audit workflow

**Reversible?** Yes — DROP TABLEs
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — Precomputed team scores table created

**Tables affected:** `precomputed_team_scores`

**What changed:**
- Created `precomputed_team_scores`: `id serial`, `tournament_id`, `school_name text NOT NULL`, `total_points numeric`, `season_id`, `tournament_type text`
- Stores pre-aggregated team point totals per tournament to avoid repeated joins at query time
- Note: `school_name` used as string key at this stage — `school_id` added later (see 2026-04-02)

**Reversible?** Yes — DROP TABLE
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — School names lookup table

**Tables affected:** `school_names`

**What changed:**
- Created `school_names`: `abbreviation text NOT NULL`, `school_name text NOT NULL`, `school_id integer`
- Purpose: maps short abbreviations used in PDFs/CSVs to canonical school records

**Reversible?** Yes — DROP TABLE
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — Alias flags table

**Tables affected:** `alias_flags`

**What changed:**
- Created `alias_flags`: `id serial`, `alias text NOT NULL`, `district_id smallint`, `note text`, `flagged_by uuid`, `created_at`
- Purpose: tracks alias strings that matched ambiguously or incorrectly during import, for manual review

**Reversible?** Yes — DROP TABLE
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — School logo URLs added

**Tables affected:** `schools`

**What changed:**
- `schools`: `ADD COLUMN logo_url text`
- `update_logo_urls.sql`: `UPDATE schools SET logo_url = '<supabase-storage-url>'` for 158 schools
- Logos stored in Supabase Storage bucket `school-logos/colored/512/`

**Reversible?** Yes — DROP COLUMN (loses 158 logo URL values)
**Verified?** Yes — 158 non-null rows confirmed; ALTER TABLE migration file not found

---

## UNKNOWN — followed_school_ids added to users

**Tables affected:** `users`

**What changed:**
- `users`: `ADD COLUMN followed_school_ids integer[] DEFAULT '{}'`
- Enables users to follow multiple schools (complementary to `primary_school_id`)

**Reversible?** Yes — DROP COLUMN
**Verified?** Yes — confirmed in live DB; migration file not found

---

## UNKNOWN — followed_wrestler_ids added to users (`add_followed_wrestlers.sql`)

**Tables affected:** `users`

**What changed:**
- `users`: `ADD COLUMN IF NOT EXISTS followed_wrestler_ids uuid[] DEFAULT '{}'`
- Enables users to bookmark individual wrestlers for personalized feeds

**Reversible?** Yes — DROP COLUMN
**Verified?** Yes — migration file exists at `matwhizzer/migrations/add_followed_wrestlers.sql`

---

## UNKNOWN — wrestling_preference added to users (`add_wrestling_preference.sql`)

**Tables affected:** `users`

**What changed:**
- `users`: `ADD COLUMN IF NOT EXISTS wrestling_preference text NOT NULL DEFAULT 'both' CHECK (wrestling_preference IN ('boys', 'girls', 'both'))`
- Trigger `handle_new_public_user()` updated to capture `wrestling_preference` from auth metadata on signup

**Reversible?** Yes — DROP COLUMN, restore previous trigger
**Verified?** Yes — migration file exists at `matwhizzer/migrations/add_wrestling_preference.sql`

---

## 2026-03-31 — School section and classification columns

**Tables affected:** `schools`

**What changed:**
- `schools`: `ADD COLUMN IF NOT EXISTS section text` — e.g. `'Non-Public'`, `'North I'`, `'South'`
- `schools`: `ADD COLUMN IF NOT EXISTS classification text` — e.g. `'A'`, `'B'`, `'1'`–`'5'`
- Data: ~280+ schools updated with section/classification values based on NJSIAA groupings

**Reversible?** Yes — DROP COLUMNs (loses classification data)
**Verified?** Yes — migration file: `supabase/migrations/20260331_add_school_classifications.sql`

---

## 2026-03-31 — School mascot and primary/secondary colors

**Tables affected:** `schools`

**What changed:**
- `schools`: `ADD COLUMN IF NOT EXISTS mascot text`
- `schools`: `ADD COLUMN IF NOT EXISTS primary_color text` (hex, e.g. `#CC0000`)
- `schools`: `ADD COLUMN IF NOT EXISTS secondary_color text`
- Data: ~280+ schools updated with mascot names and hex color codes

**Reversible?** Yes — DROP COLUMNs (loses color data)
**Verified?** Yes — migration file: `supabase/migrations/20260331_add_school_colors.sql`

---

## 2026-04-01 — School profile columns and full data population (14 batch files)

**Tables affected:** `schools`

**What changed:**
- `schools`: `ADD COLUMN IF NOT EXISTS tertiary_color text`
- `schools`: `ADD COLUMN IF NOT EXISTS nickname text` — common school nickname
- `schools`: `ADD COLUMN IF NOT EXISTS town text`
- `schools`: `ADD COLUMN IF NOT EXISTS county text`
- `schools`: `ADD COLUMN IF NOT EXISTS founded_year integer`
- `schools`: `ADD COLUMN IF NOT EXISTS website_url text`
- `schools`: `ADD COLUMN IF NOT EXISTS athletic_conference text`
- `schools`: `ADD COLUMN IF NOT EXISTS twitter_handle text`
- Data: all ~400 schools updated with full profile info, sourced from Wikipedia, MaxPreps, and official school sites
- 14 batch files by classification group: Non-Public A/B, North I/II groups 1–5, Central groups 1–5, South groups 1–5

**Reversible?** Yes — DROP COLUMNs (loses all profile data)
**Verified?** Yes — migration files: `supabase/migrations/20260401_colors_batch1_*.sql` through `20260401_colors_batch14_*.sql`

---

## 2026-04-02 — Add school_id to precomputed_team_scores

**Tables affected:** `precomputed_team_scores`

**What changed:**
- `precomputed_team_scores`: `ADD COLUMN IF NOT EXISTS school_id integer REFERENCES schools(id)`
- Backfill: matched `school_name` → `schools.display_name` for ~2,070 rows
- Manual fixes for 4 unmatched names (spacing/encoding issues):
  - `'Eastside ( Paterson)'` → Eastside (Paterson)
  - `'Saint Joseph?s Academy'` → Saint Joseph's Academy
  - `'St. Peter\`s Prep'` → St. Peter's Prep
  - `'West Windsor-Plainsboro North'` → (lookup by ILIKE)
- Created indexes: `idx_precomputed_team_scores_school_id`, `idx_precomputed_team_scores_school_season`
- Result: 2,070/2,074 rows filled; 4 rows remain null (West Windsor-Plainsboro South/North, Haddon Township, St Joseph Hammonton — season 2)

**Reversible?** Yes — DROP COLUMN + DROP INDEXes
**Verified?** Yes — migration file: `supabase/migrations/20260402_add_school_id_to_precomputed.sql`

---

## 2026-04-02 — Split district tournament_type by gender

**Tables affected:** `precomputed_team_scores`

**What changed:**
- Data update: `tournament_type = 'districts'` → `'boys_districts'` for all rows linked to boys tournaments
- Data update: `tournament_type = 'districts'` → `'girls_districts'` for all rows linked to girls tournaments
- No rows should remain with `tournament_type = 'districts'` after this migration
- Aligns with existing naming pattern: `boys_state` / `girls_state`, `regions` / `girls_regions`

**Reversible?** Yes — reverse the UPDATE using the same join on `tournaments.gender`
**Verified?** Yes — migration file: `supabase/migrations/20260402_split_districts_by_gender.sql`

---

## 2026-04-04 — Conference standings tables

**Tables affected:** `conferences`, `conference_standings`

**What changed:**
- Created `conferences`: `id serial`, `slug text`, `name text`, `logo_url text`, `season_id integer`
- Created `conference_standings`: `id serial`, `conference_slug text`, `division text`, `school_id integer`, `school_name text`, `season_id integer`, `overall_wins`, `overall_losses`, `div_wins`, `div_losses`, `pf`, `pa`
- Created indexes: `idx_conf_standings_slug_season`, `idx_conf_standings_division`
- Note: `school_name` retained alongside `school_id` as a display/denorm field; all 286 rows have `school_id` populated

**Reversible?** Yes — DROP TABLEs and indexes
**Verified?** Yes — migration file: `supabase/migrations/20260404_conference_standings.sql`

---

## 2026-04-04 — School aliases v2 migration (not applied to live DB)

**Tables affected:** `school_aliases`

**What changed (intended):**
- Would have replaced `school_aliases` with a new schema: `id bigint GENERATED ALWAYS`, `alias text UNIQUE`, `school_id int NOT NULL`, `source text`, `created_at`
- Would have seeded 21 aliases from conference standings audit
- **Status: this migration was NOT applied to the live DB.** The live DB retains the original `school_aliases` schema from `schema.sql` (columns: `alias_type`, `notes`). The 21 alias seeds were inserted via another method.

**Reversible?** N/A — not applied
**Verified?** No — migration file exists at `supabase/migrations/20260404_school_aliases.sql` but live DB schema does not match

---

## 2026-04-05 — Districts and regions logo_url + permissions

**Tables affected:** `districts`, `regions`

**What changed:**
- `CREATE TABLE IF NOT EXISTS` statements were no-ops (tables already existed)
- Seeded district rows 1–32 and region rows 1–8 via `generate_series` with `ON CONFLICT DO NOTHING`
- Granted `SELECT` to `anon`, `authenticated`; `ALL` to `service_role`
- Note: `logo_url` column on `districts` and `regions` exists in live DB but the ALTER TABLE adding it is not tracked here — predates or is missing from migration files

**Reversible?** Partially — REVOKE grants; seed rows can be deleted if no FKs exist
**Verified?** Partially — migration file: `supabase/migrations/20260405_districts_regions_tables.sql`; `logo_url` column origin untracked

---

## Guidelines for Future Entries

- Add an entry **before merging** any PR that touches the database
- Include the migration filename in **What changed** if one exists
- If the change is a data backfill only (no DDL), still document it
- If you run a one-off SQL command in the Supabase dashboard, add it here retroactively
- Mark **Verified?** as `yes` only after confirming the change is live in production
