// Shared types for the MS import match step.
// No 'use server' or 'use client' — safe to import from both sides.

const STOP = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'the', 'van', 'de', 'del'])

export function normalizeMsName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP.has(t))
    .join(' ')
    .trim()
}

// ── Wrestler matching ──────────────────────────────────────────────────────────

export type MsWrestlerFlag = {
  key: string                  // normalizeMsName(first raw_name) — grouping key
  raw_names: string[]          // all raw name variants in this batch
  weight_classes: number[]     // all weights in this batch for this wrestler
  confidence: 'exact' | 'high' | 'low' | 'none'
  is_new: boolean
  ms_wrestler_id: number | null
  canonical_name: string | null
  last_weight: number | null   // existing wrestler's last recorded weight
  last_date: string | null     // existing wrestler's last tournament date
  alternates: { ms_wrestler_id: number; canonical_name: string; score: number }[]
}

export type MsWrestlerOverride =
  | { type: 'existing'; ms_wrestler_id: number; canonical_name: string }
  | { type: 'create';   canonical_name: string }

// ── Club matching ──────────────────────────────────────────────────────────────

export type ClubFlag = {
  raw: string                  // raw school_name from placement
  confidence: 'exact' | 'high' | 'low' | 'none'
  club_id: number | null
  club_name: string | null
  alternates: { club_id: number; name: string; score: number }[]
  placement_count: number
}

export type ClubOverride =
  | { type: 'existing'; club_id: number; club_name: string }
  | { type: 'create';   name: string }
  | { type: 'skip' }
