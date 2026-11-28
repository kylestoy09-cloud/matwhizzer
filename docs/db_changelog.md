# MatWhizzer Database Changelog

---

## 2026-11-21 — Bracket seeds; tighter bracket format; Powerade school fixes

- Kyle: "can we also seed them?" Brackets read seeds from `in_season_tournament_seeds[_girls]` (src/lib/tournamentBrackets.ts) and show them before the name (live and the Aesthetic tool's format). Seeds from the FloWrestling bracket PDFs (`scripts/flo_pdf_rounds.py`, `--seeds-only` for a CSV that has its rounds → `data/history/seeds/<file>`); the history import writes them (a seed already on file stays): Powerade 2025-26 336, Iron Man 2025-26 463.
- Two wrong schools found while loading seeds, fixed with the rules behind them: (1) a state-tagged team ("Franklin-MA") must not take the year's plain-name school (the importer's first-import lookup now skips tagged names) — two Franklin (MA) seeds re-pointed to their profiles; their stray profiles' name links removed (2 profiles left with no records). (2) a state-tagged team took any same-name school on file ("St. Francis-NY" → St. Francis (CA)): importer and dry run now take only a school of that state (or one with no state in its name). Its 35 Powerade bouts (34 + 1 from the first import), 2 placements, 8 seeds and 8 name links → new St. Francis (NY) #1267 (`scripts/fix_powerade_st_francis_ny_20261121.mts`, backups `docs/migrations/backups/20261121_powerade_st_francis_ny*.json`).
- Aesthetic tool bracket format: packed from the first round up (byes leave no gaps), its own first-round line height.

## 2026-11-21 — Iron Man 2025-26 full bracket; history import: teams named like NJ schools at events outside NJ

- Iron Man's 2025 FloWrestling export has no round names. `scripts/flo_pdf_rounds.py` reads them from the bracket PDF (each bout box's number and its two wrestlers → the CSV bout; championship rounds = the PDF's columns, the final on its own page; consolation rounds from each wrestler's path; 3rd/5th/7th from the placement page) into `data/history/rounds/2025Ironman.csv` — all 1,572 bouts (men's and women's), placements checked against the PDF. The history import and dry run read that copy in place of the original.
- Iron Man 2025-26 loaded (`--only=ironman --season=2025-26`): +760 bouts (832), 90 placements (102 of 112); 116 bouts wait on teams in the review, 16 on NJ wrestlers. New out-of-state schools: Marmion Academy (IL), Massillon Perry (OH).
- Kyle's events outside NJ hold teams named like NJ schools (Iron Man's Westfield = Indiana, Edison / Columbia / Highland / Clay = Ohio). History import + dry run: at Powerade and Iron Man an untagged team counts as the NJ school only when two of its wrestlers there (one, if it brought one or two) are on file at that school; else it goes to the review for that tournament only ("westfield @ iron man tournament", 10 items, each with a guess — `data/history/team_guesses.json`). A year already on file takes each team's school from its first (reviewed) import. Iron Man no longer defaults unknown teams to Ohio (it draws Illinois, Indiana …): those wait in the review (≈120 more teams, with search buttons). Beast of the East and the ECCC keep the name rule (they're full of NJ teams).

## 2026-11-21 — Every bout stored; Powerade 2025-26 full bracket

- Kyle: "let's start storing all bout info moving forward and let's go back and get the bracket info for the brackets we have … attack the easier tournaments first". The RTF import (`/api/admin/rtf/match` + `/import`) dropped bouts between two out-of-state wrestlers whenever an NJ school was in the event; it now keeps every bout. (The CSV import already did.) Saved import texts (`rtf_import_drafts`) were checked against what's stored: the filter cost NJ tournaments only a few bouts (Sam Cali 3); the out-of-state events' gap is their source — NJ teams' results only.
- Powerade 2025-26 filled from the FloWrestling file (`scripts/import_tournament_history_20261120.mts --only=powerade --season=2025-26`, new `--season` option): +1,055 bouts (1,174 total), 104 placements (8 a weight); 59 bouts wait on the history review. A first run failed on `source_format 'flo_csv'` (not allowed; the importer writes 'csv' now) after creating 403 profiles; the rerun reused them by name (`--reuse=`), leaving 2 with no records.
- "Franklin Regional" (PA) was taken as NJ Franklin: the school matcher drops "Regional", and the history import took that "exact" match as NJ. Fixed: `scripts/_literalNj.mts` — an NJ match counts only when the printed name is the school's own name or alias, else two of the team's wrestlers must already be on file there (importer + dry run). Data: its 41 bouts, 1 placement and name links → Franklin (PA) #1199 (alias "Franklin Regional" added), its 12 new profiles is_oos; the 3 already on file there (Firestine, Montgomery, T. Colangelo) kept, the run's doubles' 10 bouts re-pointed to them (`scripts/fix_powerade_franklin_regional_20261121.mts` — its backup was overwritten empty by a rerun; values were all school 169 → 1199 — and `…_b_20261121.mts`, backup `docs/migrations/backups/20261121_powerade_franklin_regional_b.json`). Alias "Homewood Flossmoor" moved from the run's new Homewood Flossmoor (IL) #1262 to Homewood-Flossmoor (IL) #765; #1262 has no records — deleted with Kyle's OK 2026-11-21, with the 5 empty profiles (2 from the failed run, 3 doubles) (`scripts/delete_empty_records_20261121.mts`, references counted first; backup `docs/migrations/backups/20261121_empty_records.json`).

## 2026-11-21 — 2026 NCAA Women's Championships loaded

- Kyle: "we also need to import the 2026 ncaa girls tournament". Source: NCAA Tournament/Womens/NCAA/ (FloWrestling CSV + bracket PDF; moved into an NCAA folder like the other levels). The CSV names only the prelims' rounds, so `scripts/build_ncaa_women_2026_transcript.py` rebuilds every round — championship side from the PDF's bracket slots, wrestlebacks from each wrestler's path, a pair who met twice tried both ways — into `data/ncaa/transcripts/women/NCAA/2026.txt` (all 340 bouts, 80 places, bracket-path check clean). Colleges: Bridgeport (CT) and Illinois Wesleyan (IL) added; printed spellings for Delaware State, Elmira, Frostburg State, Marymount, Northern Michigan, William Jewell (`scripts/add_ncaa_women_2026_colleges_20261121.mts`). Loaded with `scripts/load_ncaa_transcripts.mts NCAA --girls --apply`: 180 entrants, 340 bouts, 11 NJSIAA wrestlers matched automatically, 0 to review. College weight audit: nothing flagged. Admin Progress grid: `src/lib/ncaa/sourceYears.ts` regenerated (girls NCAA 2026).

## 2026-11-21 — Out-of-state tournament team scores credited to NJ schools; history podiums

- Kyle: "last year's powerade has two franklins and williamstown listed as nj schools … none of them are nj schools. how were these matches confirmed?" They weren't: the team-score paste matched each printed team to a school by name alone. 11 boys team scores at out-of-state tournaments (2025-26) re-pointed, each checked against the tournament's bouts / the files / a lookup (`scripts/fix_oos_team_scores_20261120.mts`, backup `docs/migrations/backups/20261120_oos_team_scores.json`): Powerade Franklin Regional → Franklin (PA) #1199 (where its bouts already were), Franklin → Franklin (MA), Williamstown → Williamstown (WV); Iron Man Warren Township (IL), Westfield (IN), Edison → Milan Edison (OH), Highland (OH), Columbia (OH); Beast Ridgefield Memorial → Ridgefield (CT); ECCC Notre Dame → Notre Dame (CT); Bethlehem Delaware Valley → Delaware Valley (PA). New out-of-state schools: Franklin (MA), Warren Township (IL), Westfield (IN), Milan Edison (OH), Highland (OH), Columbia (OH); Franklin Regional (PA) #1248 was created and then left unused (0 references); deleted with Kyle's OK 2026-11-21 (backup `docs/migrations/backups/20261121_school_1248_franklin_regional_pa.json`). Girls: Ralph Wetzel Classic "Overbrook HS" → Overbrook (NJ) is left for Kyle.
- Root cause fixed: `/api/admin/parse-team-scores` now takes a printed name's school from the tournament's own bouts, and at an out-of-state tournament an NJ school with none of its wrestlers in the bouts is only offered (amber), not chosen. New integrity rule: "NJ school team score at an out-of-state tournament with none of its wrestlers in the bouts".
- Tournament history import: an edition already on file now gets the placements it's missing (Powerade 2025-26 had only its 16 NJ placers); the high school bracket in files that mix youth / junior high brackets in (Powerade 2015–2017) is traced back from its final (`scripts/_largestBracket.mts`), as a name in two brackets joined them; a place two matches claim is left out and reported. Public history page: All / NJSIAA only toggle.

## 2026-11-20 — Tournament history review: school guesses

- Kyle: "have you run these schools against the schools we have in the system? … should have a bunch of aliases to match automatically" / "you should at least give me a match guess." The dry run took a school only on an exact name / alias; the matcher often has the school as a close alternate ("Bullis" → Bullis Prep (MD) 0.90). `scripts/_schoolAlternate.mts`: the matcher's alternate is taken automatically when it scores ≥ 0.85, beats the next by 0.15+ and one name holds the other's words; a weaker, untied one is a suggestion. Claude's own guesses for the rest (`data/history/team_guesses.json`: an existing NJ school — St. Joseph Regional → St. Joseph (Montvale), Old Tappan, Passaic Tech, St. Mary (Rutherford)… — or a state for a new out-of-state school, the less-sure ones marked). Review: the guess is a one-click button (amber = less sure), "Accept all school suggestions"; a decision can now be any existing school (`{ schoolId }`). Teams to place: 132, all but a few with a guess.

## 2026-11-20 — Tournament history: the name matcher checks years

- Kyle: "what's the pool you are using to compare names" — every profile on record at the same NJ school (postseason entries, in-season bouts, dual meets), any year: a 2015 name could be offered a 2024 wrestler. `scripts/_wrestlerSeasons.mts`: a profile's seasons on record; a candidate more than 4 seasons from the bout is not him. Review: each candidate shows its years ("Same as Ronny Crane (2016–2019)"), the bout's season is in bold; 164 out-of-range candidates dropped, 15 wrestlers left with none became new and left the review (452 wrestlers, 166 teams). Import: an exact / strong name match outside the 4 seasons is a different wrestler (a father and son of one name).

## 2026-11-20 — Tournament history: importer (dry run) and the public History page (code only)

- `scripts/import_tournament_history_20261120.mts` (dry run unless --apply): the FloWrestling CSVs → past editions (linked by prior_id), bouts (rounds from `src/lib/historyRounds.ts`; "Championship Round 1" is no longer read as the final), placements from the placement matches; schools / wrestlers as the dry run decided plus Kyle's review (`history_import_review`); bouts whose team or NJ wrestler is still waiting are held back. Powerade 2015–2017 mix youth brackets into the event (38 "weights", 2–3 finals per high school weight): it keeps the series' high school weights and each weight's largest bracket. An edition already on file only gets bouts it doesn't have (matched by both wrestlers, or one wrestler and the other's printed name). Dry run with the review open: 48 new editions, ~35,000 bouts, ~10,000 held back.
- Public `/tournaments/[id]/history` (linked from a tournament page's year buttons): a year's podium by weight (with its results and bracket), multi-time champions, multi-time placers, most consolation wins career and in one year (`src/lib/tournamentSeriesHistory.ts`; years through prior_id both ways plus the same name).

## 2026-11-20 — Tournament history review moves into the Hub's History tab

- **Schema: `docs/migrations/20261120_history_import_review.sql`** (Kyle runs it): `history_import_review` — the teams and NJ wrestlers the history import couldn't settle, with Kyle's decisions (team → NJ school or a state; wrestler → a profile or new). Written by the dry run (items refreshed, decisions kept); read by the import.
- Kyle: "put these reviews in the history tab so that i can match with a school, same with the wrestlers. make it easier." Tournament Hub → History → Review: teams with an NJ school search, the guessed school, the states the files tagged, and a state picker; wrestlers with the candidate profiles as buttons (each links to the profile) and New wrestler, the suggestion marked, "Accept all suggestions". Replaces the review CSVs (none had been filled in).

## 2026-11-20 — Tournament history: East Coast Catholic Classic, Robin Leff, Sam Cali files added (code + review sheets)

- Kyle added History/East Coast Catholic Classic (CSVs 2022–2025), Robin Leff (CSVs 2012–2024; the two 2012 files are identical — duplicates are skipped by content), Sam Cali (CSVs 2018–2025). Inventory rerun (131 tournament-seasons with files); the Hub History grid shows them. Dry run: 1,351 team names (NJ 234, out-of-state on file 374, to create 577, unclear 166), 3,889 NJ wrestlers, 12,536 out-of-state.
- Review sheets part 2 (the first sheets left as they are): `docs/reviews/tournament_history_review_teams_part2.csv` (39 teams), `..._nj_wrestlers_part2.csv` (346 wrestlers, 298 prefilled — nickname, spelling, close spelling ≤ 2 letters with the same initials → same; a different first name with the same last name → new — 48 left).

## 2026-11-20 — Tournament Hub: History tab (what's loaded for every past year) (code only)

- Kyle: a History tab on the admin Tournament Hub "similar to the college spreadsheet" for the tournaments getting the history treatment — boys Iron Man, Beast of the East, Powerade, Escape the Rock, East Coast Catholic Classic, Sam Cali, Robin Leff, Morris / Burlington / Essex / Somerset County, Shore Conference, Hunterdon/Warren/Sussex, CVC (`src/lib/tournamentHistorySeries.ts`; the girls side lists its own). Per season: P podium, B bouts (bouts from 2012-13 on; placements only before). ✓ in the system, yellow a file we can parse (with how deep its podium goes), orange a file we can't (a scan), red nothing yet, grey bouts before 2012-13. Out-of-state tournaments loaded from NJ teams' results show "NJ".
- What's in the History folder comes from `scripts/build_tournament_history_sources.py` → `src/lib/tournamentHistorySources.ts` (rerun after adding files): 105 tournament-seasons with files — Powerade 1967-68 → 2025-26 (finals only from the "History-by-Year" PDF before 2000), Beast of the East 1993-94 → 2025-26 (the 1993-94 edition was the "Delaware Mid Atlantic Classic"; "10th.pdf" = 2002-03, a scan), Iron Man 2012-13 → 2025-26; girls Beast of the East 2022-23 → 2024-25, Women of Ironman 2024-25 → 2025-26. Found: Burlington County 2025-26 has bouts but no placements.

## 2026-11-20 — Tournament brackets built from the bouts (code only)

- Kyle: "we have tbd as if the tournament didn't happen yet … we should have access to brackets from year to year." The bracket page read `tournament_bracket_slots`, filled for one tournament (Sam Cali 2025-26) and half-way (13 of 14 finals empty → "TBD"). It now builds every tournament's bracket from its bouts (`src/lib/boutBracket.ts`, `src/components/bracket/BoutBracket.tsx`): the championship side as a tree hung from the final (each wrestler's previous championship bout under them, any size, byes as gaps), the consolation rounds in order, championship bouts the tree can't reach listed under "Other bouts"; names from profiles, schools from school records. "View Bracket" shows for any tournament with championship bouts. Out-of-state tournaments hold only NJ wrestlers' bouts, so their brackets say "Partial bracket". Checked on 2025-26: Sam Cali, Beast of the East, Hunterdon Central, Battle at the Brook build full trees.

## 2026-11-20 — Tournament pages: non-NJSIAA teams minimized; Tournaments list shows the top NJ team (code only)

- Kyle: "minimize non-njsiaa teams and give the option to expand … sam cali and a school from ct is the best nj school on the leaderboard." Team Scores shows NJSIAA teams by default with their official places (Sam Cali: Greens Farms Academy (CT) won; Paramus Catholic shows as 2nd), "Show N non-NJSIAA teams" brings the full official standings back; the school list's Non-NJSIAA section is collapsed behind the same toggle. The Tournaments list's "Winner" column is now "Top NJ Team" (the best-placed NJSIAA school). Site snapshot re-baselined.
- Found for the next step: bracket data exists for one tournament only (Sam Cali 2025-26), half-filled (262 of 518 slots with an empty side, 13 of 14 finals) — hence "TBD" on a finished tournament.

## 2026-11-20 — srobs's Stream Account microchecks released back to the pool

- **Data only.** Kyle: "srobs did a bunch of microchecks yesterday sorting streaming sites. all of them were wrong. can you reverse them and release them back into the pool." `scripts/release_srobs_stream_checks_20261120.mts --apply` (backup `docs/migrations/backups/20261120_srobs_stream_checks.json`): the 39 boys streaming picks by srobsmail@yahoo.com on 2026-11-19 (NFHS 21, Both 12, Hudl 4, Neither 2) cleared — those schools show both links again — and his 39 matching `microcheck_task_log` entries removed, so the Stream Account check deals those schools again. No girls picks. The other 9 picks on file (three other people, 2026-11-19) untouched.

## 2026-11-20 — Review of the edge / weight / buckets projection work (no changes needed)

- The tracker's own edge and weight for every 2025-26 bout (simulated, writes intercepted) match what the two migrations filled in: 0 differences of 61,883 boys / 18,308 girls; no bout would be frozen a toss-up. A dual's edge side is the home team: wrestler B's school is team 2 (the match card's Home) in 3,000 of 3,000 sampled bouts per side. Head-to-head answers with any `weight` (285, 106, junk) and the edge / seed parameters (HTTP 200; no effect while the weight levers are off). Weight snapping: 286 → 285, 105 → 106, 160 → 150–157; girls 99 → 100, 236 → 235. Version 1 differs from the original formula only where two WRRs are exactly equal (the 2026-11-20 fix). Active: Version 4 both sides; finish-or-decision and weight levers off.

## 2026-11-20 — Weight groups: tracked bouts carry their weight; two test levers; by-weight table

- **Schema: `docs/migrations/20261120_match_projections_weight.sql`** (Kyle runs it): `match_projections.weight_class`, filled from the source bouts; new bouts get it from the tracker. `src/lib/weightGroups.ts`: boys groups (Kyle) 106 | 113–120 | 126–132 | 138–144 | 150–157 | 165–175 | 190–215 | 285; girls (mirroring) 100 | 107–114 | 120–126 | 132–138 | 145–152 | 165–185 | 235. 2025-26: who wins is flat across weights (boys ~80%, girls 74.7–77.9%); how bouts end isn't — boys techs 17% at 106 → 3% at 285, 285 the most decisions (19%) and OT (3%); girls pins 80% → 89%. Head-to-head takes `?weight=` (the match card sends it).
- Lever Lab "Weight groups" (off): each group's finish mix nudges the odds; a winner's pin / tech record blended with the group's. Held out on 2025-26 (`scripts/projection_weight_test_20261120.mts`) it barely moves anything — boys finish-or-decision 78.7% either way; exact type +0.8 only by calling fewer techs (5.9% → 2.9% of picks); girls unchanged. Recommended off. Projection Accuracy gains a by-weight-group table.

## 2026-11-20 — Tracked bouts carry who gets a dead-even projection

- **Schema: `docs/migrations/20261120_match_projections_edge.sql`** (Kyle runs it). `match_projections.edge` ('a' / 'b'): the side that gets a dead-even projection, by the site's rules — a dual's home slot (team 2), the postseason's lower seed (unseeded lowest), an in-season tournament's second-listed wrestler. Filled for the bouts on file; new bouts get it from `src/lib/projectionTrack.ts`, which now also projects them with it (no frozen toss-ups from here on). Lever Lab replays use it, so its toss-up count matches the site (none). Kyle: "when i did that, toss ups didn't change" — finish levers never decide a dead-even bout; the lab had no home / seed context to.

## 2026-11-20 — Projection Accuracy: "Picked the winner" counts every bout (code only)

- The winner percentage left toss-ups out, so widening the toss-up band raised it by skipping the hardest bouts (boys Version 4: 80.1% → 83.0% at a band of 2, with 5,831 bouts unanswered). It now counts every bout, a toss-up as half (the site gives every toss-up to the home side or the lower seed): boys Version 4 79.9% at either setting. Kyle's 80% → 76% drop reproduced against every lever: only the blend weights (WRR only: 76.7%) and the strength rating (off: 78.6%) move the boys winner pick; finish levers don't; girls Version 4 is 76.2%.

## 2026-11-20 — "Finish or decision" projection lever (code only)

- Kyle: "finish and decision. finish will defer to wrestler's most common finish. decision is more figurative. major at the high scale, ot at the low scale." New Lever Lab lever (needs Outcome odds; off until a version is saved with it): the projected winner = the side with the better chance; the odds of a finish (pin + tech) vs a decision (major + decision + OT) pick the bucket — a decision once its share reaches `decisionFrom`; a finish is the winner's own most common one (more techs than pins → Tech Fall, else Pin); a decision follows the winner's chance — OT under 55%, Major from 85%, else Decision. 2025-26 (`scripts/projection_buckets_test.mts`), boys: winner 80.6% (Version 4 80.1%); techs 6.4% of picks (0.5%); decision ≥ 0.40 keeps the finish-or-decision call at 78.7% (78.6%) with decisions 5.7% of picks, ≥ 0.35 → 10.3% of picks at 78.1%, ≥ 0.30 → 19.5% at 74.7%. Girls: winner 76.6% (76.2%); decisions stay under 1% of picks at any setting (pins are 82.5% of girls bouts). Season mix 2025-26: boys pin / tech 74.2%, major 8.9%, decision / OT 17.0%; girls 86.1%, 4.1%, 9.7%.

## 2026-11-20 — Review of the Version 2–4 projection work (code only)

- Verified: both sides' active Version 4 carries its speed bands, odds table (boys 61,883 / girls 18,308 bouts), win curve and strength 50%, win-type labels; the tracker records new bouts with Version 4 and strengths on every row, and what it freezes equals the Lever Lab's replay (0 differences, simulated on 2025-26 with writes intercepted); dead-even rules checked live (home edge, lower seed, unseeded lowest, second wrestler without context).
- Fixed: the head-to-head projection skipped the strength rating unless both wrestlers had a strength for the live season — none exist for a season until its bouts are rebuilt, so from the season switch until each wrestler's first bout the projections would have dropped it. A wrestler without one now gets the strength rating's own starting value, 1500 + 8 × their WRR.
- Noted for Kyle: Version 4 picks a pin in 98% of boys / 99.9% of girls bouts (decisions only between strong, close wrestlers) — that is what the odds say.

## 2026-11-20 — Projection Version 4: win type only, no top three, toss-ups go to someone

- **Data (projection_settings):** Version 4 for each side (`scripts/save_projection_v4_20261120.mts --apply`) = Version 3 with the site's labels showing the win type only ("Pin", "Tech Fall", "Major Decision", "Decision", "OT") — Kyle: "stop putting times for predictions, but still use them for weighting results." Times still weight the WRR and the projection grading. Version 3 kept.
- Code: the match card no longer shows the top three with percentages, just the pick (the head-to-head API still returns them). A dead-even projection goes to someone (Kyle: "give the home team the edge … at a tournament, give it to the lower seed just for fun because it's a coin flip"): the head-to-head API takes `edge=a|b` (the match card sends the home side, slot B) or `seedA` / `seedB` (the bigger seed number; unseeded counts lowest), else the second wrestler. Tracked bouts still record a dead-even bout as a toss-up. Exactly equal WRRs are now even — they had given the first-listed wrestler (on a match card, the away side) a small head start.

## 2026-11-20 — Projection Version 2 saved (Kyle) and Version 3 (the odds and the pick agree)

- **Data (projection_settings).** Kyle saved Version 2 for each side: speed bands, strength rating 50%, outcome odds on (boys also finish-from-records / hard-to-pin / rating-level, girls finish-from-records / pin↔tech / rating-level — overridden by the odds). A Version 2 pick could name one wrestler while the odds' top line named the other (the pick's winner came from the blend with strength, the odds' split from the table alone): 9.9% of boys / 9.6% of girls bouts. Version 3 (`scripts/save_projection_v3_20261120.mts --apply`, active for both sides; Version 2 kept) = Version 2 + a win curve: each side's share of the odds follows the full projection's chance, calibrated on 2025-26, and the pick is the odds' top line. Held out on 2025-26: they never disagree; winner 80.0% boys / 76.0% girls (Version 2: 80.3 / 76.2%); actual result in the top three 78.3% / 88.4% (76.3 / 88.0%). The Lever Lab's Save builds the curve from now on.

## 2026-11-20 — Speed bands can be saved as a live projection version (code only)

- Kyle: "speed bands can't be saved even though they are a huge upgrade." A version on the speed scale now saves with its own band cutoffs (built from the season shown, kept in `projection_settings.params.bands`); its projections read "Pin under 0:25" / "Tech 1:30–1:51" on head-to-head and match cards (team points still read pin / tech from the label); bouts it projects are graded on its bands, clock versions on the clock. An outcome-odds pick on speed bands stands for the 25–50% band. The WRR stays on the clock scale.

## 2026-11-20 — Tournament placements carried another team's school (Powerade: Landon Sidun on the NJSIAA podium)

- **Data only, no schema change.** Kyle: Norwin (PA)'s Landon Sidun was on the NJSIAA podium at Powerade 2025-26. The RTF importer (`src/lib/parseRtf.ts`, school-tracking placements) picked a team's side by where its school sat most often across a weight's bouts, not in the placing bout — so a placement could carry the opponent's name with the team's school, or the school of the team whose report it was (every Battle at the Brook placement said Union City). Fixed: the side comes from the placing bout itself.
- `scripts/fix_placements_from_place_bouts_20261120.mts --apply` (backup `docs/migrations/backups/20261120_placements_before_place_bout_fix.json`): every placement with a placing bout (F, 3rd / 5th / 7th place) checked against it; 129 set to the bout's wrestler and school (boys 125 in 19 tournaments, 36 of them across the NJ / non-NJ line; girls 4) — only where it's the same wrestler and the two name different schools. Dover Holiday Tournament 2025-26: 5 placements moved from Dover (DE) to Dover (NJ) — the source labeled Dover's team "Dover, DE"; the bouts had them right (Dover NJ wrestlers, e.g. Leo Lorenzo's 27 duals). After: boys 4,560 / girls 1,744 placements match their bout; integrity check unchanged (the 2 known failures).
- Left for Kyle (12): two profiles with one name (Benjamin Almonte, Edison; James Cook, Schalick; Jose Rodriguez, Raritan; Gabriel Rodrigiuez, Westwood; Mason Ontiveros, Pitman / Pitman (CA); Paul Kim, Demarest); a different name on the placement than the bout (Sam Cali: 138 #4 Amari Vann vs Ryan Yang, 132 #4 AJ Stover vs Eli Glover, 285 #1 Ryan Schnieder vs Ryan Schneider); St. John Bosco (CA) vs (GA) for Michael Madda; Battle at the Brook 175 3rd / 4th (two placing bouts).

## 2026-11-20 — Strength rating for projections; tournament bouts replay in round order; cron secret check

- **Schema: `docs/migrations/20261120_strength_rating.sql`** (Kyle runs it). `wrestler_strength` (each wrestler's strength per season, service role only) and `match_projections.a_strength` / `b_strength` (strengths going in). `src/lib/strengthRating.ts`: an Elo-style "who beats whom" rating — every bout moves both wrestlers by how surprising the result was, bonus wins more; a season starts at 1500 + 8 × the WRR at a wrestler's first bout; updated a day at a time. Written at every WRR rebuild with the tracker; filled for 2025-26 by `scripts/backfill_strength_20261120.mts --apply`. New "Strength rating" winner lever (off; share of the blend). WRR, rankings and the resume don't change. 2025-26 (`scripts/projection_strength_test.mts`): a 50% blend picks the winner 80.3% boys / 76.2% girls vs version 1's 78.4 / 74.8%, better in every group.
- **Rating replay order (code; changes ratings only when a season is rebuilt).** In-season tournament bouts used to replay in random id order and postseason bouts in lookup order, so an early round's "pre-match" WRR could hold a later round from the same day. Now each tournament replays in an order that keeps every wrestler's own rounds in sequence (`src/lib/boutOrder.ts`). Dry run of 2025-26: boys 506 / girls 358 ratings move more than 0.1, 33 / 24 more than 0.5, largest ±1.15, none missing. 2025-26 (locked) is not rebuilt unless Kyle says so.
- Security: the WRR rebuild and leaderboard refresh routes no longer accept "Bearer undefined" if CRON_SECRET were ever unset (the site-wide proxy already refused it; production has the secret).

## 2026-11-20 — Review of the projection tracking plumbing (Kyle: "make sure it's accurate before we start trusting it")

- **Verified, no change needed:** every 2025-26 NJ-vs-NJ bout in the WRR log is tracked once (boys 61,883, girls 18,308; 0 missing, 0 twice); every row agrees with its log pair (ratings going in, winner, result: 0 mismatches); each wrestler's record going in recounted by hand for a 1-in-50 sample matches (0 wrong); winner / finish type / exact recomputed by hand match the page (boys 78.4 / 22.7 / 7.6%, girls 74.8 / 23.2 / 7.6%); this season's postseason results reach a rating only after every in-season bout; a tournament's placement points only after its bouts; version 1 = the old formula (0 differences in 200,000 matchups).
- **Fixed (code):** a tracked row is now matched to its bout by match_source + source_id alone (`src/lib/projectionTrack.ts`). Before, a rebuild that flipped which side had the higher WRR, or a wrestler merge, would have recorded the bout a second time (none had happened). A merge now moves the row to the new id; a bout no longer in the log is counted (`orphaned` in the rebuild's response), not deleted. Tested with simulated flips, merges and deletes.
- **Found, not changed (rating replay order):** bouts inside an in-season tournament replay in random id order, and postseason bouts by winner/loser lookup order, not by round — so a wrestler's "pre-match" WRR for an early round can include a later round from the same day. Small: the WRR moves a median 0.17 within a tournament day (90%: 0.8). It doesn't flatter the accuracy numbers (the bouts it could have flipped were picked right 54.8% of the time) or the seed comparison (with them left out: boys seeds 80.2% vs ours 81.8%, girls 76.7% vs 76.7%). Fixing it changes ratings slightly — left for Kyle.
- **Rating finding:** in 62% of boys bouts and 78% of girls bouts at least one wrestler's WRR going in is under 1 — most wrestlers sit bunched near 0, where the rating can't tell them apart.

## 2026-11-20 — Outcome odds: the likeliest outcome plus the top three with their chances (code only)

- No schema change (a saved version keeps its odds table in `projection_settings.params`). Kyle: "show the % against the top 3 predictions … i don't want pin to be the guess for a 76 vs 77 … a 3v4 is fish on fish." `src/lib/projectionOdds.ts`: odds over ten outcomes (the WRR favorite or the underdog winning by pin / tech / major / decision / OT) from past bouts at the same rating level (favorite's WRR: under 10, 10–20, 20–30, 30–45, 45–60, 60+) and spread (under 2, 2–5, 5–10, 10–16, 16–24, 24–32, 32+); thin groups lean on neighboring groups, then the spread's overall mix; each side's record shifts how they win. New "Outcome odds" lever (off): the finish = the likeliest one for the projected winner. Projection Accuracy shows the odds graded on held-out halves, an honesty check, and a try-a-matchup box; head-to-head returns the top three when the active version has odds; the admin match card shows them (public head-to-head unchanged).
- 2025-26, held out: boys pick right 49.2% (always "favorite by pin" 48.9%), actual outcome in the top three 76.3% (66.4%); girls 62.1% (62.1%), 88.0% (67.9%). Odds honest within a few points at every level. Boys 77 vs 76 → 77 by decision 31% · 76 by decision 25% · 76 by major 8%; 4 vs 3 → 4 by pin 45%. As a finish lever: boys finish type 63.9% / exact 20.5% vs always-pin 63.6% / 20.3%; girls equal. Script: `scripts/projection_odds_test.mts`.

## 2026-11-20 — Projection Accuracy: spread chart, rating-level lever, always-pin baseline (code only)

- No schema or data change. Projection Accuracy (tab on the WRR Formula page) adds the spread chart (every bout from both sides at the WRR spread −32…+32, most common result vs the ladder's assumption, exact-hit strip; Clock / Speed bands / Win type only views) and a "Finish by rating level" test lever (close bouts: a pin under a set WRR, a decision above it). Every Lever Lab test now shows an "Always pin" column (every bout a 1st Period Pin for the WRR favorite).
- Finding (2025-26): always projecting a 1st Period Pin beats every finish lever tried — boys finish type 63.6% / exact 20.3%, girls 84.4% / 25.9% — because pins are most of all wins (boys 64%, girls 85%). Picking one finish per bout can't do much better than the base rate; finish levers are judged against that bar. Scripts: `scripts/projection_level_test.mts`, `scripts/seed_accuracy_20261120.mts` (NJSIAA higher seed won 79.6% boys / 76.2% girls in 2025-26 vs our 81.2% / 75.6% on the same bouts).

## 2026-11-19 — Speed-band test scale; projection breakdowns every two weeks and by bouts so far

- **Schema: `docs/migrations/20261119_match_projections_fall_times.sql`** (Kyle runs it). `match_projections` gets `fall_time_seconds` and `time_estimated`, filled for the bouts on file from their source rows (dual meet bouts, tournament bouts, postseason matches); new bouts get them from `src/lib/projectionTrack.ts`.
- Kyle: rank pins and techs by how fast they are among their own kind ("make a 5% pin time closer to a 5% tech time"), test only. 2025-26 timed falls: boys pins 5% 0:25 / 10% 0:35 / 25% 1:00 / median 1:42; techs 1:30 / 1:51 / 2:37 / 3:43 — a 1:30 tech (top 5%) ranked below a 1:00 pin on the clock scale. `src/lib/speedBands.ts`: six bands (fastest 5%, 5–10%, 10–25%, 25–50%, 50–75%, slowest 25%), a pin and a tech level in each, cutoffs from the season's own timed bouts (estimated times left out), boys and girls separately. Lever Lab: "Result scale" Clock (live) / Speed bands (test only — can't be saved as a live version); the WRR formula stays on the clock scale.
- Kyle: "understand early season trends versus later season form … every other week." Projection Accuracy adds every-two-weeks and bouts-so-far (the less-experienced wrestler) breakdowns. `scripts/projection_speed_test.mts` prints the same from the command line.

## 2026-11-19 — Projection tracking: every bout's projection vs what happened; Projection Accuracy page

- **Schema: `docs/migrations/20261119_match_projection_tracking.sql`** (Kyle runs it). `projection_settings` — versioned projection settings per gender, one active (version 1 seeded for each side = the formula as it stood). `match_projections` — one row per NJ-vs-NJ bout: both WRRs going in, the projection's inputs (shared-opponent and past-meeting scores, each wrestler's wins / pins / techs / majors / losses / times pinned / teched so far, from earlier days only), the settings version, the projection (frozen when first recorded) and the result (refreshed if corrected). Service role only.
- Kyle: "track every single match we enter this season. what were their scores pre match, what was our prediction, what was the outcome … figure out what levers need to either be initiated, or moved." Projections come from one function (`src/lib/projection.ts`) for the site (H2H API → head-to-head and match cards) and the tracker (`src/lib/projectionTrack.ts`); version 1 gives the old answers exactly (checked on 200,000 random matchups). The WRR formula keeps its own ladder — no projection setting changes a rating. Every WRR rebuild records the season's new bouts (`recalculate-hammer-scores` reports `projections`; a tracking failure never fails the rating run).
- New page **Projection Accuracy** (`/admin/{boys,girls}/projection-accuracy`, side menu): as-projected accuracy (winner, finish type, exact result, tiers off) by month, WRR gap, settings version; projected-vs-happened grid; rating matchups (how often the higher WRR won, by band); worst finish calls and biggest upsets; a Lever Lab that replays any change over the season's bouts before "Save as next version" makes it live. Levers (all off in version 1): finish from the records, pin ↔ tech by style, hard to pin, bonus cap; blend weights; toss-up band; the result ladder.
- **Data (after the migration):** `scripts/backfill_match_projections_20261119.mts --apply` records 2025-26 with version 1 (`recorded_how` 'backfill'). `scripts/projection_lab.mts` grades the levers straight from the match log. 2025-26 under version 1: boys 61,883 bouts — winner 78.4%, finish type 22.7%; girls 18,308 — 74.8%, 23.2%. Finish from the records (3+ wins): boys finish type 51.2%, girls 65.8%; winner unchanged.

## 2026-11-19 — Microcheck Task Order saves every change right away

- Kyle: "Ad has been turned off and it's still feeding ad micro checks." The Task Order page changed only the screen until "Save order" at the bottom was pressed (On/Off, Do next, school limits, order); leaving the page or pressing Reset dropped the change. Every change now saves as it's made (`src/app/admin/microcheck/priorities/page.tsx`); the dealer itself always honored Off. **Data:** AD name and AD email set off as Kyle intended, and the AD task still held released.

## 2026-11-19 — Review of the last two days' work (Kyle: "a deep review of everything we did")

- Checks run: type check (clean), lint of the 100 changed site files (only the older `any` / setState-in-effect patterns), integrity check (the 2 known failures only), site snapshot (only the intended changes; re-baselined), 56 live pages on both sides (all load, no error text), admin pages / APIs refuse signed-out requests, and a read-only data audit (`scripts/review_audit_20261119.mts`) of the college results, Offseason Hub, history links, streaming and microcheck tables.
- **Data only, no schema change.** `scripts/review_fixes_20261119.mts --apply` (backup `docs/migrations/backups/20261119_review_fixes.json`): the six college years the timing script sent to review now carry the wrestler as the review card's candidate (they kept `wrestler_id` with an empty candidate list); colors for six colleges NJ girls were matched to (North Central (IL), Northern Michigan, Alvernia, Western New England, Cumberlands, Life); Palmyra's NFHS link https; Joseph Aragona's and Adrian DeJesus's two Offseason Hub prospects each merged into one.
- Code: offseason badges are filed in the season they belong to — an event held June–December is the next season's (Nick Suriano's October 2012 Super 32 title had sat in 2011–12, before his freshman year; `src/lib/offseasonBadges.ts`); a medal pill from a tournament other than district / region / State says that tournament in its hover; the college spot check looks up a career's name and high school only when it's dealt (microcheck load 2.3 s → 1.2 s).
- Left as found, for Kyle: 20 boys DII 2019 entrants whose school the sheet printed as "?"; the 2026 Super 32 / USAW uploads put a few same-name wrestlers on one prospect (two Carson Owens at 138 and 190, Owen Miller 144 / 165, Sky Ramos girls 100 / 106, two Cadet entries) — those files carry no state to tell them apart.

## 2026-11-19 — Streaming: Hudl and NFHS links, Stream Account microcheck, resettable checks, college spot check

- **Schema: `docs/migrations/20261119_streaming_two_links_microcheck_reset.sql`** (Kyle runs it). `{boys,girls}_streaming_links` get `hudl_url`, `nfhs_url`, `choice` ('hudl' | 'nfhs' | 'both' | 'neither'), `choice_at`, `choice_by` (the old single `url` stays, unused, now nullable). `microcheck_task_types.reset_at` — any school check (and the college spot check) can be reset from the Task Order page: answers before the reset stop counting and data on file no longer counts by itself, so every school is asked again with what's on file shown ("Still right" or change it). New task types: Stream Account (boys / girls, field `stream_choice`) and College spot check (boys / girls, queue `college_spot`).
- Kyle: "schools have both nfhs and hudl so i grabbed both … remove all the broken ones". `scripts/streams_check_lookup_20261119.mts` checked every link in Whizzer Upload/Stream (boys Hudl, boys NFHS, girls both): a link must name the school (every distinctive word of its name) and, on Hudl, be a wrestling team of the right side; a failing or missing link was looked up (Hudl's public search → the school's varsity wrestling team; NFHS Network's search → the school's /wrestling page), taken only when one NJ school fits — results in `docs/reviews/streaming_links_checked.csv`. `scripts/load_streams_two_links_20261119.mts --apply` (after the migration) replaces the season's links with the checked ones (old rows backed up to `docs/migrations/backups/20261119_streaming_links_before_two_links.json`).
- Site: the school page shows "Stream @ Hudl" and / or "Stream @ NFHS Network" (both until the Stream Account microcheck picks; none for Neither); the match card's "Possible Stream" names both; the preseason directory has Hudl and NFHS columns and the dashboard Hudl / NFHS pills.
- College spot check (Kyle: "confirm college matches randomly"): a shuffled queue of careers the importer matched by itself; search links (name + college, name + college + high school); Confirmed → 'confirmed', Not him → 'not_ours', Can't tell → left as is until a reset (`src/lib/ncaa/spotCheck.ts`).

## 2026-11-19 — August Hibler merged; 2017 Super 32 "Jojo Aragona" linked

- **Data only.** Kyle: "august is same guy", "jojo is pope john". `scripts/merge_hibler_link_aragona_20261119.mts --apply`: the 2022 Bergen Catholic August Hibler (2 tournament entries, 2 Playoff History entrants, 1 profile row) merged into the 2024 Leonia/Palisades Park one (Playoff History span 2022–2024); the emptied profile deleted after a recount found nothing left. The 2017 Super 32 138 6th ("Jojo Aragona", PA) linked to Joseph Aragona (Pope John XXIII). Rows backed up to `docs/migrations/backups/20261119_hibler_merge_aragona.json`.
- Who's Number One now gives a badge (a bout won at it, from the Offseason Hub's bouts) — none loaded yet (`src/lib/offseasonBadges.ts`).

## 2026-11-19 — College matching checks weight (Cory Ferguson isn't Wisconsin–La Crosse's)

- **Data only, no schema change.** Kyle: Collingswood's Cory Ferguson (215) didn't wrestle 165 for Wisconsin–La Crosse — "a giant man won't shrink." The college matcher (`src/lib/ncaa/match.ts`) now weighs a candidate's last high school season's weight against the college weight (`collegeWeightFits`): more than 30 lbs under the bottom of his high school class (a heavyweight class taken as 205 boys / 180 girls) = not him; 15–30 under, or half again heavier, = review instead of an automatic match. The career carry-over in `src/lib/ncaa/save.ts` checks it too.
- `scripts/college_weight_audit.mts --apply` (rerun after any college import; rows backed up to `docs/migrations/backups/20261119_college_weight_audit.json`): of 1,557 boys and 57 girls matched years, 13 careers set not ours (Cory Ferguson, Eric Barnett — Wisconsin 125 vs Cherry Hill West 220 —, Jeff Weiss, Jose Diaz, James Davis, Evan Davis, Dylan Brown, Ethan Hardy, Alex Diaz, Henry Forte, David Pierson, Josh Johnson, Zach Thompson) and 37 years back to review (big cuts — Matt Hill, Ryan Goodman, Steve Best, Scott Goodale — and big gains, mostly to heavyweight). Anthony Ashnault and Nick Gravina's 2019 Rutgers years (sixth years) set confirmed.

## 2026-11-19 — Women's college championships loaded (NCWWC 2020–2025, NAIA 2021–2026)

- **Data only, no schema change.** Kyle: "we have all the collegiate girls tournaments uploaded … import them just like the boys." Source files in `History/Girls` (copied to `NCAA Tournament/Womens/<level>/` for the Progress grid). Transcripts in `data/ncaa/transcripts/women/{NCWWC,NAIA}/`, loaded with `scripts/load_ncaa_transcripts.mts <level> --girls --apply` into `girls_college_events / _entries / _bouts`: 2,630 entrants, 3,778 bouts, 57 entries auto-matched to our NJ girls (all fit the high school timing; 0 for review). Integrity check before and after: the 2 known failures only.
  - NCWWC 2021–2025, NAIA 2021, 2023–2025: TrackWrestling bout exports → `scripts/transcribe/tw_csv.py --bouts` (every bout, its round mapped for 16-, 32- and 64-man brackets; byes the export leaves out put back on each wrestler's path).
  - NAIA 2022: 64-man brackets at four weights — qualifiers and places only. NAIA 2026: the export has no round names — qualifiers from it, places from the Flo bracket PDF (`flo_places.py`).
  - NCWWC 2020 (the Cliff Keen WCWC): `scripts/transcribe/wcwc2020.py` — 8 weights in the file (no 116 / 155); 109–143 print the championship side only (1st / 2nd); school codes written out from where their wrestlers were in later years.
  - NAIA 2020: not loaded — the PDF is the pre-tournament bracket of the canceled event (as the boys' canceled 2020 NCAA DI isn't).
- Colleges: `scripts/add_women_colleges_20261119.mts --apply` — 14 new colleges (D'Youville, Elmira, Emory & Henry, Eureka, Fontbonne, Huntingdon, Lincoln Memorial, Linfield, Marymount, Presbyterian, Texas Woman's, Utica, William Jewell, Jarvis Christian; colors unchecked) and 107 spellings as aliases of colleges already on file. `LEVEL_COLLEGE_FIXES.NAIA`: a bare "York" is York (NE), "Simpson" is Simpson (CA). Westminster (one non-NJ entrant a year, 2021–23) taken as Westminster (MO).

## 2026-11-19 — College matches with impossible timing unlinked (Pat Smith, Oklahoma State)

- **Data only, no schema change.** `scripts/college_unlink_bad_timing_20261119.mts --apply` (rows backed up to `docs/migrations/backups/20261119_college_bad_timing.json`). Kyle: Oklahoma State's Pat Smith is not Seton Hall Prep's. Cause: the college loader carried a match into the same name's other years at the same college without the timing check (`src/lib/ncaa/save.ts`, now checked with `collegeTimingFits` in `src/lib/ncaa/match.ts`). An audit of all 1,582 matched college years found 17 outside the wrestler's high school timing:
  - not ours, every year at that college (19 entries): Pat Smith (Oklahoma State 1990–94), Joshua Rodriguez (NDSU 2015–17), Ryan Jack (NC State 2022–26), Mike Mann (Iowa State 1979–83), Pat Murphy (Chattanooga 1980–83) — college years before or during his high school years.
  - back to review (6): Keith Taylor (West Virginia 1995), Jim Sloan (Montclair State DIII 1993), Trent Johnson (Lindsey Wilson NAIA 2019–23; only 2019 clashes with Pennsville's class of 2019).
  - kept: Anthony Ashnault and Nick Gravina (Rutgers 2019, sixth years).

## 2026-11-18 — Colors for the colleges that had none

- **Data only, no schema change.** `scripts/fill_college_colors_20261118.mts --apply`: `colleges.primary_color` / `secondary_color` for the 93 colleges with NJ wrestlers and no colors (mostly DIII and NAIA; Wilkes navy and gold per Kyle). Only empty rows written; `colors_checked` stays false for Kyle to check.

## 2026-11-18 — Super 32 Challenge 2000–2015 podiums in the Offseason Hub, NJ placers linked

- **Data only, no schema change.** `scripts/import_super32_older_20261118.mts --apply`, one year at a time: the high school boys podiums of every Super 32 before 2016 (no girls division then) — 1,518 placements in `boys_hub_placements` under new `boys_hub_events` of "Super 32 Challenge" (tournament 18, season = the year held), 1,277 new prospects. Every year 2000–2026 is now in the Hub. Integrity check before and after each year: the 2 known failures only.
- Sources (Off Season Stuff/Non-NJSIAA Seasons/Super 32), read into place lists by:
  - `scripts/transcribe/super32_rtf.py` — 2000–2004 (`2000 - 2004 Super 32.rtf`, a different layout each year; places 1–4 only).
  - `scripts/transcribe/super32_brackets.py` — the Brute bracket PDFs: 2005 (`HS (1).pdf`), 2006 (`HS.pdf`), 2007 (`bracket07.pdf`), 2008, and 2013 138–220. The two undated files were dated by their wrestlers' grades against 2007's. Places from the Champion / 3rd / 5th / 7th boxes; a 7th-place "No-Contest" = tied 7th. A few weights read off the page images (listed in the script).
  - `scripts/transcribe/super32_lists.py` — 2009 (finals + consolation finals text), 2010–2012 (PlaceWinners Report).
  - `scripts/transcribe/super32_2013.py` — 2013 106–132 and 285 (one-page day-2 brackets).
  - 2014: a scan — `scripts/transcribe/super32_2014_places.tsv`, read off the 14 "Sunday" pages (220 has no 6th: that wrestler was disqualified).
  - `scripts/transcribe/super32_2015.py` — 2015 (TrackWrestling print; no states).
- Linking (same rules as 2016–2025): an NJ placer gets our wrestler when exactly one NJ wrestler fits the name (as listed, without a suffix, a nickname form) and class. 2006 and 2015 print no states: a placer there is linked only when one NJ wrestler fits the name and class *and* wrestled for the school printed. Two of our wrestlers with one name were settled by weights and school (Nick Suriano — Bergen Catholic, not Southern Regional; Wayne Stinson — the 2010s one, not the 1979; Ryan Callahan — Wallkill Valley); "Jojo" Aragona 2015 = Joseph Aragona (Pope John). 100 NJ placers, 92 linked; the other 8 are on `docs/reviews/super32_older_review_applied.txt` (no NJ wrestler of the name — per Kyle, didn't wrestle NJSIAA — and Matthew Moore 2012, held back as a common name).
- Shows as Super 32 badges: 185 boys now have a Super 32 podium (76 of them from 2000–2015).

## 2026-11-18 — Super 32 Challenge 2016–2025 podiums in the Offseason Hub, NJ placers linked

- **Data only, no schema change.** `scripts/import_super32_history_20261118.mts --apply`: places 1–8 of the high school boys (2016–2025) and high school girls (2017–2025) brackets — 1,903 placements in `{boys,girls}_hub_placements` under new `{boys,girls}_hub_events` of "Super 32 Challenge" (season = the year held, as the 2026 event), 1,300 new prospects. Integrity check before and after: the 2 known failures only. 2026 (already loaded) untouched.
- Source per year: the TrackWrestling bout CSV (every bout; places by the hub's own reader, `src/lib/hubFiles.ts`) and the Flo bracket PDF (which bracket is boys / girls high school — the CSV doesn't name divisions; the PDF prints the 14 boys weights first, the girls last). 2024 girls: a 7th-place pool's final sat in the same bracket as the real final — the real one is between the semifinal winners, the other is 7th / 8th. 2024 and 2025 girls were wrestled freestyle (saved as such).
- Linking: a New Jersey placer gets our wrestler when exactly one wrestler of that side has the name — as listed, without a suffix, or a nickname form — and a class that fits (the season + 1 … + 5, or unknown). 102 of 127 NJ placers linked; 25 listed for Kyle in `docs/reviews/super32_history_review_applied.txt` (mostly girls not in our records; two Adrian DeJesus and three Alex Reyes records).
- Shows as Super 32 badges on profiles: 149 boys and 52 girls now have offseason badges.
- 2000–2015: see the entry above.

## 2026-11-18 — Collegiate: Colleges / Leaders views per level (code only)

- Each level of Insight · Collegiate (and the mock) has two views (`CollegeLevelViews`): Colleges — the colleges table — and Leaders — National Champions (multi-time champions first), Medals by Year (every top-8 finish: year, place, weight, college; newest year first, then by place) and Back Side Warriors (most consolation wins). Every board sortable (`SortableBoard` gains a tie-break order). Pinners dropped. `njCollegeCareers` finishes carry their college.

## 2026-11-18 — Insight · Collegiate; Insight menu (code only)

- The college list moved into Insight as a tab, Collegiate (before About) (`/boys/insight/collegiate`, `/girls/insight/collegiate`): the levels (DI / DII / DIII / NAIA; girls NCWWC / NAIA / NCAA) as the second row of tabs, each level's summary under them, then the colleges and leader boards (`CollegeListCore embedded`). `/boys/college` and `/girls/college` redirect there; a college's page (`/boys/college/[id]`) stays its own, its "All Colleges" link back to Collegiate.
- The header's Insight opens a menu of all its pages — Daily Report, Rankings, Daily Challenge, Polls, Off-Season, Collegiate, About (from `INSIGHT_TABS`, the same list as the tabs). The Aesthetic mock matches.
- Site snapshot before: no change.

## 2026-11-18 — Shipped from the mock: college pages, college on wrestler profiles, offseason badges, navy stats board (code only)

Kyle approved the mock ("everything looks great, you can ship that"):
- New public routes: `/boys/college` (DI / DII / DIII / NAIA tabs, colleges + sortable leader boards), `/boys/college/[id]` (header, stats board, NJ wrestlers with awards by year), `/girls/college` (NCWWC / NAIA / NCAA — empty until girls results load). Data cached 5 minutes per level / per college (`src/lib/ncaa/collegePublic.ts`; NJSIAA medals in the public view — `hsAccolades` takes seeHidden). Not in the site menu yet (placement for Kyle).
- Wrestler profiles: college bars under the header (linking to the boys college page), NCAA medals in the medal case, the College section; for a wrestler with college years the NJSIAA heading, oldest-first medal rows and joined season tables. Offseason badges (Super 32 / Fargo podiums; Ironman and world titles when loaded) in every profile's medal case.
- School profiles: the navy-header stats board replaces the white one (old `StatChip` / `RankChip` removed).
- Site snapshot before: no change.

## 2026-11-18 — College list leader boards (sortable); conference rank label smaller (code only)

- College list (`/boys/college`, not in the site nav yet; Aesthetic mock): each level gets four leader boards — Champions (titles, title years and weights), All-Americans (AA count, best finish, every top-8 finish), Back Side Warriors (consolation wins), Pinners (falls) — every NJ wrestler who qualifies, sortable by any column (`src/components/site/SortableBoard.tsx`; long lists scroll inside the box). `njCollegeCareers` now returns each wrestler's placing years (`finishes`).
- School profile (live and the mock board): the Conference Rankings box's conference · division line set much smaller (8px) and allowed to wrap, so it fits in the box. Site snapshot before: no change.

## 2026-11-18 — Mock: stats board sized, profile tables joined, college list header, offseason badges, awards by year (code only)

- Aesthetic mock only (live pages unchanged; site snapshot before: no change):
  - Stats board (`src/components/site/StatBoard.tsx`, shared): boxes the old size, the navy header two lines tall. The school profile's board and the college page's ("NJ Wrestlers at the College Championships": wrestlers, years, All-Americans, titles, falls, techs, cons. wins) use it.
  - Wrestler profile (college preview): the NJSIAA season tables joined into one stack, and the NCAA year boxes the same.
  - Offseason badges (`src/lib/offseasonBadges.ts`, read from the Offseason Hub through the linked prospect): Super 32 Challenge and Fargo (16U / Junior, by style) podiums — top 8 — and Ironman and world titles once loaded; in the profile's medal case by season (`preview.badges`). Loaded now: Super 32 Challenge 2026, Fargo 2026.
- College list / college page (`/boys/college`, not in the site nav yet): each level's summary in the standard header (`StdHeader` takes the page's own line), standard width; the wrestler dropdown shows his awards one row per season — NJSIAA medals, offseason badges, NCAA finish — the bouts stay on his profile.

## 2026-11-18 — Broken stream links hidden; Edit meet panel; stream link on meets and tournament pages

- **Data:** `scripts/hide_bad_streaming_links_20261118.mts --apply` removed 159 links (88 boys, 71 girls; 89 schools) loaded from Streaming Sites.csv: 10 that open another school (Westfield → Livingston, Hammonton → Manalapan, …) and 79 Hudl links with no organization number (".../organization/paulsboro-high-school" errors). Rows saved first: `docs/migrations/backups/20261118_streaming_links_hidden.json`; fix list `docs/reviews/streaming_links_to_fix.csv`. Left: 229 boys, 195 girls. Integrity check before and after: the 2 known failures only.
- **Migration file:** `docs/migrations/20261118_meet_stream_and_details.sql` — **APPLIED** in the Supabase SQL editor 2026-11-18 (verify: six counts of 0). Adds `stream_url`, `premier_label` to `dual_meets` / `dual_meets_girls` and `stream_url` to `in_season_tournaments` / `_girls`.
- **Edit meet** (`src/components/admin/MeetEditPanel.tsx`): admins only, on the public meet page and the Match Card (Dual Hub's meet picker links to the meet page). Date, time, stream link, premier label, home / away (only before any bouts or adjustments are entered), counts toward record (girls duals). Reads `/api/admin/meet-edit` (admin-only; the panel shows nothing to anyone else, so the meet page stays cached for fans); saves `PATCH /api/admin/dual-meets` (now takes those fields; Dual Hub / Past Seasons score edits unchanged).
- Match Card: the meet's own link shows "Stream ↗", else the home program's page "Possible Stream ↗"; a saved premier label opens the card as a premier dual.
- Tournament pages: "Stream ↗" in the banner only once set; admins set it there ("+ Stream link", `PATCH /api/admin/tournament-stream`). The page reads the column apart, so it works before the migration.
- Site snapshot before: no change.

## 2026-11-18 — School page: streaming pill live; navy stats board in the mock (code only)

- Live (both sides): the program's streaming page as a pill in the district / region / group row under the season picker, "Stream @ Hudl" or "Stream @ NFHS Network" (`SchoolHeader` streamUrl; `SchoolProfileCore` reads it on the server with `streamingLinkFor`). Site snapshot before: no change.
- Aesthetic mock only (`preview.statBar`): the stats board with each category in a navy (#16284A) header, the number large and bold under it, its state rank below (`BoardCell` in SchoolTabs.tsx). The live board is unchanged until Kyle approves.

## 2026-11-18 — Polls: any number of answers

- **Migration file:** `docs/migrations/20261118_poll_any_number_of_answers.sql` — **APPLIED** in the Supabase SQL editor 2026-11-18 (verify: polls_answers_some, poll_votes_choice_index; the old 4-answer and 0–3 checks gone). Drops `polls.answers` = exactly 4 and `poll_votes.choice` 0–3; adds `polls_answers_some` (at least one answer) and `poll_votes_choice_index` (choice ≥ 0). Existing polls and votes unchanged.
- Code: admin Polls form adds / removes answers (starts with two); `/api/admin/polls` takes any number (at least one, none blank) and counts votes per answer; once a poll has votes its answers can be added to or reworded but not removed (votes are kept by answer position). `/api/poll` counts and accepts a vote for however many answers the poll has.

## 2026-11-18 — Streaming links loaded for every program (2026-27); Watch link on the match card and (mock) school profile

- **Data, no schema change.** `scripts/load_streaming_links_20261118.mts --apply`: Whizzer Upload/Extra/Streaming Sites.csv (school_id, name, NFHS / Hudl link) → `boys_streaming_links` (317 — every boys program) and `girls_streaming_links` (266 — every girls program) for season 2026-27 (id 2027), through `src/lib/streamingLinks.ts`. Verified in the tables after. Integrity check before and after: the 2 known failures only.
- Not loaded (no such school id — old co-op ids): 360 Buena Regional/Vineland, 363 Cherry Hill East/West, 385 Morris Hills-Morris Knolls, 392 Ramsey/Northern Highlands, 365 Cliffside Park/Ridgefield Memorial, 372 Jefferson-Sparta, 55 Lodi. Girls programs given a boys team page (Hudl "boys-varsity-wrestling"): Woodbridge, Hawthorne, Pingry, Hackensack. Kyle 2026-11-18: leave the 7 old ids off (every program has a link) and keep those 4 girls links as they are.
- `streamingLinkFor` (src/lib/streamingLinks.ts): a program's link carried forward like coaches (that season's, else the latest earlier, else the newest on file).
- Admin Match Card (test harness): the home team's link centered under the matchup, "Possible Stream ↗" — `/api/admin/match-card` returns `stream_b`.
- School profile header: a "Watch ↗" pill beside Website — behind `preview.streaming` (Aesthetic Tool only; the live page is unchanged until Kyle approves). Site snapshot before: no change.

## 2026-11-18 — Place winners for NCAA DII 1975–2001 and DIII 1974–2010; DIII 2022, 2023, 2025 and DII 2025 completed (data + code)

- **Data only, no schema change.** Integrity check before and after each batch: the 2 known failures only.
- Kyle added wrestlingstats "Champions and Place Winners" sheets (`NCAA DIII/NCAA II 1975…2001.pdf`, `NCAA III 1974…2010.pdf`). `scripts/transcribe/podium.py` reads them by position (two columns: odd places left, even right; two sheets print sideways). Saved as place-winner-only years: DII 1975–2001 (27 years, 2,080 entrants — 17 auto, 5 review), DIII 1974–2010 except 2004/2009 (35 years, 2,699 — 138 auto, 23 review). 1974–1978 placed 6.
- Not awarded: DII 1996 158 5th/6th (both wrestlers disqualified — on the sheet, in the transcript as qualifiers with no place) and DIII 1997 118 6th (blank on the sheet). New transcript line `vacant N` (`src/lib/ncaa/transcript.ts`) so the place check allows the gap.
- DIII 2022 / 2023 from TrackWrestling bout exports (`…Championships.csv`; `scripts/transcribe/tw_csv.py`): every wrestler + places, no bouts (Kyle: DIII / NAIA keep no bouts) — 180 + 180 entrants (22+19 auto, 4+6 review). `NCAA DIII/2023.pdf` is the DII 2023 results, not DIII (Kyle to know). DIII 2025: places from its CSV added to the qualifiers already saved (19 auto, 7 review).
- DII 2025: places from the finished FloWrestling brackets (`2025 brackets.pdf`; `scripts/transcribe/flo_places.py` — the winner's line is set in the heavy face) added to the qualifiers already saved (4 auto, 5 review). Its bouts are in the file too; not loaded yet.
- Colleges: `data/ncaa/colleges/podium_75_10.txt` — 42 new (programs since dropped: Bemidji State, UMBC, Kean, Upsala, Rutgers-Newark, St. Thomas (MN) …) + 14 spellings of existing ones; `data/ncaa/colleges/diii_trackwrestling.txt` — the exports' full names ("Augsburg University") as 53 aliases. DIII's bare "St. Thomas" means St. Thomas (MN) (`LEVEL_COLLEGE_FIXES`, src/lib/ncaa/colleges.ts) — NAIA's took that alias for Florida. Not proven: DIII 1976–78 "Maryville" left on Maryville (MO).

## 2026-11-18 — NCAA DII 2002 loaded from the scan (qualifiers + places 1–8, no bouts)

- **Data only, no schema change.** `scripts/load_ncaa_transcripts.mts "NCAA DII" 2002 --apply`: 160 entrants, 80 places. Integrity check before and after: the 2 known failures only.
- Qualifiers OCR'd (`scripts/transcribe/ocr.swift` + `ocr_kreider.py`) and every name checked against the page image: the scan cuts off the first letter of some names on the left edge — read from the image or from the "I. Last" bout lines (marked in the transcript: Sion King, Evan Love, Lyneil Mitchell). Places read off zoomed consolation crops (`scripts/transcribe/zoom_pairs.py`).
- `data/ncaa/colleges/dii_scans.txt` (+ `--apply`): 11 spellings of the scans added as aliases of existing colleges (e.g. "Minnesota Mankato" → Minnesota State, "Cent. Missouri State" → Central Missouri).

## 2026-11-18 — NAIA 2022 loaded (qualifiers + places 1–8, no bouts) — first OCR'd championship

- **Data only, no schema change.** `scripts/load_ncaa_transcripts.mts NAIA 2022 --apply`: 279 entrants, 80 places. Matches: 2 auto, 2 review. Integrity check before and after: the 2 known failures only.
- The PDF's text layer is unreadable, so its pages were read with macOS Vision OCR (`scripts/transcribe/ocr.swift`, no install; `scripts/transcribe/ocr_draft.py` turns the bracket lines into qualifiers). OCR'd college typos corrected by hand (e.g. "Cumbutlands", "Fenory-Riddle"); 4 qualifiers OCR skipped (lines that wrap) added from the page and marked in the transcript; places read off the bracket pages. Non-placer names are as OCR read them — a misspelling there is possible.
- New college Lincoln (IL) (spelled "Lincoln (Ill.)" — bare "Lincoln" is Lincoln (MO) on our list).
- NAIA now loaded 2009–2026 (all 18 years). Not yet: 1959–2005 (scans).

## 2026-11-18 — NAIA 2010–2012 loaded (qualifiers + places 1–8, no bouts)

- **Data only, no schema change.** `scripts/load_ncaa_transcripts.mts NAIA 2010 2011 2012 --apply`: 914 entrants, 80 places a year. Matches: 4 auto, 4 review. Integrity check before and after: the 2 known failures only.
- 2010 from the PDF's own report pages (`scripts/transcribe/kreider_reports.py`: Team Results = every qualifier with his college, Finals Summary = places 1–8). 2011–2012 from the Kreider Championship pages ("Dante Rini (No Dame)"; short college names translated per year in `scripts/transcribe/draft_kreider_codes.py`), places read off the bracket pages. 64-line brackets with pigtails, so 30–38 qualifiers a weight.
- Not proven: 2011 "C Baptist" / 2012 "CBC" (one wrestler, John Lopez, both years) read as Central Baptist (AR), the "CBC" of 2013; it could be California Baptist.
- Aliases: "Notre Dame OH" → Notre Dame (OH), "Calumet College of St. Joseph" → Calumet St. Joseph. 2010's bare "Northwestern" / "York" written as "Northwestern (Iowa)" / "York (Neb.)".
- NAIA now loaded: 2009–2021, 2023–2026. Not yet: 2022 (PDF text unreadable), 1959–2005 (scans).

## 2026-11-18 — NAIA 2013–2018 loaded (qualifiers + places 1–8, no bouts); 4 more NAIA colleges

- **Data only, no schema change.** `scripts/load_ncaa_transcripts.mts NAIA 2013 … 2018 --apply`: 1,347 entrants, 80 places a year. Matches: 16 auto, 12 review. Integrity check before and after: the 2 known failures only.
- Qualifiers from the PDF text (`scripts/transcribe/draft_naia_tw.py`): 2013–2015 print a college code ("Gabe Roman, MBU, 32-5") — translated per year inside the script (codes differ between years, e.g. 2015's "BU" is Baker), not added as aliases; 2016–2018 print the college. Places read off the bracket pages (`scripts/transcribe/finals_sheet.py`).
- `data/ncaa/colleges/naia.txt` (+ `--apply`): St. Catharine (KY), Allen (SC), Davenport (MI), Central Christian (KS); aliases "Wvu Tech" → West Virginia Tech, "Truett-McConnell" → Truett McConnell. Checked: every NAIA spelling resolves to the right school.

## 2026-11-18 — College Progress grid (admin) + reviewed flag on college championships

- **Migration file:** `docs/migrations/20261118_college_event_reviewed.sql` — **APPLIED** in the Supabase SQL editor 2026-11-18 (check: 0 / 0). Adds `reviewed_at`, `reviewed_by` to `{boys,girls}_college_events`.
- Admin → Non-NJSIAA → College: new first tab **Progress** (`src/app/admin/[side]/college/ProgressGrid.tsx`): tournaments down the left, years across the top (newest first), Q / P / B cells per year; red until the year is marked reviewed (only when nobody is waiting), then green. API: `/api/admin/college` events view adds bouts + reviewed; PATCH `event_reviewed`.

## 2026-11-18 — NAIA 2009, 2019–2021, 2023–2026 loaded (qualifiers + places 1–8, no bouts); 79 NAIA colleges added

- **Data only, no schema change.** `scripts/add_college_group.mts data/ncaa/colleges/naia.txt --apply`: 74 new `colleges` rows (NAIA programs) + 120 `college_aliases` (the spellings these files print, e.g. "Concordia (Neb.)", "MSU-Northern", "Campbellsvile").
- `scripts/load_ncaa_transcripts.mts NAIA --apply`: `boys_college_events` / `_entries` for 2019, 2020, 2021, 2023, 2024, 2025, 2026 (level "NAIA") — 1,876 entrants, 80 places each year, no bouts (Kyle: typed years skip bouts). Matches: 21 auto, 14 review.
- Transcripts in `data/ncaa/transcripts/NAIA/<year>.txt`: entrants from the PDF text (`scripts/transcribe/draft_naia.py`), places read off the bracket pages (finals sheet `scripts/transcribe/finals_sheet.py`; place-bout winners also checked by `scripts/transcribe/tw_places.py`).
- 2009 from the bout-by-bout text (`scripts/transcribe/bout_list.py`; 278 entrants, places from the place bouts).
- Same-name colleges: NAIA's Northwestern, York, Simpson and Rochester are other schools than the DI/DIII ones those names already pointed to, so the transcripts print them as "Northwestern (Iowa)", "York (Neb.)", "Simpson (Calif.)", "Rochester Christian", with new colleges Northwestern (IA), York (NE), Simpson (CA) (+ Bacone, Dana). "Great Falls" (2009) is an alias of Providence (MT) (the same school, renamed 2017). Checked after the re-save: those 65 entrants point to the right colleges; no NAIA entrant without a college.
- Not yet: NAIA 2022 (garbled text), 2010–2018 (other layouts), 1959–2005 scans.

## 2026-11-18 — NCAA DI 1935–1998, DII 2003–2010, DIII text years loaded; ~330 more colleges (data + code)

**Tables affected:** `colleges` (+~330), `college_aliases`, `boys_college_events` / `_entries` / `_bouts`

**What changed:**
- **NCAA DI 1935–1998** (61 years) from the wrestlingstats printouts with the existing reader, after fixes in `src/lib/ncaa/parse.ts`: place lines without "[seed]" (1930s–40s), "UNL" read as the heavyweight (285), places per year as printed (4 to 1962, 6 to 1978, 8 since), a tie for a place, "automatic" advances, the 1930s round lists as entrants, the consolation side named from its last rounds (1979–1998 wrestled back in fewer rounds), a wrestler listed twice kept once (`src/lib/ncaa/save.ts`). Bouts kept from 1979 on; before that entrants + places only. 188 historic DI colleges (`scripts/add_di_history_colleges_20261118.mts`).
- **NCAA DII 2003–2010** typed from the scans (Kreider sheets) with bouts: `data/ncaa/specs/DII-<year>.py` → `scripts/transcribe/kreider.py` → transcript. All pass the bracket-path check.
- **NCAA DIII 2004, 2011–2019, 2024–2026**: qualifiers from the PDF text, places read off the brackets, no bouts (Kyle: "just pull schools, names, and all american status") — `scripts/transcribe/places.py`. 2013 via the official reader (codes as aliases, `data/ncaa/colleges/diii_codes.txt`; Powell's 7th at 165 added in `src/lib/ncaa/corrections.ts`). 2025 is the pre-tournament bracket (qualifiers only). 2024: the pigtail-round wrestlers print last names only — the two placers listed by last name. ~70 DIII colleges + spellings (`data/ncaa/colleges/diii.txt`, `scripts/add_college_group.mts`); every college's own name added as an alias (`scripts/college_names_as_aliases.mts`).
- Totals on file: DI 88 years (1935–2026), DII 23 (2003–2026), DIII 13. Matches: 1,213 auto, 168 to review (Microcheck College Review).

**Reversible?** Yes — delete the events (entries / bouts cascade) and the added colleges
**Verified?** Every transcript passes its checks; integrity check unchanged (2 known failures)

---

## 2026-11-18 — NCAA Division II 2011–2026 loaded from transcripts; 72 DII colleges (data + code)

**Tables affected:** `colleges` (+72), `college_aliases` (+147), `boys_college_events` / `_entries` / `_bouts` (15 DII years)

**What changed:**
- Kyle: "all dii is collected". The DII files are scans (1963–2010) or a different layout nearly every year (2011–2026), so each year is typed up from its bracket pages into a plain-text transcript, `data/ncaa/transcripts/NCAA DII/<year>.txt` (format and checks: `src/lib/ncaa/transcript.ts`). Every transcript must pass: each wrestler's bouts follow the bracket (where he can come from into each round), nobody loses too often, the champion is unbeaten, places 1–8 complete. Years with text are also checked word for word against the PDF (`scripts/check_transcript_text.mts`): every name, college, record and result found (2023's text is unreadable; 2013 prints "Jacobd. Horn").
- 2011–2026 (no 2020 tournament): 2,524 entrants, 4,284 bouts with rounds; 2025's file is the pre-tournament bracket (entrants only, no places). `scripts/load_ncaa_transcripts.mts "NCAA DII" --apply`: 64 matched to NJ wrestlers automatically, 31 to review (Microcheck College Review). 45 NJ wrestlers.
- `scripts/add_dii_colleges_20261118.mts --apply`: 72 DII colleges with city, state, conference, mascot, colors (colors_checked false) and every printed spelling as an alias. Millersville, East Stroudsburg etc. already on the list from DI keep their one row.
- Code: result labels from older sheets — "Pin" = fall, "Maj" = major, "I-D" = injury default, "FF" = forfeit (`resultType`, src/lib/ncaa/parse.ts).

**Reversible?** Yes — delete the DII events (entries and bouts cascade) and the 72 colleges
**Verified?** All 15 transcripts pass the checks; integrity check unchanged (same failures before and after)

---

## 2026-11-17 — College details (city, state, conference, mascot) and NCAA bout rounds (schema + code)

**Tables affected:** `colleges` (+ city, state, conference, mascot; 104 rows filled), `boys_college_bouts` / `girls_college_bouts` (+ round)

**What changed:**
- Migration `docs/migrations/20261117_college_details_rounds.sql`. Conference = the wrestling conference for 2026-27 (Pac-12 now has Air Force, Northern Colorado, NDSU, SDSU, NIU), or the last one for a dropped program; NULL for BYU, Eastern Illinois, Marquette, Millersville, Seton Hall, Slippery Rock (not confirmed).
- Rounds read from the bracket columns (`src/lib/ncaa/parse.ts`): pigtail r1 r2 qf sf f · cpig c1–c4 cqf csf · 3rd 5th 7th. Checked on every year: no round over its bracket count; 2017–2026 complete (64 a weight). Filled by reloading the D1 years after the migration (`scripts/load_ncaa_d1_20261117.mts`, keeps decisions).
- Code (Aesthetic Tool mock only): college page header like a high school's, table apart, "NCAA Qualifier", dropdown (NJSIAA medals then NCAA bouts, `src/lib/ncaa/hsAccolades.ts`); Back Side Warriors / Pinners boards; profile college bar joined to the HS banner, qualifier years, medals oldest first with NCAA after NJSIAA, NJSIAA header, Round column, Cons. Wins.
- Code (live): a graduated wrestler's "Active" years run over every season with a medal or award too.

**APPLIED** — Kyle ran the migration 2026-11-17 (104 with a city, 98 with a conference); D1 1999–2026 reloaded: 15,915 bouts, every one with a round; 1999 added (20 auto, 1 review: John Van Doren, Lehigh); 149 decisions kept
- Parser fix in the same reload: two wrestlers with the same last name who met (Scott / Cliff Moore 2003, Bo / Isaac Jordan 2015) — the winner is now read by full name, not the first listed.
- Code (mock): the college list has a tab per level (boys DI / DII / DIII / NAIA / Juco, girls NCWWC / NAIA / NCAA; `COLLEGE_LEVELS` in `src/lib/ncaa/stats.ts`, also the admin upload list); girls list in the mock.

**Reversible?** Yes — rollback lines in the migration
**Verified?** Round counts checked on a dry parse of all 26 years; type check + prebuild pass

---

## 2026-11-17 — Rick / Ricky LaForge merged; nickname scan (data)

**Migration file:** none. Backup `docs/migrations/backups/20261117_merge_f3387229_into_c8639a19.json`.
- Kyle: "rick laforge has two profiles. they are the same". Rick LaForge (Delbarton 1998: Region 3 champ, State 6th) merged into Ricky LaForge (Indian Hills, Region 2 champ 2000, 2001; Hofstra 2003, 2005). Missed by the same-name scan (printed "Rick" vs "Ricky").
- Nickname scan (sameFirst, different schools, inside 4 seasons): 2 more for Kyle — Mike / Michael Leta (North Hunterdon 1957, North Plainfield 1958) and Joe / Joseph Sisia (Springfield 1956, Clark 1957–58). Nothing changed.

---

## 2026-11-17 — College misprints: "Pittsburg State" → Pittsburgh, "Northwest Missouri" → Northwestern in the D1 files (data + code)

**Migration file:** none. Backups `docs/migrations/backups/20261117_college_pittsburg_state_before.json`, `…_college_northwest_missouri_before.json`.
- Kyle: Jimmy Conroy showed Pittsburg State and Pittsburgh — both Pitt. The 2009 D1 file printed "Pittsburg State" (a Division II school, never at the D1 championships); the only entry with that name in 26 years. Also 2014 "Northwest Missouri" = Michael McMullan of Northwestern. Both entries re-pointed (college_id; printed name kept).
- `LEVEL_COLLEGE_FIXES` (src/lib/ncaa/colleges.ts), used by saveCollegeYear: a level's misprinted names resolve to the college they mean, so a re-import keeps the fix; the Division II schools keep their names for DII files.

---

## 2026-11-17 — College review: one card per wrestler at a college (code)

**Migration file:** none.
- Kyle: "why aren't you making one joseph langel rutgers profile … why are you doing one profile for every season?" Results stay one row per NCAA year (each has its own bouts and place), but Review and Microcheck now show one card per name at a college with every year listed (`loadReviewRows` groups; `ReviewRow.years`); one decision covers them all (decideCollegeEntry already applied to the same name + college). At the change: 24 years waiting → 15 cards.

---

## 2026-11-17 — History: Kyle's school picks for the 16 one-wrestler ties; North Edison = John P. Stevens (data + code)

**Migration file:** none. Backup `docs/migrations/backups/20261117_history_tie_schools_before.json`.
- `scripts/history_tie_schools_20261117.mts --apply` — 20 finishes. North Edison → John P. Stevens (all 5 finishes, 1969–72; matcher `northedison: 151` in src/lib/historySchools.ts, shown "North Edison (John P. Stevens)"). Villecco 1968–69 and McWhirter 1966 → West Deptford (Kyle). By region title (Kyle: "go with region placement"): Leverich → Westwood, Richardson → Seton Hall Prep, Picone → Phillipsburg Catholic, Magda → Warren Hills, Gauthier → TR East, Gonzalez → Don Bosco Tech, Rendina → Edison, D'Amico → Nutley, Webb → Paul VI. Claude's picks (Kyle deferred): Frank Jackson → Westfield, Martinelli → JFK-Paterson, Bonora → Nutley.

---

## 2026-11-17 — History: same-person merges (32), schools from his other seasons, Washington Region 1 = Washington Township, Garren 1998 (data + code)

**Migration file:** none. Backups: `docs/migrations/backups/20261117_history_same_person_before.json` (every finish changed + merge list) and one `…_merge_<drop>_into_<keep>.json` per merge.
- Scan `scripts/history_same_name_pairs_20261117.mts`: 68 same-name pairs at different schools; 37 fit inside one 4-season career (all finishes within 4 seasons, any shared season at the same or a close weight).
- `scripts/history_same_person_fixes_20261117.mts --apply` (Kyle: "the first two groups are the same person … just use the school from other seasons"):
  - Garren 1998 State 3rd → Paulsboro (Kyle).
  - "Washington" Region 1 (1966, 1967, 1971; Region 1 was South Jersey through 1971) → Washington Township (302), with the state medals that follow those region titles: 10 finishes. Matcher rule `BY_REGION.washington` in src/lib/historySchools.ts (Region 2 / 3 stays Warren Hills; a state finish without a region title falls back to Warren Hills).
  - 32 pairs merged into one profile each. 15 had one school with more of his finishes: the odd finish moved to it (school_id and printed name, which the Trophy Case reads). 16 ties (one finish at each school) keep both schools until Kyle picks.
- `scripts/college_rematch_review_20261117.mts`: college entrants in review re-matched after the merges — Donnie DeFilippis 2000, 2001 now automatic.

---

## 2026-11-17 — Scott Garren merged (Oakcrest + Paulsboro); reusable profile merge script (data + code)

**Migration file:** none.
- Kyle: "scott garren from oakcrest and paulsboro are the same". `scripts/merge_wrestler_profiles.mts <keep> <drop> [--first=] [--why=]` (generalized from the Zargo merge): Oakcrest profile d2e3028d (1997 Region champ, 1998 State 3rd) merged into Paulsboro e583e36f (1998 Region champ, 1999 State champ); 2 finishes moved; emptied profile kept inactive. Backup `docs/migrations/backups/20261117_merge_d2e3028d_into_e583e36f.json`. He wasn't joined at creation because both schools have a 1998 finish.
- His NC State college years (2000, 2003, 2004) re-matched: now the only Scott Garren → automatic.
- Found 35 more same-name pairs with finishes at two schools in the same or next year (most: State place at one school, Region at another, same year and weight) — listed for Kyle, nothing changed.

---

## 2026-11-17 — College review in Microcheck; Google search adds year + NCAA (data + code)

**Migration file:** `docs/migrations/20261117_microcheck_college_review.sql` — APPLIED by Claude 2026-11-17 (service role, same statement): task types `boys_college_review` / `girls_college_review` (queue 'college_review', order 15 / 16, on).
- Kyle: "make the college review a micro check — basically have everything in the box". Microcheck deals one college entrant at a time (newest year first) with the whole review card (`src/components/admin/CollegeReviewCard.tsx`, also used on the College page's Review tab): name, college, year / level / weight / place / seed, Google, Not ours, each candidate with This is him, search for someone else. Skip for now and the 10-minute hold work as for other tasks.
- One decision path for both (`src/lib/ncaa/review.ts` decideCollegeEntry): covers the same name at the same college in every year. In Microcheck the decision also writes a completed `microcheck_tasks` row (task_type 'college_review') so it counts on the scoreboard.
- Google: "Name" + college + wrestling + NCAA year + NCAA (Kyle: "add year for ncaa").
- 87 boys entrants waiting at the time.

---

## 2026-11-17 — College display moved to the Aesthetic Tool mock (off the live site until approved) (code)

**Migration file:** none.
- The college pages and profile college parts went live without a mock (mock-first rule). Pulled back the same day: `/boys/college` routes removed; the profile's college bar / NCAA medals / College section render only with `preview.college`.
- Mock: Aesthetic Tool → "New, not live" bar (boys): Colleges list, College page (College id, default Rutgers 91), Wrestler profile · college (College wrestler id, default Anthony Ashnault). Shared components `src/components/site/CollegePages.tsx` (list uses the standard page header) and `CollegeProfile.tsx`; links inside are off in the mock.

---

## 2026-11-17 — College bouts loaded; career carry-over; public college pages + profile college section (data + code)

**Migration file:** none (uses `20261117_college_bouts.sql`, applied).
- `scripts/load_ncaa_d1_20261117.mts` rerun with bouts: 15,383 boys_college_bouts (2000–2026); decisions kept (55); 100 left in review.
- Career carry-over: a year with the same name at the same college as a matched year (within 6 years) is the same wrestler — `saveCollegeYear` for new imports; backfill `scripts/college_carry_career_20261117.mts` (backup `docs/migrations/backups/20261117_college_carry_career_before.json`): 9 years (Ashnault 2019 title — 6 years after HS — Gravina, Ryan Jack ×3, Eric Barnett ×2, Joshua Rodriguez ×2).
- Completeness: 447 of 476 matched college years end the way a bracket must; the other 29 (mostly 2001–2007 printouts, the 2015 pre-finals file) are shown with * "record incomplete" (`recordComplete`, src/lib/ncaa/stats.ts).
- Public (boys site): `/boys/college` (62 colleges, 243 NJ wrestlers: count, All-Americans, titles, years) and `/boys/college/[id]` (bar in the college's colors; each NJ wrestler with high school, NCAA years and places, best finish, AA, record, falls / techs / majors). Cached 5 min per college (`src/lib/ncaa/collegePublic.ts`). Not yet in the site nav (layout change → mock first).
- Wrestler profile (`src/components/site/CollegeProfile.tsx`): a bar per college under the header (college colors, years, best finish, AA count, links to the college page); NCAA medals in the medal case; a College section after high school (NCAA record / falls / techs / majors / AA, then a box per NCAA year with a college-color header and every bout). A college not on our list shows TBD (no printed abbreviations on the site).

---

## 2026-11-17 — College review: decisions cover every year; Google link; Joseph Zargo merged (data + code)

**Migration file:** none.
- Kyle: "if i say no once, it's still no the second time". "Not ours" now applies to the same name at the same college in every year (as "This is him" already did, now also over automatic matches); imports reuse a decision made in any year (`saveCollegeYear`). Backfill `scripts/college_decisions_across_years_20261117.mts` (backup `docs/migrations/backups/20261117_college_entries_before_cross_year.json`): 22 decisions on file, 2 more years settled; 101 left to review.
- Review cards: "Google him ↗" searches "Name" + college + wrestling.
- Kyle: Joey Zargo = Joe Zargo = Joseph Zargo. `scripts/merge_zargo_20261117.mts`: Joey (South River 2016-17, 3 postseason entries) merged into Joe (Bergen Catholic 2017-18 – 2018-19), renamed Joseph; emptied profile kept inactive (delete guard). Backup `docs/migrations/backups/20261117_merge_zargo.json`. His four Wisconsin entries (2022–2026) confirmed. Joe Zargo of Monroe (2012-13 – 2014-15) left as a different wrestler.

---

## 2026-11-17 — College bout readers (both layouts); bouts saved with each championship (code; table pending)

**Migration file:** `docs/migrations/20261117_college_bouts.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: 0 / 0). `{boys,girls}_college_bouts` (winner / loser entry, result as printed, result_type, fall_secs).
- `parseOfficialBouts` (official NCAA layout): a bout's two wrestlers are the names printed between the previous column of bout numbers and its number, inside its box; championship / wrestleback sides kept apart; final and 3rd place from their labels; pigtail = the leftmost lone championship bout, won by whoever is also on a first-round line. Clean (no impossible records, every weight complete) for 2019, 2021–2026 (~640 bouts a year, ~620 with a result). 2017 / 2018: a few flagged; 2015's file stops before the finals.
- `parseStatsBouts` (wrestlingstats printout 2000–2014, 2016): bracket columns each half the one before — the i-th winner came from items 2i, 2i+1 (consolation columns also carry wrestlers dropping in); sideways pages swap axes; byes advance as a bare name; place bouts from "Third Place: … / Fourth Place: …"; pigtail page. A round is used only when its counts line up (no shifted pairings). Most years 530–610 of ~620 bouts; a few weights partial.
- `checkBouts`: nobody over 2 losses (6th and 8th may have 3 — a place bout after elimination), champion unbeaten, bout counts. `resultType` maps printed results (incl. WDF / WBF / MFF codes; a plain score of 8+ = major, 15+ = tech) to dec / md / tf / fall / sv / tb / inj / for / dq.
- Saved by `saveCollegeYear` (bouts tied to the year's entrants); the College upload reads and checks bouts in the browser.

---

## 2026-11-17 — Men's NCAA DI 2000–2026 loaded and matched; College page (Non-NJSIAA → College) (data + code)

**Migration file:** none (tables from 20261117_college_results.sql).
- `scripts/load_ncaa_d1_20261117.mts`: 26 championships (no 2020) into boys_college_events / _entries — 8,378 entrants, 80 places every year (2015 = 2015.pdf entrants + 2015b.pdf places; a weight's places come whole from the file with the most; places attach by name + college across spellings, else last name + college, else the place winner is added as an entrant: 2004 Joe Dubuque, Cory Cooperman; 2008 Cody Cleveland; 2009 James Kennedy; 2015 Michael Kroelis). Every college name recognized.
- Matching (`src/lib/ncaa/match.ts`): graduation year from the profile, else a postseason grade, else last season … first + 3. 'auto' only for the exact full name, the only NJ wrestler with it, 1–5 years after HS (Kyle: 100% matches go in): 437. 'review' (nickname, shared name, 6–7 years from 2020): 142. 7,799 with no NJ candidate. Spot-checked autos: Garay (Rahway → BC), Valenti (Kittatinny → Penn), Dubuque (Glen Ridge → Indiana), Green (Willingboro → Nebraska), Mekhi Lewis (Bound Brook → VT).
- `/admin/{side}/college` (`CollegeClient.tsx`, API `/api/admin/college`): Review (candidates with school, class, years after HS, why; "This is him" also confirms the same name + college in his other waiting years; Not ours; search someone else), Matched (undo), Championships (counts; upload PDFs read in the browser, Save and match; re-import keeps decisions). Flyout: Non-NJSIAA → College.

---

## 2026-11-17 — A profile for every pre-2013 place winner (data + code)

**Migration file:** `docs/migrations/20261117_history_profiles.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: 0 / 0). `history_finishes.wrestler_id`, `history_finishes.school_id`, `wrestlers.origin` ('history'), `wrestlers.history_note`.
- Kyle: "give everyone a profile". `src/lib/historyPeople.ts` groups the 9,554 boys NJ Wrestling History finishes 1934–2012 (State 1–8, Region titles) into 5,055 wrestlers: same school, last name equal or one letter off (R. McKeedy 1941 = Rob McKeeby), first name equal / nickname / initial, within four seasons; transfers (same full name, two schools, ≤4 seasons, never the same year, weight gain ≤ ~30 lb a season; not for common last names or initial-only names). Kyle's calls: Nick Lopez (Williamstown → Washington Twp) is one; Gilliand, Reeves, John Brennan, Jim Smith stay two each with a ★ history_note naming the other.
- `scripts/create_history_profiles_20261117.mts --apply`: 4,978 new wrestlers (origin 'history', inactive, no name links so imports never offer them; 39 with only a last name in the source get first name '?'), 77 linked to existing profiles (careers into 2012-13, incl. initials: BJ Clagon → Bryant Clagon); every finish's wrestler_id + school_id set. Ids in `docs/migrations/backups/20261117_history_profiles_created.json`. Integrity check unchanged.
- Profile page: linked finishes become the medal badges (instead of the name match), school from the latest finish, "Active 1938-39 – 1940-41", ★ note, NJ Wrestling History credit; a profile with finishes but no bouts no longer stops at "No match records found."
- History tabs count multi-time champions by profile (wrestler_id on old finishes): State 4x 5 (Grey, Campolattano, Ashnault, Suriano, Knox), 3x 33 — matches NJ Wrestling History. Fixed on the way: "Freehold" 1934–64 → Freehold Borough; "Thomas Jefferson" → Elizabeth; "Kearney" → Kearny; Sussex Tech (NJ, 1247) added.

---

## 2026-11-17 — Four more history schools connected; their placeholders removed (data + code)

**Migration file:** none.
- Kyle: Burlington = Burlington City (228), North Edison = Edison (178), South Freehold = Freehold Borough (199), Green Brook = Watchung Hills (147) — connected in `src/lib/historySchools.ts` with "Old (New)" labels.
- The inactive placeholders created earlier today (1243 Burlington, 1244 North Edison, 1245 South Freehold, 1246 Green Brook) had 0 references across 19 school-linked tables; backup `docs/migrations/backups/20261117_placeholder_history_schools.json`; deleted by Kyle in the SQL editor with the protected-delete switch (left over: 0).
- Boys history finishes still 12,634 / 12,634 matched.

---

## 2026-11-17 — Old / closed schools in the history connected or added: every boys history finish now has a school (data + code)

**Migration file:** none (rows in `schools`; maps in code).
- Kyle: closed schools "must have folded into new or existing schools, let's connect those"; else keep the old name as an inactive school; a connected one reads "Old name (New school)".
- `src/lib/historySchools.ts`: HISTORY_NAMES / HISTORY_RAW / BY_REGION connect Washington → Warren Hills, Franklin (Regions 1/3, Sussex) → Wallkill Valley, Madison Twp / Madison Central / Cedar Ridge → Old Bridge, Dayton / Dayton Regional / Springfield / Kenilworth → Brearley-Dayton, Bridgewater East/West → Bridgewater-Raritan, Middletown (pre-1975) → Middletown South, Toms River → Toms River South, Wayne → Wayne Valley, West Windsor → WW-P South, Englewood → Dwight Morrow, JFK-Willingboro → Willingboro, Glassboro → Clayton/Glassboro, Woodbury → Gateway/Woodbury, Bogota → Ridgefield Park/Bogota, Palisades Park → Leonia-Palisades, Park Ridge → Emerson-Park Ridge. `historySchoolLabel` gives "Old (New)"; shown in the school Trophy Case (next to the wrestler) and the History tabs. Pinned "Don Bosco" → Don Bosco Prep and "Burlington Twp" → Burlington Township (the new schools made them ambiguous).
- 20 inactive schools (no program rows): Bayley-Ellard 1227, Essex Catholic 1228, Don Bosco Tech 1229, Paterson Catholic 1230, Phillipsburg Catholic 1231, St. Cecilia 1232, St. James 1233, Sacred Heart 1234, Vailsburg 1235, Bergen Tech 1236, Bridgeton 1237, Midland Park 1238, Montclair Kimberley 1239, Newark Central 1240, Pleasantville 1241, Woodrow Wilson 1242; not sure of the successor so kept under the old name: Burlington 1243, North Edison 1244, South Freehold 1245, Green Brook 1246. `scripts/add_history_schools_20261117.mts`.
- Result: boys history finishes matched to a school 12,634 / 12,634 (was 12,018); girls unchanged (1,932 / 1,934). Caches bumped (tournament-history-v5, pre-record-finishes-v2, boys-team-history-v3). Checked live: Warren Hills Trophy Case shows 125 "Washington (Warren Hills)" rows.

---

## 2026-11-17 — College results: tables, D1 college list, NCAA PDF readers

**Migration file:** `docs/migrations/20261117_college_results.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: all empty). Colleges loaded: 104, 226 aliases. `colleges` + `college_aliases` (shared), `{boys,girls}_college_events`, `{boys,girls}_college_entries` (entrant, college, seed, record, place 1–8, match to our wrestler with status auto / review / confirmed / not_ours / none). Separate from the NJSIAA tables.
- Readers `src/lib/ncaa/parse.ts` for the three layouts of the men's D1 PDFs (wrestlingstats printout 2000–2014/2016; official NCAA 2015, 2017–2019, 2021–2026; a 2024 two-page variant) + `src/lib/ncaa/corrections.ts` (places the files lack: 2016 141 7th Joseph Ward; 2017 184 6th Nolan Boyd; 2018 133 4th Luke Pletcher, 6th Scott Delvecchio — Kyle). All 26 years read: entrants + 80/80 places (2015 places from 2015b.pdf).
- College list `src/lib/ncaa/colleges.ts`: 104 colleges covering all 205 names / abbreviations in the files; colors filled by Claude from each school's official set, for Kyle to check (colors_checked). Loader `scripts/load_colleges_20261117.mts` (after the migration).

---

## 2026-11-17 — Profile header: status note under the name; "Wrestled 2024-2026" for a wrestler who has passed away (code only)

**Migration file:** none.
- Kyle: move Chase Sudano's note under his name in the header, and show "Wrestled 2024-2026" in place of his grade. `WrestlerHeader` takes `note` (italic, under the name) and `activeText` (replaces the grade line); `WrestlerProfileCore` passes them — for status 'deceased' the grade is dropped and the line reads "Wrestled <first season start year>-<last season end year>". Checked live: Chase Sudano | Gone too early, Chase's energy will be missed. | Wrestled 2024-2026.

---

## 2026-11-17 — Statuses set: Jackson Weller out for 2026-27; Chase Sudano deceased with profile note (data)

**Migration file:** none.
- `scripts/set_statuses_20261117.mts` (backup `docs/migrations/backups/20261117_weller_sudano_status.json`): Weller → out_for_season (2027); Sudano → deceased, inactive, note "Gone too early, Chase's energy will be missed." Neither was on a saved board (0 pulled).
- Checked: Weller not on the boys 157 Central board; Sudano not on 126 South; the note shows in italics on Chase's live profile. "Deceased" appears nowhere on the public site (only status_note is read there).

---

## 2026-11-17 — Wrestler status (out for season / deceased); Whiz Rank follows transfers and statuses

**Migration file:** `docs/migrations/20261117_wrestler_status_whiz_notices.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: 0 statuses, 0 notices). `wrestlers.status` ('out_for_season' | 'deceased'), status_season_id, status_note, status_set_at/by; new `whiz_rank_notices`.
- Kyle: Jackson Weller (Delran) likely out for the season → off the boards completely; Chase Sudano (St. Augustine) passed away → note "Gone too early, Chase's energy will be missed." in italics on his profile. (Statuses to be set once the migration runs.)
- Admin wrestler page: Status section (Normal / Out for the season / Deceased + public note). Out for season = this season only; deceased also sets is_active false. Public profile shows status_note in italics under the header.
- Whiz Rank boards: a logged transfer is the wrestler's school right away (no ratings run); out-for-season (that season) and deceased wrestlers are left off. `pullFromBoards`: a transfer to another section, or a status, takes the wrestler off every unpublished week's saved board (ranks below move up; a submitted board reopens and the week stops being ready) with a notice on that board — and for a transfer, on the new section's board ("place him"). Notices clear when the board is submitted; the weight grid marks boards with notices (!). Published weeks unchanged.

---

## 2026-11-17 — Review of the rating-school fix: season sources first; 20 rows' section / group / conference filled (data + code)

**Migration file:** none.
- Data check: all 604 filled schools match the school on that wrestler's own 2025-26 bouts (none had bouts at 2+ schools).
- Code (`recalculate-hammer-scores`): (1) the season's in-season tournament bouts are now a school source (latest tournament's school), right after duals / transfers / last season; (2) the current-school lookup (`schoolIdsOfWrestlers`) moved to the very end, after postseason entries, so a past-season run can't give a since-transferred wrestler their new school; (3) every school found after the first pass gets its section / group / conference (schools from postseason entries used to get none).
- Data: `scripts/fill_rating_school_attrs_20261117.mts` filled section / classification / conference on 20 2025-26 rows that had a school but none of the three. Backup `docs/migrations/backups/20261117_rating_rows_without_section.json`. Integrity check unchanged.
- Not run end to end: the next ratings run (manual, or nightly from 12/7) is the first to use the new order.

---

## 2026-11-17 — Ratings without a school filled (604 rows); ratings run falls back to the site's school lookup (data + code)

**Migration file:** none.
- 290 rated 2026-27 wrestlers (191 boys, 99 girls) had no school, carried from their 2025-26 rows (314 more), so they sat on no Whiz Rank board. Cause: the ratings run takes a school from duals, transfers, last season's row and postseason entries, never from in-season tournament bouts. All had name links; top WRR 26.5.
- Code: `recalculate-hammer-scores` now fills anyone still without a school from `schoolIdsOfWrestlers` (transfer → roster row → latest bout → name link) before resolving section / group / conference.
- Data: `scripts/fill_rating_schools_20261117.mts` filled school_id + conference / section / classification on the 604 rows (2025-26 and 2026-27) the same way, no rerun. Backup `docs/migrations/backups/20261117_rating_rows_without_school.json`. After: 0 rows without a school in either season; integrity check unchanged from the 2026-11-16 baseline.

---

## 2026-11-17 — Non-Public schools' locale sections set (data)

**Migration file:** none (column from 20260909_snapshot_schema.sql).
- Kyle approved 8 per section: North I — Don Bosco, Bergen Catholic, St. Joseph (Montvale), Saddle River Day, DePaul, Pioneer Academy, Mary Help of Christians, Pope John; North II — St. Benedict's, St. Peter's Prep, St. Mary (Rutherford), Seton Hall Prep, Delbarton, Pingry, Newark Academy, Paramus Catholic; Central — Notre Dame, St. Thomas Aquinas, St. Joseph (Metuchen), Red Bank Catholic, St. John Vianney, Christian Brothers, Immaculata, Rutgers Prep; South — Camden Catholic, Gloucester Catholic, Paul VI, St. Augustine, St. Joseph (Hammonton), Holy Spirit, Donovan Catholic, Holy Cross. Chosen by town / county / wrestling region against public schools' sections. `scripts/set_np_locale_sections_20261117.mts`, backup `docs/migrations/backups/20261117_np_locale_sections.json` (all were empty).
- Readers: Whiz Rank sections (`schoolSections`), the daily report (`effectiveScope` in src/lib/snapshot/compute*.ts).
- Checked: boys 120 boards — North I 103 (JoJo Burke, St. Joseph Montvale, #1 by WRR), North II 102 (Cameron Sontz, Delbarton), Central 105, South 103. Still off every board: 2026-27 rating rows with no school (191 boys, 99 girls; 7 at boys 120).

---

## 2026-11-17 — Publisher hourly; Whiz Rank off-season rank from the Off-Season board; week-12/7 migration fixed

**Migration file:** `docs/migrations/20261117_ranking_week_dec7.sql` corrected (the first version re-added the 1–20 cap before renumbering, so +100 failed; it rolled back). The cap now goes back on after the renumbering. APPLIED 2026-11-17.
- Publisher cron `/api/cron/publish` now hourly at :00 (Kyle: "60 minutes late is fine"); 8 AM events still go at 8:00.
- Whiz Rank Off-Season rank = place on the Off-Season board's weight list (Kyle's saved order from the Offseason Hub "Public board" tab, then by score; `loadOffseasonBoard`, cached) — no recalculation, so a board loads fast.

---

## 2026-11-17 — Whiz Rank: first week 12/7; Non-Public by locale section; notable wins/losses

**Migration file:** `docs/migrations/20261117_ranking_week_dec7.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: 10 weeks per side, 12/7 8:00 → 2/8 8:00 ET). Adds week 1 = 12/6 (publishes Mon 12/7 8 AM ET) per side, renumbers the rest 2–10, week cap 1–20. No 2026-27 rankings saved (checked: 0 rows in individual_rankings / individual_ranking_completion for those weeks).
- Sections (`schoolSections`): a Non-Public school ranks in its `schools.locale_section` (the rule the daily report uses), not by region. All 32 Non-Public schools have it empty today → their wrestlers aren't on any board yet; the board shows how many (e.g. boys 120: 35).
- Row drop-down: record for the 7 days before the ranking; up to 3 notable wins (strongest opponents beaten, last 20 rated bouts) and 3 notable losses (furthest below expectation, last 20).
- Off-Season rank ignores a score of 0 (wrestled, never placed).
- Tested on live data: boys 120 North I (97 rated, WRR order), girls 120 North (87).

---

## 2026-11-17 — Article Hub + Whiz Rank plumbing; publisher cron; CRON_SECRET set

**Migration file:** `docs/migrations/20261117_article_rankings_hubs.sql` — **APPLIED** in the Supabase SQL editor 2026-11-17 (check: 0 events each side, every week has a publish time, first 2026-12-14 08:00 ET). New `boys_article_events` / `girls_article_events`; `{g}_articles.event_id`, section check adds 'north' (girls North/South), article_type adds 'rankings', 'feature'; `individual_ranking_weeks` gets publish_at (Monday 8 AM Eastern), ready_at, ready_by, published_at.
- Kyle's plan (2026-11-17): season competition starts 12/7; preseason articles 11/30–12/6; match-day articles 8 AM the day after a match day; Whiz Rank weekly, published Monday 8 AM; top 25 per weight × section (boys North I / North II / Central / South, girls North / South).
- `CRON_SECRET` added in Vercel (Production). New cron `/api/cron/publish` every 5 minutes (`src/app/api/cron/publish`): publishes ready article events and ready ranking weeks at their time; an article event not ready by then is marked missed. The nightly ratings/leaderboard crons skip themselves before the season's start date (`src/lib/cronGuard.ts`); manual runs unaffected.
- Article Hub (`src/lib/articleHub.ts`, `/api/admin/article-hub`, `/admin/{side}/content/article-hub`, flyout Articles → Article Hub): events (preseason week + ranking weeks created by "Create automatic events"; features by hand; match-day events will come from the master schedule), each section saved (finalized), then the whole article (ready); red Emergency Extension = a new time picked by hand.
- Whiz Rank (`src/lib/whizRank.ts`, `/api/admin/whiz-rank`, Rankings Hub → Whiz Rank tab, first): board per week × weight × section from `wrestler_hammer_scores` (2026-27), order saved → previous week → WRR; columns Whiz, last week (movement), WRR rank in the board + score, last season district/region/State place, Off-Season Hub rank at the weight; Save / Submit (individual_rankings stage 'section' + individual_ranking_completion) → week ready when all weights × sections are in. Row drop-down: the week's record (Sunday back 6 days) and the last 10 rated bouts — opponent, opponent Whiz Rank, opponent WRR before the bout, expected result (getExpectedOutcomeRank on the WRR gap), actual, above / below / as expected. Sections: boys public schools by their section, Non-Public by region (1–2 North I, 3–4 North II, 5–6 Central, 7–8 South); girls by region (North I/II = North, Central/South = South; 2025-26 alignment until 2026-27's).
- Old Individual Rankings tab renamed "Old Individual Rankings".

---

## 2026-11-17 — Wrestler profile medal badges: one row per season, colored by level (code only)

**Migration file:** none.
- Kyle: each year's awards on their own row; district badges light gray, region navy, State unchanged (gold). `WrestlerProfileCore.tsx` placements section: rows newest season first; in a row districts, regions, State, then ⚡ awards. Region navy = #16284A (the site's State Tournament tile navy). Checked live: Cameron Sontz ('26, '25, '24 rows: D → R → State).

---

## 2026-11-17 — Wrestler profiles: every postseason-only season starred (code only)

**Migration file:** none.
- Kyle: the ★ "postseason results only" note named only 2024-25, but every Playoff History season before it is postseason only too. `WrestlerProfileCore.tsx`: ★ on every season up to and including the first regular season on file (2024-25), and the note gives the wrestler's range ("★ 2023-24 to 2024-25: postseason results only."). The "Records begin with 2024-25" line now shows only when no earlier history seasons exist. Checked live: Cameron Sontz.

---

## 2026-11-16 — Tournament Rollover % = last season's tournaments rolled over or not returning; Hub "Not returning"

**Migration file:** `docs/migrations/20261116_tournament_not_returning.sql` — **APPLIED** in the Supabase SQL editor 2026-11-16 (check: 0 boys, 0 girls marked). Adds `not_returning_at` to `in_season_tournaments` and `in_season_tournaments_girls`.
- Kyle: the preseason Tournament Rollover % should be the share of last season's tournaments rolled over. Since some never come back, a Hub "Not returning" mark counts too: % = (rolled over + not returning) / last season's tournaments (`rolloverStatus` in `src/lib/tournamentSlate.ts`). Boys 2026-27 today: 44 of 74 = 59%; girls 0 of 37.
- Hub "Not set up" rows: Not returning button; a rollover line with the % and a "show not returning" list with Undo. PATCH action `not_returning` {prior_id, on}.
- Replaces the earlier "pasted schedule set up" % (always 100% right after a paste).

---

## 2026-11-16 — "Roll Over Tournaments" removed from the preseason task list (data + code)

**Migration file:** none (rows only).
- Deleted the two `admin_tasks` rows with process_key `tournament_rollover` (boys, girls; never completed). `scripts/remove_rollover_tasks_20261116.mts`, backup `docs/migrations/backups/20261116_rollover_tasks.json`. The task's workspace (`TournamentRolloverWorkspace`) is removed. The preseason % "Tournament Rollover" stays (registry tournaments set up).

---

## 2026-11-16 — Roll Over Tournaments retired; preseason Tournament Rollover % is real (code only)

**Migration file:** none.
- Removed `/admin/[side]/tournaments/rollover` and `/api/admin/tournament-rollover` (Kyle agreed: the Registry paste + Tournament Hub do the job, and the old tool never wrote registry rows, so its tournaments were missing from the Hub). The preseason task "Tournament Rollover" now opens the Tournament Hub; dashboard/preseason links point to the Hub.
- Preseason Tournament Rollover % = the preseason season's registry tournaments linked to a tournament in our system (was hard-coded 0). Boys 2026-27: 50/50 = 100%. Girls: 0 until their schedule is pasted.

---

## 2026-11-16 — Tournament Hub: merge a New tournament into last season's; boys hub without jamborees (data + code)

**Migration file:** none (uses `prior_id` from 20261116_tournament_prior_edition.sql).
- Data: 2026-27 "Gary Vittorio Holiday Classic" linked as this season's edition of 2025-26 "Parsippany Hills Holiday Tournament" (Kyle: same tournament); settings copied (inside, full_bracket, 1 pt); name and dates kept. `scripts/merge_vittorio_parsippany_20261116.mts`, backup `docs/migrations/backups/20261116_merge_vittorio_parsippany.json`. Boys 2026-27: 44 Active, 6 New.
- Hub: clicking a **New** badge opens a search of last season's tournaments not set up yet; picking one merges (PATCH `merge_prior`: prior_id + last season's settings; this season's name and dates kept).
- WRR: a tournament linked by prior_id takes its first edition's name as its key, so a renamed edition counts as the same tournament (`recalculate-hammer-scores`).
- Boys hub: type filter, Type column, jamboree count and the detail page's Event Type field hidden (girls keep them).

---

## 2026-11-16 — Tournament slate: schedule paste matches our tournaments; Hub marks Active / New / Not set up

**Migration file:** `docs/migrations/20261116_tournament_prior_edition.sql` — **APPLIED** in the Supabase SQL editor 2026-11-16 (check: 0 boys, 0 girls linked). Adds `prior_id` (last season's edition) to `in_season_tournaments` and `in_season_tournaments_girls`.
- Kyle: the registry paste should match each event to the tournament already in our system and create the ones that aren't; the Tournament Hub lists the season's tournaments and marks which are active for the new year, which are new, and which haven't been set up yet.
- `src/lib/tournamentSlate.ts`: `matchSlate` scores names (year/edition dropped, "Ironman" = "Iron Man", one distinctive shared word = candidate) plus dates (last season + 364 days: near = boost, a month off = penalty), each of our tournaments used once; ≥70 picked, 40–69 suggested only. Kyle's 51-event 2026-27 boys list: 41 picked, 2 suggested (Marinelli EHT, Escape Gloucester County Cell Block), 8 new. `applySlate` saves registry rows linked to this season's tournaments; a matched event becomes a new edition with last season's settings and name (so WRR's name key keeps linking) and `prior_id`; new events are created from the paste (is_oos from the state). Girls jamborees: registry only.
- Registry preview: "In our system" column (New / Active / Set up, dropdown to change, "Same as …?" for suggestions). API `/api/admin/tournament-registry` POST `{action:'match'}` and `{rows}`.
- Tournament Hub: a column for the season (Active / New), filter This season / Active / New / Not set up, and a "Not set up for <season>" list of last season's tournaments with no edition this season (Set up = copy with dates +364 days).
- Tournament Rollover: sets `prior_id`; fixed its boys list (it asked for a `gender` column the boys table doesn't have, so the boys list came back empty).

---

## 2026-11-16 — Tournament Registry paste: boys have no jamborees; dates with years read on every line (code only)

**Migration file:** none.
- Boys side: no jamboree type (paste saves every boys event as a tournament; type filter and jamboree count hidden). Girls unchanged. No boys rows were jamborees (73 boys 2025-26 rows, all tournaments).
- `parseEventList.ts`: event lines read "12/12/2026 - Name, ST", "12/11 - 12/12/2026 - Name, ST" and the older "12/12 — Name, ST"; a start date without a year takes the end date's year (Dec–Jan wraps), a line without any year takes the season of the lines before it, and a bad year ("02/14/202") counts as none. Kyle's 51-line 2026-27 boys list: 51/51 read with correct dates.
- Import skips events already on the list (same name, start date, side, season) and says how many it skipped.

---

## 2026-11-16 — Transfers tool replaces the transfer scan; boys_transfers / girls_transfers

**Migration file:** `docs/migrations/20261116_transfers.sql` — **APPLIED** in the Supabase SQL editor 2026-11-16 (check: 0 boys, 0 girls rows; pending_wrestler_transfers dropped).
- Kyle: "search existing wrestlers, change their team and it will get logged as a transfer for this season ... keep the list running for the season and then it will complete at the end of the season and we will have the list for each year."
- New tables `boys_transfers` / `girls_transfers` (season_id, wrestler_id, from_school_id, to_school_id, link_added, notes, created_by). A season's list is open while `season_gender_state.stage` isn't 'archived'; archiving the season completes it (read-only). Transfers go to the newest open season (2026-27 now).
- Logging a transfer adds the wrestler's name link (`wrestler_name_aliases`) at the new school, so the next upload there matches the same profile; never over a namesake's link. Undo (open season only) removes that link unless they already have bouts there.
- Readers of the new team: `schoolsOfWrestlers` / new `schoolIdsOfWrestlers` (`src/lib/hubSchools.ts`: a transfer beats a roster row from the same season or earlier), the preseason ratings run (no bout yet this season → rates at the transfer school), the admin wrestler page (the school dropdown there is replaced by a link to Transfers).
- Tool: `/admin/{boys,girls}/wrestlers/transfers` and the preseason task "Complete Transfers" (`TransfersTool.tsx`), API `/api/admin/transfers`.
- Removed: the automatic scan (`/api/admin/wrestler-transfers`, `/wrestlers/pending-transfers`, the Data Health "pending transfers" check). `pending_wrestler_transfers` (411 unreviewed flags) is dropped by the migration; backup `docs/migrations/backups/20261116_pending_wrestler_transfers.json`. `wrestlerDelete.ts` and the merge/delete scripts now list the new tables.
- Until the SQL runs: the tool says to run it; everything else skips the missing tables.

---

## 2026-11-16 — NJ Wrestling History only fills gaps: Team History and Trophy Case use our brackets (code only)

**Migration file:** none.
- Kyle: njwrestlinghistory.info "only fills in gaps for years we don't have bracket info"; every season we have, and all future ones, come from our uploads.
- Team History (`src/lib/teamHistory.ts`): boys champions come from our team brackets for every season with confirmed `playoff_seeds` (`boysTeamChampions`: a sectional champion is the team unbeaten in the meets between its seeds; a group's state champion is unbeaten in cross-section meets within the group — some 2025-26 playoff-flagged meets fall after the finals, so "last meet" picked wrong teams). `history_team_titles` only for earlier years; credit reads "Team champions before 2025-26 are from NJ Wrestling History". Checked: 27/27 of our 2025-26 champions match NJ Wrestling History's 2025-26 list.
- Trophy Case (`src/lib/trophyCase.ts`): boys state podiums and region titles from our `placements` for every season we have them (2012-13 on); NJ Wrestling History rows only for earlier years. Team titles: ours, then NJ Wrestling History before them. Girls history rows (TrackWrestling, not NJ Wrestling History) unchanged.

---

## 2026-11-16 — Team Post Season History tab; girls team State tab (code only)

**Migration file:** none.
- Boys Team Post Season: Brackets / History tabs. History (`/postseason/team?view=history&grp=…`): one tab per group (1–5, Non-Public A, B); rows State, then the sectionals; years across the top, scrolling sideways like Champions by Weight. From `history_team_titles` (NJ Wrestling History, credited), schools matched as on the Trophy Case (`src/lib/teamHistory.ts`, cached 1 h). Year alignment checked: 2026 South Group 2 = Lower Cape May, matching our 2025-26 bracket.
- Girls Team Post Season: Brackets / History tabs; the bracket view's tabs are now State / North / South (State = the final and both brackets), so North or South can go back. History: State, North, South champions from our girls team brackets (2025-26 only on file).
- Components: `src/components/site/TeamHistory.tsx`; `GIRLS_TEAM_SEASONS` exported from `src/lib/girlsTeamBracket.ts`; `TeamBracketClient` takes `viewTabs`.

---

## 2026-11-16 — State page Quickest Deck / Tech: State tournament only (code only)

**Migration file:** none.
- The boys and girls State pages' Quickest Deck and Quickest Tech read the State tournament's own matches (`stateQuickest` in `src/lib/stateData/shared.ts`), not the lb_p_* / lb_gp_* "state pool" (every postseason match of state qualifiers). Kyle: "since this is the state tournament page, it should just show that tournament."
- The Terminators stay the whole postseason, now noted "Total Postseason Mat Time (districts, regions and State)".
- Region and district pages already read only their own tournament (region_/district_fastest_* RPCs); unchanged.
- Verified live: girls 2025-26 Quickest Tech is Eliza Toth 1:35 (matching the History tab), no longer Neldju Alfred's 0:37 from Region 11.

---

## 2026-11-16 — Boys school pages slow (~2 s a click): Trophy Case cache fixed (code only)

**Migration file:** none.
- Cause (from the Vercel logs): the boys Trophy Case index (every school at once) is 2.46 MB, over Next's 2 MB data-cache limit, so it was never saved and every boys school page view — each tab click, each school opened — rebuilt it ("items over 2MB can not be cached"). Girls was under the limit.
- Fix (`src/lib/trophyCase.ts`): each school's Trophy Case is cached on its own (5 min); the index is built at most once per server instance per 5 minutes.
- Verified: /boys/schools/276 tabs went from ~1.9–2.6 s to ~0.25–0.3 s; no oversized-cache warnings from the new deployment.

---

## 2026-11-16 — Wrestler stats board leaderboard ranks; multi-time champs order (code only)

**Migration file:** none.
- Wrestler profile stats board: WRR, Pins, Tech Falls and Bonus % show "#N State" when the wrestler is top 25 in the state that season, else "#N <section>" when top 25 in their school's section (Kyle). Read from `lb_rs_wrestler` (the Leaders page table) in `src/lib/wrestlerStatRanks.ts`, ordered as the Leaders page orders (ties on pins/techs to the faster average; bonus % min 5 matches); ties share a rank. Cached an hour.
- History tab Multi-Time Champs: state lists go from the first to reach the count to the most recent; region and district lists go most recent first (by the year of the last title).
- Verified live: Braeden Valley Pins "#1 State"; Andrew Avent (41st in the state on pins) Pins "#10 North II".

---

## 2026-11-16 — Power Points ties go to the team further in the playoffs (code only)

**Migration file:** none.
- When two schools have the same Power Points, the one with more team-playoff wins ranks first (Kyle). If those are equal, the winner of their playoff meeting ranks first. Playoff results come from `dual_meets` / `dual_meets_girls` with `is_playoff`.
- Applies to the section/group lists (`buildPowerPointStandings`), the girls North / South / Non-classified lists, the Groups page, and the school profile's Power Rankings box. Official points are unchanged; only the order of ties changes.
- 2025-26 boys had 11 such ties. For example, South Group 2: Lower Cape May (4 playoff wins) now ranks ahead of Collingswood (2), both at 43.00.

---

## 2026-11-16 — School profile Power / Conference Rankings boxes; Aesthetic Tool shows live features (code only)

**Migration file:** none.
- **Power Rankings box:** shows the school's place in its section/group Power Points list (e.g. "1st / 14 · North II Group 4"), linking to that list.
  - Girls use the North / South / Non-classified lists.
  - Same data and order as the Sections page (`power_points`, official figures).
- **Conf. Rankings box:** shows the place in its conference division (e.g. "3rd / 5 · Shore Conference · Division B"), linking to the conference page. Same order as the conference page: division record, then overall record, then points for.
  - Girls have no conference standings on file yet, so the box shows "—".
- Both boxes use the page's season (`src/lib/schoolRankBoxes.ts`).
- **Aesthetic Tool:** the banner listing Insight · Off-Season, School Trophy Case, and the wrestler offseason table and match order now reads "Live on the site". All three have been live since 2026-11-14.

---

## 2026-11-16 — Playoff History seasons switched on; ghost badges in History; wrestler stats board

**Data change (no schema):** `scripts/publish_history_seasons_20261116.mts --apply` (Kyle: "you can make the hidden season visible").
- `season_gender_state.history_public = true` for all 18 loaded history seasons: boys 2013–2024, girls 2019–2024. Same as the Playoff History tool's switch.
- Backup: `docs/migrations/backups/20261116_season_gender_state_history.json`. **Reversible?** Yes: set `history_public` back to false, or use the tool's switch.
- Integrity check before and after: the same 2 known failures (Delsea dual score, 36 same-name pairs).

**Code:**
- **Champions by Weight and weight podiums:** 👻 on a champion seeded 5th or lower, the same rule as the brackets. `HistPlacer.seed` comes from `tournament_entries`; cache key `tournament-history-v4`.
- **Wrestler profiles:** a stats board under the header for the latest season on file: Record, WRR, Pins, Tech Falls, Bonus %, with "· postseason only" for the first season and Playoff History years. The WRR is the newest row, since it carries across seasons.
- **WRR reads on profiles:** `wrestler_hammer_scores` returns no rows to the anon key, so the profile now reads only `season, hammer_score` with the service role. This also fixes the upset-win marks, which never showed for visitors.

---

## 2026-11-16 — All-time boys champions in History; dead YouTube videos hidden; start-year notes (code only)

**Migration file:** none.
- **Boys region and state History tabs** now include the years before our brackets, from `history_finishes` (NJ Wrestling History): state from 1933-34, regions from 1960-61.
  - Champions by Weight and Leaders include those years.
  - Weight pages show those podiums.
  - The state page has a new State Champions by School table (all schools: count, first, latest).
  - Schools are matched as on the Trophy Case (`historyFinishSchools`). A closed school that isn't one of ours shows the name NJ Wrestling History uses (e.g. Washington, Dayton Regional, Essex Catholic). Old heavyweight shows as "Hwt" in the 285 row.
  - Every table that uses those years credits <NjwhLink>.
  - Those years show to every visitor (not limited by the hidden-season switch, which covers 2013 on).
  - Cache key `tournament-history-v3`.
- **"Goes back to 2012-13" notes** on boys History tables drawn only from our brackets: Team Champions, High Scores, Quickest, team titles, district tables, and district weight podiums.
- **YouTube:** `src/lib/youtubeAvailable.ts` asks YouTube's oEmbed endpoint, checked once a day per video. A removed, private or embed-blocked video is left off:
  - region pages (all 8 region streams on file, 2025-26, were gone and are now hidden);
  - the Home Video, which skips to the latest earlier video that still plays.
- **District and region pages:** the "Brackets, placewinners and team scores" summary line is removed (`hideSummary`).
- **History tab layout (Kyle, later the same day):**
  - "Goes back to …" now sits under each table's title rather than below the table.
  - "{State|Region|District} Champions by School" appears on every level: 10 rows, then 20 more per click.
  - Multi-Time Champs has 4x / 3x / 2x tabs, 10 rows then 10 more per click (`src/components/site/HistoryLists.tsx`).
  - The redundant Individual Champs leader table is removed.

---

## 2026-11-16 — Girls region history by name; "No Pins" / "No Techs" (code only)

**Migration file:** none.
- **Girls region History tab and weight-page history** now follow the region's name, not its number. The numbers moved in 2025-26, when Central became 1. The 2018-19 to 2021-22 North region counts as North I (Kyle). So:
  - North I and South have every year since 2018-19;
  - North II and Central start in 2022-23.
- The history tabs are the season's four regions, the same as the bracket tabs; the old "R5" tab is gone. `tournamentHistory(..., regionName)`, cache key v2.
- **Empty Quickest Deck / Quickest Tech boxes** (district, region and state pages, and the History tab's by-year table) say "No Pins" / "No Techs" instead of "No data" or a dash.

---

## 2026-11-16 — Vercel firewall: more crawlers blocked, cloud scrapers challenged (no database change)

**Migration file:** none (Vercel firewall, published with Kyle's approval).
- **Why:** a check a week after the 2026-11-09 block. That rule had stopped Amazonbot, PetalBot, Semrush, the OpenAI bots and others (about 11,250 requests denied). Daily requests fell from 22–42k to 10–13k, and CPU fell from 19–37 to 10–12 min/day. Two things were still getting through:
  - Amzn-SearchBot: 12,840 requests in 4 days, not matched by "Amazonbot".
  - Scrapers on Tencent, Huawei Cloud and Alibaba Cloud: about 24k requests in 7 days, all following internal links, with rotating fake Chrome names.
- **Rule "Block AI and data crawlers" (deny):** added Amzn-SearchBot, meta-webindexer, BacklinksExtendedBot, ExaSearchBot, ExaUser and Exabot to the user-agent regex.
- **New rule "Challenge cloud scrapers" (challenge):** AS numbers 132203 and 45090 (Tencent), 55990 (Huawei Cloud) and 45102 (Alibaba). It challenges rather than denies, so a real person on a VPN can still get in. Amazon's network is deliberately not included, since it also carries legitimate link-preview fetchers.
- **Verified:** Amzn-SearchBot gets 403; Googlebot and a normal browser get 200.
- **Reversible?** Yes: `vercel firewall rules update/remove`, then `firewall publish`.

---

## 2026-11-14 — Daily Challenge Seeds tab (code only)

**Migration file:** none.
- New Seeds tab: every seed with its best finish, how many times that seed reached it, and the top 3 finishes from that seed (best place, then the most recent).
- It covers States, Regions and Districts. Seeds are on file for every state bracket, and for districts and regions in the most recent seasons.
- `/api/admin/history/bouts` now also sends `placed`: every placer with a seed, read from `placements` and `tournament_entries.seed`. The cache key is now v2.

---

## 2026-11-14 — History wrestler profiles for admins, years active, year wrestler search (code only)

**Migration file:** none.
- Wrestler profiles:
  - Admins now see hidden Playoff History seasons, and so does a `REVIEW_HIDDEN_SEASONS` preview (`canSeeHiddenHistory` in `src/lib/get-season.ts`). Visitors still see only switched-on seasons.
  - A wrestler with no grade on file shows "Active 2012-13 – 2015-16" under their name (`WrestlerHeader` `active`).
- Individual Post Season page:
  - New "Find a Wrestler" box (`YearWrestlerSearch.tsx`, `/api/postseason/wrestlers`). It searches everyone entered in that year's districts, regions and states.
  - Later the same day (Kyle): the box became a "Search wrestlers" bar beside the year picker, shown only for past years. The page's description under the picker was removed (`StdHeader` `hideSummary`).
  - Each result shows school (the school's name that season), furthest event and place, and links to the profile.
  - A hidden season answers only admins.

---

## 2026-11-14 — Three history finishes get their schools; Trophy Case level tabs; Daily Challenge bout tabs

**Migration file:** none.
- `history_finishes`: the three rows with no school get the schools Kyle named (`scripts/history_missing_schools_20261114.mts`, backup `docs/migrations/backups/20261114_history_missing_schools.json`):
  - id 3279 Rob Jimenez 2000 → Brick Memorial
  - id 3106 Dave Castellini 1998 → Buena
  - id 53 L. Valenti 1938 → Roselle Park
  - Readers: Daily Challenge tabs, Trophy Case.
- Trophy Case Individual has four tabs: All, District Champs, Region Champs, States.
- Daily Challenge:
  - The "listed as" note is gone; each school shows one spelling.
  - New tabs (`BoutsTabs.tsx`, `/api/admin/history/bouts`, admin only, cached an hour):
    - **Pins & Techs:** every fall and tech fall at districts, regions and states with its time, counted by wrestler, school, year, weight, event or bout.
    - **Low-Seed Champs:** state champions by seed, sortable by weight. It reads `placements` place 1 plus `tournament_entries.seed`.

---

## 2026-11-14 — Playoff History placements (1st–8th) from the placing bouts

**Migration file:** none (data insert, `scripts/history_placements_20261114.mts`; added ids in `docs/migrations/backups/20261114_history_placements_added.json`).

Kyle's hidden-year review: those years' playoff pages had no State Champions, because only the live seasons had rows in `placements`.
- 29,085 rows were added for every loaded history season (boys 2012-13 to 2023-24, girls 2018-19 to 2023-24). Per weight: the final's winner and loser are 1st and 2nd, then the 3rd_Place, 5th_Place and 7th_Place bouts. The dry run found no conflicts, so no weight was skipped.
- 2012-13 District 24 has no bouts, so it has no rows; its podium stays in `history_podiums`.
- Readers:
  - `state_champions` (overview State Champions)
  - `ghost_champions`: state-level ghosts now show for history years. Only the state brackets carry seeds there.
  - `district_wrestler_points`
  - `tw_boys_entry_points`: same place as its placing-bout fallback, so totals are unchanged and stored team totals were not recalculated.
  - Season report and freshman hub.
- Code: `buildPlacements` in `src/lib/playoffHistory/load.ts`. Load now runs it, and Unload deletes a season's placements before its entries.
- Reversible: delete the ids in the backup file (protected-delete guard, so in the SQL editor).
- Verified: integrity check unchanged (only the 2 known failures). State Champions appear on every history year (preview check).

---

## 2026-11-14 — Hidden-year page fixes, team-score note, Explorer school names (code only)

- Post Season overview:
  - Counts a district that has only a podium on file (2012-13 District 24 → 32 buttons).
  - History years show names without today's grade (`withoutGrade`, also on the state page).
  - The state button now reads "State Tournament".
- Boys district page:
  - A podium-only year shows team scoring and placements only, with no bracket tiles, leaders or Bracket Buster.
  - 2020-21 says there were no districts instead of showing empty boards.
- Girls district pages follow the Post Season year pick. The picker lists only years with girls districts, and the pages have the back link.
- Team Scoring cards and the Postseason Point Leaders note: "Team scores before 2024-25 are calculated from match results and don't include team point deductions." The cards show it when their totals are `source = 'calculated'` (`src/lib/teamScoreNote.ts`).
- `src/lib/historySchools.ts` (Daily Challenge Explorer: the same school listed several times):
  - The source's typos now map to our schools (Audobon, Phillpsburg, Pt. Beach, St. Joe's Montvale, …).
  - Renamed schools map too (East Paterson → Elmwood Park, Edgewood → Winslow, Monsignor Donovan → Donovan Catholic, Clark → Johnson, Berkeley Heights → Governor Livingston).
  - Historic schools get one spelling each.
  - Corrections:
    - "Washington" 1938–71 (Regions 1–3) is Washington (Warren County), not Washington Township; 125 finishes are off WT's Trophy Case.
    - "Madison Twp" 1972–76 is Old Bridge, not Madison.
    - A bare Franklin in Regions 1/3 is Franklin (Sussex).
    - A bare Manchester is Manchester Township.
  - `historyFinishSchools` is shared by the Explorer API and the Trophy Case. A state finish's region-title fallback is now limited to the name's own candidate schools.
  - The Explorer API sends the merged name and keeps the original as `school_listed` (shown as "listed as").
  - Boys go from 533 spellings to 350 schools.
- `src/lib/get-season.ts`: `REVIEW_HIDDEN_SEASONS=1` lets a preview deployment show hidden seasons for review. It only works when `VERCEL_ENV === 'preview'`, so it does nothing in production.

---

## 2026-11-14 — 2012-13 boys District 24 official team scores

**Migration file:** none (data insert, `scripts/district24_2013_team_scores_20261114.mts`).

Kyle 2026-11-14 copied the standings into `History/2013/District 24 Brackets/Team Scores.rtf`.
- 11 rows into `precomputed_team_scores` (tournament 243, `source = 'official'`), from Southern Regional 194 and TR South 193 down to Lakewood 16.
- The file's 1st/2nd/3rd counts per school match the `history_podiums` podium exactly. Schools come from the podium's team-order rows.
- Read by the district page's team standings and `top_postseason_team_scores` (Post Season leaderboard, 2012-13: TR South 336.5, 17th; Southern 258, 32nd).
- The district page note now credits only the placers to the Shore Conference archives when official scores exist.
- Integrity unchanged (the 2 known). Hidden season.

---

## 2026-11-14 — Region buttons back to the Aesthetic tool's numbers

**Migration file:** none (code).

Kyle 2026-11-14: "just the number as we originally created with the aesthetic tool and i approved exactly as is." He had never asked for the word "Region". I added it ("Region 1") and called it the standard; that was my own choice, wrongly presented as his.
- Buttons and tiles are restored to the last commit (05721da): overview buttons "1"…"8", region page pills "R1"…"R8", boys region list big number, girls region list as it was.
- Only a named region shows its name in place of the number: boys 2020-21 and girls 2022-23 on (North I, North II, Central, South); girls 2018-19 to 2021-22 (North, South).
- `regionLabels` gives `button` (number or name), `pill` (R-number or name) and `label` (page titles, which were already "Region N").
- Snapshot: boys region pills back to R1-R8; re-baselined.

---

## 2026-11-14 — Region labels: one source for every season (girls' named regions)

**Migration file:** none (code).

Kyle 2026-11-14: "did you update the region buttons yet?" The first pass missed places.
- `regionLabels(g, season)` in `src/lib/postseasonSeason.ts` works for any season: the region's own name (boys 2020-21 and girls 2022-23 on: North I / North II / Central / South; girls 2018-19 to 2021-22: North / South), else "Region N". Its order is North I, North II, Central, South, then by number (girls 2025-26 numbers them Central 1, North I 2, North II 3).
- Used by: the overview buttons, the boys/girls region lists, region page tabs and titles, and weight page titles.
- Before this, live girls seasons showed Region 1-4. The boys list showed a bare number when a logo was missing. Girls titles read "Region North".
- **Outage, about 5 minutes:** the first deploy passed a function to the client-side overview buttons, so `/postseason/individual/*` errored for any year with buttons. Fixed: plain labels are passed.
- Snapshot: girls region 1 pages show the names; re-baselined.

---

## 2026-11-14 — 2012-13 boys District 24: wrong event removed, real podium added (history_podiums)

**Migration file:** `docs/migrations/20261114_district24_2013_podium.sql` (APPLIED 2026-11-14 by Kyle, third run; the first two rolled back with nothing changed: a DELETE on the `wrestler_completeness` view, then untyped NULLs in the team-order insert. Check: 42 placers, 11 team rows, 0 bouts, 0 entries, Kevin Corrigan at 113. Integrity unchanged (the 2 known), snapshot unchanged, code deployed).

Kyle 2026-11-14: approved with the counts in hand ("yeah").

**The problem.** FloWrestling's "NJSIAA District 24" (2/22/2013), CSV and brackets PDF alike, is not that year's district:
- Its wrestlers wrestled other weights at 2012-13 Region 6.
- None of Region 6's District 24 qualifiers are in it (Kevin Corrigan, Region 6 champion and state runner-up, among them).
- Its champions match neither the real 2012-13 nor 2013-14 District 24 champions (Shore Conference archives).
- Region 6 2012-13 is right: at every weight, the 3 placers who qualified are at the state tournament at the same weight.

**Removed** (backup `docs/migrations/backups/20261114_district24_2013_wrong_event.json`):
- Tournament 243's 134 bouts, 11 calculated team scores and 134 entries.
- 134 + 134 staged rows.
- 13 profiles that existed only because of the file (made by the import; only their completeness rows referenced them).
- The tournament row stays. Hidden season only.

**Added.**
- New table `history_podiums`: a podium with no bracket. Columns: tournament, weight (NULL for a team-order row), place, wrestler, school, source. Read by everyone, written by service role.
- The 42 placers (1st-3rd at 14 weights) and the 11-team order, from the Shore Conference Wrestling Archives 2013 team pages. Every placer is linked to his 2012-13 Region 6 profile.
- `district_placements` (the live 5th/6th version) falls back to `history_podiums` when a district has no placement bouts.

**Code** (deployed after the migration).
- Boys district page: team order (no points) and a "Bracket not available — from the …" note.
- District weight page: shows the podium instead of a 404.
- Trophy Case: reads podium champions; the temporary `NOT_THE_DISTRICT` skip is removed.
- Wrestler profile: placement chips include podium finishes.
- `TeamScoreCard`: points are optional.

---

## 2026-11-14 — Trophy Case review: spelling joins, school matching, 2012-13 District 24

**Migration file:** none (code; no data changed).

Kyle 2026-11-14: "review the trophy case, dan scheets and dan sheets are the same wrestler."

**Rows (`src/lib/trophyRows.ts`).**
- Rows at one school, year and weight are one wrestler when last names are close: within 2 letters (3 for long names or the same first name), one inside the other (Napoli/DiNapoli), Jr/II ignored, or a lone first name ("Doug" / Doug Kanach). Before, they joined on an exact last name.
- About 150 doubled rows became one, Dan Sheets/Scheets (Collingswood 238, 2000-01, 189) among them. The state list's spelling shows.
- A "So - " class tag in a source name is stripped.

**School matching (`src/lib/historySchools.ts`, readers: Trophy Case, admin history research tabs, Playoff History school suggestions).**
- A saint's possessive is dropped ("St Joseph's - Metuchen" = St. Joseph Metuchen 186; its 18 rows had gone to Montvale 394).
- The starts-with rule never lands on a school tagged with another state.
- `HISTORY_NAMES` corrects names that rule put at the wrong school: Paterson Eastside, Middletown South, Passaic Tech, Warren Hills. Schools we don't have show nowhere instead: Madison Central, Springfield, Montclair Kimberley, Phillipsburg Catholic, Newark Central, Palisades Park, St. James, Bogota.
- A bare "St. Joseph" (50 rows) goes by its region (2 = Montvale, 8 = Hammonton). A bare-name state finish takes the school of that wrestler's region title.
- Before/after diff of every name was reviewed; nothing else moved.

**2012-13 boys District 24 is not the varsity district.**
- Its "champions" wrestled other weights at Region 6 that week (Owen McClave won "113" at districts, wrestled 106 at regions). Region 6's champions from those schools (Kevin Corrigan, Rich Lewis, Chris Serpico) aren't in it.
- All 352 other district files pass the same check (every champion is at his region).
- Kept off the Trophy Case (`NOT_THE_DISTRICT`) until Kyle re-downloads it. The hidden 2012-13 District 24 page still shows it.

**Left as the sources have them:** 14 year-and-weight spots with two different wrestlers at one school (old Newton state lists 1946-1960, Delbarton 2002 Mangione/Cholish weights swapped, Washington 1966, Triton 1962, St. Joseph 2023 138, girls 2019 state Raritan/Hunterdon Central/Kingsway).

Snapshot unchanged.

---

## 2026-11-14 — NJ Wrestling History credit line removed from the Trophy Case (for now)

**Migration file:** none (code).

Kyle 2026-11-14: "remove Historical results courtesy of NJ Wrestling History … for now — i haven't confirmed with them yet."
- The credit line under the Trophy Case is off. `trophy.credit` still marks schools whose rows come from njwrestlinghistory.info, so it can come back with one line.
- The NJWH-sourced rows themselves (boys state placers, region titles, sectional/state team titles) still show.
- **Reversed the same day** (Kyle: "put it back actually"): the credit line is back.

---

## 2026-11-14 — Back link to the year's Post Season page

**Migration file:** none (code).

Kyle 2026-11-14: "when we go into a season and then pull up a region, we need a link to go back to that season's post season home page."
- `PostseasonHomeLink` ("← 2016-17 Boys Post Season" → `/postseason/individual/<side>`, which shows the same remembered season).
- Added on: boys/girls region pages, boys district pages, boys/girls state pages, and the boys region/district and girls region lists.
- Bracket pages already link back to their region or district.
- Snapshot: only the new link line on five pages; re-baselined.

---

## 2026-11-14 — Girls region Terminators board empty: duplicate function

**Migration file:** `docs/migrations/20261114_drop_girls_region_mat_time_int.sql` (APPLIED 2026-11-14 by Kyle; one version left, text. Girls Region 1 2025-26 board: 8 champions, Ella Poalillo first).

**Found while checking the Terminators fix:** `girls_region_mat_time` exists twice (p_region integer and p_region text), both from `20261103_school_names_by_season.sql`. The page passes the region as text; the API can't choose between the two (PGRST203), so the live girls region pages' Terminators board has been empty since then. The migration drops the integer one. No other girls region function is duplicated.

**Other boards after the Terminators migration:** all champions only.
- 2025-26 boys region 1: Cristian Alvarez.
- Boys district 7: champions (3 wins each, as districts are).
- Girls state: Ella Poalillo, Eva Barry.
- Boys 2012-13 state: Bryan Dobzanski, Anthony Ashnault.

---

## 2026-11-14 — Terminators = champions (migration pending); standard region labels; wider stat boards (preview)

**Migration file:** `docs/migrations/20261114_terminators_champions_only.sql` (APPLIED 2026-11-14 by Kyle; 2025-26 boys state board: 8 rows, all state champions, Jayden James 11 wins 12:15 first).

**Terminators.** Kyle: "some leaders for the state page have 3 wins".
- **Cause:** the five mat-time boards (`lb_p_mat_time`, `lb_gp_mat_time`, `region_mat_time`, `district_mat_time`, `girls_region_mat_time`) ranked anyone unbeaten with 3+ wins, ignoring forfeit losses. A wrestler who won 3 district bouts and medical-forfeited out topped the 2025-26 state board (Anthony Jackson, 3 wins, 1:47) over champions (Jayden James, 11 wins).
- **Fix:** only champions of the board's level (state / region / district final winners), unbeaten on the way, ranked by mat time. The girls region board also stops counting losses as 6:00 bouts.

**Region labels.** Kyle: "they should never change … for the season with 4 regions, call them North I, North II, Central and South".
- Boys 2020-21's four super regions renamed in `regions` (#14-17: North I, North II, Central, South); used only by the hidden 2020-21 tournaments.
- Every region button and pill reads "Region N" or the year's own name (Post Season overview was a bare number; region pills were "R1").

**Stat boards** (Terminators, Quickest Deck …): at most three across on the state, region and district pages (were five on wide screens, about 200px each). A layout change, so on a preview deployment for Kyle first. Kyle: "wider boards look better now"; live 2026-11-14 with the region labels. Snapshot changes were labels only (R1 → Region 1); re-baselined.

---

## 2026-11-14 — Post Season · Individual (the year's playoff page) reaches the history years

**Migration file:** none (code).

Kyle 2026-11-14: "so you didn't create a master playoff page for each year then?"
- `/postseason/individual/boys|girls` (`IndividualPostseason.tsx`) now uses `getPostseasonSeason`: public seasons, switched-on history years, and hidden ones for an admin.
- Its region buttons carry a history year's region names. Its year label falls back to the season id (keyed by end year).
- The year's team totals, state placers and champions come from the loaded data (2012-13 boys top: South Plainfield 634.5, Bergen Catholic 592.5, St. Peter's Prep 574.5).
- Site snapshot unchanged.

---

## 2026-11-14 — History season names (solo schools) and Wood-Ridge as its own team

**Migration file:** none (data; `scripts/playoff_history_names_woodridge_20261114.mts`, backup `backups/20261114_season_names_woodridge.json`).

**Kyle 2026-11-14:**
- **Solo names:** 58 `school_season_names` rows. A school that's a co-op today but wrestled alone that season shows as it was: Lodi, Lenape Valley, Leonia, Middlesex, Bordentown Regional, Clayton, Lyndhurst, Becton (Becton/Wallington in 2013-14), girls Bogota (2019-20) / Ridgefield Park (2020-21).
  - Hyphenated single schools (Bridgewater-Raritan, Scotch Plains-Fanwood, Rumson-Fair Haven, WW-P North/South) need none.
  - Seasons with a co-op name already set keep it.
- **Wood-Ridge** was its own team: boys "Wood Ridge" (2015-16) and "Wood-Ridge" (2016-17 to 2019-20), with Becton printed separately.
  - 52 entries moved from Becton-Wood-Ridge (#321) to Wood Ridge (#1223, Kyle's new school, unused until now); the spellings re-pointed.
  - 2015-16 to 2019-20 team scores recalculated.
- Integrity unchanged (the known Delsea score and the 36 genuinely different same-name pairs).

---

## 2026-11-14 — Playoff History pages (admin preview), season weights / regions, calculated team scores

**Migration file:** none (code; team scores are data via `calcTeamScores`).

**Pickers** (`getPostseasonSeason`, `src/lib/get-season.ts`; `InlineSeasonPicker options`): the 13 boys/girls district, region and state pages (girls districts unchanged: no girls history districts) offer the public seasons, the history seasons Kyle has switched on, and for an admin the hidden ones marked "(hidden — admin preview)". A remembered hidden pick falls back to the live season for visitors (checked: no 2012-13 anywhere). Other pages never accept history seasons.

**Per-season lists** (`src/lib/postseasonSeason.ts`):
- **Weights:** the weights a history season used (boys 145/152… before 2021-22; girls' changing classes), on weight tiles, tables and bracket weight nav, and in the state loaders.
- **Region names and lists:** boys 2020-21's four super regions; girls 2018-19 to 2021-22 North (r5) / South. The girls region pages accept region 5.
- **Districts:** the boys district list for 2020-21 says there were no districts.
- **Girls region brackets:** draw C5 and C6. In a six-round consolation, C6 is labelled Cons. Semis.

**Team scores:** `calcTeamScores` (now also run by every Load) writes each history tournament's totals from the site's formula (`district_team_score`, `girls_region_team_score`, `state_team_score`; boys regions summed from `region_team_pts`) into `precomputed_team_scores` with source 'calculated', labelled as the pages read them.
- Done for all 18 loaded seasons: boys about 670 school totals a season, girls 109-243.
- Integrity label rule passes.

---

## 2026-11-14 — Live: Trophy Case, Insight · Off-Season, wrestler offseason table + match order

**Migration file:** none (code). Kyle 2026-11-14: "you can put those live".
- **School pages** (`/boys|girls/schools/[school]?tab=trophy`): Trophy Case tab (Team / Individual; state → region → district; 👑 state titles; district titles from 2013; NJ Wrestling History credit).
- **Insight · Off-Season** (`/boys|girls/insight/off-season`, between Polls and About): by weight + Most Notable Overall, Kyle's order from the Public board tab, every event and notable result per wrestler. Cached 5 minutes.
- **Wrestler profiles:** the offseason table (for wrestlers on the board) and match order (final first, first round last; a graduated wrestler's history oldest first).
- The Aesthetic Tool keeps its preview, building the board fresh (`preview.fresh`).
- **Site snapshot:** intended changes only (Trophy Case tab; one profile's offseason table); re-baselined.

---

## 2026-11-14 — Hidden history leaked onto live profiles (fixed); Steven Krakower → St. Rose

**Migration file:** none (code; data via `scripts/fix_krakower_20261114.mts`, backup `backups/20261114_krakower.json`).

**Leak:** after the loads, the site snapshot showed a live girls wrestler profile with a hidden 2023-24 history season ("S2024"). Wrestler profiles read every postseason entry with no season filter. Live for about an hour; fixed and deployed (snapshot back to "no change"):
- **Wrestler profile:** entries of history seasons not switched on are left out; switched-on ones get their label ("2023-24"). The profile's weight is taken newest season first; tournament ids aren't in season order, since past seasons were loaded later.
- **Head-to-head API:** postseason bouts from history seasons only once switched on.
- **Personalized home "recent matches":** limited to the live season. It sorted by tournament id, which now puts loaded past seasons first.
- Other public readers checked: all take a season, or only read grade labels (null for history).

**Steven Krakower** (Kyle: "he went to st. rose"): the 2013 District 23 export left his school blank on every row.
- He now has a profile (St. Rose, #1218) and an entry in the loaded 2013 District 23 at 152.
- His quarterfinal win over Conor Dowd is added, and his semifinal (Ruggiero) and 3rd-place (Scott) losses are re-attached.
- `district_bracket` reads it back correctly.

**Integrity after the merges:** "two profiles with the same name at the same school" is down from 1,615 to 36: the pairs Kyle marked Different, plus same names too far apart or in the same season (different wrestlers).

---

## 2026-11-14 — Playoff History loaded (hidden): girls 2019-2024, boys 2013-2024; gap-year merges; transfer name links

**Migration file:** none (data; `scripts/.local/load_all.mts` → `loadSeason`; `scripts/playoff_history_gap_merge_20261114.mts`; `scripts/playoff_history_transfer_links_20261114.mts`).

**Loaded** (every season still hidden; history_public false):
- Girls 2018-19 to 2023-24: 3-5 events each, 3,241 entries, 4,660 bouts.
- Boys 2012-13 to 2023-24: 41 events a season (2020-21: 5), about 5,300 entries and 6,300-6,550 bouts a season.
- Old weight classes added once: boys 145/152/160/170/182/195/220; girls 105/111/118/127/136/147/161 and 121/128/135/143/151/180/215.
- 1 bout skipped: 2013 District 23 152 QF, winner with no team in the export.

**Checks:**
- Read back through `state_placements` / `girls_region_bracket`: girls 2023-24 96/96 state placers.
- Other seasons agree with the history placers apart from spellings (Isabela/Isabella, Melamund/Melamud, Napoli/DiNapoli…).

**Gap years** (Kyle 2026-11-14: "Merge them"):
- The integrity check showed 1,615 same-name/same-school profile pairs: the automatic rule joined back-to-back seasons only, so a skipped postseason made two profiles.
- **Merged:** boys 1,503, girls 78. Seasons fit one four-season window (inside a kept existing profile's class year), no shared season, at most one existing profile (kept), and none Kyle marked Different.
- **Kept apart:** 13 Kyle Different, 3 outside the window, 1 sharing a season, 1 with two existing profiles.
- Emptied import-made profiles deleted only after a recount found no references. Backup `backups/20261114_gap_year_merges.json`.
- The automatic rule (`personSeasons`) now joins same name + school within four seasons, across a gap.

**Transfer name links** (Kyle: "Add name links"): 58 current wrestlers whose history adds an earlier school got a name link there (the export's printed name), as the 11-11 review did. Limited to the integrity rule's case; 1,163 profiles with no links anywhere were not touched. Backup `backups/20261114_transfer_name_links.json`.

---

## 2026-11-14 — Playoff History: profiles created for boys; Load / Unload built (needs grants)

**Migration file:** `docs/migrations/20261114_playoff_history_load_grants.sql` (APPLIED 2026-11-14 by Kyle; all seven tables insert/delete true).

**Profiles:**
- Boys: Kyle cleared the last six conflicts (1A 2A 3A 4A, 5/6 different) and ran Create profiles. 59,569 entries got their wrestler (128 empty-slot placeholder teams have none); 21,451 new profiles, 2,170 existing (31 took two history lines).
- Integrity and site snapshot unchanged.

**Load / Unload** (`src/lib/playoffHistory/load.ts`, tool buttons, `POST action load|unload`):
- **Load writes:** tournaments (names and types the pages query, dates, district/region ids), any old weight classes, entries (school, Flo state seed), bouts (round, side, result, score, fall time, `score_raw`) and co-op names (`school_season_names`).
- **Named regions:** boys 2021's four super regions and girls 2019-22's North get their own `regions` rows.
- **Unload** removes exactly that; refused while the season is switched on.
- **Admin Post-Season Bracket tool:** lists only current seasons' state tournaments and today's weight classes.

**First test load (girls 2023-24):** stopped at "permission denied for table tournaments". service_role could read but not write it (postseason tournaments were only ever made in the SQL editor). Nothing was written; the season is still staged. The grants migration fixes it.

---

## 2026-11-14 — Same wrestler guard fixed: whole lines, one season per wrestler, class year at Create profiles

**Migration file:** none (code).

**Why:** Create profiles refused Joseph Brown and Gabe Jimenez (more than four seasons) though each click had passed. The click guard (`sameConflict`) identified a history line by one end's season, so a line named by its first season in one maybe and its last in another wasn't joined.

**Changes:**
- Lines are now keyed by school + all seasons + names. A first fix without names merged different wrestlers sharing a school and seasons; caught by the scan and corrected before deploy.
- New rule: one wrestler can't be on two lines in the same season.
- Create profiles now checks the same three rules (four seasons, one line per season, class year).
- `sameConflict(…, every)` scans all saved calls.

**Scan of saved calls:** girls none. Boys 6:
- Joseph Brown: West Milford + New Egypt both 2015-16.
- Alexander Rodriguez: Newark East Side + Clifton 2015-16.
- CJ Thompson: Maple Shade + Elmwood Park 2017-18.
- Gabe Jimenez: 2018-19 to 2022-23.
- Harrison Talman and Carlos Murcia: 2023-24 vs class of 2028.

---

## 2026-11-14 — Same wrestler review: automatic profile joins shown on history lines

**Migration file:** none (code + Kyle's calls via the guarded API).

**Why:** Kyle 2026-11-14 couldn't match Sean Brown (Newton 215 = Newton 285) or Nicholas Gonzalez (Hasbrouck Heights 120 = 132). Both were already joined automatically (exact name, same school, class fits), so they never appeared as maybes. The maybes he saw were other wrestlers of the same name (Seton Hall 120, Union 190). The guard refused Seton Hall → Newton because Seton Hall was already tied to Sparta.

**Changes:**
- A history line that joins one of our profiles on its own now says so in green ("→ joins our profile automatically (Newton, class of 2026)"). All maybes were refreshed.
- **Decisions set for Kyle:**
  - Sean Brown: #883 Seton Hall ↔ Sparta profile = same (with his #775); #776 and #884 Seton Hall ↔ Newton = different.
  - Nicholas Gonzalez: #777 and #891 Union 190 ↔ Hasbrouck Heights = different (down 9 classes). decided_by "local".

---

## 2026-11-14 — Same wrestler review: sort by weight jump, names kept together, Same guard

**Migration file:** none (code).

Kyle 2026-11-14: "let me sort by that" / "put the profiles with the same name all near each other … make this easy on me."
- **Sort:** By name / biggest weight jump first / smallest first.
- **"Keep each name together"** (on by default): maybes sharing a name or a side are one group under a header listing every name in it. With a jump sort, groups sort by their largest jump.
- **Server guard on Same** (`sameConflict`): Kyle's Same calls plus the new one, grouped, may hold one existing profile and four seasons, inside the profile's class.
  - Otherwise it refuses with the reason (409) and writes nothing.
  - Tested: Sean Brown's two different profiles refused, both left pending.

---

## 2026-11-14 — Same wrestler review: weight-class jump (transfers, existing profiles)

**Migration file:** none (code).

Kyle 2026-11-14: "for the transfers, show me how many weight classes they jump" / "same for existing profile, other school."
- Each transfer shows its last weight at the old school → first weight at the new one. Each existing-profile maybe shows its last history weight → first weight with us.
- Classes are counted within each season's own class list, since the lists changed in 2021-22. Colours: 2 classes amber, 3+ red.
- Girls decisions done (73: 67 same, 6 different).
- Create profiles run for girls: 3,241 entries, 1,853 profiles (1,377 new, 476 existing; three existing profiles each took two history lines). Integrity unchanged.

**Boys transfer jumps:** 0: 100, 1: 110, 2: 66, 3+: 70.

---

## 2026-11-14 — Same wrestler review: our seasons, the gap, and the four-year window

**Migration file:** none (code; `src/lib/playoffHistory/identity.ts`, the tool).

**Kyle 2026-11-14:**
- "show me the weight we have for them. show me if there was a gap or no gap."
- "only 4 years of eligibility … make sure everyone you are trying to merge has the data match up in the 4 year window."

**Changes:**
- An existing-profile candidate shows our data season by season (weights, school; postseason entries + duals from 2024-25) and the gap after the history's last season: No gap / Gap: seasons missing / Overlap (both have one season).
- The history side lists each season with its weight.
- `window4()`: everything joined into one wrestler must fit four consecutive seasons and, with a class year, run from three seasons before it through it.
  - Automatic profile links now require it.
  - Candidates that break it are flagged in red with the reason (filter "Outside 4 years").
  - Create profiles refuses any "same" that makes a wrestler span more than four seasons.
- Rerunning Find refreshes the context on rows already listed; Kyle's calls are kept.

**Now:**
- Boys 907 candidates, 52 outside the window (e.g. Josh Lewis 2012-13 to 2016-17).
- Girls 73, 4 outside (e.g. Stephanie Diaz 2022-23 vs class of 2028).

---

## 2026-11-14 — Trophy Case (mock): state → region → district; district titles from 2013 on

**Migration file:** none (code). `20261114_playoff_history_people.sql` APPLIED by Kyle (columns verified).

**Changes** (Kyle 2026-11-14):
- Each row lists state first, then region, then district.
- District titles: our district brackets (finals; 2024-25 on), plus the Playoff History seasons staged from the exports (2013-2024 boys) until they load as brackets. Profile names once assigned; nickname brackets dropped meanwhile.
- Flagged "*" with "District champions are on file from 2013 on."
- Rows join by year, weight and last name, because sources spell first names differently and history writes heavyweight as "Hwt".

**Checked:**
- Paulsboro 65 district titles, Bergen Catholic 147 (2013-2026, no 2021).
- DePaul girls 1 (girls districts began 2025-26).

---

## 2026-11-14 — Playoff History, part 3: who is who (Same wrestler review, Create profiles)

**Migration file:** `docs/migrations/20261114_playoff_history_people.sql` (PENDING: Kyle runs it).
- `playoff_history_joins` gets `b_wrestler_id` (a candidate can be an existing profile), `a_school`, `b_school` and `context` (seasons, schools, weights, places for the tool).
- New `playoff_history_profiles`: every profile the import made or linked, so a load can be undone.

**Code** (`src/lib/playoffHistory/identity.ts`, `people.ts`):
- **Person-seasons:** normalized name (nickname in brackets, suffix and backticks dropped) + school.
- **Automatic joins:** same name + same school in back-to-back seasons (Kyle's rule), cut after four seasons. A history wrestler also links to exactly one same-named existing profile that wrestled at that school (name links, postseason entries, duals) when the class year fits.
- **Candidates for Kyle:** name variants (same school, same last name, first name a nickname/initial/one letter off: Tom/Thomas Flannigan, "Mchael" VanBrill), transfers (same name, other school), more than four seasons, and existing profiles at another school (class fits) or with the class year off.
- **Create profiles:** union of the automatic joins + Kyle's "same" + profile links. New profiles (inactive, name split by `splitName`: suffix kept, De La Cruz together, "jack bauer" → Jack Bauer) are made 500 at a time, then `playoff_history_entrants.wrestler_id` is set. A rerun keeps assigned entries.

**Tool:** Same wrestler tab: find candidates, Same / Different (one or a page at a time), Undo, Create profiles once none are pending. API actions `find_joins`, `decide`, `assign_people`.

**Dry run** (before the migration):

| | Entries | Person-seasons | Automatic joins | Linked to existing profiles | Candidates |
|---|---|---|---|---|---|
| Boys | 59,697 | 40,202 | 15,846 | 2,144 | about 875 |
| Girls | 3,241 | 2,464 | 681 | 435 | about 52 |

The prebuild check prints failures with "✖": a deploy failed on a "2024-25" in help text (fixed).

---

## 2026-11-13 — History fixes for 2021; 2024 Region 7 rebuilt from its Flo bracket

**Migration file:** none (data; `scripts/fix_history_2021_20261113.mts`, backup `backups/20261113_history_2021_fix.json`).

**history_finishes 2021** (Kyle: "yes please fix those errors" / "make any fixes so that the 2021 results show correctly"):
- **State 126, places 2-8:** NJWH repeated the 120 placers. Replaced with the real placers from the 2021 state export (the Flo bracket agrees), each with its school and a note. A scan of every year 2013-2024 found no other copied list.
- **2021 regions (56 rows):** NJWH numbers the four COVID super regions 1/3/5/7. They now carry region_name "Super Region North 1 / North 2 / Central / South", so the history tabs show them by name and they don't count as Regions 1/3/5/7.
- Integrity check before and after: only the known Delsea failure.

**2024 Region 7:** the re-downloaded export again has no round names and its rows out of wrestled order. Kyle added the FloWrestling Region 7 bracket PDF.
- `src/lib/playoffHistory/floBoutOrder.ts` reads each bout's number from the PDF (word positions: the number printed twice, its two wrestlers just left of it).
- Rows are sorted by bout number and the normal builder works out the rounds.
- A pair that met twice is told apart by the printed result (win type, then score); each PDF bout is used once.
- A bout missing from the PDF (Hunnewell over Carter, 175) is slotted after the loser's last bout and the winner's first loss.
- **Result:** all 14 weights have places 1-6. Region champions agree with NJWH (one spelling: Weright/Wright). Championship wins per wrestler agree with the PDF except finalists, whose final is on the PDF's second page.

**Restaged:** every boys season 2013-2024. 2021 state is now 104/104 vs NJWH; 2024 region champions 101/104 (spellings).

---

## 2026-11-13 — Playoff History: boys 2021-2024 staged

**Migration file:** none (staging data).

**Staged:**
- **2021** (COVID): four super regions (North 1, North 2, Central, South; `BOYS_NAMED_REGION`) and a 16-man state, no districts.
- **2022-2024:** 32 districts, 8 regions, state. "MFFL" and "M FOR" read as forfeits; "NC" skipped.

**Found:**
- **2024 Region 7:** the export has no round names on any of its 294 rows, and its rows aren't in wrestled order. Its brackets can't be rebuilt reliably: 53 problems listed. Asked Kyle to re-download it.
- **NJ Wrestling History's 2021 state 126 list is wrong.** Its 2nd-8th repeat the 120 placers. The export and the Flo PDF agree the 126 placers were Santaniello, Cangro, Conlin, Fernandez, Wasilewski, Tandurella, Fitt, Malone. FIXED (see the entry above).
- NJWH numbers 2021's super regions 1/3/5/7, so the region-champion check shows 12/26 that year: a numbering difference, not a results difference.

---

## 2026-11-13 — Playoff History staged: boys 2013-2020, girls 2019-2024

**Migration file:** none (staging data; `scripts/playoff_history_stage.mts`, `--girls`).

**Staged:**
- **Boys 2013-2020:** about 6,300 bouts and 5,300 entries a season. Export gaps: 2.
- **Girls 2019-2024:** 380-1,230 bouts a season. Every state placer and region champion agrees with the saved girls history.

**Team names:**
- Boys 515: 430 matched, 84 for Kyle, 1 empty slot.
- Girls 310: 277 matched, 33 for Kyle.

**Changes:**
- The "district then vs now" flag was dropped: NJ redrew districts after 2020, so it flagged 279 of 430.
- It's replaced by a check for two spellings matched to one school that wrestled in different districts (girls: regions) the same season. Boys 0, girls 0. The same spelling in two girls 2019 regions is a school split across North and South, not a match error.
- Kyle's calls are never overwritten on a restage (only their seasons update).
- **New school** action in the tool for closed schools (`POST action new_school`): inserts an NJ school named as Kyle types it and refuses a name that already exists.

---

## 2026-11-13 — Playoff History, part 2: girls 2019-2024, seasons 2021-2024, per-side school names

**Migration file:** `docs/migrations/20261113_playoff_history_2021_24_girls.sql` (APPLIED 2026-11-13 by Kyle: boys 12 history seasons 2013-2024, girls 6 2019-2024, all hidden).

**Why:** Kyle 2026-11-13: "fill out the individual tournament for the girls data we have as well … the state brackets can be recreated, match data will have to do for districts and regions. this match data can also go into wrestler profiles."

**Girls files:** Kyle's 2019-2024 region + state exports and the Flo state PDFs, copied to `History/Girls/<year>/`. The originals stay in `Whizzer Upload/Girls History`, which `load_girls_history_20261113.mts` reads. Girls had no districts before 2025-26.

**Builder changes:**
- **Girls codes** (as the girls pages and 2024-25/2025-26 hold them):
  - Regions: R1 R2 QF SF F, C1-C4 (C4 = consolation semis), 3rd, 5th. 2019 and 2022 regions ran up to six consolation rounds → C1-C6.
  - State: a 16-man first round is R1.
- **Region names:** girls regions keyed 1 North I, 2 North II, 3 Central, 4 South, 5 North (2020-22).
- **2019's single region file** is split into its brackets by who wrestled whom, each named by its schools' 2020 region.
- **NC** (no contest) skipped.
- **Round order** now comes from each weight's own rows. One file listed a weight's 3rd-place bouts before another weight's Cons. Round 3.
- **Seed reader:** handles the small one-page girls brackets (2019-22) and weights printed beside a "BYE" (2023-24). Seed lines need the full name.

**Checked:**
- Girls state placers match the saved girls history 456/456; every bracket builds.
- Boys unchanged (813/832, the 2 export gaps).
- Every girls seed read matches a state entrant.

**Tool:** the tool is now on both sides (Tools → Admin Tools). The API and team-name decisions are per side: `playoff_history_schools` key becomes (gender, raw_name).

**Bout order:** the exports list each bracket's bouts in no bracket order (it varies by weight and year), so seeds can't be read from them. First-round pairs do follow standard seeding (seeds summing to N+1).

---

## 2026-11-13 — Playoff History: past boys postseasons (2013-2020) staged for review

**Migration file:** `docs/migrations/20261113_playoff_history.sql` (APPLIED 2026-11-13 by Kyle: 8 seasons, stage history, hidden).

**Why:** Kyle 2026-11-13 loaded 2013-2020 boys district, region and state exports (TrackWrestling), plus the FloWrestling state brackets, in `~/Desktop/wrestling_brackets/History/<year>/`: "basically need to recreate the playoff pages for those years". Girls already have theirs. He is gathering 2021-2024.

**Kyle's calls:**
- Each season loads hidden and is switched on in the new boys tool (Tools → Admin Tools → Playoff History Review).
- Same name + same school in back-to-back seasons joins automatically; everything else goes to review.
- Co-ops show that season's name.
- Team scores for these seasons are CALCULATED with our formula (`precomputed_team_scores.source = 'calculated'`), an exception to copied-official.

**Migration:**
- Seasons 2012-13 … 2019-20.
- A `history` stage: postseason pages only; `history_public` is the on/off switch.
- `precomputed_team_scores.source`.
- Staging tables `playoff_history_{seasons,bouts,entrants,schools,joins}`.

**Code:**
- **Reading the files:**
  - `src/lib/playoffHistory/readFiles.ts`: reads the exports.
  - `brackets.ts`: works out each bout's round from the bracket itself, since the labels vary about 60 ways. Byes and TrackWrestling placeholders ("Forfeit Forfeit", "A Forfeit", "Joe Wrestler", "Unknown3") are skipped.
  - `stateSeeds.ts`: reads seeds from the Flo PDFs.
  - `schoolNames.ts`: expands abbreviations, then matches strictly (no starts-with: "Passaic Co Tech" ≠ Passaic). The two Kennedys are told apart.
- **Staging:** `scripts/playoff_history_stage.mts` writes the staging tables.
- **Review tool:** `/admin/boys/playoff-history` (`/api/admin/playoff-history`).
- **Season list:** `getSeasons()` leaves history-only seasons out, so pickers, ratings' previous season, rollovers and admin season tools are unchanged. `getHistorySeasons()` serves the postseason pages. The seasons route and both Snap Shot pages filter them out too.

**Checked (dry run, all 8 seasons):**
- Every bracket builds.
- State placers match NJ Wrestling History 813/832; the other 19 are the same placement under a spelling or nickname (Mike/Michael Russo).
- Round shapes match 2024-25's (2017-20 state: R1 224, R2 112, QF 56, SF 28, F 14, C1-C6, 3rd/5th/7th).
- Export gaps: 2 (2017 D3 113 is missing a semifinal; 2018 D27 160 is missing two quarterfinals).
- Seeds read from every PDF match a state entrant.
- Team names: 520. 431 match on their own, 6 are placeholders, 83 wait for Kyle.
- Site snapshot: unchanged after deploy.

**Found:** live boys region bracket pages didn't draw the consolation semifinals (C3; 224 bouts each in 2024-25 and 2025-26). The girls page draws C1-C4. FIXED 2026-11-13 (Kyle: "put it live"): `boys/regions/[region]/[weight]` draws C1 → C2 → C3. Region 1 106 2025-26 shows 16/16 bouts. Site snapshot re-baselined.

---

## 2026-11-13 — Joseph Vezzosi's profiles merged; backtick names cleaned in saved Snap Shot reports

**Migration file:** none (data; service role scripts).

**Vezzosi** (Kyle 2026-11-13: "go ahead and merge joseph's profiles"). `scripts/merge_vezzosi_20261113.mts --into-mako`:
- **Kept:** dbd3844f, renamed "Joseph Vezzosi". It held his 16 duals, 3 in-season bouts, District 32, roster row and name link.
- **Merged from:** 1bbd9c6b, which held 4 postseason entries (2024-25 District 27 and Region 7; 2025-26 Region 8 and States). Red Bank Catholic, 120, class of 2027; no event in common.
- **Hub prospects:** 404 merged into 6367 (Super 32, Journeymen, USAW-NJ). The unlinked "J. Mako Vezzosi" prospect 1786 (Super 32 Early Qualifier: 1 placement, 3 bouts; no event in common) also merged into 6367 (`scripts/merge_vezzosi_prospect_1786_20261113.mts`). He is listed once on the hubs.
- **Rebuilt:** 2025-26 boys ratings as archive (7,424, one fewer) and 2026-27 preseason (5,591). Boys leaderboards refreshed for 2025-2027.
- **Deleted:** `--delete` recounted 0 references, then deleted profile 1bbd9c6b and prospects 404 and 1786.
- **Backups:** `backups/20261113_vezzosi_merge_before.json`, `backups/20261113_vezzosi_prospect_1786.json`.

**Saved Snap Shot reports** kept the backtick names from when they were saved: boys 53 of 68 reports (603 strings), girls 55 of 74 (392). Cleaned by the same rule as the migration (`scripts/fix_backtick_names_in_reports_20261113.mts`; backup `backups/20261113_backtick_names_reports.json`). A rerun finds none.

**Checks:**
- Integrity: before and after, only the known Delsea vs Council Rock North failure.
- Site snapshot: one change, the intended "Na`ilah" → "Na'ilah" on /girls/state; re-baselined.
- Saved reports: no reference to the deleted profile.

---

## 2026-11-13 — Backtick names cleaned (O`Neill → O'Neill) + trigger; Off-Season board cache per deploy

**Migration file:** `docs/migrations/20261113_backtick_names.sql` (APPLIED 2026-11-13 by Kyle; verify as expected: wrestlers 1, prospects 1 (the two Vezzosi rows, since merged), schools 0, history 0, test "O'Neill / Brandon / Yurovskyi").

**Why:** Kyle 2026-11-13: "Abigail O`Neill" on the Off-Season board. TrackWrestling exports apostrophes as backticks.
- **Cleaned:** wrestlers 121, prospects 33, schools 5, history_finishes 23.
- **Trigger:** cleans every future write to those name columns, whatever import writes it.
- **Not changed:** name links and school aliases keep the imported text (imports match on it).
- **Held:** Joseph "`Mako` Vezzosi" (dbd3844f), a second profile of Joseph Vezzosi (1bbd9c6b, class of 2027). Waiting on Kyle.
- **Backup:** `docs/migrations/backups/20261113_backtick_names.json`. Integrity check before: clean.

**Also (code):** Tristan Rosemeyer still showed Williamstown on the mock's Off-Season board, though the board built fresh shows Lower Cape May. The board's 5-minute cache outlived deploys and wasn't refreshing.
- The mock and the profile preview now build the board fresh.
- The site cache for the board and the Trophy Case is keyed per deploy.

---

## 2026-11-13 — Off-Season board: every wrestler who wrestled this offseason

**Migration file:** none (code only).

**Kyle 2026-11-13:** "the public board should show every wrestler who wrestled in the off season."
- The board no longer requires a podium score or a notable result. It lists every wrestler of ours (linked to one of our schools, classes 2027-2029) with a placement or a bout this offseason.
- Boys go from 455 to 627 and girls from 144 to 172. That includes 92 boys and 25 girls with bouts only (mostly NHSCA National Duals).
- Events wrestled without a placement now show as "Wrestled" in the board's dropdown and in the profile's offseason table (`HubLeaderRow.wrestled`). No record is shown.
- Order within each list is unchanged: Kyle's saved order, then by score. Most Notable Overall stays the top 20.

---

## 2026-11-13 — Review fixes: Off-Season board opponents, order save, school lookup batches

**Migration file:** none (code only).

- **Board opponents:** notable-result opponents who are our wrestlers now show their profile name and link to their profile, not the imported name (37 of 120 boys notables). Others keep the imported name and state.
- **Order save (`/api/admin/hub/board` PUT):** writes the new order first, then removes anyone taken off, so a failed write keeps the old order. Tested on boys 106 and reset; Kyle's saved boys Most Notable Overall order (20 rows) was not touched.
- **School lookup (`schoolsOfWrestlers`):** the latest-bout lookup goes 80 wrestlers at a time (both id lists go in the request address).
- **Checked, no change needed:**
  - no wrestler listed twice on either board;
  - the board and trophy caches stay under the 2 MB limit (boys trophy index ≈ 1.2 MB);
  - the offseason table sits between 2026-27 and 2025-26 (after 2025-26 for graduates);
  - the graduate flip doesn't change season W-L.
- **Live site:** snapshot check unchanged.

---

## 2026-11-13 — Hubs: a linked wrestler's school is their current school, not their newest name link

**Migration file:** none (code only: `schoolsOfWrestlers` in `src/lib/hubSchools.ts`).

**Why:** Kyle 2026-11-13: Tristan Rosemeyer showed Williamstown, not Lower Cape May. He wrestled for Williamstown as a freshman (2024-25), and the 2026-11-11 no-alias review rightly added that link. But the hub showed whichever name link was newest.
- **New rule:**
  1. The school on the wrestler's newest roster import row.
  2. Otherwise, for anyone linked at more than one school, the school of their latest dual or in-season tournament bout.
  3. Otherwise their one linked school.
- **Effect:** 33 of 1,596 hub-linked wrestlers change school (spot-checked against the 2025-26 rosters). 5 who had no school now get one. No data changed.
- **Readers:** hub leaderboard, tournaments and prospects; the Off-Season board (mock).

---

## 2026-11-13 — offseason_board_order: Kyle's order for the Insight Off-Season board

**Migration file:** `docs/migrations/20261113_offseason_board_order.sql` (new table, granted to service_role).

**Why:** Kyle 2026-11-13: "i also need a way for me to edit the order in which these wrestlers are displayed."
- One row per wrestler placed in a list (a weight, or 'overall' for Most Notable Overall), per side and offseason.
- Set on the admin Offseason Hub's new "Public board" tab (`/api/admin/hub/board`).
- A weight list = Kyle's order, then anyone new by score. Most Notable Overall = exactly his list once saved.
- Saving clears the board's 5-minute cache.

Also in the mock (Off-Season board): the WRR column was removed, and opening a wrestler now lists every event they placed at, then their notable results.

---

## 2026-11-13 — In the Aesthetic mock (not live): Trophy Case, Insight Off-Season, wrestler offseason table and match order

**Migration file:** none (code only, deployed; the live site is unchanged — site snapshot check: no change).

**Kyle 2026-11-13; review in the Aesthetic Tool mock first:**
- **School profile · Trophy Case** (`src/lib/trophyCase.ts`, `SchoolTabs` prop `trophy`):
  - Team tab: sectional and state group titles.
  - Individual tab: every state podium finish and region title.
  - From the history tables, school names matched by `src/lib/historySchools.ts` (shared with the Explorer's sections). njwrestlinghistory.info is credited.
- **Insight · Off-Season** (between Polls and About; `src/lib/offseasonPublic.ts`, `src/components/site/OffseasonBoard.tsx`):
  - The latest offseason's NJ wrestlers at our schools, classes of 2027-2029 (this season's classes but the incoming one).
  - By weight, plus "Most Notable Overall" (top 20). No club, score, best win or bout record. Every notable result opens under its wrestler.
  - "Notable offseason performances, not all tournaments and matches included."
- **Wrestler profile** (`WrestlerProfileCore` prop `preview`):
  - A "2026 Offseason" table for anyone on that board, between the 2026-27 season and 2025-26.
  - Tournaments list the final first, the first round last.
  - A graduated wrestler's history reads oldest first.
- The hub leaderboard now lives in `src/lib/hubLeaderboard.ts`, shared by the admin hub and the public board.

**To go live:** turn the previews on in the live pages (school and wrestler routes; an Insight route for Off-Season) once Kyle approves.

---

## 2026-11-13 — Daily Challenge Explorer: schools by section

**Migration file:** none (code only, deployed).

**Purpose (Kyle 2026-11-13):** "sort schools by section in the explore page of the daily challenge."

**Code:**
- `/api/admin/history` returns each school name's NJSIAA section, when exactly one of our schools matches: by name, a school alias, the name cleaned (HS / Regional / Township / Jr-Sr; Pt. Boro = Point Pleasant Boro; Saint = St), or one name starting the other.
- Explorer: a sortable Section column when counting by School or Wrestler, a "Count by Section" option, and an "All sections" filter on every research tab.
- Coverage: boys 12,018 of 12,634 finishes (95%); girls 1,923 of 1,934. Unmatched: closed or merged schools (Dayton, Essex Catholic, Queen of Peace, Thomas Jefferson, Edgewood, Bishop Ahr…) and names that fit two schools (Manchester, Middletown before its split).

---

## 2026-11-13 — History: one wrestler per career; damaged names fixed

**Migration file:** none. Data via `scripts/fix_history_names_20261113.mts` (backup `docs/migrations/backups/20261113_history_names.json`).

**Purpose (Kyle 2026-11-13):** "joe duca shows as having region titles in the 70's and 2000's ... split any same names that are obviously different people."

**Data (history_finishes, boys):** 87 names fixed.
- 82 carried the wrestler's grade from the source as a prefix ("Jr - Joe Duca" = Joe Duca as a junior): prefix removed.
- Four cut-off copies repaired: Tom Armino (Seton Hall), Adam Derengowski (Paul VI), John Garriques, Antonio Mangione.
- "Shelomi (hohn" (Morristown 2007), garbled in the source too, is Shelomi Hohn (Kyle).

**Code (deployed):** the research tabs count a wrestler per high-school career (`assignPeople` in HistoryTabs.tsx). Finishes under one name and school stay together within four seasons of the first; a later one starts another wrestler, labeled with each career's years. 8 name + school pairs split: Joe Duca, Ken Hall, James LaVelle, Chuck Zeisloft, Wayne Stinson, Carlos Garay, Albert Smith, Dan Halsey.

---

## 2026-11-13 — Middle School Hub split by side; Daily Challenge boys/girls switch and "since" any year

**Migration file:** none (code only, deployed).

**Middle School Hub (Kyle: "has a gender toggle and shouldnt. the boys side should only show boys and girls only show girl"):**
- The leaderboard's Boys/Girls switch is gone. Every tab — tournament list (NJ counts and podiums), leaderboard, prospects (and its HS search), event pages — shows the side's own kids.
- `src/lib/hubSex.ts`: a mixed-pool kid's side is their linked wrestler's gender, else girls when they placed in a girls division, else boys.
- An event page's "clear to re-import" says it removes both sides' rows (one import holds both).

**Daily Challenge research:**
- A Boys/Girls switch (starts on the side's own; the one contest uses both).
- Years: All years · Since 1996 (today's weights, boys) · Since any year typed (e.g. 2020). The range applies to every tab, team titles included.

---

## 2026-11-13 — Nickname links; the import offers other name forms

**Migration file:** none (data via `scripts/link_nicknames_20261113.mts`; weights via `scripts/set_weights_v2_20261113.mts`).

**Purpose (Kyle 2026-11-13):** "zach akers had off season matches, but isn't on the leaderboard" — he was, as "Zach Akers", but unlinked to our Zachary Akers (exact-name matching only), so he had no school and dropped out of "Our wrestlers only".

**Data:**
- 15 NJ kids listed under another form of one of our wrestlers' first names (same last name, wrestler unlinked) were linked with Kyle's OK: Zach Akers, Robert Penman, Michael Graham, Chris Amato, William Stapleton, Joseph Cutruzzula, Matthew Gorbatuk, Samuel Mazin, Nick Mahler, Alexander Jena, Alex Teal, Christopher Ward, Nico Carvajal, Nicholas Sneddon, Joseph Alvarez.
- Jack Brown (Evil Empire) → John Brown left out.
- 2026-27 weights re-run: 2 changed.

**Code (deployed):** `src/lib/nicknames.ts`. The hub import also looks under other forms of a first name (Zach/Zachary, Matt/Matthew/Matty, Bobby/Robbie/Robert…) and offers that wrestler, leaving the kid to choose. It never fills it in.

---

## 2026-11-13 — Review: hubs, Daily Challenge (girls), Home Video

**Migration file:** none. Script `scripts/girls_history_school_names_20261113.mts` (backup `docs/migrations/backups/20261113_girls_history_school_names.json`).

**Data:**
- **Girls history school names:** 451 rows renamed where the difference was only cosmetic and one school matched ("High Point Regional" → High Point, "Bound Brook HS" → Bound Brook, "Mt. Olive"…); 273 names → 217.
- **Left as written** where the program then was a different configuration (Lodi before Saddle Brook, Ridgefield Park before Bogota, Mount Olive before Randolph, Newton…) or no single school matched (Immaculate Conception Lodi variants, Becton variants, Schalick/Cumberland, Vernon/Wallkill Valley).
- **Dual tournaments shown again** (Kyle): NHSCA National Duals, AAU Scholastic Duals (boys, girls); NHSCA National Duals (MS Division).

**Code (deployed):**
- **Speed:** hub tournaments list counts bouts per event and reads bout kids only for events without places, with lookups in parallel (boys ~5 s → ~3 s). Leaderboard reads its pages in parallel (boys ~8 s → ~2.6 s).
- **Import matching:** a name-only match (no state, no known club) stands only when the team has 2+ of them or carries the wrestler's school in its name.
- **Upload page:** reads duals copies (bouts only → "Review bouts for this hub"); how-to covers Flo Results pages and duals.
- **Clubs tab:** the "not on the club list" section lists clubs with NJ kids first (940 names in all).
- **Home Video:** "Watch on YouTube" is built from the video id.
- **Daily Challenge:** the region hint no longer names a boys region.

---

## 2026-11-13 — Eight tournaments removed from the Offseason lists

**Migration file:** none (data; `scripts/remove_hub_tournaments_20261113.mts`, backup `docs/migrations/backups/20261113_removed_hub_tournaments.json`).

**Data (Kyle 2026-11-13, "permanently remove"):** Who's Number One, Beast of the East, Walsh Jesuit Ironman, PowerAde, Escape the Rock, National Prep, UWW U17 & U20 World Team Trials, and Tyrant Fall & Spring Duals were deleted from the boys and girls Offseason lists (16 rows). All had been hidden. Each was counted first: no seasons, places or bouts on any of them. None were on the Middle School list.

**Reversible?** Yes — re-insert from the backup.

---

## 2026-11-13 — AAU Scholastic Duals girls bouts

**Migration file:** none (data via `scripts/load_duals_20261113.mts` EVENT=aau DIVISION=HSG).

**Data:**
- Kyle appended the AAU girls pages to the AAU copy. 2,445 girls bouts loaded on the girls Offseason event "AAU Scholastic Duals (Disney Duals)" 2026; the girls results appear twice in the copy, and repeated pairings at one weight are skipped. No links to our wrestlers (out-of-state teams; 2 lone name matches left unlinked).
- The boys loaded earlier (7,667, from the first copy) are kept; this copy holds fewer boys duals.
- **Reader:** the division comes from the page title that ends each copied page ("… Boys - Results", "… - Girls Natl - Participants"), the next one below a dual.

---

## 2026-11-13 — Duals: reader fixes, National Duals reloaded (boys, girls, elementary), AAU Scholastic Duals boys

**Migration file:** none (data). Scripts `scripts/reload_duals_20261113.mts` (backup `docs/migrations/backups/20261113_national_duals_bouts.json`), `scripts/load_duals_20261113.mts` (EVENT=nhsca|aau, DIVISION=HSB|HSG|MS|EL).

**Reader (`parseDualCopy`, src/lib/hubFiles.ts):**
- **Teams without a division suffix:** the page heading says Boys or Girls (AAU).
- **Names:** "J. Paul Dubay" / 'A. "Gus" Golliher' try the last word as the last name. Siblings with one initial on a team are told apart by the bout's weight (exact, or 12+ lb nearer). Names the copy lists under the other team are swapped back; the earlier load had winner and loser reversed on those rows.
- Unexpanded names dropped from 76 to 7, all siblings at the same weight (e.g. Brayden / Bryce Collins, TNWC Big Macs, both 195).

**Data:**
- **National Duals (May 23-25):** today's earlier bouts (boys 8,339, girls 2,160, elementary 3,379) and 59 prospects made only for unexpanded names were backed up and removed, then reloaded with the fixed reader: boys 8,339, girls 2,160 (the girls duals appear twice in the copy; repeats skipped), elementary 3,379 on the Middle School Hub. Links to our wrestlers unchanged.
- **AAU Scholastic Duals (Disney Duals, June 24-29):** boys 7,667 bouts (of 8,071 read; repeated pairings at one weight are skipped, as the copy has no round labels). The copy holds no girls section. No new links (out-of-state teams; 4 lone name matches left unlinked).
- No wrestler on two prospects; integrity check unchanged.

---

## 2026-11-13 — NHSCA National Duals 2026 (High School Boys) bouts

**Migration file:** none (data via `scripts/load_duals_20261113.mts`; reader `parseDualCopy` in `src/lib/hubFiles.ts`).

**Data:**
- Kyle's copy of the NHSCA National Duals page (May 23-25, 2026; the CSV wouldn't download): roster + 743 High School Boys duals → 8,339 bouts (forfeits left out).
- Stored on the boys Offseason event "NHSCA National Duals" 2026, a hidden tournament: bouts only, no places.
- Names are expanded from the roster ("N. Schuman" + team → full name); 42 couldn't be.
- **Matching:** as every hub import, plus a team rule: a name match to one of our wrestlers stands when the team has 2+ such matches or carries the wrestler's school in its name. 13 lone matches on other teams (VA26 Elite, Indiana Ares, Ohio Titan…) became new prospects. 111 kids linked; 1,805 new prospects.
- The copy has no girls, middle school or elementary duals (Flo shows one division at a time).
- No wrestler on two prospects; integrity check unchanged.

**Effect:** notable results on the boys leaderboard 2026: 91 NJ kids with a notable win (was 79), 53 with a close loss (was 46). Kids with dual bouts only now appear on the leaderboard with a record and no score.

---

## 2026-11-13 — Head-to-head bouts loaded; notable results on the hub leaderboard

**Migration file:** none (existing `{boys,girls,mixed}_hub_bouts` tables; data via `scripts/load_hub_bouts_20261113.mts`; plans shared in `scripts/.local/hub_plans.mts`).

**Purpose (Kyle 2026-11-13):** "if a nj wrestler beats or has a close match with a highly ranked wrestler, we can see that."

**Data:**
- 37,019 bouts from the tournament bout files already used for placements: Super 32, Early Qualifier, Journeymen, NHSCA, War at the Shore, NJ FS, NJ Scholastic 2023–2026, Brawl.
- Each bout is read with its bracket's division and weight (same split as the placements) and tied to the same prospects as the placements in that division and weight.
- **Skipped:** bouts in untracked divisions (Brawl duals, War at the Shore second-chance/adult, Greco); 58 bouts between kids on two pools.
- Fargo, the Northeast Regional and Mobbin have placements only, so no bouts.
- Integrity check unchanged.

**Code (deployed):**
- `src/lib/hubFiles.ts` keeps each bout's result and returns bouts with division and weight.
- Hub leaderboard: "Best win" column and sort, plus "Notable results" when a row is opened: wins over a kid with an offseason score of 75+, and losses to one by 1–2 points or in overtime / tiebreakers. Forfeits, defaults, injury defaults and DQs (folk and freestyle codes) are excluded.
- The Bouts W-L and Events columns now include these bouts.

---

## 2026-11-13 — Brawl at the Beach added and loaded

**Migration file:** none (data, service role; `scripts/.local/add_brawl.mts`, `brawl_details.mts`, `load_more.mts` "Brawl").

**Data:**
- Brawl at the Beach (Kyle: "middle school and hs for boys and girls"; roster: Jul 15-17, 2026, Bally's Atlantic City) added to the boys and girls Offseason lists and the Middle School list ("Brawl at the Beach (MS Division)"); level left for Kyle.
- **Individual brackets loaded:** boys 83 (HS, 15U, HS freestyle); girls 53 (HS folkstyle and freestyle); Middle School Hub 304 (13U and under, girls 6-8 / K-5, MS and K-6 freestyle), season 2026-27.
- **Not loaded:** the Duals divisions (team duals; individual tournaments only) and the adult divisions.
- No wrestler on two prospects; integrity check unchanged.

---

## 2026-11-13 — Wrong name links split off; import matching guard; 2026-27 weights by the new rule; leaderboard weights

**Migration file:** none (data, service role). Scripts `scripts/unlink_wrong_links_20261113.mts`, `scripts/set_weights_v2_20261113.mts`. Backups `docs/migrations/backups/20261113_unlinked_results.json`, `20261113_projected_weights_v2.json`.

**Data (Kyle 2026-11-13, "yes ... review all of this"):**
- **Review:** every result linked to an HS wrestler (2,181) was checked against the wrestler's 2025-26 weight and class.
- **Moved to new, unlinked prospects:** 13 results that can't be theirs: Christian Wolf ← Super 32 113; Aiden Gonzalez ← NHSCA Soph 120; Angel Mendoza, Chase Colon, Miguel Cruz, Sebastian Santos ← War at the Shore (NY schools); Max Garcia ← Journeymen 14U 90; Anthony Messina ← two 14U results; Brody Brown, Edward Lee ← NER 14U; Angelica Garcia ← NER 105; Noah Hernandez ← Early Qualifier 132 (Broad Axe; his 126 Ruthless result stays).
- **Left linked:** results that could be theirs (Cadet entries with an odd grade; 106-pounders at 98 in March).
- **2026-27 weights:** the NJSIAA weight wrestled most at tournaments after 9/1, a tie to the most recent. Written for 135 (22 changed). The 8 held (one Mobbin result, 3+ classes up) were written once Kyle confirmed Mobbin's weights ("that is 150") — `scripts/.local/write_held8.mts`.

**Code (deployed):**
- **Hub import:** no automatic match to an HS wrestler (or a prospect linked to one) when the result is 3+ weight classes below their last weight, or a 14U-and-under division past 9th grade at the event.
- **Hub leaderboard:** lists each kid at the weight they wrestled most in the season shown (closest NJSIAA weight on the Offseason Hub; a tie to the most recent), with an Events column (tournaments on our list they wrestled).

---

## 2026-11-13 — 2023 and 2024 NJ Kids Scholastic States loaded; Freshman year tab

**Migration file:** none (data, service role, `scripts/.local/load_more.mts` "NJ Scholastic 2023" / "NJ Scholastic 2024", with Kyle's roster copies).

**Data:**
- **2024 (3/9/2024):** Middle School Hub 1,669 places; boys Cadets 70, girls 16U 14.
- **2023 (3/11/2023):** Middle School Hub 1,533 places; boys Cadets 73, girls 16U 31.
- No wrestler on two prospects; integrity check unchanged.

**Code (deployed):**
- **Shared reader** (`src/lib/hubFiles.ts`): one division under two names ("Cadets" and "Cadets (9th & 10th Grade)", as 2023's roster lists every Cadet) counts once, in naming a bracket and in splitting joined draws. That fixed 2023's 11 unnamed Cadet brackets and Intermediate 160, joined to the Cadet 160 draw through Edwin Fajardo.
- **Middle School Hub · Freshman year** (`/api/admin/hub/freshman`, `FreshmanTab.tsx`): a middle school tournament's 1st–8th placers matched to this side's wrestlers by name + the class year an 8th grader would have, with their freshman district / region / state result. Sortable, filterable by year / division; summary by MS finish (click a cell to list it).

---

## 2026-11-13 — Offseason score tables; 2025 NJ Kids Scholastic States loaded; MS-to-freshman report

**Migration file:** none.

**Code (deployed):** `src/lib/offseasonScore.ts` now uses Kyle's tables for the 90 / 75 / 50 tiers: places 1–8, then 9–12, 13–16, 17–24, 25–32. A rating without a table (local 25) takes the 50 table scaled to it until Kyle gives one.

**Data (service role, `scripts/.local/load_more.mts` "NJ Scholastic 2025"):** the 2025 USAW-NJ Kids/Cadet Scholastic States (3/15/2025) with its roster.
- Middle School Hub: 1,765 places (Tot through Intermediate).
- Offseason 2025: boys Cadets 118, girls 16U 31.

Kyle's "Middle School Championships" files for 2026 are byte-for-byte the NJ Scholastic file loaded 2026-11-12; 2023 and 2024 have no roster, so their divisions are unknown and they are not loaded. Division ages, from the 2025 roster's weights: Intermediate (to 275) is the 7th–8th grade group, Junior (to 220) younger.

**Report:** `scripts/ms_to_freshman_20261113.mts` → `Notes & Reports/ms_states_to_freshman_postseason_20261113.csv`. 1st–8th placers at the 2024 and 2025 Kids States were matched to our wrestlers by name + class year (2028 / 2029), 202 matched, with their freshman district / region / state result.

---

## 2026-11-13 — Girls postseason history (region and state podiums) in the Daily Challenge workspace

**Tables affected:** `history_finishes` (new `gender` char(1) default 'M', new `region_name`)

**Migration file:** `docs/migrations/20261113_history_girls.sql`

**Purpose (Kyle 2026-11-13):** "start tracking all of the girls post season history ... extract the podium for all region and states ... add this data to the Daily Challenge work space. It will be the only time girls data touches the boy side since there is only one trivia question."

**Data (after the migration; `scripts/load_girls_history_20261113.mts`):**
- **2019–2024:** from Kyle's TrackWrestling bout exports (`Whizzer Upload/Girls History`), exact places from the finals and placement bouts.
- **2025–2026:** from MatWhizzer's placements; regions r1–r4 = North I, North II, Central, South, checked by schools against 2024.
- **2019's single region file** was split North/South by each bracket's schools' 2020 region.
- **2019 state** labels every placement bout "Placement Matches": unbeaten pair = 1st, 2nd-wrestleback winners = 3rd, losers = 5th.
- **Counts:** 1,934 rows. State champions per year: 10, 11, 11, 12, 12, 12, 12, 12.

**Code:**
- `/api/admin/history?gender=`; the research tabs read their side's history. Region labels are named for girls; "Region titles" counts 1st places only. "Since 1996" and team titles are boys only.
- `placesFrom` (src/lib/hubFiles.ts) reads "3rd Place Match" / "3rd place" as well as "3rd Place". No hub file used those labels.

**APPLIED** 2026-11-13 — Kyle ran it (12,634 existing rows all boys); 1,934 girls rows loaded; deployed.

**Reversible?** Yes — `DELETE FROM history_finishes WHERE gender = 'F'`, then the migration's ROLLBACK.
**Verified?** Yes — migration check; the history API returns boys 12,634 / girls 1,934.

---

## 2026-11-13 — Journeymen brackets corrected to Flo's places; NJ Freestyle 12U completed

**Migration file:** none (data, service role). Scripts `scripts/.local/fix_jm_17.mts`, `load_more.mts` "Journeymen Flo" / "NJ FS Flo" (ONLY=…). Backup `docs/migrations/backups/20261113_journeymen_17_brackets.json`.

**Data:**
- **Journeymen (Kyle "1 - ok"):** 17 brackets whose bout-file places differed from Flo's copy were replaced: 158 rows removed, Flo's places loaded; places deeper than Flo lists were kept (Over 170: 29). All 58 Flo brackets now agree.
- **NJ FS 12U (Kyle added it to the copy):** six brackets added (12 places: 67, 108 and four single-entrant weights). All 94 Flo brackets agree.

**Code (deployed):** `parseFloResults` reads a tie Flo lists as two kids at one place ("6th", "6th" in 17th-24th) as a shared place, 22nd–23rd.

**Checks:** no wrestler on two prospects; integrity check unchanged.

---

## 2026-11-13 — Flo placements fill Journeymen and NJ Freestyle; NJ Scholastic loaded

**Migration file:** none (data, service role, `scripts/.local/load_more.mts` "Journeymen Flo" / "NJ FS Flo" / "NJ Scholastic", ONLY=…; `rebuild_upload_lines.mts`).

**Data (Kyle 2026-11-13):**
- **Flo copies:** Kyle copied FloArena's Results pages for Journeymen and NJ Freestyle & Greco. New reader `parseFloResults` (src/lib/hubFiles.ts): division, "75 lbs" or "106 lbs - 9th-16th" groups; pool standings skipped; image lines ignored.
- **Brackets the bout files couldn't place, added from Flo:** Journeymen Main 120/135/145/152/160/170 and Over 120/135/145/152/160/215 (196 places; Over top 4); NJ FS 28 brackets (55 boys, 11 girls), including single-entrant brackets.
- **Checked against Flo:** NJ FS — all 53 shared brackets agree. Journeymen — 29 agree, 17 differ (swapped places in small round robins, Main 215), awaiting Kyle's OK to replace.
- **NJ Scholastic (3/20/2026):** boys Cadets 106, girls 16U 11, Middle School 1,880 (Tot through Junior; "Junior → middle school", Kyle).
- Every event's per-division upload lines were rebuilt from what is loaded.
- No wrestler on two prospects; integrity check unchanged.

---

## 2026-11-13 — Hub corrections, Local leagues, 2026-27 weights from fall tournaments, offseason score

**Migration file:** none (data, service role). Scripts: `scripts/.local/set_local.mts`, `fix_two_20261113.mts`, `load_more.mts` (ONLY=…), `fix_upload_line.mts`, `set_weights_20261113.mts`. Backups: `docs/migrations/backups/20261113_hub_two_corrections.json`, `20261113_projected_weights_before.json`.

**Data (Kyle 2026-11-13):**
- **Local (25):** the four middle school league events (JSJWL, SJMSWL, Raritan Valley, Tri-County). Mobbin dated 9/13/2026.
- **Correction 1, "1 - yes":** NHSCA Junior 152 (boys) replaced, 130 rows. Two Freshmen wrestled up into it, so places 17–32 shift. The event's Junior upload line was rebuilt.
- **Correction 2:** Northeast Regional 14U (161 places) moved from the Middle School list to the boys (98) and girls (63) Offseason lists. 14U/16U go to high school unless the roster grade is 8th or below, and this file has no grades. "USAW Northeast Regional Championships (14U)" is hidden on the Middle School list; the 110 mixed prospects it created stay.
- **2026-27 weights:** each linked NJ wrestler's 2026-27 weight comes from their most recent tournament after 9/1 (Super 32 10/24, Journeymen 10/2, Mobbin 9/13), at the closest NJ weight (a tie goes up). It is written to `wrestlers.projected_weight_class` and their 2026-27 rating row's `weight_class`. 113 written (boys 90, girls 23); 76 changed weight.
- **Held for Kyle:** 20 moves of more than two weight classes, e.g. Max Garcia 190 → a Journeymen 14U 90 and Anthony Messina 132 → a 14U 100, both likely another kid with the same name.

**Code (deployed):**
- The WRR recalculation uses this season's bouts first, then `projected_weight_class`, then last season's weight.
- Hub leaderboard: offseason score (`src/lib/offseasonScore.ts`, provisional). The best single result counts: champion rating, less 10% per place through 8th, tied places 0, freestyle = folkstyle.
- Sorted by weight then score, or by score or podiums; filter by weight and any set of class years. The Middle School leaderboard splits boys/girls: a linked wrestler's gender, else a girls division = girl.
- WRR beside NJ placements. Wrestler lookups are chunked: ~900 linked ids in one request had failed silently.

**Integrity check:** before and after, only the known Delsea vs Council Rock North dual.

---

## 2026-11-12 — Local tier (25) for hub tournaments; Journeymen and NJ Freestyle loaded

**Tables affected:** `boys_/girls_/mixed_hub_tournaments` (level check now allows 'local')

**Migration file:** `docs/migrations/20261112_hub_local_tier.sql`

**Purpose (Kyle 2026-11-12):** "add a local tier worth 25 points for the middle school tournaments." The code already treats local as 25 (`HUB_LEVELS`); saving a tournament as Local needs the migration.

**APPLIED** 2026-11-13 — Kyle ran it (all three checks allow 'local').

**Data, same day (service role, `scripts/.local/load_more.mts`):** Kyle: "aren't all of the wrestler divisions listed in the roster". They are. The roster reader dropped every kid whose name sat on its own line above their row (153 of NJ FS/GR's kids, 444 of Journeymen's); that is fixed. The reader also now:
- splits joined draws by roster division, by a kid's club as written ("Este Built WC" freestyle / "Estebuilt WC" Greco), by once-per-round, and by double-elimination paths;
- places Journeymen's pool + crossover format, with tiers ranked by pool record.

Loaded:
- **Journeymen (10/2/2026):** boys 482 (Main, Over, 14U), girls 167, Middle School 56 (11U).
- **NJ Freestyle & Greco (5/17/2026):** boys 196 and girls 68 (14U / 16U / Junior freestyle), Middle School 68 (12U and under, plus 14U kids with a roster grade of 8th or below). Greco not tracked.

Rule (Kyle): 14U and 16U go to the high school hub unless the roster grade is 8th or below. Still not placed, and noted on the event: Journeymen Main 120/135/145/152/160, and 16 NJ freestyle brackets.

**Reversible?** Yes — see the migration's ROLLBACK; clear an event's results on its page.
**Verified?** Yes — the migration check; data checked with `hub_after.mts`: no wrestler on two prospects.

---

## 2026-11-12 — 2026 offseason results loaded: Early Qualifier, NHSCA, War at the Shore, Northeast Regional, Mobbin

**Migration file:** none (data through the hub import route, service role). Scripts: `scripts/.local/build_podiums.mts` (reads files exactly like the upload page), `load_more.mts` (plan per event, dry run, then save), `hub_after.mts` (check).

**Purpose (Kyle 2026-11-12):** "can you run the upload for the additional tournaments?"

**Data (places):**

| Event | Boys | Girls | Middle School list |
|---|---|---|---|
| Super 32 NJ Early Qualifier (8/30/2026) | 357 | 22 (freestyle) | 87, Middle School + Elementary, on a new "Super 32 NJ Early Qualifier (MS / Youth)" (state), 2026-27 |
| NHSCA (3/26/2026) | 4,185 (Freshman–Senior) | 760 | 790 on NHSCA Middle School Nationals, 2025-26 |
| War at the Shore (4/3/2026) | 667 HS + 90 freestyle | 135 + 81 freestyle | 1,187 youth/MS on War at the Shore, 2025-26 |
| Northeast Regional (5/8/2026, freestyle) | 188 | 178 | 161 (14U) on a new "USAW Northeast Regional Championships (14U)" (regional) |
| Mobbin (date not in the PDFs; 2026) | 56 | 21 | — |

**Not loaded:**
- War at the Shore second-chance brackets, Adults, and two unlabeled tot brackets.
- Journeymen and NJ Freestyle & Greco States are held. Their seasons are entered (Journeymen boys, girls and MS; NJ FS/GR boys, girls, and a new "USAW-NJ Freestyle & Greco State Championships (Youth / 14U)"), with no places. The bout exports join draws that can't be told apart: Journeymen's tiered hammer brackets (26 weights with several finals), and kids in both freestyle and Greco at one weight (38 brackets). Placements copies have been asked for.
- NJ Scholastic States: only the roster was provided, no bout export.

**Matching:** as the upload page proposes.
- An NJ kid or a kid with no state links to a single same-name NJ wrestler, unless the roster grade is 2+ years from the wrestler's class (one year off = last year's grade given at an August event; accepted).
- Out-of-state kids link only to our out-of-state wrestler in their state; none in the mixed pool.
- Picked where the listed team names the school: Anthony Russo (RBC) → Red Bank Catholic, Aiden Gonzalez → North Brunswick, Matthew Miller → Bloomfield.
- Left as new prospects for Kyle: Anthony Russo (Yale Street), Colton Jones (VA), Gabriel Jones.

**Code, same day (deployed):** `src/lib/hubFiles.ts` — `podiumsFromBouts` is shared by the upload page and scripts. Several pools at one weight are labeled "96 Pool A/B". A bracket whose kids' roster divisions separate it (NHSCA Junior/Freshman 152, joined through two Isaac Youngs and two Freshmen wrestling up) is split. A bracket with more than one final that can't be split is left out and named on the upload page. FloArena lines copied twice count once.

**Totals after:** boys 6,217 prospects (894 linked) / 7,357 places; girls 1,522 (238) / 1,857; mixed 2,711 / 2,957. No wrestler on two prospects. Integrity check before and after: only the known Delsea vs Council Rock North dual.

**APPLIED** 2026-11-12. **Reversible?** Yes — "Clear to re-import" per event, or delete placements by event_id (prospects stay).

---

## 2026-11-12 — Champion rating per division on the hub tournaments

**Tables affected:** `boys_/girls_/mixed_hub_tournaments` (new `division_ratings` jsonb, default `{}`)

**Migration file:** `docs/migrations/20261112_hub_division_ratings.sql`

**Purpose (Kyle 2026-11-12, agreed):** NHSCA runs a separate bracket per grade, so a Freshman champion only beat freshmen. Each division takes the tournament's champion rating unless it is given its own (`{"Freshman": 75}`). The same applies to Fargo 16U / Junior and the Northeast Regional 14U / 16U / Junior. Set it under "Champion rating by division" when the tournament is opened; the list shows the divisions any season was uploaded with; blank = the tournament's rating.

**APPLIED** 2026-11-12 — Kyle ran it (column on all three lists). Deployed.

**Reversible?** Yes — see the migration's ROLLBACK.
**Verified?** Yes — the migration's check (3 rows).

---

## 2026-11-12 — Hub review: tournament levels and ratings, upload record, listed clubs

**Tables affected:** `boys_/girls_/mixed_hub_tournaments` (new `level`, `champion_rating`), `boys_/girls_/mixed_hub_events` (new `uploaded_at`, `upload_files`, `upload_divisions`), `boys_/girls_/mixed_prospects` (new `club_listed`)

**Migration file:** `docs/migrations/20261112_hub_levels_uploads.sql`

**Purpose (Kyle 2026-11-12, Offseason Hub review):**
- Every tournament is National, Regional or State with a champion rating for rating out-of-state wrestlers: "let's go 90, 75, 50". War at the Shore is State; Journeymen is Regional. The rating starts from the level and is editable.
- Each event records its upload (when, which files, and per division its style, weights, places and depth) so the list shows "✓ Uploaded" for the season. Super 32 and Fargo are backfilled from when their places went in.
- Prospects keep the club as the results list it, so clubs show before the club is on the club list. The Clubs tab lists names seen in results that aren't on the list; adding one or another spelling links the kids already loaded.
- Code: the tournament list shows level, champion rating, uploaded status, places and depth, and the NJ count. Opening a tournament shows the upload, the divisions, NJ wrestlers competed, the NJ podium and NJ placed below 8th; the notes and platform write-ups are gone. The leaderboard's "High school" column showed the linked wrestler's name and now shows the school; the club comes from the results when it isn't linked.

**Data, same day (service role, no migration):** hidden (`is_active` false, not deleted; none had seasons entered) on the boys and girls Offseason lists: Beast of the East, Walsh Jesuit Ironman, PowerAde, Escape the Rock (in season), National Prep Championship (not NJSIAA), UWW U17 & U20 World Team Trials ("hide for now"). Earlier the same day: the 8 dual events. Scripts `scripts/.local/hide_duals.mts`, `hide_inseason.mts`.

**APPLIED** 2026-11-12 — Kyle ran it (levels: each offseason list 3 national / 2 regional / 5 state; middle school 3 / 5 / 5; 5 loaded events marked uploaded). Deployed.

**Reversible?** Yes — see the migration's ROLLBACK; "Show hidden" → "Show in the list" brings a tournament back.
**Verified?** Yes — the migration check, plus the tournaments, leaderboard and clubs APIs run against live data (boys Super 32: NJ 66, podium 5, below 8th 61).

---

## 2026-11-12 — Tied places on the tournament hubs (place_to)

**Tables affected:** `boys_hub_placements`, `girls_hub_placements`, `mixed_hub_placements` (new column `place_to`; unique key now includes the prospect)

**Migration file:** `docs/migrations/20261112_hub_tied_places.sql`

**Purpose (Kyle 2026-11-12):** "go as high as you can and then for the tournament on the admin page, just say how high you went." Bout files give exact places 1st–8th; below that, double elimination ties everyone eliminated in the same consolation round (9th–12th, 13th–16th, 17th–24th, 25th–32nd…). A placement row can be a tied group (place 9, place_to 12), so a group holds several kids. Podium imports read "9-12" / "9th–12th"; "1st - Name (PA)" reads PA as the wrestler's state. The event page lists tied groups under each weight and shows "placed through Nth"; so does the Tournaments tab. Leaderboard and prospect podium counts stay top 8 only. Also (data, same day): seeded timing corrected from the results files — Super 32 Challenge "Late October" (was Mid-October), Super 32 NJ Early Qualifier "Late August" (was September), Super 32 (MS Division) "Late October".

**APPLIED** 2026-11-12 — Kyle ran it (place_to on all three tables). Deployed.

**Reversible?** Yes — see the migration's ROLLBACK (only while no tied groups are loaded).
**Verified?** Yes — the migration's check; parser test: "9-12" → 9th–12th, "25th–32nd", "(NJ)" read as the state.

---

## 2026-11-12 — Super 32 2026 loaded into the hubs

**Migration file:** none (data through the hub import, service role). Scripts: `scripts/.local/s32_roster.py`, `s32_podiums.py`, `s32_preview.mts`, `s32_save.mts`.

**Purpose:** Kyle's Super 32 2026 bout export (all divisions in one file) split into its 60 brackets by who wrestled whom, each labeled from `Super 32 Roster.rtf` (High School Boys 14, High School Girls 12, Middle School 16, 11U 12, 8U 6; every bracket unanimous); podiums from the placement bouts (round robins by record — Middle School 180 has a three-way 1-4 tie for 4th–6th, flagged to Kyle). Podium files: `Off Season Stuff/2026/Super 32 2026 podiums/`.

**Data:** boys Offseason · Super 32 Challenge · 2026: 112 places (NJ: Blewett, Sontz, George, Yarussi, Hodgins linked to their HS profiles); girls Offseason · 2026: 96 places (Ella Poalillo linked; Marie Sharp, Victoria Carbonaro of Blair new prospects); mixed Middle School · Super 32 Challenge (MS Division) · 2026-27: 228 places (Middle School, 11U, 8U divisions), all new prospects, class years from roster grades (8th grade = class of 2031). Out-of-state kids linked to our wrestler only when the school's state matched (boys 43, girls 14; none in the mixed pool). Prospects: boys 112, girls 96, mixed 228.

**APPLIED** 2026-11-12. **Reversible?** Yes — clear the three events' podiums on their event pages; remove the prospects they created.

**Added the same day:** Super 32 tied places below 8th for every elimination bracket, to the bottom of each draw (boys 1,446, girls 308, mixed 504), and Fargo 2026 freestyle top 8 from Kyle's USA Bracketing copy (boys 256 in 16U + Junior, girls 256; Greco left out) on the Offseason Hub "USAW 16U & Junior National Championships (Fargo)" · 2026. Kyle's decisions: Christian Ramirez = St. Peter's Prep, Matthew Mulligan = Bergen Catholic; name forms confirmed (Alexander→Alex Spagnuolo, J. Mako→Joseph Vezzosi, William→Will Cruz, Chris→Christian Wolf, Terrence James→Terrance Fearon, Bobby→Robert Duffy, Ellie→"Elllie" Kisselbach). Totals after: boys 1,710 prospects (296 linked) / 1,814 places; girls 573 (68) / 660; mixed 732 / 732. No wrestler has two prospects; no name+state appears twice. Scripts `scripts/.local/s32_groups.py`, `fargo_parse.py`, `batch_preview.mts`, `batch_save.mts`.

---

## 2026-11-12 — Middle School Hub is one mixed pool (mixed_hub_*)

**Tables affected:** `mixed_hub_tournaments`, `mixed_hub_events`, `mixed_prospects`, `mixed_hub_placements`, `mixed_hub_bouts` (new); `boys_hub_tournaments` / `girls_hub_tournaments` (their middle school rows moved out)

**Migration file:** `docs/migrations/20261112_ms_hub_mixed.sql`

**Purpose (Kyle 2026-11-12):** middle school and youth divisions mix boys and girls (Super 32's Middle School, 11U, 8U) and results don't say which kids are girls: "we can't tell gender, we just have to make the middle school pool mixed." The Middle School Hub now uses mixed_ tables on both admin sides (`hubPool` in `src/lib/hub.ts`, gender 'X'); a mixed prospect can be linked to a boys or girls HS wrestler. The HS import review offers prospects from the side's Offseason list and the mixed pool (`loadUnlinkedProspects`). The Offseason Hub stays per side. The 17 seeded middle school tournaments move to the mixed pool (the migration refuses if a side already has middle school events — none did). Youth divisions (11U, 8U) are tracked on the Middle School Hub as divisions ("might as well track what nj kids are doing").

**APPLIED** 2026-11-12 — Kyle ran it: mixed_ms 17, boys_ms 0, girls_ms 0. Deployed.

**Reversible?** Yes — see the migration's ROLLBACK.
**Verified?** Yes — the migration's check (17 / 0 / 0).

---

## 2026-11-12 — Home Video (weekly historical match video, per side)

**Tables affected:** `boys_home_videos`, `girls_home_videos`, `home_video_settings` (new; settings seeded off for both sides)

**Migration file:** `docs/migrations/20261112_home_videos.sql`

**Purpose (Kyle 2026-11-12):** a historical match video on each side's home page, changed weekly, with credit to the original poster. Admin tool Articles → Home Video: the on/off switch per side, and one line per week (weeks start Monday, Eastern) for the YouTube link, match title, creator name and channel link, and team notes. The home page shows the current week's video, or the latest earlier one if a week was left empty (`currentHomeVideo` in `src/lib/homeVideo.ts`); nothing when the switch is off. Any YouTube link form is accepted (watch, youtu.be, shorts, live, embed); others are refused. Not on the home page yet: the placement goes in the homepage mock first.

**APPLIED** 2026-11-12 — Kyle ran the migration (both sides off, 0 videos). Deployed.

**Reversible?** Yes — DROP the three tables.
**Verified?** Yes — `scripts/.local/hv_test.mts` on both sides: a week saved; a non-Monday and a non-YouTube link refused; switch off = nothing shows; switch on with this week empty = last week's video with its credit link; test rows removed and both switches back off.

---

## 2026-11-12 — Daily Challenge game and polls (one contest for boys and girls)

**Tables affected:** `daily_challenges`, `daily_challenge_plays`, `daily_challenge_weeks`, `daily_challenge_claims`, `polls`, `poll_votes` (new); `boys_/girls_daily_challenges`, `boys_/girls_polls` (dropped — empty, created earlier the same day)

**Migration file:** `docs/migrations/20261112_daily_challenge_game.sql`

**Purpose (Kyle 2026-11-12):** the game behind the Daily Challenge. One contest across boys and girls trivia: one question per date (12:00 AM – 11:59 PM Eastern), multiple choice or a ranking of four, with a time limit (30 s default). Signed-in fans click "Today's Challenge"; the server starts and keeps the clock (refreshing doesn't reset it); one attempt; late (past the limit + 1.5 s grace) = wrong; the correct answer shows after. Weekly standings (Monday–Sunday Eastern): most correct, then least total time on correct answers, then whoever finished first. Two winners a week (the top player; one random player who answered at least once), picked the first time the game is used after the week ends (no cron needed), emailed through Resend with a link to `/challenge/claim` (shirt size + mailing address); admin Winners list with "mailed". Polls: one site-wide list; signed-in fans vote once, then see percentages. `sandbox` rows belong to the admin Challenge Sandbox (any date, named test players, never emailed). All access through the server; no public grants. Code: `src/lib/challenge.ts`, `src/lib/challengeServer.ts`, `/api/challenge*`, `/api/poll`, `/api/admin/daily-challenge|polls|challenge-winners`, `src/components/challenge/*`. Not on the public site yet (front end later); `/challenge/claim` exists for the winner email.

**APPLIED** 2026-11-12 — Kyle ran the migration (all 0). Deployed.

**Reversible?** Yes — see the migration's ROLLBACK.
**Verified?** Yes — `scripts/.local/game_test.mts`, a full sandbox week through the real routes (31 checks): question hidden until started; the clock survives a second start; right / wrong / ranking order / late past 5 s + grace / opened-and-left all scored right; one attempt; standings A 3, B 1, C 0; no winners before the week ends; next Monday A top, random from B or C, decided once; prize form validated, another player can't send it, admin sees size and address; poll percentages after voting, one vote each. Test data removed.

---

## 2026-11-12 — Daily Challenge, Polls and the NJ wrestling history tables

**Tables affected:** `history_finishes`, `history_team_titles`, `boys_daily_challenges`, `girls_daily_challenges`, `boys_polls`, `girls_polls` (all new)

**Migration file:** `docs/migrations/20261112_daily_challenge_polls_history.sql`; data: `scripts/load_history_20261112.mts`

**Purpose (Kyle 2026-11-12):** two tools under Articles. Daily Challenge: one question per date per side (question, answer, notes); past dates are the archive (the API refuses edits to past dates and removals of today or earlier). Its research tabs (Explorer, Schools, Wrestlers, Team titles, All finishes — boys only) read the NJ boys history scraped 2026-11-02 (`data/njwh/`): state placers 1938–2026 and champions 1934–2026 (champions' names from state_champions.json), region champions 1961–2026 (each 2021 Super Region once, under its first region), group and sectional team titles. Run as is: no region podiums or districts. Polls: question + four answers per side, archivable, not tied to the challenge. Admin only; no public grants; the site front end comes later.

**APPLIED** 2026-11-12 — Kyle ran the migration (all 0); loaded history_finishes 12,634 (state 6,321 + region 6,313), history_team_titles 1,223. Deployed.

**Reversible?** Yes — DROP the six tables.
**Verified?** Yes — APIs answer for the page (history 12,634 / 1,223); a future question saved, a past date refused, the test question removed; a poll created, archived, a poll missing answers refused, the test poll removed. Spot checks: most Region 7 champions Camden Catholic 72; most state titles: five 4-timers.

---

## 2026-11-12 — Past seasons keep their own school directory (school_season_details)

**Tables affected:** `boys_school_season_details`, `girls_school_season_details` (new). Lock script inserts 2025-26 rows into them and 2025-26 rows into `boys_coaches` / `girls_coaches`.

**Migration file:** `docs/migrations/20261112_school_season_details.sql`; data: `scripts/lock_2025_26_directory_20261112.mts` (inserts only).

**Purpose (Kyle 2026-11-12):** Past Seasons gets the preseason dashboard's spreadsheet as its first tab (Directory), showing and editing that season's data: "lock in the current data for 2025-26's data and then i will update the 2026-27 data". Address, website, Twitter, Facebook, AD, AD email (`schools`) and section/group (`{g}_school_profiles`) have one value per school, so editing for 2026-27 overwrote 2025-26; the new tables hold a past season's values per program, and the live columns stay the current season's. The 2025-26 coaches had been rolled over to 2026-27 (2025-26: boys 0, girls 2), so today's coach is copied into 2025-26 wherever 2025-26 has none. Kyle corrects anything already changed for 2026-27 on the Directory tab (edits there write only the past season: `archive` mode in `/api/admin/school-directory` and `-girls`). Conferences, districts, regions, inactive marks and streaming links were already per season. Also new: the Schools, Wrestlers, Coaches, Tournaments, Leaderboards, Playoffs and End of Season tabs (`/api/admin/past-seasons/tab`).

**APPLIED** 2026-11-12 — Kyle ran the migration (0/0); lock applied: boys 317 directory rows + 313 coaches (2025-26), girls 266 rows + 189 coaches (191 with the 2 already there). Deployed.

**Reversible?** Yes — DROP the two tables; delete the 2025-26 coach rows added (boys 313, girls 189; created 2026-11-12).
**Verified?** Yes — the Directory tab reads 2025-26 (boys 317 rows: 313 coaches, 315 sections; girls 266: 191, 266); an edit in past-season mode wrote only the 2025-26 row, `schools` unchanged, test value restored. All six new tabs answer for both sides.

---

## 2026-11-12 — WRR season carry (wrestler_rating_carry) and the new rating rules

**Tables affected:** `wrestler_rating_carry` (new). On the rebuild: `wrestler_hammer_scores` and `wrestler_match_score_log` (2025-26 rewritten), `wrestler_rating_carry` (2025-26 written).

**Migration file:** `docs/migrations/20261112_wrestler_rating_carry.sql`

**Purpose (Kyle 2026-11-12):** the rating is continuous — "the end of one season and the start of the next season is no different than day 45 to day 46." Each run saves every rated wrestler's end state (last 20 match scores, latest result at each tournament, final postseason score, weight); the next season continues from it (no placeholders, no replay of last season's postseason bouts; returning active wrestlers are rated from day 1 at last season's weight). 2025-26, the first season with regular-season bouts, still starts the old way. Rule changes in `recalculate-hammer-scores` that ship with it:
- Postseason part: only an improvement on the carried score counts during the postseason; once state results are in, this season's result, or the average after a medical exit (injury default, medical forfeit, region qualifier who withdrew), or 75% of last season's after missing the postseason (a wrestler holding the in-season 20 keeps it). A top-4 region finish counts as making state when regions load.
- In-season 20: no postseason entry last season + a winning record over 2+ bouts against NJ opponents with a postseason score above 20 (replaces "beat one opponent with 20+"); drops back if the record stops winning.
- Tournament part: latest result at each tournament, 12-month rolling (a new edition replaces the old; injury default at the new one averages the two, 0 if no place); wins worth less than the average are removed and the rest re-averaged until stable (order no longer matters). Tournaments are linked across seasons by name until the tournament rollover links them.
- The unused MS tier credit was removed earlier today.

**Dry runs (2025-26, nothing written):** `{ season, dryRun: true }` on the route; scripts in `scripts/.local/wrr_*.mts`.

**APPLIED** 2026-11-12 — Kyle ran the migration (0 rows), then OK'd step 2: 2025-26 rebuilt with archive (boys 7,425, girls 2,377 ratings; logs 139,191 / 40,014 bouts; carry rows 7,425 / 2,377); 2026-27 run for preseason ratings (boys 5,592, girls 1,903: no graduated or inactive wrestlers, every one with a weight, a 300-row sample equal to the final 2025-26 rating); both End of Season reports re-saved; deployed.

**Backup:** `docs/migrations/backups/20261112_wrr_2025_26_before_rebuild.json` (9,802 rows, `scripts/backup_wrr_2025_26_20261112.mts`).

**Known, not from this change:** the saved 2025-26 match part differs from the dry run for 32 boys by at most 0.29 — same-day bouts are read in no fixed order, so the scoring order can vary between runs (also behind the 104 boys whose old live rating differed). Fix: order the bout and match reads.

**Reversible?** Yes — DROP the table (the next run starts the season the old way); 2025-26 ratings restorable from the backup.
**Verified?** Yes — saved 2025-26 ratings equal the dry run (girls all; boys all but the 32 above); integrity check unchanged (1 pre-existing failure: Delsea vs Council Rock North dual score).

---

## 2026-11-12 — Tournament hubs (Middle School Hub, Offseason Hub)

**Tables affected:** `wrestling_clubs` (new, shared); `boys_hub_tournaments`, `boys_hub_events`, `boys_prospects`, `boys_hub_placements`, `boys_hub_bouts` and the same five `girls_` tables (all new)

**Migration files:** `docs/migrations/20261112_tournament_hubs.sql` (tables), then `docs/migrations/20261112_tournament_hubs_seed.sql` (rows)

**Purpose:** Kyle 2026-11-12: a hub for middle school tournaments and one for offseason tournaments, admin only, to help with rankings. Each tournament has a year (event) per time it runs; each year holds podiums by weight (folkstyle and freestyle kept apart, no Greco) and, for duals-style events, the bouts so each kid's record there is known. Everyone on a podium or in a bout becomes a prospect (one list per side, across both hubs) and is linked to their high school wrestler once known: in the hub import (exact name matches offered, Kyle confirms) or in the HS import review for a new wrestler. A prospect's state comes from the source, the matched wrestler or the club; the leaderboard shows NJ kids by default. Clubs are shared like schools.

**Seed:** the 17 middle school and 20 offseason tournaments researched Aug 30–31 (`Off Season Stuff/*.csv`) on both sides, except "National Freestyle Duals (MS Boys Division)" (boys only): boys 17 + 20, girls 16 + 20. The NJ club list (`Off Season Stuff/NJ Wrestling Clubs.csv`): 71 clubs (67 NJ, 3 NY, 1 PA); the file's trailing source-note row is left out.

**Readers / writers:** `/api/admin/hub/*` (tournaments, events, event, import, leaderboard, prospects, clubs); pages `/admin/{boys,girls}/ms-hub` and `/offseason-hub` (+ `/event/[id]`); `src/lib/matchProspect.ts` (RTF import review: prospect candidates for a new NJ wrestler; `rtf/import` sets `wrestler_id` on confirm); `src/lib/wrestlerDelete.ts` (a prospect link blocks deleting the wrestler); `oos-wrestlers` merge and `scripts/merge_duplicate_profiles.mts` / `delete_empty_profiles.mts` (re-point / count `wrestler_id`).

**APPLIED** 2026-11-12 — Kyle ran both: 11 tables; boys ms 17 / offseason 20, girls ms 16 / offseason 20, clubs 71. Deployed after.

**Seasons (Kyle, same day):** `hub_events.season` is the offseason's calendar year (the 2026 offseason = events dated in 2026), or for middle school the year its June–May season ends (June 2025 – May 2026 = 2026, shown 2025-26) — `hubSeasonOfDate` in `src/lib/hub.ts`. The hub opens on the season today falls in, with a picker 10 back; a start date must fall in its season; the leaderboard is one season or all.

**Reversible?** Yes — DROP the 11 tables (listed in the migration's ROLLBACK).
**Verified?** Yes — `scripts/.local/hub_test.mts` round trip on both sides (event, prospects, placement, bout, read, duplicate place refused, test rows removed); pages and API refuse non-admins.

---

## 2026-11-12 — Drop the unused Aug 2026 middle school / offseason tables

**Tables affected:** `ms_placements`, `ms_wrestlers`, `ms_tournaments`, `ms_tournament_tiers`, `hs_offseason_placements`, `hs_offseason_tournaments`, `nonnjsiaa_clubs` (dropped)

**Migration file:** `docs/migrations/20261112_drop_old_ms_offseason.sql`

**Purpose:** Built 2026-08-29/30 (`20260829_ms_prospect_schema.sql`, `20260830_nonnjsiaa_schema.sql`) and never used: all 7 tables empty (counted 2026-11-12). Replaced by the tournament hubs above. Removed with them: the old Non-NJSIAA pages and APIs (`/admin/[side]/ms/*`, `/admin/[side]/nonnjsiaa/*`, `/api/admin/ms/*`, `/api/admin/nonnjsiaa/*`), `src/lib/matchMsWrestler.ts`, `src/lib/parseMsResults.ts`, the unused `AdminSidebar.tsx`, and the MS "tier credit" floor in `recalculate-hammer-scores` (it read the empty tables, so no rating changes; Kyle: the hubs are tracking only, no WRR effect). The migration refuses to drop a table with rows.

**APPLIED** 2026-11-12 — Kyle ran it after the hub deploy; verify returned 0 rows.

**Reversible?** Yes — re-run the two Aug migrations (empty tables).
**Verified?** Yes — the REST API returns 404 for all 7 tables.

---

## 2026-11-12 — Drop preseason_completion (duplicate of the Complete Transfers task)

**Tables affected:** `preseason_completion` (dropped)

**Migration file:** `docs/migrations/20261112_drop_preseason_completion.sql`

**Purpose:** The preseason dashboard already has a "Complete Transfers" task per gender (`admin_tasks`, process_key 'transfers'). The table added earlier today duplicated it, so the dashboard's Transfers % (0 or 100) now reads that task: complete when its completed_at falls in this season's preseason (from Aug 1). The table was never written to; the migration refuses to drop it if it has rows. The extra Mark complete button and `/api/admin/preseason-completion` are removed. Streaming link tables stay.

**APPLIED** 2026-11-12 — Kyle ran it; verify returned 0 rows, and the REST API now returns 404 for the table.

**Reversible?** Yes — re-create from `20261112_preseason_streaming_and_completion.sql`.
**Verified?** Yes — table gone (REST 404)

---

## 2026-11-12 — Grade-review marks carried to 2026-27

**Migration file:** none (data change through the service role). Script: `scripts/carry_grade_reviews_20261112.mts`.

**Purpose:** The grade reviews for the 2026-27 preseason were marked complete on 2026-11-04 (`roster_grade_school_complete`, season 2026, while the roster pool was keyed 2026). The 2026-11-11 Season Rollovers moved the roster pool to 2027 but not these marks, so the preseason dashboard (it reads the roster import season) lost them: girls Grade Reviews showed 19% (Kyle: "long completed"). Each 2026 mark was copied to 2027 with the same completed_at / completed_by; the 2026 rows are kept.

**Data:** girls 253, boys 297 marks copied. Dashboard Grade Reviews: girls 95% (254/266), boys 96% (301/315).

**Backup:** `docs/migrations/backups/20261112_carry_grade_reviews.json` (the 2026 rows copied).

**APPLIED** 2026-11-12.
**Reversible?** Yes — `DELETE FROM roster_grade_school_complete WHERE season_id = 2027;` (no 2027 marks existed before).
**Verified?** Yes — 2027 counts match 2026 for both genders.

---

## 2026-11-12 — Preseason dashboard: streaming links + preseason completion marks

**Tables affected:** `boys_streaming_links`, `girls_streaming_links`, `preseason_completion` (all new)

**Migration file:** `docs/migrations/20261112_preseason_streaming_and_completion.sql`

**Purpose:** Kyle 2026-11-11. The preseason dashboard gets a completed bar (average of the essential categories) and two new categories:
- Streaming links: one link per program per season (school_id, season_id), entered in the preseason school directory for the upcoming season like coaches. Non-essential (shown, not counted in the bar).
- Transfers: 0% or 100%, from a "Mark complete" in the Transfers tool, kept per season and gender in `preseason_completion` (item 'transfers'). Tracking transfers continues in-season regardless.
Code: `src/app/admin/[side]/preseason/` (page, PreseasonHeader), `src/app/api/admin/preseason-completion`, the two school-directory routes and workspaces, `TransfersWorkspace`.

**APPLIED** 2026-11-12 — run in Supabase SQL editor.

**Reversible?** Yes — `DROP TABLE boys_streaming_links, girls_streaming_links, preseason_completion;`
**Verified?** Yes — Kyle's verify query: boys_links 0, girls_links 0, completion_marks 0.

---

## 2026-11-11 — Snap Shot streaks count every bout; 2025-26 daily reports and End of Season reports rebuilt

**Migration file:** none (code change; snapshot tables rebuilt through the service role). Code: `src/lib/snapshot/streaks.ts`, `results.ts`, `compute.ts`, `compute-girls.ts`. Script: `scripts/backfill_snapshots.mts` (now saves its reads; `--reuse` reruns from them).

**Purpose:** Kyle 2026-11-11: streaks count everything (duals, jamboree pairings, in-season tournaments, postseason), in the order wrestled (date → event entry order → card order / bracket round); forfeit-type wins keep a win streak but skip pin/tech/bonus; any loss ends every streak. Out-of-state (is_oos) wrestlers get no streaks. Saved streak state is written only for the day's wrestlers, with start dates taken from the bouts.

**Data:** 2025-26 rebuilt — boys 68 days (snapshot_streak_state 30,460 rows), girls 74 days (9,624). Season highs: boys win 43 Paul Boyle, pin 31 Mateo Vinciguerra, bonus 34 Jacob Inserra, tech 6 Tyler Oden; girls win 40 Jocelyn Danbe, pin 25 Saharia Quamina, bonus 35 Ava Bonilla, tech 4 Olivia Georges. Both End of Season reports re-saved.

**Backup:** `docs/migrations/backups/20261112_snapshot_backfill_{boys,girls}.json` (reports, streak state, season highs, team highs before).

**APPLIED** 2026-11-11.
**Reversible?** Yes: restore the backups (or the earlier `20261111_snapshot_backfill_*` ones).
**Verified?** Yes: all days rebuilt; every streak leader is an NJ wrestler.

---

## 2026-11-11 — Grades set from class year for 21 wrestlers (11 boys, 10 girls)

**Migration file:** none (data change through the service role). Script: `scripts/fix_grade_from_class_year_20261111.mts`.

**Purpose:** 21 wrestlers had a grade and graduation_year that disagreed by one year: the 11 boys from the boys rollover entry below, and 10 girls found before the girls rollover. Kyle 2026-11-11: "for all of them just use the grad year". Each grade is set from the class year for the season `grade_season` describes (boys 2027, girls 2026, before the girls rollover); a class already graduated is set inactive, as the rollover does.

**Data:**
- Boys (season 2026-27): Braviel Rodriguez, Matteo Mosco (class of 2026) → graduated, inactive; Juan Velasquez, Mekhi Dicks, Sebastian Quintero, Stepan Harutyunyan Jr → Sr; William Minarcik, Shane Young, Joshua Schwarz, Leonard Riley, Triston Festa So → Jr.
- Girls (season 2025-26, before rollover): Rachel Springer, Emily Garcia, Sophia Klecha, Perjia Dupont Jr → Sr (class of 2026, so the girls rollover graduates them); Xiomora Alvarez, Arianna Sottile, Madison McKoy, Sofia Sgalambro, Sofia Pedroso, Sophia Parzero So → Jr.
- grade_confirmed_source 'manual'.

**Backup:** `docs/migrations/backups/20261111_grade_from_class_year.json` (the 21 rows before).

**APPLIED** 2026-11-11.
**Reversible?** Yes: write the backup's grade and is_active back.
**Verified?** Yes: 21 updated; graduation_year unchanged for all 21 after the trigger.

---

## 2026-11-11 — Boys grade rollover finished by script (route batching fix)

**Migration file:** none (data change through the service role). Script: `scripts/finish_boys_grade_rollover_20261111.mts`.

**Purpose:** Kyle ran boys Season Rollover. It moved `grade_season` M to 2027 and advanced the roster pool (season 2027, 678 graduated), then every wrestler update failed: one `.in('id', ...)` with ~1,450–2,300 ids made the request too long (400 Bad Request). Rerunning would have bumped grade_season and the roster pool twice, so the script did only the wrestler step: same selection (active, graded, NJ boys), batched by 300. Both rollover routes (`season-rollover`, `season-rollover-girls`) now batch these updates.

**Data:** 7,666 boys wrestlers: 1,451 Fr→So, 1,935 So→Jr, 2,285 Jr→Sr, 1,995 Sr graduated (is_active false). The graduation-year trigger kept every class except 11 whose grade and graduation_year already disagreed; their old graduation_year was restored so the rollover settled nothing (Braviel Rodriguez, Matteo Mosco, Shane Young, William Minarcik, Juan Velasquez, Joshua Schwarz, Leonard Riley, Mekhi Dicks, Sebastian Quintero, Stepan Harutyunyan, Triston Festa — for Kyle to review).

**Backup:** `docs/migrations/backups/20261111_boys_grade_rollover.json` (id, grade, is_active, graduation_year before).

**APPLIED** 2026-11-11.
**Reversible?** Yes: write the backup's grade and is_active back (graduation_year unchanged), and set grade_season M to 2026.
**Verified?** Yes: 7,666 changed; graduation years unchanged after the 11 restores.

---

## 2026-11-11 — Split Peter Terranova (Delbarton / Edison)

**Migration file:** `docs/migrations/20261111_split_peter_terranova.sql`

**Purpose:** One boys profile (a7427d2e) held two wrestlers: Delbarton's Peter Terranova (132, state qualifier, class of 2027) and Edison's (126, So in 2025-26). The Delbarton wrestler's rating made the Edison wrestler's losses top the season's biggest-upset lists (Kyle 2026-11-11: split them). The Edison wrestler gets new profile 0ff75f06 with every row at school 178: 26 dual bouts, 7 in-season tournament bouts, 1 district entry, the Edison alias and roster row.

**Backup:** `docs/migrations/backups/20261111_split_peter_terranova.json` (profile and every referencing row).

**APPLIED** 2026-11-11 (Kyle). Then: 2025-26 boys ratings rebuilt (archive), leaderboards refreshed, boys daily Snap Shots rebuilt, End of Season report saved again.
**Reversible?** Yes: rollback statements at the bottom of the file.
**Verified?** Yes: new = 26 / 7 / 1 / 1, old = 5 / 10 / 6 / 1 (Kyle's verify).

---

## 2026-11-11 — Out-of-state dual opponents rated even; 2025-26 ratings and daily Snap Shots rebuilt

**Migration file:** none (data rebuild only, no schema change). Code: `src/app/api/admin/recalculate-hammer-scores/route.ts` (recordMatch).

**Purpose:** In duals, a non-NJ (out-of-state or unknown) opponent was rated 0 because the default (55/60/65) is chosen by bracket round and duals have no round. Kyle (2026-11-11): such an opponent is rated equal to the NJ wrestler's own effective rating. Brackets keep the round default. The Snap Shot upset lists now split upsets by winners who already had a rating from those by winners whose pre-match rating was 0 (`top_upsets_by_gap_unrated`, `biggest_upset_unrated`).

**Data:** 2025-26 rebuilt as an archive season for both sides (`{"season":"2025-26","archive":true}`), leaderboards refreshed, all 2025-26 daily Snap Shots rebuilt (boys 68, girls 74) and the End of Season reports saved again.
- Non-NJ dual opponents no longer at 0: boys 759 bouts, girls 41 (still 0 only where the NJ wrestler was also 0: boys 48 + 1, girls 2).
- The girls rebuild also logged the 2 Schalick–Delran bouts the integrity check had flagged.

**Backups:** `docs/migrations/backups/20261111_ratings_before_oos_dual_default.json` (9,801 rating rows), `20261111_snapshot_backfill_boys.json`, `20261111_snapshot_backfill_girls.json`.

**APPLIED** 2026-11-11.
**Reversible?** Revert the code and rebuild; the backups hold the previous ratings and Snap Shots.
**Verified?** Yes: integrity check only shows the known Delsea–Council Rock North dual.

---

## 2026-11-11 — End-of-season Snap Shot reports

**Migration file:** `docs/migrations/20261111_snapshot_season_reports.sql`

**Purpose:** The Snap Shot page has a new End of Season tab: one saved report per season, per program, built by `src/lib/snapshot/seasonReport.ts`. It contains:
- **Season totals:** schools, wrestlers and matches, and how matches ended, split by duals, tournaments and the postseason.
- **NJSIAA vs non-NJSIAA:** NJ's record, and how those wins and losses ended.
- **Season bests:** every daily-report category over the whole season, taken from the saved daily Snap Shots.
- **Postseason:** district entrants, region and state qualifiers, state placers and the state champions.

**Tables:** new `snapshot_season_reports` and `snapshot_season_reports_girls` (season text PK, payload jsonb). Service role only. API: `/api/admin/snapshot-season` (GET loads a saved report; POST builds and saves it).

**APPLIED** 2026-11-11 (Kyle).

**Reversible?** Yes: drop both tables.
**Verified?** Yes: boys 0, girls 0 after creation. The 2025-26 reports for both sides were then computed and saved (the payload also counts duals, jamborees and in-season and postseason tournaments).

---

## 2026-11-11 — Girls dual-meet status (new for 2026-27)

**Migration file:** `docs/migrations/20261111_girls_dual_status.sql`

**Purpose:** The 2026-27 Girls Team Tournament Regulations make each school declare dual-meet status by December 15.
- Declared schools are classified.
- Every regular-season event a declared school wrestles counts as a dual in Power Points.
- Forfeits count only between two declared teams.

**New table:** `girls_dual_status`, one row per school and season (`declared` true/false; no row = not recorded). Set it in the girls school directory's new Dual Status column. Anon can read it.

**Code using it:**
- **`scripts/compute_power_points.mts`:** for girls from 2026-27, every regular-season meet between two declared schools counts, including jamboree pairings, and only declared schools get a row. Meets against undeclared schools are left out: the regulations don't say, and Kyle's call (2026-11-11) is no for now.
- **Boys Power Points from 2026-27:** 80% of meets, at least 9, rounded up (`ppMeetsCounted`, `src/lib/power-points.ts`). The 2025-26 figures are unchanged: a dry run counted the same meets for every school.

**Tables affected:** new `girls_dual_status`

**APPLIED** — 2026-11-11, Kyle

**Reversible?** Yes: `DROP TABLE girls_dual_status`.
**Verified?** Yes: the table exists and is empty, and the anon read returned 0 rows rather than a permission error.

---

## 2026-11-11 — Girls 2026-27 opened for preseason; girls 2025-26 marked complete

**Migration file:** `docs/migrations/20261111_girls_2026_27_preseason.sql`

**Purpose:** Girls had no 2026-27 row in `season_gender_state`, so every girls preseason tool still worked on 2025-26. Boys 2026-27 was opened on 2026-09-14. This adds girls 2026-27 at stage 'preseason' (not live), and archives girls 2025-26 the way boys 2025-26 is. Girls 2025-26 stays the live season until 2026-27 is set live; archiving locks its rankings and Power Points.

**Tables affected:** `season_gender_state` (+1 row, 1 stage)

**APPLIED** — 2026-11-11, Kyle

**Reversible?** Yes, with the rollback lines in the file.
**Verified?** Yes: girls 2024-25 archived; 2025-26 archived and live; 2026-27 preseason, not live.

---

## 2026-11-11 — 2026-27 season calendar filled from the NJSIAA documents

**No migration** (data; service role, `scripts/season_calendar_2026_27_20261111.mts --apply`).

**Source:** "NJSIAA Docs/Boys 2026-27/Boys Dates.rtf" and "Girls 2026-27/Girls Dates.rtf", plus the team and individual regulations posted 11/9/26.

**Before:** the 2026-27 calendar held 23 boys and shared rows and no girls rows, and the boys region seeding sat on the girls dates (2/16–17).

**Updated (8 rows):**
- Boys region seeding moved to 2/15–16.
- "First Day of Season" renamed "Competition May Begin".
- Individual state seeding became a boys row; a girls one was added.
- Locations added: Phillipsburg HS for the boys team finals; 32 / 8 sites for boys districts / regions; Boardwalk Hall for states.

**Added (16 rows):**
- **Shared:** the scrimmage date (12/3–5), the one-pound allowances (12/26 and 1/2), the first Power Points calculation (12/26), the team entry period (1/5–15) and the conflict-of-interest form (1/15).
- **Girls:** the dual-meet status deadline (12/15) and the team playoff (2/2, 2/4 and 2/7 at Phillipsburg). Also district seeding and districts (2/11, 2/14), region seeding and regions (2/16–17, 2/21), state seeding (2/23) and states (2/25–27).

Event types follow the 2025-26 vocabulary. The live site still reads 2025-26 until the new season is set live.

**Tables affected:** `season_calendar` (2026-27: 23 → 39 rows)

**APPLIED** — 2026-11-11, service-role script

**Reversible?** Yes: `docs/migrations/backups/20261111_season_calendar_2026_27.json` (prior rows and the added ids).
**Verified?** Yes, 39 rows. The mock's About reads them per side.

---

## 2026-11-11 — Schalick–Delran girls dual: 2 missing bouts

**Migration file:** `docs/migrations/20261111_schalick_delran_missing_bouts.sql`

**Cause:** A.P. Schalick 23–24 Delran (1/19/2026) was imported before 2026-11-06, when the dual importer still dropped bouts at non-NJ weights instead of mapping them. Its stored bouts added to 17–18.

**Added:**
- 128 → 126: River Wojcik's fall (Schalick), 6–0.
- 135 → 132: Everleigh Whitham's forfeit win (Delran), 0–6.

**Left as is (Kyle):** Delsea 73–6 Council Rock North (PA), 2/11/2026. Only the 215 and 285 bouts are stored; the source has 14, at Pennsylvania weights, with two at 285. It remains the one boys integrity failure.

**Tables affected:** `dual_meet_matches_girls` (+2)

**APPLIED** — 2026-11-11, Kyle

**Reversible?** Yes, with the rollback line in the file.
**Verified?** Yes: 23, 24, 11 bouts. The girls rule "final score differs from bout points" is now clean.

---

## 2026-11-11 — No-alias list worked through (77 → 1); Sydney Johnson split

**No migration for the links** (data; service role, `scripts/apply_no_alias_review_20261111.mts --apply`). The Sydney Johnson split is `docs/migrations/20261111_split_sydney_johnson.sql` (APPLIED 2026-11-11 by Kyle; verify: 2 bouts on the new profile at Boiling Springs (SC), 1 on the old at Liberty - Bethlehem (PA)).

**Source:** `docs/reviews/no_alias_review.csv`, from `scripts/no_alias_review_20261111.mts`, reviewed by Kyle.
- **Transfers (53):** 45 Kyle checked today, 5 he confirmed, and 3 he settled on 2026-11-10 (Pazinko, Valeri, Thompson). Seven of them came from Jackson Liberty, which folded into Jackson Township.
- **Program changes (12):** the wrestler's 2024-25 school joined a co-op in 2025-26: Jefferson-Sparta, Ramsey-Northern Highlands, Cherry Hill East-West, Buena-Vineland and Lodi/Saddle Brook. These co-ops are recorded in `school_season_names`; `school_coops` holds only 4 old rows.
- **Name link on the wrong school (11):** Gloucester (VA) wrestlers whose name link was saved at NJ Gloucester (259). The link moves to Gloucester (VA) (771).

**Applied:** 76 name links added, one per row, each under the name printed at that school; no existing link was repointed. 11 wrong links at Gloucester (259) were removed.

**Tables affected:** `wrestler_name_aliases` (+76, −11)

**APPLIED** — 2026-11-11, service-role script

**Reversible?** Yes: `docs/migrations/backups/20261111_no_alias_review.json` (added ids; removed rows in full).
**Verified?** Yes. The integrity rule went from 77 to 1, and the 1 is Sydney Johnson (the pending split). The other rules are unchanged.

---

## 2026-11-11 — Jamborees: small events reviewed (10 renamed, 7 back to plain pairings)

**No migration** (data; service role, `scripts/jamboree_cleanup_20261111.mts --apply`).

**Why:** Kyle asked whether the small jamborees were really tri meets. None ran as one. A tri meet would show full dual lineups with one bout per weight. Instead, these events had girls wrestling the same school more than once at a weight, or 3+ matches.
- **Renamed to "… Jamboree" (10):** the "Tri"/"Quad" events that ran jamboree-style: Cliffside Park, Deptford/Clayton/Palmyra/Sterling, Scotch Plains-Fanwood, Hightstown, Verona, Cherry Hill East, Delran, Bridgewater-Raritan, Pascack Hills and Pemberton/Riverside/Hamilton West/Burlington City.
- **Back to plain pairings, no event (7):** events with 1 bout per pairing and 2–4 bouts in all: Metuchen, Point Pleasant Beach Round Robin, Lakeland, Immaculata, Long Branch, Seneca and New Providence/Montgomery/Glen Rock/Westfield.
  - Their 15 pairings keep `meet_kind='jamboree'`, so W-L is unchanged.
  - Their registry rows are removed, except Pt. Beach Round Robin's original schedule row, which stays, unlinked.

**Result:** 35 girls jamborees, 988 linked pairings.

**Follow-up (Kyle):** a name that only lists the schools becomes the first school + "Jamboree" (jamborees_girls and their registry rows):
- Lenape Valley / Montville / Mount Olive → Lenape Valley Jamboree
- Deptford / Clayton / Palmyra / Sterling → Deptford Jamboree
- Pemberton / Riverside / Hamilton West / Burlington City → Pemberton Jamboree

**Tables affected:** `jamborees_girls` (−7, 10 names), `dual_meets_girls` (15 `jamboree_id` cleared), `tournament_registry` (6 rows removed, 1 unlinked, 10 names)

**APPLIED** — 2026-11-11, service-role script

**Reversible?** Yes, from `docs/migrations/backups/20261111_jamboree_cleanup.json`.
**Verified?** Yes. The script reported 35 jamborees and 988 linked pairings.

---

## 2026-11-11 — Cape Atlantic League Tournament (girls, 2/6/2026) loaded

**No migration** (data; service role, `scripts/load_cape_atlantic_girls_20261111.mts --apply`, add-only).

**Source:** the Cape Atlantic section of "2025-26 - Girls February Tournament.rtf" (Buena Regional). It had never been loaded: the tournament parser read the venue's "Buena, NJ 08310" line as a new event (fixed earlier today).

**Weights:** the league used its own classes, so each moves to the nearest NJ class (Kyle approved):

| League weight | NJ weight |
|---|---|
| 121 | 120 |
| 128 | 126 |
| 135 | 132 |
| 143 | 145 |
| 151 | 152 |
| 161 | 165 |
| 180 | 185 |

Track's team views label some bouts with the neighboring weight, so 132/135 and 143/145 are one bracket each. Exodus Hollander's "1st Place Match over Unknown (For.)" under 143 is left out: it would make a second 145 champion with no opponent.

**Loaded:**
- 48 bouts: 10 schools and 47 wrestlers, all matched; no new profiles.
- 33 placements.
- The venue.

**Not loaded:** 2 forfeits over "Unknown", which have no opponent profile. Cabarcas Rincon's 185 title is still in the placements.

**No standings:** none are on Kyle's list.

**Tables affected:** `tournament_bouts_girls` (+48), `tournament_placements` (+33), `in_season_tournaments_girls` (venue, source_format)

**APPLIED** — 2026-11-11, service-role script

**Reversible?** Yes: delete by the ids in `docs/migrations/backups/20261111_cape_atlantic_girls.json`.
**Verified?** Yes. After rebuilding girls ratings and both girls leaderboards, the integrity check shows only the 3 known failures.

---

## 2026-11-11 — Tournaments and jamborees separated; 42 girls jamborees; tournament names cleaned; Central Regional removed

**Migration file:** `docs/migrations/20261111_jamborees.sql` (generated by `scripts/build_jamborees_20261111.mts`)

**Purpose:** Kyle wants a firm split between tournaments and jamborees (a Jamborees tab beside Tournaments, same month layout, with each jamboree's best team by standard dual scoring), and tournament names without a year or edition number since they repeat every season.
- **New tables:** `jamborees` and `jamborees_girls` (one per program), plus `dual_meets(_girls).jamboree_id` for a jamboree's pairings and `tournament_registry.jamboree_id`. Anon can read them (the public pages use the anon client).
- **Girls 2025-26:** 42 jamborees, 1,003 pairings linked.
  - A jamboree is an "Other" event where 3+ schools wrestled and a school met 2+ of them. Two-school events stay plain pairings.
  - The list comes from the importer report, `docs/reviews/girls_other_events_report_20261111.json`. Names and counts are in `docs/reviews/girls_jamborees_2025_26.csv`.
  - Del Val Kickoff, Hillsborough Holiday Brawl and Jack Welch move from the tournament list and keep their ids. Their registry rows now point at the jamboree.
  - Pt. Beach Round Robin's registry row was linked to the East Brunswick Lady Bear tournament by mistake; it now points at the jamboree.
- **Central Regional Tournament (girls, 1/25/2026) removed:** it didn't happen (Kyle). It had no bouts, placements, standings, participants, seeds or registry row; a guard in the migration checks all of these before deleting.
- **Names:** 49 renames for 2025-26 (21 boys, 28 girls), dropping the year, edition number, "Girls", "Wrestling" and "High School", with a few typos fixed. Linked registry rows get the same names. Future RTF imports, CSV imports and the season rollover clean names the same way (`src/lib/eventName.ts`).
- Lady Viking Jamboree stays a tournament: it has brackets and 36 placements.

**Tables affected:** new `jamborees`, `jamborees_girls`; `dual_meets(_girls)` (+`jamboree_id`); `tournament_registry` (+`jamboree_id`, 4 rows repointed, 38 added, renames); `in_season_tournaments_girls` (−4 rows); 49 tournament names.

**APPLIED** — 2026-11-11, Kyle (Supabase SQL editor)

**Reversible?** Names: the RENAMES list in the build script. Tables: drop them. The 4 removed tournament rows had no data attached.
**Verified?** Yes. The verify query returned 42 jamborees, 1,003 linked pairings, 0 removed rows left, 42 registry jamborees, 21 boys and 28 girls names.

---

## 2026-11-11 — Girls jamboree bouts the Other-events import missed; Jack Welch loaded

**No migration** (data; service role, `scripts/load_girls_jamboree_gaps_20261111.mts --apply`, add-only apart from 20 meet scores).

**Cause:** The jamboree parser (`src/lib/parseJamboreeGirls.ts`) didn't recognize these weight labels, so it dropped every bout under them:
- pool labels with a number ("107C1", "120B2");
- crossover pools ("114-120", "126-126 A").

As a result, 2026 Middlesex Girls Jamboree (2/6) loaded nothing and Howell Girls Jamboree (2/7) lost 54 bouts. The parser now reads both label types; a crossover pool uses its lighter weight. Pairings and weights that were already stored are unchanged by the re-parse (1 weight differs: a 2/14 dual stored from the dual file).

**Loaded:**
- **New pairings:** 57 pairings with 123 bouts:
  - Middlesex: 17 pairings, 62 bouts;
  - Howell: 32 pairings, 33 bouts;
  - Jack Welch (1/16, 6 teams, round robin; Kyle: "it might not be a tourney"): 8 pairings, 28 bouts, from "Jack Welch - 2026.rtf".
- **Added to existing pairings:** 21 Howell bouts in 20 stored pairings, with their team points added to the meet scores (old scores saved in the backup).
- **New wrestlers:** 4 (Amy Yero, Jenna Balioni, Aloni Mora, Anette Nunez Conforme), with 4 name aliases.
- **Not loaded:**
  - Immaculata vs Bridgewater-Raritan 1/14: 1 bout with no weight in the source.
  - Hackensack 2/18: a forfeit over "Unknown".

**Also:** `src/lib/parseRtf.ts` no longer reads a venue's "City, ST 12345" line as a new tournament. Cape Atlantic League's bouts had been filed under "Buena, NJ 08310"; a re-parse of every 2025-26 tournament file changes nothing else.

**Tables affected:** `dual_meets_girls` (+57, 20 scores), `dual_meet_matches_girls` (+144), `wrestlers` (+4), `wrestler_name_aliases` (+4)

**APPLIED** — 2026-11-11, service-role script

**Reversible?** Yes: delete by the ids in `docs/migrations/backups/20261111_girls_jamboree_gaps.json` and restore `topupScores`.
**Verified?** Yes. A re-run finds every source pairing and bout stored. The integrity check is back to the 3 known failures, after rebuilding girls ratings and both girls leaderboards.

---

## 2026-11-11 — Tournament standings from Kyle's TrackWrestling copy; 4 out-of-state schools created

**No migration** (data; service role, `scripts/load_tournament_standings_20261111.mts --apply`, add-only).

**Source:** `Whizzer Upload/2026-27 Girls Data/Tournament Standings.rtf`, every 2025-26 in-season tournament that has standings, parsed to `docs/reviews/tournament_standings_20261111.json`. Kyle: if a tournament isn't in it, it has no standings.

**Loaded:** 514 rows for 19 tournaments, 12 boys and 7 girls.
- **Team matching:** first by the school text on that team's own bouts at the tournament, then the matcher, then 37 settled by hand (short names such as "Rv" = Rancocas Valley, "Elco" = Eastern Lebanon Co).
- **Same school twice:** Summit/Chatham (Pioneer Classic) and Wyoming Area (Ralph Wetzel) each appear twice in TrackWrestling's standings, the second entry with 0 points. Both rows are kept, as copied.
- **New out-of-state schools** (via `createOosSchool`, with state): 1207 Archmere Academy (DE), 1208 Germantown Friends (PA), 1209 Executive Education Academy (PA), 1210 Pottstown (PA).
- **Backup (ids):** `backups/20261111_tournament_standings_added.json`.

**Still without standings (none exist):** 10 boys and 13 girls, listed in `docs/reviews/tournaments_without_team_standings.csv` (a copy is in Whizzer Upload).

**Scoring test** (`scripts/check_inseason_team_scoring.mts`, read-only): can the proven TrackWrestling rules score in-season events from stored data?
- **Exact totals:** rarely. Byes aren't stored for in-season events (2 each), out-of-state and national events store only NJ teams' bouts, and placement tables vary.
- **Winner and podium:** with one fixed table (16/12/9/7/5/3/2/1), our winner matches the official at 61 of 72 NJ events, and 192 of 216 top-3 spots match.

---

## 2026-11-11 — Nine out-of-state duplicate schools merged

**Migration file:** `docs/migrations/20261111_merge_oos_duplicate_schools.sql`

**Purpose:** Kyle: merge. Eight pairs from the state review, plus Cleveland: Kyle's lists give Cleveland High School TN, and #1024 "Cleveland, TN" is the same school. In each pair the empty record held only team-standings rows and a name link. It still caught imports, e.g. "Oxford Area Hs" matched the empty "Oxford Area (PA)".

**Changes:**
- Kept ← merged: 488 ← 843, 765 ← 830, 511 ← 831, 530 ← 864, 1017 ← 1025, 643 ← 1032, 661 ← 1029, 513 ← 834, 566 ← 1024.
- No tournament has a team row for both records of a pair.
- Each kept school takes the cleaner name (e.g. "Loyola Academy (Wilmette, IL)", "Oxford Area (PA)", "Cleveland (TN)"). Its previous name is saved as an out-of-state alias.

**Backup:** `backups/20261111_merge_oos_duplicates_before.json`.

**APPLIED:** 2026-11-11. The check listed the 9 kept schools with their new names.

**Afterwards:**
- Aliases added for the merged records' short names: "Loyola Academy", "St Christopher's School", "Lafayette", "Homewood-Flossmoor", "Oxford Area". A name inside "(note, ST)" isn't reached by removing the tag.
- Matching checked: "Oxford Area Hs" now goes to #643.
- Leaderboards refreshed. Integrity check: the same 3 known failures; the no-alias list went from 79 to 77.

---

## 2026-11-11 — Out-of-state states from Kyle's TrackWrestling team lists; 3 mixed records split

**No migration** (data; service role). Scripts: `scripts/oos_states_from_lists_20261111.mts` (compare, read-only) and `scripts/apply_oos_states_from_lists_20261111.mts --apply`.

**Source:** `Whizzer Upload/2025-26 Girls Data/OOS - school lists.rtf`. It holds the TrackWrestling team lists ("School, ST") of 8 tournaments: girls/boys Beast of the East, Women of Ironman / Ironman, Ralph Wetzel, Rahway, Doc Buchanan, East Coast Catholic. Each school was matched by the name its own bouts print at that tournament.

**Result:**
- **Agreed:** 310 of the states already on file.
- **Added:** 69 tagged (58 straight from the lists, 8 found by hand under another printed name, plus Mountain View as VA). Corrected: Boiling Springs SC (was PA), Mount de Sales Academy GA (was MD).
- **Splits** (one record held two schools; the bouts move, with the name links of wrestlers who only wrestled there):
  - Christian Brothers College (MO): its 92 East Coast Catholic bouts → new #1204 Christian Brothers (TN), with 18 links. The alias "Christian Brothers High School" was re-pointed.
  - St. John Bosco Academy (CA): its 7 East Coast Catholic bouts → new #1205 St. John Bosco Academy (GA).
  - Mountain View (VA): its 1 Doc Buchanan bout → new #1206 Mountain View (CA). An alias "Mountain View" briefly pointed to #1206 and was removed.
- **Kept against the list:**
  - Pitman CA: the Doc Buchanan list has both "Pitman, NJ" and "John H Pitman, CA".
  - Roosevelt CO and Canyon View AZ: the list match had taken a same-named school.
- **Still untagged:**
  - Not in the lists: Ridgeline, Washington, West Field, Norwood, River Valley, Calhoun.
  - Held: Cleveland (girls Ironman, TN), which would equal the existing "Cleveland (TN)" (#1024, 1 bout), probably the same school.

**Backup:** `backups/20261111_oos_states_from_lists_before.json`. **Afterwards:** leaderboards refreshed for 2026.

**Follow-up, the same day:** Kyle gave the six missing from his lists: Ridgeline UT, West Field UT, Norwood OH, River Valley OH, Calhoun NY, Washington WV. All six are tagged (`scripts/oos_states_kyle_20261111.mts`; backup `backups/20261111_oos_states_kyle_before.json`). West Field drops "High School", since the tag keeps it apart from NJ Westfield. Every out-of-state school with bouts now has a state, except Cleveland, which waits on a merge with #1024 Cleveland (TN).

---

## 2026-11-10 — Out-of-state schools carry a state tag

**No migration** (data; service role, `scripts/oos_state_tags_20261110.mts --apply`).

**Purpose:** Kyle wants a state on every out-of-state school, including non-NJSIAA NJ schools as (NJ), so non-NJSIAA programs are easy to spot.

**Changes:**
- **513 schools tagged:** 506 high-confidence states, plus 7 whose state was already known from an alias.
  - Formats: "Name (ST)"; "Name, ST" becomes "Name (ST)"; "Name (note)" becomes "Name (note, ST)".
  - Frisch, Kushner, Torah Academy, Lawrenceville, Peddie and Blair are tagged (NJ).
- **Old names kept as aliases:** 508 added (4 existed already). "Pitman" was skipped because it is already NJ Pitman's alias.
- **Matcher (`src/lib/matchSchools.ts`)** compares out-of-state names with the tag removed, and reads "Name, ST" as "Name (ST)". Imports printing the plain name still match. Checked: Saucon Valley, Blair, Dover DE, Perry (Massillon); NJ Pitman, Woodbridge and Delaware Valley still match NJ.

**Not tagged:**
- 74 medium/low guesses with bouts on file, sent to Kyle: `docs/reviews/oos_states_to_review.csv`.
- Schools with no bouts on file (Kyle: settle them when they show up in bouts).

**Duplicates:** 8 pairs (`docs/reviews/oos_duplicate_schools.csv`). In each, one record has no bouts.

**Backups:** `backups/20261110_oos_state_tags_before.json`, `backups/20261110_oos_state_tag_aliases_added.json`.

---

## 2026-11-10 — Bout-time rules on every write; Hodgson merge; "Unknown" profiles removed

**Migration files:** `docs/migrations/20261110_bout_time_rules.sql`, `docs/migrations/20261110_merge_hodgson.sql`

**Bout-time rules (Kyle: so future imports follow them).** One trigger function, `bout_time_rules()`, BEFORE INSERT OR UPDATE on all five bout tables. Its argument names the result column (`win_type` in the postseason table).
- A fall at 0:00-0:02 becomes 6:00.
- A tech fall under 0:13 or with no time becomes 6:00.
- An injury default at 0:00-0:02 or with no time becomes 6:00.
- **APPLIED:** 2026-11-10. 5 triggers listed.

**Hodgson (Delaware, girls only):** #1108 "Hodgson" is merged into #1118 "Hodgson Vo Tech School", using the catalog-driven pattern of 20261106. The name waits on the out-of-state naming decision. Backup: `backups/20261110_merge_hodgson_before.json`. **APPLIED:** 2026-11-10. One row left, #1118.

**"Unknown" profiles (no migration; service role, `scripts/remove_unknown_profiles_20261110.mts --apply`).**
- **Why:** 4 profiles named "Unknown" (3 boys, 1 girls) stood in for bout sides the source didn't name. Each was rated as one person.
- **What changed:**
  - 104 dual bouts kept; those sides now have no profile.
  - 3 girls winner links cleared. They were forfeit wins over an empty slot; the page reads a missing winner as side B, which was the "Unknown" side.
  - Removed: 71 name links, plus the derived rows (4 hammer, 140 score-log, 16 streak).
  - The 4 profiles were deleted after a recount showed 0 references.
- **Approved by:** Kyle.
- **Backup:** `backups/20261110_unknown_profiles_before.json`.
- **Afterwards:** 2025-26 ratings rebuilt (F; M archive).

**Out-of-state names (Kyle: plain names; no migration; service role, `scripts/rename_oos_schools_20261110.mts`).**
- **Renamed:** 165 schools drop the ending "High School", "Hs", "H S", "HS" or "Senior". "Madison plains" is now "Madison Plains".
- **Unchanged:** state tags, bracket notes in "(…)", and Academy / Prep / School / Catholic names.
- **Held (2):** Woodbridge Senior and West Field High School. Their short names would equal NJ Woodbridge / Westfield.
- **Old names kept as aliases** (`alias_type 'oos'`), so imports printing the long name still match exactly. Checked with 5 names.
- **First alias insert failed:** `school_id` is NOT NULL, while the matcher's comment said null. The renames had already been applied; the aliases were then added with `school_id`, as the existing ones have it.
- **Files:**
  - list: `docs/reviews/oos_school_renames_20261110.md`;
  - backups: `backups/20261110_oos_school_renames_before.json`, `backups/20261110_oos_school_aliases_added.json`.

---

## 2026-11-10 — Impossible bout times set to 6:00

**Migration file:** `docs/migrations/20261110_bout_times_to_6_00.sql` (generated by `scripts/build_bout_times_fix_20261110.mts`)

**Purpose:** pinned list (falls under 10 seconds). Kyle's rules:
- under 10 s can happen;
- a 0:00 time was never entered, so 0:00–0:02 falls become 6:00;
- tech falls have a 13-second minimum;
- tech falls and injury defaults that show no time become 6:00 too.

**Changes:** 432 bouts, all seasons; only `fall_time_seconds`.

| Table | Falls (0:00–0:02) | Tech falls (under 0:13 or no time) | Injury defaults (0:00–0:02 or no time) |
|---|---|---|---|
| Boys duals | 8 | 3 | — |
| Girls duals | 3 | — | — |
| Boys tournaments | — | — | 75 |
| Girls tournaments | 1 | 2 | 45 |
| Postseason | 18 | 237 | 40 |

**First attempt:** `20261110_falls_under_3s_to_6_00.sql` (falls only) was never applied. Its check query failed on the enum `win_type`, so the run rolled back. That file is removed.

**Backup:** `backups/20261110_bout_times_before.json`

**APPLIED:** 2026-11-10. The check read 0 on all 15 lines.

**Afterwards:**
- Leaderboards refreshed (rs/ps, M and F, 2025 and 2026).
- Fall and tech-fall times set the outcome tier in the ratings (`classifyOutcome`), so ratings are being rebuilt: F 2025-26, M 2025-26 (archive), F and M 2024-25 (archive).

---

## 2026-11-10 — Ella Magee self-bout deleted

**Migration file:** `docs/migrations/20261110_delete_magee_self_bout.sql`

**Purpose:** pinned-list item 2. At the 2026 SJWHOF Girls Varsity, 107, the source listed Ella Magee (Schalick) on both sides of a placement-round no contest. Kyle: delete it.

**Counts and backup:** 1 row. No score-log row, because NC bouts aren't rated. Backup: `backups/20261110_magee_self_bout.json`.

**APPLIED:** 2026-11-10. Check: 0 self-bouts left.

---

## 2026-11-09 — In-season tournament placements rebuilt; three boys duplicate profiles merged

**No migration file** (data only, service role; add-only and merge).

**Placements:** `scripts/rebuild_tournament_placements_20261109.mts --apply` added 1,912 rows. Ids are in `backups/20261109_tournament_placements_added.json`.
- **Why:** no girls in-season tournament had placements. They were cascade-deleted in the gender split (`20260913_fix_tournament_placements_fk.sql`) and never reloaded. 7 boys tournaments had none either.
- **Source:** the stored placing bouts. Finals give 1st/2nd, 3rd_Place 3rd/4th, 5th 5th/6th, 7th 7th/8th.
- **Coverage:** 35 girls and 4 boys tournaments.
- **Skipped (12 weights):**
  - out-of-state events whose weights fold into one NJ weight (Ironman, Beast of the East);
  - Lady Viking: two brackets at 114, 120 and 185;
  - Howdy Duncan 165; Escape the Rock 106 7th;
  - Cherokee 132: the champion lost a semifinal.
- **No placing bouts stored** (nothing added): 9 tournaments.
- **Sam Cali:** left to its migration.

**Duplicates:** `scripts/merge_duplicates_20261109_sam_cali.mts`. Backup in `backups/20261109_sam_cali_duplicates_before.json`.
- **Merged:** Nick Konopka → Nicholas Konepka; Isiah → Isaiah Rojas (both Paramus Catholic); Gabe → Gabriel Gomez (Bergenfield).
- **Checks:** same school; no event in common; same weights.
- **Status:** done. Records moved. After the ratings rebuild, `--delete` recounted 0 references and deleted the three emptied profiles.

---

## 2026-11-09 — Sam Cali 2025-26 brackets (boys and girls) match the FloWrestling PDFs

**Migration file:** `docs/migrations/20261109_sam_cali_brackets.sql` (generated by `scripts/build_sam_cali_fix_20261109.mts`; parse and pairing in `docs/reviews/sam_cali_2026/`)

**Purpose:** Kyle: Sam Cali isn't resolved for boys or girls and needs seeds. The FloWrestling bracket PDFs (seeds, rounds, every result) were parsed and each bracket bout paired with a stored bout (same weight, same two wrestlers).
- **Boys:** 434 of 472 paired with no winner differences. 28 consolation semis were "NC" (not wrestled). 10 bouts were never stored. The 84 other stored bouts are extra matches outside the bracket.
- **Girls:** 138 of 170 paired.

**Changes:**
- **Boys:**
  - 270 round labels; nearly every bout was stored as "R1".
  - 10 bracket bouts added.
  - Seeds replaced, 366 → 402. 8 of the old seeds were linked by initial and last name to the wrong person, e.g. "A. Dyki" → Ryan Dyki for Alexander Dyki.
  - 66 placements added (1st-6th). The 18 stored ones agree with the bracket.
- **Girls:**
  - 43 round labels.
  - The 185 semifinal (Sandoval over Vilela Armijos) was stored under 152; it is moved.
  - Winner of the 152 consolation semi corrected to Gwen Silipena, fall 2:26. That is the bracket's result, and her 3rd-place match follows from it. TrackWrestling lists "Nunez over Silipena (Fall 0:00)".
  - 31 bracket bouts added.
  - 103 seeds and 68 placements added; there were none.
- **Addresses:** 7 tournament addresses carried the tournament's name after the street, and the girls Sam Cali one carried its whole team standings. The site prints that address under the tournament name. Cleaned:
  - boys: Sam Cali;
  - girls: Ron Mazzola, Escape the Rock, Sam Cali, Lady Cutter, Queen of the Mat ×2.
- **Girls Sam Cali team standings:** 24 rows added directly, from the TrackWrestling file. Ids are in `backups/20261109_girls_sam_cali_team_scores_added.json`.

**Extra matches (Kyle: count them as consolation):** the boys' 84 bouts outside the bracket become "C1" (75 relabelled; 9 already were). They still count in records.

**First run failed:** syntax error. A comment after each added bout swallowed the comma between rows. Nothing was applied. Regenerated. A second run failed on a NOT NULL constraint: added bouts need `wrestler1/2_school_raw`, now filled with the school's name. Again nothing was applied.

**Backup:** `docs/migrations/backups/20261109_sam_cali_brackets_before.json` holds every bout, seed and placement row of both tournaments, plus the 7 tournament rows, before the change.

**APPLIED:** 2026-11-09 (third run; the first two failed whole and applied nothing). The check matched every expected count: boys 528 bouts, girls 170; seeds 402 / 103; placements 84 / 68. **Reversible?** Yes, from the backup.

**Afterwards:**
- **Ratings rebuilt:** girls `{"gender":"F"}`; boys `{"gender":"M","season":"2025-26","archive":true}`, 7,427 rows.
  - Boys 2025-26 is archived, so a plain `{"gender":"M"}` run rebuilds 2026-27 instead. Two such runs were made by mistake first: one failed with "fetch failed" and kept the previous log; the other rebuilt boys 2026-27 as the daily job would.
- **Leaderboards:** `lb_rs_refresh` and `lb_ps_refresh` for M and F, 2026.
- **Integrity check:** unchanged (3 known).

---

## 2026-11-09 — Tournament team scores accept girls tournaments

**Migration file:** `docs/migrations/20261109_tournament_team_scores_both_genders.sql`

**Purpose:** `in_season_tournament_team_scores` serves both genders (the RTF import and every reader use it for boys and girls), but `tournament_id` had a foreign key to the boys tournament table only. Every girls standings insert was refused. That is why none of the 41 girls 2025-26 tournaments had a winner. Found when loading the girls standings: the insert failed whole, nothing written.

**Changes:**
- The boys-only foreign key is replaced by a trigger: the tournament must exist in the boys or the girls table.
- Delete triggers on both tournament tables keep the cascade: deleting a tournament removes its team scores.
- No data changes.

**Next:** `scripts/build_girls_tournament_team_scores.mts --apply` adds 743 girls team score rows across 20 tournaments, read from the TrackWrestling result files. One row is held: Canyon View, Beast of the East, with two possible records (AZ, UT).

**APPLIED** — 2026-11-09, Supabase SQL editor (fkey 0; the three triggers). **Reversible?** Yes (rollback note in the file).

**Loaded afterwards (service role, `scripts/build_tournament_team_scores.mts`, add-only, only tournaments with no rows):**
- **Girls:** 744 rows, 20 tournaments. Canyon View = Arizona (920, Kyle).
- **Boys:** 204 rows, 11 tournaments. File misspellings mapped: Sommerville, St. Mary`s Rutherford, College Achieve- Patterson.
- **How teams were matched:** first the school the team's own wrestlers were stored under at that tournament; else the school matcher; else a listed override (out-of-state schools by the record the boys version of the same event used).
- **Backups (new ids):** `backups/20261109_girls_tournament_team_scores_added.json`, `..._boys_...`.
- **Still without standings** (none in the files): boys 22 of 74, girls 21 of 41, listed in `docs/reviews/tournaments_without_team_standings.md` for Kyle to compile.

---

## 2026-11-09 — Girls 2024-25 regions numbered; Valliere merged; Keyra's duplicate removed

**Migration file:** `docs/migrations/20261109_girls_2025_regions_numbered_and_merges.sql`. **Backup:** `docs/migrations/backups/20261109_girls_2025_regions_rename_merges_before.json`

**Changes (Kyle):**
1. **Regions numbered:** the 2024-25 girls regions are now Region 1 (North 1, id 135), 2 (North 2, 136), 3 (Central, 134) and 4 (South, 137). The region pages and functions find a region by "Girl_s Regions r" + number, so 2024-25 girls region pages were empty. Only the names change.
2. **Savanah Valliere** is one girl (Lindenwold 2024-25, Paulsboro 2025-26). Today's 2024-25 profile (b6292eb7) merges into ee6626b7: 1 entry and 1 name link move; the emptied profile is deleted.
3. **Keyra Huastitlan Reyes's duplicate** (4b9a9152, made by mistake today, no references) is deleted.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Verified?** Yes:
- 134 r3, 135 r1, 136 r2, 137 r4.
- Valliere has 3 entries on one profile; the deleted profiles are gone.
- Live 2024-25 girls region pages 1–4 show their brackets and placers (48 per region from `girls_region_placements`; Region 2 was serving a 5-minute cached empty result and refreshed).
- Integrity check unchanged.

**Reversible?** Yes (backup).

---

## 2026-11-09 — Girls 2024-25 postseason: standings rows, 3rd / 4th placements, leaderboards

**Scripts (service role):** `scripts/build_girls_2025_official_team_scores.mts --apply` (adapted from the 2025-26 builder; add-only) and `scripts/add_girls_2025_region_thirds_placements.mts --apply`. **Backups:** `docs/migrations/backups/20261109_girls_2025_team_scores_before.json` (the 242 stored rows, unchanged) and `..._girls_2025_region_placements_added.json` (the new ids).

**Changes:**
- **Official team rows:** 58 TrackWrestling standings rows added; no stored total changed.
  - Including Jackson Township 180 (Central's top team), North Brunswick 119.5, East Brunswick 67.5, Montville 59.5 and the co-op's 53.5 on Colonia.
  - Central 46, North 1 61, North 2 49 now equal TrackWrestling's team counts.
  - South 57 of 58: Cumberland Regional (0) had no wrestler there.
  - State 87 of 110: the 24 left out all scored 0 with no wrestler at State, as in the 2025-26 load.
- **Placements:** 96 new (3rd and 4th at every weight in the four regions), from the 3rd place bouts; the regions had only 1st and 2nd.
- **Leaderboards:** `lb_ps_refresh` (F, 2025): 3,179 wrestler rows, 726 team rows.
- **Ratings:** none. The rebuild stops with "No season before 2024-25"; girls 2024-25 never had ratings (0 rows before and after). Not retried.

Integrity check unchanged (3 known).

**2024-25 girls postseason: done.** Every region and the State match the export bout for bout; standings and placements are complete.

---

## 2026-11-09 — Girls 2024-25 postseason, step 2: the region Round 1 losers

**Script:** `scripts/apply_girls_2025_region_r1.mts` (service role), from the plan in `docs/reviews/girls_2025_region_r1_plan.json` (`scripts/plan_girls_2025_region_r1.mts`). **Migration file:** `docs/migrations/20261109_girls_2025_r1_bouts.sql`. **Backup (every new row's id):** `docs/migrations/backups/20261109_girls_2025_r1_created.json`

**Purpose:** The 2024-25 girls region Round 1 losers were never entered, so their 255 Round 1 bouts (and 3 step-1 bouts) couldn't be stored.

**How each wrestler was settled (rules already set; Kyle's calls where noted):**
- **Existing profile (172):** her name linked at her school. For the co-op, a link at any member school counts.
- **New profile (94):** no girl by that name anywhere (92), or the same name only at another school (Kyle's 2026-11-05 rule: Jessica Calle, Belleville; Savanah Valliere, Paulsboro, flagged to Kyle as a likely transfer).
- **Kyle's call:** Alexis Dozier = Lexi Dozier (Leonia-Palisades).
- **Obvious matches:** Adelaide Matta Arvo = Adelaide Arvo (Collingswood). Maria Rivera Perez and Genesis Martinez are new (their same-last-name schoolmates have other first names).

**Changes:**
- **New profiles:** 93, inactive, gender F, no grade (none has 2025-26 records), each with a name link at her school. The backup lists 94: the 94th is the duplicate below.
- **Name links:** 96 (the 93 new profiles, Dozier, Arvo, and Kidd-Maxey at Colonia).
- **Entries:** 262 new; with the 4 reused, all 266 planned.
  - 4 girls already entered under shortened or variant names keep their entry: "Layla Lubrano-Lava", "Emily Valencia Var", "Alexandra Chase", "Christin Johnston".
  - Victoria Kidd-Maxey (co-op, linked at Iselin Kennedy) also got a link at Colonia.
- **Bouts:** 258, in the migration; one tech fall is stored "TF-1" as printed.

**Mistake, caught:** Keyra Huastitlan Reyes was in the plan twice (Central and State), each time as "new profile". The run made her profile at Central, then a second, empty one at State, and stopped on the name link. Her State entry is on her real profile (00e0295e). The duplicate (4b9a9152) has no entries, links, duals or ratings; **its delete is waiting on Kyle's approval.**

Integrity check: unchanged (the no-alias list 79, as before step 2).

**Bouts APPLIED** — 2026-11-09, Supabase SQL editor: R1 Central 74, North 1 74, North 2 41, South 66; State R1 47; Central 3rd place 12. **Verified?** Yes: every 2024-25 girls region and the State now match the TrackWrestling export bout for bout (308 / 279 / 314 / 295 / 262). Integrity check unchanged. **Reversible?** Yes (delete by the ids in the backup).

---

## 2026-11-09 — Girls 2024-25: six WW-P South entries stored at North

**Migration file:** `docs/migrations/20261109_girls_2025_wwp_south_entries.sql`

**Purpose:** Six West Windsor-Plainsboro South girls at the 2024-25 Central region were stored at WW-P North (176): Gupta, Xu, Kang, Reyes De Leon, Rochkind, McKoy. TrackWrestling labels them South, five are linked by name at South, and Xu is entered at South in 2025-26. Found while matching the 2024-25 standings. A new check, `scripts/audit_entry_school_labels.mts`, compares every entry's TrackWrestling label with its school: these six are the only real mismatches across both genders and both seasons. The two 2025-26 "East Side" girls it flags in District 2 are correctly Paterson Eastside.

**Changes:** the six entries move to WW-P South (177).

**APPLIED** — 2026-11-09, Supabase SQL editor. **Verified?** Yes: 6 at school 177. **Reversible?** Yes.

---

## 2026-11-09 — Girls 2024-25: the JFK/Woodbridge/Colonia co-op under Colonia

**Migration file:** `docs/migrations/20261109_girls_2025_jfk_woodbridge_colonia_coop.sql`

**Purpose:** In 2024-25 Iselin Kennedy (150), Woodbridge (187) and Colonia (149) wrestled girls as one co-op, "JFK/Woodbridge/Colonia". Every 2024-25 postseason bout of its girls lists that name, and TrackWrestling scored it as one team (North 2, 12th, 53.5). In 2025-26 they are three separate teams. Kyle: the co-op season goes under Colonia; the other two are inactive that season; everything else stays.

**Changes (2024-25 girls only):**
- Colonia's season name becomes "JFK/Woodbridge/Colonia".
- Iselin Kennedy and Woodbridge are marked inactive (girls; their boys and other seasons are unchanged).
- Kotsonis's and Cruz's region entries move to Colonia, joining the co-op's other four.

The co-op's official 53.5 goes on Colonia with the missing 2024-25 standings rows (next).

**APPLIED** — 2026-11-09, Supabase SQL editor. **Verified?** Yes: 6 entries at Colonia; season name "JFK/Woodbridge/Colonia"; 150 and 187 inactive (2024-25 girls). **Reversible?** Yes (rollback note in the file).

---

## 2026-11-09 — Girls 2024-25 postseason, step 1: State Round 1 and region 3rd place bouts

**Migration file:** `docs/migrations/20261109_girls_2025_state_r1_region_thirds.sql` (built by `scripts/build_girls_2025_r1_and_thirds.mts`)

**Purpose:** The 2024-25 girls regions (Central 134, North 1 135, North 2 136, South 137) and State (138) were loaded from Round 2 on: no Round 1 bouts and no region 3rd place bouts, so those region pages show only 1st and 2nd. Found by `scripts/compare_girls_bracket_counts.mts` and `scripts/audit_girls_2025_regions.mts` against the TrackWrestling exports.

**Changes:** 92 bouts whose two wrestlers already have entries: State Round 1 46, region 3rd place 46. Each is checked not already stored.

**Left for step 2:**
- 3 bouts with a wrestler who has no entry: Keyra Huastitlan Reyes ×2, Franchesca Edouard.
- The 255 region Round 1 bouts. Every one has a wrestler with no region entry: 265 wrestlers, 171 linked by name at their school, 94 not.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Reversible?** Yes (no such rows existed before). **Verified?** Yes: State R1 46; 3rd place: Central 10, North 1 12, North 2 12, South 12.

**Also found:** 82 teams in the 2024-25 girls TrackWrestling standings have no official row (Central 7 including Jackson Memorial 180, North 1 13, North 2 10, South 8, State 44); their names weren't matched at load. Among them is JFK/Woodbridge/Colonia, a 2024-25-only girls co-op with no school record (2025-26: Colonia, Woodbridge and Iselin Kennedy compete separately). Every 2024-25 postseason bout of its girls lists the co-op name. How to record the co-op is waiting on Kyle.

---

## 2026-11-09 — Girls 2025-26 postseason brackets: where they stand

**Bouts vs the TrackWrestling export** (`scripts/compare_girls_bracket_counts.mts`):
- All 12 districts, Regions 2–4 and State match bout for bout.
- Districts 5, 6 and 7 also carry the cons. semifinals taken from the PDFs, which the export never had.
- Region 1's export stops partway; its stored bouts came from the PDFs (2026-11-02).

**Team scoring vs official totals** (`scripts/check_girls_team_scoring.mts`):
- **State 117 / 117:** boys state rules.
- **Districts 227 / 234:** boys rules, with byes counted from Round 1 of the 32-man bracket and places 16/12/9/7/5/3.
  - North Brunswick −2, Red Bank Regional −1 and Freehold Township −2 look like unlisted team deductions.
  - Raritan, Howell, Hamilton West and Cherry Hill are +1 each, unexplained.
- **Regions 190 / 191 (settled the same day with Jackson Township's per-wrestler points from Kyle):** 1 point per championship win from the QF on, no consolation advancement, no bye points, places 18/14/11/9/6/4. The double forfeit in Region 2's 152 5th place bout gives both wrestlers 6th. Delran +1, unexplained. Written up in `docs/reviews/trackwrestling_team_scoring.md`.

The official copied totals on the site were never affected.

**Afterwards:** girls 2025-26 ratings rebuilt (`scripts/.local/run.mts`, RUN_BODY {"gender":"F"}; it ends with the known harmless "cookies outside request scope" error after the writes; it was run twice, the second time unnecessarily, with the same result); `lb_rs_refresh` (2,403 wrestlers, 249 teams) and `lb_ps_refresh` (4,519 wrestler rows, 1,011 team rows) for F / 2026. Integrity check unchanged (3 known).

---

## 2026-11-09 — Girls State (2025-26): two overtime bouts that ended by a fall

**Migration file:** `docs/migrations/20261109_girls_state_overtime_falls.sql`

**Purpose:** Gyssell Andrade (Morristown) "won in SV-1 by fall" (6:11) and Jeveah Turner (Rancocas Valley) "won in TB-1 by fall" (7:41), but they were stored as SV-1 and UTB with no time, so the 2-point fall bonus was missing. Morristown and Rancocas Valley were each 2 below their official totals. These are the only overtime-by-fall results in any TrackWrestling export, boys or girls.

**Changes:** both set to FALL with the export's time.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Verified?** Yes: both FALL (371, 461 s). Every 2025-26 girls state school now matches its official total (117 / 117).

---

## 2026-11-09 — Girls State (2025-26): duplicate consolation semifinals; Coletta's 7th place bout

**Migration file:** `docs/migrations/20261109_girls_state_dup_cons_semis_and_7th.sql` (built by `scripts/build_girls_state_fix_20261109.mts`). Backup: `docs/migrations/backups/20261109_girls_state_duplicate_cons_semis_before.json`

**Purpose:**
- **Duplicates:** the 24 cons. semifinals (C4) are each stored twice, identical; the export has 24. Two at every weight, so each of those 48 wrestlers' records counts the bout twice.
- **Missing bout:** the 107 7th place bout is missing: Olivia Mitchell (East Brunswick) over Kayla Coletta (Mary Help of Christians), TF-1.5 2:10 (18-3). The 2026-10-26 Coletta restore missed it; both placement rows are stored.

**Changes:** delete 24 duplicate rows (the copy with the larger id; the twin stays); add the 7th place bout. Nothing references a match row by id.

**APPLIED** — 2026-11-09, Supabase SQL editor (delete approved by Kyle; the first run was stopped by the protected-delete guard and changed nothing). **Verified?** Yes: C4 24, 7th_Place 12. State matches the export bout for bout (360 = 360), and the girls state scoring check has 115 / 117 schools exact (was 93). Integrity check unchanged (3 known). **Reversible?** Yes (re-insert from the backup).

---

## 2026-11-09 — Girls districts (2025-26): forfeits marked as over a filler entry or an empty slot

**Migration file:** `docs/migrations/20261109_girls_district_forfeit_opponents.sql` (built by `scripts/build_girls_forfeit_opponents.mts`)

**Purpose:** `matches.forfeit_opponent` tells the scoring rules what a forfeit win with no loser was over. A filler entry ("over A Forfeit (Team Forfeit)") counts as a contested match for bye points; an empty slot ("over ()") does not; both earn the win and the 2 bonus. The boys districts were marked on 2026-11-05; the girls never were, so the rules credited byes TrackWrestling doesn't. That is why District 4 was over by 2 per such case.

**Changes:** 190 girls district forfeits marked from the export: 116 filler, 74 empty (73 in District 4). How each kind is recognised:
- A loser named with no school ("Josephine Lemke ()") is a 2026-11-02 filler name, so filler.
- The cons. semifinal forfeits added from the PDFs (Districts 5 and 6) show a "Forfeit" entry, so filler.
- One spelling fallback, "La`Niyah" vs "Niyah" Hercules: the one wrestler at the weight with that last name.

No result, record or official total changes.

**Proof before running:** the girls scoring check with these labels applied in memory (`--labels`): every District 4 school matches; 12 districts 219 / 234. Of the 15 left, 11 are District 7 (cons. semis pending) and 4 are in Districts 9 and 11.

**APPLIED** — 2026-11-09, Supabase SQL editor (filler 116, empty 74). **Reversible?** Yes (set back to NULL). **Verified?** Yes: the girls scoring check on stored data gives 227 / 234 girls district schools exact; every District 4 school matches.

---

## 2026-11-09 — Girls District 7 (2025-26): consolation semifinals

**Migration file:** `docs/migrations/20261109_girls_d7_cons_semis.sql` (built by `scripts/build_girls_district_cons_semis.mts 7`)

**Purpose:** Same gap as Districts 5 and 6: the export has no "Cons Semis" section for District 7, and none are stored. With the other fixes in, District 7's schools were short in steps of 3 (and 2), the value of cons. semis.

**Changes:** 23 bouts from the bracket PDFs. 235 bout 131 was a bye (Erlich, no opponent), so it is skipped.

**Checks (stricter build script):**
- Each bout pairs a semifinal loser with a quarterfinal loser. The QF loser is usually the cons. round 1 winner; in District 7 some moved up on a bye when their cons. round 1 slot was empty.
- The winners are the 3rd place bout's wrestlers and the losers the 5th place bout's.
- Names now also match on the end of a last name: Faith "Marie Soto" (D7 165), a first/last split to tidy later.

**APPLIED** — 2026-11-09, Supabase SQL editor (District 7: 23). **Reversible?** Yes (rollback line in the file).

**Girls districts after all of today's fixes: 227 / 234 schools exact.**
- **3 lower officially (likely team deductions, which TrackWrestling folds into the total unlisted):** North Brunswick −2, Red Bank Regional −1, Freehold Township −2.
- **4 one point higher officially, not explained:** Raritan, Howell, Hamilton West, Cherry Hill.
- Every bout matched to the export in Districts 7, 9 and 11 (444) has the same result type.
- Integrity check unchanged (3 known).

---

## 2026-11-09 — Girls Districts 7 and 8 (2025-26): forfeit wins over filler entries

**Migration file:** `docs/migrations/20261109_girls_d7_d8_forfeit_wins.sql` (built by `scripts/build_girls_district_forfeits.mts`)

**Purpose:** The TrackWrestling export lists 18 wins like "Tanvi Madisetti (Lawrence Senior) won by forfeit over E Forfeit (Team Forfeit)" with no stored bout: District 7 4 (QF), District 8 14 (QF 8, C1 4, cons. semi 2). A forfeit over a filler entry is a contested win (advancement plus 2 bonus); the other districts store theirs as FORF with no loser, and these follow.

**Also checked, all 12 districts:** no stored forfeit win is a bye in the export. District 4's 66 Round 2 forfeit wins read "won by forfeit over ()", a forfeit over an empty slot, so they are correct. I first flagged them as byes because `compare_girls_bracket_counts.mts` couldn't read the "over ()" form; that is fixed, and District 4 matches the export, 231 = 231.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Reversible?** Yes (rollback note in the file). **Verified?** Yes: District 7 4, District 8 14; both districts now match the export. Every District 8 school equals its official total.

---

## 2026-11-09 — Girls District 2 (2025-26): Isabella Jimenez's entry and bouts

**Migration file:** `docs/migrations/20261109_girls_d2_jimenez_entry.sql`

**Purpose:** Isabella Jimenez (Fair Lawn, profile 999466eb) had no District 2 120 entry, so three bouts were missing: her Round 2 win over Maya Espinosa (fall 3:11) and her losses to Noelanii Guzman Caban (QF, fall 1:00) and Cristelle Fiestas (cons. R1, fall 5:14). Source: the TrackWrestling export. Two girls share the name; the other wrestles for East Brunswick (District 7 138). The 2026-11-01 split moved no District 2 entry, so none existed then.

**Changes:** 1 entry (Fair Lawn, grade 9 / Fr, no seed, like the bracket's other entries) and 3 bouts.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Reversible?** Yes (rollback note in the file). **Verified?** Yes: R2 W Espinosa (191 s), QF L Guzman Caban (60 s), C1 L Fiestas (314 s); District 2 matches the export.

---

## 2026-11-09 — Girls Districts 5 and 6 (2025-26): consolation semifinals

**Migration file:** `docs/migrations/20261109_girls_d5_d6_cons_semis.sql` (built by `scripts/build_girls_district_cons_semis.mts`)

**Purpose:** The TrackWrestling text export has no "Cons Semis" section for Districts 5 and 6, so those bouts were never loaded; the other ten girls districts have theirs (round C3). Found by `scripts/compare_girls_bracket_counts.mts` and the girls scoring check: with the scoring rules settled (Round 1 byes counted; places 16/12/9/7/5/3), these two districts' schools came up short in steps of 3 points, the value of a cons. semi won by fall.

**Changes:** 46 bouts read from the final bracket PDFs (`Whizzer Upload/2025-26 Postseason Brackets/2026 Girls/District 5|6/`):
- 43 contested;
- 3 forfeit wins over an empty bracket slot, stored like the other districts' (FORF, no loser): Adjogble D5 235, Rios and Alvardo-Martinez D6 185;
- District 6 235 (one wrestler) has only empty slots, so nothing is added there.

**Checks before writing:** every bout pairs a semifinal loser with a cons. round 1 winner; the winners are exactly the stored 3rd place bout's wrestlers and the losers the 5th place bout's.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Reversible?** Yes (rollback line in the file). **Verified?** Yes: District 5 24, District 6 22. Every school in both districts now equals its official total (the scoring check, exact-bracket districts: 124 → 149 of 153). Integrity check unchanged (3 known).

---

## 2026-11-09 — Crawlers: robots.txt, one address, firewall block

**No database changes.**

**Why:** On 2026-11-09 Vercel paused the account (Hobby fair-use limit, CPU time); Kyle upgraded to Pro. Traffic had jumped from about 9k to 45k requests a day on 2026-10-25 (no change on our side that day). The first request logs available (3 hours, 2026-11-09) show about 75% crawlers: Amazonbot 1,851 of 3,304 requests, ElevenlabsCrawler 440, PetalBot 142, MJ12bot, OpenAI and others. 92% were full server builds (cache MISS), mostly wrestler profiles, and the crawlers read both matwhizzer.com and matwhizzer.vercel.app.

**Changes (Kyle: allow Google, Bing and Apple search; block OpenAI and the AI / data crawlers):**
- **`src/app/robots.ts`:** allows Googlebot, Bingbot and Applebot (not /admin, /api, /auth, /settings, /profile) and the link-preview fetchers (Facebook, X, Slack, Discord, LinkedIn, WhatsApp, Telegram). It opts out of Google-Extended and Applebot-Extended (AI training; search unaffected) and disallows everyone else.
- **`next.config.ts`:** matwhizzer.vercel.app permanently redirects to matwhizzer.com.
- **Vercel firewall rule "Block AI and data crawlers"** (project firewall, published with the CLI): deny when the user agent matches Amazonbot, ElevenlabsCrawler, PetalBot, MJ12bot, GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Bytespider, CCBot, meta-externalagent, AhrefsBot, SemrushBot, YandexBot, Baiduspider and others. Exact names, case-sensitive: the firewall rejects the (?i) flag. Checked: Googlebot, Bingbot, Applebot, Facebook previews and browsers pass; it would have stopped 2,481 of the 3,304 requests in the sample.

---

## 2026-11-09 — Girls Region 1 (2025-26) placement rows

**Migration file:** `docs/migrations/20261109_girls_region1_placements.sql`

**Purpose:** The `placements` table had no Girls Region 1 rows; Regions 2-4 have 70, 72 and 72. The bouts were complete (place bouts loaded 2026-11-02 from the bracket PDFs) and the region pages read places from the bouts, so they were right. What reads this table and was missing Region 1: postseason wrestler points (`district_wrestler_points`, `lb_p_wrestler_points`), the personalized home page, and ghost champions (none of Region 1's champions was seeded 5th or lower, so none were actually missing).

**Changes:** 72 rows built from the final, 3rd and 5th place bouts, the same way Regions 2-4's are. Checked 2026-11-09: their stored rows equal their bouts exactly.

**APPLIED** — 2026-11-09, Supabase SQL editor. **Reversible?** Yes (delete Region 1's rows). **Verified?** Yes: 12 weights with places 1-6; Region 1 stored 72 = from bouts 72 (Regions 2-4 unchanged); integrity check unchanged (3 known).

---

## 2026-11-07 — Account emails through Resend; reset links fixed

**No database changes.**

**What was wrong:**
- **Reset link:** Supabase's link sent people to the site with the login details after a `#` in the address (`#access_token=…`), which the site's sign-in code doesn't read. Public resets reached the set-password page but couldn't save, and the admin "send reset" button's link went to `/auth/confirm`, which can't see past the `#`, so it fell through to the sign-in page.
- **Supabase's mailer:** sign-up confirmations, admin invites and admin resets went out through it; only the public reset used Resend.

**Now:** `src/lib/authEmail.ts` creates the link with `generateLink` (and, for sign-up, the account) and emails it through Resend. The link comes back to `/auth/confirm?token_hash=…&type=…`, which checks the token on the server, signs the person in and opens `/auth/reset-password` (reset and invite) or `/email-confirmed` (sign-up). Used by:
- `/api/auth/forgot-password`, which now gives the same answer whether or not the address has an account;
- the new `/api/auth/signup`, which the sign-up page now calls;
- the admin profiles invite and reset in `api/admin/admin-profiles`.

The set-password page shows "This link has expired" with a button to send a new one when the link is used or out of date, and goes home after saving.

---

## 2026-11-07 — Icons next to names explain themselves

**No database changes.** There's a new `src/components/site/IconHint.tsx`: its note shows on mouse hover, or on a tap on a phone, and it's placed on the page so table scrolling can't cut it off. It's on:
- 👑 state champion;
- 🥈/🥉 and S4–S8 state places;
- 👻 ghost champion: won the tournament seeded 5th or lower, with the seed when known;
- the green ↑N upset ("Seeded #7, finished 2nd: 5 spots better than seeded");
- SQ state qualifier;
- 🏆 on the girls team state champion.

**Fix found while checking:** girls region pages list places 1–6, so the ↑ upset marker showed ↑0 and ↑−1 for 5th and 6th seeds who finished at or below their seed. It now shows only when a wrestler finished better than their seed (all four region and district pages).

Pages: region and district overviews, state overview (`StateContent`), state weight pages, State Champions, and girls team post season (both sides where they apply).

---

## 2026-11-07 — Standard site look goes live (Kyle approved the mock)

**No database changes.** The live site now follows the Aesthetic Tool's saved look.

**How the look is applied:**
- **Shared definition:** `src/lib/siteLook.ts`, used by both the tool and the site.
- **Loader:** `siteLookServer.ts` reads the newest `site_aesthetic_versions` row, cached 5 minutes under the `site-look` tag. A Save in the tool clears that cache.
- **Site layout:** loads the look, loads the chosen fonts from Google Fonts, and passes the look to the pages (`SiteLookProvider`).
- **Shared pieces:** `StdHeader` and `StdTiles` (`components/site/StdPage.tsx`), `FilterDrop`, `PostseasonParts` (weight tiles, R/D pills), `ComingSoon`.

**Header (`HeaderNav.tsx`):**
- **Labels:** Scores (was Schedule), Leaders (was Leaderboards), Insight (was About).
- **Proposed layout:** the account menu sits left of the logo, and Boys/Girls sits left of a search box that shortens on phones.
- **Toggle:** Boys/Girls always goes to that side's home page.

**Pages:**
- **Insight:** five tabs; see the Insight entry.
- **Scores:** the standard header; Conference, Group and Section are dropdowns. Conference works on its own; Group and Section now narrow together (before, the query matched either one).
- **Leaders:** the standard header with the season picker, phase tabs in the header, Individual first and now the default (`config.ts`), and the filter under the tabs. Each pick applies at once; Conference and Section/Group switch each other off.
- **Standings:** the standard header with a picker, Group/Conference tabs, sections × groups as tiles in region colors, conferences as accent tiles (no logos), and the girls lists as tiles.
- **Tournaments:** one shared page (`TournamentsList.tsx`) filtered by the picked season (it used to show every season), with month tabs; it opens on the month of the latest started tournament.
- **Head to Head:** the standard header, no picker.
- **Team Post Season:** the season picker (it used to show the live season only). Boys has group tabs (Group 1–5, Non-Public) and section tabs (A/B under Non-Public); they toggle, alone or together, and nothing picked shows every bracket. Girls has North/South tabs. With no seeds yet: "Brackets coming soon".
- **Individual Post Season:** one shared page (`IndividualPostseason.tsx`). The State, Regions and Districts buttons come first, each shown only once its bracket is set (the season's tournament has entries), with "Brackets coming soon" otherwise. Then State Champions, On the Podium (a table where a school opens to its placers) and Team Point Leaders, once they have results. The unused search code is removed.
- **Region / District / State:** the standard header with the picker. Region pages keep the R pills; district pages get D pills. Weights are accent tiles. The logo banners, back links and logo lookups are removed.

---

## 2026-11-07 — Aesthetic Tool saves

**Migration file:** `docs/migrations/20261107_site_aesthetic_versions.sql` (Kyle ran it 2026-11-07; new table `site_aesthetic_versions`: settings jsonb, note, saved_by, created_at; service role writes, public read for the live pages later). **API:** `src/app/api/admin/aesthetic/route.ts` (admin only). It returns the look in effect, which is the newest save, plus the last 20 saves and any earlier save by id, and adds a new save.

**Tool:** a "Saved look" panel.
- **Loading:** the look in effect loads when the tool opens.
- **Save:** takes an optional note.
- **Unsaved changes:** a marker shows when something differs from the saved look.
- **Revert:** goes back to the saved look.
- **History:** loads an earlier save back into the tool; saving it makes it the look in effect.
- **Defaults:** returns to the starting look.

A saved look is merged over the defaults, so settings added later get their default until saved. Next: the public pages read the look in effect when the standard look goes live.

---

## 2026-11-06 — Site look: shared page frame, region colors, Aesthetic Tool (step 1)

**Code only (Kyle's plan, agreed):**
- **`src/lib/siteTheme.ts`:** the site theme.
  - Boys region colors: odd regions are four navy shades, 1 lightest to 7 darkest; even regions are four light grays, 2 nearly white to 8 a regular gray. Numbers on navy use region 8's gray; numbers on gray use region 7's navy.
  - Girls: the same pattern in rose and gray.
  - District to region: boys ceil(d/4), girls ceil(d/3). District buttons take their region's color.
  - The stencil font options.
- **Shared components:** `src/components/site/SitePageHeader.tsx` (title, subtitle, season row in a fixed place, optional small logo) and `src/components/site/NumberTileGrid.tsx` (the standard button grid). Every public page moves onto these next, one page at a time.
- **Aesthetic Tool:** `/admin/aesthetic` (Admin Settings). A live preview built from those same components, with controls for colors, stencil font, tile size, corners and header options. Preview only: approved settings are copied out and written into the theme.
- **Fix, same day:** the tool first redirected to a missing page, because a top-level admin folder has to be listed in `UNIVERSAL_ADMIN_SEGMENTS` (`src/lib/admin-side.ts`). It's listed now, and `scripts/check-admin-routes.mjs` fails the build if any admin page folder isn't.
- **Mock site (Kyle):** `src/app/admin/aesthetic/MockSite.tsx`, the tool's default view. A copy of the public top nav, with a Boys/Girls switch, Schedule, Standings, Leaderboards, Tournaments, Post Season (Team, Individual, Districts, Regions, State), H2H and About. Each link opens that page in the standard frame with sample content, all following the tool's settings.
- **Round 2 (Kyle's notes):**
  - **Header:** the title is anchored left with a rule under it, then the season picker, then a one-line summary, then tabs.
  - **Tabs:** `src/components/site/SiteTabs.tsx` uses the Leaderboards underline style, now the one tab style for every page.
  - **Grouped tiles:** `NumberTileGrid` keeps tiles in fixed blocks (4 boys districts per region, 3 girls), so a region's districts never split across lines.
  - **Mock pages:** they keep each live page's layout. Standings has Group/Conference tabs, Leaderboards Team/Individual plus category tabs, and Tournaments month tabs with a Winner column. The Post Season menu has Team and Individual only. Individual keeps its order (State Champions, On the Podium, Team Point Leaders, the State button, Regions, Districts) with the new buttons.
- **Round 3 (Kyle's notes):**
  - **Header:** the title is the live size (text-2xl bold).
  - **Schedule:** keeps its live page.
  - **On the Podium:** a table on the Individual and State pages; click a school to list its placers (weight, wrestler, place).
  - **Individual page:** the State, Regions and Districts buttons are centered, and region/district buttons open the mock region and district pages.
  - **Region and district pages:** the standard header, the live R1–R8 / D pill switcher, and standard weight buttons.
  - **Accent color:** weight, conference and State buttons use boys region 7 or girls region 3.
  - **Tile grid:** `NumberTileGrid` gained `onClick` and `center`.
- **Round 4 (Kyle's notes):**
  - **Header controls:** the tool picks the title font from every loaded font (the site default, four stencils, and Oswald, Bebas Neue, Barlow Condensed, Archivo Black, Roboto Condensed) and sets the title size. `SitePageHeader` gained `titleSize`.
  - **Summaries:** every page's summary line is editable in the tool.
  - **Leaderboards mock:** the "Filter by" box sits under the tabs with the live look, but each list is a dropdown that starts at All, with what's picked shown under its label. Picking a conference turns Section and Group off, and the reverse. The table keeps click-to-sort headers.
- **Round 5:** the Schedule mock uses the standard header and keeps the live body (the controls box and the date table). Conference, Group and Section are three dropdowns instead of checkboxes that open lists: Conference on its own, Group and Section together.
- **Fix (Kyle caught it):** the mock's header had been approximated, which dropped the hamburger account menu, moved the Boys/Girls toggle and left out the Standings dropdown. It's now copied from `HeaderNav.tsx`: logo and account menu, the nav row with the toggle at the right end, Standings opening on hover (Group, Conference), Post Season as a menu, and the search row.
- **Round 6 (mock only):** the nav says Scores (was Schedule) and Leaders (was Leaderboards). A "Site header" switch shows a proposed header (hamburger left of the logo, Boys/Girls left of a search bar that shortens to fit) or the live one, and a Phone width option previews it at 390px.
- **2026-11-07:** the "Phone width" checkbox is removed (Kyle: it only narrowed the desktop layout, since the phone layout switches on from the real screen size). Open the tool on a phone to see the phone view.
- **2026-11-07, mock:** Boys/Girls (and the logo) always go to that side's home page, even from the side you're on. **Fonts:** the tool's extra fonts now load from Google Fonts in the browser instead of through next/font at build time. A failed Oswald download had broken a deploy (Can't resolve '@vercel/turbopack-next/internal/font/google/font'); the code hadn't changed since 10 good builds.
- **2026-11-07, Leaders (mock only):** Individual is now the first tab, ahead of Team, since it's the default. Live still lists Team first and changes when the mock goes live.
- **2026-11-07, Insight (mock only):** About becomes Insight, with tabs Daily Report (7 Things, Report), Rankings, Daily Challenge, Polls and About. I first pushed it to the live site by mistake; it was reverted the same day, so the live site still has About.
- **2026-11-07:** Team Post Season mock: a group tab row (Group 1–5, Non-Public, as live) and a section tab row (girls: North, South). Each tab toggles, alone or one of each. Individual mock: the State, Regions and Districts buttons are above State Champions.
- **2026-11-07:** the Head to Head mock has no season picker, since the feature spans seasons (Kyle).
- **Nav:** the top-nav "Schools" link is removed for boys and girls (Kyle: redundant with search). The schools list pages remain.

---

## 2026-11-06 — State page heading follows the picked season

Also: the Post Season → Individual pages (`postseason/individual/boys|girls/page.tsx`) show the season picker at the top (Kyle). They already followed the picked season but had no picker on the page.
The girls Individual page and the girls home page (`/girls`) asked for the State Champions of tournament 185 (2025-26) by number, so 2024-25 still showed the 2025-26 champions. Both now look up the picked season's state tournament, as the boys pages do.

**Code only:** `StateHeader.tsx` had the year typed in as "2026", so the boys and girls state pages read "State Tournament 2026" even with 2024-25 picked (Kyle thought girls 2024-25 wasn't on the site). It now shows the picked season's championship year. Also added two read-only scripts: `scripts/check_girls_team_scoring.mts` (girls totals vs official) and `scripts/compare_girls_brackets_20261106.mts` (girls source brackets vs stored bouts). They found the girls brackets incomplete: District 7 and 9, Regions 1 and 2 (2025-26), all four 2024-25 regions and 2024-25 state.

---

## 2026-11-06 — School profiles show the address

**Code only:** `SchoolProfileCore.tsx` reads `schools.address` (all 318 NJ schools have one), and `SchoolHeader.tsx` shows it under the mascot, in the name box, as a Google Maps link, on boys and girls school pages.

---

## 2026-11-06 — Dual bouts missing their winner; dual page uses stored team points

- **Data:** `scripts/fix_dual_missing_winner_20261106.mts` (service role; backup `backups/20261106_dual_missing_winner_before.json`). 15 boys dual bouts had team points for one side but no `winner_id`. All were imported 2026-08 and involve four wrestlers (Jayden Cruz, Sebastian Soto, Joshua Martinez, Tyler Davis); the cause is unproven, since the 2026-11-05 merge script does move `winner_id`. The winner is now the wrestler on the side with the points, so the wins count in their records and ratings.
- **Integrity check:** new rule "duals: team points but no winner" (boys and girls).
- **Code:** `src/app/(site)/meets/[id]/page.tsx` runs the score from each bout's stored `team1_points` / `team2_points`, the source's own points, instead of re-deriving them from the result and `winner_id`. It falls back to the old calculation only when those are missing. Shawnee v West Deptford had shown 38-32 because of Tyler Davis's missing winner; it now shows 43-27 through the "Coach Misconduct −1" row. Kyle ran `20261106_dual_adjustments_public_read.sql` (anon count 206).

---

## 2026-11-06 — Graduation years; class per season on profiles

- **Backfill:** `scripts/backfill_graduation_year_20261106.mts` set `wrestlers.graduation_year` for 11,175 NJ wrestlers from their grade. A grade from the Track roster upload or a manual edit is a 2025-26 class; a grade from a district entry belongs to that entry's season. A year is set only when every tournament entry's own grade gives the same class. 30 conflicts were left blank (`docs/reviews/grade_conflicts_20261106.md`). `scripts/resolve_grade_conflicts_20261106.mts` (Kyle: try it) settled 20 by majority of independent records: each bracket entry's grade, the profile grade, and the Track roster row, with the roster row counted once when the profile grade was copied from it. The settled 20 got their graduation year, and their grade was set to that class's 2025-26 grade, which changed 14 profile grades that had been a year behind (all hand-entered). Backup: `backups/20261106_grade_conflicts_before.json`. The 10 ties were settled by Kyle the same day (`scripts/fix_grade_ties_20261106.mts`; backups `backups/20261106_grade_ties_*`):
  - Jimenez, Allen, Villanueva and Butler are 2025-26 juniors.
  - On the three Kyle left to me, the 2024-25 bracket grade advanced: Lopez Diaz Sr, Donoghue Jr, Goss So.
  - Scanlon and Lawrence were 2024-25 seniors: graduated 2025, inactive.
  - **Silva** was two Delran wrestlers on one profile named "Gabriella", which is neither's name. The 2024-25 Region South entry belongs to **Gabrielly Silva**, a senior (graduated 2025): she got a new profile and name link, and the entry moved to her. The 2025-26 bouts and links belong to **Grazyelle Silva**, a junior: the profile was renamed. Girls ratings were rebuilt and leaderboards refreshed. Backup: `backups/20261106_graduation_year_before.json`.
- **Boys (Kyle):** the 232 boys whose only record is 2024-25, underclassmen then and marked inactive, are still in school, like the 87 girls. They're now active and advanced to their 2025-26 class (55 Fr→So, 72 So→Jr, 105 Jr→Sr). "Active" now means still in high school; a season's roster comes from that season's matches.
- **Kept in step:** **Migration file:** `docs/migrations/20261106_graduation_year_from_grade.sql` (Kyle ran it 2026-11-06; check: 26 boys and 4 girls with a grade but no graduation year, which are the 30 conflicts, plus 2 out-of-state boys). A trigger on `wrestlers` sets `graduation_year` when a grade is set or changed and the write doesn't set it itself. `grade_season` holds the season the grade column describes, 2025-26 for both programs. **Code:** both Season Rollover routes advance `grade_season` by one before advancing grades.
- **Profiles:** `WrestlerProfileCore.tsx`. Each season's heading reads "2024-25 — Collingswood — Freshman", and the Career Stats season column reads "2024-25 · Fr", both from the graduation year. The first season on file gets a ★ and the note "postseason results only". A wrestler who was a sophomore or older that season gets the note that records begin with that season.

---

## 2026-11-06 — The 292 girls (2024-25-only profiles)

**Script:** `scripts/fix_girls_2025_only_20261106.mts` (service role). **Backup:** `backups/20261106_girls_2025_only_before.json`. The girls marked active with only a 2024-25 postseason entry (no name link, no 2025-26 match) have their grade from that 2024-25 entry. Kyle ruled:
- **204 seniors** graduated in 2025: `is_active = false`, `graduation_year = 2025`.
- **87 underclassmen** are still in school (they may just not have come out for the team). They stay active, take their 2025-26 class (+1: 23 Fr→So, 31 So→Jr, 33 Jr→Sr) and get a `graduation_year`, so they keep rolling over. They're on no 2025-26 roster, since rosters come from matches.
- **1** with no grade is unchanged.

The integrity check is unchanged (34 rules, the same 3 known failures).

---

## 2026-11-06 — Dual page shows team-point adjustments

**Migration file:** `docs/migrations/20261106_dual_adjustments_public_read.sql` (read grant + policy for anon/authenticated on `dual_meet_deductions` / `_girls`). **Code:** `src/app/(site)/meets/[id]/page.tsx`. A dual's adjustments (deductions, tie-breaker criteria points, corrections) are listed under its bouts, and the running score carries through them, so the last row equals the final score. A label that's just a weight reads "Team point deduction (157)". A set netting to zero for both teams (a "wrong score" line and its reversal) is not shown.

---

## 2026-11-06 — Review fixes

- **Loaders keep the TF-1 corrections:** `src/lib/officialTeamScoreCorrections.ts` lists the six approved +0.5 corrections. Both official-totals loaders (`build_boys_official_district_team_scores.mts`, `build_boys_official_postseason_team_scores.mts`) apply them before writing, so a reload no longer reverts them. A loader stops if TrackWrestling's figure for a corrected school ever changes.
- **Integrity check:** the "same wrestler on both sides" rule is back for duals (boys and girls; both pass). Kyle's bye rule was about tournament bouts, and the 2026-11-06 change had wrongly turned the dual rule off too.
- **Parser regression test:** every source dual file was parsed with the pre-2026-11-05 parser and with today's. None of the 4,794 duals lost a bout, had a bout's points change, or had its listed score change, and 148 bouts were gained. The only differences are weights mapped from non-NJ weight sets.

---

## 2026-11-06 — Dual adjustments that add points; girls typos

- **Run (Kyle ran the migration):** `backfill_dual_deductions_20261105.mts` added 17 boys and 15 girls adjustments. Morris Hills v West Morris Central 2/4 got a "157" −1 for WMC from Kyle's pasted page, so it now adds up to 25-43. A second run of `backfill_mapped_weight_bouts_20261106.mts` added West Deptford v Buena's 9 bouts and its "wrong score" ±48 pair (net 0); backups `..._inserted_run1.json` / `_run2.json`. The first run had added one girls double forfeit twice (dual 4f531491, 126, 0-0). The script now skips a no-name bout when that weight already has one, Kyle approved deleting the extra row: `scripts/fix_duplicate_df_20261106.mts` deleted it (6803335c; the September original 3a8c449f is kept). Backup: `backups/20261106_duplicate_df_before.json`.
- **Ratings (Kyle: rerun):** boys 2025-26 archive rebuilt with nothing else running, after girls 2025-26. Leaderboards were refreshed for both. The integrity check has 3 failing rules: Delsea and Schalick v Delran (both left for review) and the pinned 82. The snapshot is unchanged.
- **JV copies (Kyle: only varsity counts):** `scripts/fix_jv_duals_20261106.mts`. Collingswood v Paulsboro 1/14 and Highland/Triton v Williamstown 1/28 were stored from the JV copy, with repeated weights. Their 13 JV bouts (7 + 6) were replaced by the 28 varsity bouts, and the finals set to 44-22 and 36-33. Backup: `backups/20261106_jv_duals_before.json`.
- **Parser:** an adjustment label may also be punctuation only (Highland's ". 0 36.0", cancelled by "wrong sc0re 0 −36.0").
- **Left:** Delsea v Council Rock North (two bouts at 285; Kyle: leave), and Schalick v Delran 1/19 (girls; the file has several Schalick–Delran duals that day, and the copy matching our final lists 9 of 12 weights).

- **Adjustments:** TrackWrestling's lines after a dual's bouts aren't all deductions. They also include tie-breaker criteria points, which are often listed explicitly ("Criteria F: Least amount of forfeits 1.0 0"), a point to the opponent ("Steinert Wrestler Throwing Headgear 1.0 0"), corrections ("kids not present on track 0 18.0", WW-P North's −6 then +5), and labels that are just a weight ("157 0 −1.0").
  - **Code:** both parsers now read any line with a decimal amount or a negative one.
  - **Migration file:** `docs/migrations/20261106_dual_adjustments_positive.sql` drops the "≤ 0" checks on `dual_meet_deductions` (_girls).
  - **Dry run:** 205 boys / 21 girls adjustments in duals that add up (was 187 / 6). Every newly found line adds up to its dual's listed score.
- **Girls typos** (`scripts/fix_girls_dual_typos_20261106.mts`, backups `backups/20261106_girls_dual_typos_*`):
  - Scotch Plains-Fanwood v North Plainfield 2/11: the 138 bout was listed with weight "S" (Costello over Manuel-Corona, Fall 1:37) and is added.
  - Pemberton v Lakewood 12/13: a tech fall listed as 11 team points is stored as 5.

---

## 2026-11-06 — Dual bouts at non-NJ weights (Lodi/Saddle Brook, Pennsylvania, Don Bosco, girls)

- **Why:** some duals are listed at other weights. Lodi/Saddle Brook uses 145, 152, 160, 170, 182, 195, 220. Pennsylvania schools use 107…189, Don Bosco's national duals 103, 110, 118, and some girls duals 121, 128, 135, 143… The dual parsers only accepted our 14 (boys) or 12 (girls) weights, so those bouts were silently dropped: about 90 bouts in 25 duals. My 2026-11-06 spreadsheet wrongly called these "source copy incomplete" (Kyle caught it on Lodi v Manchester).
- **Code:** `parseDualMeet.ts` and `parseDualMeetGirls.ts` (line-based formats) accept any weight line followed by a bout. `mapToNjWeights` maps the dual's weights, in order, to ours (Kyle: map to the NJ weight). A standard weight stays, and each other weight goes to the closest NJ weight that keeps the order: Lodi's 145 → 144, 160 → 157, 170 → 165, 220 → 215; PA's 107 → 106, 172 → 175. The printed weight is kept on the parsed bout as `listedWeight`. The matching also treats TrackWrestling's non-breaking space around "over" as a space.
- **Backfill:** `scripts/backfill_mapped_weight_bouts_20261106.mts` (service role) added 112 bouts (89 boys, 23 girls) and Iona Prep's −1 deduction, which hadn't loaded because the dual didn't add up then. It created 40 profiles (mostly Pennsylvania and other out-of-state wrestlers, none already existing under that name) and 143 name links. Taim Rahmoun's existing unlinked profile was reused. Every changed dual now adds up to its final score. Four were left unchanged and listed instead: Delsea v Council Rock North (two bouts at 285), the girls Schalick v Delran and Manchester Twp v Lakewood (each matches more than one stored dual), and West Deptford v Buena ("wrong score" line). Backup: `backups/20261106_mapped_weight_bouts_inserted.json`.
- **Leilani Matias** (girls, linked at Freedom HS, PA, since August) set `is_oos = true`.
- **Ratings:**
  - Girls 2025-26 (working season) rebuilt.
  - Boys 2025-26 archive rebuild failed: statement timeout inserting the log at row 9,500. The previous log was kept and there are no duplicates. Other queries were running at the same time, a likely but unproven cause. Waiting on Kyle before a rerun.
  - Girls leaderboard refreshes timed out once through the API.

---

## 2026-11-06 — Dual bouts the import dropped (boys 2025-26)

**Script:** `scripts/fix_dual_dropped_bouts_20261106.mts` (service role). **Backups:** `backups/20261106_dual_dropped_bouts_before.json`, `..._inserted.json`. Four boys duals now add up to their final scores:
- **Unnamed opponent:** Woodstown and Toms River East v Camden 1/3, 138, "Luke Woronicak / Michael Hinton over (Camden/Camden Eastside)". The parser kept the school with a blank name, and the importer then found no wrestler there and skipped the bout. **Code:** `parseDualMeet.ts` / `parseDualMeetGirls.ts` now treat a blank name like "Unknown" (no school, no wrestler), so the bout is kept.
- **One weight listed twice on TrackWrestling, the other missing:**
  - Paramus v Jefferson 12/17: Donoghue over San Lucas is added at 126 (listed 120; San Lucas wrestled 126 in all 21 other bouts).
  - Cherry Hill West v Red Bank Catholic 2/7: the stored Ramos over Ubarry moves 150 → 144 (Ramos: 144 in 20 of 24), and Russo over Aumiller is added at 150.
- **Not changed:** girls West Orange v Elizabeth 2/13. TrackWrestling's two pages disagree on the 165 bout: West Orange's says MD 13-5 with a final of 34-33, Elizabeth's says Dec 9-6 with 33-33. The stored bout is from one and the final from the other. Kyle ruled that West Orange won on the results, so the final is now 34-33 (`scripts/fix_west_orange_elizabeth_20261106.mts`, service role; backup `backups/20261106_west_orange_elizabeth_before.json`).

---

## 2026-11-06 — TF-1 team totals corrected; Mericle Region 1 bout; "Bye Bye" bye rule found

- **TF-1 totals (Kyle: put the correct score on the site):** `scripts/fix_tf1_team_totals_20261106.mts` adds +0.5 in `precomputed_team_scores` for each 2025-26 district school whose wrestler won a "TF-1" tech fall. TrackWrestling gave those a 1-point bonus instead of 1.5:
  - Bergen Catholic 345 → 345.5, Fair Lawn 132 → 132.5 (D7)
  - Bound Brook 72.5 → 73, North Hunterdon 252 → 252.5 (D14)
  - Scotch Plains-Fanwood 96 → 96.5 (D16)
  No team changes places. Backup: `backups/20261106_tf1_team_totals_before.json`. 2025-26 is now exact everywhere: districts 310/310, regions 273/273, state 162/162. CLAUDE.md notes this as the one approved correction.
- **Mericle:** **Migration file:** `docs/migrations/20261106_mericle_region1_r1.sql`. 2024-25 Region 1, 285, Champ. Round 1: Gavin Mericle (High Point) won by fall over Sean Brown (Newton). The bout was never stored because Newton's Sean Brown had no region entry (the shared-name loss). The service role recreated his entry. With the bout, High Point is 105, the official total.
- **"Bye Bye" (Lower Cape May, D29 2024-25, 155 vs 157):** TrackWrestling sometimes lists a quarterfinal bye as "received a bye Bye Bye () 0-1", a placeholder opponent. It earns no points, but TrackWrestling counts it as a win when crediting the bye before it. Dennis Serra (Champ. Round 1 bye, "Bye Bye" quarterfinal, lost the semifinal) gets his first bye's 2 points. This fits all 11 cases: the 10 "Bye Bye" cases, plus Martorano (D10) with a plain bye and no credit. Added to the scoring rules (Kyle): **Migration file:** `docs/migrations/20261106_tw_placeholder_byes.sql`. New table `tw_placeholder_byes` (10 rows, all D29 2024-25), read only by `tw_boys_entry_points`, so these never appear as bouts.
- **St. Peter's Prep (Kyle: correct it too):** Region 5 2024-25, 250 → 250.5, for Salvatore Borrometi's TF-1 final (same script, `--only-new`). Backup: `backups/20261106_tf1_team_totals_stpeters_before.json`.
- **High Point:** Kyle ran the Mericle SQL; High Point is 105.
- **Still unexplained:** Clearview (D32 2024-25), 129.5 vs 133.5. Kyle's team page matches every stored bout.

---

## 2026-11-06 — Montville District 5 2025-26: Manieri's quarterfinal forfeit

**Migration file:** `docs/migrations/20261106_manieri_qf_forfeit.sql`. Luke Manieri (113) won his quarterfinal by forfeit "over Unknown (For.)", per TrackWrestling's Montville team page (Kyle). The season export left the line out, so the bout was never stored and the scoring rules treated it as a bye (155 vs the official 157). It is stored as a forfeit over a filler entry, which makes Montville exactly 157. This was the only unexplained 2025-26 total. Kyle ran it: 157.

**Run 2026-11-06:** profile merge (kept 8, duplicates left 0) and school merge (#522, #689, #923 remain). Afterwards the integrity check has 3 failing rules: dual score gaps (26 boys, 6 girls, in `Dual score gaps 2025-26.xlsx`) and the pinned no-name-link list (81). The 2025-26 team scores match except the five TF-1 half points. The snapshot is unchanged.

---

## 2026-11-06 — Out-of-state duplicate profiles; out-of-state name links; self-bouts are byes

- **Name links:** `scripts/backfill_oos_name_links_20261106.mts` added 882 name links for out-of-state profiles. 880 profiles created in July–August 2026, before imports saved links, had none, so a later import couldn't find them and made a second profile (Dan Vargas, Easton Area). The links come from each profile's own bouts. Two Peddie names (Addison Collins, Riley Allen) are already linked to their boys profiles; their girls profiles are left separate.
- **Duplicate profiles:** **Migration file:** `docs/migrations/20261106_merge_oos_duplicate_profiles.sql`. It merges 8 out-of-state duplicates into the kept profile (every foreign key to `wrestlers`, from the catalog) and deletes the empty duplicate:
  - Dan Vargas
  - Michael Romero, Jesse Grajeda, Jorge Rios (St. John Bosco)
  - Theodore Egolf, Storm Hoffman (Delmar / Delmar Junior-Senior)
  - Luca Cenatiempo (Blair Academy / B Team)
  - Brody Kelly (Immaculate Conception IL / IC Catholic Prep)
  The service role had already moved Dan Vargas's one dual bout and added his link. Backups: `backups/20261106_dan_vargas_merge_before.json`, `backups/20261106_oos_profile_merges_before.json`.
- **Duplicate schools (Kyle: merge):** **Migration file:** `docs/migrations/20261106_merge_oos_duplicate_schools.sql`, run after the profile merge. #814 Delmar Junior-Senior → #689 Delmar; #749 Blair Academy (B Team) → #522 Blair Academy; #832 IC Catholic Prep → #923 Immaculate Conception (IL). Backup: `backups/20261106_merge_oos_duplicate_schools_before.json`. (The first version of the profile merge failed on a syntax error, a comma placed after a comment. The second hit a unique key in `snapshot_streak_state`: Luca Cenatiempo's kept and duplicate profiles both had a 2025-26 bonus streak. Both attempts rolled back. Now a duplicate's rows in the computed `snapshot_*` tables are dropped rather than moved, as in the 2026-09-17 merges: 8 streak rows, backed up in the same file. The next snapshot run rebuilds them.)
- **Integrity check:** a bout with the same wrestler on both sides is a bye (Kyle), not a failure (Ella Magee, SJWHOF 2026, result NC, unscored).
- **Review sheet:** `../Dual score gaps 2025-26.xlsx` lists the 32 duals (26 boys, 6 girls) whose bouts plus deductions don't equal the final, compared against the source files.

---

## 2026-11-05 — Dual team point deductions; Ryan Kim 2024-25 entry; William Penn Charter merge

**Dual deductions.** **Migration file:** `docs/migrations/20261105_dual_meet_deductions.sql` (new tables `dual_meet_deductions` and `dual_meet_deductions_girls`). **Backfill:** `scripts/backfill_dual_deductions_20261105.mts`.
- **Why:** TrackWrestling lists deductions after the bouts and before "Team Score:", for example "Coach Misconduct 0 -1.0". The labels vary: unsportsmanlike, misconduct, headgear, singlet straps, team point and others. `parseDualMeet.ts` and `parseDualMeetGirls.ts` skipped those lines, so about 160 boys and 7 girls duals had bouts that didn't add up to the final score.
- **Code:** both parsers now read deductions into `ParsedMeet.deductions`, and `import-meets` / `import-meets-girls` save them.
- **Backfill (2025-26 source files):** boys 174 duals / 187 deductions, girls 6 / 6. The first pass read only files named "Dual" (148 / 161); the second added the gap, extra, playoff and other files (+26). Each one matches its stored dual, and the stored bouts plus deductions equal the final score, or are tied with the +1 criteria point. Five boys duals have a deduction but no stored bouts; the deduction is added, and their bouts are a separate gap.
- **Not used:**
  - Iona Prep v Don Bosco 12/23: stored bouts 22-38, final 33-41, so bouts are missing.
  - WW-P North v Lawrence 1/17: the source says −6 but the score shows −1.
  - Girls West Deptford v Buena/Vineland 1/14: a "wrong score −48" line, which is a correction, not a deduction.
- **After:** boys dual score mismatches went from 229 to 26 and girls from 42 to 6. Ratings were rebuilt and leaderboards refreshed (2026-11-06). The integrity check has 5 failing rules, down from 8. The snapshot is unchanged. The school-name check now skips an NJ school paired with an out-of-state namesake, and the out-of-state pairs Kyle confirmed.
- **Integrity check:** a dual's score now includes its deductions. A dual tied on bouts and won on criteria (+1) is not a mismatch. Girls duals may wrestle a weight twice (Kyle). A wrestler is flagged for NJ and non-NJ schools only within one season (a transfer is fine).

**Ryan Kim.** His 2024-25 District 5 entry for Fort Lee (157; entry 667efa21) was on the Northern Highlands Ryan Kim's profile (b2731464). It moved to the Fort Lee Ryan Kim (ce3511b1), who wrestled 165 for Fort Lee in 2025-26 (Kyle: same person). This was done by the service role. Backup: `backups/20261105_ryan_kim_entry_before.json`. Its 3 rating-log rows move at the next ratings rebuild.

**William Penn Charter.** **Migration file:** `docs/migrations/20261105_merge_william_penn_charter.sql`. #1202 "William Penn Charter School" is merged into #899 "William Penn Charter" (Kyle: one school). Every foreign key to `schools` is re-pointed from the catalog, then #1202 is deleted. Backup: `backups/20261105_merge_william_penn_charter_before.json`.

---

## 2026-11-05 — Boys 2024-25 district forfeits, deductions, mid-bracket byes

**Script:** `scripts/fix_district_forfeits_20261105.mts --season 2025`. **Migration files:** `docs/migrations/20261105_district_forfeits_and_deductions_2025.sql` and `docs/migrations/20261105_tw_scoring_midbracket_bye.sql` (both run in the SQL editor). **Backups:** `backups/20261105_district_forfeits_2025_before.json`, `..._inserted.json`.

- **Forfeits:** 124 district forfeits with no loser get `forfeit_opponent` set: 95 `filler`, 29 `empty`. None had a real loser to put back. The service role added 2 placement rows.
- **Deductions:** 9 deductions of −1 each. These are the schools exactly 1 point over their official total under the scoring rules: D2 school 12, D3 315, D7 62, D11 109, D14 138, D16 153, D24 227, D25 245, D27 258.
- **Scoring rule:** a bye in the middle of the bracket now earns its 2 points when the wrestler wins the bout after it (`tw_boys_entry_points`). Only two wrestlers in either season have one: Gonzalez and Garriques, Phillipsburg, District 1 2024-25. With the rule, Phillipsburg's total matches the official 258 (it was 254). No 2025-26 total changes.
- **Run and checked (same day):** Kyle ran both SQL files (9 deductions, −9; Phillipsburg 258). Boys 2025-26 ratings were rebuilt (`{"gender":"M","season":"2025-26","archive":true}`): 7,438 rows. Of the 571 bouts in District 10, Region 2 and Region 7, 561 are in the match log; the other 10 are forfeits and one injury default, which ratings never count. The local run stops after its writes at the admin activity log, because it reads the signed-in user. `lb_ps_refresh` ran for 2025 and 2026, and `lb_rs_refresh` for 2026.
- **Team scores vs official, 2024-25:** state 167/167. Districts 312/314 (was 272). Regions 272/275 (was 240). The three regions still off:
  - R5 St. Peter's Prep, +0.5: TrackWrestling's "TF-1" label on Salvatore Borrometi's final, a TrackWrestling error.
  - R7 Toms River South, +1: matches the deduction pattern. Kyle approved; the service role added team_point_deductions id 29 (tournament 131, school 255, −1). Now 42.5, exact; regions 273/275.
  - R1 High Point, −2: cause unproven.
- **Still off, cause unproven:** Lower Cape May (D29), 155 vs the official 157; Clearview (D32), 129.5 vs 133.5. Every wrestler of both schools is stored, and every bout matches TrackWrestling's text.
- **Source file:** `../Match Data/2025 District Data.py`, District 10's second "3rd Place" block became "First Place". It was built from NJSIAADistrict10.csv, with records taken from the same file. The previous version is still in `../gt_s1_districts.txt`, which was an identical copy and was not changed.

---

## 2026-11-05 — Boys 2024-25 bracket repairs (part 2): District 10, Region 2, Region 7

**Script:** `scripts/fix_2025_csv_brackets_20261105.mts`. **Migration file:** `docs/migrations/20261105_2025_csv_brackets.sql` (SQL editor). **Backup:** `backups/20261105_2025_csv_brackets_before.json`.

**Source:** TrackWrestling's per-tournament CSV exports, added by Kyle: `../Match Data/NJSIAADistrict10.csv`, `NJSIAARegion2.csv`, `NJSIAARegion7.csv`. The season export lacked District 10's finals (its 3rd-place matches were copied twice in their place, and both copies were stored), Region 2's finals, and Region 7's Cons. Round 1, Cons. Semi and 3rd-place matches.

**Checked first:** every stored bout in the three tournaments matched the CSV (District 10 82, Region 2 223, Region 7 168), with the same winner, loser and result. The one spelling difference was "Karam" in the CSV vs "Kareem" stored (Abuali). Each of the 84 duplicate placement rows (28 per tournament) was an exact copy of a kept row, and every kept row agreed with the CSV.

**Changes:**
- District 10: the 14 duplicate 3rd-place bouts become the 14 finals (same ids; their 28 rating-log rows are replaced when the 2024-25 ratings are rebuilt).
- Region 2: 14 finals added. Region 7: 70 bouts added (28 Cons. Round 1, 28 Cons. Semi, 14 3rd place).
- Placements (service role): the 84 duplicate rows now hold the missing places. District 10 and Region 2 get 1st/2nd; Region 7 gets 3rd/4th. Nothing is deleted.
- `../Match Data/2025 District Data.py`: District 10's second "3rd Place" block becomes the "First Place" block, from the CSV.

---

## 2026-11-05 — Boys 2024-25 bracket repairs (part 1)

**Script:** `scripts/fix_2025_brackets_20261105.mts`. **Migration file:** `docs/migrations/20261105_2025_bracket_repairs.sql` (SQL editor).
**Backups:** `backups/20261105_2025_bracket_repairs_before.json`, `..._inserted.json`.

**Source:** TrackWrestling's 2024-25 export, `../gt_s1_districts.txt`, identical to `../Match Data/2025 District Data.py`. Its quirks: no "District 21" heading (D21 follows D20), and the "District 23" block repeats District 22's finals.

**26 district bouts the 2026-03-20 load never stored**, restored:
- **13 shared-name bouts:** Sean Brown ×3 (Newton), Paretti, Davis, Joel Martinez, Jayden Williams, Youssef, Mulligan, Martin, Lopez, Jimenez. Their 2024-25 entries had been deleted at an unknown time and are recreated.
  - **5 new profiles** (Youssef Kinnelon, Mulligan New Milford, Martin Dwight Morrow, Lopez Hamilton West, Jimenez Toms River North): inactive, grade blank, name link at the school. Kyle's rule: the only same-name profile wrestled 2024-25 for another school, so it is a different person.
- **7 District 15 forfeits over "A FF" fillers** and **7 District 9 forfeits over "A Forfeit"… fillers**: not in the database. Stored as forfeit wins with `forfeit_opponent = 'filler'`.

**Found, not fixable from our files:**
- **District 10 and Region 2:** all 14 finals each are missing from the export itself. Their "3rd Place Match" lines are the real 3rd-place matches listed twice. In District 10 the database stored both copies (**14 duplicate bouts**). D10, R2 and R7 also have duplicate placement rows.
- **Region 7:** the consolation rounds and 3rd-place matches are missing from the export; its 5th-place lines are listed twice.
- These need TrackWrestling's pages. Deleting the duplicates needs approval (counts and backup first).

**APPLIED** — profiles, entries and placements 2026-11-05; SQL pending

---

## 2026-11-05 — Boys scoring formula = TrackWrestling's rules

**Migration file:** `docs/migrations/20261105_tw_scoring_rules.sql` (SQL editor). The rules and their proof are in `docs/reviews/trackwrestling_team_scoring.md`.

**Changes:**
- `tw_wrestler_points` keeps its inputs; for boys tournaments it now returns the proven rules. The previous code is kept as `tw_wrestler_points_legacy` for girls, whose scoring is unverified and unchanged. It was dashboard-made: its live definition is reconstructed from Kyle's `pg_get_functiondef`, and is what the rename preserves.
- New: `tw_boys_entry_points(entry)` and `tw_boys_school_points(tournament)` (deductions included).
- `lb_p_wrestler_points` (state section) rebuilt on the rules: same columns, order and limit 25.

**Old formula's errors, now fixed:**
- districts scored only placers (Marra's round-1 pin earned 0; TrackWrestling gives 4)
- 4th place got 6 instead of 4
- region placement used the district table
- advancement and "loss" points were given for finals and 3rd-place matches
- region round values were fixed numbers

**APPLIED** — 2026-11-05 by Kyle in the SQL editor (Fort Lee D8 = 76.5).

**Verified:** `scripts/check_team_scoring_db.mts`, database scoring vs official totals:
- **2025-26:** state 162/162, regions 273/273, districts 304/310. The 6 off are TrackWrestling's 5 TF-1 errors (0.5 each) and Montville D5 (+2), as expected.
- **2024-25:** state 167/167, regions 240/275, districts 272/314. Those seasons still have the forfeit-loser problem and the missing region bouts; that pass is not done.

The per-wrestler leaderboards are still hidden (`SHOW_WRESTLER_TEAM_POINTS`), pending Kyle.

---

## 2026-11-05 — Boys 2025-26 district forfeits: losers back, forfeit marks, team deductions

**Script:** `scripts/fix_district_forfeits_20261105.mts`. **Migration file:** `docs/migrations/20261105_district_forfeits_and_deductions.sql` (SQL editor).
**Backups:** `backups/20261105_district_forfeits_before.json`, `..._inserted.json`.

**Cause:** the 2026-03-20 load (`../parsed_s2_districts.csv`) wrote every forfeit's loser as the word "FORFEIT" (e.g. `3rd_Place, John Pratt, …, FORFEIT, ,`). `build_from_gt.py` matched it to no one, so all **202** district forfeit bouts were stored with no loser. TrackWrestling's text (`../Match Data/2026 District Match Data.py`) names them all:
- **23 real wrestlers:** the loser goes back on the bout. Mostly medical forfeits in SF / 3rd / F: Graeber, Boruta, Kithcart, Siguenza, Rodriguez and others. Cloos (D26), Roche and Nocelotl (D9) had no bracket entry and get one (service role, no seed).
- **150 filler entries** ("Forfeit", "D Forfeit", D17's coaches' names): `matches.forfeit_opponent = 'filler'`. Counts as a contested match for bye points.
- **29 empty slots** ("over () (For.)"): `forfeit_opponent = 'empty'`. A forfeit win, not a contested match.

**Placements:** 27 missing rows added (1st 2, 2nd 2, 3rd 11, 4th 12).

**Deductions:** new table `team_point_deductions` (service role only). 19 rows, −22 total: official total minus the scoring rules' total where that is a whole number of points short.

**Check, simulated before applying:** after these fixes, 285 of 310 district schools match the rules exactly.
- 19 are short by whole points (the deductions).
- 5 are 0.5 off: TrackWrestling's TF-1 errors (Kyle: every tech fall is 1.5).
- 1 is unexplained: Montville D5, official 2 higher; its team page is missing from the file.
- Regions 273/273 and state 162/162 were already exact.

**APPLIED** — entries and placements 2026-11-05; SQL pending (SQL editor)
**Reversible?** Yes — ROLLBACK in the SQL file; backups for the service-role rows

---

## 2026-11-05 — School data spreadsheet: frozen header row; Active is editable (code only)

**Where:** preseason dashboard, `SchoolDirectoryWorkspace.tsx` / `SchoolDirectoryWorkspaceGirls.tsx`, API `school-directory` / `school-directory-girls`.

**Changes:**
- **Header row frozen.** The table's box now has a height cap (window height minus the dashboard chrome), so the table scrolls inside it and every header cell sticks. Before, the box grew with its content, so the page scrolled and carried the header away. The School column stays frozen.
- **Active is editable** (Active / Inactive picker; marking inactive asks to confirm). The new PATCH `field: 'active'` only adds or removes the school's `inactive_school_seasons` row for that gender and season.
  - District, region and conference assignments are kept, so reactivating undoes it fully. The older `school-season-status` deactivate deletes those assignments; it is not used here.
- **Microcheck:** already drops a school inactive in its gender's working season. Every school task, focus items included, gets "not applicable" unless the program is active. The spreadsheet's season (`directorySeason`) is the same season today: boys 2026-27, girls 2025-26.

---

## 2026-11-05 — Per-wrestler postseason team points hidden (code only)

**Why (Kyle):** "hide wrestler point value leaderboards - that's bad info … you can't reverse engineer it". Against TrackWrestling (Districts 1–18, 2025-26), 993 of 1,000 shown values match. 7 don't, and the causes aren't known or aren't fixable from the data (the TF-1 reading was wrong).

**Change:** one switch, `SHOW_WRESTLER_TEAM_POINTS = false` in `src/lib/wrestlerTeamPoints.ts`. While it's off, pages don't load the data.
- **Boys district page:** "Individual Team Points" (`district_team_pts`).
- **Boys region page:** "Postseason Individual Points Leaders" (`region_postseason_pts`).
- **Boys state section:** "Individual Team Points" (`lb_p_wrestler_points`).
- **Leaderboards, postseason Individual:** the "Wrestler Points" tab (both sides; a link to it opens the first tab).
- **School page, postseason Individual leaders table:** the per-wrestler Dist / Reg / State / Total columns and their footer (both sides); default sort is now Wins.

**Unchanged:**
- Team totals (official copied standings).
- The school page's "Team Pts" per wrestler, which is dual-meet points (fall 6, tech 5, major 4, decision 3).

**Noted:** the personalized home page shows a followed school's points from `school_points_breakdown`, which is calculated (live season only; empty until the 2026-27 postseason).

**Verified:** snapshot shows only those blocks gone on `/boys/districts/1`, `/boys/regions/1`, `/boys/state`; the leaderboards Individual view loads without "Wrestler Points" on both sides.

---

## 2026-11-05 — TF-1 tech falls: WITHDRAWN (never run)

A migration (`20261105_tf1_tech_falls.sql`, now deleted) would have relabelled 6 TF-1.5 bouts as TF-1 and added TF-1 to 13 functions. It read the number after "TF" as bonus points.

**Withdrawn before it ran.** Kyle: TF-1.5 and TF-1 are the same result; the number is not a point value. No database change was made.

**Still unexplained:** 4 wrestlers' per-wrestler team points on the site are 0.5 above TrackWrestling's (Riotto, Perrota D7 113; Delacruz D14 150; Romaniello D14 175). Each has one bout TrackWrestling words "tech. fall … (TF-1 …)", but that label is not the cause.

---

## 2026-11-05 — Review of the day's changes: team-total labels, name links, refused profiles

**1. Team-total row labels** (`scripts/fix_team_score_labels_20261105.mts`, backup `backups/20261105_team_score_labels_before.json`).
- **The problem:** the school-page team card (`SchoolProfileCore.tsx`) and `src/lib/standings.ts` read `precomputed_team_scores.tournament_type` as `boys_districts` / `regions` / `boys_state` and `girls_districts` / `girls_regions` / `girls_state`. The official-totals loads copied the tournament's own type instead.
- **Wrong rows:**
  - 314 boys 2024-25 district rows written `districts` by today's load.
  - 234 girls 2025-26 district rows written `districts` by the 2026-11-03 load.
  - 66 girls 2024-25 state rows labelled `girls_regions`, older (cause not traced).
- **Effect:** those district points were missing from school pages and standings, and those state points were counted as region points.
- **Fix:** every row relabelled from its tournament (614). Both loaders (`build_boys_official_postseason_team_scores.mts`, `build_girls_official_team_scores.mts`) now write the reader label. New integrity rule "team totals: row label is not the one the pages read" (0).

**2. Name links from guesses** (`rtf/import`, `csv/save`). Since this morning these imports save a name link for every bout side, and the bout-time lookup accepts the matcher's result at any confidence. A low-confidence guess (fuzzy 0.6–0.85, or same last name, e.g. a brother) would have become a permanent link. Links are now saved only for review picks, created wrestlers and exact/high matches. No import ran today, so none was saved.

**3. Refused profiles** (`rtf/import`, `csv/save`). With `wrestlers_name_*` in place, a one-word name fails to insert. Both imports ignored a failed insert, so that wrestler's bouts would be dropped silently.
- The result screen now shows a red line listing each wrestler not created and that their bouts were not saved.
- The review (`rtf/match`) always flags a new wrestler with a one-word name.

**4. Matcher** (`src/lib/matchWrestlers.ts`): a nickname in parentheses is ignored when comparing names ("Terrance (Jim) Fearon" → Terrance Fearon, exact). Tested: both Ryan Kims resolve to the right profile by school.

**Checked, no issue:**
- No boy/girl same-name link clash at a school (name links are unique on name + school with no gender: a design limit).
- All 82 boys 2024-25/2025-26 postseason tournaments have official totals.
- Restored bouts in place.
- No profile without a last name; the name check rejects one.

**APPLIED** — 2026-11-05
**Reversible?** Yes — backup for the labels; code via git
**Verified?** Label rule 0; integrity unchanged otherwise; typecheck clean; deployed.

---

## 2026-11-05 — Correction: the 2026-09-21 team-score auto-refresh was never live

**Checked by Kyle in the Supabase SQL editor (2026-11-05):**
- `cron.job` → `relation "cron.job" does not exist`, so pg_cron is not installed.
- `pg_proc` / `pg_class` / `pg_trigger` for `refresh_boys_team_score_cache`, `refresh_dirty_team_score_caches`, `mark_team_score_cache_dirty`, `team_score_cache_dirty` and `%team_score_dirty%` → no rows.

**Meaning:**
- The 2026-09-21 entry's "APPLIED" and "Verified" were wrong.
- Nothing recalculates boys team totals on its own, so nothing can overwrite the official TrackWrestling totals loaded today.
- The calculated totals that had been stored were written by one-time runs. Which run is not proven; the 9/21 "boys cache re-audit vs RPCs" is the likely one.

**Changes:**
- `docs/migrations/20260921_team_score_cache_auto_refresh.sql` now opens with a DO NOT RUN header; the file is kept for the record.
- The 9/21 changelog entry is marked NOT LIVE.
- CLAUDE.md updated to match.

**No database change.**

---

## 2026-11-05 — Boys postseason team totals copied from TrackWrestling; boys pages show them

**Rule (Kyle):** the copied TrackWrestling standings are the truth. The site's formula is kept so totals can be calculated one day, but only behind the scenes, never as the shown figure.

**Why:**
- `20260921_team_score_cache_auto_refresh.sql` had made boys totals recalculate from the formula. Fort Lee D8 2025-26 read 50.5: the formula without Ryan Kim's deleted bouts. TrackWrestling lists 76.5.
- The boys district and region pages and the state page didn't read stored totals at all. They called the formula (`district_team_score`, `region_team_score`, `lb_p_team_points`).
- The formula matches only 128 of 300 official 2025-26 district totals (official minus formula: −3 to +33, median +4).

**Data** (`precomputed_team_scores`, boys):
- **2025-26 districts:** `scripts/build_boys_official_district_team_scores.mts`, from the 32 "Team Scores" tables in `../2026 District Match Data.pages`.
  - Exported via Pages to Word and saved to `data/official_team_scores/boys_2025_26_district_tables.json`.
  - Tables 1–19 are each followed by their district's results (District 6 twice, identical). Tables 20–32 have no heading; each matched exactly one district by its entered schools.
  - 300 totals: 167 changed, 19 new, 114 already equal. "Forfeit" filler rows skipped.
  - **District 21 (follow-up, same day):** Kyle pointed to the labelled D1–D32 rankings at the end of `../Match Data/2026 District Match Data.py` (saved 2026-04-03; the `.pages` copy is from 03-19 and has no D21 table). The load now reads that file (`data/official_team_scores/boys_2025_26_districts.json`). 31 lists are identical to the tables already loaded; D21 is new: 5 totals changed, Holy Cross added. All 32 labels agree with the entered schools. Backup: `backups/20261105_boys_district_team_scores_before_2.json`. Re-run: 310 equal, 0 changes.
  - Backup: `backups/20261105_boys_district_team_scores_before.json`.
- **2025-26 regions and state:** `scripts/build_boys_official_postseason_team_scores.mts`, from `../gt_s2_regions.txt` and `../gt_s2_state.txt`. 435 totals replace 369 rows. Backup: `backups/20261105_boys_postseason_team_scores_2026_before.json`.
- **2024-25 districts, regions and state:** the same script with `--season 2025` (`gt_s1_*`). 747 totals replace 649 rows.
  - The district export has no "District 21" line; D21's standings follow D20's, and every team matched D21's entries.
  - **District 23 2024-25 has no standings in the export:** its block (line 6994) holds only District 22's finals. Its 9 stored rows are kept and unverified.
  - Backup: `backups/20261105_boys_postseason_team_scores_2025_before.json`.
- 0-point teams with no entries are not stored. Each re-run finds 0 changes.

**Code:**
- New `src/lib/boysOfficialTeamScores.ts`.
- Boys district and region pages and the boys state section (`src/lib/stateData/boys.ts`) now show the stored official totals.
- Per-wrestler team points on those pages still come from the formula.
- CLAUDE.md rule rewritten.

**Still open:**
- Whether the 9/21 triggers and cron job are live. If they are, a bout change would overwrite official totals with the formula. Kyle's live-state query is pending; then remove them by migration.
- ~~D23 2024-25 official standings~~ — done (follow-up, same day). Kyle supplied them from TrackWrestling. They are added under "District 23" in `../Match Data/2025 District Data.py` (rank / team / points, as the other districts) and copied to `../gt_s1_districts.txt`, which stays identical; pre-edit copy in the session scratchpad. Loaded: 9 teams, 4 changed (Point Pleasant Boro 248, Jackson Liberty 142, Brick Township 60, Point Pleasant Beach 48.5), 5 already equal. Backup: `backups/20261105_boys_postseason_team_scores_2025_before_2.json`. Re-run: 0 changes. **All boys 2024-25 and 2025-26 postseason team totals are now official.**

**APPLIED** — 2026-11-05
**Reversible?** Yes — backups above
**Verified?** Re-runs: 0 changes for all three loads. Fort Lee D8 = 76.5. Integrity check: no rule changed.

---

## 2026-11-05 — Lost district bouts restored (part 1); nickname names fixed; 8/21 split logged

**1. Lost boys 2025-26 district bouts.** The 2026-03-21 export (`../source_of_truth_matches.csv`, `_entries.csv`, `_placements.csv`) lists every postseason bout with its database id. Compared with today, 10 boys 2025-26 district bouts and their 6 entries are gone, along with 2 placements.
- **Wrestlers:** Ryan Kim (Fort Lee, D8 165: QF, SF, 2nd), Peter Terranova (Edison, D18 126), Julian Sanchez (WW-P North, D19 215), Owen Williams (Manchester Twp, D26 106), Aidan Johnson (Gloucester City, D28 138), Anthony Russo (Red Bank Catholic, D32 150 seed 1: QF, SF, 2nd).
- **Proven history:**
  - 3/20: `../build_from_gt.py` matched wrestlers by name only and put each entry on the other same-name profile (`../gt_entry_map.csv`).
  - 8/21: `../fix_merged_profiles.py` split those profiles (see 3); it moved duals and in-season bouts but not postseason entries.
  - Later: the entries, their bouts and placements were deleted, and five of the six were re-entered with no bouts.
- **Unproven:** what deleted them. No script, admin route, migration, backup or admin log entry refers to those ids.
- **Restored:** `scripts/restore_lost_district_bouts_20261105.mts` (service role) inserted Anthony Russo's D32 entry and the 2 placements (Kim 2nd, Russo 2nd). The bouts are in `docs/migrations/20261105_restore_lost_district_bouts.sql` (original ids), because the service role can't write `matches`. Backups: `backups/20261105_restore_lost_district_bouts_before.json`, `..._inserted.json`.
- **Not restored yet:**
  - 13 boys 2024-25 bouts with the same pattern (Joel Martinez D12, Jayden Williams D17, Christopher Lopez D24, Daniel Jimenez D26, Sean Brown D3 ×3 + R1, Adam Youssef and Matthew Mulligan D4, Andrew Martin D5, Joseph Paretti D6, Tyler Davis D9). Each one's entry is gone, and the correct profile for each must be settled first.
  - ~~14 District 23 2024-25 finals~~ — not lost (checked 2026-11-05). The 2024-25 export's "District 23" block (`../gt_s1_districts.txt` line 6994) is a list of District 22's finals (Brick Memorial vs Robbinsville); all 14 are in the database as D22 finals. The 3/21 D23 copies were duplicates, removed by the D23 re-import.
- 6 more 2024-25 bouts (Caponegro D18, Matthew Miller D20) exist under new ids: nothing lost.

**2. Names cut at a nickname** (`scripts/merge_paren_names_20261105.mts`, backup `backups/20261105_paren_names_before.json`). The 3/20 load split "Charles (CJ) Palmisano", "Terrance (James) Fearon" and "Arjun (Danny) Monga" at the "(" and left the last name blank.
- **Merged:** "Charles" (Whippany Park; 2024-25 D12 and R3, 2025-26 R3) into Charles Palmisano; "Terrance" (Hunterdon Central; 2025-26 R5) into Terrance Fearon. Neither pair has an event in common.
- **Renamed:** "Arjun" to Arjun Monga (Princeton, 2024-25). "Pinhao (Alex)" Xu (8/06 dual import) to Pinhao Xu.
- **Code:** `stripNickname()` (`src/lib/personName.ts`) now runs before a profile name is built, in `import-tournament-bouts`, `import-meets`, `import-meets-girls`, `rtf/import` and `unlinked-duals`. The raw text stays as the name link.
- **Migration:** `docs/migrations/20261105_wrestler_name_checks.sql`: a profile needs a first and last name with no parentheses ("Unknown" is the exception). Run it after the two emptied profiles are deleted.

**3. RECONSTRUCTED: 2026-08-21 `../fix_merged_profiles.py`.** It had no changelog entry; reconstructed from the script and the profiles' `created_at` (2026-08-21 02:15:07, one transaction).
- **Ghost IDs merged:** Malcolm→Malcom Ballard, Sebianast→Sebastian Santos, Kaden Velazquez→Kayden Valasquez.
- **New profiles split off by school:** Aidan Johnson (Gloucester), Julian Sanchez (WW-P North), Ryan Kim (Fort Lee), Peter Terranova (Edison), Joseph Paretti (Elmwood Park), Lucas Ruiz (Kearny), Alexander Reyes (North Brunswick), Owen Williams (Manchester Twp), Christian Hernandez (Lyndhurst).
- **What it moved:** dual bouts, in-season tournament bouts and placements by school. Postseason entries stayed on the original profile. No backup was taken.

**Follow-up 2026-11-05:**
- Kyle ran the bouts SQL: 10 rows back.
- Boys ratings rebuilt: 2025-26 archive, then 2026-27. Ryan Kim's 2025-26 rating now counts 36 bouts, including 3 postseason.
- The two emptied profiles ("Charles", "Terrance") were deleted after a recount found 0 references.
- `lb_ps_refresh` ok. `lb_rs_refresh` (boys, 2026) hit the API statement timeout twice; each attempt rolled back. Run `SELECT lb_rs_refresh('M', 2026);` in the SQL editor.
- Name-check SQL: the first run stopped on its own guard (the 2 profiles above, not yet deleted then). Rerun it now.

**APPLIED** — 2026-11-05 (bouts SQL by Kyle in the SQL editor; name checks pending)
**Reversible?** Yes — backups and ROLLBACK notes in each file
**Verified?** Restore dry run matches TrackWrestling (`../district_matches_2026.csv`), e.g. Kim 4:44 / 1:33 / 0:49. Name fix: no names with "(" remain; the merged profiles hold all their entries.

---

## 2026-11-05 — The 2026-09-14 rule replaced; 11 senior profiles split; three name links repointed

**Scripts:** `scripts/fix_split_five_and_links_20261105.mts`, `scripts/fix_split_six_20261105.mts`, `scripts/fix_boys_active_rule_20261105.mts` (data only). Backups: `docs/migrations/backups/20261105_split_five_and_links_before.json`, `..._split_six_before.json`, `..._boys_active_rule_before.json`, `..._tyler_ffrench_row_before.json`

**Kyle's rule** (replaces `20260914_deactivate_season1_orphans.sql`, a one-time migration that no code re-runs):
- A boys wrestler with a 2024-25 district entry is inactive **only** if he has zero 2025-26 information: no 2025-26 dual bout, in-season tournament bout, postseason entry or Track roster row (linked, or his exact name at a school he is linked to).
- One record keeps him active. A Track row with a lower grade than his profile is a younger boy with the same name, not evidence.

**Changes:**
- **Corrects the same-day `fix_held_boys` part A for five boys.** The profiles were 2024-25 seniors (Somerville, Clearview, Wayne Valley, Cedar Creek, Ridgefield Park). The 2025-26 wrestlers with those names at Ramapo, Raritan, Lakewood, Newark East Side and Bloomfield are different boys.
  - Each now has his own profile: Track grade, active, with his 2025-26 bouts, name link and Track row (46 bouts).
  - The seniors went back to inactive, grade Sr.
- **Six more** 2024-25 senior profiles carried 2025-26 records at another school: Gabriel Rodriguez (→ Westwood), Jayden Rodriguez (→ River Dell), Jose Rodriguez (→ Raritan), Joel Martinez (→ East Orange), James Cook (→ Schalick), Tyler French (→ Waldwick). Split the same way, 142 records.
  - Tyler's Waldwick Track row is spelled "Tyler FFrench" (Jr). It had been confirmed to the Lacey senior and was moved to the Waldwick boy.
- **Name links repointed to the boy who wrestles at that school** (each pair is two boys at two schools, not two on one team):
  - "Joseph Paretti"@Elmwood Park
  - "Alexander Reyes"@North Brunswick
  - "Ryan Kim"@Fort Lee. His one 2024-25 Fort Lee entry (157, Jr) stays on the Northern Highlands profile, unresolved.
- **The rule applied to 3,686 boys:**
  - 127 activated (125 by a Track row, 2 by a 2025-26 postseason entry)
  - 5 deactivated (created 2026-11-02, 2024-25 entries only)
  - 189 single exact-name Track rows matched with their grade
  - Matheus Da Costa's Track row (Fr vs his Sr) ignored
  - A rerun finds 0 to change.
- **Lerrod Smalls:** the Bridgewater-Raritan profile was out of state because of `20260803_fix_oos_wrestler_flags.sql` (flags wrestlers whose name links are all non-NJ). The 8/1 dual import had given it one link, at NY Military Academy. The flag was cleared when that bout moved to the new NYMA profile.
- Boys 2025-26 (archive) and 2026-27 ratings rebuilt; boys leaderboards refreshed.

**Flagged, not changed:** "Charles" (Whippany Park, Fr) has no last name.

**APPLIED** — 2026-11-05
**Reversible?** Yes — the backups hold every changed row
**Verified?** Yes:
- 11 of 11 splits: every moved record on the new profile, each senior inactive Sr with no 2025-26 records or Track rows.
- 11 of 11 new wrestlers rated, 0 of 11 seniors.
- Integrity: unlinked 2025-26 wrestlers 3 → 0; "no alias at this school" 92 → 82.

---

## 2026-11-05 — The 15 held boys resolved; Kson Young merged; Jackson Clarke Goss renamed

**Scripts:** `scripts/fix_held_boys_20261105.mts`, `scripts/merge_kson_young_20261105.mts` (data only). Backups: `docs/migrations/backups/20261105_held_boys_before.json`, `..._kson_young_before.json`, `..._jackson_clarke_goss_before.json`

**Corrections from Kyle:**
- Sean O'Neill, Anthony Morales, Alexander Perez, Antonio Cruz and Derek Rodriguez wrestled in 2025-26 and are on the 2026 Track roster.
- Lucas Almonte, Jonathan Leon, Joel Kim and Aiden Roman graduated in 2025.
- The 2026-09-14 rule (a 2024-25 district entry and none in 2025-26 = graduated or inactive) is not evidence and is not used.

**Changes:**
- **Activated and graded from their exact-name Track row at the 2025-26 school; row linked:** Sean O'Neill (Ramapo, Sr), Anthony Morales (Raritan, So), Alexander Perez (Lakewood, Jr), Antonio Cruz (Newark East Side, Sr — row stored as "Antonio Cruz | Jr"), Derek Rodriguez (Bloomfield, Jr), Ryan Rodriguez (Clifton, Fr), Jayden Johnson (Manchester Twp, Fr), Rocco Randazzo (Howell, Fr).
- **Bouts moved to the wrestler the sheet names:**
  - 3 "Benjamin Almonte" from Lucas Almonte
  - 2 "Adrian Leon" from Jonathan Leon
  - 4 "Paul Kim" from Joel Kim (existing profiles)
  - 1 "Romeo Roman" from Aiden Roman (profile created, So, Track row linked)
- **Lerrod Smalls:** the one 2025-26 bout (12/13/25, NY Military Academy vs St. Peter's Prep, forfeit win) moved to a new out-of-state NYMA profile. The Bridgewater-Raritan 2024-25 profile is no longer flagged out of state (the import had set it because of that bout).
- **Kson Young (Neptune):** "Ksan Young" (3 tournament bouts) merged into "Kson Young" (4 duals; Track spelling, Sr). Same school and weight, no shared events.
- **Jackson Clarke Goss:** last name "ClarkeGoss" → "Clarke Goss", per Kyle.
- Boys 2025-26 (archive) and 2026-27 ratings rebuilt; boys leaderboards refreshed.

**Open, not changed:**
- The 2024-25 "Sr" district entries on Sean O'Neill's, Anthony Morales's, Alexander Perez's, Antonio Cruz's and Derek Rodriguez's profiles are at other schools (Anthony is a So on the 2025-26 Track roster), so they likely belong to other wrestlers.
- How these 2025-26 bouts landed on the wrong profiles is not proven.

**APPLIED** — 2026-11-05
**Reversible?** Yes — the backups hold every changed row
**Verified?** Yes:
- Each of the 8: active, Track grade, Track row linked. 11 of 11 moved bouts on the named profile. Ksan gone (0 references).
- Integrity: "NJ and non-NJ schools" 2 → 1; "no alias at this school" 93 → 92.

---

## 2026-11-05 — District 2 "East Side" fixed; 27 duplicate profiles merged; matcher compares names letters-only; "No wrestlers" label

**Scripts:** `scripts/fix_d2_east_side_20261105.mts`, `scripts/merge_duplicates_20261105.mts` (data only). Backups: `docs/migrations/backups/20261105_d2_east_side_before.json`, `..._duplicates_before.json`

**5. Girls District 2 "East Side" = Paterson Eastside (72), not Newark East Side (122).**
- **Evidence:** Paterson Eastside is the District 2 school, and Newark East Side is District 4. Ashley Coronel's 16 regular-season bouts are for Paterson Eastside.
- **Moved:** the 2 District 2 entries (Ashley Coronel, Kassandra Lucero) and the District 2 team total (15 pts).
- **Alias kept:** "East Side" → 122 is right for Newark's own girls results (9 duals vs Essex schools).

**4 + 3. 27 duplicate profiles merged (13 girls, 14 boys).**
- **Broken names:** "Kassandr Lucero" → Kassandra Lucero and "Niah" → Niah Lopez. The source sheet reads "Kassandra Lucero" and "Niah (Kim) Lopez"; the March load truncated one name and dropped the parenthesized nickname.
- **The other 25:** every pair that passed the checks: same gender, a school in common, no event in common, weights within 20 lb, grades at most one apart.
- **Cause, proven:** the 2026-09-10 Essex County and Union County imports created 199 profiles, 186 of them for wrestlers who already had one at that school. The 2026-11-02 merge compared names as typed, so names split differently ("Aaliyah | Gordon Burke" / "Aaliyah Gordon | Burke") survived.
- **Not proven:** why that review saw them as new; the code that ran on 9/10 isn't in the history.
- **Rules:** kept the profile with more records. Grade: the Track roster grade from either profile, else the kept one's, else the other's. Active if either was. Mariana CEPEDA - MOREL renamed "Mariana Cepeda-Morel".
- **Steps:** moved 220 records → girls 2025-26, boys 2025-26 (archive) and boys 2026-27 ratings rebuilt (logged by hand) → recounted (0 each) → deleted → leaderboards refreshed.
- **Held as different people:** Ryan Kim (Fort Lee: same event, 27 lb apart), Dan Vargas (110 lb), Alexander Reyes (25 lb), Joseph Paretti (27 lb).
- The Kassandr profile's link at Newark East Side was deleted (wrong school).

**Code:**
- `src/lib/matchWrestlers.ts`: the exact-name steps also compare names letters-only, so a name split or hyphenated differently matches the existing wrestler at the school.
- Integrity check: "two profiles with the same name at the same school" now compares letters-only.
- School directory Grade %: a school with no linked wrestlers shows "No wrestlers" instead of a blank.

**APPLIED** — 2026-11-05
**Reversible?** Yes / partly — the backups hold every changed row and the merged profiles
**Verified?** Yes:
- 27 of 27 merges pass row by row; 24 of 27 kept profiles rated (the 3 others are out of state).
- Integrity: same-name-same-school 4 → 2; unlinked 2025-26 wrestlers 17 → 3 (the held same-name pairs).

---

## 2026-11-05 — Boys wrestlers reactivated; missing name links backfilled; imports always save name links

**Scripts:** `scripts/fix_reactivate_boys_20261105.mts`, `scripts/fix_name_links_backfill_20261105.mts` (data only). Backups: `docs/migrations/backups/20261105_reactivate_boys_before.json`, `..._name_links_backfill_added.json`

**1. Boys reactivated (442).**
- **Cause:** the 2026-09-14 "season 1 orphans" cleanup set `is_active = false` for every boys wrestler with a 2024-25 district entry and no 2025-26 one, assuming their 2025-26 records were on new profiles. 457 have 2025-26 bouts on the same profile, e.g. Luke Goss (Gloucester Catholic, 6-1).
- **Effects:** inactive wrestlers are left out of the grade %, Roster Grade Import (so their Track rows stayed unmatched) and microcheck.
- **Grades:** the Track roster grade is one year above the 2024-25 district grade for 417 of them, so the Track upload holds 2025-26 grades. 427 had exactly one unmatched same-name Track row at their school; it was matched, and its grade written (`roster_upload`).
- **Held, 15, not changed:**
  - 10 who were 2024-25 seniors yet have 2025-26 bouts
  - 3 whose Track grade is lower than their profile's
  - 2 whose Track row is confirmed to another profile

**2. Name links backfilled (182: 20 girls, 162 boys).**
- **Cause:** the roster tools list a school's wrestlers from `wrestler_name_aliases`. The tournament imports (RTF, CSV) saved a link only for created or picked wrestlers, never for automatic matches, and the 2026-07-25 backfill read dual bouts only.
- **What was added:** a link for each active NJ wrestler with 2025-26 bouts or entries at an NJ school and no link anywhere, using the name as written on those bouts.
- **Held, 19:** that name at the school is already linked to another profile (duplicates, steps 3–4), or the wrestler is linked at another school (Ashley Coronel, step 5).
- **Code:** `src/lib/nameLinks.ts` (`saveNameLinks`). The RTF and CSV tournament imports save a link for every bout side they record. An existing link pointing at someone else is never replaced.
- **Integrity check:** new rule, "active wrestler with 2025-26 bouts at an NJ school but no name link anywhere". It shows 17, the held duplicates.
- Not changed: 292 active wrestlers whose only records are 2024-25 postseason entries.

**APPLIED** — 2026-11-05
**Reversible?** Yes — the backups list every changed row
**Verified?**
- 442 of 442 active; 427 of 427 Track rows confirmed, with grades equal to Track.
- 182 of 182 links present and pointing at the right wrestler.
- Timber Creek, Pequannock, Hanover Park and Gloucester Catholic now have grade %.

---

## 2026-11-04 — Admin phase dates per side (Calendar: Season Dates)

**Migration file:** `docs/migrations/20261104_admin_phase_dates.sql`

**Purpose:** The admin dashboards (Preseason / Season / Postseason / Off Season) follow dates, but there was no way to set them. Boys read one hand-made `admin_season_config` row. Girls had none: the calendar guessed from `season_calendar` events, and the admin home followed the season stage.

**Changes:**
- New table `admin_phase_dates` (season, gender: preseason_start, season_start, postseason_start, postseason_end; who and when; RLS on, service role only). Off season = after postseason_end until the next preseason_start. Seeded: boys 2026-27 from `admin_season_config`. Girls: none yet; girls keep today's behavior until their dates are entered.
- **Code:**
  - Calendar tool: a **Season Dates** button opens a per-season editor for that side (`SeasonDatesPanel`, `/api/admin/phase-dates`). It checks the order and that seasons don't overlap, and logs each change.
  - The calendar header uses those dates.
  - The task creator says which dashboard the due date puts the task on, e.g. "Goes on the Preseason dashboard (2026-27: Oct 1 – Dec 6)". It works for dates in any season and can still be overridden.
  - The admin home opens today's phase from those dates for either side. Fixed on the way: the boys home stayed on Postseason after postseason ended.
- Not changed: the public site's season (`season_gender_state`, set in the season lifecycle tool).

**APPLIED** — 2026-11-04, Supabase SQL editor
**Reversible?** Yes — `DROP TABLE public.admin_phase_dates;` (the code falls back to the old behavior)
**Verified?** Yes — boys 2026-27 copied (Oct 1 / Dec 7 / Jan 25 / Mar 15); table readable by the service role

---

## 2026-11-04 — Five girls programs inactive for 2025-26; girls "Gabriel Grant" removed; microcheck and school page fixes

**Script:** `scripts/fix_girls_inactive_and_gabriel_20261104.mts` (data only). Backup: `docs/migrations/backups/20261104_girls_inactive_and_gabriel_before.json`

**Data (approved by Kyle):**
- `inactive_school_seasons` (girls, 2026) for:
  - Indian Hills 13, Hammonton 297, Toms River East 253 (girls only in 2024-25)
  - Hackensack 43 (no girls activity in any season)
  - Keansburg 191 (one non-counting dual with an unnamed wrestler)
- All five had open microcheck roster tasks. Their official 0-0 lines no longer show in the girls standings Non-classified list, which hides inactive schools.
- The girls "Gabriel Grant" profile (031c6969) was East Orange's boys Gabriel Grant (138), entered on two girls dual sheets (Belleville 12/19, Newark Academy 1/7).
  - Both bouts stay, and the girls keep their falls. The East Orange side is unlinked (shown "Unknown").
  - The profile was deleted with `deleteWrestler`; what it removed is in the activity log.
  - Girls ratings rebuilt, leaderboards refreshed.

**Code:**
- **Microcheck roster tasks:**
  - A school marked complete in Roster Grade Import is done.
  - Confirmed import rows count as matched. Dover had shown "none in the import" because it ignored them.
  - "Done" no longer rewrites confirmed rows.
  - Girls roster tasks left: 1 (East Orange: wrestlers but no Track roster).
- **School pages:**
  - Tab links always name the tab. Girls pages open on Post Season, so the Schedule tab could never be opened.
  - The Roster tab and the Leaders "Season" view list everyone who wrestled for the school that season (duals, in-season tournaments, postseason). Before, they listed only postseason entrants: Dover girls 8 of 21, East Orange 0. Postseason numbers are unchanged.
- **Review (same day):**
  - The school stats board's Pins / Tech Falls / Bonus % add up the season stats of the full roster, so they now count every school bout. Checked against `lb_rs_team`: Dover girls 32 pins, Dover boys 134 / 6 techs, Jefferson-Sparta 137 / 10, Ramsey-NH girls 181 / 3, all equal. Before, they counted only postseason entrants.
  - Found: the roster listed the shared "Unknown" profiles (bouts at about 72 schools). Fixed: Unknown and placeholder names are left out.
  - Checked: no school is near the 5,000-row limit (largest sample under 200 tournament bouts). Only Keansburg's single non-counting 2025-26 girls bout sits on an inactive girls school.
- **Preseason dashboard (later the same day):** Grade Reviews counted only schools that finished a microcheck roster task, and the girls school list had no season (girls have no preseason season yet), so it included the 14 inactive programs. Girls showed 19%. It now also counts schools marked complete in Roster Grade Import, and the program lists use the working season when there's no preseason season. Girls: 252 of 252 (100%). Boys unchanged (302 of 316). The other girls percentages on the dashboard no longer count inactive programs either.

**APPLIED** — 2026-11-04
**Reversible?** Yes — the backup holds the profile and both bouts; delete the five inactive rows
**Verified?** Yes — integrity check unchanged (35 rules); East Orange's Roster tab shows Youmie Azarre, Dover girls lists its regular-season wrestlers; microcheck girls roster open: East Orange only

---

## 2026-11-04 — Review fixes: girls_region_mat_time duplicate, header team toggle, delete-tool log

**Migration file:** `docs/migrations/20261104_drop_girls_region_mat_time_text.sql`

**Found in review of 2026-11-03/04 changes:**
- **`girls_region_mat_time` had two copies,** (integer, smallint) and (text, smallint DEFAULT 2), so every call failed with "could not choose the best candidate function". The girls region "The Terminators" box and the girls profile Terminator badge were empty. This predates the season-names migration, which updated both copies. The migration drops the text copy. The integer copy is the current rule, matching `district_mat_time` and `region_mat_time`.
- A test of all 52 functions from `20261103_school_names_by_season.sql` (both genders where they take one): 88 calls OK, the only errors being this duplicate.
- **Code:** the header Boys/Girls toggle on `/postseason/team/girls` went to `/postseason/team/boys` (404). It now moves between the two team pages, and `/postseason/team` always shows the boys header.
- **Code:** the wrestler Delete Profile tool now saves the aliases, Track roster links, school history, transfers and followers it removes in the activity log, including on a failed delete. Before, a delete stopped by an unknown reference left those removed with no record.
- Checked live: girls section and group pages show the season co-op names. Girls conference pages list no schools (there are no girls conference standings).

**APPLIED** — 2026-11-04, Supabase SQL editor
**Reversible?** Yes — the text definition is in `docs/migrations/backups/20261103_name_functions_before.sql`
**Verified?** Yes — `girls_region_mat_time` returns leaders for all four girls regions (Region 1: Ella Poalillo, High Point, 4 wins in 3:03)

---

## 2026-11-04 — Merge four duplicate girls profiles; RTF review warns on unknown wrestlers at NJ-matched schools in out-of-state events

**Script:** `scripts/merge_girls_duplicates_20261104_batch5.mts` (data only). Backup: `docs/migrations/backups/20261104_girls_duplicate_profiles_batch5_before.json`

**Merges** (reported by Kyle; kept profile has the Track roster name; no pair ever shares an event):
- St. Benedict's Prep: "Eviana Herrera" (03505b14) → "Evianna Herrera" (4e65e291)
- Toms River South: "Orly Walpla" (0b9270b0; the Track roster match) → "Orly Walpola" (39a811d5), grade So from the Track roster
- Union: "Ariana Novo" (921e0ab3) → "Ariana Nova" (5e965f4c)
- West Deptford: "Peyton Bennett" (2f55dabe) → "Peyton Bennet" (c33f3293)

**Checked, not merged:** Vernon "Danielle Rodriguez" (Jr, 152) and "Daniella Rodriguez" (Fr, 165/185) are both on the Track roster: two wrestlers.

**Steps:** records moved → girls ratings rebuilt (logged by hand) → references recounted (0) → duplicates deleted → girls leaderboards refreshed. The first integrity run after it timed out on the rating log; one retry a minute later passed.

**Code:** the RTF import review (`/api/admin/rtf/match`, `SchoolFlagCard`) now checks, for an NJ-matched school in an out-of-state event, whether the event's wrestlers under that name are known at the NJ school (an alias there or its Track roster). If none are, it shows a red warning that it's probably an out-of-state school with the same name. If only some are, an amber note lists the unknown names. This is the Lily Oh / Riverside case, which was imported 2026-08-26, before out-of-state events required a confirm (10-24).

**APPLIED** — 2026-11-04
**Reversible?** Partly — the backup holds the duplicates and every moved reference
**Verified?** Yes — 0 references left, all four kept profiles rated, integrity check unchanged (35 rules)

---

## 2026-11-04 — Lily Oh moved to Riverside, VA (out of state); "Liz Mejia" merged into Cristy Mejia

**Scripts:** `scripts/fix_lily_oh_riverside_va_20261104.mts`, `scripts/merge_girls_duplicates_20261104_mejia.mts` (data only). Backups: `docs/migrations/backups/20261104_lily_oh_riverside_va_before.json`, `..._girls_duplicate_profiles_mejia_before.json`

**Lily Oh:**
- She's from Riverside High School, Leesburg, Virginia (2026 VHSL girls state champion), not NJ's Riverside (214).
- Her only bouts are 4 at the 4th Annual Girls Beast of the East (Delaware, multi-state), whose bracket said just "Riverside". The RTF import matched that to the NJ school by name. She isn't on Riverside NJ's Track roster.
- Fix: new out-of-state school "Riverside, VA" (1203, town Leesburg). Her 4 bouts' school and her name alias moved to it, and she's `is_oos` (her rating and leaderboard rows were removed). No "Riverside" school alias was added.

**Mejia:** Robbinsville "Liz Mejia" (8a3357b3; 3 bouts at the CVC Girls Championships) → "Cristy Mejia" (a970435d). Kyle: same wrestler, and her name is Cristy. They never share an event.

**Steps:** move/merge → girls ratings rebuilt (logged by hand) → references recounted (0) → duplicate deleted → girls leaderboards refreshed

**APPLIED** — 2026-11-04
**Reversible?** Yes (Lily Oh) / partly (merge) — from the backups
**Verified?** Yes — Lily Oh has no rating or leaderboard rows; Cristy rated. Integrity check: one rule moved, "school names that collapse to the same name" 10 → 11, from the new Riverside / Riverside, VA pair. It's the same intended NJ-vs-out-of-state pattern as Dover / Dover, DE.

---

## 2026-11-04 — Merge four duplicate girls profiles; Nutley Track roster links fixed

**Script:** `scripts/merge_girls_duplicates_20261104_batch3.mts` (data only). Backup: `docs/migrations/backups/20261104_girls_duplicate_profiles_batch3_before.json`

**Purpose:** Reported by Kyle. In each pair the kept profile has the Track roster name and the most records. No pair ever appears in the same event.
- North Hunterdon: "Reagan Fraber" (d3e218bb; 2 tournament bouts) → "Reagan Farber" (6da4fa41)
- North Star Academy: "Khori Smith" (104693f0; 1 tournament bout, the Track roster match) → "Ihori Smith" (59b0f8c5)
- Nutley: "Izzy Timonera" (f8ed474f; 2 tournament bouts) → "Izzabella Timonera" (63f2f295)
- Nutley: "Janeeza Timonera" (f882b7f5; 3 tournament bouts) → "Janizza Timonera" (af9d4501)
  - The two are sisters. Izzy beat Janeeza in the Essex County 2026 100 final. Izzabella and Janizza share 13 duals and tournaments.

**Also:** Nutley's Track roster links were crossed. Izzabella's profile held Janizza's row, which had given it Fr. Janizza's row (9e9122f1) now points to Janizza. Grades follow the Track roster: Izzabella Sr, Ihori So (both `roster_upload`).

**Steps:** records moved → girls ratings rebuilt (logged by hand) → references recounted (0) → duplicates deleted → girls leaderboards refreshed

**APPLIED** — 2026-11-04
**Reversible?** Partly — the backup holds the duplicates, the kept profiles and the roster row as they were
**Verified?** Yes — 0 references left, all four kept profiles rated, roster rows on the right profiles, integrity check unchanged (35 rules)

---

## 2026-11-04 — Index the rating log's opponent column

**Migration file:** `docs/migrations/20261104_score_log_opponent_index.sql`

**Purpose:** `wrestler_match_score_log.opponent_wrestler_id` (about 204,000 rows) had no index, so each lookup read the whole table (about 7 s). Merges and the profile delete tool check it, and those checks timed out right after a ratings run.

**Changes:** `idx_wrestler_match_score_log_opponent` (partial, `opponent_wrestler_id IS NOT NULL`), built CONCURRENTLY.

**APPLIED** — 2026-11-04, Supabase SQL editor
**Reversible?** Yes — `DROP INDEX CONCURRENTLY IF EXISTS public.idx_wrestler_match_score_log_opponent;`
**Verified?** Yes — an opponent lookup went from 7.4 s to 0.7 s; the next merge's recount ran without a timeout

---

## 2026-11-04 — Merge two duplicate girls profiles at Manasquan

**Script:** `scripts/merge_girls_duplicates_20261104_manasquan.mts` (data only). Backup: `docs/migrations/backups/20261104_girls_duplicate_profiles_manasquan_before.json`

**Purpose:** Reported by Kyle. In each pair the kept profile has the Track roster name and the postseason entries. Neither pair ever appears in the same event.
- "Chelsea Garay" (c246fadc; 6 tournament bouts, Track roster match) → "Chelsea Garay-Jiminez" (60c28b30)
- "Lizzett Cordero" (40f46c72; 3 tournament bouts, Track roster match) → "Lizzet Cordero-Lopez" (5fed1f4b)

**Steps:** records moved → girls ratings rebuilt (logged by hand) → references recounted (0) → duplicates deleted → girls leaderboards refreshed. The first recount and `lb_ps_refresh` timed out right after the ratings run (`wrestler_match_score_log.opponent_wrestler_id` has no index, about 7 s per count). Each passed on one retry a few minutes later.

**APPLIED** — 2026-11-04
**Reversible?** Partly — the backup holds the duplicates' rows and every moved reference
**Verified?** Yes — 0 references left, both kept profiles rated, integrity check unchanged (35 rules)

---

## 2026-11-04 — "Scratch Scratch" placeholder removed; Delete Profile in the wrestler edit tool

**Script:** `scripts/fix_scratch_placeholder_20261104.mts` (data only). Backup: `docs/migrations/backups/20261104_scratch_placeholder_before.json`

**Purpose:** "Scratch Scratch" (Mainland, girls) was a placeholder from the Overbrook Girls Winter Open 2025: 120 R1, Lea Gomez-Mares (Cumberland) won by forfeit over a scratched Mainland entry. It had been created through the RTF import review.

**Changes:**
- The bout stays a forfeit win for Lea, with no loser profile (`wrestler2_id` null, shown as "Forfeit"). The placeholder profile, its alias and its leaderboard row were deleted. A scan of all 14,894 profiles found no other new placeholders (the "Unknown" profiles are the pinned shared-Unknown item).
- **Code:** the admin wrestler edit page has a **Delete Profile** section (`src/lib/wrestlerDelete.ts`, `/api/admin/wrestler-profile/delete`).
  - It first lists what the delete would touch.
  - A profile with real records (dual or tournament bouts, postseason entries, placements, bracket spots, seeds, rankings, upsets) can't be deleted: merge it instead.
  - Otherwise it removes ratings, rating log, leaderboard rows, streak snapshots, name aliases, school history, pending transfers and follows, and returns Track roster matches to `no_match`.
  - The admin confirms by typing the wrestler's full name. The deleted row is saved in the activity log.
- **Code (import guard):** `isPlaceholderName` (`src/lib/personName.ts`) marks names such as "Scratch", "Forfeit", "Bye", "TBD" and "Vacant" as empty slots. The RTF review no longer flags them, and the RTF import never creates a profile for one, even if 'create' was picked. A forfeit over one is kept, with the winner credited and no loser. The site shows such a side as "Forfeit".

**APPLIED** — 2026-11-04
**Reversible?** Scratch: yes, from the backup. Tool deletes: the activity log holds the deleted row.
**Verified?** Yes — profile gone, bout kept as a forfeit; delete preview tested on profiles with and without records

---

## 2026-11-04 — Merge two duplicate girls profiles (Hightstown, Linden)

**Script:** `scripts/merge_girls_duplicates_20261104.mts` (data only). Backup: `docs/migrations/backups/20261104_girls_duplicate_profiles_before.json`

**Purpose:** Reported from the girls roster grade review. Neither pair ever appears in the same event.
- Hightstown: "Jazmine Quisphe" (5caafa3a; 2 tournament bouts) → "Jazmin Quishpe Guzman" (7c681a47)
- Linden: "Andrea Carire | Cruz" (b80eb800; 2 duals, 6 tournament bouts) → "Andrea | Carire Cruz" (84a51f26)

**Steps:** records moved to the kept profile (bouts, aliases; derived rating/leaderboard rows dropped) → girls ratings rebuilt (logged by hand: the local run stops on `cookies()` after scoring) → every reference recounted (0) → duplicates deleted → `lb_rs_refresh` / `lb_ps_refresh` for girls 2026.

**Not merged (checked, left as is):** Hillsborough Jana (235) and Judy (185) Abdalate are two wrestlers on the Track roster. Lenape Valley-Hopatcong "Jaylenn" and "Jalynn" Vazquez hold separate spots in the same 132 bracket at the NH Lady Lions Classic, so Kyle chose to leave them.

**APPLIED** — 2026-11-04
**Reversible?** Partly — the backup holds the duplicates' rows and every moved reference
**Verified?** Yes — 0 references left, both kept profiles rated, integrity check unchanged (35 rules) against the morning run

---

## 2026-11-04 — Roster grade import: mark a school complete

**Migration file:** `docs/migrations/20261104_roster_grade_school_complete.sql`

**Purpose:** The school list showed "Review" only when every Track roster row for the school had been matched. Track rosters list wrestlers with no profile here. Those rows can't be matched, and they stay `school_matched` as the grade pool (`src/lib/rosterPool.ts`), so many schools stayed on "Match Wrestlers" after the review was finished (girls: 182 of 253).

**Changes:**
- New table `roster_grade_school_complete` (school, roster season, gender; who and when; RLS on, service role only).
- Backfill: schools with nothing left to match start out complete (297 boys, 71 girls).
- **Code:** a "Mark Complete" button on the school's roster screen (it saves unconfirmed grades first) and "Reopen". The list shows "✓ Complete" and "Review" for marked schools and "Match Wrestlers" for the rest, with To do and Complete filters. Routes: `/api/admin/roster-grade-import{,-girls}/complete`. Roster rows are not touched.

**APPLIED** — 2026-11-04, Supabase SQL editor

**Reversible?** Yes — `DROP TABLE public.roster_grade_school_complete;`
**Grant fix:** `docs/migrations/20261104_roster_grade_school_complete_grant.sql`. The table was created without grants, so the service role got "permission denied" (APPLIED 2026-11-04).
**Verified?** Yes — 297 boys and 71 girls schools complete; the routes' helper reads them; mark and reopen write test passed

---

## 2026-11-04 — Girls program setup: two co-ops, eight missing programs, one name

**Script:** `scripts/fix_girls_programs_20261104.mts` (data only, no schema change). Backup: `docs/migrations/backups/20261104_girls_programs_before.json`

**Purpose:**
- Mt. Olive/Randolph (56) and Parsippany Hills/Parsippany (78) were girls co-ops in 2025-26, going by the TrackWrestling team names (2024-25: Mt. Olive and Parsippany Hills alone), but were never marked as co-ops. All their girls records were already on 56 and 78. Randolph (87) and Parsippany (64) have no girls records in any table.
- Eight schools with real girls records had no `girls_schools` row, so they were missing from the admin girls program lists (school review, preseason, season): Indian Hills, Hammonton and Toms River East (2024-25 postseason), Keansburg (a 2025-26 dual), and Sparta, Northern Highlands, Cherry Hill West and Vineland (own teams in 2024-25). The public girls school directory was not affected; it lists schools by postseason entries.

**Changes:**
- `girls_schools`: `is_combined = true` for 56 and 78; rows added for 13, 297, 253, 191, 26, 35, 268 and 294.
- `inactive_school_seasons`: (87, 2026, F, merged into 56) and (64, 2026, F, merged into 78). 26, 35, 268 and 294 were already inactive for 2026.
- `wrestlers`: William "Jayden Ratz" (Seton Hall Prep, boys) → first "William Jayden", last "Ratz", as in the source files.
- **Code:** girls standings (`buildGirlsPowerPointGroups`) hide schools that are inactive that season. Sparta, Vineland, Cherry Hill West, Kittatinny and Penns Grove keep their official 0-0 rows but no longer show beside their co-ops. The girls standings, section, group, conference and independent pages now show season names (e.g. "Jefferson-Sparta", not "Jefferson").
- Not changed: 51 other `girls_school_profiles` rows on schools with no girls records. They hold only section and classification, and nothing public reads them.

**APPLIED** — 2026-11-04
**Reversible?** Yes — from the backup file (delete the 8 added rows and the 2 inactive rows, reset is_combined and the name)
**Verified?** Integrity check unchanged (35 rules). Girls school directory 2024-25 lists the seven schools that had girls teams then; 2025-26 shows none of the inactive members.

---

## 2026-11-03 — Site functions name schools by season (girls co-op names everywhere)

**Migration file:** `docs/migrations/20261103_school_names_by_season.sql`. Old definitions (rollback): `docs/migrations/backups/20261103_name_functions_before.sql`

**Purpose:** 52 functions printed `schools.display_name`, the school's own name. On girls pages that gave "Ramsey", "Newton" and "Jefferson" for the girls co-ops: the home leaderboard, the mat-time, bonus, pin and team-point leaders, and the state leader boxes. The co-op names are `school_season_names` rows for the seasons each co-op existed (`scripts/fix_girls_coops_20261103.mts`).

**Changes:**
- Each function now prints `school_display_name(school_id, season, gender)` wherever it printed the school name; bodies are otherwise identical.
- Boys output is unchanged: the only boys season name is Lodi 2024-25, already handled.
- Drops the duplicate `lb_gp_team_points(text, integer)`. Two overloads made every call fail; the (text, smallint) version stays.
- Not changed: `school_directory` (uses the program names), `search_schools`, `get_coop_*`, `admin_region_seed_entries`, and the no-season overloads of `state_bonus_pct`, `state_mat_time` and `state_team_score`.
- **Code:** the leaderboards pages (`src/lib/leaderboards/data.ts`) apply the season names to their rows and to the analytics school list.

**APPLIED** — 2026-11-03, Supabase SQL editor

**Reversible?** Yes — run the backup file
**Verified?** Yes — girls home leaderboard, District 1 mat time, state mat time and the state leader boxes show Newton/Kittatinny, Jefferson-Sparta, Ramsey-Northern Highlands etc.

---

## 2026-11-03 — Girls co-ops finished; girls team totals from TrackWrestling

**Scripts:** `scripts/fix_girls_coops_20261103.mts`, `scripts/build_girls_official_team_scores.mts`. Backups: `docs/migrations/backups/20261103_girls_coops_before.json`, `20261103_girls_team_scores_before.json`, `20261103_wwp_south_girls_entries_before.json`

**Purpose:** An audit of the 2026-08-26 / 09-16 / 09-17 co-op work (Kyle) found moves left half done:
- **Demarest-Old Tappan (314), 2025-26:** made the girls co-op on 2026-09-16, but Old Tappan's (6) girls records never moved. The TrackWrestling team-name alias "Northern Valley Regional-Demarest/Old Tappan" pointed at 6, so every girls import landed there.
- **Newton/Kittatinny (24), 2024-25:** already a co-op that season; its entries and team totals sat on Kittatinny (315).
- **Cherry Hill West (268):** 9 girls 2025-26 bout sides belonged to Cherry Hill East-West (267).
- **The other seven co-ops** (Jefferson-Sparta, Ramsey-Northern Highlands, Buena-Vineland, Cherry Hill East-West, Morris Hills-Morris Knolls, Mt. Olive/Randolph, Parsippany Hills/Parsippany), Cliffside Park/Ridgefield Memorial and Lodi/Saddle Brook were correct.
- **2024-25 girls splits** are correct: TrackWrestling lists those schools as separate teams that year.

The stored girls team totals (`precomputed_team_scores`) were also wrong for some schools: District 1 High Point 147.5 vs TrackWrestling 202.5; some region rows held the site's own formula. 103 teams were missing, mostly co-ops.

**Data changes:**
- **Old Tappan → Demarest-Old Tappan (girls 2025-26):** 8 entries, 37 dual meets and their 233 bouts' school sides, 43 tournament bout sides, 18 roster rows, 17 girls wrestler aliases. The co-op alias now points at 314 for girls (`notes='gender:F'`).
- **Kittatinny → Newton/Kittatinny (girls 2024-25):** 13 entries, 2 team-total rows, 12 girls wrestler aliases.
- **Cherry Hill West → Cherry Hill East-West:** 9 bout sides.
- **District / region assignments:** removed for Old Tappan and Kittatinny (girls 2025-26).
- **Season names:** `school_season_names` girls co-op names for the seasons the co-op existed. Newton/Kittatinny 2024-25 and 2025-26; the others 2025-26.
- **West Windsor-Plainsboro South:** 2 girls District 8 entries moved from North (176) to South (177). They were the only girls 2025-26 entries whose school disagreed with their school text.
- **Girls 2025-26 team totals** for 12 districts, 4 regions and state replaced with TrackWrestling's standings: 440 rows → 542. Each team maps to its school through that tournament's own entries. Teams with 0 points that never entered, and the "Team Forfeit" filler, were skipped.
- **Afterwards:** girls ratings rebuilt (2,401) and leaderboards refreshed.

**APPLIED** — 2026-11-03 by script

**Reversible?** Yes, from the backups
**Verified?** Yes:
- re-audit: Old Tappan, Kittatinny and Cherry Hill West hold no girls records for those seasons
- District 1 reads Newton/Kittatinny 205.5, High Point 202.5, Ramsey-Northern Highlands 189, Jefferson-Sparta 181
- District 9 Jackson Township 223

**Still open:** the girls home leaderboard, mat-time boxes, state leader boxes and the leaderboards pages use `schools.display_name`, so they show "Newton", "Ramsey" etc. for girls co-ops.

---

## 2026-11-02 — Three duplicate girls profiles merged

**Script:** `scripts/merge_girls_duplicates_20261102.mts`. Backup: `docs/migrations/backups/20261102_girls_duplicate_profiles_before.json`

**Purpose:** Completing the truncated names showed three girls with two profiles each (same school, same weight). Approved by Kyle.
- Yuridia Figueroa → Yuridia Figueroa Bravo (Lakewood, 107)
- Madison Garcia → Madison Garcia-Xoloc (Rahway, 132)
- Ellis Beaumont-Torres 7d09c170 → 8b0b4c4e (Rahway, 126)

A first try as one SQL file stopped on a foreign-key error and rolled back. The rating log's `opponent_wrestler_id` still named the duplicates (13 rows of other girls' bouts). Per the FK rule, nothing was deleted to get past it.

**Data changes:** done in stages, as in `scripts/merge_duplicate_profiles.mts`:
1. Moved 1 entry, 6 duals, 7 tournament bouts and 2 name aliases to the kept profile. Removed the duplicate's own derived rows (rating, rating log, snapshot streaks, leaderboard rows).
2. Girls 2025-26 ratings rebuilt, which rewrote the opponent links (2,403 → 2,401 rated). Leaderboards refreshed.
3. Recounted every reference (0), then deleted the 3 empty profiles.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the backup
**Verified?** Yes — 0 references left before each delete

---

## 2026-11-02 — Girls region placements to 6th

**Migration file:** `docs/migrations/20261102_girls_region_placements_6th.sql`

**Purpose:** Girls regions place six (5th place bouts in all four regions), but `girls_region_placements` read only the final and the 3rd place bout. The overview table now has six columns.

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes — the version in `20261102_site_school_ids.sql`
**Verified?** Yes:
- Regions 1, 3, 4 have 72 placers and Region 2 has 70 (one 5th place won by a bye), all to 6th
- R1 120 reads Changaris, Diaz Santos, Carmichael, Guzman Caban, Naddeo, Harrison
- all 35 integrity rules at this morning's counts

---

## 2026-11-02 — Girls Region 1 (2025-26): final, consolation semis, 3rd and 5th place bouts

**Migration file:** `docs/migrations/20261102_girls_region1_place_bouts.sql` (built by `scripts/build_girls_region1_place_bouts.mts`)

**Purpose:** Girls Region 1 had no bout after the semifinals and cons. round 2, so its pages showed no champion or placers. Regions 2-4 are complete. The TrackWrestling text export stops partway through Region 1 (and repeats sections), so the bouts are read from the final bracket PDFs (`2026_girls_region_final/Region 1/`).

**Changes:**
- 60 bouts inserted: 12 finals, 24 consolation semis (C4), 12 each of 3rd and 5th place.
- Round names follow Regions 2-4.
- Cross-checked against the stored bouts: each final pairs the two semifinal winners; each cons. semi pairs a semifinal loser with a cons. round 2 winner; 3rd and 5th pair the cons. semi winners and losers.

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes — rollback note in the file
**Verified?** Yes:
- Region 1 has F 12, C4 24, 3rd 12, 5th 12
- live /girls/regions/1/120 shows Finals through 5th Place
- girls 2025-26 ratings rebuilt; leaderboards refreshed
- integrity rules unchanged except one more same-name pair at one school: Ellis Beaumont-Torres (Rahway), a duplicate the name fix made visible

---

## 2026-11-02 — 44 girls profile names completed

**Script:** `scripts/fix_truncated_girls_names.mts`. Backup: `docs/migrations/backups/20261102_truncated_girls_names_before.json`

**Purpose:** Girls profiles made from the district bracket PDFs had names cut off at about 19-20 characters ("Ashley Romero-Tamay", "Madison Garcia-Xolo"). The TrackWrestling exports carry the full names.

**Data changes:**
- `last_name` completed where exactly one full name in the girls 2025-26 exports starts with the profile's name and the first names agree.
- Hyphen spacing and all-caps tidied ("CEPEDA - MOREL" → "Cepeda-Morel").
- Two shorter profiles that also matched were not renamed. They look like duplicates: Yuridia Figueroa (2024-25 Region Central, Lakewood 107) of Yuridia Figueroa Bravo, and Madison Garcia (2 Union County bouts, Rahway 132) of Madison Garcia-Xoloc.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the backup
**Verified?** Yes — 44 profiles updated

---

## 2026-11-02 — Girls 2025-26 districts: 3rd and 5th place bouts added; placements to 6th

**Migration files:** `docs/migrations/20261102_girls_district_place_bouts.sql` (built by `scripts/build_girls_district_place_bouts.mts`), `docs/migrations/20261102_district_placements_5th.sql`

**Purpose:** Girls district pages showed no 3rd-6th places, and the consolation bracket stopped at C3 (the consolation semifinal). Kyle checked the original documents: every 3rd place match is listed. The TrackWrestling export (`gt_s2_girls_districts.txt`) has 144 "3rd Place Match" and 143 "5th Place Match" lines; the district import never loaded them.

**Changes:**
- 283 bouts inserted (`3rd_Place` / `5th_Place`, consolation side). Each wrestler is matched to her entry in that district at that weight.
- 4 forfeit-vs-forfeit slots are not bouts and were skipped. A place won by a bye is stored as BYE; a win over a forfeit slot is FORF with no loser.
- 31 names were matched loosely and checked. Most are profiles cut off at about 19 characters ("Ashley Romero-Tamay"); a few are one-letter spelling differences ("Cristell" / "Cristelle").
- `district_placements` reads the 5th place bout too (places 5-6). Boys districts have none, so boys results are unchanged.

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes — rollback notes in both files
**Verified?** Yes:
- 283 girls district place bouts
- District 1 120 lists all six places
- boys districts still place 4
- girls leaderboards refreshed

---

## 2026-11-02 — Girls 2025-26 districts: 117 duplicate bouts removed

**Migration file:** `docs/migrations/20261102_girls_district_duplicate_bouts.sql`. Backup: `docs/migrations/backups/20261102_girls_district_duplicate_bouts_before.json`

**Purpose:** 117 bouts were stored twice: District 7 44, District 9 73. They doubled those bouts in win counts, the postseason leaderboards and ratings. Approved by Kyle.

**Data changes:**
- Deleted each row that matched an earlier one on tournament, weight, round, side, winner, loser and result.
- The earlier row stays.
- Nothing references matches by foreign key.

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes, from the backup
**Verified?** Yes:
- 0 duplicate girls district bouts
- girls 2025-26 ratings rebuilt (2,403 wrestlers)
- girls leaderboards refreshed

---

## 2026-11-02 — Bracket filler entries removed

**Migration file:** `docs/migrations/20261102_remove_placeholder_entries.sql`. Backup: `docs/migrations/backups/20261102_placeholder_entries_before.json`

**Purpose:** 19 postseason entries with no school were bracket filler, not wrestlers. Each one's only bouts were forfeit losses, with no duals, and one filler "beat" another. They showed on brackets and in 24 postseason leaderboard rows.
- Boys District 13 (2024-25): "Forefit A" ×5
- Boys District 21: Rutgers coaches' names
- Boys District 23: Brian Grainer
- Girls District 9 (2025-26): 8 names
- Girls District 5: 1 entry pointing at a profile that doesn't exist

Approved by Kyle with the counts.

**Data changes:**
- 22 forfeit wins over filler became byes
- 9 bouts deleted (8 duplicate copies, 1 filler vs filler)
- 19 entries deleted
- 14 profiles deleted

**PENDING** — to run in the Supabase SQL editor

**Reversible?** Yes, from the backup
**Verified?** Pending

---

## 2026-11-02 — Site functions name schools by id (no bracket text on the site)

**Migration file:** `docs/migrations/20261102_site_school_ids.sql`. Old definitions (rollback): `docs/migrations/backups/20261102_site_functions_before.sql`

**Purpose:** The postseason pages showed `tournament_entries.school_context_raw`, the bracket's own text ("Northern Highlands Regional Sc", "Waldwick / Midland Park"), translated through `school_names` where a row existed. Raw imported text must never reach the site (Kyle), and the logo lookup by those names missed: 7 of 12 logos on /boys/regions/1/150.

**Changes:** 27 functions return the school id (new columns at the end) and fill their school text columns with `school_display_name(school_id, season, gender)`, or NULL when the entry has no school (pages show TBD). None reads `school_context_raw` or `school_names` any more.
- Brackets: `district_bracket`, `region_bracket`, `girls_region_bracket`, `state_bracket`
- Bracket entries: `region_bracket_entries_v2`, `girls_region_bracket_entries_v2`, `state_bracket_entries_v2`
- Placements: `district_placements`, `region_placements`, `girls_region_placements`, `state_placements(gender, season)`. State keeps its fallback to the region or district entry's school.
- `region_district_champs`, `girls_region_district_champs`
- Fastest pins and techs: `district_`, `region_`, `girls_region_fastest_pin` / `_tf`
- `district_team_pts`, `district_schools`, `region_schools`, `girls_region_schools` (one row per school, not per bracket spelling)
- `ghost_champions`, `state_champions`, `bracket_buster_detail`, `get_wrestler_revenge_wins` (the opponent's school is his entry in the revenge bout)
- `ghost_champions` and `get_wrestler_ghost_championships`: each win on the path also carries `opponent_id` and `opponent_school_id`
- Not changed: `state_placements(gender)` without a season (nothing calls it)

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes — drop the new versions and run the backup file
**Verified?** Yes:
- every changed function returns school ids, and no row has a name without an id
- live audit of 341 pages (district / region / state overviews and weight pages, both genders, home, postseason, Ghost Champions): 0 bracket-text names, 23,248 logos. The only TBDs were empty forfeit sides, now hidden.

---

## 2026-11-02 — Every named bout side linked to a profile

**Script:** `scripts/resolve_unlinked_bouts.mts`. Record: `docs/migrations/backups/20261102_unlinked_bouts_resolved.json` (before, every changed side's wrestler or school id was NULL)

**Purpose:** Bout sides with a name but no wrestler id fell back to the imported name on the site, and their bouts were missing from the wrestler's record. Kyle: "we should be resolving bout data not letting it linger".

**Data changes:**
- **Links:** 137 sides linked (boys duals 136, boys in-season tournaments 86, girls in-season tournaments 14, counted before the run). A side links to a profile only when exactly one same-gender profile with that name already wrestles at that school.
- **New profiles:** 48 created, mostly out-of-state opponents at King of the Castle (DE) and Escape the Rock (PA).
- **Stale aliases:** for 8 wrestlers, the school's name alias pointed at a same-name profile from another school (same season, other weights, often bouts on the same day). Each got his own profile and the alias moved to it: Anthony Rodriguez (Lakeland), Christian Ramirez (Lakeland), Kevin Hernandez (Lyndhurst-North Arlington), Anthony Flores (Pemberton), Cristian Garcia (Penns Grove), Youssef Adam (Raritan), Aiden Brown (Scotch Plains-Fanwood), Aiden Gonzalez (Somerville).
- **Split:** Sebastian Soto: Hopewell Valley (132) split off the Roxbury profile (144/150), with his 2 Robin Leff bouts.
- **Schools:** 44 linked tournament sides got their school id from the bout's school text (Northern Valley Regional (Old Tappan), Eastside (Paterson), Delaware schools).
- **Burlington County Tournament:** 5 bouts read "Name (BCIT | Westampton)" and were split on the pipe. Name, school (Westampton Tech) and round (UNK) fixed.
- **Left empty:** 26 sides that aren't wrestlers ("Unknown", "Forfeit Forfeit", "Medical Forfeit").
- **Afterwards:** boys 2025-26 ratings rebuilt (archive), girls 2025-26 ratings recalculated, leaderboard tables refreshed. Score backups: `20261102_{boys,girls}_2025-26_wrr_scores_before_relink.json.gz`.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the record (unset the listed ids)
**Verified?** Yes:
- 0 unlinked named sides in boys and girls duals
- 0 unlinked in girls tournaments; boys tournaments only the 26 non-wrestler sides
- all 35 integrity rules at the same counts as before

---

## 2026-11-02 — Leaderboards list each wrestler at his rating weight

**Migration file:** `docs/migrations/20261102_leaderboards_v2_weight.sql`

**Purpose:** `lb_rs_wrestler.weight` was the most common regular-season weight, so a wrestler who moved up mid-season was filed at his old weight. Manny Gusfa had 15 bouts at 157 in December and 10 at 165 after, with districts, regions and state at 165, and showed on the 157 WRR board. Before the fix, 1,271 boys and 419 girls were listed at a different weight than their rating.

**Changes:** `lb_rs_refresh` now lists each wrestler at `wrestler_hammer_scores.weight_class`: the postseason entry, else the last in-season tournament, else the most common dual weight. An unrated wrestler gets his most recent bout's weight, snapped to the gender's ladder.

**APPLIED** — 2026-11-02, Supabase SQL editor. Tables refreshed for 2025-26 and 2026-27.

**Reversible?** Yes — rollback note in the migration file
**Verified?** Yes:
- 0 of 7,436 boys and 0 of 2,410 girls rated wrestlers listed at a weight other than their rating weight
- 0 weights off the ladder
- Manny Gusfa on the live 165 board, not 157

---

## 2026-11-02 — Leaderboards: average time across pins and techs

**Migration file:** `docs/migrations/20261102_leaderboards_v2_pt_avg.sql`

**Purpose:** The Most boards show the average fall time, average tech time and the average across both. A tie on the count goes to the faster average (Kyle, 2026-11-02).

**Changes:**
- `pt_avg` column on `lb_rs_wrestler` and `lb_ps_wrestler`
- `lb_rs_refresh` / `lb_ps_refresh` fill it: the average over every timed fall and tech fall; tech times under 8 s are excluded
- Tables refreshed for 2025-26 and 2026-27, boys and girls

**APPLIED** — 2026-11-02, Supabase SQL editor

**Reversible?** Yes — rollback notes in the migration file
**Verified?** Yes — Jayden James's stored averages equal those computed from his bouts (8 pins 89.6 s, 15 techs 293.3 s, both 222.4 s); ties order by faster average

---

## 2026-11-02 — 4 profiles in the wrong gender's bouts

**Script:** `scripts/fix_cross_gender_profiles.mts`. Backup: `docs/migrations/backups/20261102_cross_gender_profiles_before.json`

**Purpose:** Girls don't wrestle on boys teams in NJ (Kyle, 2026-11-02). The integrity check found 4 profiles marked female with 6 sides in boys duals.

**Data changes:**
- **Alexis Santiago (Asbury Park):** every bout is a boys dual, and Asbury Park's boys Track roster lists him (Fr). Gender F → M. The Easton girl split off earlier is a separate person.
- **Riley Allen, Addison Collins (Peddie), Gabriel Grant (East Orange):** a boy merged into a same-name girl by the old name-only import match. Each boys-dual side moved to a new male profile at that school (Peddie: out-of-state).
- **Afterwards:** boys 2025-26 ratings rebuilt (archive) and the leaderboard tables refreshed. Gabriel Grant's only bout is a forfeit win, so he isn't rated.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the backup
**Verified?** Yes — integrity rules: wrong-gender bouts 0; scoreable bouts missing from the rating log 0 (boys and girls)

---

## 2026-11-02 — Leaderboards v2: tables per view, postseason At/Through, analytics by level

**Migration file:** `docs/migrations/20261102_leaderboards_v2.sql`

**Purpose:** Each leaderboard table gets its own page that reads only its rows. Today the regular-season page downloads every wrestler's season stats (2.5 MB, about 8 s uncached) and recomputes them from all bouts every 5 minutes, one of the heaviest recurring reads.
- Season stats are now computed once into tables, after each nightly rating run, by the new `/api/admin/refresh-leaderboards` cron at 07:00 / 07:15 UTC.
- Postseason gets At / Through for regions and state, plus weights and paging; the old functions were fixed at 25 rows.

**New objects only** (nothing existing altered or dropped):
- **`lb_kind(text)`:** one result translation for every leaderboard, matching the rating's `classifyOutcome`. Tested against every stored spelling.
- **Tables `lb_rs_wrestler`, `lb_rs_team`, `lb_ps_wrestler`, `lb_ps_team`:** readable by the site; FK to schools for name and logo.
- **`lb_rs_refresh(gender, season)` / `lb_ps_refresh(gender, season)`:** service role only.
- **`lb_an_bracket_buster`, `lb_an_comebacks`, `lb_an_technical_masters`, `lb_an_margins`, `lb_an_cinderella`:** with a level filter and school ids.

**Fixes carried in** (from reading the old functions):
- overtime and tiebreaker wins scored 0 in points per dual (now the sum of team points recorded on each bout)
- bonus % had three definitions; now one (falls + techs + majors ÷ matches)
- a tech fall under 8 s is ignored everywhere
- names from `wrestlers`, never raw imports
- the Unknown placeholder no longer appears as a wrestler
- girls postseason Team Points was always empty: two `lb_gp_team_points` versions made every call fail

**APPLIED** — 2026-11-02, Supabase SQL editor (plus the follow-up below). Tables filled for 2025-26 and 2026-27, boys and girls; each refresh takes under 5 s.

**Verified against the old leaderboards and direct queries:**
- **Postseason:** the top 25 for pins, techs, wrestler points and team points are identical for every pool that existed before (Districts, Through Regions, Through State), boys and girls.
- **At + At = Through:** exact for every wrestler.
- **Girls team points** match the official `district_team_score` for all 217 schools.
- **Logos:** 0 NJ rows without a logo.
- **Regular season:** 5,966 of 5,967 boys and all 2,066 girls identical to the old table. The exceptions are expected: a forfeit loss the old code skipped (`Forfeit` spelling), the Unknown placeholder, and the boy below who was marked female.
- **Points per dual:** up for 260 boys and 73 girls teams; the old count dropped SV-1, injury defaults and tiebreakers.
- **Down for 2 girls teams** (Lakeland, Newark Collegiate, -3 each): the old code scored a medical forfeit as 6. The bout records 3, and the recorded bout points match the final score of every meet with a medical forfeit.

**Follow-up migration:** `20261102_leaderboards_v2_team_bouts.sql`, APPLIED. The team tables count every bout the team wrestled; individual tables list only that gender.

**Rollback:** drop the new objects (end of the migration file). The old functions are untouched.

**Also on the branch:**
- `/api/admin/refresh-leaderboards` requires an admin (`app_users.role`), not just any signed-in user.

---

## 2026-11-02 — 237 empty wrestler profiles deleted

**Script:** `scripts/delete_empty_profiles.mts` (approved 2026-11-02: "we should be deleting all empty profiles so they don't appear in search")

**Data changes (deleted, counts shown before approval):**
- 166 profiles emptied by the duplicate merge.
- 71 other profiles with no references, all boys, created 2026-06 to 09. Examples: Justice Commendatore, "Extra: Yamir Jones", "Gregory " (blank last name).

**How "empty" was checked:**
- Each profile was counted immediately before the delete across all 35 foreign-key columns to `wrestlers.id`, plus `users.followed_wrestler_ids`.
- `wrestler_completeness` has one row per wrestler and follows the wrestlers table (15,094 → 14,928 → 14,857), so it is not a reference.
- The first delete was a one-profile probe, ready to stop on a foreign-key error; none occurred.

**Backups:**
- `docs/migrations/backups/20261102_merged_duplicate_profiles_deleted.json`
- `docs/migrations/backups/20261102_unreferenced_profiles_deleted.json`

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, re-insert the rows from the backups (same ids)
**Verified?** Yes — a rerun finds 0 unreferenced profiles

---

## 2026-11-02 — Integrity review: result types rated, CBC bouts, 16 two-person profiles, 166 duplicate profiles merged

**Check:** `scripts/integrity_check.mts` (read-only, 35 rules). Run before and after every data change. Baseline vs after:
- flagged out-of-state at NJ-only schools: 18 → 0
- NJ + non-NJ mixed: 8 → 2 (both transfers)
- same-name same-school profiles: 149 → 4 (each really two people)
- scoreable dual bouts missing from the 2025-26 rating log: boys 816 → 0, girls 226 → 0

**1. Result types (code, `src/lib/hammerScore.ts`).** `classifyOutcome` matched exact strings only, so about 190 wrestled bouts were never rated: `TB-1 4-3` and other tiebreakers with a score, `OT`, `2-OT`, `TB-2`, `SV-2`, `DEC`, and 22 girls tournament `Maj`. Now mapped: overtime/tiebreaker = SV-1, DEC = Dec, Maj = MD. Forfeit, injury, DQ, default and NC are still not scored, on purpose.

**2. Christian Brothers College (`scripts/fix_cbc_tournament_bouts.mts`).** The 2026 East Coast Catholic Classic (2026-01-09) names both CBA (NJ, 197) and CBC (St. Louis, 506) "Christian Brothers".
- 92 bout sides for the 18 CBC wrestlers moved from CBA to CBC. They have aliases at 506, are on no CBA roster and have no duals. Their out-of-state flag was correct.
- The 23 CBA wrestlers at that event are unchanged.
- Backup: `20261102_cbc_tournament_bouts_before.json`.

**3. Two people on one profile (`split_merged_wrestlers.mts --list 20261102_merged_splits_round3`).** 16 splits; 34 rows moved (mostly 2024-25 postseason entries, which feed the rating's starting base). Each case has evidence:
- both Track rosters list the name
- the wrestler was a freshman in 2025-26 with records at another school in 2024-25
- records 9 weight classes apart
- an NJ and an out-of-state record in the same season

3 went into the other person's existing profile (Luke Miller @ Demarest, Jayden Williams @ Sterling, Jacob Rivera @ Delaware Military). 3 kept profiles un-flagged out-of-state (Dominic Thomas, Jacob Rivera, Brianna Biggs).
- `splitWrestler.ts` gains `intoId`, to move records into an existing profile.
- **Left as one person:** 84 apparent transfers (consistent weights); co-op girls (Old Tappan/Demarest, WW-P N/S, Cherry Hill E/W); Blair "B Team" and Hodgson duplicate school records.
- **Undecided:** Finley Pazinko, Jake Valeri, Aidan Thompson, Ashley Coronel, and Antonio Cruz's Cedar Creek bout.

**5. Duplicate profiles (`scripts/merge_duplicate_profiles.mts`).** 166 same-name same-school pairs merged into the profile with more records. A pair merges only if nothing says it's two people:
- both wrestled on the same date
- both entered in the same tournament
- the roster lists the name twice
- different grades
- weights 3+ classes apart

4 pairs are two people and stay separate: Ryan Kim (Fort Lee), Julian Sanchez (WW-P North), Chris Gallucci (Sterling), Dan Vargas (Easton).
- **References moved:** all foreign keys to `wrestlers.id` (from the API's FK list), plus `users.followed_wrestler_ids`.
- **Derived rows removed:** the duplicates' rating rows (17) and boys 2025-26 snapshot streak rows (600). Streak rows are only read when building the next weekly snapshot for their season, so nothing reads these now.
- **Not deleted:** the 166 emptied profiles (0 references; deletion pending approval).
- **Interruption:** the first run timed out on `wrestler_match_score_log.opponent_wrestler_id` (no index). That column is left to the rating rebuild, and `--resume` finished from the backup.
- Backup: `20261102_duplicate_profiles_before.json`.

**Ratings rebuilt after all of the above:** boys 2025-26 (archive) and girls 2025-26.

**Open:**
- #4: 31 girls duals where one wrestler faces several opponents at one weight (combined meets). Needs Track pages.
- #6: Ella Magee vs Ella Magee (2026 SJWHOF Girls Varsity, NC placeholder); deleting it needs approval.
- #7: 6 bouts with a girl in a boys dual.
- 229 boys / 42 girls duals whose score differs from the bout points (likely team deductions, unverified).

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the backups
**Verified?** Yes — integrity check before/after as above; every remaining failure has been reviewed.

---

## 2026-11-02 — Dover tournament bouts; 12 NJ/out-of-state profiles split; rating log cleanup made sturdier

**Scripts:**
- `scripts/fix_dover_tournament_bouts.mts`: backup `docs/migrations/backups/20261102_dover_tournament_bouts_before.json`
- `scripts/split_merged_wrestlers.mts --list 20261102_merged_oos_splits`: list, backup and result in `docs/migrations/backups/20261102_merged_oos_splits_*.json`. The script now takes `--list <prefix>`.

**Data changes:**
- **Dover:** the Dover Holiday Tournament (2025-12-13) and Howdy Duncan (2025-12-19) sources label Dover, NJ as "Dover, DE" / "Dover". 22 bout sides for 9 Dover, NJ wrestlers moved from Dover, DE (608) to Dover (61).
  - Those 9 have Dover duals, NJSIAA postseason and Dover's Track roster.
  - 3 other "Dover, DE" wrestlers (no NJ record, on no Track roster) stay.
- **12 splits:** each was an NJ wrestler merged with a same-name out-of-state wrestler, from the RTF/CSV cross-school name fallback (fixed 2026-11-01). 22 bout rows moved to new out-of-state people: Daniel Mendoza, Chase Young, Jake Welsh, Alex Hall, Aiden Peterson, Ryan Brown, Anthony Cruz, Kevin Hernandez, Derek Rodriguez, Joshua Perez, Cole Wilson, and Alexis Santiago (Asbury Park / Easton, confirmed two girls). `flag_non_njsiaa_wrestlers.mts` now finds 0 to flag and 0 mixed.
- **Ratings rebuilt:**
  - boys 2025-26 (archive): 7,455 rows, log 138,487
  - girls 2025-26: 2,402 rows, log 38,277
  - no rated wrestler at a non-NJ school

**Code (`recalculate-hammer-scores/route.ts`):** a failed log insert now re-reads the season's ids and removes every row not in the old log. A girls run hit a statement timeout, and its batch was written even though the reply failed, so 500 rows were missed by the undo; they were removed by hand.
- **Cause of the timeouts:** about a million log rows were deleted on 2026-11-01/02, and the database had not yet cleaned up that space.
- **Suggested:** `VACUUM (ANALYZE) public.wrestler_match_score_log;` in the SQL editor.

**Open (decision needed):** in a dual meet an out-of-state opponent counts as rating 0 (tournaments use the round: 55/60/65).
- Boys 2025-26: 794 NJ dual bouts (1.8%), 229 of them against wrestlers flagged 2026-11-02 (Peddie 157).
- Girls 2025-26: 43.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes, from the backups
**Verified?** Yes — counts above. Leo Lorenzo is rated at Dover with 42 bouts.

---

## 2026-11-02 — Non-NJSIAA wrestlers flagged out-of-state; imports set the flag from the school

**Decision (Kyle, 2026-11-02):** wrestlers at schools marked non-NJ get no NJ rating, ranking or seeding. That covers other states and NJ schools outside the NJSIAA (Lawrenceville, Peddie, Blair).

**Code:** new `src/lib/schoolIsOos.ts` (`nonNjSchools`). A wrestler created at a non-NJ school is now `is_oos`:
- **Dual imports (boys and girls):** the out-of-state value went only to `is_stub`, never `is_oos`.
- **Tournament-bout import:** set neither.
- **RTF and CSV:** only the matched-name OOS case.
- **Unlinked duals:** was hard-coded false.

**Script:** `scripts/flag_non_njsiaa_wrestlers.mts`. Backup and lists: `docs/migrations/backups/20261102_non_njsiaa_wrestlers_flagged.json`

**Data changes:**
- **182 wrestlers flagged `is_oos`** (158 boys, 24 girls): every dual bout, tournament bout and postseason entry is at a non-NJ school.
  - Aliases are ignored. The dual import left stray aliases at a same-name NJ school: 12 Gloucester VA wrestlers were aliased at Gloucester City.
  - Largest groups: Peddie 29, Lawrenceville 18, Blair 18, Easton 16.
- **Ratings rebuilt:**
  - boys 2025-26 (archive mode): 7,458 rows
  - girls 2025-26: 2,403 rows
  - 0 rows left at non-NJ schools, except Alexis Santiago (below)

**Listed, not changed (21 mixed):**
- **10 Dover, NJ wrestlers** have tournament bouts credited to "Dover, DE", the wrong Dover. These are NJ wrestlers; the school on those bouts needs fixing.
- **10 look like an NJ wrestler merged with a same-name out-of-state wrestler from a national tournament** (the RTF/CSV name fallback, fixed 2026-11-01): Daniel Mendoza (Elizabeth / Victor Valley CA), Chase Young (Bergen Catholic / Del Oro CA), Jake Welsh (Butler / Hurricane WV), Alex Hall (Tenafly / St. Pius X KC), Aiden Peterson (Garfield / St Edward), Ryan Brown (WW-P North / Connellsville), Anthony Cruz (Phillipsburg / Folsom), Kevin Hernandez (Ridgefield Memorial / Oxford), Derek Rodriguez (Bloomfield / Whitehall), Joshua Perez (Long Branch / Xavier), Cole Wilson (Manchester Twp / St Paul VI).
- **Alexis Santiago:** Easton bouts plus an Asbury Park record.

**APPLIED** — 2026-11-02 by script

**Reversible?** Yes — the backup lists the 182 ids (set `is_oos` back to false and rerun the ratings)
**Verified?** Yes — a rerun finds 0 left to flag; rating counts above

---

## 2026-11-02 — Rating recalc paged queries fixed; boys 2025-26 ratings rebuilt again

**Code:**
- **`recalculate-hammer-scores/route.ts`:** the dual-meet loader paged by `meet_date` only. Date is not unique, so pages overlapped, and **every boys run skipped the same 17 meets** (379 bouts never rated). It now orders by date, then id. Six other paged reads in the route had no order at all and now order by id:
  - meet ids
  - postseason entries (3 places)
  - NJ wrestlers
  - tournament bouts
- **Same fix elsewhere:** paged reads without a unique order now end on id (or wrestler_id):
  - name matcher index and aliases (`src/lib/matchWrestlers.ts`)
  - admin postseason page
  - district pre-seed
  - rating preview
  - individual upsets
  - rankings auto-publish
  - null-wrestler bouts
  - roster import school lists (boys and girls)
- **Archive mode corrected:** it kept the archived school, which kept a split profile (Justin Ramirez) at the other person's school, Manville. School, district and region now come from the season's own bouts and entries, as in a normal run. Only conference, section and classification are kept, and only when the school is unchanged.

**Corrections to the 2026-11-01 entry:**
- Ryan Shultz and Aiden Romero did not "lose a bout that moved": their meets were among the 17 skipped. They are rated again.
- That run kept Ramirez at Manville; the rerun fixes it.

**Result of the rerun:**
- 7,607 rows (32 added vs September, 18 dropped: now out-of-state)
- 138,783 log rows
- 0 boys 2025-26 meets with wrestled bouts left unrated
- 9 school changes vs September, all corrections: Ramirez; 4 Gloucester VA wrestlers previously credited to West Deptford by the side-swap bug; 2 previously blank; 2 "Unknown" placeholders

**Open (not changed, needs a decision):**
- 164 ratings (148 boys, 16 girls) belong to wrestlers at schools marked non-NJ who aren't flagged out-of-state. Most are NJ prep schools outside the NJSIAA (Lawrenceville, Peddie, Blair), plus PA schools and Gloucester VA.
- 4 rating rows belong to "Unknown" placeholders.
- A full boys season run took 191 s locally; the Vercel limit is 300 s.

**APPLIED** — 2026-11-02 by script (route code, service role)

**Reversible?** Yes, from the 2026-11-02 scores backup
**Verified?** Yes — counts above; Shultz, Romero and Ramirez checked individually

---

## 2026-11-01 — Boys 2025-26 ratings (WRR) rebuilt; rating log replaced by id

**Code:** `src/app/api/admin/recalculate-hammer-scores/route.ts`
- **New `{ season, archive: true }` mode:** rescores a past season from current data. Each archived row keeps its school, conference, section, classification, district and region; current main weights are untouched.
- **Old log rows are now found by id, not `created_at`.** Ids are read through the primary key and deleted 200 at a time. Deleting a full season's log (138k boys rows) in one statement timed out; that would also have broken the nightly run once the live boys log grew that large.

**Backups:**
- scores: `docs/migrations/backups/20261102_boys_2025-26_wrr_scores_before.json.gz` (7,593 rows from 2026-09-12)
- log: `20261102_boys_2025-26_wrr_log_before.json.gz` (138,340 rows from 2026-10-28; local only, 16 MB, gitignored; the log can be rebuilt from the bouts)

**Why:** The archived scores were from 2026-09-12. They predated:
- the 2026-10-26 rating fixes (each gender scored separately)
- 7 weeks of bout corrections
- the 2026-11-01 profile splits and duplicate-meet removal

**Result:**
- 7,604 rows (was 7,593). 3,776 unchanged; of the 3,797 changed, 3,659 moved by under 0.5.
- **+31:** split people and wrestlers newly qualifying.
- **−20:** 18 now out-of-state; 2 NJ wrestlers whose single bout moved.
- **School details on kept rows:** 0 changed.
- **Base:** 26 wrestlers lost their prior-season base.
  - 2 were borrowed from a different person (split today: Jason Gonzalez, Bryan Hernandez).
  - 24 lost a "discovery" base of 20, the rule where an unrated wrestler who beats a 20+ opponent gets 20. These form chains (e.g. Fontanez → Dapito). The chains start with bouts scored differently before 2026-10-28; there is no copy of the 2026-09-12 bouts to say exactly how.
  - Six wrestlers dropped about 21–32 points each.

**Mid-run cleanup:** two runs failed on the old timed-out delete and left extra log copies. Trimmed to one full set by script before the final run.
- The final log has 138,404 rows.
- The girls log had 38,300 rows after three normal runs: no copies.

**APPLIED** — 2026-11-01. The route was run from a script with the service role. The activity log entry was written by hand, because the route's own write needs a signed-in request.

**Reversible?** Yes, upsert the scores backup.
**Verified?** Yes:
- row and log counts as above
- archived school details unchanged
- the girls normal run checked three times

---

## 2026-11-01 — Duplicate St. Augustine vs Green Run meet removed

**Script:** `scripts/remove_duplicate_green_run_meet.mts` (approved 2026-11-01). Backup: `docs/migrations/backups/20261101_duplicate_green_run_meet.json`

**Purpose:** St. Augustine 80 – 0 Green Run (2026-01-09) was imported twice on 2026-08-02, against "Green Run" (770) and "Green Run, VA" (772), with the same 14 bouts. That double-counted the dual for every wrestler in it.

**Data changes (deleted, after counting references):**
- the copy against 772: 1 meet, 14 bouts
- 11 boys 2025-26 rating match log rows for those bouts
- school 772 "Green Run, VA" (nothing else used it)

The kept meet (`262e4935…`, against 770) is unchanged.

**APPLIED** — 2026-11-01 by script

**Reversible?** Yes, re-insert from the backup
**Verified?** Yes — the profile scan finds:
- boys: 0 merged, 0 wrong-team, 0 duplicate-school
- girls: 0 wrong-team; 2 flagged are NV-Demarest/Old Tappan co-op girls credited to either school, so one person each
- left as is by decision: the "Unknown" placeholders and the 2025-12-15 empty jamboree pairings

---

## 2026-11-01 — Dual bouts with wrestlers on the wrong side; one more profile split

**Scripts:**
- `scripts/fix_dual_wrestler_sides.mts`: backups `docs/migrations/backups/20261101_dual_wrestler_sides_before_*.json`
- `scripts/find_mixed_wrestler_profiles.mts`: the scan, reusable

**Purpose:** An early dual import put the winner on side B. In bouts team 1 won, the two wrestlers sat on each other's side: the points and winner were right, but each wrestler was credited to the other team. This made 41 profiles look like they wrestled for two schools.

**Data changes:**
- **42 bouts:** wrestler id and raw name swapped between sides; schools, points and winner unchanged.
  - Boys: 4 bouts in 1 meet, Gloucester VA vs West Deptford, 2026-01-09.
  - Girls: 38 bouts in 6 meets, 2026-01-16 to 02-13 (Old Tappan, Kearny, Lenape Valley-Hopatcong, Warren Hills, Ramsey, Passaic, Lodi/Saddle Brook, Vernon).
  - Found by rule across all dual bouts (points to one team, winner on the other side); 0 remain.
- **Jayden Cruz:** split at DePaul Catholic. DePaul's roster lists its own Jayden Cruz, Jr. Backup `..._splits_before_2.json`.

**APPLIED** — 2026-11-01 by script

**Reversible?** Yes, from the backups
**Verified?** Yes — the rule finds 0 bouts with wrestlers on the wrong side.

---

## 2026-11-01 — Girls 2026-01-06: Bloomfield vs Delaware Valley separated from Mount Olive/Randolph vs Hunterdon Central

**Script:** `scripts/fix_bloomfield_delval_20260106.mts`. Backup of the 6 moved rows: `docs/migrations/backups/20261101_mount_olive_hcr_extra_bouts.json`

**Purpose:** The Bloomfield vs Delaware Valley dual (same day) was imported into the Mount Olive/Randolph vs Hunterdon Central meet. 6 of its bouts were credited to Mount Olive / Hunterdon Central, which made 12 girls look like they wrestled for two schools, and its 185 lb bout was missing. Checked against the Track pages for both meets.

**Data changes:**
- New girls dual: Bloomfield 12 – 29 Delaware Valley, 2026-01-06, `89cbcfde-0370-432b-a437-6000ca4bfbcc`. The score is the sum of the 7 bouts; Track's Delaware Valley team view showed no others.
- 6 bouts moved into it, credited to Bloomfield / Delaware Valley, winners unchanged.
- Added 185 lb: Emmy Rea Hotz (Delaware Valley) over Lesly Sanchez (Bloomfield), Fall 2:36.
- Mount Olive/Randolph vs Hunterdon Central now has its 12 bouts, 45–24, matching Track.

**APPLIED** — 2026-11-01 by script

**Reversible?** Yes:
- move the 6 rows back from the backup
- delete the new meet and its 185 bout
**Verified?** Yes — bout points per meet match the team scores (45–24, 12–29).

---

## 2026-11-01 — 26 profiles that held two people split

**Script:** `scripts/split_merged_wrestlers.mts`
- list: `docs/migrations/backups/20261101_merged_wrestler_splits_list.json`
- backup: `..._splits_before.json`
- result: `..._splits_done.json`

**Purpose:** The dual imports, the tournament-bout import and the nickname resolver reused any same-name wrestler from any school (fixed 2026-11-01: same school only). That joined different people into one profile.
- **Found by scan:** profiles at two schools on the same day, or switching back and forth within a season.
- **Confirmed by Track rosters:** two schools each list the name.

**Data changes:**
- **26 splits:** 23 boys, 3 girls. 129 rows moved to new people at their own school: dual and tournament bouts, entries, placements, aliases, roster links.
- **New people:** their school's roster grade where listed; out-of-state where the school is.
- **Kept-profile grades:**
  - Angel Gonzalez Jr → Sr
  - Mario Rodriguez → So
  - Christian Gonzalez cleared (it was the Camden boy's)
- **Fix to `splitWrestler.ts`:** girls tournament bouts now move too, and the new person is out-of-state for an out-of-state school.

**Not changed:** archived boys 2025-26 ratings for these profiles (girls ratings rebuild on the next recalculation).

**APPLIED** — 2026-11-01 by script

**Reversible?** Yes, from the before-backup (move the rows back, delete the new people)
**Verified?** Yes — all 26 kept profiles have no rows left at the second school; each new person has them.

---

## 2026-11-01 — Track roster players kept current; grades settled in the import review

**Migration file:** `docs/migrations/20261101_roster_pool_graduated.sql`

**Purpose:** Track roster players not on our wrestler list stay on file with a current class, so a grade is ready when they show up in a match upload.
- **Roll Over Roster** (boys and girls) advances them with the wrestlers: grade + 1, season + 1. Seniors become `graduated`: kept for history, never suggested.
- **The import review** (dual: boys, girls, girls jamboree; tournament: RTF, CSV) shows a Grade on each new wrestler:
  - one exact same-school name match: filled in
  - close spellings: offered to pick, never filled in
  - anything can be changed or cleared before saving
- **Saving the import** writes the grade (never over an existing grade) and ties the roster player to the wrestler (`confirmed`).

**Database changes:**
- `roster_grade_import` status check adds `graduated`; the old inline check is found by definition and replaced.
- `dual_import_drafts.grade_choices` (jsonb, default `{}`): grade choices made in the review.

**Data change already made (2026-11-01):** girls Roster Grade Import step 1. `scripts/link_girls_roster_schools.mts` linked all 2,876 girls rows to their schools (253 school names, all exact matches, each to a different girls program). Status `pending` → `school_matched`.

**Tables affected:** `roster_grade_import`, `dual_import_drafts`

**APPLIED** — 2026-11-01, Supabase SQL editor

**Reversible?** Yes:
- drop `grade_choices`, and restore the old check (fails if any row is already `graduated`)
- step 1: set the girls rows back to `pending` with `school_id` NULL
**Verified?** Step 1: yes, 2,876 rows `school_matched` (Absegami's 5 → 276). Migration: yes, the status check includes `graduated` and `dual_import_drafts.grade_choices` is readable.

---

## 2026-10-31 — Whizzer Resume Rating bio editable in the admin

**Migration file:** `docs/migrations/20261031_rating_settings.sql`

**Purpose:** Admins edit the rating's bio on the Whizzer Resume Rating page instead of in code. The bio shows under the rating's table on the boys and girls Regular Season leaderboards, and saving refreshes both.

**Database changes:**
- `rating_settings` (new, key/value), seeded with the current bio under `blurb`.
- Code falls back to `RATING_BLURB` in `src/lib/rating.ts` when the row is missing.

**Tables affected:** `rating_settings`

**APPLIED** — 2026-10-31, Supabase SQL editor

**Reversible?** Yes — `DROP TABLE public.rating_settings;` (the leaderboards fall back to the built-in text)
**Verified?** Yes — 2026-10-31: `rating_settings` holds the `blurb` row, and the server can read it

---

## 2026-10-31 — Microcheck task control: one queue, manual order, missing-data tracking

**Migration file:** `docs/migrations/20261031_microcheck_task_control.sql`

**Purpose:** Microcheck becomes one queue for boys and girls that admins order by hand: no developer needed to reprioritize.

**Database changes:**
- **`microcheck_task_types`** (new): 14 checks, each with:
  - its gender (NULL = shared school data: address, website, social, AD, asked once per school)
  - its place in the order, on/off
  - a "do next" pin and an optional list of schools to limit it to

  Seeded with girls roster grades first. Within a check, schools go A→Z.
- **`microcheck_focus`** (new): single school + check pairs pushed to the front from the Missing Data page.
- **`microcheck_claims`** (new): a task handed out is held 10 minutes for that person, so two people asking at once get different tasks.
- **`microcheck_roster_flags`**: key `(school_id)` → `(school_id, gender)`, so a school can be flagged for each gender.
- **`microcheck_task_priority`** (the old two-row order) is no longer read; left in place.

**Tables affected:** `microcheck_task_types`, `microcheck_focus`, `microcheck_claims`, `microcheck_roster_flags`

**APPLIED** — 2026-10-31, Supabase SQL editor (second run; the first failed on the flags key, which kept its pre-rename name `microdose_roster_flags_pkey`, and rolled back)

**Reversible?** Yes:
- drop the three new tables
- put the flags key back to `(school_id)` (fails if a school is flagged for both genders)
**Verified?** Yes — 2026-10-31:
- 14 checks, girls roster grades first
- two people asking at once got different tasks
- asking again returned your own held task, and skip moved to the next school
- girls roster grades 253 open, girls ties 1

---

## 2026-10-31 — Preseason step: Enter Tournament Schedule

**Migration file:** `docs/migrations/20261031_tournament_schedule_step.sql`

**Purpose:** The tournament schedule (names and dates) is entered by hand each season in the Tournament Registry. The Tournament Checklist now compares imported tournaments against that list, for both sides, not against a 2025-26 boys list typed into the code.

**Database changes:**
- `admin_tasks`: a preseason process step `tournament_schedule` ("Enter Tournament Schedule") for boys and girls, at order 3. Later steps move down one.
- `admin_tool_registry`: `tournament_checklist` back to `both`, side-less path.

**Tables affected:** `admin_tasks`, `admin_tool_registry`

**APPLIED** — 2026-10-31, Supabase SQL editor

**Reversible?** Yes:
- delete the two `tournament_schedule` tasks and move the later steps back up one
- set `tournament_checklist` to `boys`, `/admin/boys/tournament-checklist`
**Verified?** Yes — 2026-10-31: six preseason steps per gender, Enter Tournament Schedule at 3, Roll Over Tournaments at 4; checklist row is both

---

## 2026-10-31 — Rankings get a gender; mixed girls-run rankings removed

**Migration file:** `docs/migrations/20261031_ranking_gender.sql`

**Purpose:** `ranking_published`, `ranking_computed_variants` and `ranking_editorial` had no gender, and boys and girls share season ids. The girls auto-publish loaded every 2025-26 rating with no gender filter (fixed in code 2026-10-30), so its runs from 2026-10-27 to 2026-10-29 published boys and mixed rankings. One example: District 1, 120 lb had 10 boys and 11 girls in one ranking.

**Database changes:**
- **`gender` column** (`M`/`F`, NOT NULL, check constraint) on all three tables, plus season/gender indexes.
- **Before 2026-09-14** (boys 2025-26 locked): the boys publish, tagged `M` (782 published, 783 variants). The editorial row is also `M`.
- **Girls runs:**
  - girls-only rankings tagged `F` (562 published, 562 variants)
  - the other 4,692 published and 4,692 variants deleted
- **Code:** auto-publish, variants, editorial and publish write the gender; archive, history, variants, editorial and the snapshots filter on it.
- **The girls snapshot** read the never-written `team_girls` type; it now reads `team` + `F`.

**Tables affected:** `ranking_published`, `ranking_computed_variants`, `ranking_editorial`

**APPLIED** — 2026-10-31, Supabase SQL editor

**Reversible?** Partly:
- the deleted rows are in `docs/migrations/backups/20261031_ranking_rows_deleted.json.gz`
- the gender columns can be dropped
**Verified?** Yes — 2026-10-31: published 782 boys / 562 girls, computed 783 / 562, editorial boys

---

## 2026-10-30 — Admin boys and girls sides: task and article gender, tool registry addresses

**Migration files:**
- `docs/migrations/20261030_admin_sides_gender_columns.sql` (run before the deploy)
- `docs/migrations/20261030_admin_tool_registry_side_paths.sql`

**Purpose:** The admin now has a boys side (`/admin/boys/...`) and a girls side (`/admin/girls/...`). The address decides the gender. Universal tools (settings, microcheck, chat, finances, build health) stay at `/admin/...`.

**Database changes:**
- **`admin_tasks.gender`** (`M`/`F`, default `M`, check constraint, index):
  - The five existing tasks (preseason process steps) are boys tasks.
  - Girls get a copy of each process step.
  - The unique process-key index is now per dashboard per gender.
- **`articles.gender`** (`M`/`F`, default `M`, check constraint): the table was empty.
- **`admin_tool_registry`**, 26 rows:
  - 11 tools that now have a girls version become `both`.
  - Tools with one row per gender point at their side's address.
  - Tournament Checklist becomes `boys` (no girls reference list yet).
  - The rating's tool label becomes "Whizzer Resume Rating".

**Tables affected:** `admin_tasks`, `articles`, `admin_tool_registry`

**APPLIED** — 2026-10-30, Supabase SQL editor

**Reversible?** Yes:
- registry: `docs/migrations/backups/20261030_admin_tool_registry_paths_before.sql`
- gender columns: drop them, and delete the `gender = 'F'` admin_tasks copies
**Verified?** Yes:
- admin_tasks has 5 boys and 5 girls tasks
- `articles.gender` exists
- 14 registry rows point at a side's address, 31 are `both`
- the rating's tool label reads Whizzer Resume Rating

---

## 2026-10-30 — Dominance average purged

**Migration file:** `docs/migrations/20261030_purge_dominance_average.sql`

**Purpose:** Removes the old per-match dominance average (pins/TFs graded by speed to a max of 9, MD = 2, Dec = 1, losses negative). It predates the Hammer Score rating:
- It was called "Dominance Score" until the March 2026 brand refresh renamed it "Hammer Rating".
- It sat beside the real Hammer Score (`wrestler_hammer_scores`: last 20 matches, tournaments, postseason finish), and the boys leaderboards labeled it "Hammer Score".

The site stopped using it first (commit "Remove the dominance average and the Hammer Champ award"):
- Home and postseason lists.
- State Champions "Hammer" column.
- District, region and state cards.
- Leaderboard Postseason and Analytics tables.
- Team-table fallback.
- Profile career "Hammer" column and the 🔨 Hammer Champ award (top dominance at a district/region/state). The ⚡ Terminator award stays.
- School roster "Hammer" column.

**Database changes:**
- **Dropped:**
  - leaderboards: `lb_dominance`, `lb_p_dominance`, `lb_gp_dominance`
  - pages: `district_dominance`, `region_dominance`, `girls_region_dominance` (both), `state_dominance`
  - the helper `dom_match_score`, dropped only after a check that nothing else used it
- **Rebuilt:**
  - `state_champions` without `dominance_score` (was not in the repo before)
  - `lb_rs_team_stats` without `hammer_sum`

**Tables affected:** none (functions only)

**APPLIED** — 2026-10-30, Supabase SQL editor

**Reversible?** Yes — `docs/migrations/backups/20261030_dominance_functions_before.sql`. `dom_match_score`'s body was not captured, so it would need rewriting from the formula above.
**Verified?** Yes — 2026-10-30:
- 0 functions mention dominance.
- `state_champions` returns 14 boys 2025-26 champions (weight, wrestler, school, seed).
- `lb_rs_team_stats` returns 312 boys / 251 girls schools with no `hammer_sum`.
- Live home, postseason, state and leaderboard pages show no dominance or "Hammer Rating".

---

## 2026-10-30 — Bonus %: one rule for every leaderboard and the school ranks, both genders

**Migration file:** `docs/migrations/20261030_bonus_pct_one_rule.sql`

**Purpose:** Wrestlers with losses kept showing 100% Bonus %. Bonus % was computed separately in six functions, each handling forfeits its own way, and past fixes reached only some of them:
- **Forfeit losses dropped (both genders):** `lb_p_most_bonus` and `lb_gp_most_bonus` left out every forfeit, so a forfeit loss vanished. Examples: Gavin Geleta 5/5, Amari Vann 4/4.
- **Girls postseason board showed "—":** the 2026-08-03 fix only reached boys. `lb_gp_most_bonus` still returned `total_wins`, so the girls page showed "—" on every row.
- **Girls regular season empty:** `lb_rs_individual_stats` and `lb_rs_team_stats` read the boys tables for both genders. The live versions also weren't v10.
- **School-page state ranks broken:** `dual_meet_bonus_ranks` had two overloads. One was ambiguous, and the other read a `gender` column that `in_season_tournaments` doesn't have.

**The rule** now lives in helper functions `bout_no_match`, `bout_is_forfeit` and `bout_is_bonus`:
- **Bonus %:** bonus wins (fall, tech fall, major, incl. "Maj") ÷ matches counted.
- **Matches counted:**
  - every match wrestled
  - forfeit **losses**
  - contested matches that ended early (Inj./Def./DQ), for both wrestlers
- **Not counted:** forfeit **wins**, byes, double forfeits, no contests.
- **Medical forfeits** (M. For., MFFL, MFF; FORF in the postseason) are forfeits.

**Tables affected:** none. Functions only:
- **New:** 3 helpers.
- **Replaced:** `lb_p_most_bonus`, `lb_gp_most_bonus` (return column now `total_matches`), `lb_rs_individual_stats`, `lb_rs_team_stats`.
- **Rebuilt:** `dual_meet_bonus_ranks` (one 4-argument version).

**APPLIED** — 2026-10-30, Supabase SQL editor

**Reversible?** Yes — old definitions are in `docs/migrations/backups/20261030_bonus_functions_before.sql`.
**Verified?** Yes — 2026-10-30:
- **Postseason:** every pool, both genders, 2024-25 and 2025-26: 0 wrestlers at 100% with a counted loss. Geleta and Vann are below 100%.
- **Regular season:** 0 at 100% with a loss (boys 11 at 100%, girls 6).
- **Girls regular season:** 2,092 wrestlers and 251 teams (was 0).
- **School ranks:** return a row for boys and girls.

---

## 2026-10-29 — Girls Roster Grade Import in the admin tool registry

**Migration file:** `docs/migrations/20261029_tool_registry_girls_roster_grade_import.sql`

**Purpose:**
- Adds `roster_grade_import_girls` (`/admin/roster-grade-import-girls`, gender girls). It shows in offseason, preseason and season, because girls 2025-26 is still in season.
- The boys row `roster_grade_import_boys` was added 2026-09-15 in the dashboard. It's **RECONSTRUCTED** in the same file (ON CONFLICT DO NOTHING).

**Tables affected:** `admin_tool_registry` (+1 row)

**APPLIED** — 2026-10-29, service-role script

**Reversible?** Yes — delete the girls row
**Verified?** Yes — row present

---

## 2026-10-29 — Girls program 358 named Roselle

**Migration file:** `docs/migrations/20261029_girls_358_name_roselle.sql`

**Purpose:** The girls-programs cleanup added school 358 to `girls_schools` as "Abraham Clark". The school is Roselle, the same as its boys program; "Abraham Clark" is never used as a name.

**Tables affected:** `girls_schools` (1 display_name)

**APPLIED** — 2026-10-29, service-role script

**Reversible?** Yes
**Verified?** Yes — 358 = Roselle

---

## 2026-10-29 — Girls programs for 2025-26 lined up with the Track rosters

**Migration file:** `docs/migrations/20261029_girls_programs_2025_26_cleanup.sql`

**Purpose:** The Track girls rosters list 255 teams. These changes make our girls programs match:
- **Added as girls programs:** Roselle (358, added as "Abraham Clark" and renamed in the entry above) and East Orange (111). Both have girls duals.
- **Added, then inactive for 2025-26:** Barringer (80) and Penns Grove (310). Neither had a team.
- **Inactive for 2025-26:** Ramapo (17). There's no roster anywhere.
- **Kittatinny (315) moved to Newton/Kittatinny (24):**
  - Kittatinny is inactive for girls 2025-26 and merged into 24.
  - Newton's girls program is marked combined.
  - The 2025-26 girls tournament entries (23) and team-score rows (districts, regions, states) move from 315 to 24.

**Tables affected:** `girls_schools` (+4, 24 is_combined), `inactive_school_seasons` (+4), `tournament_entries` (23 school_id 315→24), `precomputed_team_scores` (3 school_id 315→24)

**APPLIED** — 2026-10-29, Supabase SQL editor

**Reversible?** Yes:
- Set the 23 entries (girls, 2026, now at 24 but originally at 315) and cache rows 1672, 1198 and 1410 back to 315.
- Remove the 4 inactive rows and the 4 girls_schools rows.
- Set 24's is_combined back to false.

**Verified?** Yes — 2026-10-29: 4 inactive rows, Newton combined, 0 girls 2026 entries left at 315, cache rows 1672/1198/1410 on 24

---

## 2026-10-29 — roster_grade_import gets a gender column (girls roster import)

**Migration file:** `docs/migrations/20261029_roster_grade_import_gender.sql`

**Purpose:** Girls 2025-26 Track rosters are going through the Roster Grade Import tool, the same way the boys did in September. The table had no gender, so girls rows for season 2026 would have shared one pool with the 12,225 boys rows. Adds `gender` (M/F, NOT NULL; every existing row set to M) and indexes `(season_id, gender, status)` and `(school_id, gender)`.

Code to go with it:
- The boys routes filter on gender M.
- New girls routes (`/api/admin/roster-grade-import-girls/*`) and page (`/admin/roster-grade-import-girls`).
- New loader: `scripts/load_roster_grade_import.mts`.

**Tables affected:** `roster_grade_import` (+1 column, +1 check, +2 indexes)

**APPLIED** — 2026-10-29, Supabase SQL editor

**Reversible?** Yes — `ALTER TABLE roster_grade_import DROP COLUMN gender;` (after removing girls rows)
**Verified?** Yes — 2026-10-29: M / 2026 / 12225

---

## 2026-10-29 — Daily snapshot reports rebuilt for 2025-26 (boys and girls)

**Migration file:** none (data rebuild) — `scripts/backfill_snapshots.mts <M|F> 2025-26 2026 --apply`

**Purpose:** There was no real day-by-day snapshot history. Girls had no reports at all, and boys had 8 out-of-order test reports from September (one labeled 2026-27, one dated off-season) plus streak state built from them. Rebuilt every day with matches, 12/8/2025 – 3/12/2026, in date order so streaks and season highs accumulate as they would have live:
- **Boys:** 68 reports.
- **Girls:** 74 reports.

The rebuild ran on the fixed snapshot engine:
- Each gender reads only its own log and hammer rows.
- Girls reports include dual results.
- Every query error stops the run instead of saving a partial report.
- Tournaments load by season label, including single-day events.
- Finals (round F) count as champions.
- Speed records ignore placeholder times.
- Girls team stats use real duals only.
- Rankings are taken as of the report date.

**Tables affected:** `snapshot_reports(_girls)`, `snapshot_streak_state(_girls)`, `snapshot_season_highs(_girls)`, `snapshot_team_season_highs(_girls)` — 2025-26 rows replaced

**APPLIED** — 2026-10-29, script

**Reversible?** Yes — the original rows are in `docs/migrations/backups/20261029_snapshot_backfill_boys.json` and `20261029_snapshot_backfill_girls.json` (girls were empty)
**Verified?** Yes — 2026-10-29: boys 68 / girls 74 reports. Season records: fastest pin 0:05 (both), fastest tech 0:35 / 0:45, fastest dual 13:11 / 16:52, longest win streak 32 / 20. Tournament days carry events and champions (boys 12/28: 5 tournaments; girls 12/20: Ron Mazzola, Queen of the East).

---

## 2026-10-29 — Index the hammer match log by day

**Migration file:** `docs/migrations/20261029_match_score_log_date_index.sql`

**Purpose:** Daily snapshots read one day of `wrestler_match_score_log` (season, gender, source, date). Only `(season, gender)` was indexed, so the read scanned the whole season and timed out on busy days (boys 2026-02-14 hit the statement timeout during the snapshot rebuild). Adds `(season, gender, match_source, match_date)`.

**Tables affected:** `wrestler_match_score_log` (+1 index)

**APPLIED** — 2026-10-29, Supabase SQL editor

**Reversible?** Yes — `DROP INDEX idx_wrestler_match_score_log_day`
**Verified?** Yes — 2026-10-29: EXPLAIN shows an Index Scan on `idx_wrestler_match_score_log_day`

---

## 2026-10-28 — Newton/Kittatinny girls playoff duals moved to Newton (24)

**Migration file:** `docs/migrations/20261028_newton_kittatinny_playoffs.sql` (applied with `scripts/apply_newton_kittatinny_playoffs.mts`)

**Purpose:** School alias 577 mapped "Newton/Kittatinny" to 315 (Kittatinny). The girls co-op is school 24, which holds the official 12-5 North record. So its two team playoff duals (02-17) landed on 315 and Newton showed 11-4. Moves both meets and their 24 bouts to 24, and points the alias at 24.

**Tables affected:** `dual_meets_girls` (2), `dual_meet_matches_girls` (24), `school_aliases` (1)

**APPLIED** — 2026-10-28, service-role script

**Reversible?** Yes — backup `docs/migrations/backups/20261028_newton_kittatinny_playoffs.json`
**Verified?** Yes — 2026-10-28: 0 girls meets on 315; Newton counted record 12-5, matching the official record

---

## 2026-10-28 — Girls 2025-26: remaining ties closed as final ties

**Migration file:** `docs/migrations/20261028_girls_close_remaining_ties.sql` (applied with `scripts/apply_girls_close_remaining_ties.mts`)

**Purpose:** Closes 45 of the 46 pending girls ties as final ties. Scores are unchanged; the microcheck tasks are completed.
- **44** are meets the official standings don't count. Their Track tiebreaker is "Team Id" or missing, so no winner can be supported. A boys check showed the lower Team Id won only 1 of 3 officially settled ties.
- **1**, South Brunswick vs WW-P South, is an official tie.

Left pending: Northern Valley-Demarest vs Dwight Morrow (12-23); only one of the two schools has an official record.

**Tables affected:** `dual_meets_girls` (45 updated), `microcheck_tasks` (45 completed)

**APPLIED** — 2026-10-28, service-role script

**Reversible?** Yes — backup `docs/migrations/backups/20261028_girls_close_remaining_ties.json`
**Verified?** Yes — 2026-10-28: 1 pending girls tie, 1 pending girls tie task

---

## 2026-10-28 — Girls 2025-26 team W-L reconciled with the official standings

**Migration file:** `docs/migrations/20261028_girls_wl_reconciliation.sql` (applied with `scripts/apply_girls_wl_reconciliation.mts`)

**Purpose:** Match girls team W-L to the official standings (`power_points`). Each change brings both schools closer to their official record (report: `docs/girls_2025_26_wl_reconciliation.md`). The official records mostly leave out thin meets (0-2 bouts wrestled) and meets between two non-classified schools.
- **180 meets → not counted** (`counts_toward_record = false`); bouts stay on profiles. 44 of these are pending ties and stay pending.
- **5 jamboree pairings → counted.**
- **3 pending ties settled** (Sterling, Mountain Lakes, Clayton/Glassboro). The official record agrees with Track's "Team Id" tiebreaker in each: the lower Team Id wins.

Two proposed winner flips were not applied because the bouts contradict the official record: WW-P South–Robbinsville and Freehold Borough–Colts Neck.

**Tables affected:** `dual_meets_girls` (188 updated), `microcheck_tasks` (3 completed)

**APPLIED** — 2026-10-28, service-role script

**Reversible?** Yes — backup `docs/migrations/backups/20261028_girls_wl_reconciliation.json`
**Verified?** Yes — 2026-10-28: exact official W-L matches 97 → 197 of 274 (North 31/37, South 22/36, non-classified 144/201); 46 girls ties still pending

---

## 2026-10-28 — Fix delete guard on non-school tables

**Migration file:** `docs/migrations/20261028_guard_protected_deletes_fix.sql`

**Purpose:** `guard_protected_delete()` read `OLD.is_nj` on every protected table. PL/pgSQL does not short-circuit the `AND`, so deletes on `matches`, `tournament_entries` and the other non-school tables failed with `record "old" has no field "is_nj"`, even with the deliberate unlock set. Found when the District 15 placeholder removal was run; nothing was deleted. The function now checks the table first and reads `is_nj` via `to_jsonb`. The original test only covered `schools`.

**Tables affected:** function `guard_protected_delete` (replaced)

**APPLIED** — 2026-10-28, Supabase SQL editor

**Reversible?** Yes — re-run the earlier function definition
**Verified?** Yes — 2026-10-28: the District 15 removal then ran through the unlock (7 matches, 7 entries deleted). Unlocked deletes now work on non-school tables.

---

## 2026-10-28 — Kushner Academy wrestlers re-linked (boys dual 2025-12-10)

**Migration file:** `docs/migrations/20261028_kushner_wrestlers_relink.sql` (applied with `scripts/apply_kushner_wrestlers_relink.mts`)

**Purpose:** 9 bouts in Scotch Plains-Fanwood vs Kushner Academy pointed at deleted initials-only Kushner wrestlers; the hammer log's FK exposed them. Matched against Kushner's 2026-01-08 lineup:
- **Re-pointed 5 bouts** to the existing full-name wrestlers: Lankry→Lankary, Strub→Straw, Sher, Rojas, Yarkony→Urcony.
- **Recreated 4 wrestlers** under their original IDs: Lazanowitz, Sperber, Kestler, Weill.

**Tables affected:** `dual_meet_matches` (5 updated), `wrestler_name_aliases` (5 updated), `wrestlers` (+4)

**APPLIED** — 2026-10-28, service-role script

**Reversible?** Yes — backup `docs/migrations/backups/20261028_kushner_wrestlers_relink.json`; rollback in the migration file
**Verified?** Yes — 2026-10-28: all 21 wrestler IDs in the meet exist

---

## 2026-10-28 — Remove the District 15 (2024-25) Forfeit placeholder

**Migration file:** `docs/migrations/20261028_remove_d15_forfeit_placeholder.sql`

**Purpose:** A deleted "Forfeit" placeholder wrestler was still entered 7 times in Boys District 15 (2024-25). Each entry was a QF forfeit to a top seed, i.e. a bye stored as a match. Removes the 7 matches and 7 entries, the same way the other placeholders were removed in `20260413_delete_schools_367_399`. First use of the delete guard's per-transaction unlock.

**Tables affected:** `matches` (−7), `tournament_entries` (−7)

**APPLIED** — 2026-10-28, Supabase SQL editor, after `20261028_guard_protected_deletes_fix.sql`

**Reversible?** Yes — backup `docs/migrations/backups/20261028_remove_d15_forfeit_placeholder.json`
**Verified?** Yes — 2026-10-28: 0 entries and 0 matches remain for the placeholder

---

## 2026-10-26 — Hammer scores: gender on the match log; remove wrong-gender rows

**Migration file:** `docs/migrations/20261026_hammer_log_gender.sql`

**Purpose:** The girls hammer recalculation saved nothing, for two reasons. (1) 2,011 girls held gender 'M' rows in `wrestler_hammer_scores` from a boys run that scored every NJ wrestler in a boys bout regardless of gender. The table allows one row per wrestler per season, so every girls insert batch failed, and the route ignored the error. (2) The route deleted the whole season's `wrestler_match_score_log` before writing, so the girls run wiped the boys log (150,981 rows → 50,844). Adds `wrestler_match_score_log.gender` (filled from `wrestlers`) plus an index, and deletes the wrong-gender hammer rows (backup `docs/migrations/backups/20261026_hammer_wrong_gender_rows.json`). Route fixed the same day: each run scores and sets `main_weight` only for its own gender, deletes only its own log rows, and fails on any write error.

**Tables affected:** `wrestler_match_score_log` (+1 column, +1 index), `wrestler_hammer_scores` (−2,011 rows)

**APPLIED** — 2026-10-26, Supabase SQL editor. The first run failed on `text = gender_type`; it ran after the `::text` casts were added. Boys and girls hammer recalculations to follow.

**Reversible?** Yes — rollback notes in the migration file
**Verified?** Yes — 2026-10-26: 0 log rows without gender, 0 wrong-gender hammer rows. Rebuilt afterward: girls 2025-26 recalculated (2,419 wrestlers, 38,298 log rows). Boys 2025-26 match log rebuilt 2026-10-28 with the route's new `logOnly` mode (138,351 rows; archived boys hammer scores, 7,593 rows calculated 2026-09-12, left untouched). 228 boys rows have no opponent link: bouts against wrestlers whose records were deleted earlier (Kushner Academy 2025-12-10; a removed District 15 Forfeit placeholder).

---

## 2026-10-26 — Guard deletes of postseason data and NJ school / program rows

**Migration file:** `docs/migrations/20261026_guard_protected_deletes.sql`

**Purpose:** Adds a `BEFORE DELETE` trigger, `guard_protected_delete`. It blocks deletes from `tournament_entries`, `matches`, `placements`, `tournaments`, `schools` (NJ schools only; OOS merges still work), `boys_schools` and `girls_schools`, unless the transaction sets `matwhizzer.allow_protected_delete = 'on'`. This stops the 9/17 pattern, where FK errors were cleared by deleting a girls-only school's postseason rows. Checked 2026-10-26 that no app route, RPC or trigger deletes these rows, so no tool is affected.

**Tables affected:** trigger + function on the 7 tables above

**APPLIED** — 2026-10-26, Supabase SQL editor

**Reversible?** Yes — rollback block in the migration file
**Verified?** Yes — 2026-10-26: `guard_protected_delete` present on all 7 tables (boys_schools, girls_schools, matches, placements, schools, tournament_entries, tournaments); test `DELETE FROM schools WHERE id = 381` rejected with "Delete from schools is blocked" (P0001), nothing deleted

---

## 2026-10-26 — Restore Mary Help of Christians Academy (381) and Kayla Coletta

**Migration file:** `docs/migrations/20261026_restore_mary_help_kayla_coletta.sql` (most rows applied with `scripts/restore_mary_help_kayla_coletta.mts`)

**Purpose:** Part B of `20260917_cliffside_ridgefield_s1_fix.sql` deleted school 381 as having no program, and deleted every row referencing it to clear the foreign keys. That erased Kayla Coletta (107) entirely:
- 2025-26 postseason: District 2 runner-up, Region 1 semifinalist, state 8th place.
- 2024-25: North Region 1.
- In season: 17 tournament bouts.
- Mary Help's 1-0 dual (Garfield, 01/15/2026).

Recreates 381 with its girls rows only, at the same ID, with its existing logo. Restores her 4 entries and 13 matches with their original IDs from `source_of_truth_*.csv` (2026-03-21), her 2 placements, the 17 bouts with their original IDs (from the 2026-09-12 hammer log), the dual, the official standings row (non-classified 1-0, 23 PP) and 4 team-score cache rows. Also adds OOS school "William Penn Charter School". The 8 jamboree bouts held out of the Other-events import are now loaded (`docs/migrations/backups/20261026_girls_other_events_import_part2.json`). A check against the 2026-03-21 exports and the 2026-09-12 hammer log found no other data lost to that delete.

**Tables affected:** `schools` (+2), `girls_schools`, `girls_school_profiles`, `girls_school_districts`, `girls_school_regions`, `school_names` (+1 each), `tournament_entries` (+4), `matches` (+13, SQL editor), `placements` (+2), `tournament_bouts_girls` (+17), `dual_meets_girls` (+1 / +8 jamboree), `dual_meet_matches_girls` (+1 / +8), `power_points` (+1), `precomputed_team_scores` (+4), `wrestler_name_aliases` (+2), `wrestlers` (+1 OOS)

**APPLIED** — 2026-10-26: service-role rows by script; the 13 `matches` rows in the Supabase SQL editor (no service-role grant on `matches`)

**Reversible?** Yes — delete by the IDs in `docs/migrations/backups/20261026_restore_mary_help_kayla_coletta.json` (reverse order) and the 13 match IDs in the migration file
**Verified?** Yes — 2026-10-26: verify query returned all 13 matches (7 W, 6 L) across 2024-25 North Region 1 and 2025-26 District 2 / Region 1 / States. Girls hammer recalculation needed afterward.

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

**NOT LIVE** (corrected 2026-11-05) — this entry said "APPLIED — 2026-09-21 via Supabase SQL editor" and "Verified: `team_score_cache_dirty` present". On 2026-11-05 the live database has none of it: no `cron` schema (pg_cron not installed), and no `refresh_boys_team_score_cache`, `refresh_dirty_team_score_caches`, `mark_team_score_cache_dirty`, `team_score_cache_dirty` or `%team_score_dirty%` triggers. It also contradicts the rule that team totals are copied from TrackWrestling. Do not run the migration file. See the 2026-11-05 correction entry.

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

**Correction (2026-10-26):** Item 4 above was wrong. School 381 was not "FK-clear" and had real data. Part B of this migration deleted every row referencing 381, including Kayla Coletta's 2025-26 district, region and state entries, matches and placements, her 2024-25 region entry, and her in-season bouts. The FK errors during the 9/17 run named those rows. Restored by `20261026_restore_mary_help_kayla_coletta.sql`.

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

---

## 2026-11-14 — Pre-2012-13 medals on profiles (no DB change)

**Tables affected:** none (reads `history_finishes`)

**What changed:**
- Profiles whose postseason starts in the first Playoff History season (boys 2012-13) show state places and region titles from the four seasons before, matched from `history_finishes` (njwrestlinghistory.info) by same school + same name (exact, common nickname, or unique initials like BJ → Bryant). `src/lib/preRecordFinishes.ts`, cached 1 hour.
- Those profiles get the note "Postseason data only goes back to 2012-13" (plus the njwrestlinghistory.info credit when earlier medals show).

**Reversible?** Yes — code only
**Verified?** Yes — review preview (Ashnault, Clagon, Trombetta) and deployed to production

---

## 2026-11-14 — Untimed pins/techs set to 6:00; postseason History tabs

**Tables affected:** `matches` (106 rows, `fall_time_seconds`)

**What changed:**
- Kyle: a pin or tech fall with no time counts as 6:00. `scripts/untimed_pins_six_minutes_20261114.mts --apply` set `fall_time_seconds = 360` on the 106 FALL/TF bouts with none (all postseason, 2013-2024 history + girls regions). Backup of ids: `docs/migrations/backups/20261114_untimed_pins.json`. `playoffHistory/load.ts` now does the same on load.
- Tech falls of 0:15 or under aren't honored in Quickest Tech (district/region cards, leaderboards, Daily Challenge explorer, History tab) — one bout today (2025 boys District 31 QF, 0:15).
- Code only: History tab on district/region/state pages (`src/lib/tournamentHistory.ts`, `src/components/site/TournamentHistory.tsx`), weight-page podium history, standard header on bracket pages, Individual Post Season opens on the live season (?season=), wider girls region tiles.

**Reversible?** Yes — null the backed-up ids' `fall_time_seconds`
**Verified?** Yes — 0 untimed left; integrity check unchanged (2 known failures); deployed

---

## 2026-11-14 — Impossible times to 6:00; saint schools named "St."

**Tables affected:** `matches` (19 rows, `fall_time_seconds`), `schools` (16 rows, `display_name`)

**What changed:**
- Kyle: times that can't happen count as 6:00 — 6 tech falls over 6:00 (e.g. 40:08, 10:03) and 13 pins over 8:00 (the longest a match runs). `scripts/impossible_times_six_minutes_20261114.mts --apply`; old times in `docs/migrations/backups/20261114_impossible_times.json`.
- Kyle: every saint school is "St. …" (Saint Rose → St. Rose, St Joseph (Montvale) HS → St. Joseph (Montvale) HS, 16 schools incl. out-of-state). `scripts/saint_names_20261114.mts --apply`; old names in `docs/migrations/backups/20261114_saint_names.json`. New out-of-state schools get the same rule (`src/lib/oosSchool.ts`). School searches treat "st", "st." and "saint" alike, matching at a word's start (`src/lib/saintNames.ts`: header search, admin school search, schools directory, side home).
- Code only: NJ Wrestling History credits link to http://njwrestlinghistory.info (their https certificate is invalid); Daily Challenge "Medal Table" tab.

**Reversible?** Yes — restore from the backups
**Verified?** Yes — integrity check unchanged (2 known failures); snapshot change = the renamed schools only; deployed

---

## 2026-11-14 — Schools directory: last season until the new one starts; boys_/girls_schools saint names + read grant

**Tables affected:** `boys_schools`, `girls_schools` (5 names; SELECT grant)

**What changed:**
- Code: the Schools directory (and side-home school lookup) shows the season before the live one until the live season's "Competition May Begin" date on season_calendar (2026-27: 2026-12-07), via `getDirectorySeason()` in `src/lib/get-season.ts`.
- The directory had been empty for visitors in every season: `school_directory` runs as the visitor and anon has no read on `girls_schools` / `boys_schools` ("permission denied"). Pages now call it with the server key.
- Migration `docs/migrations/20261114_saint_names_gender_tables.sql`: the 5 saint names in boys_/girls_schools → "St. …" (service role can't update these tables) and SELECT grants for anon/authenticated.

**APPLIED** — run in Supabase SQL editor 2026-11-14 (check: 3 boys + 2 girls rows all "St. …"); visitors read school_directory again, so the pages went back to the cached public client

**Reversible?** Yes — see the undo line in the migration
**Verified?** Code deployed; directory lists 310 boys / 234 girls schools for 2025-26. Names pending the migration.

---

## 2026-11-25 — Deleted 2 stray profiles from the Franklin-MA seeds mix-up

**Tables affected:** `wrestlers` (2 rows deleted)

**What changed:**
- On 2026-11-21 the seeds import treated "Franklin-MA" as the year's plain "Franklin" and created second profiles for John Woodall (114) and Jack Sauer (139). Their seeds were pointed back at the original profiles (f54adee4…, 57b329cb…) that day, which left the new ones empty.
- Kyle approved deleting them: a5205384-2f8a-4181-ab76-5c13231ab403 (John Woodall), a271d4b8-71b1-471d-a480-8000c9927125 (Jack Sauer). Before deleting, all 53 wrestler-reference columns from the migrations and the delete script, plus followers, had 0 rows for both. Backup: `docs/migrations/backups/20261125_franklin_ma_stray_profiles_deleted.json`.

**Reversible?** Yes — re-insert from the backup
**Verified?** Yes — integrity check unchanged before/after (the usual 3 items)

---

## 2026-11-28 — Season intake order (tasks) + School Data Review (`boys_track_teams`, `girls_track_teams`)

**Tables affected:** `admin_tasks` (data), new `boys_track_teams` / `girls_track_teams` (migration), and through the review: `school_aliases`, `{side}_school_districts`, `{side}_school_regions`, `schools` / `{side}_schools` (new schools, only when Kyle adds one)

**What changed:**
- Kyle: "roll over roster should be the last step to ending a season, not the first step in starting one." `scripts/season_intake_tasks_20261128.mts`:
  - **Offseason (end of season):** Save the End of Season Report → Roll Over Roster (moved from preseason; this season's completion kept) → Archive the Season.
  - **Preseason:** School Data Review → Complete Transfers → Roster Import → Enter Tournament Schedule → Coaches → Import Schedules Round 1 (11/28) and Round 2 (12/7).
  - **Season:** Import Schedules Round 3 (12/21) and Round 4 (1/10/2027).
  - Boys and girls rows each. Backup: `docs/migrations/backups/20261128_admin_tasks_before_intake_order.json`. Nothing deleted.
- Migration `docs/migrations/20261128_track_teams_review.sql`: one row per TrackWrestling team per season (Track's season team, global team, abbreviation, governing body, leagues; our school; review status). New page `/admin/{side}/school-data-review` (also in the preseason workspace).
  - Confirming a team saves Track's names and abbreviation as `school_aliases` (`track_name` / `abbreviation`, never over an alias naming another school). Track's district or region is written for the season only when Kyle picks "use Track's".
  - Finding (2026-11-28): Track's Teams page still has last season's alignment. Its districts equal our 2025-26 districts for all 47 matched schools on page 1, and our 2026-27 districts for 14. The review shows those grey and leaves ours.

**APPLIED** — run in Supabase SQL editor 2026-11-28 (check: boys_rows 0, girls_rows 0; service role reads both tables)

**Reversible?** Tasks: yes, from the backup. Tables: drop (see the migration). Aliases / district writes: logged in `admin_activity_log` (`track_teams_confirm_{side}`).
**Verified?** Task order read back after the change (table above in the script output). Review dry run on Kyle's page 1 (50 teams): 45 matched by name, 2 by abbreviation, 2 by close spelling (Bishop Eustace has no boys program yet; Chatham/Mendham → our Mendham program), 1 test team.

---

## 2026-11-28 — Roster Import (`boys_season_rosters`, `girls_season_rosters`, `boys_roster_loads`, `girls_roster_loads`)

**Tables affected:** new tables (migration); through the import: `roster_grade_import` (new names stored as Track roster players), `wrestlers.grade` (filled only where empty, or when Kyle picks Track's grade), `{side}_transfers` + `wrestler_name_aliases` (a transfer Kyle confirms)

**What changed:**
- Migration `docs/migrations/20261128_season_rosters.sql`: this season's TrackWrestling rosters, one row per wrestler per school, with the match to our wrestler or stored roster player, the rollover's grade, whether they wrestled varsity last season, and review status. Also each school's loads (round, count, and the expected wrestlers Track didn't list).
- New page `/admin/{side}/roster-import` (also in the preseason workspace). Rules in `src/lib/trackIntake/rosterReview.ts`:
  - **Confirmed automatically:** an exact name expected at the school, with the same grade; a new freshman.
  - **To review:** a close spelling, a grade difference, a girl on a boys roster, a new sophomore to senior, or the same name elsewhere.
  - **Transfers** (Kyle: "this isn't a lock, but should be reviewed"): the same name and grade as a wrestler expected at another school but missing from that school's new roster. Confirming one logs it like the Transfers tool.
- `src/lib/logTransfer.ts`: the Transfers tool's write, moved out of `/api/admin/transfers` so both tools log a transfer the same way. No change in behavior.
- School page (`SchoolProfileCore.tsx` `seasonRoster`): a season's roster also lists that season's confirmed roster wrestlers who wrestled varsity the season before. It shows Track's weight, or else last season's most common one. Before the migration and before any import, it adds nothing.

**APPLIED** — run in Supabase SQL editor 2026-11-28 (check: all four tables 0 rows; service role reads them)

**Reversible?** Tables: drop (see the migration). Grades: `grade_confirmed_source = 'roster_upload'`. Stored players: `import_batch` like `2026-11-28_track_roster_r1`. Transfers: undo in the Transfers tool. Every resolve and dismissal is in `admin_activity_log` (`season_roster_*`).
**Verified?** Dry run on Kyle's boys file (58 schools, 2,079 wrestlers; nothing written), about 9 seconds:
- 911 matched to our wrestlers and 447 to stored players.
- 417 new freshmen.
- 314 to review (285 new sophomores to seniors).
- 904 to show on school pages.

Site snapshot unchanged before the deploy.
