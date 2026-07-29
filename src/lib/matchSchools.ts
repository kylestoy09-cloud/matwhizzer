// ─────────────────────────────────────────────────────────────────────────────
// matchSchools.ts
// Server-side only. Matches raw school names from meet headers to school records.
//
// Matching pipeline (in order):
//   1. Exact NJ display_name match (case-insensitive)
//   2. Exact alias match — NJ aliases return 'exact', OOS aliases return 'oos'
//   3. Suffix-stripped exact + alias retry
//   4. Exact OOS display_name match → 'oos'
//   5. Suffix-stripped OOS display_name → 'oos'
//   6. JS trigram fuzzy over NJ + OOS schools (pg_trgm not available)
//
// OOS alias rows use school_aliases.notes to store the OOS school_id as a
// string (avoids conflict with the nj_alias_unique partial index which fires
// on all rows where school_id IS NOT NULL).
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

export type SchoolMatch = {
  rawName: string
  schoolId: number | null
  displayName: string | null
  confidence: 'exact' | 'high' | 'low' | 'none' | 'oos'
  alternates: { schoolId: number; displayName: string; score: number; isOos?: boolean }[]
  canCreateOutOfState?: boolean
}

type NjSchoolRow  = { id: number; display_name: string }
type OosSchoolRow = { id: number; display_name: string }
type AliasRow     = { school_id: number | null; alias: string; alias_type: string | null; notes: string | null }

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// ── In-memory caches ───────────────────────────────────────────────────────────

let njSchoolCache:  NjSchoolRow[]  | null = null
let oosSchoolCache: OosSchoolRow[] | null = null
let aliasCache:     AliasRow[]     | null = null

async function loadNjSchools(): Promise<NjSchoolRow[]> {
  if (njSchoolCache) return njSchoolCache
  const { data, error } = await getClient().from('schools').select('id, display_name').eq('is_nj', true).order('id')
  if (error) throw new Error(`matchSchools: failed to load NJ schools — ${error.message}`)
  njSchoolCache = (data ?? []) as NjSchoolRow[]
  return njSchoolCache
}

async function loadOosSchools(): Promise<OosSchoolRow[]> {
  if (oosSchoolCache) return oosSchoolCache
  const { data, error } = await getClient().from('schools').select('id, display_name').eq('is_nj', false).order('id')
  if (error) throw new Error(`matchSchools: failed to load OOS schools — ${error.message}`)
  oosSchoolCache = (data ?? []) as OosSchoolRow[]
  return oosSchoolCache
}

async function loadAliases(): Promise<AliasRow[]> {
  if (aliasCache) return aliasCache
  const { data, error } = await getClient().from('school_aliases').select('school_id, alias, alias_type, notes')
  if (error) throw new Error(`matchSchools: failed to load aliases — ${error.message}`)
  aliasCache = (data ?? []) as AliasRow[]
  return aliasCache
}

// ── Trigram similarity ─────────────────────────────────────────────────────────

