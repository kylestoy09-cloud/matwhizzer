# MatWhizzer Database Changelog

All database changes must be recorded here before or at the time they ship.
No schema migration, backfill, or structural change leaves this file untouched.

---

## 2026-04-20 — School dedup final batch: 1 merge, 1 delete, 3 renames ✓ APPLIED

**Migration file:** `docs/migrations/20260420_school_dedup_final.sql`

**What changed:**

| Change | School | Details |
|--------|--------|---------|
| Merge 300 → 356 | Saint Joseph's Academy → St. Joseph's (Hammonton) | 8 `tournament_entries`, 1 `school_aliases`, 1 `school_names` re-pointed to 356. `school_regions` (Region 8) dropped — confirmed import artifact; 356 stays on Region 7. `precomputed_team_scores` row deleted. |
| Delete 358 | Roselle | Zero tournament entries. 1 `conference_standings` row, 1 `school_districts` row deleted first. Real profile data lost (Rams, `#CC0022`, North II Group 2) — confirmed orphan. |
| Rename 94 | Hoboken High School → Hoboken | HS-suffix cleanup, no data moved |
| Rename 99 | Weehawken High School → Weehawken | HS-suffix cleanup, no data moved |
| Rename 124 | Hillside High School → Hillside | HS-suffix cleanup, no data moved |

**Post-migration:** Cleared 7 stale `precomputed_team_scores` rows for tournament 123 (Boy_s Districts District 31, season 1) — deleted when school 300 was merged. `district_team_score` RPC for District 31 now computes live from `tournament_entries`. St. Joseph's (Hammonton) entries in tournament 123 contributed 0 net team points (first-round exits, no bonus); confirmed correct.

**`update_team_scoring.py` note:** This script only recreates RPCs — it does not write to `precomputed_team_scores`. There is no standalone script to repopulate that table; clearing rows forces live RPC fallback.

**Verified?** ✓ Applied 2026-04-20 — schools 300 and 358 deleted, all 8 entries on school_id=356, display names on 94/99/124 correct.

---

## 2026-04-20 — Add missing Matawan conference_standings alias ✓ APPLIED

**Migration file:** `docs/migrations/20260420_school_aliases_seed.sql`

**What changed:**

Added 1 missing row to `school_aliases`. `20260404_school_aliases.sql` was never applied to production — of its 21 aliases, 20 were already present (19 correct, 2 with post-consolidation IDs that are intentionally different from the original file). Only `Matawan` was genuinely absent.

Two ID corrections surfaced during pre-flight:
- Original file said `Matawan → 194` — school 194 no longer exists; canonical record is 382.
- `ON CONFLICT (alias)` syntax removed — `school_aliases` has no unique constraint on `alias`; used `WHERE NOT EXISTS` guard instead.

**Row count:** 681 → 682

**Verified?** ✓ Applied 2026-04-20 — `SELECT * FROM school_aliases WHERE alias = 'Matawan'` returns `(1666, 382, 'Matawan', 'conference_standings', NULL)`.

---

## 2026-04-20 — Fix lb_district_strength girls score lookup bug ✓ APPLIED

**Migration file:** `docs/migrations/20260420_lb_district_strength_fix.sql`

**What changed:**

RPC `lb_district_strength` had two bugs introduced via `update_rpcs.py` that broke girls postseason score data:

1. **Wrong tournament type for girls** — a `base_tt` CTE routed `p_gender = 'F'` to `tournament_type = 'girls_regions'` instead of `'districts'`. Girls district wrestlers returned zero rows.
2. **Missing girls_regions in adv_types** — the advancers check for girls only included `['girls_state']`, omitting `['girls_regions']`. Girls wrestlers who advanced to regions were not counted as advancers.

Fix removes the `base_tt` CASE WHEN routing and filters directly on `tournament_type = 'districts' AND t.gender = p_gender`, consistent with all other district-aware RPCs. `adv_types` for girls updated to `['girls_regions','girls_state']`.

`update_rpcs.py` updated to match — running that script will no longer overwrite the fix.

**No schema changes.** No enum changes. No data changes. RPC-only fix.

**Partial fix note:** Full `girls_districts` enum rename (making districts consistent with regions/state gender split) is still outstanding. See migration file header for full scope.

