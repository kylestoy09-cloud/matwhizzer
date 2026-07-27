// ─────────────────────────────────────────────────────────────────────────────
// matchWrestlers.ts
// Server-side only. Matches raw wrestler names from meet rows to wrestler records.
//
// Matching pipeline (in order):
//   1. Exact name + exact weight at school — confidence: 'exact'
//   2. Exact name, any weight at same school — confidence: 'high'
//   3. Fuzzy trigram match within school — score ≥0.85: 'high', 0.6–0.85: 'low'
//   4. Cross-school fuzzy — added to alternates only, never primary
//   5. No match — isNew: true, confidence: 'none'
//
// isNew: true is NOT an error. Most regular-season wrestlers are not in the DB
// (which holds postseason data only). The import tool will create new records.
//
// Usage:
//   import { matchWrestler } from '@/lib/matchWrestlers'
//   const result = await matchWrestler('Eryk Barcikowski', 53, 113, 'M')
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

export type WrestlerMatch = {
  rawName: string
  schoolId: number
  weightClass: number
  wrestlerId: string | null     // uuid if matched
  displayName: string | null    // matched wrestler's name from DB
  confidence: 'exact' | 'high' | 'low' | 'none'
  isNew: boolean                // true if no match found — this is a new wrestler
  alternates: { wrestlerId: string; displayName: string; score: number }[]
}

type WrestlerRow  = { id: string; first_name: string; last_name: string; suffix: string | null; gender: string | null }
type WeightClassRow = { id: number; weight: number }
type EntryRow     = { wrestler_id: string; school_id: number | null; weight_class_id: number }
type BoutRow      = { nj_wrestler1_id: string | null; wrestler1_school_id: number | null; nj_wrestler2_id: string | null; wrestler2_school_id: number | null }
type DualMatchRow = { wrestler_a_id: string | null; school_a_id: number | null; wrestler_b_id: string | null; school_b_id: number | null }

// Denormalized record joining wrestler + school + weights
type WrestlerRecord = {
  wrestlerId: string
  displayName: string
  schoolId: number
  gender: string | null
  weights: number[]   // all weights this wrestler has entries for at this school
}

// ── Supabase client ────────────────────────────────────────────────────────────

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// ── In-memory cache ────────────────────────────────────────────────────────────

let cacheReady   = false
let cachePromise: Promise<void> | null = null  // singleton — prevents concurrent loads

// school_id → wrestlers at that school (keyed by wrestlerId for fast lookup)
const schoolIndex = new Map<number, Map<string, WrestlerRecord>>()

// "rawName|schoolId" → { wrestlerId, displayName } — loaded from wrestler_name_aliases
const aliasIndex  = new Map<string, { wrestlerId: string; displayName: string }>()

/** Fetches all rows from a Supabase table, paginating in PAGE_SIZE chunks. */
async function fetchAll<T>(
  supabase: ReturnType<typeof getClient>,
  table: string,
  select: string,
): Promise<T[]> {
  const PAGE = 1000
  const rows: T[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`matchWrestlers: failed to load ${table} — ${error.message}`)
    const page = (data ?? []) as T[]
    rows.push(...page)
    if (page.length < PAGE) break
    from += PAGE
  }
  return rows
}

async function ensureCache(): Promise<void> {
  if (cacheReady) return
  // All concurrent callers share the same in-flight promise — only one load runs.
  if (!cachePromise) cachePromise = loadCache()
  return cachePromise
}