function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()}  `
  const tris   = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) tris.add(padded.slice(i, i + 3))
  return tris
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ── Suffix stripping ───────────────────────────────────────────────────────────

const STRIP_SUFFIXES = [
  ' h.s.', ' hs', ' high school', ' high',
  ' regional', ' jr/sr', ' jr-sr', ' sr', ' jr',
  ' academy', ' charter', ' school',
]

function stripSuffixes(name: string): string {
  const lower = name.toLowerCase().trimEnd()
  for (const suffix of STRIP_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      return stripSuffixes(name.slice(0, name.length - suffix.length).trimEnd())
    }
  }
  return name.trim()
}

// ── Result builders ────────────────────────────────────────────────────────────

function njExactResult(rawName: string, school: NjSchoolRow): SchoolMatch {
  return { rawName, schoolId: school.id, displayName: school.display_name, confidence: 'exact', alternates: [] }
}

function oosExactResult(rawName: string, school: OosSchoolRow): SchoolMatch {
  return { rawName, schoolId: school.id, displayName: school.display_name, confidence: 'oos', alternates: [] }
}

function aliasResult(
  rawName: string,
  aliasHit: AliasRow,
  njSchools: NjSchoolRow[],
  oosSchools: OosSchoolRow[],
): SchoolMatch {
  if (aliasHit.alias_type === 'oos') {
    // OOS aliases store school_id in notes (school_id column stays null to avoid index conflicts)
    let oos: OosSchoolRow | undefined
    if (aliasHit.notes) {
      const parsed = parseInt(aliasHit.notes, 10)
      if (!isNaN(parsed)) oos = oosSchools.find(s => s.id === parsed)
    }
    // Legacy OOS aliases (no notes): fall back to display_name lookup
    if (!oos) oos = oosSchools.find(s => s.display_name.toLowerCase() === aliasHit.alias.toLowerCase())
    return {
      rawName,
      schoolId:    oos?.id ?? null,
      displayName: oos?.display_name ?? aliasHit.alias,
      confidence:  'oos',
      alternates:  [],
    }
  }
  const school = njSchools.find(s => s.id === aliasHit.school_id) ?? null
  return {
    rawName,
    schoolId:    aliasHit.school_id,
    displayName: school?.display_name ?? null,
    confidence:  'exact',
    alternates:  [],
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function matchSchoolNames(rawName: string): Promise<SchoolMatch> {
  const raw = rawName.trim()
  const [njSchools, oosSchools, aliases] = await Promise.all([loadNjSchools(), loadOosSchools(), loadAliases()])

  // ── 1. Exact NJ display_name ─────────────────────────────────────────────────
  const exactNj = njSchools.find(s => s.display_name.toLowerCase() === raw.toLowerCase())
  if (exactNj) return njExactResult(raw, exactNj)

  // ── 2. Alias exact match ─────────────────────────────────────────────────────
  const aliasHit = aliases.find(a => a.alias.toLowerCase() === raw.toLowerCase())
  if (aliasHit) return aliasResult(raw, aliasHit, njSchools, oosSchools)

  // ── 3. Suffix-stripped NJ + alias retry ──────────────────────────────────────
  const stripped = stripSuffixes(raw)
  if (stripped !== raw && stripped.length > 0) {
    const strippedNj = njSchools.find(s => s.display_name.toLowerCase() === stripped.toLowerCase())
    if (strippedNj) return njExactResult(raw, strippedNj)

    const strippedAlias = aliases.find(a => a.alias.toLowerCase() === stripped.toLowerCase())
    if (strippedAlias) return aliasResult(raw, strippedAlias, njSchools, oosSchools)
  }

  // ── 4. Exact OOS display_name ────────────────────────────────────────────────
  const exactOos = oosSchools.find(s => s.display_name.toLowerCase() === raw.toLowerCase())
  if (exactOos) return oosExactResult(raw, exactOos)

  // ── 5. Suffix-stripped OOS display_name ──────────────────────────────────────
  if (stripped !== raw && stripped.length > 0) {
    const strippedOos = oosSchools.find(s => s.display_name.toLowerCase() === stripped.toLowerCase())
    if (strippedOos) return oosExactResult(raw, strippedOos)
  }

  // ── 6. Fuzzy trigram over NJ + OOS ───────────────────────────────────────────
  const queryName = (stripped !== raw && stripped.length > 0) ? stripped : raw

  const njCandidates = njSchools.map(s => ({
    schoolId:    s.id,
    displayName: s.display_name,
    score:       trigramSimilarity(queryName, s.display_name),
    isOos:       false as const,
  }))
  const oosCandidates = oosSchools.map(s => ({
    schoolId:    s.id,
    displayName: s.display_name,
    score:       trigramSimilarity(queryName, s.display_name),
    isOos:       true as const,
  }))

  const candidates = [...njCandidates, ...oosCandidates]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const best = candidates[0]

  if (!best || best.score < 0.6) {
    return { rawName, schoolId: null, displayName: null, confidence: 'none', alternates: candidates, canCreateOutOfState: true }
  }

  if (best.isOos) {
    // High-confidence OOS fuzzy match: auto-recognize as OOS
    if (best.score >= 0.85) return oosExactResult(raw, { id: best.schoolId, display_name: best.displayName })
    // Low-confidence: flag with OOS in alternates for user to pick
    return { rawName, schoolId: null, displayName: null, confidence: 'none', alternates: candidates, canCreateOutOfState: true }
  }

  // NJ fuzzy match
  const confidence: SchoolMatch['confidence'] = best.score >= 0.85 ? 'high' : 'low'
  return { rawName, schoolId: best.schoolId, displayName: best.displayName, confidence, alternates: candidates }
}

export function clearSchoolCache(): void {
  njSchoolCache  = null
  oosSchoolCache = null
  aliasCache     = null
}
