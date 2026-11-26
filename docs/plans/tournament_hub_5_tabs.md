# Tournament Hub — 5 tabs (PLAN, for Kyle's approval before any page changes)

Drafted 2026-11-26. Decisions it follows: Kyle 2026-11-25 (one Tournament Hub, 5 tabs: In-season tournaments · Team
postseason · District · Region · State; every event follows load bracket → load results → close out;
docs/workflows/bracket_intake.md).

## What exists today (reviewed 2026-11-26)

| Today | Where (flyout) | What it does |
|---|---|---|
| Tournament Hub (`/tournament-hub`) | Dashboards › Season Hubs | Tabs *Tournaments* (this season) and *History* (2013+ history grid + review). Per-tournament page with tabs overview · schools · seeds · bracket · scores · winners |
| Postseason (`/postseason`) | Dashboards › Season | Counts: playoff duals done, postseason tournaments by level |
| Team Playoffs (`/team-playoffs`) + Playoff Seeds (`/playoff-seeds`) | Postseason Hubs | Team dual playoff groups, seeds by power points (North I/II, Central, South, NP-A/B), brackets % |
| Districts (`/districts`, `/districts/[id]`) + District Verifier | Postseason Hubs | Each district's placers and status; verifier checks the district's schools and **school abbreviation aliases** |
| District Pre-Seed (`/district-preseed`) | — | Pre-seed calculator per district |
| Regions (`/region-seeds`, `/region-seeds/[id]`) | Postseason Hubs | Each region's placers and seeds |
| States (`/states-hub`) | Postseason Hubs | A stub: pills show "—" |
| Team Scores (`/team-scores`) | Tools | Paste TrackWrestling team standings (official totals) |
| Post-Season Bracket (`/bracket`) | Tools | Hand-built bracket slots (filled for one tournament, half-way) |
| Playoff History Review (`/playoff-history`) | Tools › Admin | Past postseasons 2013–2024 (boys), 2019–2024 (girls) |

## The new hub

`/admin/{boys|girls}/tournament-hub?tab=…` — one flyout entry replaces Postseason Hubs' four.

| Tab | List shows | Opening an event shows |
|---|---|---|
| **In-season tournaments** | This season's tournaments (registry slate: Active / New / Not set up), status per event | The 3 steps (below) + today's per-tournament tabs that still matter (schools, scores, winners). Pool-play events (Burlington-style) get per-pool draws |
| **Team postseason** | Groups/sections with seeds % and brackets % (today's Team Playoffs) | Playoff Seeds (power-points seeding) and the group's dual bracket — not the 3 steps (duals, not individual brackets) |
| **District** | 32 boys / 12 girls districts, status per district | The 3 steps; District Pre-Seed calculator and School Verifier as tools on the page |
| **Region** | 8 boys / 4 girls regions, status | The 3 steps; district placers feeding in (qualifier check) |
| **State** | One event per side | The 3 steps; region placers feeding in |

Every tab keeps a **History** switch (today's History tab and Playoff History Review), so past seasons live beside
the current one.

**Status per event** (the list's columns): Bracket loaded · Results in · Needs review · Closed — the same four
everywhere, so the Postseason dashboard can just count them.

## The 3 steps on an event page

1. **Load bracket** — drop the tournament's PDF (Flo; Track as backup); the page asks for a weight's pasted text only
   if it couldn't read it. Shows each weight's bracket as it will look on the site and the short list to settle
   (unmatched name, wrong line count, entrant who doesn't belong), each beside its zoomed PDF section. Approve.
2. **Load results** — drop the CSV. If every bout fits the bracket, it's saved. If not, the page asks for the
   completed-brackets PDF and shows each problem beside its section. No skip.
3. **Close out** — missing bouts by place on the bracket; team standings pasted (today's Team Scores tool moves
   here); Close out (blocked while anything is open).

## What goes away

- **Post-Season Bracket** (`/bracket`, hand-built slots) — replaced by Load bracket.
- **States hub stub** — replaced by the State tab.
- **Postseason Hubs** flyout group — replaced by the one Tournament Hub entry (AdminIconRail.tsx is hardcoded).
- Redirects from the old URLs to the new tabs, so bookmarks keep working.

## Under the hood (implementation notes)

- One write layer for both data models: postseason lives in `tournaments` / `tournament_entries` / `matches`;
  in-season in `in_season_tournaments{,_girls}` / `tournament_bouts{,_girls}` / `in_season_tournament_seeds`.
  The draw goes to `tournament_entries.bracket_position` (postseason) and a new position column for in-season
  entries (migration + changelog + grants).
- School codes: Kyle's Flo code → school list loads into the existing abbreviation aliases (the District
  Verifier already manages these), so one place owns codes.
- Bracket drawing reads the stored draw first (`src/lib/postseasonBracket.ts`), seed slots / bout tree only for
  seasons without one.

## Decisions for Kyle

1. Does **Team postseason** keep its own layout (groups, seeds, dual brackets) rather than the 3 steps? (Recommended.)
2. Should the **Postseason** dashboard (Dashboards › Season) stay as a one-page summary that counts the hub's statuses?
3. **History**: a switch inside each tab (recommended), or one History tab across all levels as today?
4. OK to retire the hand-built **Post-Season Bracket** tool once Load bracket works?
