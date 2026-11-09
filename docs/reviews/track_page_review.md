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

## 2. Ella Magee vs Ella Magee

2026 SJWHOF Girls Varsity (2026-01-04), 107, placement round, result NC: the source lists the
same wrestler on both sides. Not rated (NC). Decision: delete the bout (needs approval with
the row backed up), or leave it.

## 3. One person or two? (no evidence either way yet)

| Wrestler | Records | Question |
|---|---|---|
| Finley Pazinko | Jackson Township 2025-26; Jackson Liberty 2024-25 (4 weight classes apart) | Transfer who grew, or two people? |
| Jake Valeri | Red Bank Catholic 2025-26; Point Pleasant Beach 2024-25 (5 classes apart) | Same |
| Aidan Thompson | Immaculata 2025-26; Hunterdon Central 2024-25 (5 classes apart) | Same |
| Ashley Coronel (girls) | Paterson Eastside 16 bouts; 1 bout for Newark East Side, same season | Bout credited to the wrong school, or another girl? |
| Antonio Cruz | Newark East Side 2025-26; 1 Cedar Creek bout in 2024-25 (his Plainfield bouts were split off 2026-11-02) | Same person? |

## 4. Other open items

- ~~8 girls whose 2025-26 postseason entries have no school~~ — resolved 2026-11-02: bracket filler names, not wrestlers (only forfeit losses, no duals). Removed with 11 other filler entries (`20261102_remove_placeholder_entries.sql`).

- About 100 2025-26 falls recorded under 10 seconds (88 boys duals, 12 boys tournaments) — possible typos; they top the Quickest Deck boards.
- 229 boys / 42 girls duals where the final score differs from the bout points, mostly by 1 point (likely team deductions; not verified).
- Duplicate school records for one school: "Blair Academy" / "Blair Academy (B Team)", "Hodgson" / "Hodgson Vo Tech School".

## 5. Before the 2026-27 season (pinned 2026-11-02)

- **Nightly jobs have never run.** CRON_SECRET isn't set in Vercel, so the 4 crons (ratings 06:00/06:30 UTC, leaderboards 07:00/07:15 UTC) get a 401 every night. Off-season that costs nothing. Before the first bouts: set CRON_SECRET in Vercel (Production), add a skip when no bouts were added since the last run, and confirm one night's run in `admin_activity_log` (entries by 'cron').
- ~~**Girls Region 1, 2025-26:** no finals or 3rd-place bouts on file~~ — the bouts were loaded 2026-11-02 from the bracket PDFs (this note was never updated). The `placements` rows were still missing: `20261109_girls_region1_placements.sql`.

## 6. Follow-ups from the 2026-11-02 logo / no-raw-text work

- **Shared "Unknown" profile:** bout sides the source didn't name are linked to one boys profile named "Unknown", aliased at 30+ schools, so it collects bouts from many different people. Better: those sides get no profile (pages already show "Unknown").
- **Out-of-state school names** read like bracket text: "Delcastle H S", "Laurel H S", "Palisades Hs", and others. Tidy schools.display_name for is_nj = false schools.
- **`lb_gp_team_points`** exists twice (p_season smallint and integer), so every call fails ("could not choose the best candidate"). The girls state page no longer uses it; drop one copy.
- **Girls District 9 2025-26, Jackson Township:** stored official total 257.5; source_of_truth_team_scores.csv has "Jackson Township H.S." 223. Check the official sheet.
- **Girls tournaments have no team results:** none of the 41 girls in-season tournaments has a 1st-place team on file, so the tournament list's Winner column is empty.
- **Profile name split:** William "Jayden Ratz" (first name William, last name "Jayden Ratz"), probably first "William Jayden" or last "Ratz".
