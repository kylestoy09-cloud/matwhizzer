// Places the NCAA files don't give, filled in by Kyle (2026-11-17). The import applies these after reading a year's
// files: a place left empty gets this wrestler (added as an entrant too if the bracket page didn't yield him).
// Keyed by level, then season year (the championship year), then weight.
import type { NcaaParse } from '@/lib/ncaa/parse'

type Fix = { place: number; name: string; school: string }
export const NCAA_PLACE_FIXES: Record<string, Record<number, Record<number, Fix[]>>> = {
  'NCAA DI': {
    // the 2016 printout leaves the name blank ("(3-1 sv-1)"); its consolation page: "Seventh Place: Joseph Ward, North Carolina 3-1 SV-1"
    2016: { 141: [{ place: 7, name: 'Joseph Ward', school: 'North Carolina' }] },
    // lost the 5th place bout to Myles Martin (OHST) 10-6
    2017: { 184: [{ place: 6, name: 'Nolan Boyd', school: 'OKST' }] },
    // Pletcher lost the 3rd place bout to Tariq Wilson (NCST) MD 17-8; Delvecchio lost the 5th to Kaid Brock (OKST) MD 10-1
    2018: { 133: [{ place: 4, name: 'Luke Pletcher', school: 'OHST' }, { place: 6, name: 'Scott Delvecchio', school: 'RUT' }] },
  },
  'NCAA DIII': {
    // the 7th place bout's winner isn't read: Powell (THIE) d. Schulte (WSP) Dec 4-3
    2013: { 165: [{ place: 7, name: 'Jordan Powell', school: 'THIE' }] },
  },
}

/** Fill a parsed year's empty places from NCAA_PLACE_FIXES */
export function applyPlaceFixes(level: string, year: number, parsed: NcaaParse): NcaaParse {
  const fixes = NCAA_PLACE_FIXES[level]?.[year]
  if (!fixes) return parsed
  for (const w of parsed.weights) {
    for (const f of fixes[w.weight] ?? []) {
      if (w.placers.some(p => p.place === f.place)) continue
      const e = w.entrants.find(x => x.name.toLowerCase() === f.name.toLowerCase() && x.school === f.school)
      if (!e) w.entrants.push({ name: f.name, school: f.school, seed: null, record: null })
      w.placers.push({ place: f.place, name: f.name, school: f.school, seed: e?.seed ?? null })
      w.placers.sort((a, b) => a.place - b.place)
      w.problems = w.problems.filter(p => !p.startsWith(`${w.weight}: no ${f.place}`))
    }
  }
  return parsed
}
