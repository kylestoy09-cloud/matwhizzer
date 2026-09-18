// Parser for MS tournament placement results text.
// Handles TrackWrestling bracket/podium exports and common manual formats.
// Returns only placements (places 1–8) — does not parse bout-level data.

export type ParsedPlacement = {
  weight_class: number
  place: number
  wrestler_name: string
  school_name: string | null
}

export type ParseResult = {
  placements: ParsedPlacement[]
  warnings: string[]
}

// Weight class header: "106 lbs", "106", "106 lb", "106 Lbs Results", "Wt: 106"
const WEIGHT_HEADER_RE = /^(?:wt\.?\s*:?\s*)?(\d{2,3})\s*(?:lbs?|pounds?)?\s*(?:results?|weight)?\s*$/i

// Place number at line start:
//   "1st Place - ..."  "2nd - ..."  "1. ..."  "1 ..."
//   "Place 1: ..."  "Place 1 - ..."
//   "Champion: ..."  "Runner.?Up: ..."
const ORDINAL_START_RE   = /^(\d+)(?:st|nd|rd|th)?\.?\s+(?:place\s*)?[-–:]?\s*/i
const PLACE_PREFIX_RE    = /^place\s+(\d+)\s*[-–:]\s*/i
const CHAMPION_RE        = /^champion\s*[-–:]?\s*/i
const RUNNER_UP_RE       = /^runner[-.\s]?up\s*[-–:]?\s*/i

// Lines that indicate we've left the placement block for a weight
const SKIP_RE = /^(?:bracket|results?|consolation|championship|round|bout|match|bye)\b/i

function parsePlaceLine(line: string): { place: number; wrestler_name: string; school_name: string | null } | null {
  const t = line.trim()
  if (!t) return null

  let place: number | null = null
  let rest = t

  if (CHAMPION_RE.test(t)) {
    place = 1
    rest = t.replace(CHAMPION_RE, '')
  } else if (RUNNER_UP_RE.test(t)) {
    place = 2
    rest = t.replace(RUNNER_UP_RE, '')
  } else if (PLACE_PREFIX_RE.test(t)) {
    const m = t.match(PLACE_PREFIX_RE)!
    place = parseInt(m[1], 10)
    rest = t.slice(m[0].length)
  } else if (ORDINAL_START_RE.test(t)) {
    const m = t.match(ORDINAL_START_RE)!
    place = parseInt(m[1], 10)
    rest = t.slice(m[0].length)
  }

  if (place === null || place < 1 || place > 8) return null

  rest = rest.trim()
  if (!rest) return null

  // Name/school extraction ---------------------------------------------------
  // "(School Name)" at end
  const parenMatch = rest.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (parenMatch) {
    return { place, wrestler_name: parenMatch[1].trim(), school_name: parenMatch[2].trim() }
  }

  // "Name, School" — first comma separates name from school
  const commaIdx = rest.indexOf(',')
  if (commaIdx > 1 && commaIdx < rest.length - 1) {
    const name   = rest.slice(0, commaIdx).trim()
    const school = rest.slice(commaIdx + 1).trim()
    // Sanity: name should look like a person (2+ chars, no pure digits)
    if (name.length >= 2 && !/^\d+$/.test(name)) {
      return { place, wrestler_name: name, school_name: school || null }
    }
  }

  // Fallback: whole rest is just the name
  if (rest.length >= 2) {
    return { place, wrestler_name: rest, school_name: null }
  }

  return null
}

export function parseMsResults(text: string): ParseResult {
  const lines = text.split('\n')
  const placements: ParsedPlacement[] = []
  const warnings: string[] = []

  let currentWeight: number | null = null
  const seenKeys = new Set<string>() // deduplicate weight+place combos

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i]
    const trimmed = raw.trim()
    if (!trimmed) continue

    // Weight class header?
    const weightMatch = trimmed.match(WEIGHT_HEADER_RE)
    if (weightMatch) {
      const w = parseInt(weightMatch[1], 10)
      if (w >= 50 && w <= 400) {
        currentWeight = w
      }
      continue
    }

    // Skip section noise
    if (SKIP_RE.test(trimmed)) continue

    // Try to parse as a placement line
    if (currentWeight !== null) {
      const parsed = parsePlaceLine(trimmed)
      if (parsed) {
        const key = `${currentWeight}|${parsed.place}`
        if (seenKeys.has(key)) {
          warnings.push(`Duplicate ${currentWeight} lbs ${parsed.place}${['st','nd','rd'][parsed.place-1]??'th'} place — skipped: "${parsed.wrestler_name}"`)
        } else {
          seenKeys.add(key)
          placements.push({ weight_class: currentWeight, ...parsed })
        }
      }
    }
  }

  // Sort: weight asc, place asc
  placements.sort((a, b) => a.weight_class - b.weight_class || a.place - b.place)

  return { placements, warnings }
}
