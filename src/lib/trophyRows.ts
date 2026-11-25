// Trophy Case rows: one row per wrestler a year (Kyle 2026-11-13). A school enters one wrestler per weight, so rows at
// the same school, year and weight are the same wrestler when their last names are close: sources spell them
// differently (Dan Scheets / Sheets, Wagenhoffer / Wagonhoffer, Napoli / DiNapoli, Dixon / Dixon Jr — Kyle 2026-11-14).
// Clearly different last names stay apart (a source's own mistake shows rather than merging two people).
import type { TrophyIndividual } from '@/lib/trophyCase'

const lastOf = (name: string) => name.toLowerCase().replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '').trim().split(/\s+/).slice(-1)[0]?.replace(/[^a-z]/g, '') ?? ''

function distance(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t }
  }
  return d[b.length]
}

const firstOf = (name: string) => name.toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? ''

export function sameLastName(x: string, y: string) {
  const a = lastOf(x), b = lastOf(y)
  if (!a || !b) return false
  if (a === b || a.includes(b) || b.includes(a)) return true
  const sameFirst = firstOf(x) === firstOf(y)
  // a source that gives only a first name ("Doug" / Doug Kanach)
  if (sameFirst && (x.trim().split(/\s+/).length === 1 || y.trim().split(/\s+/).length === 1)) return true
  return distance(a, b) <= (Math.min(a.length, b.length) >= 8 || sameFirst ? 3 : 2)
}

// "So - Drew Wagenhoffer" (a class tag left in a source's name)
export const cleanTrophyName = (name: string) => name.replace(/^(fr|so|jr|sr)\s*-\s*/i, '').trim()

export function groupTrophyRows(rows: TrophyIndividual[]) {
  const groups: TrophyIndividual[][] = []
  for (const f of rows) {
    const wt = /^hwt$/i.test(f.weight) ? '285' : f.weight
    const g = groups.find(g => g[0].year === f.year && (/^hwt$/i.test(g[0].weight) ? '285' : g[0].weight) === wt && g.some(x => sameLastName(x.name, f.name)))
    if (g) g.push(f); else groups.push([f])
  }
  return groups
}
