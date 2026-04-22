// ─────────────────────────────────────────────────────────────────────────────
// matchSchools.ts
// Server-side only. Matches raw school names from meet headers to school records.
//
// Matching pipeline (in order):
//   1. Exact display_name match (case-insensitive)
//   2. Exact alias match against school_aliases (case-insensitive)
//   3. Suffix-stripped exact + alias retry
//   4. JS trigram fuzzy match (pg_trgm not available on this instance)
//
// Usage:
//   import { matchSchoolNames } from '@/lib/matchSchools'
//   const result = await matchSchoolNames('Toms River East H.S.')
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

export type SchoolMatch = {
  rawName: string
  schoolId: number | null
  displayName: string | null
  confidence: 'exact' | 'high' | 'low' | 'none'
  alternates: { schoolId: number; displayName: string; score: number }[]
}

type SchoolRow = { id: number; display_name: string }
type AliasRow  = { school_id: number; alias: string }

// ── Supabase client ────────────────────────────────────────────────────────────
// Service role — bypasses RLS, safe for server-only lib.

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// ── In-memory cache (module-level, survives across calls in same server process) ─

let schoolCache: SchoolRow[] | null = null
let aliasCache:  AliasRow[]  | null = null

async function loadSchools(): Promise<SchoolRow[]> {
  if (schoolCache) return schoolCache
  const { data, error } = await getClient()
    .from('schools')
    .select('id, display_name')
    .order('id')
  if (error) throw new Error(`matchSchools: failed to load schools — ${error.message}`)
  schoolCache = (data ?? []) as SchoolRow[]
  return schoolCache
}

async function loadAliases(): Promise<AliasRow[]> {
  if (aliasCache) return aliasCache
  const { data, error } = await getClient()
    .from('school_aliases')
    .select('school_id, alias')
  if (error) throw new Error(`matchSchools: failed to load aliases — ${error.message}`)
  aliasCache = (data ?? []) as AliasRow[]
  return aliasCache
}

// ── Trigram similarity (JS implementation — pg_trgm not installed) ─────────────
// Pads the string with two spaces on each side (standard PostgreSQL convention)
// and computes Jaccard similarity over the resulting 3-grams.

function trigrams(s: string): Set<string> {
  const padded = `  ${s.toLowerCase()}  `
  const tris   = new Set<string>()
  for (let i = 0; i < padded.length - 2; i++) {
    tris.add(padded.slice(i, i + 3))
  }
  return tris
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a)
  const tb = trigrams(b)
  let intersection = 0
  for (const t of ta) {
    if (tb.has(t)) intersection++
  }
  const union = ta.size + tb.size - intersection
  return union === 0 ? 0 : intersection / union
}

// ── Suffix stripping ───────────────────────────────────────────────────────────
// Applied case-insensitively. Multiple suffixes may be stripped in one call
// (recursive) — e.g. 'Kittatinny Regional Jr/Sr' → 'Kittatinny Regional' → 'Kittatinny'.

const STRIP_SUFFIXES = [
  ' h.s.', ' hs', ' high school', ' high',
  ' regional', ' jr/sr', ' jr-sr', ' sr', ' jr',
  ' academy', ' charter', ' school',
]

function stripSuffixes(name: string): string {
  const lower = name.toLowerCase().trimEnd()
  for (const suffix of STRIP_SUFFIXES) {
    if (lower.endsWith(suffix)) {
      const trimmed = name.slice(0, name.length - suffix.length).trimEnd()
      return stripSuffixes(trimmed)  // recurse — may have another suffix
    }
  }
  return name.trim()
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function exactResult(
  rawName: string,
  school: SchoolRow,
): SchoolMatch {
  return {
    rawName,
    schoolId:    school.id,
    displayName: school.display_name,
    confidence:  'exact',
    alternates:  [],
  }
}

function aliasResult(
  rawName: string,
  aliasHit: AliasRow,
  schools: SchoolRow[],
): SchoolMatch {
  const school = schools.find(s => s.id === aliasHit.school_id) ?? null
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

  const [schools, aliases] = await Promise.all([loadSchools(), loadAliases()])

  // ── 1. Exact display_name match ──────────────────────────────────────────────
  const exactSchool = schools.find(s => s.display_name.toLowerCase() === raw.toLowerCase())
  if (exactSchool) return exactResult(raw, exactSchool)

  // ── 2. Alias exact match ─────────────────────────────────────────────────────
  const aliasHit = aliases.find(a => a.alias.toLowerCase() === raw.toLowerCase())
  if (aliasHit) return aliasResult(raw, aliasHit, schools)

  // ── 3. Suffix-stripped exact + alias retry ───────────────────────────────────
  const stripped = stripSuffixes(raw)
  if (stripped !== raw && stripped.length > 0) {
    const strippedSchool = schools.find(s => s.display_name.toLowerCase() === stripped.toLowerCase())
    if (strippedSchool) return exactResult(raw, strippedSchool)

    const strippedAlias = aliases.find(a => a.alias.toLowerCase() === stripped.toLowerCase())
    if (strippedAlias) return aliasResult(raw, strippedAlias, schools)
  }

  // ── 4. Fuzzy trigram match ───────────────────────────────────────────────────
  // Use the stripped name as the query when available (better signal-to-noise).
  const queryName  = (stripped !== raw && stripped.length > 0) ? stripped : raw
  const candidates = schools
    .map(s => ({
      schoolId:    s.id,
      displayName: s.display_name,
      score:       trigramSimilarity(queryName, s.display_name),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const best = candidates[0]

  if (!best || best.score < 0.6) {
    return {
      rawName,
      schoolId:    null,
      displayName: null,
      confidence:  'none',
      alternates:  candidates,
    }
  }

  const confidence: SchoolMatch['confidence'] = best.score >= 0.85 ? 'high' : 'low'
  return {
    rawName,
    schoolId:    best.schoolId,
    displayName: best.displayName,
    confidence,
    alternates:  candidates,
  }
}

/** Clears the in-memory cache — useful in tests or after DB updates. */
export function clearSchoolCache(): void {
  schoolCache = null
  aliasCache  = null
}
