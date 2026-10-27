# MatWhizzer Database Changelog

---

## 2026-10-26 — Girls 2025-26 "Other" events imported (jamborees, quads, tris)

**Migration file:** `docs/migrations/20261026_girls_other_events_import.sql` (applied with `scripts/batch_import_girls_other_events.mts`)

**Purpose:** None of the girls "Other" events in the Track exports (Other Girls Matches, January Girls - Other 1-15, February Other) had been loaded, so about 2,000 individual bouts were missing from girls profiles and records. Imports 79 events as 971 jamboree pseudo-duals (`meet_kind='jamboree'`, `counts_toward_record=false`, so no team W-L change) with 2,022 bouts, using the fixed jamboree parser and the importer's school and wrestler matchers. 52 new wrestlers, 107 new name aliases (existing aliases untouched). Includes Hillsborough Holiday Brawl and Pt. Beach Round Robin. Skipped: Queen of the Mat (already a tournament), 7 pairings already loaded, 8 pairings with Mary Help of Christians Academy (school record deleted 2026-09-17) or William Penn Charter School (no school record). A first run stopped on a same-day duplicate pairing and was fully rolled back before the final run.

**Tables affected:** `dual_meets_girls` (+971), `dual_meet_matches_girls` (+2,022), `wrestlers` (+52), `wrestler_name_aliases` (+107)

**APPLIED** — 2026-10-26, service-role script

**Reversible?** Yes — delete by the ids in `docs/migrations/backups/20261026_girls_other_events_import.json`
**Verified?** Yes — 2026-10-26: 971 girls jamboree meets, 2,022 bouts, 0 bouts with an unlinked named wrestler. Girls hammer recalculation still needs to be re-run.

---

## 2026-10-26 — Wrestler indexes on dual meet matches (Disk IO fix)

**Migration file:** `docs/migrations/20261026_dual_meet_matches_wrestler_indexes.sql`

**Purpose:** Supabase warned that the project was depleting its Disk IO budget. `pg_stat_user_tables` showed 109k full scans of `dual_meet_matches` reading ~6B rows. The cause was the wrestler profile query `wrestler_a_id = X OR wrestler_b_id = X`: neither column was indexed on `dual_meet_matches` or `dual_meet_matches_girls`, so each profile view scanned the whole table (~100k boys calls at ~140 ms, ~32k girls calls at ~99 ms). Added single-column indexes on both columns of both tables, and ran `ANALYZE` on `dual_meet_matches`, `dual_meet_matches_girls`, `tournament_entries` and `matches` (their stats showed 0 live rows).

**Tables affected:** `dual_meet_matches` (2 indexes), `dual_meet_matches_girls` (2 indexes)

**APPLIED** — 2026-10-26, Supabase SQL editor

**Reversible?** Yes — DROP INDEX statements in the migration file
**Verified?** Yes — 2026-10-26: EXPLAIN ANALYZE on a boys profile lookup uses BitmapOr over `idx_dmm_wrestler_a` / `idx_dmm_wrestler_b`, 22 rows in 2.6 ms (was ~140 ms seq scan)

---

## 2026-10-24 — Girls 2025-26 team playoffs tagged; Hillsborough Holiday Brawl import reset

**Migration file:** `docs/migrations/20261024_girls_playoffs_tag_and_brawl_reset.sql` (applied with `scripts/apply_girls_playoffs_tag_and_brawl_reset.mts`)

**Purpose:** (1) Sets `is_playoff` on the 14 NJSIAA girls team playoff duals (2/17, 2/19, 2/22). Two were already loaded from the February duals file; the playoff import added a second, flipped copy of High Point / MHMK (02-19), which is deleted. The girls importer's duplicate check filtered on a `gender` column that `dual_meets_girls` doesn't have, so every lookup errored and read as "no duplicate"; fixed in `import-meets-girls/route.ts`. (2) Deletes the 35 Hillsborough Holiday Brawl (12-28) pseudo-duals (49 bouts) from a jamboree import whose parser ignored pool weight labels ("114C"), kept round prefixes in names, and missed bouts with non-breaking spaces. Also deletes the 23 `wrestler_name_aliases` rows with round-prefixed raw names. Parser fixed in `src/lib/parseJamboreeGirls.ts`; the event (204 bouts) is to be re-imported.

**Tables affected:** `dual_meets_girls` (14 updated, 36 deleted), `dual_meet_matches_girls` (61 deleted by cascade), `wrestler_name_aliases` (23 deleted)

**APPLIED** — 2026-10-24, service-role script

**Reversible?** Yes — re-insert from `docs/migrations/backups/20261024_girls_playoffs_tag_and_brawl_reset.json`, set `is_playoff = false` on the 14 meets
**Verified?** Yes — 2026-10-24: 14 girls playoff meets; 0 Hillsborough jamboree meets

---

## 2026-10-24 — Girls 2025-26 duplicate meets cleanup

**Migration file:** `docs/migrations/20261024_girls_duplicate_meets_cleanup.sql`

**Purpose:** Checking girls duals against the official standings turned up meets imported twice. Each copy carried its own bouts, so those matches were double-counted on wrestler profiles. Removed:
- **Bloomfield Girls Tournament** (`a1120f19`, 345 bouts): a duplicate of the registry-linked **Bloomfield Holiday Girls Tournament** (`51c968e8`).
- **2025 Lady Howdy Duncan Tournament** (`b8c7ac03`, 28 bouts): a partial re-import of **2025 Howdy Duncan Ladies Classic** (`3cb4ae0d`, 92 bouts). Registry link and venue moved to `3cb4ae0d`.
- **9 duplicate duals** (75 bouts), each entered from both teams' sides. The copy with the most bouts was kept. Freehold Borough 36-12 Madison had 3 copies, and Madison's 2 copies left out Freehold's forfeit wins.

Sterling/Collingswood (01-16 / 01-17) was left alone because its copies differ. Also set Elizabeth vs West Orange and North Brunswick vs Old Bridge to 33-33 ties: girls official records include ties, and both show as ties in the standings.

**Tables affected:** `in_season_tournaments_girls` (2 deleted, 1 updated), `tournament_bouts_girls` (373 deleted via cascade), `tournament_registry` (1 relinked), `dual_meets_girls` (9 deleted, 2 updated), `dual_meet_matches_girls` (75 deleted via cascade), `microcheck_tasks` (1 deleted)

**APPLIED** — 2026-10-24 via service-role script (`scripts/apply_girls_duplicate_cleanup.mts`). Full pre-delete rows are saved in `docs/migrations/backups/20261024_girls_duplicate_meets_cleanup.json`.

**Reversible?** Yes — re-insert from the backup file (steps in the migration file)
**Verified?** Yes — 2026-10-24: 1,156 girls duals, 0 same-day duplicate pairs; only Sterling/Collingswood remains as a near-date pair (intentional). Girls hammer recalculation still needs to be re-run.

---

## 2026-10-24 — Girls 2025-26 official Power Points and standings

**Migration file:** `docs/migrations/20261024_girls_power_points_2025_26.sql`

**Purpose:** Loads the official girls 2025-26 standings (`Whizzer Upload/2025-26 Girls Data/2026 final standings girls.rtf`). Girls PP come in three lists: North Jersey (37), South Jersey (36) and Non-classified (200 loaded): schools that don't compete for team titles, display-only with no playoffs. Adds `power_points.overall_ties` (girls official records include ties, e.g. Elizabeth 12-6-1) and `power_points.pp_group` (`north` / `south` / `non_classified`, NULL for boys). 273 girls rows inserted; all 73 North/South names matched exactly. 36 Non-classified rows skipped: 35 have no school record (34 are 0-0, plus Mary Help of Christians 1-0), and the rest are 0-0 duplicates of a matched school.

**Tables affected:** `power_points` (2 columns, 1 check constraint, 273 rows)

**APPLIED** — 2026-10-24, Supabase SQL editor

**Reversible?** Yes — rollback statements in the migration file
**Verified?** Yes — 2026-10-24: north 37 (2 with ties), south 36 (2 with ties), non_classified 200 (4 with ties)

---

## 2026-10-24 — Girls 2025-26 ties resolved from Track tiebreaker criteria

**Migration file:** `docs/migrations/20261024_resolve_girls_ties_from_track_criteria.sql`

**Purpose:** 65 girls 2025-26 duals were still tied (`tiebreaker_pending`). There is no official girls W-L to settle them against, so they were matched to the "Tie Breaker:" line on each dual in the Track exports (`Whizzer Upload/2025-26 Girls Data`). The export keeps the criterion and both teams' values but not the selected winner, so the higher value wins. Boys 2025-26 checked against official W-L: higher value won 7 of 8 "forfeits" ties and 12 of 15 overall. Resolved the 15 girls ties with a real criterion (14 "forfeits", 1 "firstPts"): winner +1 team point, `criteria_winner_school_id` set, `tiebreaker_pending=false`, microcheck task completed. Also fixed Clifton vs Passaic (01-28), stored 0-0, to the bout-sum 45-18 Clifton. The other 49 have a "Team Id" line (Track's arbitrary last-resort fallback) or no line, and stay pending in microcheck.

**Tables affected:** `dual_meets_girls` (`team1_score`, `team2_score`, `criteria_winner_school_id`, `tiebreaker_pending`), `microcheck_tasks`

**APPLIED** — 2026-10-24 via service-role script

**Reversible?** Yes — rollback steps in the migration file
**Verified?** Yes — 2026-10-24: 15 resolved + Clifton fixed; 49 pending girls ties and 49 pending girls tie tasks remain

---

## 2026-09-24 — Split Luke Miller (Lacey / Demarest)

**Migration file:** `docs/migrations/20260924_split_luke_miller_demarest.sql`

**Purpose:** Two different wrestlers named Luke Miller shared one record (Lacey junior, Jr from districts). The 2026-07-31 alias build aliased that record at both Lacey (249) and Demarest (314), so the Demarest sophomore's roster grade import row matched the Lacey junior and his BCCA bout was credited to him; his 4 Demarest dual matches had been imported with his name but no wrestler_id, so he never appeared on Demarest's roster (reported by Kyle). Created the Demarest Luke Miller (So, `961025db-…`) and moved the Demarest alias, the 4 dual sides (+ winner on his fall vs Mehta), the BCCA bout and the Demarest import row to him; confirmed Lacey's Jr. Scan found 33 more records on two schools' 2025-26 roster uploads — they now appear in the roster grade import's Grades Unresolved tab, whose "different wrestler" action splits the record by school the same way (`src/lib/splitWrestler.ts`).

**Tables affected:** `wrestlers` (1 inserted), `wrestler_name_aliases`, `dual_meet_matches`, `tournament_bouts`, `wrestler_match_score_log`, `roster_grade_import`

**APPLIED** — 2026-09-24 via service-role script

**Reversible?** Yes — point the moved rows back to `b2654654-b493-436d-8c8a-87e49a09ea1f` (ids in the migration file), null the 4 dual sides, delete the new wrestler
**Verified?** Yes — 2026-09-24: all 9 statements affected the expected rows (1 alias, 4 duals, 1 winner, 1 bout, 2 import rows)

---

## 2026-09-24 — Roster grades from microcheck matches written to wrestlers

**Migration file:** `docs/migrations/20260924_microcheck_roster_grades_backfill.sql`

**Purpose:** The microcheck roster_match task saved each reviewed match as `roster_grade_import.status = 'wrestler_matched'` but never ran the confirm step, so 6,679 human-reviewed matches (2026-09-20..22, 296 schools) never reached wrestler profiles — only 77 grades from /admin/roster-grade-import were written, and boys roster grade coverage read 52%. Wrote the import grade for every matched wrestler with no grade or the same grade (`grade_confirmed_source = 'roster_upload'`, `grade_confirmed_at` = when the match was reviewed) and marked those rows `confirmed` (`confirmed_by = 'backfill: microcheck roster_match'`). 42 wrestlers held back as `wrestler_matched` for manual review: current grade differs from the import, or two import rows with different grades matched the same wrestler. The microcheck panel now confirms on submit.

**Tables affected:** `wrestlers` (`grade`, `grade_confirmed_at`, `grade_confirmed_source`), `roster_grade_import` (`status`, `confirmed_by`, `confirmed_at`)

**APPLIED** — 2026-09-24 via service-role script (pre-apply snapshot of the 6,646 wrestlers saved in the session scratchpad)

**Reversible?** Partly — import rows: `UPDATE roster_grade_import SET status='wrestler_matched', confirmed_by=NULL, confirmed_at=NULL WHERE confirmed_by='backfill: microcheck roster_match'`; wrestler grades need the snapshot
**Verified?** Yes — 2026-09-24: 6,604 wrestlers written, 6,612 import rows confirmed, 0 errors; boys roster grade coverage 52% → 97.5% (289 of 311 schools at 100%)

---

## 2026-09-24 — Roster-upload grades: backfill grade_confirmed_at

**Migration file:** `docs/migrations/20260924_roster_upload_grade_confirmed_at.sql`

**Purpose:** The roster grade import confirm step wrote `grade` and `grade_confirmed_source = 'roster_upload'` but never `grade_confirmed_at`, so 40 of 77 roster-upload wrestlers still counted as "NJ wrestlers without confirmed grade" in data health and showed no "Last confirmed" date on the admin profile. The confirm route now sets it; this backfills those 40 from the import row's `confirmed_at` (now() if none). Same change: roster wrestlers with no import row (e.g. Dorian Velez, Dumont) can now get a grade in the review screen — written as `grade_confirmed_source = 'manual'`, same as the admin profile edit.

**Tables affected:** `wrestlers` (`grade_confirmed_at` only)

**APPLIED** — 2026-09-24 via service-role script

**Reversible?** Yes — set `grade_confirmed_at = NULL` for the 40 ids (informational field)
**Verified?** Yes — 2026-09-24: 40 updated; 0 roster-upload wrestlers with a grade and no `grade_confirmed_at`

---

## 2026-09-24 — OOS name collisions: Franklin, PA / Delaware Valley, PA / Williamstown, WV

**Migration file:** `docs/migrations/20260924_oos_name_collision_fix.sql`

