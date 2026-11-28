// TrackWrestling's season "Teams" page (Kyle 2026-11-28: the school list with names, abbreviations and leagues, "which
// should just be confirmation of the district region info we have for the new season"). Step 1 of the preseason
// intake: each Track team is matched to our school, and its district / region checked against ours.
//
// The page, saved as RTF (or copied as text), is one table: Season Team | Global Team | Abbr | Gov. Body | Leagues |
// Lock Admins. Read with rtfToText each row is one line, cells split by tabs (empty cells stay in place). Track pages
// the list 50 at a time ("Show: 50 1 - 50 of 322"), so a file may hold several pages, or only the first.
//   Season Team: this season's name (a co-op's joint name: "Clayton/Glassboro, NJ")
//   Global Team: the program's standing name ("Clayton, NJ")
//   Leagues:     "NJ District 31, NJ District 31, NJ Region 8, NJ Region 8, Shore Conference" (repeats are normal)

export type TrackTeam = {
  seasonName: string      // without the ", NJ" state tag
  globalName: string
  state: string           // 'NJ', 'PA', …
  abbr: string
  govBody: string
  leagues: string[]       // distinct, in order
  districts: number[]     // distinct "NJ District N"
  regions: number[]       // distinct "NJ Region N"
  others: string[]        // the other leagues (conferences, "Essex County", …)
}

export type TrackTeamsFile = { teams: TrackTeam[]; total: number | null; pages: number }

const STATE = /^(.*?),\s*([A-Z]{2})$/
const splitState = (s: string) => { const m = STATE.exec(s.trim()); return m ? { name: m[1].trim(), state: m[2] } : { name: s.trim(), state: '' } }

/** the Teams page text (rtfToText of the saved file, or a copy) → its teams */
export function readTrackTeams(text: string): TrackTeamsFile {
  const teams: TrackTeam[] = []
  const seen = new Set<string>()
  let total: number | null = null, pages = 0
  for (const line of text.split(/\r?\n/)) {
    const show = /of\s+(\d+)\s*$/.exec(line.trim())
    if (/^Show:/i.test(line.trim()) && show) { total = Number(show[1]); pages++; continue }
    const cells = line.split('\t').map(c => c.trim())
    while (cells.length && cells[0] === '') cells.shift()
    while (cells.length && cells[cells.length - 1] === '') cells.pop()
    if (cells.length < 4 || cells[0] === 'Season Team') continue
    if (!STATE.test(cells[0]) || !STATE.test(cells[1])) continue
    const s = splitState(cells[0]), g = splitState(cells[1])
    const leagues = [...new Set((cells[4] ?? '').split(',').map(x => x.trim()).filter(Boolean))]
    const num = (re: RegExp) => [...new Set(leagues.map(l => re.exec(l)?.[1]).filter((x): x is string => !!x).map(Number))]
    const key = `${cells[0]}|${cells[1]}`
    if (seen.has(key)) continue                     // the same page saved twice
    seen.add(key)
    teams.push({
      seasonName: s.name, globalName: g.name, state: s.state, abbr: cells[2] ?? '', govBody: cells[3] ?? '',
      leagues, districts: num(/^NJ District (\d+)$/i), regions: num(/^NJ Region (\d+)$/i),
      others: leagues.filter(l => !/^NJ (District|Region) \d+$/i.test(l)),
    })
  }
  return { teams, total, pages }
}

/** a team Track keeps for testing, not a school */
export const isTestTeam = (t: TrackTeam) => /\btest\b/i.test(t.seasonName) || /\btest\b/i.test(t.globalName)

/** loose form of a school name for matching: case, punctuation, "High School"/"H.S."/"Regional"/"Township" dropped */
export function looseName(s: string): string {
  return s.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bh\.?\s?s\.?(?=\s|$)/g, ' ').replace(/\bhigh school\b/g, ' ')
    .replace(/\bregional\b|\breg\.?(?=\s|$)/g, ' ').replace(/\btownship\b|\btwp\.?(?=\s|$)/g, ' ')
    .replace(/\bprep(aratory)?\b|\bschool\b/g, ' ')
    .replace(/\bsaint\b/g, 'st').replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ').trim()
}
