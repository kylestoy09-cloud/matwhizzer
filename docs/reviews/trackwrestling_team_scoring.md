# TrackWrestling postseason team scoring (boys), proven 2026-11-05

A wrestler's team points = advancement + bonus + placement. A school's total = the sum of its wrestlers' points, minus any deductions.

## Rules
- **Advancement:**
  - 2 for each championship-bracket win; 1 for each consolation win.
  - **None for a placement match** (1st, 3rd, 5th, 7th): the placement points cover it.
- **Byes:** 2 each (championship) **only if the wrestler wins his next contested match**. This includes a bye in the middle of the bracket (a round skipped after his first bout), credited if he wins the bout after it. Proven 2026-11-05 by the only two cases in either season: Phillipsburg's Gonzalez and Garriques, District 1 2024-25. Migration `20261105_tw_scoring_midbracket_bye.sql`. A bye listed against a placeholder opponent ("received a bye Bye Bye () 0-1") earns nothing itself, but counts as a won round when crediting the bye before it. It is credited like any bye if he wins the bout after it. Proven 2026-11-06 by all 11 cases (Dennis Serra, Lower Cape May, District 29 2024-25). Migration `20261106_tw_placeholder_byes.sql`; the byes are kept in `tw_placeholder_byes`, read only by the scoring rules.
  - A forfeit over a **filler entry** ("Forfeit", "B Forfeit") counts as contested.
  - A forfeit over an **empty slot** ("over ()") does not.
- **Bonus:**
  - fall, forfeit, injury default, DQ: 2
  - tech fall: 1.5. Every tech fall is worth the same (Kyle).
  - 5 bouts in 2025-26 Districts 1–18 read "tech. fall … (TF-1 …)" and TrackWrestling counted them at 1: **TrackWrestling errors**. Riotto, Perrota (D7 113), Delacruz (D14 150), Romaniello (D14 175), Pincus (D16). They stay TF-1.5 here, so our calculated totals run 0.5 above TrackWrestling's for those wrestlers and schools; the official copied totals are unchanged.
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
- **TrackWrestling's TF-1 errors (5):** see Rules; not a data gap.
- **Empty-slot forfeits (2, Wright and Grant):** stored the same as filler forfeits (FORF, no opponent) since the 2026-11-02 filler cleanup.
- **2 more:** not traced.

The school-level −1s are deductions. The 2024-25 region misses are large (up to 76) and fit the known missing 2024-25 region bouts (3rd/5th-place matches absent in R2 and R7); not checked one by one.

# Girls (2025-26), worked out 2026-11-09

How TrackWrestling scored the 2025-26 girls postseason, from the official team totals
(`precomputed_team_scores`) and, for the regions, one school's per-wrestler points (Jackson Township,
Region 3, from Kyle). Checked with `scripts/check_girls_team_scoring.mts` after the brackets were completed
against the exports (`scripts/compare_girls_bracket_counts.mts`, the 2026-11-09 migrations).

| Level | Rules | Schools exact |
|---|---|---|
| **State** | The boys state rules: advancement 2 / 1, byes 2 if the next contested bout is won, places 16/12/9/7/5/3/2/1 | 117 / 117 |
| **Districts** | The boys rules, with two differences: byes count from Round 1 of the 32-man bracket (Round 1 is all byes and isn't stored), and places are 16/12/9/7/5/3 | 227 / 234 |
| **Regions** | **Different:** 1 point for each championship win from the quarterfinal on (a Round 1 win earns nothing); no consolation advancement; no bye points; places 18/14/11/9/6/4 | 190 / 191 |

- **Bonus everywhere:** as the boys (fall, forfeit, injury default, DQ 2; tech fall 1.5; major 1). An overtime bout that ends by a fall ("won in SV-1 by fall") is a fall.
- **Forfeits with no loser:** `forfeit_opponent` 'filler' (over an entry such as "A Forfeit") counts as contested for bye points; 'empty' ("over ()") does not. Marked for the girls districts 2026-11-09.
- **Double forfeit in a place bout** ("Genesis Cruz and Celeste Falkovich (DFF)", Region 2, 152, 5th place): no bout is stored, and both wrestlers get the lower place's points (6th, 4). Metuchen and Woodbridge.
- **Regions proof, per wrestler (Jackson Township, Region 3):** all 9 match: Bonilla 26, Briana Dugo 26, Rucci 25.5, Donato 20, Ariana Dugo 19, Tandari 17, Thorne 8, Feraria 2, Curatola 0. For example Bonilla: falls 2+2+2, QF and SF wins 1+1, 1st 18 = 26.
- **Not explained:**
  - **Districts:** North Brunswick −2, Red Bank Regional −1 and Freehold Township −2 (official lower: likely unlisted team deductions); Raritan, Howell, Hamilton West and Cherry Hill +1 each.
  - **Regions:** Delran +1.
