// Pre-2013 history people (Kyle 2026-11-17: "give everyone a profile"): every boys NJ Wrestling History finish before
// our postseason records (State places 1–8, Region titles) grouped into wrestlers — the same name at the same school
// within a four-season career. A first name counts as the same through a common nickname (Mike = Michael) or a lone
// initial ("J. Coletta"); a "Jr." / "III" goes to the suffix. Someone whose career runs into our records (2012-13 on)
// is linked to the profile they already have instead of getting a new one.
import { NICKNAMES } from '@/lib/preRecordFinishes'

export type HistFinish = { id: number; year: number; level: string; region: number | null; weight: string; place: number; name: string; school: string | null; school_id: number | null }
export type HistPerson = { key: string; first_name: string; last_name: string; suffix: string | null; school_id: number | null; school_raw: string | null; finishes: HistFinish[]; transfers?: (number | null)[] }   // transfers: the later schools

const nick = new Map<string, number>(NICKNAMES.flatMap((g, i) => g.map(n => [n, i] as [string, number])))
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i

/** "Bob Smith Jr." → first Bob, last Smith, suffix Jr. ; "J. Coletta" → first J., last Coletta */
export function splitHistoryName(raw: string): { first_name: string; last_name: string; suffix: string | null } {
  const parts = raw.replace(/,/g, ' ').trim().split(/\s+/)
  let suffix: string | null = null
  if (parts.length > 2 && SUFFIX.test(parts[parts.length - 1])) {
    const x = parts.pop()!.replace(/\./g, '').toLowerCase()
    suffix = x === 'jr' ? 'Jr.' : x === 'sr' ? 'Sr.' : x.toUpperCase()
  }
  const last_name = parts.pop() ?? ''
  return { first_name: parts.join(' '), last_name, suffix }
}

/** Two first names for the same person: equal, nicknames of each other, or one a lone initial of the other */
export function sameFirst(a: string, b: string): boolean {
  const x = letters(a), y = letters(b)
  if (!x || !y) return false
  if (x === y) return true
  if (nick.has(x) && nick.get(x) === nick.get(y)) return true
  return (x.length === 1 && y.startsWith(x)) || (y.length === 1 && x.startsWith(y))
}

function oneOff(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 5) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++ }
  }
  return edits + (a.length - i) + (b.length - j) <= 1
}

/** Group finishes into people. At one school: a last name the same or one letter off ("McKeedy" = McKeeby, a source
 *  typo) and a first name that fits (sameFirst), within four seasons. Then across schools (a transfer: Frank Cagnina,
 *  Bergen Catholic 2007 → Queen of Peace 2008–10): the same full name, within four seasons, never in the same year. */
/** Same full name at two schools in reach of each other, but a common last name / initial-only first name: Kyle decides */
export const possibleTransfers: HistPerson[][] = []
const COMMON_LAST = 15   // history wrestlers sharing the last name

export function groupHistoryPeople(fin: HistFinish[]): HistPerson[] {
  possibleTransfers.length = 0
  const people: HistPerson[] = []
  const bySchool = new Map<string, HistPerson[]>()
  for (const f of [...fin].sort((a, b) => a.year - b.year || a.id - b.id)) {
    const n = splitHistoryName(f.name)
    const k = `${f.school_id ?? 'raw:' + letters(f.school ?? '')}`
    const list = bySchool.get(k) ?? []
    let p = list.find(x => oneOff(letters(x.last_name), letters(n.last_name)) && sameFirst(x.first_name, n.first_name) && f.year - x.finishes[0].year <= 3)
    if (!p) {
      p = { key: `${k}|${letters(n.last_name)}|${letters(n.first_name)}|${f.year}`, ...n, school_id: f.school_id, school_raw: f.school, finishes: [] }
      list.push(p); people.push(p); bySchool.set(k, list)
    }
    // keep the fuller first name over an initial, and the spelling most often printed for the last name
    if (letters(p.first_name).length === 1 && letters(n.first_name).length > 1) p.first_name = n.first_name
    if (!p.suffix && n.suffix) p.suffix = n.suffix
    p.finishes.push(f)
  }
  for (const p of people) {
    const counts = new Map<string, number>()
    for (const f of p.finishes) { const l = splitHistoryName(f.name).last_name; counts.set(l, (counts.get(l) ?? 0) + 1) }
    p.last_name = [...counts].sort((a, b) => b[1] - a[1])[0][0]
  }
  // transfers: merge into the earlier school's person
  const full = (p: HistPerson) => `${letters(p.first_name)}|${letters(p.last_name)}`
  const byName = new Map<string, HistPerson[]>()
  for (const p of people) byName.set(full(p), [...(byName.get(full(p)) ?? []), p])
  const gone = new Set<HistPerson>()
  // a last name shared by many history wrestlers (Smith, Brown…) or a first name that's only an initial isn't enough
  // to call two schools one person: those are listed for Kyle instead (possibleTransfers)
  const lastCount = new Map<string, number>()
  for (const p of people) lastCount.set(letters(p.last_name), (lastCount.get(letters(p.last_name)) ?? 0) + 1)
  for (const list of byName.values()) {
    if (list.length < 2) continue
    if (letters(list[0].first_name).length <= 1 || (lastCount.get(letters(list[0].last_name)) ?? 0) >= COMMON_LAST) {
      possibleTransfers.push(list)
      continue
    }
    list.sort((a, b) => a.finishes[0].year - b.finishes[0].year)
    for (let i = 0; i < list.length; i++) {
      const a = list[i]
      if (gone.has(a)) continue
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j]
        if (gone.has(b) || b.school_id === a.school_id) continue
        const years = [...a.finishes, ...b.finishes].map(f => f.year)
        const sameYear = a.finishes.some(f => b.finishes.some(g => g.year === f.year))
        // weight has to fit too: no more than ~30 lb a season between the two schools (heavyweight ≈ 200); John Brennan
        // at 98 (Dover 1959) and heavyweight (Woodbury 1962) are two people
        const lb = (w: string) => (/^h/i.test(w) ? 200 : Number(w) || 0)
        const aLast = a.finishes[a.finishes.length - 1], bFirst = b.finishes[0]
        const grows = Math.abs(lb(bFirst.weight) - lb(aLast.weight)) <= 30 * Math.max(1, bFirst.year - aLast.year)
        if (!grows && Math.max(...years) - Math.min(...years) <= 3 && !sameYear) { possibleTransfers.push([a, b]); continue }
        if (Math.max(...years) - Math.min(...years) <= 3 && !sameYear) {
          a.finishes.push(...b.finishes); a.finishes.sort((x, y) => x.year - y.year)
          a.transfers = [...(a.transfers ?? []), b.school_id]
          gone.add(b)
        }
      }
    }
  }
  return people.filter(p => !gone.has(p))
}
