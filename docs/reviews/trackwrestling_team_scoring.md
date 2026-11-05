# TrackWrestling postseason team scoring (boys), proven 2026-11-05

A wrestler's team points = advancement + bonus + placement. A school's total = the sum of its wrestlers' points, minus any deductions.

## Rules
- **Advancement:**
  - 2 for each championship-bracket win; 1 for each consolation win.
  - **None for a placement match** (1st, 3rd, 5th, 7th): the placement points cover it.
- **Byes:** 2 each (championship) **only if the wrestler wins his next contested match**.
  - A forfeit over a **filler entry** ("Forfeit", "B Forfeit") counts as contested.
  - A forfeit over an **empty slot** ("over ()") does not.
- **Bonus:**
  - fall, forfeit, injury default, DQ: 2
  - tech fall: 1.5 (TrackWrestling's "tech. fall … (TF-1 …)" wording: 1)
  - major decision: 1
  - decision / sudden victory / tiebreakers: 0
  - A forfeit win, including over a filler entry or an empty slot, gets the 2.
- **Placement:**
  - Districts: 14 / 10 / 7 / 4 (1st–4th)
  - Regions: 16 / 12 / 9 / 7 / 5 / 3 (1st–6th). The commonly quoted 14/10/7/4 is wrong for regions.
  - State: 16 / 12 / 9 / 7 / 5 / 3 / 2 / 1 (1st–8th)
- **Deductions:** −1 per unsportsmanlike call. These appear only in the official team total.

## Proof
- **Per wrestler**, against the "scored X team points" lines in `../Match Data/2026 District Match Data.py` (Districts 1–18, 2025-26), scored from that file: **2,135 / 2,135**.
- **Per school**, the rules applied to stored bouts (`scripts/check_team_scoring_rules.mts`) against official totals:

| Season | State | Regions | Districts |
|---|---|---|---|
| 2025-26 | 162 / 162 | 273 / 273 | 273 / 310 |
| 2024-25 | 167 / 167 | 240 / 275 | 272 / 314 |

## District and 2024-25 region misses are stored-data gaps, not rules
On stored bouts, 1,979 / 1,994 wrestlers match per wrestler (D1–18, 2025-26). The 15 misses:
- **Placement-match forfeits (6):** the bout has no loser and there is no placement row, so the 4th-place points are missing.
- **"Tech. fall" (5):** the wording isn't stored; every tech fall is TF-1.5.
- **Empty-slot forfeits (2, Wright and Grant):** stored the same as filler forfeits (FORF, no opponent) since the 2026-11-02 filler cleanup.
- **2 more:** not traced.

The school-level −1s are deductions. The 2024-25 region misses are large (up to 76) and fit the known missing 2024-25 region bouts (3rd/5th-place matches absent in R2 and R7); not checked one by one.