**Purpose:** Same failure as the Dover, DE fix, found by scanning every out-of-state tournament for single-appearance NJ schools. OOS programs whose name exactly matches an NJ school were imported as that school (exact matches skipped the RTF school review): "Franklin" at Powerade (PA) → Franklin 169 (John Montgomery, Max Firestine, Titus Colangelo); "Delaware Valley" at Bethlehem Holiday Classic (PA) → Delaware Valley 141 (Nick D`Ambola); "Williamstown" at WSAZ Invitational (WV) → Williamstown 303 (Cole Smith — Williamstown, WV per Kyle). Created OOS schools Franklin, PA (1199), Delaware Valley, PA (1200), Williamstown, WV (1201). The first four wrestlers (created by those imports, one bout each) are re-homed there with `is_oos = true`. The WSAZ bout had been attached to an existing NJ Cole Smith (2024-25 NJ postseason), so it moved to a new OOS Cole Smith; the NJ record keeps its own history. Hammer / match-score-log rows built from these bouts were deleted. The RTF importer now requires every school at an Outside event to be confirmed (see the code change of the same date).

**Tables affected:** `schools` (3 inserted), `wrestlers` (1 inserted, 4 updated), `wrestler_name_aliases` (5 inserted), `tournament_bouts` (5 updated), `wrestler_hammer_scores`, `wrestler_match_score_log`

**APPLIED** — 2026-09-24 via service-role script

**Reversible?** Yes — rollback statements in the migration file
**Verified?** Yes — 2026-09-24: 0 bouts for these wrestlers still on schools 169/141/303; all 5 OOS wrestlers aliased to 1199/1200/1201 with `is_oos = true`

---

## 2026-09-24 — Dover (61) / Dover, DE (608) OOS mixup fix

**Migration file:** `docs/migrations/20260924_dover_de_oos_mixup_fix.sql`

**Purpose:** The 2026-08-10 import of Howdy Duncan (2025-12-19/20, a Delaware tournament Pennsville attended) put every out-of-state school on an OOS stub (604–626, including 608 "Dover, DE"), but the raw school name "Dover" exactly matched NJ Dover's display_name alias, so Jahziah Jimenez, Maxtin Kiesel and Silas Sheranko were created as NJ wrestlers on Dover NJ's roster (reported by Kyle). Each has one Howdy Duncan bout and nothing else. Re-homed their `wrestler_name_aliases` rows and their 3 Howdy Duncan bouts from 61 to 608, set `is_oos = true`, and deleted their 2025-26 `wrestler_hammer_scores` / `wrestler_match_score_log` rows — matching the other OOS wrestlers from that tournament (the recalculation skips OOS wrestlers).

**Tables affected:** `wrestler_name_aliases`, `wrestlers`, `tournament_bouts`, `wrestler_hammer_scores`, `wrestler_match_score_log`

**APPLIED** — 2026-09-24 via service-role script

**Reversible?** Yes — rollback statements in the migration file; hammer/log rows return on the next boys 2025-26 recalculation
**Verified?** Yes — 2026-09-24: school 61 aliases 56 → 53; 608 has the 3 aliases; 0 Howdy Duncan bouts left on school 61; all 3 `is_oos = true`

---

## 2026-09-23 — OOS aliases for Christian Brothers (506)

**Migration file:** `docs/migrations/20260923_cba_oos_aliases.sql`

**Purpose:** Follow-up to the same-day CBA OOS mixup fix. School 506 ("Christian Brothers College", OOS) had zero aliases, so any raw import name other than an exact match on its display_name fell through to trigram fuzzy matching — which is how its roster collided with NJ's Christian Brothers Academy (197) in the first place. The program is known in source data by two names ("Christian Brothers High School" and "Christian Brothers College"); added both as exact `alias_type='oos'` aliases pointing to 506 so `matchSchools.ts` resolves them at the exact-alias step, before fuzzy matching ever runs.

**Tables affected:** `school_aliases`

**APPLIED** — 2026-09-23 via service-role script

**Reversible?** Yes — `DELETE FROM school_aliases WHERE id IN (2876, 2877);`
**Verified?** Yes — 2026-09-23: both rows inserted with `school_id=506, alias_type='oos'`

---

## 2026-09-23 — Christian Brothers (197) OOS mixup fix

**Migration file:** `docs/migrations/20260923_cba_oos_mixup_fix.sql`

**Purpose:** A 2026-08-03 bulk import of ~231 wrestlers across ~19 out-of-state Catholic prep programs (Gonzaga, DeMatha, Bishop O'Connell, Malvern Prep, Mt. St. Charles Academy, etc. — consistent with an East Coast Catholic Classic-style field) fuzzy-matched an out-of-state "Christian Brothers" roster to NJ school_id 197 (Christian Brothers Academy, Lincroft) instead of the existing empty OOS stub school_id 506 ("Christian Brothers College"). This put 18 out-of-state wrestlers on CBA's live NJ roster with no bout/tournament/dual history anywhere — caught when the roster grade import review didn't match Track Wrestling's actual 44-man roster. Re-homed their `wrestler_name_aliases` row from school 197 to 506 and set `is_oos = true` so they surface correctly on the OOS Wrestlers page.

**Tables affected:** `wrestler_name_aliases`, `wrestlers`

**APPLIED** — 2026-09-23 via service-role script

**Reversible?** Yes — re-run with `school_id = 197` and `is_oos = false` for the same 18 wrestler ids (listed in the migration file)
**Verified?** Yes — 2026-09-23: school 197 alias count dropped from 48 to 30 (44 real CBA roster + a few pre-existing unrelated dupes); all 18 confirmed `is_oos = true`

---

## 2026-09-21 — Alias "Roselle" → Roselle (358, Abraham Clark)

**Migration file:** `docs/migrations/20260921_roselle_alias.sql`

**Purpose:** Bare "Roselle" always means Roselle / Abraham Clark HS (358); Roselle Park (125) is always written "Roselle Park". 358's display name only matched when 358 was in that season's program list, so girls 2025-26 imports couldn't resolve "Roselle". The alias matches regardless. Replaces the old "flag bare Roselle for review" rule.

**Tables affected:** `school_aliases`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — delete the alias
**Verified?** Yes — 2026-09-21: "Roselle" → 358 for boys and girls, 2025-26 and 2026-27; "Abraham Clark" → 358; "Roselle Park" → 125

---

## 2026-09-21 — Girls co-op names match on import; 2025-26 girls program gaps

**Migration file:** `docs/migrations/20260921_girls_coop_names_and_program_rows.sql`

**Purpose:** Girls imports now match school names season-aware, and four co-ops with 2025-26 duals no longer resolved: "Buena Regional/Vineland" (287), "Cherry Hill East/Cherry Hill West" (267), "Jefferson-Sparta" (4), "Ramsey/Northern Highlands" (18) — no alias for the raw co-op name, and hosts missing from the 2025-26 girls program list. Adds girls-only aliases (`notes='gender:F'`) for those names and the girls display names, and inserts 2025-26 girls district + region rows (insert-only, from the girls district brackets; expect 6 schools: Jefferson, Old Tappan, Ramsey D1; Cherry Hill East D11; Buena, Millville D12). East Orange, Roselle, Keansburg have no bracket entries and are left for manual picks.

**Tables affected:** `school_aliases`, `girls_school_districts`, `girls_school_regions`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback block in migration file
**Verified?** Yes — 2026-09-21: Jefferson, Old Tappan, Ramsey → D1/R10; Cherry Hill East → D11/R12; Buena, Millville → D12/R12

---

## 2026-09-21 — power_points: public read grant

**Migration file:** `docs/migrations/20260921_power_points_public_read.sql`

**Purpose:** `power_points` had a public SELECT policy (20260806) but no SELECT grant for `anon`/`authenticated`, so every public read failed with "permission denied" and the group pages never showed Power Points (they displayed an internal "run compute_power_points.mts" message instead, now replaced with "haven't been released yet"). The table now holds only official released figures (311 boys 2025-26 rows imported 2026-09-21), so public read is intended; writes stay service-role only.

**Tables affected:** `power_points` (grant only)

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — `REVOKE SELECT ON power_points FROM anon, authenticated`
**Verified?** Yes — 2026-09-21: anon and authenticated have SELECT; public key reads rows; /groups/group-1 shows 2025-26 PP (Delaware Valley 43.00, Manville 42.33)

---

## 2026-09-21 — Team-score cache refreshes itself (boys)

**Migration file:** `docs/migrations/20260921_team_score_cache_auto_refresh.sql`

**Purpose:** `precomputed_team_scores` never recomputed on its own, so it drifted every time bracket data changed (fixed once by the rebuild migration). Now: statement-level triggers on `tournament_entries` and `matches` mark the season dirty in `team_score_cache_dirty` when a boys postseason tournament's rows change; pg_cron runs `refresh_dirty_team_score_caches()` every 5 minutes, which rebuilds each dirty season once via `refresh_boys_team_score_cache(season)` (names via `school_display_name`). Marking is one small insert per statement, so imports aren't slowed. Immediate refresh: `SELECT refresh_boys_team_score_cache(2026);`. Girls not covered yet.

**Tables affected:** `team_score_cache_dirty` (new), `precomputed_team_scores` (via refresh); triggers on `tournament_entries`, `matches`; pg_cron job `refresh-boys-team-score-cache`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback block in migration file
**Verified?** Yes — 2026-09-21: `team_score_cache_dirty` present; boys cache re-audit vs RPCs 0 missing / 0 stale / 0 extra

---

## 2026-09-21 — API "Max rows" raised to 100,000 (CONFIG — Supabase dashboard)

**Migration file:** none — project API setting (Dashboard → Project Settings → Data API → Max rows). Recorded here because it changes what every query returns.

**Purpose:** PostgREST returned at most 1,000 rows per request whatever `.limit()`/`.range()` asked for, silently truncating ~500 reads (327 table queries, 187 RPC calls) — e.g. school points-per-dual rank used 1,000 of 3,980 boys meets, Dual Hub showed 72 of 3,974 completed meets, Data Health saw ~7% of wrestlers and entries. Raising the cap fixes all of them at once, including RPCs. Largest legitimate read today ≈ 55k rows (a season of dual bouts). Code that pages with `src/lib/fetchAllRows.ts` keeps working either way.

**APPLIED** — 2026-09-21 via Supabase dashboard

**Reversible?** Yes — set Max rows back to 1000
**Verified?** Yes — 2026-09-21: anon `.range(0, 9999)` on `dual_meets` returns 3,980; service role gets all 14,980 wrestlers

---

## 2026-09-21 — Boys district/region assignments from brackets (2024-25, 2025-26)

**Migration file:** `docs/migrations/20260921_boys_alignment_from_brackets.sql`

**Purpose:** The 2024-25 boys district rows were a copy of 2025-26 (303/305 identical) although districts were realigned. List vs actual district brackets: 2024-25 — 241 schools in the wrong district, 10 missing; 2025-26 — 2 wrong districts (Westwood, Kingsway), 33 wrong regions, 9 missing (incl. Bergen Charter, Cliffside Park, Kittatinny, Passaic Tech). Sets each school's district to the bracket it wrestled in and its region from that district (D1-4 → R1 … D29-32 → R8, verified from where qualifiers wrestled). Schools with no bracket entries unchanged; conferences untouched.

**Tables affected:** `boys_school_districts`, `boys_school_regions`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Partially — see note in migration file
**Verified?** Yes — 2026-09-21: 0 district / 0 region mismatches for both seasons; re-audit: 314 schools (2024-25, incl. Saddle Brook) and 310 (2025-26) all match their brackets

---

## 2026-09-21 — Rebuild boys team-score cache (2024-25, 2025-26)

**Migration file:** `docs/migrations/20260921_rebuild_boys_team_score_cache.sql`

**Purpose:** `precomputed_team_scores` (the only source for the postseason leaderboard) had drifted from the bracket data since it was last written (2026-07-22): of 1,233 boys rows, 108 schools missing (2024-25 District 31 had none; St Joseph (Montvale) missing from 2024-25 Region 2), 682 stale totals, 24 rows for schools that no longer score. Scoring functions unchanged since then; the data changed. Deletes and re-inserts every boys district/region/state tournament's rows from the scoring RPCs in one block, with names as of each season (`school_display_name`). Requires the Lodi/Saddle Brook migration first.

**Tables affected:** `precomputed_team_scores` (boys rows only)

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Re-runnable; old values were stale
**Verified?** Yes — 2026-09-21: 1,317 boys rows (2025: 296 district / 234 region / 128 state; 2026: 290 / 236 / 133); re-audit vs RPCs: 0 missing, 0 stale, 0 extra

---

## 2026-09-21 — service_role grants (33 tables) + 2026-27 hammer formula

**Migration file:** `docs/migrations/20260921_service_role_grants.sql`

**Purpose:** Probing every PostgREST endpoint with the service_role key found 33 tables returning "permission denied" (403), e.g. `hammer_score_config`, `admin_season_config`, `coaches`, `districts`, `regions`, `placements`, `ms_wrestlers`. Server code using `createSupabaseAdmin()` on these failed silently: the hammer formula editor could not load/save, and `/admin/calendar` always used hardcoded fallback dates. Grants `service_role` only; anon/authenticated unchanged. Also copies the active 2025-26 hammer formula to 2026-27 per gender (Finalize Season now does this for future rollovers).

**Tables affected:** 33 tables (grants); `hammer_score_config` (≤2 rows inserted)

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — `REVOKE ALL ON public.<table> FROM service_role;` per table; `DELETE FROM hammer_score_config WHERE season = '2026-27';`
**Verified?** Yes — 2026-09-21: all 118 PostgREST endpoints return 200 to service_role (0 blocked); hammer_score_config has active 2026-27 rows for M and F

---

## 2026-09-21 — Normalize 2026-27 season_calendar vocabulary

**Migration file:** `docs/migrations/20260921_season_calendar_2027_normalize.sql`

**Purpose:** The 2026-27 rows from `20260917_njsiaa_calendar_s3.sql` used categories `season`/`postseason` and event types `districts`/`regions`/`state`/`team_playoff` with no gender. The About page only renders the 2025-26 categories (so those rows never showed), and wrestler profiles, hammer recalculation and playoff detection look up 2025-26 event types. Converted 19 rows to the canonical vocabulary (`team_entry`, `weight`, `individual_boys`, `team_public_boys`, `team_np_boys`; `individual_district_boys`, `team_playoff_r12_public`, …). All rows are boys (per Kyle). Girls 2026-27 dates not yet entered.

**Tables affected:** `season_calendar` (19 rows updated, ids 124–142)

**APPLIED** — 2026-09-21 via REST (service role)

**Reversible?** Yes — restore values from `20260917_njsiaa_calendar_s3.sql`
**Verified?** Yes — 2026-09-21: season 2027 categories now individual_boys 6, team_entry 5, preseason 4, team_public_boys 4, team_np_boys 3, weight 1

---

## 2026-09-21 — Lodi (379) and Saddle Brook (59), boys; season-based school names

**Migration file:** `docs/migrations/20260921_restore_lodi_saddle_brook.sql`

**Purpose:** Boys only. Lodi and Saddle Brook were two programs in 2024-25 and merged into a Lodi-hosted co-op, "Lodi/Saddle Brook", from 2025-26. `20260806_merge_lodi.sql` had deleted Saddle Brook (59) and folded its 2024-25 postseason entries into 379; 379 was also missing from the 2025-26 boys program list. School names now follow the season:
- New `school_season_names` (school, season, gender → name) + `school_display_name()`: `schools.display_name` is the current name; the table records seasons where it differed. 379 stays "Lodi/Saddle Brook" (current) and is "Lodi" for 2024-25 boys
- Recreates **59 Saddle Brook** (original id, colors, logo) with a `boys_schools` row
- Boys program rows: 2024-25 both District 6, Region 2, NJIC; 2025-26 379 District 7, Region 2, NJIC (+ NJIC 2026-27)
- Re-points the 8 Saddle Brook 2024-25 boys postseason entries to 59 (aborts if count differs); Lodi's stay on 379
- Co-op: `school_coops` 379 ← 59 and 59 inactive, 2025-26 and 2026-27 boys
- Team-score cache rows for 2024-25 District 6 / Region 2 (379 as "Lodi", 59) and the missing 2025-26 boys District 7 / Region 2 rows for 379
- Alias "Lodi/Saddle Brook High School" → 379
- First version failed (rolled back, nothing applied): `inactive_school_seasons` primary key is still `(school_id, season_id)`, so a school can't be inactive for both genders in one season. Girls are out of scope here

**Tables affected:** `school_season_names` (new), `schools`, `boys_schools`, `boys_school_districts`, `boys_school_regions`, `boys_school_conferences`, `tournament_entries`, `school_coops`, `inactive_school_seasons`, `precomputed_team_scores`, `school_aliases`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback block in migration file
**Verified?** Yes — 2026-09-21: cache shows 2025 District 6 Saddle Brook 13.0 and Lodi 8.0; 2026 Lodi/Saddle Brook District 7 17.5, Region 2 3.0

---

## 2026-09-21 — Registry links and Belvidere dual dates

**Migration file:** `docs/migrations/20260921_registry_links_and_belvidere_dates.sql`

**Purpose:** Data corrections.
- `tournament_registry`: Hillsborough Holiday Brawl unlinked from the EB Lady Bear Invitational tournament (separate events); Del Val Kickoff marked not imported (0 bouts anywhere)
- `dual_meets`: Belvidere's 2/14 and 2/21 meets had swapped dates — Bloomfield meet → 2026-02-14, Union meet → 2026-02-21 (per source export)

**Tables affected:** `tournament_registry`, `dual_meets`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback block in migration file
**Verified?** Yes — 2026-09-21: Belvidere meets now 6ba739c1 (Union) 2026-02-21, b9b20fe0 (Bloomfield) 2026-02-14

---

## 2026-09-21 — power_points_computed: hide computed Power Points

**Migration file:** `docs/migrations/20260921_power_points_computed_table.sql`

**Purpose:** Computed Power Points stay hidden until the formula matches NJSIAA. `power_points` now holds official released figures only (Standings tab import); all public displays read it. New admin-only `power_points_computed` (RLS on, no anon/authenticated grants) receives `scripts/compute_power_points.mts` output for comparison against official. Moves the 314 existing rows (all computed 2026-08-09, none frozen) into it; aborts if any row is frozen. Public PP is empty until official figures are imported.

**Tables affected:** `power_points`, `power_points_computed` (new)

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback block in migration file
**Verified?** Yes — 2026-09-21: power_points 0 rows, power_points_computed 314 rows

---

## 2026-09-21 — Girls partial meets count toward record

**Migration file:** `docs/migrations/20260921_girls_partials_count_toward_record.sql`

**Purpose:** 1-2 bout girls meets stay tagged `meet_kind='partial'` but now count toward team W-L (`counts_toward_record=true`), reversing the 20260920 default. Records will be reviewed against official standings once all results are in; individual meets can be switched off then. Jamborees still never count. Importer sets the same for new partial meets.

**Tables affected:** `dual_meets_girls`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — rollback in migration file
**Verified?** Yes — 2026-09-21: dual 959, partial 206, all `counts_toward_record=true`

---

## 2026-09-21 — 2024-25 postseason dates in season_calendar

**Migration file:** `docs/migrations/20260921_season_calendar_2025_postseason.sql`

**Purpose:** Wrestler profiles now read postseason event dates from `season_calendar` (replacing a hardcoded map keyed by the old season ids 1/2). Season 2025 had no individual postseason rows, so its district/region/state events showed no date. Dates supplied by Kyle: boys districts 2/22/2025, regions 2/28–3/1/2025, state 3/6–3/8/2025; girls regions 2/23/2025, state 3/6–3/8/2025 (no girls districts in 2024-25).

**Tables affected:** `season_calendar` (5 rows inserted, ids 143–147)

**APPLIED** — 2026-09-21 via REST (service role)

**Reversible?** Yes — `DELETE FROM season_calendar WHERE season_id = 2025 AND event_type LIKE 'individual_%';`
**Verified?** Yes — 2026-09-21: 5 rows returned on insert with the dates above

---

## 2026-09-21 — Resolve boys dual ties from official NJSIAA W-L

**Migration file:** `docs/migrations/20260921_resolve_boys_ties_from_official_wl.sql`

**Purpose:** Uses the official 2025-26 Power Points W-L as the authority for tied boys duals (season 2026). A tie's winner is the only assignment that brings both schools to their official record.
- Resolves the 13 ties left pending by 20260919 (bout data could not decide them). Winner +1 team point, `criteria_winner_school_id` set, `tiebreaker_pending=false`, microcheck task completed. 10 confirmed by both schools' records; 3 one-sided (opponent not in the official list). Ridgefield Memorial (357) identified as official "Ridgefield".
- Reverses 4 criteria winners set by 20260919 that official W-L contradicts: 25c33521 (Willingboro), 7dfec3f2 (Bayonne), e2270193 (New Milford), 0a6edd13 (Pequannock). Moves the +1 point to the correct side.

**Tables affected:** `dual_meets`, `microcheck_tasks`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — see rollback notes in migration file
**Verified?** Yes — 2026-09-21: 0 pending boys ties, 0 pending tie tasks

---

## 2026-09-20 — conference_standings: add gender

**Migration file:** `docs/migrations/20260920_conference_standings_gender.sql`

**Purpose:** `conference_standings` had no gender column, so girls standings could not be stored and the public girls conference page was reading boys rows. Needed by the Past Seasons standings importer (gender-specific per program).

**What changed:**
- `conference_standings.gender text NOT NULL DEFAULT 'M'` with `CHECK (gender IN ('M','F'))` — all existing rows become boys
- Index `idx_conf_standings_season_gender (season_id, gender, conference_slug)`
- Public conference page and importer filter on it (code ships after this is applied)

**Tables affected:** `conference_standings`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — drop the index and column (see rollback block in migration file)
**Verified?** Yes — 2026-09-21: 285 rows `gender='M'`, 0 `'F'`; boys conference page renders, girls page empty

---

## 2026-09-20 — dual_meets_girls: meet_kind + counts_toward_record

**Migration file:** `docs/migrations/20260920_dual_meets_girls_meet_kind.sql`

**Purpose:** Girls duals include jamboree pairings and 1-2 bout "random" meets that look like one-match duals. Bouts from all of them must stay in the data (wrestler records, rankings, profiles), but jamboree pairings must not count as dual W-L, and partial meets only count when an official standings source includes them.

**What changed:**
- `dual_meets_girls.meet_kind text NOT NULL DEFAULT 'dual'` — `'dual' | 'partial' | 'jamboree'`
- `dual_meets_girls.counts_toward_record boolean NOT NULL DEFAULT true`
- Backfill: meets with 1-2 bouts → `meet_kind = 'partial'`, `counts_toward_record = false` (~206 of 1,165 at time of writing). The `counts_toward_record` default for partials is reversed by `20260921_girls_partials_count_toward_record.sql`
- Defaults leave the existing importer working unchanged; importer and W-L / Power Points code follow in a separate change

**Tables affected:** `dual_meets_girls`

**APPLIED** — 2026-09-21 via Supabase SQL editor

**Reversible?** Yes — drop the two columns (see rollback block in migration file)
**Verified?** Yes — 2026-09-21: 959 dual (957 with 3+ bouts, 2 with 0), 206 partial, 0 jamboree; 206 `counts_toward_record=false`

---

## 2026-09-20 — Seasons re-keyed to championship (ending) year

**Migration file:** `docs/migrations/20260919_rekey_seasons_championship_year.sql`

**Purpose:** Season IDs were a meaningless sequence (1, 2, 3); past seasons get backfilled out of order. Keys are now the championship year: 1→2025 (2024-25), 2→2026 (2025-26), 3→2027 (2026-27). Backfills take 2024, 2023, … Previous season = key − 1. Display labels unchanged.

**How:** All 32 FKs to `seasons` rebuilt with `ON UPDATE CASCADE`, then `seasons.id` set to `end_year`. The two season columns without an FK (`precomputed_team_scores`, `season_calendar`) and season IDs inside `microcheck_tasks.metadata` remapped explicitly. Row counts per season compared before/after inside the same transaction.

**Prerequisite (shipped first):** commit `bbf2384` removed every hardcoded season number from the app, so the code works with either numbering.

**Tables affected:** all 34 with `season_id`, plus `seasons`

**APPLIED** — 2026-09-20 via Supabase SQL editor

**Reversible?** Yes — same block with the map inverted (2025→1, 2026→2, 2027→3)
**Verified?** Yes — 2026-09-20: no rows remain under 1/2/3; spot counts match (duals 3,980 → 2026; tournaments 46 → 2025 / 58 → 2026; roster import 12,225 → 2026; microcheck metadata → 2026); public pages, state champions, podium and team-score leaderboards all render

**Follow-up:** `school_coops.season` had no FK so it was not remapped — handled by `20260920_school_coops_season_rekey_and_grants.sql`.

---

## 2026-09-20 — school_coops season re-key + missing grants

**Migration file:** `docs/migrations/20260920_school_coops_season_rekey_and_grants.sql`

**Purpose:**
- `school_coops.season` holds season IDs (verified: 1=M, 2=F — the code comment claiming start years was wrong) but had no FK, so the championship-year re-key skipped it. Remapped 1→2025, 2→2026 and given an FK with `ON UPDATE CASCADE` so future key changes follow.
- Grants `school_coops` and `precomputed_team_scores` to `service_role`/`authenticated`. Both returned "permission denied" to the API, which is why `/api/admin/school-enrollment` found no co-ops.

**Tables affected:** `school_coops`, `precomputed_team_scores` (grants only)

**APPLIED** — 2026-09-20 via Supabase SQL editor

**Reversible?** Yes — `UPDATE school_coops SET season = season - 2024; ALTER TABLE school_coops DROP CONSTRAINT school_coops_season_fkey;`
**Verified?** Yes — 2026-09-20: school_coops 2025|M|1, 2026|F|1; both tables now readable by the API (precomputed_team_scores 861 rows in 2025, 1,050 in 2026)

---

## 2026-09-19 — njsiaa-documents storage bucket (RECONSTRUCTED)

**Migration file:** `docs/migrations/20260919_njsiaa_documents_bucket.sql`

**Purpose:** Public Storage bucket for archived NJSIAA regulatory PDFs, so season documents survive NJSIAA link changes. Path: `<season end year>/<boys|girls>/<doc-slug>.pdf`.

Uploaded (2025-26 boys, SHA-256 verified against njsiaa.org originals):
- `2026/boys/regular-season-rules.pdf` — from njsiaa.org/.../2025-09/boys-wrestling-regular-season-rules-2025-26.pdf
- `2026/boys/team-tournament-regs.pdf` — from njsiaa.org/.../2025-11/wrestling-boys-team-regs-2025-26.pdf
- `2026/boys/individual-tournament-regs.pdf` — from njsiaa.org/.../2025-11/wrestling-boys-individual-regs-2025-26.pdf

**APPLIED** — 2026-09-19 via Storage API (RECONSTRUCTED SQL)

**Reversible?** Yes — empty and delete the bucket
**Verified?** Yes — public URLs return files with matching checksums

---

## 2026-09-19 — Season columns on roster_grade_import and microcheck_tasks

**Migration file:** `docs/migrations/20260919_season_columns_roster_import_microcheck.sql`

**Purpose:** Tools stop assuming a global season.
- `roster_grade_import.season_id` (NOT NULL, FK seasons) — each roster batch belongs to a season. Existing 12,225 rows backfilled to season 2 (2025-26). The review tool works on the newest season that has roster rows.
- `microcheck_tasks.season_id` (nullable, FK seasons) — each task carries the season it's about. Existing tie tasks backfilled from `metadata.season_id`.

**Tables affected:** `roster_grade_import`, `microcheck_tasks`

**APPLIED** — 2026-09-19 via Supabase SQL editor

**Reversible?** Yes — `ALTER TABLE roster_grade_import DROP COLUMN season_id; ALTER TABLE microcheck_tasks DROP COLUMN season_id;`
**Verified?** Yes — 12,225 roster rows → season 2; 91 tie tasks → season 2

---

## 2026-09-19 — Resolve boys dual ties from bout data + microcheck_tasks grants

**Migration file:** `docs/migrations/20260919_resolve_boys_dual_ties.sql`

**Purpose:**
- Grants `microcheck_tasks` to `service_role`/`authenticated`. The microcheck API was getting "permission denied", so resolving a tie updated the meet but never closed the task (risk of a repeat +1).
- Resolves 13 of 26 boys season-2 tied duals from bout data using NFHS order (bouts won > falls/forfeits/defaults/DQs > tech falls > majors). Winner +1 team point, `criteria_winner_school_id` set, `tiebreaker_pending=false`, microcheck task completed. 6 of the 13 had a wrong stored winner from the earlier fix (102ead4a, 150d3aac, e9bf93bb, 0a6edd13, 174cb660, 9920ebf9).
- Clears the unverified `criteria_winner_school_id` on the other 13 (identical through majors; 15a03fe4 also has only 8 of 14 bouts). They stay pending for manual resolution in microcheck.

**Tables affected:** `dual_meets`, `microcheck_tasks`

**APPLIED** — 2026-09-19 via Supabase SQL editor

**Reversible?** Partially — score +1 can be reversed by subtracting 1 from the winner side for the 13 listed meet IDs
**Verified?** Yes — 2026-09-19: 13 pending ties / 13 pending tasks

---

## 2026-09-18 — Microcheck generic task queue

**Migration file:** `docs/migrations/20260918_microcheck_tasks_table.sql`

**Purpose:** Adds `microcheck_tasks` table as a generic queue for any task type fed into the microcheck tool. Initial task type is `tie_resolution` — seeds all existing tied dual meets as tasks. The `/next` API checks this queue first (higher priority than computed school_profile tasks). Future task types (site_error, etc.) can be added by inserting rows.

**Tables affected:** `microcheck_tasks` (new)

**APPLIED** — pending run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE microcheck_tasks`
**Verified?** No — pending

---

## 2026-09-18 — Dual meet tiebreaker_pending flag

**Migration file:** `docs/migrations/20260918_dual_meet_tiebreaker_pending.sql`

**Purpose:** Adds `tiebreaker_pending boolean` to `dual_meets` and `dual_meets_girls`. Tied scores in wrestling are impossible (tiebreakers always produce a winner). When the import parser cannot extract the tiebreaker, this flag is set so the admin Tie Resolution tool can manually pick the winner. Seeds the flag on all existing tied meets.

**Tables affected:** `dual_meets`, `dual_meets_girls`

**APPLIED** — pending run in Supabase SQL editor

**Reversible?** Yes — `ALTER TABLE dual_meets DROP COLUMN tiebreaker_pending`
**Verified?** No — pending

---

## 2026-09-17 — Cliffside Park / Ridgefield Memorial season 1 co-op fix

**Migration file:** `docs/migrations/20260917_cliffside_ridgefield_s1_fix.sql`

**Purpose:** Fixes empty season-1 roster for Cliffside Park (364). Root cause: original `school_coops` seed used shell school 365 as `coop_school_id` with 364 as a member, causing `school_wrestlers` to query `school_id=365` instead of 364 (where tournament_entries actually live). Also fixes Beast of East bouts misattributed to Ridgefield Memorial (357) instead of Ridgefield CT (737).

**Changes:**
1. Deletes stale `school_coops` / `inactive_school_seasons` / `wrestler_name_aliases` rows for shells 365 and 381 (prior migration was rolled back due to FK failure)
2. Moves Mustang Invitational tournament_bouts from school 365 → 364
3. Deletes school 365 (bouts moved to 364 first, clearing the FK)
4. Deletes school 381 (Mary Help of Christians — no tournament data, FK-clear)
5. Adds `inactive_school_seasons (357, 1, 'M')` — Ridgefield Memorial competed as co-op in season 1
6. Adds `school_coops (coop_school_id=364, member_school_id=357, season=1, gender='M')` — proper co-op record using Cliffside Park as the coop school
7. Remaps Beast of East tournament_bouts for school 357 → 737 (Ridgefield CT); removes incorrect `school_aliases (357, 'Ridgefield')` entry

**Tables affected:** `school_coops`, `inactive_school_seasons`, `wrestler_name_aliases`, `tournament_bouts`, `schools`, `school_aliases`

**APPLIED** — pending run in Supabase SQL editor

**Reversible?** Partially — can re-insert school_coops rows and reset is_nj; school 381 row data is gone
**Verified?** No — pending

---

## 2026-09-17 — Delete empty shell schools (365, 381)

**Migration file:** `docs/migrations/20260917_delete_empty_shell_schools.sql`

**Purpose:** Remove two schools that have no program data and were inflating the boys preseason dashboard count (both had `is_nj=true`).
- id=365 Cliffside Park/Ridgefield Memorial — leftover co-op entry, both schools exist independently (364, 357); zero data attached
- id=381 Mary Help of Christians Academy — all-girls school, no wrestling program; one orphaned wrestler alias cleaned up

**Tables affected:** `schools`, `inactive_school_seasons`, `wrestler_name_aliases`

**NOT APPLIED** — rolled back due to FK violation on `tournament_bouts_wrestler1_school_id_fkey` for school 365; superseded by `20260917_cliffside_ridgefield_s1_fix.sql`

**Reversible?** N/A
**Verified?** N/A

---

## 2026-09-17 — Help Desk tickets table

**Migration file:** `docs/migrations/20260917_help_desk_tickets.sql`

**Purpose:** Adds the `help_desk_tickets` table for the new Help Desk admin tool. Admins can log site issues (with optional screenshots), mark urgency, and resolve tickets. Screenshots are stored in Supabase Storage bucket `ticket-attachments` (create manually in Dashboard → Storage).

**Tables affected:** `help_desk_tickets` (new)

**What changed:**
- New table with RLS: admin-only full access
- Columns: id, created_at, description, is_urgent, status (open/resolved), resolved_at, submitted_by_email, submitted_by_name, screenshot_urls (text[])
- New admin tool at `/admin/help-desk` added to Admin Tools section of the rail

**APPLIED** — run in Supabase SQL editor 2026-09-17

**Reversible?** Yes — `DROP TABLE public.help_desk_tickets;`
**Verified?** No — pending

---

## 2026-09-17 — Wrestler merges: Camden + Delbarton roster errors

**Migration file:** `docs/migrations/20260917_wrestler_merges_camden_delbarton.sql`

**Purpose:** Fix wrestler records exposed by roster grade import review.

- DELETE `631c7b83` — phantom wrestler "(Camden/Camden Eastside)" where the school name was imported as a wrestler name; no match data affected
- MERGE `2cb72062` Ahmad Clossen → `24942001` Ahmad Crosson (Camden)
- MERGE `61c4d732` C.j. Betz → `68fad72c` Carl Betz (Delbarton)
- MERGE `463f89bf` Nico Marchetti → `30d89fe4` Nicolas Marchetti (Delbarton)
- MERGE `5eb83cb8` Nick Schwartz → `f2a25bc8` Nicholas Schwartz (Delbarton)

Each merge remaps wrestler_a_id/wrestler_b_id/winner_id in matches, wrestler1_id/wrestler2_id in tournament_bouts, and wrestler_id in tournament_entries/placements (conflict-safe: drops source entry if target already has one for same tournament).

---

## 2026-09-17 — NJSIAA 2026-27 calendar seed + tournaments date columns

**Migration file:** `docs/migrations/20260917_njsiaa_calendar_s3.sql`

**Purpose:** Adds date support to the postseason `tournaments` table and seeds all NJSIAA 2026-27 calendar events into `season_calendar` for display as notification banners on the schedule page.

- `tournaments.start_date` / `tournaments.end_date` — new nullable date columns so postseason tournaments appear on the schedule page when navigating to their dates
- `season_calendar` — 23 new rows for the 2026-27 season (year_label='2026-27' must exist): preseason milestones, season milestones, team playoff dates (Public & Non-Public rounds through finals), and individual postseason (Districts / Regions / State Championships)
- Corrected two typos from source data: "02/03/2026" → 2027-02-03 (Public Sectional Finals); "b02/04/2027f" → 2027-02-04 (Non-Public State Semifinals)
- `seasons.start_date = 2026-12-07` / `seasons.end_date = 2027-02-27` set for the 2026-27 season row

---

## 2026-09-17 — Deactivate Donovan Catholic and Weehawken for boys season 2

**Migration file:** `docs/migrations/20260917_deactivate_dc_weehawken_s2.sql`

**Purpose:** Neither school has Track Wrestling roster data for 2025-26. Marks both inactive via `inactive_school_seasons`, removes from `boys_school_districts/regions/conferences` for season 2, and skips any pending `roster_grade_import` rows.

- `inactive_school_seasons`: inserted (school_id=248, season_id=2, gender=M) and (school_id=99, season_id=2, gender=M)

---

## 2026-09-17 — 7 Things article system

**Migration file:** `docs/migrations/20260917_articles_system.sql`

**Purpose:** Foundation for the "7 Things from Yesterday" article publishing system covering preseason, season, and postseason.

- `boys_articles` — new table: season_id, article_type (preseason|season|postseason), article_key (preseason identifier), section (null=state|north_i|north_ii|central|south), match_date, title, body, author, status (draft→finalized→published), completed (preseason dropdown checkmark), scheduled_publish_at, published_at
- `girls_articles` — identical structure, fully separate per gender separation rule
- Unique indexes enforce one body per article_key+section (preseason) and one article per section+match_date (season/postseason)
- `app_users.newsletter_subscribed` — boolean for email newsletter opt-in (used by 8 AM Resend cron)
- `seasons.start_date` / `seasons.end_date` — date range for Day X of Y display in the season report card

---

## 2026-09-16 — Filter Unknown stub wrestlers from school_wrestlers RPC

**Migration file:** `docs/migrations/20260916_school_wrestlers_filter_unknown.sql`

**Purpose:** Four "Unknown" wrestler stubs (71 aliases across 71 schools) were showing on school profile roster pages. Added `AND wr.first_name <> 'Unknown'` guard to all three wrestler JOINs in the `school_wrestlers` RPC: `school_entries` CTE, `postseason` CTE, and the final `inseason_only` UNION branch.

---

## 2026-09-16 — Fix PostgREST grants on boys_schools and microcheck_task_log

**Migration file:** `docs/migrations/20260916_fix_boys_schools_grants.sql`

**Purpose:** Grant SELECT/DML on tables created via raw SQL that were missing the automatic grants Supabase applies for dashboard-created tables. Fixes "permission denied for table boys_schools" and related errors in the Micro Checks tool.

- `boys_schools` — GRANT SELECT to anon, authenticated, service_role
- `microcheck_task_log` — GRANT SELECT/INSERT/UPDATE/DELETE to authenticated, service_role; SELECT to anon
- All sequences in public schema — GRANT USAGE, SELECT to authenticated, service_role

---

## 2026-09-16 — Microcheck preseason data-entry tool schema

**Migration file:** `docs/migrations/20260916_microcheck_schema.sql`

**Purpose:** Adds infrastructure for the Microcheck tool — a mobile-friendly single-task preseason data-entry queue.

- `schools.address` (text) — school physical address
- `schools.facebook_url` (text) — school/wrestling Facebook page URL
- `microcheck_task_log` table — records completed and can't-find outcomes per school/gender/field with admin attribution and timestamp. Unique constraint on (school_id, gender, field) prevents duplicate outcomes.

Task priority order (boys): address → website_url → twitter_handle → facebook_url → coach_name → coach_email → ad_name → ad_email → roster_match. Girls queued after season 3 rollover.

---

## 2026-09-16 — Fix girls_schools slash names and is_combined for 6 permanent co-ops

**Migration:** applied directly via SQL editor (no separate file — part of the 20260916 co-op cleanup series)

Schools 44, 62, 83, 130, 321, 383 were already in `girls_schools` from the split migration but with slash names and `is_combined=false`. Updated to dash names and `is_combined=true`:
- 44: Leonia-Palisades, 62: Lenape Valley-Hopatcong, 83: Lyndhurst-North Arlington
- 130: Brearley-Dayton, 321: Becton-Wood-Ridge, 383: Middlesex-Dunellen

These are long-standing combined programs for both boys and girls.

---

## 2026-09-16 — Fix Demarest-Old Tappan: girls-only co-op, not boys

**Migration file:** `docs/migrations/20260916_fix_demarest_old_tappan.sql`

**Purpose:** The 20260916_girls_coop_cleanup migration incorrectly applied the co-op name "Demarest-Old Tappan" to boys_schools for school 314. The co-op is girls-only — Demarest has an independent boys program. Reverted boys_schools and schools.display_name to "Demarest". Added girls_schools row for school 314 ("Demarest-Old Tappan", is_combined=true). Fixed Old Tappan (6) inactive_school_seasons: removed incorrect gender='M' record, inserted (6, 2, 'F').

---

## 2026-09-16 — Revert Mount Olive and Parsippany Hills display names

**Migration file:** `docs/migrations/20260916_fix_mt_olive_parsippany_hills.sql`

**Purpose:** School 56 (Mt. Olive/Randolph) and school 78 (Parsippany Hills/Parsippany) were incorrectly named as co-ops by the 20260826 migration. Both are separate independent boys programs. Reverted to "Mount Olive" and "Parsippany Hills" in `schools` and `boys_schools`. No inactive_school_seasons records existed for schools 64 or 87.

---

## 2026-09-16 — Girls co-op cleanup: delete 4 artifact schools, fix display names, fix is_combined

**Migration file:** `docs/migrations/20260916_girls_coop_cleanup.sql`

**Purpose:** Audit and fix all co-op artifacts created by the 20260826 school_coop_consolidation migration.

**is_combined fixes (non-artifacts):**
- Schools 3 (Emerson-Park Ridge), 206 (Ranney), 381 (Mary Help of Christians Academy): set `is_combined = false` in `schools`, `boys_schools`, and/or `girls_schools`.

**Newton (school 24):**
- Reverted `schools.display_name` and `boys_schools.display_name` from "Newton/Kittatinny" → "Newton".
- Deleted incorrect `inactive_school_seasons` rows for school 315 (Kittatinny, gender=M) — active boys program with 73 entries.

**Sparta (school 26):**
- Deleted incorrect `inactive_school_seasons` gender='M' record (backfilled from 20260826 migration).
- Inserted correct `inactive_school_seasons (26, 2, 'F')` — Sparta girls join Jefferson-Sparta co-op.

**Deleted artifact combined schools (data moved to primary hosts):**
- 360 (Buena/Vineland) → all girls data moved to school 287 (Buena); school deleted.
- 363 (Cherry Hill East/Cherry Hill West) → all girls data moved to school 267 (Cherry Hill East); school deleted.
- 372 (Jefferson-Sparta artifact) → all girls data moved to school 4 (Jefferson); school deleted.
- 392 (Ramsey/Northern Highlands) → all girls data moved to school 18 (Ramsey); school deleted.

**Girls co-op primary hosts added to girls_schools:**
- 4 (Jefferson): "Jefferson-Sparta", is_combined=true
- 287 (Buena): "Buena-Vineland", is_combined=true
- 267 (Cherry Hill East): "Cherry Hill East-West", is_combined=true
- 18 (Ramsey): updated to "Ramsey-Northern Highlands", is_combined=true

**Secondary schools marked inactive for girls season 2:**
- 294 (Vineland) → girls join Buena (287)
- 268 (Cherry Hill West) → girls join Cherry Hill East (267)
- 26 (Sparta) — handled above
- 35 (Northern Highlands) — already present from prior migration

**Slash → dash display name cleanup:**
- girls_schools school 76: "Morris Hills/Morris Knolls" → "Morris Hills-Morris Knolls"
- boys_schools + schools: 314 (Demarest-Old Tappan), 62 (Lenape Valley-Hopatcong), 321 (Becton-Wood-Ridge), 44 (Leonia-Palisades), 83 (Lyndhurst-North Arlington), 130 (Brearley-Dayton), 383 (Middlesex-Dunellen)
- school 3 everywhere: "Emerson-Park Ridge"

**Code change:** `HeaderNav.tsx` — removed `.eq('is_combined', false)` from school search query; combined/co-op schools are real programs that must be searchable.

**Reversible?** Data moves are reversible by re-routing FK refs back to artifact IDs; artifact school rows would need to be re-inserted.

---

## 2026-09-15 — Create boys_schools and girls_schools; fix Morris Hills; update school_directory

**Migration file:** `docs/migrations/20260915_boys_girls_schools_split.sql`

**Tables created:** `boys_schools`, `girls_schools`

**Purpose:** Split gender-specific school display attributes out of the shared `schools` table. Each gender table stores `(school_id PK → schools.id, display_name, is_combined)`. The `schools.id` FK is unchanged across all other tables. Only display-facing queries join the gender tables.

**Data fixes included:**
- School 76 (Morris Hills): boys="Morris Hills"/not combined; girls="Morris Hills/Morris Knolls"/combined
- `schools.display_name` for school 76 reverted to "Morris Hills" (the August 2026 consolidation migration had wrongly set it to the girls co-op name)
- School 77 (Morris Knolls): removed from girls_schools (boys-only program); fixed inactive_school_seasons — was incorrectly marked inactive for boys, now inactive for girls only
- School 385: not included in either gender table (artifact with no data)

**Function updated:** `school_directory(p_gender, p_season)` — now joins `boys_schools` or `girls_schools` to resolve display name based on p_gender, falling back to `schools.display_name`. Removed the is_combined filter (no longer needed; artifact schools excluded by having no tournament entries).

**Code changes:** `SchoolProfileCore.tsx` — gender-specific display name lookup in parallel with co-op queries. `roster-grade-import/schools/route.ts` — ?list=true now reads from `boys_schools`.

**Reversible?** Yes — drop `boys_schools` and `girls_schools`, restore `schools.display_name = 'Morris Hills/Morris Knolls'` for id=76, re-deploy previous school_directory RPC.

---

## 2026-09-15 — Fix school_directory RPC to exclude is_combined schools

**Migration file:** `docs/migrations/20260915_school_directory_is_combined_filter.sql`

**Function changed:** `school_directory(p_gender, p_season)`

**What changed:** Added `AND s.is_combined = false` to the `JOIN schools` clause. Combined/co-op school records (e.g. school 385 Morris Hills-Morris Knolls) were appearing in boys public school search because their `tournament_entries` rows were tagged to the combined record. The filter ensures only active single-program schools appear in results.

**Reversible?** Yes — remove `AND s.is_combined = false` from the JOIN and re-run.

---

## 2026-09-15 — Create roster_grade_import staging table

**Migration file:** `docs/migrations/20260915_roster_grade_import.sql`

**Table created:** `roster_grade_import`

**Purpose:** Persistent staging table for Track Wrestling full-program roster data. Serves two roles:
1. Retroactive grade assignment — match Track roster entries to existing wrestlers, confirm grades, write `grade + grade_confirmed_source='roster_upload'` to live `wrestlers` table
2. Ongoing new-wrestler lookup — when a new wrestler is added at a school, query `no_match` entries at that school to auto-suggest a grade

**Columns:** `school_name_raw, first_name_raw, last_name_raw, weight_class, grade, school_id (FK), wrestler_id (FK), status, import_batch, confirmed_by, confirmed_at`

**Status flow:** `pending → school_matched → wrestler_matched → confirmed` or `→ no_match` (open for future wrestler lookup) or `→ skipped` (deferred school)

**Why:** Districts data only covers wrestlers who competed at districts (~3,600). Full school rosters include JV/backup wrestlers (~12,000+). This table is the bridge to grade the full active roster before each season rollover.

**Reversible?** Yes — `DROP TABLE roster_grade_import CASCADE`

---

## 2026-09-12 — Split in_season_tournaments / tournament_bouts into separate girls tables

**Migration file:** `docs/migrations/20260912_split_tournament_tables_girls.sql`

**Tables created:**
- `in_season_tournaments_girls` — mirrors `in_season_tournaments` without `gender` column (implicitly girls)
- `tournament_bouts_girls` — mirrors `tournament_bouts` with FK to `in_season_tournaments_girls`
- `in_season_tournament_participants_girls` — mirrors `in_season_tournament_participants` with girls FK
- `in_season_tournament_seeds_girls` — mirrors `in_season_tournament_seeds` with girls FK

**What changed:**
- Phase 1 (this migration): creates tables + backfills from existing gender='F'/'both' rows in originals; originals left intact
- Phase 2 (code): all source files updated to point boys → `in_season_tournaments`, girls → `in_season_tournaments_girls`
- Phase 3 (cleanup, deferred): delete gender='F' rows from originals, drop `gender` column from `in_season_tournaments`

**Why:** `in_season_tournaments` used a `gender` column on a shared table. RPCs joining `tournament_bouts` without a `gender` filter caused girls tournament pins to inflate boys rankings (Collingswood bug). Root fix is complete separation, matching the existing `dual_meets` / `dual_meets_girls` pattern.

**Reversible?** Yes — drop the four new tables to roll back Phase 1 (original tables untouched)
**Verified?** Pending — run verification queries at bottom of migration file after applying

---

## 2026-09-12 — Backfill wrestlers.grade from tournament_entries.grade_label

**Migration file:** `docs/migrations/20260912_backfill_wrestler_grade.sql`

**Tables affected:** `wrestlers` (rows updated)

**What changed:**
- `wrestlers.grade` backfilled with the most-recent `grade_label` ('Fr'/'So'/'Jr'/'Sr') from `tournament_entries` for each wrestler where `grade` was previously NULL
- `grade_confirmed_source` set to `'districts'` and `grade_confirmed_at` stamped for all backfilled rows
- Wrestlers with an already-set grade are untouched

**Why:** `wrestlers.grade` was added in `20260824_roster_enrollment.sql` without a backfill. The grade was already captured per-entry at import time in `tournament_entries.grade_label`, causing the admin profile to show "Unknown" for wrestlers whose grade was only in the entry-level data.

**Reversible?** Yes — see rollback block at bottom of migration  
**Verified?** Yes — 2026-09-12

---

## 2026-09-09 — Snapshot Dashboard schema

**Migration file:** `docs/migrations/20260909_snapshot_schema.sql`

**Tables affected:** `schools` (column added), `snapshot_reports` (new), `snapshot_season_highs` (new), `snapshot_streak_state` (new), `snapshot_reports_girls` (new), `snapshot_season_highs_girls` (new), `snapshot_streak_state_girls` (new)

**What changed:**
- `schools.locale_section` added — geographic section for Non-Public schools (North I/II/Central/South)
- `snapshot_reports` / `_girls` — one row per date; full computed payload as JSONB
- `snapshot_season_highs` / `_girls` — season record per stat_key (fastest_pin, longest_streak, etc.)
- `snapshot_streak_state` / `_girls` — rolling streak per wrestler+type; used for snapped streak detection

**Reversible?** Yes — see rollback block at bottom of migration
**Verified?** Yes — 2026-09-09

---

## 2026-09-09 — Delete girls dual meets Dec 2025 – Jan 2026 for reimport

**Migration file:** `docs/migrations/20260909_delete_girls_duals_dec2025_jan2026.sql`

**Tables affected:** `dual_meets_girls` (rows deleted), `dual_meet_matches_girls` (rows cascaded)

**What changed:**
- All `dual_meets_girls` rows with `meet_date` between 2025-12-01 and 2026-01-31 deleted
- All child `dual_meet_matches_girls` rows deleted via `ON DELETE CASCADE`
- Cleared to allow reimport with corrected weight-class parsing

**Reversible?** No — reimport from source files after running
**Verified?** Yes — 2026-09-09

---

## 2026-09-09 — Create separate girls dual meet tables

**Migration file:** `docs/migrations/20260909_girls_dual_meet_tables.sql`

**Tables affected:** `dual_meets_girls` (new), `dual_meet_matches_girls` (new), `dual_meets` (rows deleted), `dual_meet_matches` (rows deleted)

**What changed:**
- Created `dual_meets_girls` — mirror of `dual_meets` but without `gender` column (implied 'F')
- Created `dual_meet_matches_girls` — mirror of `dual_meet_matches` WITHOUT the `dmm_unique_weight_per_meet` unique constraint (allows tri-meets / jamborees with multiple bouts per weight class)
- Both tables have RLS public-read, service_role write
- Existing `gender='F'` rows migrated from `dual_meets` → `dual_meets_girls`
- Their match rows migrated from `dual_meet_matches` → `dual_meet_matches_girls`
- Original girls rows deleted from the shared tables

**PENDING** — run `docs/migrations/20260909_girls_dual_meet_tables.sql` in Supabase SQL editor

**Reversible?** Yes — see rollback block at bottom of migration file (drops both girls tables)
**Verified?** Pending

---

## 2026-09-09 — Add gender to dual_import_drafts

**Migration file:** `docs/migrations/20260909_dual_import_drafts_gender.sql`

**Tables affected:** `dual_import_drafts`

**What changed:**
- Added `gender text NOT NULL DEFAULT 'M' CHECK (gender IN ('M', 'F'))` column
- Drafts are now self-describing — a girls draft and a boys draft are no longer identical in storage
- The draft list UI shows a Boys/Girls badge next to each saved draft

**APPLIED** — run `docs/migrations/20260909_dual_import_drafts_gender.sql` in Supabase SQL editor

**Reversible?** Yes — `ALTER TABLE dual_import_drafts DROP COLUMN gender;`
**Verified?** Pending

---


## 2026-09-07 — Fix girls co-op school enrollments

**Migration file:** `docs/migrations/20260907_fix_girls_coop_enrollments.sql`

**What changed:**
- `girls_school_districts` + `girls_school_regions` — Ramsey (18) removed from D1/Region 10; Ramsey/Northern Highlands (392) inserted in its place.
- `girls_school_districts` + `girls_school_regions` — Cherry Hill East (267) and Cherry Hill West (268) removed from D11/Region 12; Cherry Hill East/Cherry Hill West (363) inserted as the single combined program entity.

**Why:** Solo component schools were enrolled instead of the correct co-op school entities. Confirmed by auditing all "/" school names in the official NJSIAA PDF against DB enrollments.

**Reversible?** Yes — swap the DELETEs and INSERTs.

---

## 2026-09-07 — Fix girls district misassignments (D5/D6, D11/D12)

**Migration file:** `docs/migrations/20260907_fix_girls_district_assignments.sql`

**Source of truth:** NJSIAA Girls Wrestling District/Region Alignment 2025-2026 PDF

**What changed:**
- `girls_school_districts` — Woodbridge (187): moved from District 5 → District 6 (still Region 11, no region change).
- `girls_school_districts` — Timber Creek (301), Washington Township (302), Williamstown (303), Winslow (304): moved from District 11 → District 12 (still Region 12, no region change).
- D1–D4 and D7–D10 were verified correct against the official PDF.

**Reversible?** Yes — swap district_id values in the same UPDATEs.

---

## 2026-09-07 — Fix Jefferson girls district/region enrollment

**Migration file:** `docs/migrations/20260907_fix_jefferson_girls_district_region.sql`

**What changed:**
- `girls_school_districts` — removed Jefferson (4) from District 1 season 2; inserted Jefferson-Sparta (372) into District 1 season 2.
- `girls_school_regions` — removed Jefferson (4) from Region 10 season 2; inserted Jefferson-Sparta (372) into Region 10 season 2.

**Why:** The original district setup migration used school_id=4 (Jefferson, boys school) instead of school_id=372 (Jefferson-Sparta, girls co-op). This caused `loadGenderProgramSchoolIds('F', 2)` to include Jefferson and exclude Jefferson-Sparta from the girls school matching pool, making the importer match "Jefferson-Sparta" fuzzy → "Jefferson".

**Reversible?** Yes — swap the DELETEs and INSERTs.

---

## 2026-09-07 — Jefferson-Sparta girls co-op alias + data cleanup

**Migration file:** `docs/migrations/20260907_jefferson_sparta_girls_alias.sql`

**What changed:**
- `school_aliases` — new row: alias="Jefferson", alias_type="nj", school_id=372 (Jefferson-Sparta), notes="gender:F". Redirects the raw RTF name "Jefferson" to Jefferson-Sparta for girls imports. Boys still exact-match to Jefferson (ID 4).
- `wrestler_name_aliases` — re-linked any girls wrestler aliases whose school_id was Jefferson (4); corrected to Jefferson-Sparta (372). (wrestlers table has no school_id column — school bond lives here.)
- `tournament_bouts` — re-linked wrestler1/2_school_id for girls wrestlers incorrectly anchored to Jefferson.
- `tournament_placements` — same correction for girls placement rows.
- `tournament_entries` — 22 girls postseason entries had school_id=4; corrected to 372.
- `dual_meets` — team1/2_school_id corrected for gender='F' meets involving Jefferson.
- `dual_meet_matches` — school_a/b_id corrected for girls meets.
- `precomputed_team_scores` — 1 girls_regions row had school_id=4; corrected to 372 with school_name='Jefferson-Sparta'.

**Code side (no schema change):** `matchSchoolNames` now checks gender-specific aliases (notes="gender:F"/"gender:M") BEFORE the exact NJ display_name step, so co-op redirects take priority over same-name boys schools.

**Reversible?** Yes — delete the alias row; revert each table by re-running the inverse UPDATE (swap Jefferson-Sparta and Jefferson in the WHERE/SET clauses).

---

## 2026-09-07 — Document school_directory RPC (RECONSTRUCTED)

**Migration file:** `docs/migrations/20260907_document_school_directory_rpc.sql`

**What changed:**
- No schema change — documents the `school_directory(p_gender, p_season)` function that was previously created directly in the Supabase dashboard without a migration file.
- Function returns schools with wrestlers in gender-scoped postseason tournaments; used by all public girls/boys school directory pages.
- Gender separation enforced by `tournaments.gender = p_gender` join condition.

---

## 2026-09-03 — fan_scores: fan scoring table + meet_time on dual_meets

**Migration file:** `docs/migrations/20260903_fan_scores.sql`

**What changed:**
- `dual_meets.meet_time time` (nullable) — stored match start time; NULL defaults to 18:00 Eastern when computing the 15-min fan-scoring window
- New table `fan_scores` — stores a fan's per-bout scored picks for a dual meet, linked to `auth.users.id`. RLS restricts each user to their own rows. Columns: id, user_id, dual_meet_id, bouts (jsonb array), team_a_score, team_b_score, finalized_at, created_at, updated_at. Unique on (user_id, dual_meet_id).

**APPLIED** — 2026-09-04

**Reversible?** Yes — `DROP TABLE fan_scores; ALTER TABLE dual_meets DROP COLUMN meet_time;`

---

## 2026-09-02 — admin_build_health_tasks: new table for Admin Build Health page

**Migration file:** `docs/migrations/20260902_admin_build_health_tasks.sql`

**What changed:** New table `admin_build_health_tasks` — stores per-section tasks visible to all admin users. Rows are deleted (not soft-deleted) when marked complete. Has RLS open to all authenticated users.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE admin_build_health_tasks;`

---

## 2026-09-01 — fix_tournament_strength_rounds: fix Bracket column in tournament hub

**Migration file:** `docs/migrations/20260901_fix_tournament_strength_rounds.sql`

**What changed:** Rebuilt `tournament_strength_report` RPC with two fixes: (1) `bracket_status` CTE now compares against normalized DB round codes (`'F'`, `'3rd_Place'`, `'5th_Place'`, `'7th_Place'`) instead of display labels (`'Finals'`, `'3rd Place'`, etc.). (2) Drops both the old 2-param and 3-param signatures and recreates the gender-aware 3-param version cleanly so boys and girls hub both work.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — re-run `20260811_tournament_point_value.sql` to restore old 2-param version.

---

## 2026-09-01 — add_csv_source_format: extend source_format check constraint

**Migration file:** `docs/migrations/20260901_add_csv_source_format.sql`

**What changed:** Drops and recreates the `in_season_tournaments_source_format_check` constraint to add `'csv'` as a valid value alongside `'full_bracket'` and `'school_tracking'`. Required for the new CSV import pipeline.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — drop and recreate constraint without `'csv'`.

---

## 2026-08-31 — peddie_school_is_nj_false: mark Peddie School as non-NJSIAA

**Migration file:** `docs/migrations/20260831_peddie_school_is_nj_false.sql`

**What changed:** Set `schools.is_nj = false` for The Peddie School (id=603). Back-fills wrestlers whose only tournament_entries school is Peddie to `is_oos = true`. Fixes wrestler search showing non-NJSIAA wrestlers.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — set `is_nj = true` for id=603 and `is_oos = false` for affected wrestlers.

---

## 2026-08-31 — placement_bracket: add bracket column to tournament_placements

**Migration file:** `docs/migrations/20260831_placement_bracket.sql`

**What changed:** Added `bracket text NOT NULL DEFAULT ''` to `tournament_placements`. Replaced the unique constraint `(in_season_tournament_id, weight_class, place)` with `(in_season_tournament_id, weight_class, place, bracket)`. Enables girls tournaments to have A/B bracket pools at the same weight class, each with their own placements stored under bracket='A'/'B'.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — drop the new constraint, re-add the old one, then `ALTER TABLE public.tournament_placements DROP COLUMN bracket;`

---

## 2026-08-30 — grant_team_scores_permissions: fix service_role access on team scores table

**Migration file:** `docs/migrations/20260830_grant_team_scores_permissions.sql`

**What changed:** Added explicit `GRANT` statements on `in_season_tournament_team_scores` for `service_role` (ALL), `authenticated` (SELECT), and `anon` (SELECT). The table was created via SQL migration without these grants, causing silent "permission denied" failures during RTF import's team score insert.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — `REVOKE ALL ON public.in_season_tournament_team_scores FROM service_role, authenticated, anon;`

---

## 2026-08-30 — nonnjsiaa_schema: clubs, MS wrestler identity, HS off-season tables

**Migration file:** `docs/migrations/20260830_nonnjsiaa_schema.sql`

**Tables created:** `nonnjsiaa_clubs`, `ms_wrestlers`, `hs_offseason_tournaments`, `hs_offseason_placements`

**Tables dropped:** `ms_postseason_credit`

**Tables altered:** `ms_placements` — dropped `hs_wrestler_id`, added `ms_wrestler_id` (FK → `ms_wrestlers`), added `club_id` (FK → `nonnjsiaa_clubs`)

**What changed:** Replaces the direct `ms_placements.hs_wrestler_id` link (which required a separate `ms_postseason_credit` cache) with a proper `ms_wrestlers` identity table. Each MS wrestler now has a stable record with a `canonical_name` chosen during import review; all their placements across different tournaments link to this single identity via `ms_wrestler_id`. The optional `ms_wrestlers.hs_wrestler_id` link to a HS wrestler record is set manually to enable club badge display and on-the-fly hammer score credit computation — the recalculate route now traverses `ms_wrestlers → ms_placements → ms_tournament_tiers` instead of reading a cached credit value. `nonnjsiaa_clubs` is a shared lookup table for club programs; `club_id` appears on both `ms_placements` and `hs_offseason_placements` so a club profile can aggregate all results across both domains. `hs_offseason_tournaments` and `hs_offseason_placements` are reference-only (no tier credit, no hammer score impact); `hs_wrestler_id` on placements is matched during import using the standard `matchWrestler()` lookup. RLS: authenticated read, service_role write on all new tables.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE IF EXISTS hs_offseason_placements, hs_offseason_tournaments, ms_wrestlers, nonnjsiaa_clubs CASCADE; ALTER TABLE public.ms_placements DROP COLUMN IF EXISTS ms_wrestler_id, DROP COLUMN IF EXISTS club_id;` — note: `ms_postseason_credit` and `ms_placements.hs_wrestler_id` are not automatically restored.

**Verified?** No

---

## 2026-08-29 — ms_prospect_schema: middle school prospect tracking tables

**Migration file:** `docs/migrations/20260829_ms_prospect_schema.sql`

**Tables created:** `ms_tournament_tiers`, `ms_tournaments`, `ms_placements`, `ms_postseason_credit`

**What changed:** Foundation for the MS prospect system. `ms_tournament_tiers` stores named tier definitions (National, State, Regional, etc.) with placement credit values (`credit_1` through `credit_8`) expressed on the same 0–50 scale as the hammer score postseason component. `ms_tournaments` stores individual MS tournament events linked to a tier; changing the tier retroactively affects all credit calculations for its placements. `ms_placements` holds one row per podium finish (places 1–8 only — no match-level data); `wrestler_name` and `school_name` are stored raw; `hs_wrestler_id` is null until a human confirms the link during HS import review. Indexed on `lower(wrestler_name)` for fast cross-reference lookups. `ms_postseason_credit` stores the confirmed MS credit per HS wrestler after a link is approved; `superseded_at` is set once the wrestler has real HS postseason data, at which point the hammer score formula ignores the MS credit. RLS: authenticated read; service_role write on all four tables.

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE IF EXISTS ms_postseason_credit, ms_placements, ms_tournaments, ms_tournament_tiers CASCADE;`
**Verified?** No

---

## 2026-08-29 — individual_upset_schema: upset tracking tables for weekly rankings publication

**Migration file:** `docs/migrations/20260829_individual_upset_schema.sql`

**Tables created:** `individual_upsets`, `individual_upset_completion`

**What changed:** Two tables support per-weight upset review published alongside weekly individual rankings. `individual_upsets` stores one row per upset match per week+weight, auto-populated from `wrestler_match_score_log` for the Mon–Sun window ending on the week's Sunday publish date. Geographic context (district/region/section for both wrestlers) is denormalized at compute time. `include_in_publish` is toggled by admin during editorial review. Publication scoping rule: upset appears under the winner's (underdog's) district/section; the loser's group gets a "reason for change" note only if the loss caused a rank drop in that group's rankings. `individual_upset_completion` marks the upset review done for a week+weight (single pass per weight, not per district). RLS: authenticated read; service_role full access. Changes section in published output starts at Week 2 (compares to Week 1 saved rankings).

**APPLIED** — NOT YET — run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE IF EXISTS individual_upset_completion, individual_upsets CASCADE;`
**Verified?** No

---

## 2026-08-29 — individual_ranking_schema: new tables for district→state ranking workbench

**Migration file:** `docs/migrations/20260829_individual_ranking_schema.sql`

**Tables created:** `individual_ranking_weeks`, `individual_rankings`, `individual_ranking_completion`

**What changed:** Foundation for the individual rankings workbench. Three tables support the district → region → section → state workflow across 9 weekly ranking deadlines. `individual_ranking_weeks` holds the 9 week dates per season/gender (seeded separately). `individual_rankings` stores one row per wrestler per stage-entity per week/weight, with `manual_rank` (NULL until assigned) and a `hammer_score_snapshot` copied at load time. `individual_ranking_completion` is written when a stage is saved/locked, enforcing the gating order in application code. `stage_entity` is a text key: district_id, region_id, section name, or 'state'. RLS: public read on weeks; authenticated read on rankings/completion; service_role full access.

**APPLIED** — `docs/migrations/20260829_individual_ranking_schema.sql`

**Reversible?** Yes — `DROP TABLE individual_ranking_completion, individual_rankings, individual_ranking_weeks CASCADE;`
**Verified?** No

---

## 2026-08-29 — individual_ranking_season3_seed: week-date rows for Season 3

**Migration file:** `docs/migrations/20260829_individual_ranking_season3_seed.sql`

**Tables affected:** `individual_ranking_weeks`

**What changed:** Seeds 18 rows (9 weeks × 2 genders) for Season 3 (2026-27). Dates: Dec 13, 20, 27 2026; Jan 3, 10, 17, 24, 31; Feb 7 2027. **DO NOT RUN until Season 3 exists in `seasons` table (`year_label = '2026-27'`).** Script validates and raises an error if Season 3 is missing. Safe to re-run (ON CONFLICT DO NOTHING).

**APPLIED** — 2026-09-21 via REST (service role) — 18 rows inserted for season 2027 (same dates as the file)

**Reversible?** Yes — `DELETE FROM individual_ranking_weeks WHERE season_id = (SELECT id FROM seasons WHERE year_label = '2026-27');`
**Verified?** No

---

## 2026-08-28 — lb_rs_individual_stats v10: add weight_class to RPC

**Migration file:** `docs/migrations/20260828_rs_leaderboard_rpcs_v10.sql`

**Tables affected:** none (function only)

**What changed:** Added `weight_class int` and `grade text` to `lb_rs_individual_stats` return type. `weight_class` computed via `MODE() WITHIN GROUP (ORDER BY r.weight_class)` — each wrestler's most-frequent competing weight, fixing filter that previously used `fastest_pin_wt`/`fastest_tf_wt` (which could be a different weight than where the wrestler competes). `grade` joined from `wrestlers.grade` to enable filtering by class year (Fr/So/Jr/Sr).

**APPLIED** — `docs/migrations/20260828_rs_leaderboard_rpcs_v10.sql`

**Reversible?** Yes — re-run v9 migration to roll back.
**Verified?** No

---

## 2026-08-27 — inactive_school_seasons: add gender column; fix school_coops gender values

**Migration file:** `docs/migrations/20260827_inactive_school_seasons_gender.sql`

**Tables affected:** `inactive_school_seasons` (altered), `school_coops` (altered)

**What changed:**
- `school_coops.gender`: updated all `'B'` values to `'M'`; added CHECK constraint enforcing `'M'|'F'` only
- `inactive_school_seasons.gender`: new NOT NULL text column with CHECK `'M'|'F'`
- Backfilled gender from `school_coops` for known coop member rows; defaulted remaining to `'M'`
- Dropped old unique constraint `(school_id, season_id)`; replaced with `(school_id, season_id, gender)` so a school can be inactive for one gender but active for the other in the same season

**Applied:** No — run migration in Supabase SQL editor before deploying.

**Reversible?** Yes — ALTER TABLE inactive_school_seasons DROP COLUMN gender; revert school_coops UPDATE.

---

## 2026-08-27 — hammer_score_config: formula configuration table with initial seed values

**Migration file:** `docs/migrations/20260827_hammer_score_config.sql`

**Tables affected:** `hammer_score_config` (new)

**What changed:**
- New table `hammer_score_config` — stores all tunable hammer score formula parameters as a JSONB blob, keyed by gender + season
- Columns: id (bigint identity PK), gender ('M'/'F'), season (text), name (text), is_active (boolean), config (jsonb), created_at
- Partial unique index on (gender, season) WHERE is_active = true — enforces exactly one active config per gender/season
- RLS enabled: public SELECT, service-role write
- Seeded with one active row per gender for 2025-26, containing all current formula values:
  - Matches: group_weights {a:8, b:6, c:4, d:2}, fall time buckets, expected outcome thresholds, score rates, weight class adjustment, OOS bands, bootstrap multiplier, PS elevation threshold (16)
  - Tournaments: place_points by tier (20/15/10/5/1 pt), exclude_winner_below_avg, component ceiling (20)
  - Postseason: state placement scores, district scores, component ceiling (50)
  - Component ceilings: postseason 50, tournament 20, match 30

**Applied:** No — run migration in Supabase SQL editor.

**Reversible?** Yes — DROP TABLE IF EXISTS public.hammer_score_config.

**Verified?** No — run migration before deploying.

---

## 2026-08-26 — in_season_tournament_seeds: bracket seed storage for in-season tournaments

**Migration file:** `docs/migrations/20260826_in_season_tournament_seeds.sql`

**What changed:**
- New table `in_season_tournament_seeds` — stores per-weight-class seeds for in-season tournaments
- Columns: id, in_season_tournament_id (FK → in_season_tournaments), weight_class, seed, wrestler_name_raw, school_name_raw, wrestler_id (nullable FK → wrestlers), school_id (nullable FK → schools)
- Unique constraint on (in_season_tournament_id, weight_class, seed)
- RLS + GRANTs mirroring other in_season tables

**Reversible?** Yes — DROP TABLE IF EXISTS in_season_tournament_seeds.

**Verified?** No — run migration before deploying.

---

## 2026-08-26 — girls_district_region_assignments: assign all NJ schools to girls districts/regions for season 2

**Migration file:** `docs/migrations/20260826_girls_district_region_assignments.sql`

**What changed:**
- Inserted ~250 NJ schools into `girls_school_districts` and `girls_school_regions` for season_id = 2 (2025-26)
- 12 girls districts (IDs 1–12), 4 girls regions (9=Central, 10=North I, 11=North II, 12=South)
- Region-district alignment: D1-3 → North I, D4-6 → North II, D7-9 → Central, D10-12 → South
- Post-migration additions (via individual SQL statements):
  - School 150 (JFK Memorial) → District 6, Region 11
  - School 370 (Jackson Township) → District 9, Region 9 (replaces retired Jackson Liberty 219)
  - School 256 (Westampton Tech) → District 10, Region 12
  - School 305 display_name updated to 'Clayton/Glassboro'
  - School 219 (Jackson Liberty) removed from D9/R9 and marked inactive for season 2

**Reversible?** Yes — DELETE FROM girls_school_districts / girls_school_regions WHERE season_id = 2.

**Verified?** Yes — 2026-08-26

---

## 2026-08-26 — school_coop_data_transfer: migrate combined school records to primary schools

**Migration file:** `docs/migrations/20260826_school_coop_data_transfer.sql`

**What changed:**
- Transfers tournament_entries, dual_meets, power_points, precomputed_team_scores, school_aliases from retired combined school records to their primary schools:
  - Jefferson-Sparta (372) → Jefferson (4), season 2 only
  - Ramsey/Northern Highlands (392) → Ramsey (18), season 2 only
  - Morris Hills-Morris Knolls (385) → Morris Hills (76), all seasons
  - Cliffside Park combo (365) → Cliffside Park (364), season 1 only

**Reversible?** Partially — aliases and inactive flags can be reversed; score/entry data moves are destructive without a backup.

**Verified?** Yes — 2026-08-26

---

## 2026-08-26 — school_coop_consolidation: display names + inactive season marks

**Migration file:** `docs/migrations/20260826_school_coop_consolidation.sql`

**What changed:**
- Updated display_name for 12 co-op primary schools (e.g. Newton → Newton/Kittatinny, Morris Hills → Morris Hills/Morris Knolls)
- Marked secondary/retired schools inactive via inactive_school_seasons:
  - Permanently inactive (all seasons): Kittatinny (315), Morris Knolls (77), combined records 385/372/392/365, Ridgefield Memorial season 1
  - Inactive for 2025-26 only: Sparta (26), Northern Highlands (35), Old Tappan (6), Randolph (87), Parsippany (64)

**Reversible?** Yes — DELETE from inactive_school_seasons, revert display_names on schools.

**Verified?** Yes — 2026-08-26

---

## 2026-08-26 — gender_split_school_data: fully separate boys and girls competitive tables

**Migration file:** `docs/migrations/20260826_gender_split_school_data.sql`

**What changed:**
- Created fully separate tables for every competitive dimension of boys and girls programs:
  - `boys_districts` / `girls_districts` — lookup tables (boys migrated from `districts`; girls needs 12 district entries)
  - `boys_regions` / `girls_regions` — migrated from `regions WHERE gender = 'M'/'F'`
  - `boys_school_districts` / `girls_school_districts` — season-scoped district assignment, PK(school_id, season_id)
  - `boys_school_regions` / `girls_school_regions` — season-scoped region assignment, PK(school_id, season_id)
  - `boys_school_conferences` / `girls_school_conferences` — season-scoped conference, PK(school_id, season_id)
  - `boys_school_profiles` / `girls_school_profiles` — non-seasonal section + classification per program
  - `boys_coaches` / `girls_coaches` — existing coaches migrated to boys_coaches; girls starts empty
- RLS applied to all new tables (service_role full, anon/authenticated read)
- Old shared tables (`districts`, `regions`, `school_districts`, `school_regions`, `school_conferences`) kept for safety, not dropped
- All API routes updated to use gender-split tables: `school-profile`, `school-groups`, `school-coaches`, `school-season-status`

**Reversible?** Old tables preserved; drop new tables to revert.

**Verified?** Yes — 2026-08-26

---

## 2026-08-26 — inactive_school_seasons: per-season school deactivation

**Migration file:** `docs/migrations/20260826_inactive_school_seasons.sql`

**What changed:**
- New `inactive_school_seasons(school_id, season_id, PRIMARY KEY(school_id, season_id))` table
- A row = school has no program for that season; admin toggle inserts/deletes the row
- On deactivation, API removes school from all boys and girls seasonal group tables for that season
- Matcher (`matchSchools.ts`) now filters out inactive schools when `seasonId` is provided
- Admin school profile page shows "Inactive this season" toggle per season

**Reversible?** Yes — `DROP TABLE inactive_school_seasons;`

**Verified?** Pending — run migration in Supabase SQL editor

---

## 2026-08-26 — tournament_registry: new table

**Migration file:** `docs/migrations/20260826_tournament_registry.sql`

**What changed:**
- New `tournament_registry` table to track all tournaments and jamborees independent of import status
- Fields: season, name, date_start, date_end, state, event_type (tournament/jamboree), gender, point_value (1–20), imported, in_season_tournament_id (FK), notes
- Admin-only RLS (service role access via API routes)

**Reversible?** Yes — `DROP TABLE tournament_registry;`

**Verified?** Pending — run migration in Supabase SQL editor

---

## 2026-08-25 — school_wrestlers: add girls tournament type support

**Migration file:** `docs/migrations/20260825_school_wrestlers_girls_support.sql`

**Functions changed:** `school_wrestlers(integer, gender_type, smallint)`

**What changed:**
- Pivot CTE now matches `IN ('regions', 'girls_regions')` and `IN ('boys_state', 'girls_state')` instead of hardcoded boys-only strings
- Short-name derivation handles `girls_regions` and `girls_state` tournament types
- Districts short-name regex strips both boys and girls prefix patterns
- Enables girls school profile pages to show regions and state placements
- Also removed dead `girls_school_wrestlers` call in `SchoolProfileCore.tsx` (that function was dropped in 20260717)

**Reversible?** Yes — re-run `docs/migrations/20260729_fix_school_wrestlers_rpc_column_names.sql`

**Verified?** Pending — run migration in Supabase SQL editor

---

## 2026-08-25 — wrestler_hammer_scores: add gender column

**Migration file:** `docs/migrations/20260825_hammer_scores_gender.sql`

**What changed:**
- Added `gender text NOT NULL DEFAULT 'M'` column to `wrestler_hammer_scores`
- Added index `idx_whs_season_gender` on `(season, gender)`
- Enables gender-specific hammer score runs: each run now deletes and rewrites only the specified gender's rows, so boys and girls scores coexist in the table
- Admin hammer-scores page can now filter by gender without joining wrestlers

**Reversible?** Yes — `ALTER TABLE wrestler_hammer_scores DROP COLUMN gender`

**Verified?** Pending — run migration in Supabase SQL editor before using girls recalculate

---

## 2026-08-25 — tournament_strength_report: add p_gender parameter

**Migration file:** `docs/migrations/20260825_tournament_strength_gender.sql`

**Functions changed:** `tournament_strength_report(text, smallint)` → `tournament_strength_report(text, smallint, text)`

**What changed:**
- Added `p_gender text DEFAULT 'M'` parameter
- `tournaments.gender` filter uses `p_gender::gender_type` cast (column is enum)
- `in_season_tournaments.gender` filter uses `p_gender` directly (column is text)
- Post-season tournament types switch between boys (`districts`/`regions`/`boys_state`) and girls (`districts`/`girls_regions`/`girls_state`) based on gender
- Admin tournament strength page now reads `AdminGenderContext` and shows only the selected program's tournaments

**Reversible?** Yes — drop the new function and re-run `20260811_tournament_point_value.sql`

**Verified?** Applied 2026-08-25

---

## 2026-08-25 — Drop seasons lifecycle columns (NOT YET APPLIED)

**Migration file:** `docs/migrations/20260825_drop_seasons_lifecycle_columns.sql`

**Tables affected:** `seasons` (columns dropped), index dropped

**What changed:**
- Drops `seasons.stage`, `seasons.is_public_default`, `seasons.finalized_at`
- Drops `seasons_one_public_default` partial unique index
- Phase 2 of 2: run only after code has deployed and been verified reading from `season_gender_state`

**Reversible?** Yes — re-run `20260825_seasons_lifecycle.sql` to restore columns; data is in `season_gender_state`

**Verified?** NOT YET APPLIED

---

## 2026-08-25 — season_gender_state table (NOT YET APPLIED)

**Migration file:** `docs/migrations/20260825_season_gender_state.sql`

**Tables added:** `season_gender_state`

**What changed:**
- Created `season_gender_state(id, season_id, gender, stage, is_public_default, created_at, finalized_at)`
- `gender` uses `'M'`/`'F'` convention (matches wrestlers, dual_meets, in_season_tournaments)
- `UNIQUE(season_id, gender)` — one row per program per season year
- Two partial unique indexes scoped per gender (replaces the old `seasons_one_public_default` which had no gender scope)
- Seeded: season 1 (2024-25) → archived/false for M+F; season 2 (2025-26) → season/true for M+F
- RLS: public read, service_role full access
- **Phase 1 of 2**: does NOT drop `seasons.stage` / `seasons.is_public_default` yet — existing code is unaffected until Phase 2 (code update + DROP migration)

**Reversible?** Yes — `DROP TABLE IF EXISTS season_gender_state;`

**Verified?** APPLIED 2026-08-25

---

## 2026-08-24 — Data browser helper RPCs (APPLIED)

**Migration file:** `docs/migrations/20260824_data_browser_helpers.sql`

**What changed:**
- Created `admin_list_tables()` — returns all base tables in the public schema
- Created `admin_table_schema(p_table)` — returns column metadata including PK flags and FK references

**Verified?** APPLIED (confirmed via information_schema.routines 2026-08-25).

---

## 2026-08-25 — Fix postseason_checklist individual step_keys (APPLIED)

**Migration file:** `docs/migrations/20260825_postseason_checklist_fix.sql`

**Tables affected:** `postseason_checklist`

**What changed:**
- DELETEd wrong individual step_keys `district_brackets_set` and `region_seeds_forecasted`
- INSERTed correct individual step_keys: `district_seeds_forecasted`, `district_seeds_set`, `results_imported`
- Team step_keys unchanged: `seeds_set`, `results_imported`, `finalized`

**Reversible?** Re-insert deleted rows manually if needed.

**Verified?** APPLIED

---

## 2026-08-25 — Season progress tracking: preseason + postseason checklists (APPLIED)

**Migration file:** `docs/migrations/20260825_progress_tracking.sql`

**Tables affected:** `preseason_checklist` (new), `postseason_checklist` (new)

**What changed:**
- Created `preseason_checklist(id, season_id, step_key, status, completed_at)` with UNIQUE(season_id, step_key); seeded seasons 1+2 with 7 step_keys at 'not_started'
- Created `postseason_checklist(id, season_id, side, step_key, status, completed_at)` with UNIQUE(season_id, side, step_key); seeded seasons 1+2 with proposed team/individual step_keys
- Both tables: RLS enabled, service_role full access, anon/authenticated read

**Postseason individual step_keys were wrong as originally applied — run 20260825_postseason_checklist_fix.sql to correct them.**

**Reversible?** Yes — DROP TABLE preseason_checklist, postseason_checklist;

**Verified?** APPLIED. Follow up with 20260825_postseason_checklist_fix.sql.

---

## 2026-08-25 — Seasons lifecycle extension (APPLIED)

**Migration file:** `docs/migrations/20260825_seasons_lifecycle.sql`

**Tables affected:** `seasons` (extended)

**What changed:**
- Added columns to existing `seasons` table: `year_label` (text), `stage` (text: 'preseason'/'season'/'postseason'/'archived'), `is_public_default` (boolean default false), `created_at` (timestamptz), `finalized_at` (timestamptz nullable)
- Seeded season 1 (2024-25, archived) and season 2 (2025-26, season, is_public_default=true)
- Added partial unique index `seasons_one_public_default ON seasons(is_public_default) WHERE is_public_default = true`
- Enabled RLS with public-read and service-role-write policies

**Reversible?** Yes — ALTER TABLE seasons DROP COLUMN year_label, stage, is_public_default, created_at, finalized_at; DROP INDEX seasons_one_public_default;

**Verified?** APPLIED

---

## 2026-08-25 — Seasonal school data (district, region, conference, coaches) (APPLIED)

**Migration file:** `docs/migrations/20260825_seasonal_school_data.sql`

**Tables affected:** `school_districts` (extended), `school_regions` (extended), `school_conferences` (new), `coaches` (extended if needed)

**What changed:**
- Added `season_id integer REFERENCES seasons(id) NOT NULL` to `school_districts`; backfilled existing rows to season 1 and copied to season 2
- Added `season_id integer REFERENCES seasons(id) NOT NULL` to `school_regions`; same backfill
- Created `school_conferences(school_id, season_id, conference, PRIMARY KEY(school_id, season_id))`; backfilled from `schools.athletic_conference` for seasons 1 and 2
- Added `season_id integer REFERENCES seasons(id)` to `coaches` if not already present from the updated `20260824_coaches.sql`
- Added indexes: `school_districts_season_idx`, `school_regions_season_idx`, `coaches_season_idx`

**Reversible?** Partially — DROP TABLE school_conferences; ALTER TABLE school_districts DROP COLUMN season_id; ALTER TABLE school_regions DROP COLUMN season_id; ALTER TABLE coaches DROP COLUMN season_id;

**Verified?** APPLIED

---

## 2026-08-24 — Coaches table (APPLIED — updated to include season_id)

**Migration file:** `docs/migrations/20260824_coaches.sql`

**Tables added:** `coaches`

**What changed:**
- `coaches(id, name, school_id, season_id, title, email, phone, is_active, created_at, updated_at)`
- `season_id` allows scoping coaches to a specific season (nullable — coaches without a season apply to all)
- RLS: service_role full access; anon/authenticated read only `is_active = true` coaches
- `set_coaches_updated_at()` trigger keeps `updated_at` current

**Reversible?** Yes — DROP TABLE IF EXISTS coaches; DROP FUNCTION IF EXISTS set_coaches_updated_at();

**Verified?** APPLIED

---

## 2026-08-24 — Rankings shared backend schema (APPLIED)

**Migration file:** `docs/migrations/20260824_rankings_schema.sql`

**Tables added:** `ranking_computed_variants`, `ranking_editorial`, `ranking_published`

**What changed:**
- `ranking_computed_variants`: immutable output of a scoring run; `ranking_type`, `formula_name`, `scope` (state/section/conference/district/region), `scope_id` (text — district number, conference slug, section name, or NULL for state), `season_id`, `period_start/end`, `computed_at`, `results` (jsonb ranked list)
- `ranking_editorial`: admin-editable working copy; starts as a copy of a variant (`based_on_variant_id`); `updated_by`, auto-updating `updated_at`
- `ranking_published`: permanent archive — each publish creates a new row, never overwritten, enabling week-over-week movement tracking; `source_type` ('editorial' or 'auto_computed'), `source_editorial_id`/`source_variant_id`, `published_by` (null for auto-publish)
- RLS: service_role full; authenticated read all three; anon read `ranking_published` only

**Reversible?** Yes — see rollback at bottom of migration file.

**Verified?** APPLIED

---

## 2026-08-24 — Atomic tournament publish function + district grade confirmation (APPLIED)

**Migration file:** `docs/migrations/20260824_publish_import_queue_tournament.sql`

**Functions added:** `publish_import_queue_tournament(p_queue_id uuid, p_admin_email text) RETURNS jsonb`

**What changed:**
- New PL/pgSQL function for `tournament_rtf` import queue items: gets or creates the `in_season_tournaments` row (uses existing id if provided in `reviewed_data.tournament.id`, otherwise inserts new), inserts `tournament_bouts`, marks queue item as `published`, logs to `admin_activity_log`
- When `reviewed_data.tournament.is_grade_confirmation_event = true` (set for district-level imports): for each bout, if `wrestler1_grade` / `wrestler2_grade` is a valid value (`'Fr'`, `'So'`, `'Jr'`, `'Sr'`) and the wrestler is NJ-linked, UPDATEs `wrestlers.grade` + stamps `grade_confirmed_at = now()` + `grade_confirmed_source = 'districts'`; skips wrestlers already confirmed via districts
- Runs atomically — any failure rolls back all writes and leaves queue item in `ready_for_review`
- `GRANT EXECUTE … TO service_role`

**Reversible?** Yes — `DROP FUNCTION IF EXISTS publish_import_queue_tournament(uuid, text);`

**Verified?** APPLIED

---

## 2026-08-24 — Atomic publish function for import queue (APPLIED)

**Migration file:** `docs/migrations/20260824_publish_import_queue.sql`

**Functions added:** `publish_import_queue_dual_meet(p_queue_id uuid, p_admin_email text) RETURNS jsonb`

**What changed:**
- New PL/pgSQL function runs as a single atomic transaction: reads `import_queue.reviewed_data`, inserts `dual_meets` + `dual_meet_matches` rows, marks the queue item as `published`, logs to `admin_activity_log`
- If any INSERT fails, Postgres rolls back all writes and the item stays in `ready_for_review`
- Returns `{ ok, meets_written, matches_written }` on success; `{ ok: false, error }` on failure
- Scoped to `source_type = 'dual_meet'` for now
- `GRANT EXECUTE … TO service_role`

**Reversible?** Yes — `DROP FUNCTION IF EXISTS publish_import_queue_dual_meet(uuid, text);`

**Verified?** APPLIED

---

## 2026-08-24 — Pending wrestler transfers table (APPLIED)

**Migration file:** `docs/migrations/20260824_pending_wrestler_transfers.sql`

**Tables affected:** `pending_wrestler_transfers` (new)

**What changed:**
- Created `pending_wrestler_transfers`: tracks potential school transfer candidates flagged for admin review
- Columns: `id`, `wrestler_id` (FK → wrestlers), `suspected_school_id` (FK → schools), `current_school_id` (FK → schools, nullable), `detected_via` (check: data_health_scan/import_name_match/manual), `status` (check: pending/confirmed/rejected), `notes`, `created_at`, `resolved_at`, `resolved_by`
- Unique on `(wrestler_id, suspected_school_id)`

**Reversible?** Yes — `DROP TABLE IF EXISTS pending_wrestler_transfers;`

**Verified?** APPLIED

---

## 2026-08-24 — dual_meets schedule source columns (APPLIED)

**Migration file:** `docs/migrations/20260824_dual_meets_schedule_source.sql`

**Tables affected:** `dual_meets` (extended)

**What changed:**
- Added `confirmed_by_both_schools` (bool, default false): true when both schools independently submitted the same match in a bulk import batch
- Added `schedule_source` (text, nullable): tracks how a record was created ('bulk_schedule_import', 'manual', etc.); NULL on all pre-existing rows

**Reversible?** Yes — `ALTER TABLE dual_meets DROP COLUMN IF EXISTS confirmed_by_both_schools, DROP COLUMN IF EXISTS schedule_source;`

**Verified?** APPLIED

---

## 2026-08-24 — In-season tournament participants table (APPLIED)

**Migration file:** `docs/migrations/20260824_tournament_participants.sql`

**Tables affected:** `in_season_tournament_participants` (new)

**What changed:**
- Created `in_season_tournament_participants`: join table linking schools to in-season tournaments ahead of results being imported
- Columns: `id` (uuid PK), `in_season_tournament_id` (uuid FK → in_season_tournaments), `school_id` (int FK → schools), `added_via` (check: rollover_upload/schedule_import/manual), `created_at`
- Unique constraint on `(in_season_tournament_id, school_id)`
- Public read RLS; indexes on both FK columns

**Reversible?** Yes — `DROP TABLE IF EXISTS in_season_tournament_participants;`

**Verified?** APPLIED

---

## 2026-08-24 — Roster & Enrollment schema (APPLIED)

**Migration file:** `docs/migrations/20260824_roster_enrollment.sql`

**Tables affected:** `wrestlers` (extended), `wrestler_school_history` (new)

**What changed:**
- Added to `wrestlers`: `grade` (text, check: Fr/So/Jr/Sr), `grade_confirmed_at` (timestamptz), `grade_confirmed_source` (text, check: roster_upload/districts/manual), `projected_weight_class` (int), `confirmed_weight_class` (int), `is_active` (bool, default true)
- Created `wrestler_school_history`: tracks school affiliation over time with start/end dates, transfer flags, and creation source
- No backfill in this migration

**Reversible?** Yes — `DROP TABLE wrestler_school_history CASCADE; ALTER TABLE wrestlers DROP COLUMN IF EXISTS grade, DROP COLUMN IF EXISTS grade_confirmed_at, ...`

**Verified?** APPLIED

---

## 2026-08-24 — Coaches table (APPLIED)

**Migration file:** `docs/migrations/20260824_coaches.sql`

**Tables affected:** `coaches` (new)

**What changed:**
- Created `coaches` table: `id` (uuid PK), `name` (text), `school_id` (int, FK → schools), `title` (text), `email` (text, nullable), `phone` (text, nullable), `is_active` (bool), `created_at`, `updated_at`
- Indexes on `school_id` and `(school_id, is_active)`
- RLS: service role full access, public read of active coaches
- Trigger to auto-update `updated_at`

**Reversible?** Yes — `DROP TABLE coaches CASCADE;`

**Verified?** APPLIED

---

## 2026-08-24 — Admin activity log

**Migration file:** `docs/migrations/20260824_admin_activity_log.sql`

**Tables affected:** `admin_activity_log` (new)

**What changed:**
- Created `admin_activity_log` table: `id` (uuid PK), `admin_email` (text), `action` (text), `entity_type` (text), `entity_id` (text, nullable), `details` (jsonb, nullable), `created_at` (timestamptz)
- Added indexes on `admin_email`, `created_at DESC`, and `(entity_type, entity_id)`
- Created `log_admin_activity()` helper function (SECURITY DEFINER) for inserting log rows from API routes and server actions

**Reversible?** Yes — `DROP TABLE admin_activity_log CASCADE; DROP FUNCTION log_admin_activity;`

**Verified?** Yes — confirmed applied 2026-08-24.

---

## 2026-08-21 — Deduplicate matches + unique constraints

**Migration file:** `docs/migrations/20260821_dedupe_matches_and_unique_constraints.sql`

**Tables affected:** `dual_meet_matches`, `dual_meets`, `tournament_bouts`

**What changed:**
- Deleted 11 duplicate `dual_meet_matches` rows (same weight class inserted twice in the same dual meet — affected Collingswood vs Paulsboro Jan 14, Highland vs Williamstown Jan 28, and 4 other meets)
- Deleted 55 duplicate `tournament_bouts` rows (Dan Allen Clipper Classic and Burlington County Tournament each imported twice)
- Added `UNIQUE (dual_meet_id, weight_class)` on `dual_meet_matches` — one weight slot per meet
- Added `UNIQUE (season_id, gender, team1_school_id, team2_school_id, meet_date)` on `dual_meets` — one meeting per school pair per date
- Added `UNIQUE (in_season_tournament_id, weight_class, round, wrestler1_id, wrestler2_id, winner_score, loser_score)` on `tournament_bouts` — deduplicates within a round while allowing legitimate consolation rematches

**Root cause:** Import pipeline had no idempotency guard — re-running against the same source silently doubled rows.

**Reversible?** Duplicate rows are deleted (not recoverable without re-import); constraints can be dropped with DROP CONSTRAINT.

**Verified?** Yes — 0 duplicates confirmed after cleanup.

---

## 2026-08-18 — wrestlers.main_weight + lb_rs_individual_stats v9

**Tables affected:** `wrestlers` (DDL), `lb_rs_individual_stats` (RPC replace)

**What changed:**
- Added `main_weight text` column to `wrestlers` — populated by recalculate-hammer-scores, can be manually overridden
- Recreated `lb_rs_individual_stats` (v9): removes inline `hammer_sum` CASE computation, adds `LEFT JOIN wrestler_hammer_scores` to return the pre-computed 0–100 ELO hammer score
- Migration files: `docs/migrations/20260818_wrestlers_main_weight.sql`, `docs/migrations/20260818_rs_leaderboard_rpcs_v9.sql`

**Reversible?** Yes — drop column; re-run v8 migration to restore prior RPC
**Verified?** Yes — applied

---

## 2026-08-17 — Add gender column to in_season_tournaments

**Migration file:** `docs/migrations/20260817_add_gender_to_in_season_tournaments.sql`

**Tables affected:** `in_season_tournaments`

**What changed:**
- Added `gender text NOT NULL DEFAULT 'M'`
- All existing rows (boys tournaments) backfilled to 'M' via the column DEFAULT
- Added index on `gender` for efficient school schedule filtering
- RTF import route now writes `gender` on insert and includes it in the dedup lookup
- School schedule page now filters `in_season_tournaments` by gender

**Reversible?** Yes — `ALTER TABLE in_season_tournaments DROP COLUMN gender;`
**Verified?** Yes — applied

---

## 2026-08-13 — Add school metadata columns to wrestler_hammer_scores

**Migration file:** `docs/migrations/20260813_hammer_score_school_fields.sql`

**Tables affected:** `wrestler_hammer_scores`

**What changed:**
- Added `school_id integer`, `conference text`, `section text`, `classification text`, `district integer`, `region integer`
- Populated during recalculation via tournament_entries → schools join
- Enables filtering by conference, section, group, district, and region in the admin hammer scores dashboard

**Reversible?** Yes — `ALTER TABLE wrestler_hammer_scores DROP COLUMN school_id, DROP COLUMN conference, DROP COLUMN section, DROP COLUMN classification, DROP COLUMN district, DROP COLUMN region;`
**Verified?** Yes — applied

---

## 2026-08-11 — Add weight_class to wrestler_hammer_scores

**Migration file:** `docs/migrations/20260811_hammer_score_weight_class.sql`

**Tables affected:** `wrestler_hammer_scores`

**What changed:**
- Added `weight_class text` column (nullable)
- Populated during Hammer Score recalculation from dual_meet_matches and tournament_bouts
- Enables sorting/filtering by weight class on the admin dashboard

**Reversible?** Yes — `ALTER TABLE wrestler_hammer_scores DROP COLUMN weight_class`

---

## 2026-08-11 — Grant SELECT on tournaments and matches to service_role

**Migration file:** `docs/migrations/20260811_grant_postseason_tables.sql`

**Tables affected:** `tournaments`, `matches` (grants only)

**What changed:**
- Added `GRANT SELECT ON public.tournaments TO service_role`
- Added `GRANT SELECT ON public.matches TO service_role`
- These tables predated the project's standard grant convention; missing grants broke the Hammer Score recalculation script

**Reversible?** Yes — REVOKE SELECT FROM service_role
**Verified?** Yes — applied

---

## 2026-08-11 — Hammer Score tables (wrestler_hammer_scores, wrestler_match_score_log)

**Migration file:** `docs/migrations/20260811_hammer_score_schema.sql`

**Tables affected:** `wrestler_hammer_scores` (new), `wrestler_match_score_log` (new)

**What changed:**
- `wrestler_hammer_scores` — one row per wrestler per season; stores postseason_base, postseason_adjusted, tournament_score, match_score, hammer_score, match_count, last_match_date
- `wrestler_match_score_log` — one row per scored bout; stores pre-match hammers for both wrestlers, outcome_rank, score_earned
- Both tables: SELECT granted to anon/authenticated; ALL to service_role

**Reversible?** Yes — DROP TABLE both tables
**Verified?** Yes — applied

---

## 2026-08-11 — tournament point_value column + rebuilt strength report RPC

**Migration file:** `docs/migrations/20260811_tournament_point_value.sql`

**Tables affected:** `in_season_tournaments` (DDL), `tournament_strength_report` RPC (rebuilt)

**What changed:**
- Added `point_value smallint CHECK (IN (1, 5, 10, 15, 20))` to `in_season_tournaments` for Hammer Score calculation
- Dropped and recreated `tournament_strength_report(text, smallint)` RPC with expanded return type: added `tournament_id`, `point_value`, `has_finals`, `has_3rd_place`, `has_5th_place`, `has_7th_place` columns
- Bracket completeness flags derived from `tournament_bouts.round` values ('Finals', '3rd Place', '5th Place', '7th Place')
- Grants re-applied to anon, authenticated, service_role

**Reversible?** Yes — drop `point_value` column; rollback RPC from `20260811_tournament_strength_report_rpc.sql`
**Verified?** Yes — applied

---

## 2026-08-10 — Delete CVC Wrestling Tournament (bad weight_class import)

**Migration file:** `docs/migrations/20260810_delete_cvc_bad_weight_class.sql`

**Tables affected:** `in_season_tournaments`, `tournament_bouts`, `in_season_tournament_placements`, `in_season_tournament_team_scores`

**What changed:**
- Deleted all data for tournament `d49d0ef0-fc58-4ab1-9b6b-f7cb917dea26` (2026 CVC Wrestling Tournament - Boys)
- All 274 bouts had `weight_class=14` — "14" was the 14th team in the standings, misread by the parser
- Root cause: TrackWrestling RTF puts each standings entry on 3 separate lines; `"14"` alone matched the 2-digit WEIGHT_RE before the actual bracket headers (`"106 - B"` etc.)
- Parser fix applied: added `WEIGHT_WITH_GENDER_RE` for `"NNN - B/G"` format + `VALID_WEIGHT_CLASSES` whitelist so team ranks can't be confused with weights
- Re-import via admin RTF import after this deletion

**Reversible?** No — delete + re-import

---

## 2026-08-10 — Regular season leaderboard RPCs v2: add in-season tournament bouts

**Migration file:** `docs/migrations/20260810_rs_leaderboard_rpcs_v2.sql`

**Functions replaced:** `lb_rs_individual_stats`, `lb_rs_team_stats`

**What changed:**
- Extended both RPCs to UNION in `tournament_bouts` (in-season tournaments) alongside dual meet data
- Gender filtered by joining `tournament_bouts.wrestler1_id/wrestler2_id → wrestlers.gender`
- Season filtered by joining `in_season_tournaments.season` to `seasons.label`
- Excludes `Double Forfeit` result types from tournament bouts
- Fixes discrepancy where school page shows ~51 more pins than leaderboard (school page counts dual meets + in-season tournaments; leaderboard v1 only counted dual meets)
- Added `'Dec'` as a decision result type alias in hammer score (covers variation in result_type casing across tables)

**Reversible?** Yes — re-run `20260810_rs_leaderboard_rpcs.sql` to restore v1 (dual-meets-only version)

---

## 2026-08-08 — Add criteria_winner_school_id to dual_meets

**Migration file:** `docs/migrations/20260808_criteria_winner_school_id.sql`

**Tables affected:** `dual_meets`

**What changed:**
- Added nullable `criteria_winner_school_id integer REFERENCES schools(id)` column
- Populated for all 26 tied dual meets in season 2 (M) using NJSIAA tiebreaker criteria: most falls > most tech falls > most major decisions
- 15 meets resolved to team1, 11 to team2; NULL = genuine draw

**Reversible?** Yes — `ALTER TABLE dual_meets DROP COLUMN criteria_winner_school_id`

---

## 2026-08-07 — Fix Ridgefield OOS stub

**Migration file:** `docs/migrations/20260807_fix_ridgefield_oos_stub.sql`

**What changed:**
- Remapped all `dual_meets` rows referencing school 671 ("Ridgefield", is_nj=false) to school 357 (Ridgefield Memorial)
- Added `school_aliases` entry: "Ridgefield" → 357 so future imports resolve correctly
- Deleted stub school 671

**Reversible?** No — deletion of the stub is not cleanly reversible

---

## 2026-08-07 — Add get_school_meet_counts RPC

**Migration file:** `docs/migrations/20260807_pp_audit_rpc.sql`

**What changed:**
- Added `get_school_meet_counts(p_season_id int, p_gender text)` SQL function
- Returns one row per school with the count of dual meets they appear in (as team1 or team2) for the given season and gender
- Used by the PP Audit admin page to avoid Supabase REST row-count limits

**Reversible?** Yes — `DROP FUNCTION get_school_meet_counts(int, text)`

---

## 2026-08-07 — Create season_calendar table and seed 2025-26 data

**Migration file:** `docs/migrations/20260807_season_calendar.sql`

**Tables affected:** `season_calendar` (new)

**What changed:**
- Created `season_calendar` table with columns: `season_id`, `season_label`, `event_date`, `event_date_end`, `event_time`, `event_category`, `event_type`, `gender`, `label`, `notes`
- `event_type` is the system hook column (`pp_cutoff`, `team_playoff_r12_public`, etc.); `event_category` drives display grouping on the About page
- Seeded 69 rows for season_id=2 (2025-26), covering pre-season, weight allowances, team tournament entry, boys/girls public and non-public team tournaments, individual boys/girls tournament path, Boardwalk Hall detailed daily schedule (28 rows for Mar 12–14), state team championships, and administrative notes
- The `pp_cutoff` row (Feb 8, 2026 12:00 PM) is the system hook used for Power Points calculation cutoff enforcement

**Reversible?** Yes — `DELETE FROM season_calendar WHERE season_id = 2`
**Verified?** No — data populated via `season_calendar_seed.sql` in Supabase SQL editor (run separately from migration file)

---

## 2026-08-07 — Add is_playoff flag to dual_meets

**Migration file:** `docs/migrations/20260807_dual_meets_playoff_flag.sql`

**Tables affected:** `dual_meets`

**What changed:**
- Added `is_playoff boolean NOT NULL DEFAULT false` column for tagging postseason team bracket matches
- Added partial index for fast playoff-only queries
- Run this in Supabase SQL editor before loading playoff matches

---

## 2026-08-07 — Fix Clifton classification

**Migration file:** `docs/migrations/20260807_clifton_classification.sql`

**Tables affected:** `schools`

**What changed:**
- Clifton (ID 50, North I) corrected from Group 4 to Group 5

---

## 2026-08-07 — Fix West Morris classification

**Migration file:** `docs/migrations/20260807_west_morris_classification.sql`

**Tables affected:** `schools`

**What changed:**
- West Morris (ID 108, North II) corrected from Group 3 to Group 2

---

## 2026-08-06 — Merge Lodi (55) and Saddle Brook (59) into 379 (RECONSTRUCTED entry)

**Migration file:** `docs/migrations/20260806_merge_lodi.sql`

**Purpose:** Treated Lodi (55) and Saddle Brook (59) as empty shells: repointed their aliases to Lodi/Saddle Brook (379), deleted their `power_points`, `school_districts`, `precomputed_team_scores` and `playoff_seeds` rows, and deleted both schools. The file existed but was never logged; entry added 2026-09-21. Their 2024-25 postseason entries had already been pointed at 379, so the merge also absorbed their separate 2024-25 history.

**Tables affected:** `school_aliases`, `power_points`, `school_districts`, `precomputed_team_scores`, `playoff_seeds`, `schools`

**APPLIED** — 2026-08-06 (date from file name)

**Reversible?** Superseded — `20260921_restore_lodi_saddle_brook.sql` recreates Saddle Brook and makes 379 Lodi
**Verified?** Yes (2026-09-21) — 55 and 59 absent from `schools`

---

## 2026-08-06 — Fix and add school aliases for RTF comparison scripts

**Migration file:** `docs/migrations/20260806_fix_compare_aliases.sql`

**Tables affected:** `school_aliases`

**What changed:**
- Fixed "Lodi" alias: was pointing to standalone Lodi (55, now is_combined=true); updated to Lodi/Saddle Brook (379) — the active boys co-op
- Added "Ridgefield" → 357 (Ridgefield Memorial; RTF slug: ridgefield-ridgefield)
- Added "Ridgefield Park" → 393 (Ridgefield Park/Bogota co-op; RTF slug: ridgefield-park-ridgefield-park)
- Added "Paterson Kennedy" → 74 (John F. Kennedy, Paterson; RTF slug: paterson-paterson-kennedy)
- Added "Delbarton" → 82 (Delbarton School; RTF slug: morristown-delbarton)

---

## 2026-08-06 — Fix 7 active boys programs incorrectly flagged is_combined=true

**Migration file:** `docs/migrations/20260806_fix_active_boys_combined_flags.sql`

**Tables affected:** `schools`

**What changed:**
- Set `is_combined = false` for 7 schools that appear in the official NJSIAA Power Points RTF rankings and have 15–23 boys dual meets in the DB but were incorrectly excluded from PP calculation:
  - 227 Bordentown Regional/Florence (Central Group 3)
  - 9 Waldwick (North I Group 1)
  - 44 Leonia (North I Group 4)
  - 83 Lyndhurst (North I Group 4)
  - 130 Brearley (North II Group 3)
  - 291 Gateway Reg/Woodbury (South Group 3)
  - 305 Clayton (South Group 3)

---

## 2026-08-06 — School data cleanup: fix is_combined flags and add missing section/classification

**Migration file:** `docs/migrations/20260806_school_data_cleanup.sql`

**Tables affected:** `schools`

**What changed:**

*is_combined = true (excluded from boys listings):*
- 55 Lodi — standalone; program runs as Lodi/Saddle Brook co-op (id=379)
- 59 Saddle Brook — same co-op as Lodi/Saddle Brook, no independent boys meets
- 206 Ranney — no boys wrestling team
- 363 Cherry Hill East/Cherry Hill West — girls co-op, no boys team
- 365 Cliffside Park/Ridgefield Memorial — co-op record unused; both standalone schools (364, 357) are active
- 372 Jefferson-Sparta — girls co-op, no boys team
- 381 Mary Help of Christians Academy — all-girls school
- 385 Morris Hills-Morris Knolls — girls co-op, no boys team
- 392 Ramsey/Northern Highlands — girls co-op, no boys team

*is_combined = false (active boys programs incorrectly excluded):*
- 315 Kittatinny — solo boys program (19 boys meets); only combined for girls (Newton/Kittatinny)
- 321 Becton — boys co-op (Becton-Woodridge), 15 boys meets

*section + classification added:*
- 315 Kittatinny → North I / 1; 321 Becton → North I / 3
- 379 Lodi/Saddle Brook → North II / 4; 393 Ridgefield Park/Bogota → North II / 2
- 359 Bergen Charter → North I / 1; 71 College Achieve Paterson → North I / 1
- 168 Central Jersey College Prep → Central / 1; 219 Jackson Liberty → Central / 3
- 85 Newark Collegiate → North II / 2; 116 North Star Academy → North II / 4; 99 Weehawken → North II / 1
- 248 Donovan Catholic → Non-Public / B; 79 Pioneer Academy → Non-Public / B
- 20 Saddle River Day → Non-Public / B; 356 St. Joseph's (Hammonton) → Non-Public / B

---

## 2026-08-06 — Fix Buena/Vineland incorrectly marked as non-combined

**Migration file:** `docs/migrations/20260806_fix_buena_vineland_is_combined.sql`

**Tables affected:** `schools`

**What changed:**
- School id=360 "Buena/Vineland" (girls co-op, South Group 1) had `is_combined = false` incorrectly set, causing it to appear in boys school listings despite having no boys meet data

---

## 2026-08-06 — Fix Gloucester incorrectly marked as combined school

**Migration file:** `docs/migrations/20260806_fix_gloucester_is_combined.sql`

**Tables affected:** `schools`

**What changed:**
- School id=259 "Gloucester" (South, Group 2) had `is_combined = true` incorrectly set, causing it to be excluded from PP calculation and school listings

---

## 2026-08-06 — Add power_points table for NJSIAA team tournament rankings

**Migration file:** `docs/migrations/20260806_power_points_table.sql`

**Tables affected:** `power_points` (new)

**What changed:**
- Created `power_points` table: one row per school/season/gender with computed NJSIAA Power Points, overall W/L record, and meet count
- Populated by running `scripts/compute_power_points.mts` (uses the Ranking Scale from the 2025-26 Team Tournament Regulations PDF)
- Group standings page (`/groups/[group]`) now shows Power Points + record by section as the primary table, with individual tournament points below
- All schools initialize at 23.0 (NJSIAA default for unranked teams); preseason ranked start values (25.0–32.0) require prior-season PP data not currently in the DB

---

## 2026-08-03 — Capitalize wrestler first/last names

**Migration file:** `docs/migrations/20260803_capitalize_wrestler_names.sql`

**Tables affected:** `wrestlers`

**What changed:**
- Capitalized first character of `first_name` and `last_name` for all wrestlers where either field started lowercase
- Also corrected three typos found during the audit: "chrs" → "Chris", "micheal" → "Michael", "Chistopher" → "Christopher"
- Did not alter any characters beyond the first (DeLuca, D'Ambrosio, deJong, etc. unchanged)

---

## 2026-08-03 — Merge Holy Cross Prep (1009) into Holy Cross (201)

**Migration file:** `docs/migrations/20260803_merge_holy_cross_prep_into_holy_cross.sql`

**Tables affected:** `wrestler_name_aliases`, `tournament_bouts`, `tournament_entries`, `tournament_placements`, `in_season_tournament_team_scores`, `precomputed_team_scores`, `conference_standings`, `dual_meets`, `dual_meet_matches`, `schools`

**What changed:**
- School 1009 (Holy Cross Prep, `is_nj=false`) merged into school 201 (Holy Cross, `is_nj=true`)
- Holy Cross Prep was auto-created as a duplicate; both names refer to the same NJSIAA school
- All referencing rows remapped to 201; school 1009 deleted

---

## 2026-08-03 — Fix is_oos flag for wrestlers at OOS schools

**Migration file:** `docs/migrations/20260803_fix_oos_wrestler_flags.sql`

**Tables affected:** `wrestlers`

**What changed:**
- Set `is_oos = true` for all wrestlers whose school associations (via `wrestler_name_aliases`) are exclusively non-NJ schools (`is_nj = false`)
- These wrestlers were created with `is_oos = false` (the default) because the import route never set the flag based on the resolved school at insert time
- Affected schools include OOS prep schools and private NJ schools not in the NJSIAA (Belmont Hill, Blair B Team, Corner Canyon, Frisch, Grassfield, Holy Cross Prep, Iona Prep, Kellenberg, Kushner Academy, Monsignor Farrell, Northfield Mt Hermon, NY Military Academy, The Peddie School, Torah Academy, etc.)

---

## 2026-08-03 — Remap 28 incorrectly auto-created NJSIAA school records

**Migration file:** `docs/migrations/20260803_remap_bad_nj_schools.sql`

**Tables affected:** `tournament_entries`, `tournament_bouts`, `wrestler_name_aliases`, `in_season_tournament_team_scores`, `tournament_placements`, `precomputed_team_scores`, `conference_standings`, `dual_meets`, `schools`

**What changed:**
- 28 NJSIAA school records auto-created by the RTF import tool and team scores migration were remapped to their correct existing school IDs across all referencing tables
- Bad school records deleted after remapping
- Root cause: RTF import was creating new school rows for co-ops and alternate names instead of requiring user resolution; team scores migration blindly created school rows for any name in standings data

---

## 2026-08-03 — Fix lb_p_most_bonus: rename total_wins → total_matches

**Migration file:** `docs/migrations/20260803_fix_bonus_pct_total_matches.sql`

**Tables affected:** (none — function only)

**What changed:**
- `lb_p_most_bonus` RETURNS TABLE column 7 renamed from `total_wins` to `total_matches`
- Ensures the denominator for Bonus % is all matches wrestled (wins + losses), not just wins
- Bonus % on the leaderboard page was incorrectly showing 100% for wrestlers whose wins were all bonus but who also had losses

---

## 2026-08-03 — Add podium_depth to in_season_tournaments for elite events

**Migration file:** `docs/migrations/20260803_add_podium_depth_elite_tournaments.sql`

**Tables affected:** `in_season_tournaments`

**What changed:**
- Added `podium_depth SMALLINT NOT NULL DEFAULT 3` column to `in_season_tournaments`
- Set `podium_depth = 8` for Beast of the East, Powerade, Iron Man, Sam Cali, Doc Buchanan, Escape the Rock, and any tournament with "elite" in the name
- Tournament page now fetches placements up to place 8 and uses `podium_depth` to determine how many show in the "NJSIAA on the Podium" section

---

## 2026-08-03 — Merge duplicate Corner Canyon OOS schools

**Migration file:** `docs/migrations/20260803_merge_corner_canyon_768_809.sql`

**Tables affected:** `schools`, `wrestler_name_aliases`, `school_aliases`, `in_season_tournament_team_scores`

**What changed:**
- Merged Corner Canyon school 809 into 768 (kept 768, which held all wrestler_name_aliases and school_alias data)
- Deleted duplicate school row 809

---

## 2026-08-02 — Create OOS Holy Cross Prep school, relink Catholic Classic bouts

**Migration file:** `docs/migrations/20260802_create_oos_holy_cross_prep_relink_catholic_classic.sql`

**Tables affected:** `schools`, `tournament_bouts`, `wrestler_name_aliases`

**What changed:**
- Inserted new non-NJSIAA school: `Holy Cross Prep` (`is_nj = false`) — incorrectly matched to NJ Holy Cross (id=201) during import
- Updated all 34 `tournament_bouts` rows in the East Coast Catholic Classic tournament (`1d0e6aea...`) from school 201 to new OOS Holy Cross Prep school
- Updated `wrestler_name_aliases` for 10 wrestlers (Hopkins/106, Anthony/113, D'Ambrosio/120, Haase/126, A.Peters/132, Bucchi/144, K.Peters/150, Bowman/157, N.Wurzberger/215, N.Wurzberger/285)

---

## 2026-08-02 — Create OOS Pitman school, relink Doc Buchanan bouts

**Migration file:** `docs/migrations/20260802_create_oos_pitman_relink_doc_buchanan.sql`

**Tables affected:** `schools`, `tournament_bouts`, `wrestlers`

**What changed:**
- Inserted new non-NJSIAA school: `Pitman` (`is_nj = false`) — the California Pitman that competed at Doc Buchanan
- Updated all 16 `tournament_bouts` rows in Doc Buchanan tournament (`34cac66...`) from NJ Pitman (`id=311`) to new OOS Pitman school
- Updated `school_id` on 8 wrestlers (Camacho/116, Wilharm/135, Sheeran/147, M. Ontiveros/153, Padilla/168, Ma. Ontiveros/178, Vannest/193, Mora/218) from 311 to new OOS Pitman school

All database changes must be recorded here before or at the time they ship.
No schema migration, backfill, or structural change leaves this file untouched.

---

## 2026-08-02 — Merge duplicate OOS schools (Mt. St. Charles, St. Marks)

**Migration file:** `docs/migrations/20260802_merge_duplicate_oos_schools.sql`

**Tables affected:** `tournament_bouts`, `school_aliases`, `schools`

**What changed:**
- Mt. St. Charles Academy: merged school 852 into 602 (kept 602)
- St. Marks: merged school 695 ("St Marks") into 619 ("Saint Mark's") (kept 619)
- All tournament_bouts wrestler school references remapped to the surviving school ID
- Duplicate school rows deleted

---

## 2026-08-02 — Add dual_meet_bonus_ranks RPC for school profile state rankings

**Migration file:** `docs/migrations/20260802_dual_meet_bonus_ranks_rpc.sql`

**Tables affected:** none (new RPC function only)

**What changed:**
- New `dual_meet_bonus_ranks(p_school_id, p_season_id, p_gender, p_season_label)` RPC
- Unions dual_meet_matches (gender-filtered by season_id + gender) with tournament_bouts
  (filtered by in_season_tournaments.season label) to match the same data shown in chips
- Returns `pins_rank`, `techs_rank`, `bonus_pct_rank` for the given school vs all NJ schools
- Called by the school profile stats board to show "#N State" under Pins, Tech Falls, Bonus %
- `p_season_label` needed because in_season_tournaments has no season_id column

---

## 2026-08-02 — Fix zero dual meet scores stored as NULL

**Migration file:** `docs/migrations/20260802_fix_zero_dual_meet_scores.sql`

**Tables affected:** `dual_meets`

**What changed:**
- 11 `final` dual meets had one team's score as NULL instead of 0
- Root cause: import route used `score || null` which coerces `0` → `null`; fixed to `?? null`
- All 11 missing scores verified as 0 by recomputing from `dual_meet_matches` bout data
- 6 `team2_score` rows and 5 `team1_score` rows patched to 0

---

## 2026-08-02 — Link all unmatched team score rows to school IDs

**Migration file:** `docs/migrations/20260802_link_team_scores_school_ids.sql`

**Tables affected:** `schools`, `in_season_tournament_team_scores`

**What changed:**
- 209 names matched exactly to existing school records
- 28 names matched via manual fuzzy review
- 108 new school records created (29 NJ, 79 OOS) for names with no existing match
- All 390 previously unlinked `in_season_tournament_team_scores` rows now have `school_id` set

---

## 2026-08-02 — Merge duplicate wrestler records (Joe / Joseph Gray, Gloucester)

**Migration file:** `docs/migrations/20260802_merge_gray_duplicate.sql`

**Tables affected:** `wrestlers`, `tournament_bouts`

**What changed:**
- Merged "Joe Gray" (`4ee0ed1f`) into "Joseph Gray" (`5018885f`) — same wrestler at Gloucester, 113 lbs
- Remapped 1 tournament_bout from the nickname entry to the canonical full-name record
- Deleted the duplicate `4ee0ed1f` row

---

## 2026-08-02 — Bulk merge 1,285+ duplicate wrestler records

**Migration files:**
- `docs/migrations/20260802_bulk_merge_duplicate_wrestlers.sql` — 1,264 safe groups (1,736 records removed)
- `docs/migrations/20260802_bulk_merge_duplicate_wrestlers_part2.sql` — 21 review-group merges (26 additional records)

**Tables affected:** `wrestlers`, `tournament_entries`, `dual_meet_matches`

**What changed:**
- Full scan of 12,492 wrestlers found 1,292 duplicate name/gender groups
- 1,264 groups had at most 1 copy with live data references → safe auto-merge
- 21 additional groups confirmed same person (same school or one side had no school) → Part 2
- 7 groups confirmed as genuinely different people at different schools → left alone:
  - Jacob Munoz (school 98 / 181), Jayden Williams (school 244 / 164 — verify),
    Anthony Caponegro (172 / 78), Jden Mcpherson (265 / 308),
    Sean Brown (26 / 24), Anthony Russo (264 / 128), Matthew Miller (81 / 188)
- References in tournament_entries and dual_meet_matches remapped to canonical IDs before deletion

---

## 2026-08-02 — Merge duplicate wrestler records (Angelucci, Trotman)

**Migration file:** `docs/migrations/20260802_merge_duplicate_wrestlers.sql`

**Tables affected:** `wrestlers`

**What changed:**
- Deleted two stub wrestler rows with no references:
  - `c7e95b52` — Rocco Angelucci (duplicate; real record is `44fd2e4d`)
  - `99bcae59` — Semaj Trotman (duplicate; real record is `043e30a5`)
- Kept versions that had actual dual_meet_match data

---

## 2026-08-02 — Fix Ian English dual meet match result_type

**Migration file:** `docs/migrations/20260802_fix_ian_english_result_type.sql`

**Tables affected:** `dual_meet_matches`

**What changed:**
- Corrected one row where `result_type = 'North Hunterdon'` (school name written in place of result type)
- Correct result: Anthony Molinaro (Southern Regional) dec. Ian English (North Hunterdon) 7-6
- Set `result_type = 'DEC'`, `result_detail = '7-6'`

---

## 2026-08-02 — Normalize team score school names to official display names

**Migration file:** `docs/migrations/20260802_normalize_team_score_school_names.sql`

**Tables affected:** `in_season_tournament_team_scores`

**What changed:**
- Updated all `school_name` values to match `schools.display_name` where `school_id` is set
- Ensures scoreboards display official school names rather than raw import strings
- Convention going forward: all team score inserts must use `schools.display_name` when `school_id` is known

---

## 2026-08-02 — Fix Powerade NJ school_ids in team scores

**Migration file:** `docs/migrations/20260802_fix_powerade_nj_school_ids.sql`

**Tables affected:** `in_season_tournament_team_scores`

**What changed:**
- Added `school_id` for Christian Brothers Academy and St. Joseph Regional (Montvale) — both confirmed NJ NJSIAA schools that were missing a school_id in Powerade's team scores
- OOS false-positives (Malvern Prep, Blair Academy, etc.) are handled by UI fix (badge now checks `school.is_nj` instead of `school_id IS NOT NULL`)

---

## 2026-08-02 — Add tournament venue fields and team scores table

**Migration file:** `docs/migrations/20260802_tournament_venues_and_scores.sql`

**Tables affected:** `in_season_tournaments` (ALTER), `in_season_tournament_team_scores` (CREATE)

**What changed:**
- Added `venue_name`, `venue_address` (text) to store where each tournament is held
- Added `location_school_id` (int FK → schools) to link venue to an NJ school for banner color
- Added `banner_bg`, `banner_fg` (text) for custom overrides (Powerade blue, Beast Delaware colors)
- Added `is_oos` (bool) to flag tournaments held outside NJ
- Created `in_season_tournament_team_scores` table: `tournament_id`, `place`, `school_name`, `school_id` (nullable FK → schools), `score`
- Indexes on `tournament_id` and `school_id`

**Reversible?** Yes — DROP TABLE + DROP COLUMN

**Data import:** Run `npx tsx scripts/import_tournament_venues_scores.mts` after applying schema

---

## 2026-08-01 — Fix Powerade tournament start_date

**Migration file:** `docs/migrations/20260801_fix_powerade_start_date.sql`

**Tables affected:** `in_season_tournaments`

**What changed:**
- Corrected `start_date` from `2024-12-29` (wrong year) to `2025-12-29`
- `end_date` (`2025-12-31`) was already correct
- Bad start date caused Powerade to appear on every schedule date query

**Reversible?** Yes — set start_date back to 2024-12-29
**Verified?** Yes — confirmed via script before/after

---

## 2026-07-31 — Delete all dual meets for clean reimport

**Migration file:** `docs/migrations/20260731_delete_all_dual_meets.sql`

**Tables affected:** `dual_meets`, `dual_meet_matches`

**What changed:**
- Deleted all 807 `dual_meets` rows and 11,274 `dual_meet_matches` rows
- Wrestlers, aliases, tournament bouts, and postseason entries preserved
- Prerequisite for a clean reimport with correct wrestler linking

**Reversible?** No — reimport required
**Verified?** Yes — both tables confirmed empty after delete

---

## 2026-07-31 — Cleanup duplicate import batch (21:56 UTC)

**Migration file:** `docs/migrations/20260731_cleanup_duplicate_import_batch.sql`

**Tables affected:** `dual_meets`, `dual_meet_matches`, `wrestlers`, `wrestler_name_aliases`, `tournament_bouts`

**What changed:**
- A full re-import of the dual-meet dataset ran at 21:56 UTC, duplicating the valid 19:51 UTC import
- Deleted 489 duplicate `dual_meets` rows (exact date+school1+school2+gender duplicates)
- Deleted 6,822 duplicate `dual_meet_matches` rows
- Re-pointed 200 `wrestler_name_aliases` from 201 duplicate wrestlers to their earliest originals
- Deleted 201 duplicate `wrestlers` (all exact first+last+gender matches of pre-existing records)
- Re-pointed 6 `tournament_bouts` from orphaned July 30 Ethan Hale dupes (6b0be584, 6e2bbd34) to correct profile (1aea0f0f)
- Deleted 2 orphaned Ethan Hale duplicate wrestler profiles from July 30 bad imports
- Deleted 3 pre-existing Collingswood duplicate meets from a June 9, 2026 partial import (42 match rows); July 31 19:51 batch has the complete set

**Reversible?** No — data was purely duplicated; originals intact
**Verified?** Yes — Collingswood shows 5 unique meets, Ethan Hale has 1 profile with 10 tournament bouts

---

## 2026-07-31 — Grant permissions on wrestler_name_aliases

**Migration file:** `docs/migrations/20260731_grant_wrestler_name_aliases.sql`

**Tables affected:** `wrestler_name_aliases`

**What changed:**
- Granted `ALL` to `service_role`, `SELECT` to `anon`/`authenticated` on table and sequence
- Table was created without any GRANTs, so all reads and writes (saves from import, loads in matcher) were silently failing with `permission denied`
- Root cause of aliases never working: re-imports kept asking for re-confirmation even after wrestlers were previously confirmed

**Reversible?** Yes — `REVOKE` the grants
**Verified?** No — run in Supabase then re-test import flow

---

## 2026-07-31 — Delete duplicate Collingswood vs Gateway meet

**Migration file:** `docs/migrations/20260731_delete_duplicate_collingswood_gateway_meet.sql`

**Tables affected:** `dual_meets`, `dual_meet_matches`

**What changed:**
- Deleted duplicate `dual_meets` row `13efc311` (Collingswood vs Gateway Reg/Woodbury, 2025-12-17) and its 14 child match rows
- Kept `15b3d1c7` (same meet, same score 54-12) which has raw school/wrestler names populated; `13efc311` had all nulls

**Reversible?** No — data deleted; re-import the meet to restore if needed
**Verified?** No — run migration in Supabase

---

## 2026-07-31 — Add order_index to dual_meet_matches

**Migration file:** `docs/migrations/20260731_add_order_index_to_matches.sql`

**Tables affected:** `dual_meet_matches`

**What changed:**
- Added `order_index integer` column to `dual_meet_matches`
- Backfilled existing rows: 0-based rank within each meet ordered by `weight_class` (preserves previous display order for old data)
- New imports will set `order_index` from the parser's match position so meets display in the original source document order rather than always ascending from 106

**Reversible?** Yes — `ALTER TABLE dual_meet_matches DROP COLUMN order_index`
**Verified?** No — apply migration, then deploy updated import route and meets/[id] page

---

## 2026-07-31 — Fix nickname parse garbled aliases and merge duplicate McSorley

**Migration file:** `docs/migrations/20260731_fix_nickname_parse_aliases_and_wrestler_merge.sql`

**Tables affected:** `school_aliases`, `dual_meet_matches`, `tournament_entries`, `wrestlers`

**What changed:**
- Deleted 4 garbled school aliases created by old nickname-parse workaround: "Liam) McSorley (Shawnee", "James) Fearon (Hunterdon Central Reg", "CJ) Palmisano (Whippany Park", "Greg) Parker (Mainland Regional"
- Merged duplicate William McSorley profiles: re-pointed all dual_meet_matches and tournament_entries from bad profile (94a23f98, no last name) to good profile (3c999432, "William McSorley"), then deleted bad profile
- Root fix: parseDualMeet.ts now uses backward-scan splitNameSchool() so nickname parens no longer garble school detection

---

## 2026-07-31 — Fix St. Anthony's school alias

**Migration file:** `docs/migrations/20260731_fix_st_anthonys_alias.sql`

**Tables affected:** `schools`, `school_aliases`

**What changed:**
- Deleted bad alias: "St. Anthonys" → Acadiana (OOS school 712); was incorrect
- Created OOS school id=750: "St. Anthony's" (NY)
- Added correct alias: "St. Anthonys" → school 750

---

## 2026-07-31 — Split Roselle Park and Abraham Clark (Roselle) into separate school records

**Migration file:** `docs/migrations/20260731_split_roselle_and_roselle_park.sql`

**Tables affected:** `schools`, `school_aliases`

**What changed:**
- School 125 `display_name` restored from "Roselle" → "Roselle Park"; `mascot` fixed to "Panthers"; `logo_url` cleared (358.png belongs to Abraham Clark)
- `school_aliases` row id=135 ("Roselle Park" alias on school 125) deleted — now redundant since it's the display_name
- School 358 created: Abraham Clark, Rams, North II, Group 1, Union County, Roselle
- `school_aliases` row added: school_id=358, alias="Roselle" (TW lists Abraham Clark as "Roselle" in meet headers)
- Schools sequence advanced past 358 to avoid future conflicts

**Why:** School 125 (Roselle Park) had its display_name changed to "Roselle" at some point and "Roselle Park" added as an alias, causing both schools to route to the same record. All 3 dual meets already in school 125 (Keyport, Central Jersey Prep, Scotch Plains — all Dec 2025) were confirmed as Roselle Park meets. No data movement required.

**Reversible?** Yes — reverse by updating school 125 back to display_name="Roselle", deleting school 358, re-inserting the alias row id=135
**Verified?** Yes — migration ran 2026-07-31; setval returned 749 (correct, max school id is 749)

---

## 2026-07-31 — Restore school 358 full data (correction to split migration)

**Migration file:** `docs/migrations/20260731_restore_school_358_full_data.sql`

**Tables affected:** `schools`, `school_aliases`, `conference_standings`, `school_districts`, `tournament_bouts`

**What changed:**
- School 358 display_name corrected from "Abraham Clark" → "Roselle"; classification "1" → "2"; colors and website restored from July-16 restore record
- "Abraham Clark" alias added to school 358 (TW occasionally uses official name in schedules)
- `conference_standings` id=895 restored: UCIAC Mountain div, season 2, 3-14 overall, 0-7 div, pf=349 pa=930
- `school_districts` row restored: school_id=358, district_id=16
- ⚠️ 20 `tournament_bouts` moved from school_id=125 → 358 where wrestler_school_raw='Roselle' — **this was incorrect** (see next entry)

**Reversible?** Yes — see rollback block in 20260716_restore_roselle_358.sql for school row; delete conference/district rows; revert tournament_bouts school_id back to 125
**Verified?** Yes — ran 2026-07-31; verify query confirmed 20 bouts at school 358, conference row and district row restored

---

## 2026-07-31 — Restore Roselle Park tournament bouts (corrects bout move from prior migration)

**Migration file:** `docs/migrations/20260731_restore_roselle_park_tournament_bouts.sql`

**Tables affected:** `tournament_bouts`, `school_aliases`

**What changed:**
- 20 `tournament_bouts` moved back from school_id=358 → 125 where wrestler_school_raw='Roselle'
- "Roselle" alias added to school 125 (Roselle Park) — Roselle Park appears as "Roselle" in some tournament bracket exports (Beast of the East, A-Nice Invitational)
- "Roselle" alias removed from school 358 (Abraham Clark) — alias was causing incorrect tournament bout routing; Abraham Clark did not participate in these December 2025 tournaments; rely on display_name alone for 358 until Abraham Clark tournament data actually appears

**Why:** `restore_school_358_full_data.sql` moved bouts to school 358 assuming "Roselle" in tournament data = Abraham Clark. This was wrong — Abraham Clark did not attend Beast of the East or A-Nice Invitational in December 2025. Those are Roselle Park (school 125) meets. The 7 wrestlers (Cianfrocca, Abud, Booth, Oberlies, Rodriguez, Herrera, Appello) are Roselle Park wrestlers; their profiles at school 125 are correct and no profile split is needed.

**Known naming collision:** `school_aliases_nj_alias_unique` enforces a global unique constraint on `alias` alone (not scoped to school_id), so "Roselle" can only exist once. Since school 358's `display_name` is already "Roselle", a "Roselle" alias for school 125 cannot be added. Future Roselle Park tournament imports where `school_raw='Roselle'` must be manually disambiguated at import time (e.g., match on "Roselle Park" raw value or set school_id=125 explicitly).

**Reversible?** Yes — move bouts back to 358, restore "Roselle" alias on 358
**Verified?** Yes — wrestler1_school_id=125, school_raw='Roselle': 12 bouts; wrestler2_school_id=125, school_raw='Roselle': 8 bouts; total=20 ✓. "Roselle" alias deletion from school 358 confirmed (no rows in school_aliases for alias='Roselle').

---

## 2026-07-30 — Drop school_names table

**Migration file:** `docs/migrations/20260730_drop_school_names.sql`

**Status:** APPLIED

**What changed:**
- Dropped `school_names` table entirely.

**Why:**
`school_names` was an abbreviation → display_name lookup table from the early import pipeline, predating reliable `tournament_entries.school_id` population. All downstream code had been (incorrectly) using it instead of `schools.display_name` via `school_id`. Fixed in this session: wrestler profiles, settings page, and PersonalizedHome all now query `schools` directly. Zero references remain in `src/`. Deleting the table prevents future accidental use.

---

## 2026-07-29 — Fix school_wrestlers RPC: stale column names after rename

**Migration file:** `docs/migrations/20260729_fix_school_wrestlers_rpc_column_names.sql`

**Status:** APPLIED

**What changed:**

RPC-only update — no DDL. The `school_wrestlers` function referenced `tb.nj_wrestler1_id` and `tb.nj_wrestler2_id` in the `rtf_wrestlers` CTE. These columns were renamed to `tb.wrestler1_id` and `tb.wrestler2_id` by migration `20260728_tournament_type_and_oos_wrestlers.sql`, but the RPC was never updated. This caused the RTF in-season branch to return 0 results, making NJ school roster pages empty for wrestlers who only appeared in in-season tournaments.

Also adds `AND wr.is_oos = false` to the final `inseason_only` SELECT to guard against OOS wrestlers accidentally appearing on NJ school rosters.

**Why:** Column rename in a prior migration left the RPC using stale names. NJ school rosters were visibly empty for in-season tournament wrestlers.

**Reversible?** Yes — re-run `20260727_school_wrestlers_include_inseason.sql` to restore the broken version.

---

## 2026-07-29 — Delete all OOS tournament data for clean reimport

**Migration file:** `docs/migrations/20260729_delete_oos_tournament_data.sql`

**Status:** APPLIED

**What changed:**

Data-only wipe — no DDL. Deletes all rows related to out-of-state tournaments so they can be reimported cleanly with the fixed parser:
- `tournament_bouts` for `tournament_type = 'outside'` tournaments
- `tournament_placements` for those tournaments
- `in_season_tournaments` rows with `tournament_type = 'outside'`
- `wrestler_name_aliases` for OOS schools (cascade prep)
- `school_aliases` where `alias_type = 'oos'`
- `schools` where `is_nj = false`
- `wrestlers` where `is_oos = true`

**Why:** The old parser had multiple bugs (unclosed parens, nested-paren school names, ALL CAPS names, bad OOS school fuzzy auto-matching) that created incorrect school and wrestler records. Rather than patching the bad data, wiping and reimporting with the fixed code produces a correct result.

**Reversible?** No — reimport from the original RTF files is the path forward.
**Verified?** No — run STEP 1 diagnostic first.

---

## 2026-07-29 — Cleanup bad wrestler records from parser bug

**Migration file:** `docs/migrations/20260729_cleanup_bad_wrestler_names.sql`

**Status:** APPLIED

**What changed:**

Data-only cleanup — no DDL. Deletes wrestler rows where `first_name` or `last_name` contains `(` or `)`, created when `extractNameSchool` in `parseRtf.ts` returned the full string including the school fragment (e.g. "Ryan Mitchell (St Joseph" → first_name="Ryan Mitchell (St", last_name="Joseph") when a bout line had an unclosed parenthesis.

Parser was fixed 2026-07-29. After force-reimporting each affected tournament, the bad wrestlers become orphaned (no bout references) and can be safely deleted. Aliases cascade.

**Why:** Re-importing each tournament (force mode) deletes and recreates bouts with clean wrestler names. The old bad wrestler rows then have no referencing bouts and can be dropped.

**Reversible?** No — but bad wrestlers have no legitimate bout data attached after force-reimport.
**Verified?** No — run STEP 1 diagnostic first to confirm scope.

---

## 2026-07-28 — dual_meet_matches: backfill scores and times

**Migration file:** `docs/migrations/20260728_dual_meet_matches_backfill_scores.sql`

**Status:** APPLIED

**What changed:**

Data-only backfill — no DDL. Parses existing `result_detail` strings to populate the new columns for all rows already in `dual_meet_matches`:
- Dec/MD: "9-7" → `winner_score=9`, `loser_score=7`
- TF with valid time: "3:15 17-1" → `fall_time_seconds=195`, `winner_score=17`, `loser_score=1`, `result_time_estimated=false`
- TF with 0:00 or no time: → `fall_time_seconds=360`, estimated scores where extractable, `result_time_estimated=true`
- Fall with 0 or NULL time: → `fall_time_seconds=360`, `result_time_estimated=true`

**Why:** Re-importing dual meets would create duplicate records (no force/dedup mode). SQL backfill from existing `result_detail` values is the safe path.

---

## 2026-07-28 — dual_meet_matches: result_time_estimated, winner_score, loser_score

**Migration file:** `docs/migrations/20260728_dual_meet_matches_scores.sql`

**Status:** APPLIED

**What changed:**

Added the same stat columns to `dual_meet_matches` that were added to `tournament_bouts`:
- `result_time_estimated boolean DEFAULT false` — true when `fall_time_seconds` is a 6:00 default
- `winner_score smallint` — winner's point total parsed from score string
- `loser_score smallint` — loser's point total parsed from score string

**Code impact:** Dual meet import route (`import-meets/route.ts`) now calls `boutResultToDb` from `parseRtf.ts` instead of its own local `parseFallTime`. All result parsing (Fall time, TF time + score, Dec/MD scores, estimated flag) is now centralized in one function for both import paths.

**Re-import needed:** All dual meet matches imported before this change have these columns at their DEFAULT values. Re-import affected meets to backfill correct values.

---

## 2026-07-28 — tournament_bouts: backfill scores and times

**Migration file:** `docs/migrations/20260728_tournament_bouts_backfill_scores.sql`

**Status:** APPLIED

**What changed:**

Partial SQL backfill for existing `tournament_bouts` rows:
- Dec/MD: `result_detail` "5-2" → `winner_score=5`, `loser_score=2` ✓ recoverable
- Fall (valid time): `fall_time_seconds` already correct → sets `result_time_estimated=false` ✓
- Fall (0 or NULL time): → `fall_time_seconds=360`, `result_time_estimated=true` ✓
- **TF: unrecoverable** — old `parseResult` bug dropped the detail string before insert; `result_detail=NULL` for all existing TF rows. Sets `fall_time_seconds=360`, `result_time_estimated=true` as a placeholder. Re-import with `force=true` to recover actual scores/times from the RTF.

---

## 2026-07-28 — Bout score columns: winner_score, loser_score

**Migration file:** `docs/migrations/20260728_bout_scores.sql`

**Status:** APPLIED

**What changed:**

**`tournament_bouts.winner_score smallint`** and **`tournament_bouts.loser_score smallint`** — parsed from the score string in the source data. Populated for Dec, MD, and TF results (e.g. "5-2" → `winner_score=5`, `loser_score=2`). NULL for Fall (score irrelevant; time is the stat), Forfeit, DFF, and BYE.

**Why:** Storing scores as raw strings ("5-2") requires splitting at query time on every stat query. Separate integer columns allow direct SQL ranking by margin (`winner_score - loser_score`), total points, average margin, etc.

**Code impact:** `boutResultToDb` in `parseRtf.ts` now returns `winner_score` and `loser_score`. Import route includes both fields in every bout row insert.

**Re-import needed:** All bouts imported before this change have `winner_score=null` / `loser_score=null`. Re-import with `force=true` to backfill.

---

## 2026-07-28 — TF time tracking: result_time_estimated column

**Migration file:** `docs/migrations/20260728_tf_time_tracking.sql`

**Status:** APPLIED

**What changed:**

**`tournament_bouts.result_time_estimated boolean DEFAULT false`** — flags rows where `fall_time_seconds` is a default/estimated value rather than an actual captured time. Set to `true` when:
- A Technical Fall has no time in the source data, or time is 0:00 (physically impossible for a TF)
- In those cases `fall_time_seconds` is stored as 360 (6:00) as a conservative default

**Why:** TF mat time is a real stat — used for rankings (total mat time as a tiebreaker for tech fall counts). Times showing 0:00 in the RTF source indicate missing data; 6:00 (max match time) is the safe default. The estimated flag lets queries exclude or caveat those rows in time-based rankings.

**Code impact:** `boutResultToDb` in `parseRtf.ts` now returns `result_time_estimated`. TF results now parse the time into `fall_time_seconds` and the score into `result_detail` (e.g., `fall_time_seconds=195`, `result_detail="17-1"`). The import route includes the new field in every bout row insert.

**Re-import needed:** All TF bouts imported before this change have `result_detail=null` and `fall_time_seconds=null`. Re-import affected tournaments with `force=true` to backfill correct values.

---

## 2026-07-28 — Tournament type classification + OOS wrestler/school support

**Migration file:** `docs/migrations/20260728_tournament_type_and_oos_wrestlers.sql`

**Status:** APPLIED

**What changed:**

1. **`in_season_tournaments.tournament_type`** — new text column, values: `'outside'` (NJ teams travel OOS), `'inside_outside'` (NJ host + OOS teams), `'inside'` (NJ host, all NJ). Set per tournament in the import UI review step.

2. **`tournament_bouts`: `nj_wrestler1_id` → `wrestler1_id`, `nj_wrestler2_id` → `wrestler2_id`** — these columns now hold IDs for ALL wrestlers (NJ and OOS), not just NJ. Tables were empty so rename is safe.

3. **`tournament_placements`: `nj_wrestler_id` → `wrestler_id`** — same reason.

4. **`wrestlers.is_oos boolean DEFAULT false`** — flags out-of-state athletes created from tournament imports. OOS wrestlers get real rows in `wrestlers` and `schools` (with `is_nj = false`) so they resolve for common-opponent queries and match history.

**Code impact:** All TypeScript references updated across 13 files. Import route now find-or-creates OOS school rows and creates OOS wrestler rows automatically on import. Match route skips wrestler-flag review for OOS (they auto-create). Import UI adds tournament type dropdown per tournament in the review step.

---

## 2026-07-27 — Rewrite school_wrestlers RPC to include in-season wrestlers

**Migration file:** `docs/migrations/20260727_school_wrestlers_include_inseason.sql`

**Status:** APPLIED

**What changed:**

`school_wrestlers(p_school_id, p_gender, p_season)` now UNIONs three data sources instead of only querying `tournament_entries`:

1. **`tournament_entries`** (postseason) — unchanged; includes full districts/regions/state placement data
2. **`tournament_bouts`** (RTF in-season) — wrestlers who appear in at least one bout for the school in the given season, joined via `in_season_tournaments.season` text label
3. **`dual_meet_matches`** (dual meets) — wrestlers who appear in at least one match for the school in the given season (non-double-forfeit), joined via `dual_meets.season_id`

Wrestlers who appear in postseason (source 1) retain their placement data. Wrestlers only seen in in-season sources (sources 2–3) appear with NULL placement columns. Deduplication prevents double-rows when a wrestler competes in both in-season tournaments and postseason. `primary_weight` for in-season-only wrestlers is the minimum weight they appear at.

This makes newly created wrestlers (from RTF import or dual import) immediately visible on the school roster page without waiting for them to be entered in a postseason tournament.

---

## 2026-07-27 — Add wrestler_overrides column to rtf_import_drafts

**Migration file:** `docs/migrations/20260727_rtf_import_drafts_wrestler_overrides.sql`

**Status:** APPLIED

**What changed:**

Added `wrestler_overrides JSONB NOT NULL DEFAULT '{}'` to `rtf_import_drafts`. Stores the user's wrestler review decisions (create/existing/accept/skip per wrestler flag) so they survive a page reload and the draft can be fully resumed from step 3.

---

## 2026-07-27 — RTF import drafts table

**Migration file:** `docs/migrations/20260727_rtf_import_drafts.sql`

**Status:** APPLIED

**What changed:**

New table `rtf_import_drafts` stores in-progress RTF tournament import sessions so the admin can close the browser and resume without re-running the 30–40 s school/wrestler matching step. Columns: `id uuid`, `user_id uuid` (FK → auth.users, CASCADE DELETE), `label text`, `text text` (raw pasted RTF content), `year int`, `selected jsonb` (array of tournament names), `school_overrides jsonb`, `dates jsonb`, `reviewed jsonb` (full ReviewedTournament array), `step text`, `tournament_count int`, `status text` (draft/imported), `created_at`, `updated_at`. RLS policy: owner-only via `user_id = auth.uid()`. `GRANT ALL TO service_role`.

---

## 2026-07-26 — Add tournament_placements table and source_format column

**Migration file:** `docs/migrations/20260726_tournament_placements.sql`

**Status:** APPLIED

**What changed:**

Added `source_format text CHECK (source_format IN ('full_bracket', 'school_tracking'))` to `in_season_tournaments`. Created `tournament_placements` table: one row per place winner per weight per tournament, with columns for `weight_class`, `place` (1–8), `wrestler_name_raw`, `school_name_raw`, `school_id` (FK nullable), and `nj_wrestler_id` (FK nullable). Indexed on tournament, school, and wrestler. Drives the new tournament detail page: full_bracket tournaments show a champions grid; school_tracking tournaments show NJ wrestlers on the podium.

---

## 2026-07-26 — Delete contaminated bouts from Bethlehem Holiday Wrestling Classic

**Migration file:** `docs/migrations/20260726_delete_bethlehem_contaminated_bouts.sql`

**Status:** APPLIED

**What changed:**

Deleted 120 bouts from the Bethlehem Holiday Wrestling Classic (`in_season_tournament_id = 0adf0e3e-0c8f-4462-a355-f23cfb32250b`) where either school was not in the verified 35-school team list. Root cause: `pipe_format_tournaments_dec2025.csv` was generated from the RTF without filtering by the TW Event Yes/No flag, so unverified No/No bouts from a different tournament (CBA, St. Joseph Montvale, and national schools) were incorrectly imported as Bethlehem data. The other 4 pipe-CSV-imported tournaments (Elmwood Park, King of the Castle, Linn Crawn, Palmyra) were audited and confirmed clean.

---

## 2026-07-25 — Merge school 358 (Roselle duplicate) into school 125

**Migration file:** `docs/migrations/20260725_merge_roselle_schools.sql`

**Status:** APPLIED

**What changed:**

School 358 ("Roselle", "Rams") was incorrectly created as a duplicate when a request to rename school 125 ("Roselle Park", "Panthers") was mishandled. Confirmed zero FK references for school 358 across all tables. Migration copies display_name, mascot, and logo_url from 358 onto 125, then deletes 358. School 125 becomes "Roselle Rams" with the correct logo; all wrestlers and meets already linked to 125 reflect the update automatically.

---

## 2026-07-25 — Backfill wrestler_name_aliases from existing dual_meet_matches

**Migration file:** `docs/migrations/20260725_backfill_wrestler_name_aliases.sql`

**Status:** APPLIED

**What changed:**

One-time backfill: pulls every `(wrestler_a_name_raw, school_a_id, wrestler_a_id)` and `(wrestler_b_name_raw, school_b_id, wrestler_b_id)` triple from `dual_meet_matches` into `wrestler_name_aliases`, skipping OOS stubs (`is_nj = false`) and null values. Ensures all previously confirmed matches from completed imports are recognized as `exact` confidence on future imports without re-submitting any data.

---

## 2026-07-25 — Add wrestler_name_aliases table

**Migration file:** `docs/migrations/20260725_wrestler_name_aliases.sql`

**Status:** APPLIED

**What changed:**

New table `wrestler_name_aliases (raw_name text, school_id int, wrestler_id uuid, UNIQUE(raw_name, school_id))`. Populated automatically by the import-meets route after each successful import. The `matchWrestlers` cache loads aliases on startup and checks them before fuzzy matching — returning `exact` confidence so confirmed names never show as low-confidence again. Also catches dual-meet-only wrestlers who have no `tournament_entries` and therefore don't appear in the existing school index.

---

## 2026-07-25 — Delete 60 null-school dual meets (Dec 9–20 2025)

**Migration file:** `docs/migrations/20260725_delete_null_school_meets.sql`

**Status:** APPLIED

**What changed:**

Data cleanup: 60 `dual_meets` rows spanning Dec 9–20 2025 had `team1_school_id IS NULL` or `team2_school_id IS NULL` because `build_from_gt.py` built them from GT data — it knew one NJ team's wrestler UUIDs but couldn't identify the OOS opponent. Displays as "— vs School" in the audit tool with dashes on the opponent side and no OOS info. All associated `dual_meet_matches` rows deleted first (FK order). These meets will be re-imported from TrackWrestling raw text which captures both teams correctly and creates OOS school stubs with `is_nj = false`.

---

## 2026-07-25 — Fix is_forfeit_win flag on 15 matches

**Migration file:** `docs/migrations/20260725_fix_forfeit_win_flag.sql`

**Status:** APPLIED

**What changed:**

Data fix: 15 `dual_meet_matches` rows had `result_type = 'For'` but `is_forfeit_win = false`. Root cause was a parser bug where the TrackWrestling format `Unknown (School) (For.)` wasn't caught by the forfeit detection regex. All affected rows had null wrestler/winner IDs so no wrestler records needed cleanup — only the flag required updating.

---

## 2026-07-24 — Dual import draft saves

**Migration file:** `docs/migrations/20260724_dual_import_drafts.sql`

**Status:** APPLIED

**What changed:**

New table `dual_import_drafts` stores in-progress import sessions (raw pasted text + school/wrestler override decisions). Rows are user-scoped via RLS. Resuming a draft re-runs school and wrestler matching on the saved text, then re-applies the saved overrides so decisions carry over.

---

## 2026-07-24 — Roselle Park alias, mascot, and logo

**Migration file:** `docs/migrations/20260724_roselle_park_alias_mascot_logo.sql`

**Status:** APPLIED

**What changed:**

- Added `school_aliases` row: school_id=358, alias=`Abraham Clark`, alias_type=`school_name`. Roselle Park HS appears under this name in dual meet schedule data; without the alias the importer falls back to fuzzy match and may mismatch.
- `schools` row 358: `mascot` updated to `Rams`, `logo_url` set to `https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/358.png`.
- Logo source: `Mascot Library/Clean SVG/125 - Roselle Park.svg` → converted to 512×512 PNG via `scripts/upload-roselle-logo.mjs`.

---

## 2026-07-23 — Add wrestler_a_name_raw / wrestler_b_name_raw to dual_meet_matches

**Migration file:** `docs/migrations/20260723_dual_meet_matches_name_raw.sql`

**Status:** APPLIED

**What changed:**

Adds two nullable `text` columns to `dual_meet_matches` mirroring the `wrestler1_name_raw` / `wrestler2_name_raw` pattern already in `tournament_bouts`. The dual meet import route (`api/admin/import-meets/route.ts`) previously discarded the parsed wrestler name whenever it couldn't resolve to a UUID — only the null FK was written. Going forward, the raw name from the TW source text is written to these columns regardless of whether the UUID resolves. Resolved matches get both; failed matches get the raw name instead of nothing.

**Historical gap:** 259 non-forfeit wrestler slots imported before this change have NULL in both the id and name_raw columns. Those names were not retained at import time and cannot be recovered from the DB. They remain as "—" in the audit tool permanently unless sourced externally.

**Code changes (no migration required):**
- `src/app/api/admin/import-meets/route.ts` — derives `wrestlerANameRaw`/`wrestlerBNameRaw` using the same winner/loser→A/B slot logic as the ID assignment, writes both to each match row
- `src/app/admin/dual-audit/DualAuditClient.tsx` — list rows show raw name in muted italic when slot is unlinked but raw is present; edit panel shows "Raw: {name}" hint above the wrestler picker for unlinked slots

---

## 2026-07-23 — Sam Cali stub wrestler fix (followup): 3 remaining records fixed by ID

**Migration file:** `docs/migrations/20260723_sam_cali_wrestler_stub_fix2.sql`

**Status:** APPLIED 2026-07-23 via REST API PATCH. Migration file documents what was executed.

**What changed:**

Three wrestler records still had stub `first_name` values after `20260723_sam_cali_stub_wrestler_records.sql` was applied. Root causes: (1) C. O'Connor and B. Washington used subqueries keyed on `wrestler_name_raw` values, but those values had already been updated by the bout name_raw patches — subqueries returned 0 rows. (2) N. O'Sullivan was excluded from the first file on the incorrect assumption that CHAM is OOS (`_TEAM_TO_SCHOOL["CHAM"] = 397`, not None); a stub wrestler record was created at import time.

Fixed by direct ID-based UPDATE. Confirmed via REST API SELECT: 0 stub `first_name` values (matching `^[A-Z]\.$`) remain anywhere in the wrestlers table, and no Sgrulletta/Sgurletta wrestler record exists (GFA correctly had no record created).

| Wrestler ID | old first_name | new first_name | last_name |
|---|---|---|---|
| `bf9f6d2e-...` | `C.` | `Collin` | O'Connor |
| `9f684e87-...` | `B.` | `Navell` | Washington |
| `e2fdda6f-...-73808e` | `N.` | `Nate` | O'Sullivan |

---

## 2026-07-23 — Sam Cali stub wrestler first_name records (partial apply)

**Migration file:** `docs/migrations/20260723_sam_cali_stub_wrestler_records.sql`

**Status:** PARTIALLY APPLIED — 5 of 8 wrestlers fixed (Adell, D'Arcy, Landell, O'Leary, D'Arco). 3 no-ops (O'Connor ×2, Washington) due to apply-order bug. See followup file above.

**What changed:**

Fixes wrestler records where `first_name` was stored as a stub initial (e.g. `'C.'`) because the name wasn't in `_FULL_NAME_LOOKUP` at import time. `get_or_create_wrestler` fell back to `_parse_abbreviated_name`, which splits on the first space and stores the initial as `first_name`. For uncommon last names (Adell, D'Arcy, Landell, O'Leary, D'Arco), direct first_name/last_name filter used — these applied correctly. For common last names (O'Connor × 2, Washington), bout-subquery-scoped UPDATEs were used but became no-ops because the bout patches had already updated the `wrestler_name_raw` values they were keyed on. Those 3 were completed by `20260723_sam_cali_wrestler_stub_fix2.sql`.

---

## 2026-07-23 — Sam Cali stub name fix (10 remaining abbreviated names)

**Migration file:** `docs/migrations/20260723_sam_cali_stub_name_fix.sql`

**Status:** APPLIED

**What changed:**

Resolves the 10 abbreviated name stubs that couldn't be derived from the pipe CSV cross-reference: D. Adell (Andrew), D. D'Arcy (Danny), J. Sgrulletta (Jaxson Sgurletta — single r per original tournament document), C. O'Connor (Collin), N. O'Sullivan (Nate), O. O'Leary (Owen), S. D'Arco (Sal), K. Landell (Trenton), T. O'Connor (Tommy), B. Washington (Navell). Three were OCR initial errors confirmed against the pipe CSV; seven came from the original tournament team-page export. Also adds all 10 to `_FULL_NAME_LOOKUP` in `scripts/import_sam_cali_csv.py` for documentation.

After both Sam Cali name patches apply, the VERIFY query (commented at the bottom of this migration file) should return 0 rows — no abbreviated stubs remaining in any Sam Cali bout.

Note: J. Sgrulletta (GFA, OOS) — wrestler record was created with stub first_name "J." at import time. The wrestler table entry may also need a manual update.

---

## 2026-07-22 — Fix Sam Cali abbreviated wrestler name_raw fields

**Migration file:** `docs/migrations/20260722_sam_cali_name_fix.sql`

**Status:** APPLIED

**What changed:**

Backfill `wrestler1_name_raw` and `wrestler2_name_raw` for all 386 Sam Cali bouts (`source_format='pdf'`, tournament `bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56`). The original importer stored the raw bracket abbreviation ("J. Barron") in these fields while resolving the full name ("John Barron") only for the wrestler record link. 358 (weight, abbreviated_name) pairs are resolved via the pipe-CSV cross-reference encoded in `scripts/import_sam_cali_csv.py`. 12 stubs remain pending user clarification (3 initial-mismatch cases, 9 genuinely unknown first names).

---

## 2026-07-22 — Rewrite top_postseason_team_scores to key on school_id

**Migration file:** `docs/migrations/20260722_rewrite_top_postseason_team_scores.sql`

**Status:** APPLIED

**What changed:**

Rewrote `top_postseason_team_scores` to GROUP BY `pts.school_id` in all three CTEs (district/region/state) and INNER JOIN `schools ON sch.id = c.school_id` in the final SELECT. The old version grouped by `pts.school_name` and derived school_id only at the end via `LEFT JOIN schools ON sch.display_name = c.school` — returning NULL school_id for any name mismatch, which silently dropped logos. The column patches to `precomputed_team_scores.school_id` were correct but irrelevant; this function never read that column.

This file also captures `top_postseason_team_scores` into source control for the first time. It previously existed only in the Supabase dashboard.

Return signature is unchanged — no page code updates needed.

**Precondition:** `SELECT * FROM precomputed_team_scores WHERE school_id IS NULL` must return 0 rows before applying (districts patch applied first).

---

## 2026-07-22 — Patch precomputed_team_scores school_id: district-level rows

**Migration file:** `docs/migrations/20260722_patch_precomputed_team_scores_districts.sql`

**Status:** APPLIED

**What changed:**

Patches 4 boys_districts rows left with `school_id IS NULL` after the first round of fixes (`20260722_patch_precomputed_team_scores_school_id.sql`). These were missed because the original diagnostic sampled from the `top_postseason_team_scores` RPC (top 30 only); these schools rank below that cut. Full table audit (`SELECT * FROM precomputed_team_scores WHERE school_id IS NULL`) is the correct method.

| school_name in cache | school_id | display_name |
|---|---|---|
| West Windsor-Plainsboro South | 177 | West Windsor-Plainsboro South |
| West Windsor-Plainsboro North | 176 | West Windsor-Plainsboro North |
| Haddon Township | 240 | Haddon Township |
| St Joseph (Hammonton) | 356 | St. Joseph's (Hammonton) |

After applying: `SELECT * FROM precomputed_team_scores WHERE school_id IS NULL` returns 0 rows.

---

## 2026-07-22 — Add staged_imports + staged_decisions for persistent review workflow

**Migration file:** `docs/migrations/20260722_staged_imports.sql`

**Status:** APPLIED

**What changed:**

Two new tables:

- `staged_imports` — one row per uploaded JSON file. Holds `filename`, `source_format`, `status` (`in_review` / `submitted` / `abandoned`), `payload jsonb` (the full PipeImportJSON, write-once), and `total_bouts` / `total_flags` counters for the list view. Auth: `authenticated` + `service_role` only; `anon` has no access.

- `staged_decisions` — one row per school or wrestler decision. Keyed by `(import_id, key_type, key_value)` with `UNIQUE` constraint so upserts are safe. `decision jsonb` stores the override (`{type:'nj', school_id: X}` / `{type:'oos'}` / `{type:'existing', wrestler_id: X}` / `{type:'new'}`). `ON DELETE CASCADE` from `staged_imports` — abandoning an import deletes all its decisions.

**Why JSONB payload + decisions rows (not staged_bouts rows):**
The review operates at the entity level (one school decision resolves all N bouts for that raw name), not the bout level. Per-bout rows would force N-row updates per school decision and require reconstructing the grouped view on resume. JSONB payload is write-once (never modified after upload), so no blob-rewrite cost per decision. Only `staged_decisions` rows change — one small row per click.

---

## 2026-07-22 — Backfill school_id on precomputed_team_scores (logo fix)

**Migration file:** `docs/migrations/20260722_patch_precomputed_team_scores_school_id.sql`

**Status:** APPLIED

**What changed:**

`UPDATE precomputed_team_scores SET school_id = X WHERE school_name = 'Y' AND school_id IS NULL` for 11 rows across 9 boys schools and 2 girls schools.

| school_name in cache | correct school_id | display_name in schools |
|---|---|---|
| Christian Brothers Academy | 197 | Christian Brothers |
| St Peters Preparatory School | 167 | St. Peter's Prep |
| Don Bosco Prep School | 11 | Don Bosco Prep |
| St. Augustine Prep | 313 | St. Augustine |
| Rumson-Fair Haven Regional | 175 | Rumson-Fair Haven |
| Lower Cape May Regional | 281 | Lower Cape May |
| Pascack Valley School | 16 | Pascack Valley |
| Delaware Valley Regional | 141 | Delaware Valley |
| West Morris Central | 108 | West Morris |
| Newton/Kittatinny (girls co-op) | 315 | Kittatinny |
| Lawrence Senior (girls) | 210 | Lawrence |

**Root cause:** `20260402_add_school_id_to_precomputed.sql` backfilled `school_id` using exact `school_name = display_name` matching. Where `precomputed_team_scores.school_name` used a slightly different format (suffixes like "Regional", "School", "Prep School"; punctuation differences; abbreviation differences), the match failed and `school_id` remained NULL. NULL `school_id` silently drops the school logo on the Postseason Point Leaders list on `/`, `/boys`, `/girls` — data shows but logo badge is blank.

**Pre-existing:** Not caused by today's changes. Present since April 2026 backfill.

**Affected pages:** `/` (root home), `/boys`, `/girls` — all three render `PostseasonLeaders` which resolves logos via `logos.byId.get(r.school_id)`.

**Comprehensive fix:** `20260717_rewrite_scoring_rpcs_use_school_id.sql` (pending) will replace all `precomputed_team_scores` rows with school_id-keyed data once applied. This patch is a safe interim fix — it does not conflict with the comprehensive migration.

---

## 2026-07-22 — Cleanup duplicate school_aliases + resume OOS support migration

**Migration file:** `docs/migrations/20260722_cleanup_and_reapply.sql`

**Status:** APPLIED

**What changed:**

Step 1: Deletes 40 duplicate rows from `school_aliases` that block `CREATE UNIQUE INDEX school_aliases_nj_alias_unique`.
- 5 Category A rows (same school_id, safe to drop extras): KIRE×1, SPP×1, 'Haddon Twp Hgh School'×2, 'Passaic Co Tech-Voc'×1
- 4 Category B rows (clearly wrong school): HACK→del Hackettstown (keep Hackensack), HAHE→del Haddon Heights (keep Hasbrouck Heights), MAHS→del Manville (keep Mahwah), WHS→del Weehawken (keep Wayne Hills)
- 31 Category C rows (genuinely ambiguous, delete all): HILL, LAKE, LIND, MANA, MARE, MILL, MONT, MORR, PETO, PISC, PVS, RIDG, WEST, WILL, WOOD — Sam Cali patch will re-add HILL→188, LAKE→5, MANA→220, PISC→183 with correct school_ids.

Step 2: Runs the 3 OOS support statements that did not execute on first attempt (statements 3-5 of `20260722_school_aliases_oos_support.sql`):
- `CREATE UNIQUE INDEX school_aliases_nj_alias_unique`
- `CREATE UNIQUE INDEX school_aliases_oos_alias_unique`
- `ALTER TABLE school_aliases ADD COLUMN confirmed_at TIMESTAMPTZ`

**Why this is needed:**
`20260722_school_aliases_oos_support.sql` partially applied: statements 1-2 auto-committed (school_id is now nullable, global unique constraint dropped), but statement 3 failed on a KIRE duplicate, leaving statements 3-5 unapplied. This cleanup clears all duplicates first, then runs the remaining statements.

---

## 2026-07-22 — Patch Sam Cali school abbreviation mismatches (16 abbreviations, 206 positions)

**Migration file:** `docs/migrations/20260722_patch_sam_cali_school_abbreviations.sql`

**Status:** APPLIED

**What changed:**

206 wrestler-position rows in Sam Cali Battle for The Belt 2025
(`bcfb7e9a-eb02-48c4-9d4a-d7776ec87e56`) corrected across 16 abbreviations:

| Abbr | Was | Correct | Positions |
|------|-----|---------|-----------|
| B-R | 321 Becton | 131 Bridgewater-Raritan | 17 |
| BBRK | 207 Brick Memorial | 322 Bound Brook | 8 |
| CHAM | 397 Summit | NULL (OOS — Chaminade, NY) | 18 |
| DEL | 141 Delaware Valley | 82 Delbarton (28) / 290 Delsea (15) | 43 |
| HTWN | 240 Haddon Twp | 112 Hackettstown | 11 (4 already fixed) |
| MANA | 204 Manalapan | 220 Manasquan | 6 |
| MDTWP | 159 Middletown North | 283 Middle Township | 14 |
| MO | 172 Monroe | 56 Mt. Olive | 20 |
| MS | NULL | 160 Middletown South | 8 |
| MTWN | 114 Morristown | 261 Moorestown | 11 |
| RP | 196 Rutgers Prep | 125 Roselle Park | 5 |
| SBW | 164 South Brunswick | 379 Lodi/Saddle Brook | 1 (thin evidence) |
| SHP | 225 Shore | 127 Seton Hall Prep | 28 |
| TRE | 216 Trenton | 253 Toms River East | 9 |
| W/MP | NULL | 9 Waldwick (co-op) | 1 |
| WHLS | 119 Whippany Park | 147 Watchung Hills | 6 |

DEL resolved per-position (name+weight matched against pipe CSV): 28 Delbarton, 15 Delsea,
0 unresolvable. ID lists embedded in migration file.

Migration also inserts all 60 Sam Cali bracket abbreviations into `school_aliases`
(plus 5 OOS aliases: GFA, MSCA, PNGT, CHAM, PEDD) so future imports use the alias
path instead of fuzzy matching.

**Root cause: abbreviation-driven entity resolution without a lookup table.**
The bracket PDF source uses 3-5 letter abbreviations. `SchoolMatcher` trigram-fuzzy-
matched them because they lacked alias entries. Trigram similarity is meaningless at
2-5 characters — abbreviations share no meaningful n-grams with the full names they
represent. This is the **3rd abbreviation collision** in this single tournament
(after SPP and HTWN); all three produced wrong NJ school assignments that persisted
in production until manual correction.

**Why this wasn't caught at import time:**
No alert fires when `confidence='high'` is returned — the importer trusts scores
≥ 0.85 silently. A 3-letter input can score ≥ 0.85 against a wrong 10-character
school name purely by accident. The fix (see SchoolMatcher short-string guard in
`import_tournament.py`) refuses fuzzy matching for inputs < 6 characters, returning
`confidence='none'` and surfacing them for review instead.

---

## 2026-07-22 — Patch bullet CSV school mismatches (Bart Payne + Parsippany Hills)

**Migration file:** `docs/migrations/20260722_patch_bullet_csv_school_mismatches.sql`

**Status:** APPLIED

**What changed:**

54 tournament_bouts rows patched across two bullet CSV tournaments:

- **Bart Payne HT Holiday Tournament** (26 bouts): `wrestler_school_id` 230 (Ewing) → 240 (Haddon Township)
  for all bouts where `school_raw = 'Haddon Twp Hgh School'`.
- **Parsippany Hills Holiday Tournament** (28 bouts): `wrestler_school_id` 243 (Saint John Vianney) → 391 (Passaic Tech)
  for all bouts where `school_raw = 'Passaic Co Tech-Voc'`.

Root cause: `import_bullet_csv.py` `_NJ_SCHOOL_OVERRIDES` had two wrong entries:
- `"Haddon Twp Hgh School": 230` (should be 240)
- `"Passaic Co Tech-Voc": 243` (should be 391)

Both entries corrected in source. Two school aliases also inserted to prevent recurrence
via SchoolMatcher fuzzy path on future importers that don't use `_NJ_SCHOOL_OVERRIDES`.

---

## 2026-07-22 — Patch Steven Vidal Sam Cali school (HTWN → Hackettstown) + alias

**Migration file:** `docs/migrations/20260722_patch_vidal_sam_cali_school.sql`

**What changed:**

4 tournament_bouts rows in Sam Cali Battle for The Belt updated:
`wrestler_school_id` changed from 240 (Haddon Township) → 112 (Hackettstown)
for wrestler Steven Vidal (`ccd2a21c-ac71-41bf-aaf3-db101f1a70ea`), rounds R2, QF, SF, 3rd_Place.

Root cause: "HTWN" (Hackettstown abbreviation used in Sam Cali CSV) had no alias
entry. Importer's trigram fuzzy matcher resolved it to "Haddon Twp Hgh School"
(school 240). Fix: added `HTWN → school 112` to school_aliases (id 1669).

Note: user said "3 bouts" but there were 4. All 4 patched.

**Applied:** 2026-07-22 via service_role PATCH + INSERT.

---

## 2026-07-22 — school_aliases OOS support (nullable school_id, partial indexes, confirmed_at)

**Migration file:** `docs/migrations/20260722_school_aliases_oos_support.sql`

**What changed:**

1. `school_id` made nullable. OOS confirmation rows store `school_id = NULL`,
   `alias_type = 'oos'`. The FK to `schools(id)` remains; NULLs bypass it.

2. `school_aliases_alias_unique` (full UNIQUE on alias) dropped. Replaced by:
   - `school_aliases_nj_alias_unique`: UNIQUE(alias) WHERE school_id IS NOT NULL
     — preserves SPP-fix protection for NJ aliases
   - `school_aliases_oos_alias_unique`: UNIQUE(alias) WHERE alias_type = 'oos'
     — prevents duplicate OOS confirmations per raw string

3. `confirmed_at TIMESTAMPTZ DEFAULT now()` added. Auto-set on insert.
   Existing rows get NULL (predates the column).

**Why UNIQUE(alias) was too strict for OOS:**
"CBA" can legitimately be both NJ's Christian Brothers Academy (school_id = X)
and an OOS school at a PA tournament. A global unique constraint made confirming
one permanently block the other. The two partial indexes preserve NJ-to-NJ
disambiguation while allowing same-string NJ + OOS coexistence.

**Lookup policy:** NJ alias rows are checked before OOS rows. If "CBA" → school
42 (NJ) and "CBA" → OOS both exist, the NJ match wins.

**Verified?** No — apply via Supabase SQL editor before using the OOS confirmation
UI in /admin/import-tournament.

---

## 2026-07-22 — Patch 40 tournament_bouts rows: UNK → CSF

**Migration file:** `docs/migrations/20260722_patch_unk_csf_rounds.sql`

**What changed:**

40 `tournament_bouts` rows across 5 tournaments (Bethlehem 4, King of the Castle 5,
Linn Crawn 8, Palmyra 23, Elmwood Park 0) had `round = 'UNK'` due to a parser bug:
when the pipe CSV `round` field was empty and the round was embedded as a name prefix
(`"Cons. Semis - William Shallop"`), `import_pipe_csv.py` stripped the prefix but
discarded it rather than using it to populate the round column. All 40 were consolation
semifinals and have been corrected to `CSF`. 6 bouts remain `UNK` (Linn Crawn 5,
Elmwood Park 1) — their round is genuinely absent from the source data.

**ALREADY APPLIED** 2026-07-22 via service_role API. Migration file documents what ran.

**Rollback:**
```sql
-- Only needed if the patch introduced wrong data; these 40 rows were all
-- confirmed CSF by matching against the original CSV source.
-- No automated rollback — would require re-checking each bout individually.
```

---

## 2026-07-21 — Unique constraint on school_aliases.alias

**Migration file:** `docs/migrations/20260721_school_aliases_unique_constraint.sql`

**What changed:**

Adds `UNIQUE(alias)` constraint to `public.school_aliases` via `school_aliases_alias_unique`.
The migration first removes the duplicate SPP row (two rows pointing to school_id 167 were
created when the SPP alias was inserted before the constraint existed).

**Why UNIQUE(alias) and not UNIQUE(school_id, alias):**
The SPP incident (South Plainfield vs. St. Peter's Prep both using "SPP") showed that
allowing the same alias string for two schools produces silent non-deterministic bugs in
`matchSchools.ts`, which uses `.find()` on the alias array. The right answer is a more
specific alias for the less common usage, not tolerance of duplicates at the DB level.

**Rollback:**
```sql
ALTER TABLE public.school_aliases DROP CONSTRAINT IF EXISTS school_aliases_alias_unique;
```

**Verified?** No — apply via Supabase SQL editor.

---

## 2026-07-20 — Add tw_id to wrestlers, source_format to tournament_bouts ⚠️ APPLY BEFORE pipe CSV import

**Migration files (apply in this order):**
1. `docs/migrations/20260720_add_tw_id_to_wrestlers.sql`
2. `docs/migrations/20260720_add_source_format_to_tournament_bouts.sql`

**What changed:**

**1. wrestlers.tw_id (bigint, nullable)**

Adds a `tw_id` column (TrackWrestling profile ID) to the `wrestlers` table and a partial unique index (`wrestlers_tw_id_idx`) that enforces no two wrestlers share a tw_id while allowing NULL. Used as the primary deduplication key for pipe-format CSV imports: when a CSV row carries a non-null `tw_id_winner`/`tw_id_loser`, the script resolves the wrestler by tw_id before falling back to name+school trigram matching. NULL for all pre-existing wrestlers (added via RTF/PDF imports before this column existed).

**2. tournament_bouts.source_format (text, nullable → backfilled)**

Adds a `source_format` column to `tournament_bouts` to record which import pipeline produced each row: `'pipe'` (pipe-delimited CSV), `'rtf'` (RTF bracket file), `'pdf'` (bracket PDF reconstruction), `'bullet'` (bullet-format CSV). Back-fills all existing rows with `'rtf'` since every pre-migration bout came from the RTF import pipeline.

**Why:**
- tw_id enables reliable cross-season wrestler identity without depending on exact name matching
- source_format enables querying bracket fidelity (PDF = full bracket vs. pipe = results-only)

**Rollback:**
```sql
-- migration 2: remove source_format
ALTER TABLE tournament_bouts DROP COLUMN IF EXISTS source_format;
-- migration 1: remove tw_id
DROP INDEX IF EXISTS wrestlers_tw_id_idx;
ALTER TABLE wrestlers DROP COLUMN IF EXISTS tw_id;
```

**Verified?** No — apply via Supabase SQL editor before running `scripts/import_pipe_csv.py`

---

## 2026-07-20 — Emergency rescue: girls precomputed_team_scores (8 schools) ⚠️ APPLY IMMEDIATELY

**Migration file:** `docs/migrations/20260720_rescue_girls_precomputed_team_scores.sql`

**What changed:**

Data-only migration (no DDL). Re-inserts `precomputed_team_scores` rows for 8 girls schools that were deleted by Step 2 of `20260719_girls_tournament_entries_school_id.sql`.

Root cause of deletion: Step 2 correctly removed stale rows keyed by raw `school_context_raw` strings (e.g. `'Jackson Township H.S.'`) with `school_id = NULL`. However, `top_postseason_team_scores` reads **only** from `precomputed_team_scores` with no live fallback — the CLAUDE.md note "the RPC recomputes live" is incorrect for this case. All 8 schools disappeared from the girls Postseason Point Leaders immediately after Step 2 ran.

Step 1 of the prior migration had already set correct `tournament_entries.school_id` for all 8 schools, so the scoring RPCs (`district_team_score`, `girls_region_team_score`, `state_team_score`) now return them with proper `school_id` and `display_name`. This migration loops all girls season-2 tournaments and re-INSERTs rows for only the 8 target school_ids.

Schools restored:
- 370 Jackson Township, 32 High Point, 260 Kingsway, 263 Rancocas Valley
- 190 Hunterdon Central, 216 Trenton, 391 Passaic Tech, 259 Gloucester

Tournament types: `girls_districts`, `girls_regions`, `girls_state` (matching existing data convention).

**Rollback:** `DELETE FROM precomputed_team_scores WHERE school_id = ANY(ARRAY[370,32,260,263,190,216,391,259]) AND season_id = 2;`

**Verified?** No — run verify query in migration file after applying

---

## 2026-07-19 — Girls tournament_entries school_id fix (8 schools)

**Migration file:** `docs/migrations/20260719_girls_tournament_entries_school_id.sql`

**What changed:**

Step 1 (APPLIED): `UPDATE tournament_entries SET school_id = X` for 8 girls schools whose `school_context_raw` names didn't match `schools.display_name` during import, leaving `school_id = NULL`. Scope: `season_id = 2, gender = 'F'`.

Step 2 (APPLIED — caused live breakage, see 20260720 rescue above): `DELETE FROM precomputed_team_scores WHERE school_name IN (raw_names) AND season_id = 2`. Removed stale rows with incorrect `school_id = NULL` and raw-name keys.

**Rollback:** See rollback block at bottom of migration file (reverses Step 1 only).

---

## 2026-07-19 — Waldwick (school 9): logo URL + header_background

**Migration file:** `docs/migrations/20260719_waldwick_school9_update.sql`

**What changed:**

- `logo_url` → `.svg` path (`9.svg`, new file uploaded to Supabase Storage)
- `header_background` → `#6A7CB5` (Light Blue)

**Rollback:** See rollback block at bottom of migration file.

**Verified?** Applied 2026-07-19.

---

## 2026-07-17 — Rewrite 8 scoring RPCs to use school_id ⚠️ APPLIED

**Migration file:** `docs/migrations/20260717_rewrite_scoring_rpcs_use_school_id.sql`

**What changed:**

Rewrites 8 multi-param scoring RPC overloads (the ones with `p_season smallint`, created by `update_team_scoring.py`) to aggregate by `tournament_entries.school_id` instead of `school_context_raw` + `school_names` name matching. Also repopulates `precomputed_team_scores` from the corrected RPC output.

Functions rewritten:
- `district_team_score(integer, gender_type, smallint)`
- `region_team_score(integer, gender_type, smallint)`
- `girls_region_team_score(text, smallint)`
- `state_team_score(gender_type, smallint)`
- `district_team_pts(integer, gender_type, smallint)`
- `region_team_pts(integer, gender_type, smallint)`
- `girls_region_team_pts(text, smallint)`
- `state_team_pts(gender_type, smallint)`

Single-param overloads of these functions (from `create_girls_rpcs.py` / `fix_state_rpcs.py`) are NOT touched.

Output shape: adds `school_id integer` to all 8 function return types (was always null before; app's TypeScript types already declared it). `school text` now returns `school_id::text` instead of the `school_context_raw` abbreviation string.

Root cause fixed: the old pipeline grouped by `school_context_raw` → joined `school_names` by abbreviation → got a text display name → `precomputed_team_scores` backfilled school_id by matching that text to `schools.display_name`. Two name-matching hops caused school 363 (Cherry Hill combined co-op) to accumulate boys district points that belong to school 268 (Cherry Hill West).

**Rollback:** Re-run `update_team_scoring.py` to restore old function bodies; restore `precomputed_team_scores` from backup or re-run old pipeline.

**Verified?** No — run verification query in migration file first

---

## 2026-07-16 — Logo upload + header_background update, all 325 schools ⚠️ APPLIED

**Migration file:** `docs/migrations/20260716_logo_upload_all_325.sql`

**What changed:**

Data migration (no DDL). Sets `logo_url` and `header_background` on all 325 active schools.
Unconditional overwrite — every image manually confirmed correct before upload.

- **Images:** 325/325 logos processed (crop 7% symmetric, pad 8% L/R with corner fill, 512×512 PNG) and uploaded to Supabase Storage at `school-logos/colored/512/{school_id}.png`
- **`logo_url`:** Set to `https://vhffduvgcljvhtlyqgcd.supabase.co/storage/v1/object/public/school-logos/colored/512/{school_id}.png` for all 325 schools
- **`header_background`:** Set from `school_text_colors.csv` (all values validated as `#RRGGBB` hex)
- Special cases confirmed in place: Holmdel 189 → `#454444`, Warren Hills 67 → `#808080`, Garfield 53 → `#000000`, Red Bank Catholic 264 → `#000000`, South Hunterdon 136 → `#6F777B`, St. Augustine 313 → `#9CBEE1`
- School 358 (Roselle) UPDATE is included but is a no-op until `20260716_restore_roselle_358.sql` runs first

**Prior state (for context):** 171/325 schools had NULL `logo_url`; 218/325 had NULL `header_background`. Rollback block in migration file restores exact prior values per school.

**Rollback:** See commented block at bottom of migration file — paste into Supabase SQL editor.

**Verified?** No — pending review before execution

---

## 2026-07-16 — Restore school 358 (Roselle / Abraham Clark HS) ⚠️ APPLIED

**Migration file:** `docs/migrations/20260716_restore_roselle_358.sql`

**What changed:**

Reverses the school 358 portion of `20260420_school_dedup_final.sql`, which incorrectly deleted Roselle on the sole basis of having zero postseason tournament entries.

| Step | Table | Action |
|---|---|---|
| 1 | `schools` | INSERT id=358 — Roselle, Rams, #CC0022, North II Group 2, Union County |
| 2 | `school_districts` | INSERT school_id=358, district_id=16 |
| 3 | `conference_standings` | INSERT id=895 — UCIAC Mountain division, season 2, 3W–14L (0–7 div), 349 PF / 930 PA |

**Why the April 20 deletion was wrong:**

`20260410_suppress_shell_schools.sql` had explicitly listed school 358 among the schools to *keep active*, noting it had real conference W/L data. That decision was overridden ten days later by the dedup migration without re-examining it. School 358 had zero postseason tournament entries but a real regular-season record.

**Policy established:** "Zero postseason tournament entries" alone is not sufficient grounds for deletion. A school with conference standings data or dual-meet records is not an orphan. The correct disposition is `is_active = true` with an empty postseason record.

**Rollback:** `DELETE FROM conference_standings WHERE id = 895; DELETE FROM school_districts WHERE school_id = 358; DELETE FROM schools WHERE id = 358;`

**Post-run:** Upload logo via pipeline (file `358 - Roselle.svg` already in mascot library). Verify UCIAC conference standings page shows Roselle.

**Verified?** No — pending approval before execution

---

## 2026-06-09 — dual_meets + dual_meet_matches: missing grants patch

**Migration file:** `docs/migrations/20260609_dual_meets_grants.sql`

**What changed:**
- The original `20260422_dual_meets_schema.sql` and `20260423_dual_meets_rls.sql` omitted explicit `GRANT` statements. Supabase did not auto-apply default privileges, so `service_role` received PG error 42501 when the batch import script attempted `SELECT`/`INSERT` on `dual_meets`.
- Added: `GRANT ALL ON TABLE dual_meets TO service_role` and same for `dual_meet_matches` so the import script can INSERT.
- Added: `GRANT SELECT ON TABLE dual_meets TO anon, authenticated` and same for `dual_meet_matches` for public-facing schedule pages.

**Rollback:** `REVOKE ALL ON TABLE public.dual_meets FROM service_role, anon, authenticated; REVOKE ALL ON TABLE public.dual_meet_matches FROM service_role, anon, authenticated;`

**Verified?** ✓ APPLIED — 2026-06-09; confirmed 385 meets and 5,390 match rows inserted with 0 errors

---

## 2026-06-08 — tournament_bouts tables: missing grants patch

**Migration file:** `docs/migrations/20260608_tournament_tables_grants.sql`

**What changed:**
- The original schema migration omitted explicit `GRANT` statements. Supabase did not auto-apply default privileges, so `service_role` received PG error 42501 (permission denied) even for SELECT.
- Added: `GRANT ALL ON TABLE in_season_tournaments TO service_role` and `GRANT ALL ON TABLE tournament_bouts TO service_role` so the import script can INSERT.
- Added: `GRANT SELECT ON TABLE in_season_tournaments TO anon, authenticated` and same for `tournament_bouts` so the public-facing tournament pages can read data.
- Also patched `20260608_tournament_bouts_schema.sql` in-place so a fresh apply from that file is now complete.

**Rollback:** `REVOKE ALL ON TABLE in_season_tournaments FROM service_role, anon, authenticated; REVOKE ALL ON TABLE tournament_bouts FROM service_role, anon, authenticated;`

**Verified?** ✓ APPLIED — 2026-06-08; confirmed 5,172 bouts inserted across 25 tournaments with 0 errors

---

## 2026-06-08 — in_season_tournaments + tournament_bouts tables ✓ APPLIED

**Migration file:** `docs/migrations/20260608_tournament_bouts_schema.sql`

**What changed:**
- The existing `tournaments` table (postseason, integer PK) is **not touched**.
- Created `in_season_tournaments`: uuid PK, `name text NOT NULL`, `start_date date NOT NULL`, `end_date date`, `location text`, `season text NOT NULL` (e.g. "2025-26"), `created_at`. Unique index on `(name, season)` to prevent duplicate imports.
- Created `tournament_bouts`: one row per individual bout in an in-season tournament. Separate from the postseason `matches` table.
  - `in_season_tournament_id uuid` FK → `in_season_tournaments(id)` ON DELETE CASCADE
  - `weight_class integer`, `round text`
  - `nj_wrestler1_id / nj_wrestler2_id` — nullable FKs → `wrestlers(id)` for NJ athletes
  - `wrestler1_name_raw / wrestler2_name_raw` — always populated (not null)
  - `wrestler1_school_id / wrestler2_school_id` — nullable FKs → `schools(id)`; OOS schools use is_nj=false rows or NULL
  - `wrestler1_school_raw / wrestler2_school_raw` — always populated (not null)
  - `winner smallint CHECK (winner IN (1, 2))` — 1 = wrestler1, 2 = wrestler2, NULL = DFF/no result
  - `result_type`, `result_detail`, `fall_time_seconds`
- Indexes: `idx_in_season_tournaments_name_season` (unique), `idx_tournament_bouts_tournament_id`, `idx_tournament_bouts_wrestler1_school`, `idx_tournament_bouts_wrestler2_school`, `idx_tournament_bouts_nj_wrestler1`, `idx_tournament_bouts_nj_wrestler2`
- RLS: enabled on both tables with `"public read"` policy; writes require service role.

**Rollback:** `DROP TABLE tournament_bouts; DROP TABLE in_season_tournaments;`

**Verified?** ✓ APPLIED — 2026-06-08; tables created successfully, grants applied via patch migration above

---

## 2026-04-22 — School colors update 2: new SVG schools + Gateway/Pennsville corrections ✓ APPLIED

**Migration file:** `docs/migrations/20260422_school_colors_update2.sql`

**What changed:**
- Part 1: Set `header_background` for 13 schools that had NULL (12 new SVG additions + Oakcrest which already had an SVG): Saddle Brook (#006400), Paterson Eastside (#CC4E10), Madison (#8F0018), Union (#8F0018), Notre Dame (#4169E1), Neptune (#000000), Point Pleasant Beach (#FFFFFF), Haddon Heights (#CC0022), Donovan Catholic (#003087), Camden Catholic (#00824B), Oakcrest (#034CB2), Gateway Reg/Woodbury (#034CB2), Northern Burlington (#454444). Only fires when `header_background IS NULL`.
- Part 2: Corrected wrong color columns — Gateway (291) had green/gold in DB but is royal blue/white/black; Pennsville (293) had green/gold but is navy/yellow (#263586/#FCE80B). Header_background for Pennsville was already correct from the prior migration.
- ID 289 (Cumberland) excluded throughout.

**Rollback:** Set 13 IDs back to NULL; restore Gateway/Pennsville to prior (incorrect) color values (see migration file ROLLBACK block)

**Verified?** ✓ Applied 2026-04-22 — spot-checked all 14 affected rows via psycopg2 query

---

## 2026-04-23 — RLS policies for dual_meets and dual_meet_matches ✓ APPLIED

**Migration file:** `docs/migrations/20260423_dual_meets_rls.sql`

**What changed:**
- Enabled Row Level Security on `dual_meets` and `dual_meet_matches`
- Added `"public read"` SELECT policy (`USING (true)`) on both tables so the anon key used by browser clients can query them; write access remains service-role only

**Rollback:** Drop both `"public read"` policies and disable RLS on both tables (see migration file ROLLBACK block)

**Verified?** ✓ Applied 2026-04-23 manually via Supabase SQL editor

---

## 2026-04-22 — Create dual_meets and dual_meet_matches tables ✓ APPLIED

**Migration file:** `docs/migrations/20260422_dual_meets_schema.sql`

**What changed:**
- Created `dual_meets` table: one row per dual meet event, with `season_id`, `team1_school_id`, `team2_school_id`, `meet_date`, `team1_score`, `team2_score`, `gender` (default 'M'), `status` (default 'final')
- Created `dual_meet_matches` table: one row per weight class bout, with `dual_meet_id` FK (CASCADE DELETE), `weight_class`, `wrestler_a_id`, `wrestler_b_id`, `school_a_id`, `school_b_id`, `winner_id`, `result_type`, `result_detail`, `fall_time_seconds`, `team1_points`, `team2_points`, `is_double_forfeit`, `is_forfeit_win`, `validated`
- Added index `idx_dual_meets_teams_date` on `(team1_school_id, team2_school_id, meet_date)` for duplicate detection
- Added index `idx_dual_meet_matches_dual_meet_id` on `dual_meet_id` for fast per-meet lookups
- These tables are separate from the tournament-bracket `matches` table (different schema, different use case)

**Rollback:** `DROP TABLE IF EXISTS dual_meet_matches; DROP TABLE IF EXISTS dual_meets;`

**Verified?** ✓ Applied 2026-04-22 — both tables and both indexes confirmed via information_schema

---

## 2026-04-22 — School header_background updates and format normalisation ✓ APPLIED

**Migration file:** `docs/migrations/20260422_school_colors_update.sql`

**What changed:**
- Set `header_background` for 32 schools that previously had NULL, sourced from
  the 2026-04-22 mascot CSV ("School Master List.csv"), all values stored as
  canonical `#RRGGBB` hex. Schools include new SVG additions (Jefferson, Dwight
  Morrow, Manchester Regional, Westfield, South Hunterdon, Ridge, Middletown
  South, North Brunswick, Monroe, Edison, St. Joseph Metuchen, Hunterdon
  Central, Brick Township, Shore, Burlington City, Burlington Township, Ewing,
  Paul VI, West Deptford, Central Regional, Kingsway, Rancocas Valley, Seneca,
  Egg Harbor, Pennsville, Hammonton, Winslow, Penns Grove, Morris Knolls,
  Pioneer Academy, Union City, Morris Hills-Morris Knolls)
- Global Part 2 normalisation pass (name strings → hex, bare hex → `#` prefix)
  was a no-op — DB was already clean
- ID 289 (Cumberland, `#DB5B2A`) explicitly excluded

**Rollback:** Set the 32 IDs back to NULL (see migration file ROLLBACK block)

**Verified?** ✓ Applied 2026-04-22 — spot-checked IDs 4, 41, 77, 136, 263, 289, 385

---

## 2026-04-22 — Add is_nj column to schools table ✓ APPLIED

**Migration file:** `docs/migrations/20260422_schools_is_nj.sql`

**What changed:**
- `ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_nj boolean DEFAULT true`
- All existing rows default to `true` (every school currently in the DB is a NJ school)
- Out-of-state schools imported via the dual-meet tool will be inserted with `is_nj = false`

**Rollback:** `ALTER TABLE schools DROP COLUMN IF EXISTS is_nj`

**Verified?** ✓ Applied 2026-04-22 — column present with `boolean DEFAULT true`

---

## 2026-04-20 — Add school_id to lb_gp_team_points RPC ✓ APPLIED

**Migration file:** `docs/migrations/20260420_lb_gp_team_points_school_id.sql`

**What changed:**
- Dropped old `lb_gp_team_points(p_pool text)` 1-arg function
- Replaced with `lb_gp_team_points(p_pool text, p_season integer DEFAULT NULL)` returning `school_id integer` in addition to existing columns
- `school_id` resolved via `LEFT JOIN schools ON display_name` match against resolved school name
- Enables school SVG avatar display and school profile links in the girls leaderboard Team Points table

**Rollback:** Recreate prior version from `fix_lb_gp_rpcs.py` `LB_GP_TEAM_POINTS` definition (no school_id column, 1-arg signature)

**Verified?** ✓ Applied 2026-04-20 — sanity check confirmed school_id populating for known schools (e.g. Pennsauken=242, Howell=233)

---

## 2026-04-20 — Fix Buena Regional/Vineland display name ✓ APPLIED

**Migration file:** `docs/migrations/20260420_buena_display_name_fix.sql`

**What changed:** `UPDATE schools SET display_name = 'Buena/Vineland' WHERE id = 360`

**Rollback:** `UPDATE schools SET display_name = 'Buena Regional/Vineland' WHERE id = 360`

**Verified?** ✓ Applied 2026-04-20 — 1 row updated.

---

## 2026-04-20 — Mascot name audit and fix (19 schools) ✓ APPLIED

**Migration file:** `docs/migrations/20260420_mascot_name_fix.sql`

**What changed:**
19 `UPDATE schools SET mascot` rows in two categories:

- **16 NULL → value**: Saddle River Day (Rebels), College Achieve Paterson (Phoenix), Pioneer Academy (Eagles), Newark Collegiate (Knights), Central Jersey College Prep (Cougars), Ranney (Panthers), Bordentown Regional/Florence (Scotties), Kittatinny (Cougars), Becton (Wildcats), Cherry Hill East/West (Cougar Lions), Cliffside Park/Ridgefield Memorial (Royal Raiders), Jefferson-Sparta (Spartan Falcons), Lodi/Saddle Brook (Ram Falcons), Mary Help of Christians Academy (Blue Jays), Morris Hills-Morris Knolls (Eagle Knights), Ramsey/Northern Highlands (Highlander Rams)
- **3 wrong → correct**: Emerson Boro (Cavaliers→Cabos), Nottingham (Northstars→Patriots), Buena Regional/Vineland (Wildcats→Fighting Chiefs)

Kept DB values for: Voorhees (Vikings), Haddonfield (Bulldawgs), Red Bank Regional (Buccaneers), and the more-specific group (Green Raiders, Maroon Raiders, etc.)

**Rollback:** Commented out at bottom of migration file.

**Verified?** ✓ Applied 2026-04-20 — Emerson/Nottingham/Buena spot-checked correct.

---

## 2026-04-20 — Fix Cumberland header_background (#FFFFFF → #DB5B2A) ✓ APPLIED

**Migration file:** `docs/migrations/20260420_cumberland_header_bg.sql`

**What changed:**
Single-row fix: `UPDATE schools SET header_background = '#DB5B2A' WHERE id = 289`. The reseed migration seeded `#FFFFFF` from the CSV "Background: White" column, causing the school header to render white-on-white (invisible). `#DB5B2A` (Cumberland's orange primary) is the correct background.

**Rollback:** `UPDATE schools SET header_background = '#FFFFFF' WHERE id = 289`

**Verified?** ✓ Applied 2026-04-20 — 1 row updated.

---

## 2026-04-20 — School color reseed from updated CSV ✓ APPLIED

**Migration file:** `docs/migrations/20260420_school_colors_reseed.sql`

**What changed:**
Pure UPDATE (no schema change — columns already exist from `20260420_school_color_columns.sql`). Reseeds `color_primary`, `color_secondary`, `color_tertiary`, `header_background` for all 326 schools from the corrected School Master List CSV.

Key corrections vs initial seed:
- School 289 (Cumberland): `color_primary` `#034CB2` → `#DB5B2A`, `color_secondary` → `#443029`
- ~20 schools that had NULL `header_background` now populated (e.g. 360, 265, 286, 93, 168, 173, 305, 129, 322, 363, etc.)

**Rollback:** Re-run `docs/migrations/20260420_school_color_columns.sql` to restore prior values.

**Verified?** ✓ Applied 2026-04-20 — Cumberland row confirmed `#DB5B2A`/`#443029`; 324 schools with non-null `color_primary`.

---

## 2026-04-20 — Add school color columns and initial seed ✓ APPLIED

**Migration file:** `docs/migrations/20260420_school_color_columns.sql`

**What changed:**
Added 4 nullable text columns to `schools` table: `color_primary`, `color_secondary`, `color_tertiary`, `header_background`. Seeded initial values for all 326 schools from School Master List CSV (colors normalized from named colors and bare hex to `#RRGGBB`).

**Rollback:** `DROP COLUMN IF EXISTS` all four columns.

**Verified?** ✓ Applied 2026-04-20 — superseded by reseed migration same day.

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

## 2026-04-14 — Consolidate school 373 → 191 (Keansburg) (APPLIED)

**Migration file:** `docs/migrations/20260414_consolidate_school_373_to_191.sql`

**Tables affected:** `tournament_entries` (UPDATE ×17), `precomputed_team_scores` (UPDATE ×3), `schools` (DELETE ×1)

**What changed (pending — not yet run):**

School 373 (`'Keansburg/Henry Hudson'`) has 17 tournament entries and 3 precomputed_team_scores rows; no aliases, districts, regions, or names. Re-points all rows to school 191 (`'Keansburg'`) and deletes school 373.

**Reversible?** Yes — see ROLLBACK section (scope rollback UPDATEs by season_id = 2 to avoid touching pre-existing school 191 rows)
**Verified?** No — pending Paul's review before execution

---

## 2026-04-14 — Consolidate schools 362 → 237 and 298 → 369 (APPLIED)

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

## 2026-04-10 — Suppress shell schools + load missing conference standings (APPLIED)

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

## 2026-08-11 — tournament_strength_report RPC

**Tables affected:** none (read-only function)

**What changed:**
- Created `tournament_strength_report(p_season text, p_postseason_season_id smallint)` RPC
- Returns one row per in-season tournament with counts of district champs, region top-4 finishers, and state qualifiers who competed
- Granted EXECUTE to anon, authenticated, service_role
- Migration file: `docs/migrations/20260811_tournament_strength_report_rpc.sql`

**Reversible?** Yes — `DROP FUNCTION public.tournament_strength_report(text, smallint)`
**Verified?** Yes — applied

---

## 2026-08-24 — Power Points freeze support

**Tables affected:** `power_points` (column added), `pp_freeze_log` (new table)

**What changed:**
- Added `frozen_power_points numeric` column to `power_points` table
- Created `pp_freeze_log` table: id, season_id, gender, frozen_at, frozen_by, school_count, before_state jsonb
- When freeze is applied, all live-site PP displays read `frozen_power_points ?? power_points`
- Migration file: `docs/migrations/20260824_pp_freeze.sql`

**APPLIED** — `docs/migrations/20260824_pp_freeze.sql`

**Reversible?** Yes — DROP COLUMN frozen_power_points; DROP TABLE pp_freeze_log (once freeze is applied, unfreezing via DELETE endpoint clears the values)
**Verified?** Yes — applied

---

## 2026-08-24 — Rankings schema (computed variants, editorial, published) + weight_class column

**Tables affected:** `ranking_computed_variants`, `ranking_editorial`, `ranking_published` (new tables)

**What changed:**
- Created three new ranking tables with scope/season/period columns, results JSONB, and appropriate indexes
- RLS: service_role full access; authenticated read all three; anon read ranking_published only
- Migration file: `docs/migrations/20260824_rankings_schema.sql`

**APPLIED** — `docs/migrations/20260824_rankings_add_weight_class.sql`
- Adds `weight_class integer` column to all three tables
- Drops and recreates lookup indexes to include weight_class
- Run this migration AFTER `20260824_rankings_schema.sql`

**Reversible?** Yes — DROP TABLE CASCADE for each new table; for weight_class, ALTER TABLE DROP COLUMN
**Verified?** rankings_schema applied; rankings_add_weight_class pending

---

## 2026-08-26 — tournament_bracket_slots table

**Tables affected:** `tournament_bracket_slots` (new)

**What changed:**
- Created `tournament_bracket_slots` table to store in-season tournament bracket structure
- One row per match position (slot) per weight class per tournament
- 8-man bracket = 12 slots: QF (×4), SF (×2), CSF (×2), F, 3rd, 5th, 7th
- Stores seed placements (top/bottom wrestler, school, seed#), results (winner_position, result_type, result_detail), and routing (advances_winner_to_slot, advances_loser_to_slot, winner_is_top_in_next, loser_is_top_in_next)
- UNIQUE (in_season_tournament_id, weight_class, slot_number)
- RLS: public read, service_role write
- Migration file: `docs/migrations/20260826_tournament_bracket_slots.sql`

**APPLIED** — `docs/migrations/20260826_tournament_bracket_slots.sql`

**Reversible?** Yes — `DROP TABLE public.tournament_bracket_slots;`
**Verified?** Yes — applied 2026-08-26

---

## Guidelines for Future Entries

- Add an entry **before merging** any PR that touches the database
- Include the migration filename in **What changed** if one exists
- If the change is a data backfill only (no DDL), still document it
- If you run a one-off SQL command in the Supabase dashboard, add it here retroactively
- Mark **Verified?** as `yes` only after confirming the change is live in production

---

## 2026-09-16 — boys_school_conferences season 3 rollover

**Tables affected:** `boys_school_conferences`

**What changed:**
- Copied all 299 conference assignments from season_id=2 into season_id=3
- Populates the Conference column in the preseason dashboard school directory spreadsheet
- Migration file: `docs/migrations/20260916_boys_school_conferences_season3.sql`

**APPLIED** — run in Supabase SQL editor 2026-09-16

**Reversible?** Yes — `DELETE FROM boys_school_conferences WHERE season_id = 3;`
**Verified?** Yes — 299 rows inserted

---

## 2026-09-16 — app_users RLS self-read policy

**Tables affected:** `app_users` (RLS enabled + policy added)

**What changed:**
- Enabled RLS on `app_users`
- Added SELECT policy allowing authenticated users to read their own row
- Needed so the public site header can check `role = 'admin'` client-side to show the Admin Panel link
- Service role (admin API routes) bypasses RLS and is unaffected
- Migration file: `docs/migrations/20260916_app_users_rls_self_read.sql`

**APPLIED** — run in Supabase SQL editor 2026-09-16

**Reversible?** Yes — `DROP POLICY "users can read own app_users row" ON public.app_users; ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;`
**Verified?** Pending

---

## 2026-09-16 — handle_new_public_user null username guard

**Tables affected:** `users` (trigger behavior change only)

**What changed:**
- Added early `RETURN NEW` to `handle_new_public_user()` when `raw_user_meta_data.username` is NULL
- Admin invite flow creates auth users with no username in metadata; the trigger was trying to insert NULL into `public.users.username` (NOT NULL column), crashing the entire auth transaction with "Database error saving new user"
- Normal fan signups are unaffected — they always pass a username
- Migration file: `docs/migrations/20260916_handle_new_public_user_null_guard.sql`

**APPLIED** — run in Supabase SQL editor 2026-09-16

**Reversible?** Yes — remove the NULL guard block from the function
**Verified?** Pending

---

## 2026-09-16 — handle_new_user trigger ON CONFLICT fix

**Tables affected:** `app_users` (trigger behavior change only)

**What changed:**
- Added `ON CONFLICT (id) DO NOTHING` to `handle_new_user()` trigger function
- Trigger previously hard-failed if a row already existed for the new auth user, causing admin invite flow to return "Database error saving new user"
- Also changed admin invite route (`/api/admin/admin-profiles` PUT) to use `.upsert()` instead of `.insert()` so the trigger's auto-inserted 'fan' row gets promoted to 'admin'
- Migration file: `docs/migrations/20260916_handle_new_user_on_conflict.sql`

**APPLIED** — run in Supabase SQL editor 2026-09-16

**Reversible?** Yes — remove `ON CONFLICT (id) DO NOTHING` from the function body
**Verified?** Yes — deployed to production

---

## 2026-09-18 — Seed microcheck_task_priority

**Tables affected:** `microcheck_task_priority`

**What changed:**
- Inserted the two known task types (`school_profile`, `tie_resolution`) which were missing from the table, causing the Task Order page to show nothing
- Migration file: `docs/migrations/20260918_seed_microcheck_task_priority.sql`

**PENDING** — run in Supabase SQL editor

**Reversible?** Yes — `DELETE FROM microcheck_task_priority;`
**Verified?** No — pending

---

## 2026-09-14 — admin_tool_registry table

**Tables affected:** `admin_tool_registry` (new)

**What changed:**
- Created `admin_tool_registry` table to store all admin tools and their dashboard phase assignments
- Columns: key (PK), label, path, description, gender, show_offseason, show_preseason, show_season, show_postseason, updated_at
- Pre-seeded with all ~40 tools across all phases
- Drives the tool dropdown in task creation (TaskCreatorPanel) and the Tool Audit settings page at /admin/tool-audit
- Migration file: `docs/migrations/20260914_tool_registry.sql`

**APPLIED** — run in Supabase SQL editor

**Reversible?** Yes — `DROP TABLE public.admin_tool_registry;`
**Verified?** No — pending
