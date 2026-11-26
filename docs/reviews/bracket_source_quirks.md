# Bracket source quirks (postseason) — what the parsers must expect

Built 2026-11-25 from the 2013–2024 History CSVs (461 files, ~110k bout rows), the 2024-25 / 2025-26 GT round-results
text (`Whizzer Upload/GT`), and the 2025-26 TrackWrestling bracket PDFs. Purpose: the 2026-27 postseason importer
stores each bracket's **draw** (`tournament_entries.bracket_position`), not only its bouts.

## 1. Where the draw can come from

| Source | Keeps the draw? | Notes |
|---|---|---|
| TrackWrestling **CSV export** (History folder) | **No** | Row order is not bracket order: QF rows line up with the SF pairings in ~1/3 of brackets (random). Never read a draw from a CSV. |
| TrackWrestling **round-results text** (GT files) | Yes, to the first-round pair | Round 1 lines are in bracket order, byes included ("received a bye"). Which line of a pair a bye wrestler sits on is not stated. |
| TrackWrestling **bracket PDF** | Yes, exact lines | Two layouts (below). Byes and placeholders hold their lines. |
| FloWrestling state bracket PDF | Yes (state) | One per year in History/<year>/ — reader not built yet. |

Check every draw against the stored bouts: each championship bout's two wrestlers must sit where the draw makes them
meet. A misread file shows up as bouts that don't fit (2025-26: one skipped line shifted every pair after it).

## 2. Round-results text (GT)

- Section headers vary: `Champ. Round 1 (16 Man)`, `Round 1 (32 Man)`, `Champ Round 1 (32 Man)`, `Champ. Round 1`, `Preliminaries`.
- Result wording varies: `won by fall/decision/major decision/tech fall/forfeit over`, `won in the ultimate tie breaker over`, `won in tie breaker - 1 over`, `won in sudden victory - 1 over` → match `won .*? over`.
- A person is `Name (School) W-L`. The school is the **last balanced** parenthesized group before the record: `West Morris ( Mendham)`, `St Joseph (Montvale) HS`. A nickname stays in the name: `Charles (CJ) Palmisano (Whippany Park)`.
- Byes: `X (School) W-L received a bye () (Bye)`; empty pairs `() received a bye`; placeholders `Forfeit Forfeit (School) 0-2`, `A Forfeit ()`, `Forefit A ()`, `A Foreit ()`, `Bye Bye () 0-1`, names with an empty school `Daniel Hughes ()` (never wrestled).
- District headers can stop: 2024-25 lost `District N` after District 20 (Districts 20–32 run together). 2025-26 boys districts: mostly per-school results; round-by-round order for only 14 districts. Identify a block's district by its wrestlers' names.
- 2025-26 girls regions: Round 1 lists only real bouts (no byes); the quarterfinals are in bracket order, and some sections repeat (dedupe).

## 3. Bracket PDFs (TrackWrestling)

- Region layout: `First Last` over `School, W-L, Gr`.
- District layout: `First, Last` over `W-L, School, Yr`; placeholder `Forfeit, Forfeit` / ` , Forfeit` over `0-1, , `.
- Text can be overprinted (`Bye` on top of a name) → build lines from characters grouped by height, not words.
- Grades can be garbled (`28-7, &n`). Names are cut short (`Christophe Montana`, `Rodriguez-Casta`, `Mickhorlsk Odige`).
- Co-ops print differently from our names (`West Morris (Mendham` vs Mendham, `Hamilton East-Steinert` vs Steinert).
- Bout-number links sit just right of the names (x ≈ 0.34 W): keep the name column to x < 0.33 W.

## 4. CSV exports (2013–2024) — useful for names/results, not the draw

