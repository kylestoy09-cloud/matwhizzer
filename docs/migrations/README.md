# MatWhizzer — Database Migrations

This directory is the single source of truth for all MatWhizzer schema changes.

**Rule:** No schema change reaches the Supabase dashboard without a file here and an
entry in [`../db_changelog.md`](../db_changelog.md). See `CLAUDE.md` at the project
root for the full policy.

---

## Conventions

### 1. One file = one discrete change

Each `.sql` file represents a single logical migration: one feature, one column group,
one table. Avoid bundling unrelated changes. If you need to run 14 batches of UPDATE
statements, they can share a prefix but stay separate files (as the 2026-04-01 color
batches do).

### 2. Filename format

```
YYYYMMDD_short_description.sql
```

Examples:
```
20260402_add_school_id_to_precomputed.sql
20260404_conference_standings.sql
20260410_add_school_id_to_wrestlers.sql
```

- Use the date you **write** the migration, not the date you apply it.
- Use lowercase snake_case for the description.
- Keep descriptions short but specific — avoid generic names like `update_schools.sql`.

### 3. Every file must have a rollback section

At the bottom of every file, add a commented rollback block:

```sql
-- ROLLBACK:
-- DROP TABLE IF EXISTS my_new_table;
-- ALTER TABLE schools DROP COLUMN IF EXISTS my_new_column;
```

If the migration is a pure data update (no DDL) and is reversible, write the reverse
UPDATE/DELETE. If the data cannot be recovered without a backup, note that explicitly:

```sql
-- ROLLBACK:
-- ALTER TABLE schools DROP COLUMN IF EXISTS mascot;
-- NOTE: All mascot data will be lost. Re-run migration to restore from source data.
```

Never leave the rollback section empty. If there is genuinely nothing to roll back,
write `-- ROLLBACK: no-op (read-only / additive-only change)`.

### 4. Mark files as applied

When a migration has been successfully run in production, add this line near the top
of the file (after the opening comment block):

```sql
-- APPLIED: YYYY-MM-DD
```

If the migration was never applied (e.g. it was superseded or failed), note that too:

```sql
-- APPLIED: NOT APPLIED TO PRODUCTION — see ROLLBACK note
```

---

## File index

| File | Applied | Description |
|------|---------|-------------|
| `20260321_add_wrestling_preference.sql` | 2026-03-21 | `users.wrestling_preference` column + trigger update |
| `20260322_add_followed_wrestlers.sql` | 2026-03-22 | `users.followed_wrestler_ids` uuid[] column |
| `20260331_add_school_classifications.sql` | 2026-03-31 | `schools.section` + `schools.classification` columns |
| `20260331_add_school_colors.sql` | 2026-03-31 | `schools.mascot`, `primary_color`, `secondary_color` columns |
| `20260401_colors_batch1_nonpublic_a.sql` | 2026-04-01 | School profile columns + Non-Public A data |
| `20260401_colors_batch2_nonpublic_b.sql` | 2026-04-01 | School profile columns + Non-Public B data |
| `20260401_colors_batch3_north1_g45.sql` | 2026-04-01 | North I Groups 4–5 data |
| `20260401_colors_batch4_north1_g123.sql` | 2026-04-01 | North I Groups 1–3 data |
| `20260401_colors_batch5_north2_g45.sql` | 2026-04-01 | North II Groups 4–5 data |
| `20260401_colors_batch6_north2_g123.sql` | 2026-04-01 | North II Groups 1–3 data |
| `20260401_colors_batch7_central_g45.sql` | 2026-04-01 | Central Groups 4–5 data |
| `20260401_colors_batch8a_central_g3.sql` | 2026-04-01 | Central Group 3 data |
| `20260401_colors_batch8b_central_g12.sql` | 2026-04-01 | Central Groups 1–2 data |
| `20260401_colors_batch9_south_g45.sql` | 2026-04-01 | South Groups 4–5 data |
| `20260401_colors_batch10_south_g3.sql` | 2026-04-01 | South Group 3 data |
| `20260401_colors_batch11_south_g12.sql` | 2026-04-01 | South Groups 1–2 data |
| `20260401_colors_batch12_north1_missing.sql` | 2026-04-01 | North I missing schools backfill |
| `20260401_colors_batch13_north2_missing.sql` | 2026-04-01 | North II missing schools backfill |
| `20260401_colors_batch14_central_missing.sql` | 2026-04-01 | Central missing schools backfill |
| `20260402_add_school_id_to_precomputed.sql` | 2026-04-02 | `precomputed_team_scores.school_id` + indexes |
| `20260402_split_districts_by_gender.sql` | 2026-04-02 | Split `tournament_type = 'districts'` into boys/girls |
| `20260404_conference_standings.sql` | 2026-04-04 | `conferences` + `conference_standings` tables |
| `20260404_school_aliases.sql` | **NOT APPLIED** | school_aliases v2 schema (superseded by original) |
| `20260405_districts_regions_tables.sql` | 2026-04-05 | districts/regions grants + seed rows |

---

## How to apply a migration

1. Test on a local or staging Supabase project first.
2. Run via `psql` or the Supabase SQL Editor — never paste into a dashboard migration tool
   without reviewing the full file.
3. After confirming success in production, add `-- APPLIED: YYYY-MM-DD` to the top of
   the file and commit.
4. Update the entry in `../db_changelog.md`.

## Template for new migrations

```sql
-- APPLIED: (fill in after applying to production)
-- Short description of what this migration does and why.

-- ── Forward migration ────────────────────────────────────────────────────────

ALTER TABLE example ADD COLUMN IF NOT EXISTS new_col text;

-- ROLLBACK:
-- ALTER TABLE example DROP COLUMN IF EXISTS new_col;
```
