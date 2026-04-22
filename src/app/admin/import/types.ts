// ─────────────────────────────────────────────────────────────────────────────
// types.ts — shared UI types for the dual-meet import tool
// ─────────────────────────────────────────────────────────────────────────────

import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'

export type { SchoolMatch, WrestlerMatch }

// ── Manual override types ──────────────────────────────────────────────────────

export type SchoolOverride = {
  schoolId:    number
  displayName: string
}

export type WrestlerOverride = {
  wrestlerId:   string | null  // null = confirmed as new
  displayName:  string | null
  confirmedNew: boolean
}

// ── Wrestler key ───────────────────────────────────────────────────────────────
// Stable identity key for a wrestler within an import batch.
// Includes weight so that a wrestler bumping up a class is tracked separately.

export type WrestlerKey = string  // `${rawName}|${schoolId ?? 'null'}|${weightClass}`

export function makeWrestlerKey(
  name:        string,
  schoolId:    number | null,
  weightClass: number,
): WrestlerKey {
  return `${name}|${schoolId ?? 'null'}|${weightClass}`
}

// ── Resolved types (after applying overrides on top of API results) ────────────

export type ResolvedSchool = {
  schoolId:    number | null
  displayName: string | null
  confidence:  'exact' | 'high' | 'low' | 'none'
}

export type ResolvedWrestler = {
  wrestlerId:  string | null
  displayName: string | null
  confidence:  'exact' | 'high' | 'low' | 'none'
  isNew:       boolean
}

// ── Resolver helpers ───────────────────────────────────────────────────────────

export function resolveSchool(
  rawName:     string,
  resolutions: Record<string, SchoolMatch>,
  overrides:   Record<string, SchoolOverride>,
): ResolvedSchool {
  const override = overrides[rawName]
  if (override) {
    return { schoolId: override.schoolId, displayName: override.displayName, confidence: 'exact' }
  }
  const match = resolutions[rawName]
  if (!match) return { schoolId: null, displayName: rawName, confidence: 'none' }
  return {
    schoolId:    match.schoolId,
    displayName: match.displayName ?? rawName,
    confidence:  match.confidence,
  }
}

export function resolveWrestler(
  key:         WrestlerKey,
  resolutions: Record<string, WrestlerMatch>,
  overrides:   Record<string, WrestlerOverride>,
): ResolvedWrestler {
  const override = overrides[key]
  if (override) {
    return {
      wrestlerId:  override.wrestlerId,
      displayName: override.displayName,
      confidence:  override.confirmedNew ? 'none' : 'exact',
      isNew:       override.confirmedNew,
    }
  }
  const match = resolutions[key]
  if (!match) return { wrestlerId: null, displayName: null, confidence: 'none', isNew: true }
  return {
    wrestlerId:  match.wrestlerId,
    displayName: match.displayName,
    confidence:  match.confidence,
    isNew:       match.isNew,
  }
}
