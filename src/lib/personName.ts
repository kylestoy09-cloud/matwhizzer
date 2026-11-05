// What the site shows for one side of a bout: the wrestler's profile name. A side with no
// profile is never shown as the imported text: it is a forfeit slot ("Forfeit"), an opponent
// the source didn't name ("Unknown"), or empty.
export type PersonRef = { first_name: string; last_name: string } | null | undefined

// A name in the source that stands for an empty or scratched slot, not a wrestler:
// "Scratch", "Scratch Scratch", "Forfeit", "Bye", "TBD", "Vacant", "Open"...
// Imports never make a profile for one (a forfeit over it keeps the winner's win).
const PLACEHOLDER = /^(scratch(ed)?|forfeit|forefit|forf|bye|tbd|tba|vacant|open|none|no ?show)$/i
export function isPlaceholderName(raw: string | null | undefined): boolean {
  const words = (raw ?? '').trim().split(/\s+/).filter(Boolean)
  return words.length > 0 && words.every(w => PLACEHOLDER.test(w))
}

// A nickname in parentheses is not part of the name: "Charles (CJ) Palmisano" is Charles
// Palmisano. The 2026-03-20 postseason load split such names at the "(" and made profiles with
// no last name (Charles, Terrance, Arjun); every importer that builds a profile name from raw
// text runs it through this first. The raw text itself stays as the name link.
export function stripNickname(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\([^)]*\)/g, ' ').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function personLabel(p: PersonRef, raw: string | null | undefined): string {
  if (p) return `${p.first_name} ${p.last_name}`.trim()
  if (!raw?.trim()) return ''
  return /forf|forefit/i.test(raw) || isPlaceholderName(raw) ? 'Forfeit' : 'Unknown'
}
