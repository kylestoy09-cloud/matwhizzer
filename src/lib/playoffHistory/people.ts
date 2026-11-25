// Playoff History: who is who across seasons (Kyle 2026-11-13). Each staged entry is a name + team in one season;
// with the team's school (playoff_history_schools) it becomes a person-season. Kyle's rule: the same name at the same
// school in back-to-back seasons is one wrestler, automatically. Everything that may be the same wrestler but isn't
// that — a transfer (same name, other school), a nickname or spelling (same school, same last name), a run longer
// than four seasons, or an existing profile from 2024-25 on — goes to the Same wrestler review.
import { stripNickname } from '@/lib/personName'
import { otherForms } from '@/lib/nicknames'

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i
export const normName = (raw: string) => stripNickname(raw).replace(/[`’]/g, "'").replace(/,/g, ' ').split(/\s+/).filter(w => w && !SUFFIX.test(w)).join(' ').toLowerCase().replace(/[^a-z' -]/g, '').replace(/\s+/g, ' ').trim()

/** "Jack bauer" → Jack / Bauer; "Stanley Clark, Jr." → Stanley / Clark / Jr.; "Richard John (RJ) Hunnewell" → Richard John / Hunnewell */
export function splitName(raw: string): { first: string; last: string; suffix: string | null } {
  const words = stripNickname(raw).replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  const sfx = words.length > 2 && SUFFIX.test(words[words.length - 1]) ? words.pop()! : null
  const cap = (w: string) => (w === w.toLowerCase() || w === w.toUpperCase() && w.length > 3 ? w.toLowerCase().replace(/(^|[-'’])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : w)
  // multi-word last names: particles stay with the last name (De La Cruz, Van Duyne)
  let cut = words.length - 1
  while (cut > 1 && /^(de|del|della|la|le|van|von|da|di|st\.?|mc|mac)$/i.test(words[cut - 1])) cut--
  const first = words.slice(0, cut).map(cap).join(' '), last = words.slice(cut).map(cap).join(' ')
  return { first, last, suffix: sfx ? sfx.replace(/^jr$/i, 'Jr.').replace(/^sr$/i, 'Sr.').toUpperCase().replace('JR.', 'Jr.').replace('SR.', 'Sr.') : null }
}

/** Two first names that may be the same person: a nickname form, an initial, or one letter apart. */
export function sameFirst(a: string, b: string): boolean {
  const x = a.toLowerCase().replace(/[^a-z]/g, ''), y = b.toLowerCase().replace(/[^a-z]/g, '')
  if (!x || !y || x === y) return x === y
  if (otherForms(x).map(f => f.toLowerCase()).includes(y) || otherForms(y).map(f => f.toLowerCase()).includes(x)) return true
  if (x.length === 1 || y.length === 1) return x[0] === y[0]
  if (x.startsWith(y) || y.startsWith(x)) return Math.min(x.length, y.length) >= 3
  // one edit apart
  if (Math.abs(x.length - y.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < x.length && j < y.length) { if (x[i] === y[j]) { i++; j++; continue } if (++edits > 1) return false; if (x.length > y.length) i++; else if (y.length > x.length) j++; else { i++; j++ } }
  return edits + (x.length - i) + (y.length - j) <= 1
}
