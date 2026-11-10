# Track page review (pinned 2026-11-02, after the leaderboard update)

Items that need the Track results page (or a decision) before they can be fixed. Found by
`scripts/integrity_check.mts`; work them the way Bloomfield vs Delaware Valley was (2026-11-01):
compare each meet's bouts to Track, then split, move or add bouts.

## 1. Girls duals with one wrestler facing several opponents at one weight (31 meets)

Likely several meets from the same day combined into one record. Need each meet's Track page.

| Date | Meet | Weights affected |
|---|---|---|
| 2025-12-10 | Holmdel vs Colts Neck | 2 |
| 2025-12-13 | Colts Neck vs Freehold Township | 2 |
| 2025-12-16 | Nottingham vs Hamilton West | 1 |
| 2025-12-19 | Sterling vs Lindenwold | 2 |
| 2025-12-19 | Voorhees vs Bridgewater-Raritan | 1 |
| 2025-12-20 | Toms River North vs Toms River South | 1 |
| 2025-12-30 | Middlesex-Dunellen vs Carteret | 2 |
| 2026-01-03 | Lakeland vs Wallkill Valley | 3 |
| 2026-01-06 | Manchester Regional vs Elmwood Park | 1 |
| 2026-01-09 | Manville vs Morristown | 1 |
| 2026-01-10 | Lindenwold vs Sterling | 2 |
| 2026-01-14 | Barnegat vs Toms River North | 1 |
| 2026-01-14 | Gateway Reg/Woodbury vs Lindenwold | 2 |
| 2026-01-14 | Manville vs Rutgers Prep | 1 |
| 2026-01-14 | Old Tappan vs Pascack Valley | 2 |
| 2026-01-15 | Elmwood Park vs Leonia-Palisades | 1 |
| 2026-01-16 | Matawan vs Toms River North | 2 |
| 2026-01-16 | Sterling vs Collingswood | 2 |
| 2026-01-16 | Verona vs Orange | 1 |
| 2026-01-21 | John P. Stevens vs Middlesex-Dunellen | 1 |
| 2026-01-21 | South River vs Middlesex-Dunellen | 2 |
| 2026-02-04 | Washington Township vs Cumberland | 1 |
| 2026-02-11 | Cherokee vs Collingswood | 1 |
| 2026-02-11 | Delran vs Gloucester | 1 |
| 2026-02-11 | Orange vs Bergenfield | 1 |
| 2026-02-11 | West Orange vs West Milford | 1 |
| 2026-02-12 | Middle Township vs Ocean City | 1 |
| 2026-02-20 | Overbrook vs Clayton/Glassboro | 1 |
| 2026-02-21 | Bergenfield vs Red Bank Regional | 1 |
| 2026-02-21 | Bergenfield vs West Windsor-Plainsboro South | 1 |
| 2026-02-21 | Hightstown vs Bordentown Regional/Florence | 2 |

## 2. ~~Ella Magee vs Ella Magee~~ — deleted 2026-11-10 (Kyle; `20261110_delete_magee_self_bout.sql`)

2026 SJWHOF Girls Varsity (2026-01-04), 107, placement round, result NC: the source lists the
same wrestler on both sides. Not rated (NC). Decision: delete the bout (needs approval with
the row backed up), or leave it.

## 3. One person or two? (no evidence either way yet)

| Wrestler | Records | Question |
|---|---|---|
| ~~Finley Pazinko~~ | Kyle 2026-11-10: same person (Jackson Liberty folded into Jackson Township) | |
| ~~Jake Valeri~~ | Kyle 2026-11-10: same person | |
| ~~Aidan Thompson~~ | Kyle 2026-11-10: same person | |
| ~~Ashley Coronel (girls)~~ | resolved: every record is Paterson Eastside now (checked 2026-11-10) | |
| ~~Antonio Cruz~~ | resolved: three separate profiles (Cedar Creek class of 2025 at 126; Newark East Side 190-285; Plainfield 113) | |

## 4. Other open items

- ~~8 girls whose 2025-26 postseason entries have no school~~ — resolved 2026-11-02: bracket filler names, not wrestlers (only forfeit losses, no duals). Removed with 11 other filler entries (`20261102_remove_placeholder_entries.sql`).

- ~~Falls under 10 seconds~~ — Kyle 2026-11-10: under 10 s can happen; only 0:00–0:02 falls are wrong; tech falls under 0:13 and tech falls / injury defaults with no time likewise → 6:00 (`20261110_bout_times_to_6_00.sql`, 432 bouts).
- 229 boys / 42 girls duals where the final score differs from the bout points, mostly by 1 point (likely team deductions; not verified).
- Duplicate school records: ~~"Blair Academy (B Team)"~~ gone (one Blair record left); "Hodgson" (1108) → "Hodgson Vo Tech School" (1118), merge approved 2026-11-10 (`20261110_merge_hodgson.sql`).

## 5. Before the 2026-27 season (pinned 2026-11-02)

- **Nightly jobs have never run.** CRON_SECRET isn't set in Vercel, so the 4 crons (ratings 06:00/06:30 UTC, leaderboards 07:00/07:15 UTC) get a 401 every night. Off-season that costs nothing. Before the first bouts: set CRON_SECRET in Vercel (Production), add a skip when no bouts were added since the last run, and confirm one night's run in `admin_activity_log` (entries by 'cron').
- ~~**Girls Region 1, 2025-26:** no finals or 3rd-place bouts on file~~ — the bouts were loaded 2026-11-02 from the bracket PDFs (this note was never updated). The `placements` rows were still missing: `20261109_girls_region1_placements.sql`.

## 6. Follow-ups from the 2026-11-02 logo / no-raw-text work

- ~~**Shared "Unknown" profile**~~ — done 2026-11-10 (Kyle): 4 "Unknown" profiles removed, their 104 dual bouts kept with no profile on that side.
- **Out-of-state school names** read like bracket text: "Delcastle H S", "Laurel H S", "Palisades Hs", and others. Tidy schools.display_name for is_nj = false schools.
- ~~**`lb_gp_team_points`**~~ — resolved: the 2026-11-03 migration dropped the extra copy; the call works (checked 2026-11-10).
- ~~**Girls District 9 2025-26, Jackson Township**~~ — already 223 in the database (checked 2026-11-10; Kyle confirmed 223). Was: stored official total 257.5; source_of_truth_team_scores.csv has "Jackson Township H.S." 223. Check the official sheet.
- ~~**Girls tournaments have no team results**~~ — resolved 2026-11-09: the tables' boys-only foreign key had refused every girls row (`20261109_tournament_team_scores_both_genders.sql`); standings loaded for 21 of 41. The rest have no standings in the files: `docs/reviews/tournaments_without_team_standings.md`.
- ~~**Profile name split:**~~ — resolved: the profile reads William Jayden / Ratz (checked 2026-11-10).
