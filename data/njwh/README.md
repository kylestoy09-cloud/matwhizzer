# NJ wrestling history (boys) — for the trivia game

**Source: NJ Wrestling History, njwrestlinghistory.info** (compiled by its owner, contact on the
site: DESPO424@gmail.com). Credit it wherever this data is shown.

Fetched 2026-11-02 (73 pages, one request every 2 s; robots.txt allows them). The pages as
fetched are in `raw_pages_2026-11-02.tar.gz`; `scripts/njwh/parse_njwh.py` rebuilds every
file here from them: `tar -xzf raw_pages_2026-11-02.tar.gz -C /tmp && python3 scripts/njwh/parse_njwh.py /tmp/raw`

| File | Rows | What |
|---|---|---|
| state_medalists.json | 6,282 | every state placer 1938–2026 (`tie` = old tied places, e.g. "3rd/4th") |
| state_champions.json | 1,142 | state champions 1934–2026 |
| region_champions.json | 6,365 | region champions, regions 1–8, 1961–2026 (`note` = 2021 Super Region) |
| group_champions.json | 275 | team group champions and runners-up |
| sectional_champions.json | 948 | team sectional champions |

**Known gaps and quirks** (handled in the parser; see its output):
- Medal lists start in 1938 (the site has none for 1934–37). The site heads its 1961 medalists "1960"; the parser relabels that block because its winners are the 1961 state champions (12 of 12).
- 2021 (COVID): regions wrestled as four Super Regions; both regions of a Super Region list the same champions — count each Super Region once.
- The site's own typos are fixed where unambiguous (missing brackets, "201 4", a missing Hwt label in Region 4 1984). Region 4 2005 lists two 135 champions; both kept.
- `corrections.json`: 6 fixes from MatWhizzer's own 2025-26 brackets (schools blank or names misspelled on the site), each with its source; corrected rows carry `corrected_from`.
- Checked against MatWhizzer's 2025-26 postseason: 123 of 126 champions matched before the corrections; the other 3 were the site's typos/blanks above.
- Names in old years are often initials ("R. Low"); the champions page sometimes spells them differently from the medal pages (40 cases) — prefer state_champions.json for champions.
