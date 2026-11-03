// What the site shows for one side of a bout: the wrestler's profile name. A side with no
// profile is never shown as the imported text: it is a forfeit slot ("Forfeit"), an opponent
// the source didn't name ("Unknown"), or empty.
export type PersonRef = { first_name: string; last_name: string } | null | undefined

export function personLabel(p: PersonRef, raw: string | null | undefined): string {
  if (p) return `${p.first_name} ${p.last_name}`.trim()
  if (!raw?.trim()) return ''
  return /forf|forefit/i.test(raw) ? 'Forfeit' : 'Unknown'
}