**Verified?** ✓ Applied 2026-04-20 — live DB was already patched; migration documents and re-anchors the correct state.

---

## 2026-04-15 — Consolidate Camden duplicate (362 → 237), Highland duplicate (298 → 369), Keansburg duplicate (373 → 191) ✓ APPLIED

**Migration files:**
- `docs/migrations/20260414_consolidate_school_362_to_237.sql`
- `docs/migrations/20260414_consolidate_school_298_to_369.sql`
- `docs/migrations/20260414_consolidate_school_373_to_191.sql`

**What changed:**

Three school consolidations applied in sequence:

| Deleted | Canonical | Entries moved | Precomputed moved | Other |
|---------|-----------|---------------|-------------------|-------|
| 362 Camden/Camden Eastside | 237 Camden | 5 | 1 | — |
| 298 Highland Regional/Triton | 369 Highland | 38 | 5 | 3 aliases, 1 district, 1 region, 1 name re-pointed |
| 373 Keansburg/Henry Hudson | 191 Keansburg | 17 | 3 | — |

All three executed with safety DELETE steps for `school_regions` and `school_districts` (no-ops for 362 and 373; data migration for 298). Confirmed via `remaining_school = 0` after each.

**Verified?** ✓ Applied 2026-04-15 — all three school IDs confirmed deleted.

---

## 2026-04-15 — Merge duplicate St. Peter's Prep school 395 into 167 ✓ APPLIED

**Migration file:** `docs/migrations/20260415_merge_school_395_into_167.sql`

**Tables affected:** `tournament_entries`, `precomputed_team_scores`, `school_aliases`, `school_names`, `school_regions`, `school_districts`, `schools`

**What changed:**

Consolidated duplicate St. Peter's Prep record (school_id 395, "St Peters Preparatory School") into canonical school_id 167 ("St. Peter's Prep"):
- 37 tournament_entries (tournaments 180, 152, 175) re-pointed to 167
- 3 precomputed_team_scores rows (boys season 2) re-pointed to 167
- school_names and school_aliases re-pointed to 167 (0 aliases rows affected)
- school_regions and school_districts rows deleted
- School 395 deleted

Note: `school_regions`, `school_districts`, and `school_names` were discovered as additional FK tables at execution time.

**Verified?** ✓ Applied 2026-04-15 — remaining_schools = 0 confirmed.

---

## 2026-04-15 — Merge duplicate JFK Paterson schools 331 + 402 into 74 ✓ APPLIED

**Migration file:** `docs/migrations/20260415_merge_schools_331_402_into_74.sql`

**Tables affected:** `tournament_entries`, `precomputed_team_scores`, `conference_standings`, `school_aliases`, `school_names`, `school_regions`, `schools`

**What changed:**

Consolidated two duplicate Paterson JFK records into canonical school_id 74 (John F. Kennedy):
- School 331 ("Paterson Kennedy"): 1 tournament_entry, 1 conference_standings row, 1 school_alias, 1 school_names row re-pointed to 74; 1 school_regions row deleted; school deleted
- School 402 ("John F. Kennedy Patterson"): 2 tournament_entries, 3 precomputed_team_scores re-pointed to 74; school deleted

Note: `school_regions` and `school_names` were discovered as additional FK tables at execution time (not in original migration file). The school_regions row was deleted (school 74 has its own region mapping); the school_names row ("JFK Paterson" / "JFKP") was re-pointed to 74.

**Verified?** ✓ Applied 2026-04-15 — remaining_schools = 0 confirmed.

---

## 2026-04-14 — school_coops RLS + helper RPCs ✓ APPLIED

**Migration file:** `docs/migrations/20260414_school_coops_rls_and_rpcs.sql`

**Tables/functions affected:** `school_coops` (ALTER + POLICY + GRANT), `get_coop_membership` (CREATE FUNCTION), `get_coop_members` (CREATE FUNCTION)

**What changed:**

