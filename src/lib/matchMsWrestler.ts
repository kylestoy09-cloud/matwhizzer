// Fuzzy match a HS wrestler's raw name against ms_wrestlers records.
// Used during HS import review to surface MS prospect profiles for new wrestlers.

import type { MsPlacementInfo, MsProfileCandidate } from '@/app/admin/import-rtf/types'

export type MsWrestlerRow = {
  ms_wrestler_id: number
  canonical_name: string
  placements: MsPlacementInfo[]
  best_credit: number
}

const STOP_WORDS = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'the', 'van', 'de', 'del'])

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t))
    .join(' ')
    .trim()
}

function scoreNames(hsName: string, msName: string): number {
  const h = normalize(hsName)
  const m = normalize(msName)
  if (!h || !m) return 0
  if (h === m) return 100

  const hToks = h.split(' ')
  const mToks = m.split(' ')
  const hSet = new Set(hToks)
  const mSet = new Set(mToks)

  const hLast = hToks[hToks.length - 1]
  const mLast = mToks[mToks.length - 1]
  if (!hLast || !mLast || hLast !== mLast) return 0

  let inter = 0
  for (const t of hSet) if (mSet.has(t)) inter++
  const union = new Set([...hSet, ...mSet]).size
  const jaccard = inter / union

  const hFirst = hToks[0]
  const mFirst = mToks[0]
  const firstBoost = hFirst && mFirst && hFirst === mFirst ? 15 : 0
  const initialBoost = hFirst && mFirst && hFirst.length === 1 && mFirst[0] === hFirst[0] ? 8 : 0

  return Math.min(99, Math.round(jaccard * 70) + firstBoost + initialBoost)
}

export function findMsProfileCandidates(
  rawName: string,
  msWrestlers: MsWrestlerRow[],
  minScore = 60,
): MsProfileCandidate[] {
  if (!msWrestlers.length) return []

  const candidates: MsProfileCandidate[] = []

  for (const w of msWrestlers) {
    const score = scoreNames(rawName, w.canonical_name)
    if (score < minScore) continue
    candidates.push({
      ms_wrestler_id: w.ms_wrestler_id,
      primary_name: w.canonical_name,
      score,
      placements: w.placements,
      best_credit: w.best_credit,
    })
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 3)
}

// Build the 3-season MS window for a given HS season string (e.g. '2025-26')
export function msSeasonsForHsSeason(hsSeason: string): string[] {
  const startYear = parseInt(hsSeason.split('-')[0], 10)
  if (isNaN(startYear)) return []
  return [1, 2, 3].map(offset => {
    const y = startYear - offset
    return `${y}-${String(y + 1).slice(2)}`
  })
}