- ~50 round names for the same rounds: `Champ. Round 1`, `Round 1`, `Preliminaries`, `Prelims`, `Preliminary Round `, `Perlim Round 1`, `Pre-Quaterfinals`, `Pre-Quarterfinals`, `Quarters`, `Quarterfinal(s)`, `Quarter-Finals`, `Semis`, `Semifinal`, `Semis-Finals`, `Champ Semis`, `Finals`, `First Place`, `Championship`, `Championship Finals`, `1st Place Match`, `Cons. Round N`, `Consolation. Round 1`, `Wrestleback N`, `Cons. Semi(s)`, `Consolation. Semis`, `Cons. Finals`, `Consolations`, `Conso/Final Medal Matches`, `Placement`, `Placement Matches`, `3rd Place (Match)`, `5th Place (Match)`, `7th Place Match`, and blank (2024).
- Win types: BYE, F, DEC, MD, FOR, TF, DEF, M FOR, DQ, NC, MFFL, OTHER1.
- Result shapes: `W-L`, `W-L m:ss`, `W-L SV`, `W-L UTB`, `W-L TB1`, combinations, and `0-0 m:ss` for falls.
- Placeholders: `Forfeit Forfeit`, `A Forfeit`, `Joe Forfeit`, `forfeit o`, `F. Forfeit`, `Forfeit A`, `Bye Bye`.
- Names: backtick for apostrophe (`O`Rourke`, `D`Ambrosio`), suffix after a comma (`Smith, Jr.`), initials (`J.R.`), nicknames in parentheses.
- Teams with `/` (co-ops) and parentheses (`Eastside (Paterson)`, `BCIT(Westampton)`).
- Weight classes changed: 145/152/160/170/182/195/220 before 144/150/157/165/175/190/215.
- One-off events: 2021 (COVID) `NJSIAA Region - North N`, `Central Region`, `Region - South`, `@Union HS - April`; 2023 `Region N @ Union HS Feb`; 2013 District 24 in its own folder.

## 5. Committee seeding (why seeds can't place a bracket)

District/region brackets are set by committee: a district champ can be seeded below a runner-up, region district
champs get byes but the byes aren't even, and placement follows the committee's sheet (Kyle 2026-11-25). Example:
2025-26 Region 1 106 — byes to three district champs plus D3's 2nd and 3rd (D3's champ not entered); Malfitano
(D3-3) on line 1. Seeds are shown information only; the draw comes from the bracket.

## 6. FloWrestling (the 2026-27 NJSIAA format) — rehearsal results 2026-11-25

NJSIAA's postseason is on FloWrestling for 2026-27; the History/2013–2024 Flo PDFs + CSVs are that format. One PDF per
tournament holds every weight (district: 1 page per weight; region: 2 — championship, then wrestlebacks/placements;
state: 4). A weight's first page holds the first round: boxes of `seed Name (CODE)` or `BYE`, top to bottom.

**Rehearsal (draw from the PDF, results from the CSV, every championship bout must fit the draw):**
state 2013–2024 4,534/4,534 · Region 7 2024 230/230 · District 24 2013 134/134 · Union County 2025 131/131 ·
Somerset County 2025 140/140 · Shore Conference 2025 207/207. Every consolation bout's wrestlers are on the draw.

**PDF quirks**
- Seed glued to the name (`1Killian Coluccio`) and the seed's digits printed a hair above the name → group characters into rows with a 2.5pt tolerance.
- Withdrawn seed: `1 Forfeit` (no school) holds an empty line. Placeholders: `BYE`, `Forfeit`.
- A long name pushes the closing parenthesis off the column: `Michael VanderMeulen (JETW`; with a nickname: `Richard John (RJ) Hunnewell (`.
- Header: `Page 1 of N` + event + weight at top right; 2013 has no page numbers (event + weight at top left).
- Weight label: `106`, or `106 lbs - Default Pool` / `106 lbs - Pool A` (in-season).
- State pages are crowded: the first column sits within ~80pt of the second — split rows at wide gaps.
- **School codes, not names** (`CBA`, `SENE`, `SJMH`, `JALI`, `Delb`, `Colt`, `STMARY`): Kyle provides the code → school list before the season. Needed for **two wrestlers with the same name at one weight** (2014 state 120: Michael Russo, Jackson Liberty and St. Peter's Prep).

**CSV quirks**
- Round names can be **blank for a whole event** (2024 Region 7: all 273). With the draw loaded, a blank or wrong label doesn't matter: two wrestlers meet on the championship side at exactly one round, which the lines give.
- 2013–2016 state: bye rows with a blank round.
- In-season round names: `Round of 32`, `Round of 16`, `Quarter-Finals`, `Semi-Finals`, `Finals`, `Consi of 4`, `Consi-Semis`.

**Pool-play events (in-season, e.g. Burlington County):** each weight has round-robin pools (`Pool A`–`D`, pages without
page numbers) and one or more brackets (`Default Pool`, or a pool's own bracket with `Page 1 of 2`), each with its own
`Finals`. A weight is several brackets: key draws by (weight, pool) and place each bout in the pool whose draw holds
both wrestlers. Not built yet.
