// How a bout ended, grouped the same way for duals, in-season tournaments and the postseason
// (each source spells result types differently: 'Fall' / 'FALL', 'TF-1.5', 'M. For', 'DEC' ...).

export const RESULT_ORDER = ['Falls', 'Tech falls', 'Major decisions', 'Decisions', 'Forfeits', 'Medical forfeits', 'Injury defaults', 'Defaults', 'Disqualifications'] as const
export type ResultCategory = typeof RESULT_ORDER[number]

// result label → category; null = not a match (double forfeit, no contest, bye, unknown result)
export function resultCategory(r: string | null, doubleForfeit = false): ResultCategory | null {
  if (doubleForfeit) return null
  const s = (r ?? '').trim().toUpperCase()
  if (/\(FALL\)/.test(s) || s === 'FALL') return 'Falls'
  if (/^TF/.test(s)) return 'Tech falls'
  if (s === 'MD' || s === 'MAJ') return 'Major decisions'
  if (/^(DEC|SV|TB|UTB|OT|2-OT)/.test(s)) return 'Decisions'
  if (/^(M\. ?FOR|MFF)/.test(s)) return 'Medical forfeits'
  if (/^(FOR|FORF|FF)\b/.test(s) || s === 'FORFEIT') return 'Forfeits'
  if (/^INJ/.test(s)) return 'Injury defaults'
  if (/^DEF/.test(s)) return 'Defaults'
  if (s === 'DQ') return 'Disqualifications'
  return null
}

// Wins nobody wrestled for: forfeits, medical forfeits, injury defaults, defaults and DQs
export const isContested = (c: ResultCategory) => c === 'Falls' || c === 'Tech falls' || c === 'Major decisions' || c === 'Decisions'