Enables RLS on the `school_coops` table (created without policies in `20260414_create_school_coops.sql`) and adds a public SELECT policy + GRANT so the anon/authenticated Supabase clients can read it. Creates two SECURITY DEFINER helper functions:
- `get_coop_membership(p_school_id int)` — returns all co-op programs a school belongs to as a member (coop_school_id, coop_name, season, gender, is_primary)
- `get_coop_members(p_coop_school_id int)` — returns all member schools for a co-op school (member_school_id, member_name, is_primary, season, gender)

Used by the frontend co-op school page feature (feature/school-coops branch).

**Reversible?** Yes — see ROLLBACK section (drop functions, revoke grant, drop policy, disable RLS)
**Verified?** Yes — applied 2026-04-14; smoke tests confirmed correct results for school 55 → coop 379, and coop 379 → [Lodi, Saddle Brook]

---

## 2026-04-14 — Create school_coops table ✓ APPLIED

**Migration file:** `docs/migrations/20260414_create_school_coops.sql`

**Tables affected:** `school_coops` (CREATE + INSERT ×10)

**What changed (pending — not yet run):**

Creates `school_coops` table to formally record co-op program membership. Each row links a co-op school record (`coop_school_id`) to an individual member school (`member_school_id`) with season, gender (`M`/`F`/`B`), and an `is_primary` flag marking the host school.

Seeded with 10 rows covering 5 co-ops:
- 365 Cliffside Park/Ridgefield Memorial → 364 Cliffside Park (primary), 357 Ridgefield Memorial — season 1, both
- 372 Jefferson-Sparta → 4 Jefferson (primary), 26 Sparta — season 2, girls
- 379 Lodi/Saddle Brook → 55 Lodi (primary), 59 Saddle Brook — season 2, both
- 385 Morris Hills-Morris Knolls → 76 Morris Hills (primary), 77 Morris Knolls — season 2, girls
- 392 Ramsey/Northern Highlands → 18 Ramsey (primary), 35 Northern Highlands — season 2, girls

**Reversible?** Yes — `DROP TABLE school_coops`
**Verified?** Yes — applied 2026-04-14

---

## 2026-04-14 — Consolidate school 373 → 191 (Keansburg) (PENDING REVIEW)

**Migration file:** `docs/migrations/20260414_consolidate_school_373_to_191.sql`

**Tables affected:** `tournament_entries` (UPDATE ×17), `precomputed_team_scores` (UPDATE ×3), `schools` (DELETE ×1)

**What changed (pending — not yet run):**

School 373 (`'Keansburg/Henry Hudson'`) has 17 tournament entries and 3 precomputed_team_scores rows; no aliases, districts, regions, or names. Re-points all rows to school 191 (`'Keansburg'`) and deletes school 373.

**Reversible?** Yes — see ROLLBACK section (scope rollback UPDATEs by season_id = 2 to avoid touching pre-existing school 191 rows)
**Verified?** No — pending Paul's review before execution

---

## 2026-04-14 — Consolidate schools 362 → 237 and 298 → 369 (PENDING REVIEW)

**Migration files:**
1. `docs/migrations/20260414_consolidate_school_362_to_237.sql`
2. `docs/migrations/20260414_consolidate_school_298_to_369.sql`

**Tables affected:** `tournament_entries` (UPDATE), `precomputed_team_scores` (UPDATE), `school_aliases` (UPDATE), `school_districts` (INSERT ON CONFLICT + DELETE), `school_regions` (INSERT ON CONFLICT + DELETE), `school_names` (UPDATE), `schools` (DELETE ×2)

**What changed (pending — not yet run):**

1. **consolidate_school_362_to_237** — Re-points 5 `tournament_entries` and 1 `precomputed_team_scores` row from school 362 (Camden/Camden Eastside) to school 237 (Camden). School 362 has no aliases, districts, regions, or names. Deletes school 362.

2. **consolidate_school_298_to_369** — Re-points 38 `tournament_entries`, 5 `precomputed_team_scores`, 3 `school_aliases`, 1 `school_districts`, 1 `school_regions`, and 1 `school_names` row from school 298 (Highland Regional/Triton) to school 369 (Highland). Uses INSERT ON CONFLICT DO NOTHING for districts/regions composite PKs. Deletes school 298.