async function loadCache(): Promise<void> {
  const supabase = getClient()

  // Load weight_classes (small, no pagination needed)
  const wcRes = await supabase.from('weight_classes').select('id, weight').limit(500)
  if (wcRes.error) throw new Error(`matchWrestlers: failed to load weight_classes — ${wcRes.error.message}`)
  const weightClasses = (wcRes.data ?? []) as WeightClassRow[]

  // Paginate all tables serially to avoid connection pool exhaustion
  const wrestlers = await fetchAll<WrestlerRow>(supabase, 'wrestlers', 'id, first_name, last_name, suffix, gender')
  const entries   = await fetchAll<EntryRow>(supabase, 'tournament_entries', 'wrestler_id, school_id, weight_class_id')
  const bouts     = await fetchAll<BoutRow>(supabase, 'tournament_bouts', 'nj_wrestler1_id, wrestler1_school_id, nj_wrestler2_id, wrestler2_school_id')
  const duals     = await fetchAll<DualMatchRow>(supabase, 'dual_meet_matches', 'wrestler_a_id, school_a_id, wrestler_b_id, school_b_id')

  // Build fast lookup maps
  const wrestlerMap = new Map<string, WrestlerRow>()
  for (const w of wrestlers) wrestlerMap.set(w.id, w)

  const weightMap = new Map<number, number>()
  for (const wc of weightClasses) weightMap.set(wc.id, wc.weight)

  // Build records: one per (wrestlerId, schoolId) pair, accumulating weights
  // Key: `${wrestlerId}:${schoolId}`
  const recordMap = new Map<string, WrestlerRecord>()

  for (const entry of entries) {
    if (entry.school_id === null) continue
    const wrestler = wrestlerMap.get(entry.wrestler_id)
    if (!wrestler) continue
    const weight = weightMap.get(entry.weight_class_id)
    if (weight === undefined) continue

    const key = `${entry.wrestler_id}:${entry.school_id}`
    const existing = recordMap.get(key)
    if (existing) {
      if (!existing.weights.includes(weight)) existing.weights.push(weight)
    } else {
      recordMap.set(key, {
        wrestlerId:  entry.wrestler_id,
        displayName: buildName(wrestler),
        schoolId:    entry.school_id,
        gender:      wrestler.gender,
        weights:     [weight],
      })
    }
  }

  // Seed school index from tournament_entries (with weight data)
  for (const rec of recordMap.values()) {
    if (!schoolIndex.has(rec.schoolId)) schoolIndex.set(rec.schoolId, new Map())
    schoolIndex.get(rec.schoolId)!.set(rec.wrestlerId, rec)
  }

  // Helper: add a (wrestler_id, school_id) pair to the index if not already present.
  // Used for in-season sources where we have no weight data.
  function addToIndex(wrestlerId: string, schoolId: number) {
    const recKey = `${wrestlerId}:${schoolId}`
    if (recordMap.has(recKey)) return
    const wr = wrestlerMap.get(wrestlerId)
    if (!wr) return
    const rec: WrestlerRecord = {
      wrestlerId,
      displayName: buildName(wr),
      schoolId,
      gender:      wr.gender,
      weights:     [],
    }
    recordMap.set(recKey, rec)
    if (!schoolIndex.has(schoolId)) schoolIndex.set(schoolId, new Map())
    schoolIndex.get(schoolId)!.set(wrestlerId, rec)
  }

  // Seed from tournament_bouts (RTF in-season imports)
  for (const b of bouts) {
    if (b.nj_wrestler1_id && b.wrestler1_school_id) addToIndex(b.nj_wrestler1_id, b.wrestler1_school_id)
    if (b.nj_wrestler2_id && b.wrestler2_school_id) addToIndex(b.nj_wrestler2_id, b.wrestler2_school_id)
  }

  // Seed from dual_meet_matches
  for (const d of duals) {
    if (d.wrestler_a_id && d.school_a_id) addToIndex(d.wrestler_a_id, d.school_a_id)
    if (d.wrestler_b_id && d.school_b_id) addToIndex(d.wrestler_b_id, d.school_b_id)
  }

  // Load confirmed name aliases — checked before fuzzy matching
  type AliasRow = {
    raw_name:    string
    school_id:   number
    wrestler_id: string
    wrestlers:   { first_name: string; last_name: string; suffix: string | null } | null
  }
  const { data: aliasRows } = await supabase
    .from('wrestler_name_aliases')
    .select('raw_name, school_id, wrestler_id, wrestlers(first_name, last_name, suffix)')

  for (const a of (aliasRows ?? []) as unknown as AliasRow[]) {
    if (!a.wrestlers) continue
    aliasIndex.set(`${a.raw_name}|${a.school_id}`, {
      wrestlerId:  a.wrestler_id,
      displayName: buildName(a.wrestlers),
    })

  }

  cacheReady = true
}

// ── Name helpers ───────────────────────────────────────────────────────────────

function buildName(w: Pick<WrestlerRow, 'first_name' | 'last_name' | 'suffix'>): string {
  const base = `${w.first_name} ${w.last_name}`
  return w.suffix ? `${base} ${w.suffix}` : base
}

// ── Name normalization ─────────────────────────────────────────────────────────

// "J.D. Smith" → "JD Smith"  /  "A.J. Caso" → "AJ Caso"
function normalizeInitials(s: string): string {
  return s.replace(/\b([A-Za-z])\./g, '$1').replace(/\s+/g, ' ').trim()
}

// ── Trigram similarity ─────────────────────────────────────────────────────────
// Pads with two spaces (PostgreSQL convention) and computes Jaccard over 3-grams.

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

