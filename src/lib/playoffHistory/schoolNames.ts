// Playoff History: the exports' team names → our schools. The names are typed by each tournament's staff, so the
// same school comes in many spellings ("No. Valley (Old Tappan", "Christian Bros. Acad.", "JFK Memorial - Islen").
// Abbreviations are expanded, then the shared matcher (src/lib/historySchools.ts) is tried on each spelling. A name
// it can't place goes to Kyle in the Playoff History Review tool, with a suggestion when one school is close.
import type { SchoolMatcher } from '@/lib/historySchools'
import { isPlaceholderTeam } from './brackets'

const EXPAND: [RegExp, string][] = [
  [/\bNo\.\s*/gi, 'North '], [/\bSo\.\s*/gi, 'South '], [/\bW\.\s*/gi, 'West '], [/\bE\.\s*/gi, 'East '],
  [/\bBros\.?(?=\s|$)/gi, 'Brothers'], [/\bAcad\.?(?=\s|$)/gi, 'Academy'], [/\bMem\.+(?=\s|$)/gi, 'Memorial'], [/\bHg?h?ts?\.?(?=[\s/]|$)/gi, 'Heights'],
  [/\bSt\.?\s*Joe\b/gi, 'St. Joseph'], [/\bJ\.?\s*F\.?\s*K(\.|ennedy)?/gi, 'John F. Kennedy'], [/\bMsgr\.?\s*/gi, ''], [/\bCo\.?\s*Tech( Voc\.?)?/gi, 'County Tech'],
  [/\bTwp\.?(?=\s|$)/gi, 'Township'], [/\bReg\.?(?=\s|$)/gi, 'Regional'], [/\bPrep\.(?=\s|$)/gi, 'Prep'], [/\bHigh School\b/gi, ''],
]
const TYPOS: [RegExp, string][] = [
  [/Bridewater/i, 'Bridgewater'], [/Willingboto/i, 'Willingboro'], [/Lindewold/i, 'Lindenwold'], [/Keansbug/i, 'Keansburg'], [/Mahawh/i, 'Mahwah'],
  [/Mancester/i, 'Manchester'], [/Nothern/i, 'Northern'], [/Millford/i, 'Milford'], [/Pleasan\b/i, 'Pleasant'], [/Weehawhen|Weekhawken/i, 'Weehawken'],
  [/Westhampton|Westamption/i, 'Westampton'], [/Hasbrouk/i, 'Hasbrouck'], [/Islen/i, 'Iselin'],
]
// whole-name equivalences, checked against the schools table (2026-11-13): the two JFKs, the county tech, …
const RENAME: [RegExp, string][] = [
  [/^.*(kennedy|jfk|j\.?\s*f\.?\s*k).*iselin.*$/i, 'Iselin Kennedy'], [/^(j\.?\s*f\.?\s*kennedy|jfk)\.?$/i, 'JFK (which?)'], [/^.*(kennedy|jfk|j\.?\s*f\.?\s*k).*paterson.*$/i, 'John F. Kennedy'],
  [/^passaic\s+co(unty)?\.?\s*(tech|vo).*$/i, 'Passaic Tech'], [/^arthur\s+(p\.?\s+)?schalick$/i, 'Schalick'], [/^haddonfield\s+mem/i, 'Haddonfield'],
  [/^w(est|\.)?\s*winds?(or)?-?\s*plains(boro)?\s*(north|south)$/i, 'West Windsor-Plainsboro $4'], [/^no\.?\s*burlington$/i, 'Northern Burlington'],
  [/^no\.?\s*highlands$/i, 'Northern Highlands'], [/^so\.?\s*regional$/i, 'Southern Regional'],
  [/^(no\.?|north(ern)?)\s*valley\W*(at\s+)?old tappan\W*$/i, 'Old Tappan'], [/^(no\.?|north(ern)?)\s*valley\W*(at\s+)?demarest\W*$/i, 'Demarest'],
  [/^bishop eustace( prep( school)?)?$/i, 'Bishop Eustace'], [/^christ the king prep\.?$/i, 'Christ the King Prep'], [/^triton( regional)?$/i, 'Triton'],
  [/^(saint|st\.?) rose$/i, 'St. Rose'], [/^queen of peace$/i, 'Queen of Peace'], [/^west side( \(newark\))?$/i, 'West Side'],
]

export function spellings(raw: string): string[] {
  let x = raw.trim().replace(/\s+/g, ' ').replace(/\.\.+/g, '.')
  for (const [re, to] of TYPOS) x = x.replace(re, to)
  for (const [re, to] of RENAME) if (re.test(x)) x = x.replace(re, to)
  const expanded = EXPAND.reduce((s, [re, to]) => s.replace(re, to), x).replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim()
  // "Northern Valley (Old Tappan" → also "Northern Valley Old Tappan"; a co-op "A/B" → also its host "A"
  const noParen = expanded.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
  const host = expanded.split(/\s*\/\s*/)[0]
  const dashFirst = expanded.split(' - ')[0]
  return [...new Set([raw.trim(), x, expanded, noParen, dashFirst, host].filter(Boolean))]
}

export type SchoolPick = { school_id: number | null; decision: 'auto' | 'placeholder' | 'pending'; suggestion: number | null; coop: boolean; via: string | null }

export function pickSchool(raw: string, m: SchoolMatcher): SchoolPick {
  if (!raw.trim() || isPlaceholderTeam(raw)) return { school_id: null, decision: 'placeholder', suggestion: null, coop: false, via: null }
  const coop = raw.includes('/')
  const forms = spellings(raw)
  // a co-op name is decided by Kyle (its host + the season's name): only a suggestion
  for (const f of coop ? [] : forms) { const id = m.idOfStrict(f); if (id != null) return { school_id: id, decision: 'auto', suggestion: null, coop, via: f } }
  for (const f of forms) { const id = m.idOf(f); if (id != null) return { school_id: null, decision: 'pending', suggestion: id, coop, via: f } }
  return { school_id: null, decision: 'pending', suggestion: null, coop, via: null }
}