**Reversible?** Yes — see ROLLBACK sections (districts/regions rollback requires looking up IDs before running; precomputed rollback for 298 requires scoping by tournament_type to avoid overwriting 369's pre-existing row)
**Verified?** No — pending Paul's review before execution

---

## 2026-04-14 — Consolidate school 326 into 259 (Gloucester) ✓ APPLIED

**Migration file:** `docs/migrations/20260414_consolidate_school_326_to_259.sql`

**Tables affected:** `conference_standings` (UPDATE ×1), `school_aliases` (UPDATE ×1), `school_regions` (INSERT ON CONFLICT + DELETE), `precomputed_team_scores` (DELETE ×1), `schools` (UPDATE display_name, DELETE ×1)

**What changed (pending — not yet run):**

School 326 (`'Gloucester'`) had 0 tournament entries and data in 4 dependent tables (conference_standings ×1, school_aliases ×1, school_regions ×1, precomputed_team_scores ×1). School 259 (`'Gloucester City JR/SR'`) had 72 tournament entries. Same school under two name variants. Re-points all 4 dependent rows to 259, renames 259's display_name to `'Gloucester'`, and deletes school 326. precomputed_team_scores row for 326 is deleted (not re-pointed) and will be recomputed.

**Reversible?** Partial — see ROLLBACK section; precomputed_team_scores row for 326 is not recoverable (acceptable)
**Verified?** Yes — applied 2026-04-14

---

## 2026-04-13 — Delete forfeit placeholder schools 367 and 399 ✓ APPLIED

**Migration file:** `docs/migrations/20260413_delete_schools_367_399.sql`

**Tables affected:** `matches` (DELETE), `tournament_entries` (DELETE ×11), `precomputed_team_scores` (DELETE), `schools` (DELETE ×2)

**What changed:**

Deleted synthetic forfeit placeholder schools and all dependent rows:
- School 367 (`'Forfeit'`): 7 `tournament_entries` — wrestlers A/B/C/D/E/F/G Forfeit in tournament 101 (Boy's Districts D9, season 1)
- School 399 (`'Team Forfeit'`): 4 `tournament_entries` — wrestler I Forfeit in tournament 193 (Girl's Districts D8, season 2)
- `matches` rows referencing any of the 11 forfeit entries (deleted first to satisfy FK constraints)
- `precomputed_team_scores` rows for school_ids 367 and 399
- School records 367 and 399

No real athletes affected. `matches` and `precomputed_team_scores` for these schools are not recoverable but acceptable — forfeit placeholders carry no meaningful bout or team data.

**Reversible?** Partial — `tournament_entries` and `schools` rows can be restored via ROLLBACK section; `matches` and `precomputed_team_scores` rows are not recoverable
**Verified?** Yes — applied 2026-04-14

---

## 2026-04-13 — School ID deduplication audit — 5 migrations ✓ APPLIED

**Migration files (apply in this order):**
1. `docs/migrations/20260413_backfill_school_404_entries.sql`
2. `docs/migrations/20260413_delete_school_398.sql`
3. `docs/migrations/20260413_consolidate_school_69_to_393.sql`
4. `docs/migrations/20260413_consolidate_school_380_to_379.sql`
5. `docs/migrations/20260413_consolidate_duplicate_schools.sql`

**Tables affected:** `tournament_entries` (UPDATE/DELETE), `school_aliases` (UPDATE), `school_names` (UPDATE), `school_districts` (INSERT ON CONFLICT + DELETE), `school_regions` (INSERT ON CONFLICT + DELETE), `precomputed_team_scores` (DELETE), `schools` (UPDATE/DELETE)

**What changed:**

1. **backfill_school_404_entries** — Re-points 6 `tournament_entries` from catch-all school_id 404 (JFK/Woodbridge/Colonia) to correct individual school IDs resolved by wrestler name from source data: Evangelia Kotsonis → 150 (Iselin Kennedy), Isabella McGarry / Montedoc Hidalgo / Zoe Poznanski (×2) → 149 (Colonia), Genesis Cruz → 187 (Woodbridge). School 404 record is left in place pending verification that all entries are cleared.

2. **delete_school_398** — Deletes 2 `tournament_entries` for the synthetic "I Forfeit" placeholder wrestler (UUIDs `067a31e2`, `294ea214`) and then deletes school_id 398 (display_name `'-'`), a data import artifact with no real athletes.

3. **consolidate_school_69_to_393** — Merges school_id 69 (Bogota/Ridgefield Park, season 1) into school_id 393 (same co-op under a flipped name + trailing space, season 2). Re-points 18 season-1 `tournament_entries` (tournaments 100, 126, 133, 135). Fixes display_name: `'Ridgefield Park/ Bogota'` → `'Ridgefield Park/Bogota'`. Deletes school 69.

4. **consolidate_school_380_to_379** — Merges school_id 380 (Lodi/Saddle Brook High School — boys import) into school_id 379 (Lodi/Saddle Brook — girls import). Same co-op split across two IDs due to PDF name variation. Re-points 14 boys `tournament_entries` (tournaments 146, 173). School 379 display_name already correct. Deletes school 380.

5. **consolidate_duplicate_schools** — Single transaction consolidating 26 duplicate school ID pairs identified in the full deduplication audit. Each block re-points `tournament_entries`, migrates `school_aliases` and `school_names`, copies `school_districts` and `school_regions` (INSERT ON CONFLICT DO NOTHING + DELETE loser), deletes `precomputed_team_scores` for loser (scores will be recomputed), and deletes the loser school record. Loser → winner pairs:
   - 90 → 321 (Becton), 368 → 102 (Governor Livingston), 396 → 118 (St. Benedict's), 137 → 397 (Summit)
   - 140 → 322 (Bound Brook), 142 → 383 (Middlesex/Dunellen), 161 → 384 (Monmouth Regional)
   - 202 → 370 (Jackson Memorial), 212 → 388 (Northern Burlington), 323 → 227 (Bordentown — delete only, no entries)
   - 337 → 162 (North Brunswick), 339 → 35 (Northern Highlands), 366 → 158 (East Brunswick)
   - 375 → 315 (Kittatinny), 376 → 5 (Lakeland), 377 → 62 (Lenape Valley), 386 → 56 (Mt. Olive)
   - 387 → 115 (Newark Academy), 389 → 299 (Overbrook), 390 → 78 (Parsippany Hills co-op)
   - 47 → 394 (St Joseph Montvale), 400 → 78 (Parsippany Hills HS), 401 → 75 (Montville)
   - 403 → 183 (Piscataway), 405 → 369 (Highland), 406 → 265 (Willingboro)

**Reversible?** Yes — all five files include ROLLBACK sections with exact INSERT/UPDATE statements to restore prior state
**Verified?** Yes — applied 2026-04-14

---

## 2026-04-10 — Suppress shell schools + load missing conference standings (PENDING REVIEW)

**Migration files:**
- `docs/migrations/20260410_load_missing_conference_scores.sql`
- `docs/migrations/20260410_suppress_shell_schools.sql`
- `docs/migrations/20260410_audit_entry_schools_no_scores.sql`

**Tables affected:** `conference_standings` (INSERT), `schools` (ALTER + UPDATE)

**What changed (pending — not yet run):**

1. **load_missing_conference_scores** — Inserts 9 rows into `conference_standings` for schools that appear in the 2025-26 standings source file but have no DB records: Becton, Bound Brook, High Point, Keyport, Lakeland, Monmouth, Northern Highlands, Paterson Kennedy, Roselle. Source of truth: `Conference Standings 2025-26.txt`.

2. **suppress_shell_schools** — Adds `is_active boolean NOT NULL DEFAULT true` column to `schools`, then sets `is_active = false` for 7 complete shells (zero tournament entries, zero precomputed scores, zero conference standings): IDs 332, 23, 336, 407, 65, 344, 348. The 6 schools with conference standings data (Becton, Bound Brook, High Point, Keyport, Lakeland, Roselle) were excluded and remain active. School profile pages should be updated to call `notFound()` when `is_active = false`.

3. **audit_entry_schools_no_scores** — Read-only diagnostic queries only. Investigates why Monmouth (384), Ridgefield Memorial (357), Northern Highlands (35), and Paterson Kennedy (331) have tournament entries but zero precomputed scores. No data modifications.

**Reversible?** Yes — see ROLLBACK sections in each file
**Verified?** No — pending Paul's review before execution

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