// ── Public API ─────────────────────────────────────────────────────────────────

export async function matchWrestler(
  name: string,
  schoolId: number,
  weightClass: number,
  gender: 'M' | 'F',
): Promise<WrestlerMatch> {
  await ensureCache()

  const raw       = name.trim()
  const rawNorm   = normalizeInitials(raw)
  const nameLower = raw.toLowerCase()
  const normLower = rawNorm.toLowerCase()

  // ── 0. Alias index — confirmed matches from previous imports ─────────────────
  const alias = aliasIndex.get(`${raw}|${schoolId}`)
  if (alias) {
    return {
      rawName:     raw,
      schoolId,
      weightClass,
      wrestlerId:  alias.wrestlerId,
      displayName: alias.displayName,
      confidence:  'exact',
      isNew:       false,
      alternates:  [],
    }
  }

  const atSchool = [...(schoolIndex.get(schoolId)?.values() ?? [])].filter(r => r.gender === gender)

  // ── 1. Exact name + exact weight ─────────────────────────────────────────────
  for (const rec of atSchool) {
    const recNorm = normalizeInitials(rec.displayName).toLowerCase()
    if ((rec.displayName.toLowerCase() === nameLower || recNorm === normLower) && rec.weights.includes(weightClass)) {
      return match(raw, schoolId, weightClass, rec, 'exact', [])
    }
  }

  // ── 2. Exact name, any weight at same school ──────────────────────────────────
  for (const rec of atSchool) {
    const recNorm = normalizeInitials(rec.displayName).toLowerCase()
    if (rec.displayName.toLowerCase() === nameLower || recNorm === normLower) {
      return match(raw, schoolId, weightClass, rec, 'high', [])
    }
  }

  // ── 3. Fuzzy name within school — score both raw and normalized, take the max ─
  const schoolScored = atSchool
    .map(rec => {
      const recNorm = normalizeInitials(rec.displayName)
      const score = Math.max(
        trigramSimilarity(raw, rec.displayName),
        trigramSimilarity(rawNorm, recNorm),
      )
      return { wrestlerId: rec.wrestlerId, displayName: rec.displayName, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const best = schoolScored[0]

  if (best && best.score >= 0.85) {
    const rec = schoolIndex.get(schoolId)!.get(best.wrestlerId)!
    return match(raw, schoolId, weightClass, rec, 'high', schoolScored)
  }

  if (best && best.score >= 0.6) {
    const rec = schoolIndex.get(schoolId)!.get(best.wrestlerId)!
    return match(raw, schoolId, weightClass, rec, 'low', schoolScored)
  }

  // ── 4. Same-last-name fallback ────────────────────────────────────────────────
  // Catches "JD Smith" → "Jake Smith" and brothers/cousins — shown as low confidence.
  const rawLast = rawNorm.trim().split(/\s+/).pop()!.toLowerCase()
  if (rawLast.length >= 2) {
    const sameLastName = atSchool
      .filter(rec => normalizeInitials(rec.displayName).trim().split(/\s+/).pop()?.toLowerCase() === rawLast)
      .map(rec => ({
        wrestlerId:  rec.wrestlerId,
        displayName: rec.displayName,
        score:       trigramSimilarity(rawNorm, normalizeInitials(rec.displayName)),
      }))
      .sort((a, b) => b.score - a.score)

    if (sameLastName.length > 0) {
      const rec = schoolIndex.get(schoolId)!.get(sameLastName[0].wrestlerId)!
      return match(raw, schoolId, weightClass, rec, 'low', sameLastName.slice(0, 3))
    }
  }

  // ── 5. No match ───────────────────────────────────────────────────────────────
  return {
    rawName:     raw,
    schoolId,
    weightClass,
    wrestlerId:  null,
    displayName: null,
    confidence:  'none',
    isNew:       true,
    alternates:  [],
  }
}

/** Clears the in-memory cache — useful in tests or after DB updates. */
export function clearWrestlerCache(): void {
  cacheReady   = false
  cachePromise = null
  schoolIndex.clear()
  aliasIndex.clear()
}

// ── Internal helpers ───────────────────────────────────────────────────────────

function match(
  rawName:    string,
  schoolId:   number,
  weightClass: number,
  rec:        WrestlerRecord,
  confidence: WrestlerMatch['confidence'],
  alternates: WrestlerMatch['alternates'],
): WrestlerMatch {
  return {
    rawName,
    schoolId,
    weightClass,
    wrestlerId:  rec.wrestlerId,
    displayName: rec.displayName,
    confidence,
    isNew:       false,
    alternates,
  }
}
