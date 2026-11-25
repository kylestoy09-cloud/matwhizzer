// What each award pill means, said in full (Kyle 2026-11-19: "when you hover over them it should act like the ghost
// champ and tell you what that is if you can't tell") — the text for IconHint on the profile's medal case and the
// college page's year-by-year awards.
import type { BadgeKind } from '@/lib/offseasonBadges'

const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? 'th'}`
const finish = (place: number, what: string) => (place === 1 ? `${what} champion` : `${ord(place)} place at ${what}`)
/** "2025–26" from an end-year season key */
export const seasonText = (season: number) => `${season - 1}–${String(season).slice(2)}`

/** A district / region / State finish: "District 5 champion, 2025–26", "3rd place at the State Championships, 2024–25" */
export function placementHint(place: number, level: 'district' | 'region' | 'state', num: number | null, season: number): string {
  const text = level === 'state'
    ? (place === 1 ? 'NJSIAA State champion' : `${ord(place)} place at the NJSIAA State Championships`)
    : finish(place, level === 'region' ? `Region ${num}` : `District ${num}`)
  return `${text}, ${seasonText(season)}`
}

/** Any other tournament with place bouts: "3rd place at the Escape the Rock Tournament, 2025–26" */
export const tournamentPlaceHint = (place: number, name: string, season: number) => `${finish(place, name)}, ${seasonText(season)}`

const EVENT: Record<BadgeKind, string> = {
  super32: 'the Super 32 Challenge (high school division)',
  fargo: 'Fargo (the U.S. Marine Corps 16U & Junior Nationals)',
  ironman: 'the Ironman',
  world: 'the World Championships',
  wno: "Who's Number One",
}

/** An offseason badge: "3rd place at the Super 32 Challenge (high school division), October 2024" */
export function badgeHint(kind: BadgeKind, label: string, place: number, year: number): string {
  // Fargo's label carries the division and style ("Fargo 16U FS")
  const extra = kind === 'fargo' ? label.replace(/^Fargo\s*/, '').replace(/\bFS\b/, 'freestyle').replace(/\bGR\b/, 'Greco-Roman').replace(/\bFO\b/, 'folkstyle').trim() : ''
  if (kind === 'wno') return `Won at Who's Number One (the #1 vs #2 match), ${year}`
  const what = `${EVENT[kind]}${extra ? `, ${extra}` : ''}`
  return `${place === 1 ? `Champion at ${what}` : `${ord(place)} place at ${what}`}, ${year}`
}

/** The Terminator award: least total time on the mat at that tournament */
export function terminatorHint(where: string, season: number): string {
  const full = where === 'State' ? 'the State Championships' : where.replace(/^D(\d+)$/, 'District $1').replace(/^R(\d+)$/, 'Region $1')
  return `Terminator: the least total time on the mat at ${full}, ${seasonText(season)}`
}

/** A college championship year: placed (All-American) or qualified */
export function collegeHint(levelFull: string, place: number | null, weight: number, year: number): string {
  const what = `the ${levelFull} Championships`
  return place == null
    ? `Qualified for ${what} at ${weight} lb, ${year} (did not place)`
    : `${place === 1 ? 'National champion' : `${ord(place)} place`} at ${what}, ${weight} lb, ${year}${place <= 8 ? ' — All-American' : ''}`
}
