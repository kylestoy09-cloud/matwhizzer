// The school matcher's best alternate, when it's clearly the one (Kyle 2026-11-20: "most of these schools already exist
// and should have a bunch of aliases to match automatically"). matchSchoolNames returns a close school only as an
// alternate ("Bullis" → Bullis Prep (MD) 0.90). Taken automatically when it scores ≥ 0.85, beats the next by 0.15 or
// more, and one name holds the other's words ("Abington Friends" ⊂ "Abington School of Friends"); otherwise a
// suggestion for the review. "Central" (two schools at 0.90) and "St Elizabeth" → Elizabeth stay for a person.
import type { SchoolMatch } from '../src/lib/matchSchools'

const STOP = new Set(['the', 'hs', 'high', 'school', 'sr', 'jr', 'regional', 'reg', 'academy', 'acad', 'prep', 'preparatory', 'of', 'and', 'at'])
const words = (s: string) => s.toLowerCase().replace(/\([a-z]{2}\)$/i, '').replace(/saint\b/g, 'st').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w))
const holds = (a: string, b: string) => { const A = words(a), B = new Set(words(b)); return A.length > 0 && A.every(w => B.has(w)) }

export type AltCall = { id: number; name: string; oos: boolean; sure: boolean } | null

export function bestAlternate(printed: string, m: SchoolMatch): AltCall {
  const alts = [...(m.alternates ?? [])].sort((a, b) => b.score - a.score)
  const top = alts[0]
  if (!top || top.score < 0.6) return null
  // a tie with the next school ("Central": two schools at 0.90) is no guess at all
  if ((alts[1]?.score ?? 0) > top.score - 0.1) return null
  const clear = top.score >= 0.85 && (alts[1]?.score ?? 0) <= top.score - 0.15
  const contained = holds(printed, top.displayName) || holds(top.displayName, printed)
  return { id: top.schoolId, name: top.displayName, oos: !!top.isOos, sure: clear && contained }
}
