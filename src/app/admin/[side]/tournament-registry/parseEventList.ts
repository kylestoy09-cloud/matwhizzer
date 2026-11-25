export type ParsedEvent = {
  name: string
  date_start: string | null   // YYYY-MM-DD
  date_end: string | null     // YYYY-MM-DD
  state: string
  event_type: 'tournament' | 'jamboree'
  gender: 'M' | 'F' | 'both'
  season: string
}

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

// season from a date: Dec 2025 → '2025-26', Jan 2026 → '2025-26'
function seasonFromDate(month: number, year: number): string {
  if (month >= 9) return `${year}-${String(year + 1).slice(2)}`
  return `${year - 1}-${String(year).slice(2)}`
}

export function parseEventList(
  text: string,
  defaultGender: 'M' | 'F' | 'both' = 'F',
): ParsedEvent[] {
  const lines = text.split('\n').map(l => l.trim())
  const events: ParsedEvent[] = []
  // Boys have no jamborees (Kyle 2026-11-16): every boys event is a tournament
  const jamborees = defaultGender !== 'M'

  let currentType: 'tournament' | 'jamboree' = 'tournament'
  let currentYear = new Date().getFullYear()
  let seasonStart: number | null = null   // the season's first year, from the dated lines so far

  for (const raw of lines) {
    // Strip leading bullet chars
    const line = raw.replace(/^[•\-–—*]\s*/, '').trim()
    if (!line) continue

    // Section type detection
    const lower = line.toLowerCase()
    if (/^tournament/i.test(line) && !line.includes('—')) { currentType = 'tournament'; continue }
    if (/^jamboree|^jam\b/i.test(line) && !line.includes('—')) { currentType = 'jamboree'; continue }

    // Month/year header: "December 2025"
    const monthMatch = lower.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})$/)
    if (monthMatch) {
      currentYear = parseInt(monthMatch[2], 10)
      seasonStart = MONTH_MAP[monthMatch[1]] >= 8 ? currentYear : currentYear - 1
      continue
    }

    // Tournament results header: "Name - MM/DD/YYYY" (no school parens, ends with a date)
    // This lets admins paste results text directly instead of a schedule list.
    const resultsHeaderMatch = !line.includes('(') && line.match(/^(.+?) - (\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/)
    if (resultsHeaderMatch) {
      const name = resultsHeaderMatch[1].trim()
      if (name.length >= 3) {
        const mm = parseInt(resultsHeaderMatch[2], 10)
        const dd = parseInt(resultsHeaderMatch[3], 10)
        const yrRaw = resultsHeaderMatch[4]
        let eventYear = currentYear
        if (yrRaw) eventYear = yrRaw.length === 2 ? 2000 + parseInt(yrRaw, 10) : parseInt(yrRaw, 10)
        const date_start = `${eventYear}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
        const season = seasonFromDate(mm, eventYear)
        const nameIsJamboree = /jamb|jam\b/i.test(name)
        const event_type = jamborees && (currentType === 'jamboree' || nameIsJamboree) ? 'jamboree' : 'tournament'
        events.push({ name, date_start, date_end: null, state: 'NJ', event_type, gender: defaultGender, season })
        continue
      }
    }

    // Event line, with or without years on either date (Kyle 2026-11-16: "12/11 - 12/12/2026 - Ironman 2026, OH"):
    //   "12/12 — Name, ST"  "12/12/2026 - Name, ST"  "12/11-12/13 — Name, ST"  "12/11 - 12/12/2026 - Name, ST"
    const eventMatch = line.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d+))?(?:\s*[–—-]\s*(\d{1,2})\/(\d{1,2})(?:\/(\d+))?)?\s*[–—-]+\s*(.+?),\s*([A-Za-z]{2})\s*$/)
    if (!eventMatch) continue

    const [, sM, sD, sY, eM, eD, eY, name, state] = eventMatch
    const year = (y: string | undefined) => (y?.length === 4 ? parseInt(y, 10) : y?.length === 2 ? 2000 + parseInt(y, 10) : null)   // a typo like "202" counts as no year
    const startM = parseInt(sM, 10)
    const endM = eM ? parseInt(eM, 10) : null
    let endYear = year(eY)
    let startYear = year(sY)
    if (startYear == null && endYear != null && endM != null) startYear = startM > endM ? endYear - 1 : endYear   // Dec 30 – Jan 2
    // no year on the line: the season of the lines before it (Aug–Dec = its first year, Jan–Jul = its second)
    if (startYear == null) startYear = seasonStart != null ? (startM >= 8 ? seasonStart : seasonStart + 1) : currentYear
    if (endM != null && endYear == null) endYear = endM < startM ? startYear + 1 : startYear
    if (seasonStart == null || year(sY) != null || year(eY) != null) seasonStart = startM >= 8 ? startYear : startYear - 1

    const date_start = `${startYear}-${String(startM).padStart(2, '0')}-${sD.padStart(2, '0')}`
    const date_end = endM != null ? `${endYear}-${String(endM).padStart(2, '0')}-${eD.padStart(2, '0')}` : null
    const season = seasonFromDate(startM, startYear)

    // Auto-detect jamborees from name if section label is ambiguous
    const nameIsJamboree = /jamb|jam\b/i.test(name)
    const event_type = jamborees && (currentType === 'jamboree' || nameIsJamboree) ? 'jamboree' : 'tournament'

    events.push({ name: name.trim(), date_start, date_end, state: state.toUpperCase(), event_type, gender: defaultGender, season })
  }

  return events
}
