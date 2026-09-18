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

// "12/12" + year → "2025-12-12"
function toIso(mmdd: string, year: number): string {
  const [m, d] = mmdd.split('/').map(Number)
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
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

  let currentType: 'tournament' | 'jamboree' = 'tournament'
  let currentYear = new Date().getFullYear()
  let currentMonth = 1

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
      currentMonth = MONTH_MAP[monthMatch[1]]
      currentYear = parseInt(monthMatch[2], 10)
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
        const event_type = currentType === 'jamboree' || nameIsJamboree ? 'jamboree' : 'tournament'
        events.push({ name, date_start, date_end: null, state: 'NJ', event_type, gender: defaultGender, season })
        continue
      }
    }

    // Event line: "12/12 — Name, State" or "12/12–12/13 — Name, State"
    const eventMatch = line.match(/^(\d{1,2}\/\d{1,2})(?:[–\-](\d{1,2}\/\d{1,2}))?\s*[—\-]+\s*(.+),\s*([A-Z]{2})\s*$/)
    if (!eventMatch) continue

    const [, startMD, endMD, name, state] = eventMatch
    const date_start = toIso(startMD, currentYear)
    // For multi-day events spanning year boundary (e.g. Dec→Jan), treat end as next year if month rolls back
    let endYear = currentYear
    if (endMD) {
      const [endM] = endMD.split('/').map(Number)
      if (endM < currentMonth) endYear = currentYear + 1
    }
    const date_end = endMD ? toIso(endMD, endYear) : null
    const season = seasonFromDate(currentMonth, currentYear)

    // Auto-detect jamborees from name if section label is ambiguous
    const nameIsJamboree = /jamb|jam\b/i.test(name)
    const event_type = currentType === 'jamboree' || nameIsJamboree ? 'jamboree' : 'tournament'

    events.push({ name: name.trim(), date_start, date_end, state, event_type, gender: defaultGender, season })
  }

  return events
}
