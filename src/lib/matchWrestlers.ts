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

type WrestlerRow  = { id: string; first_name: string; last_name: string; suffix: string | null }
type WeightClassRow = { id: number; weight: number }
type EntryRow     = { wrestler_id: string; school_id: number | null; weight_class_id: number }

// Denormalized record joining wrestler + school + weights
type WrestlerRecord = {
  wrestlerId: string
  displayName: string
  schoolId: number
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

let cacheReady = false

// school_id → wrestlers at that school (keyed by wrestlerId for fast lookup)
const schoolIndex = new Map<number, Map<string, WrestlerRecord>>()

// Deduplicated list of all wrestlers (one entry per wrestlerId) for cross-school search
const allWrestlers: { wrestlerId: string; displayName: string }[] = []

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

  const supabase = getClient()

  // Load weight_classes (small, no pagination needed)
  const wcRes = await supabase.from('weight_classes').select('id, weight').limit(500)
  if (wcRes.error) throw new Error(`matchWrestlers: failed to load weight_classes — ${wcRes.error.message}`)
  const weightClasses = (wcRes.data ?? []) as WeightClassRow[]

  // Paginate wrestlers and tournament_entries
  const [wrestlers, entries] = await Promise.all([
    fetchAll<WrestlerRow>(supabase, 'wrestlers', 'id, first_name, last_name, suffix'),
    fetchAll<EntryRow>(supabase, 'tournament_entries', 'wrestler_id, school_id, weight_class_id'),
  ])

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
        weights:     [weight],
      })
    }
  }

  // Populate school index
  for (const rec of recordMap.values()) {
    if (!schoolIndex.has(rec.schoolId)) schoolIndex.set(rec.schoolId, new Map())
    schoolIndex.get(rec.schoolId)!.set(rec.wrestlerId, rec)
  }

  // Build flat deduplicated wrestler list (by wrestlerId) for cross-school search
  const seen = new Set<string>()
  for (const w of wrestlers) {
    if (!seen.has(w.id)) {
      seen.add(w.id)
      allWrestlers.push({ wrestlerId: w.id, displayName: buildName(w) })
    }
  }

  cacheReady = true
}

// ── Name helpers ───────────────────────────────────────────────────────────────

function buildName(w: WrestlerRow): string {
  const base = `${w.first_name} ${w.last_name}`
  return w.suffix ? `${base} ${w.suffix}` : base
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
  const nameLower = raw.toLowerCase()

  const atSchool = [...(schoolIndex.get(schoolId)?.values() ?? [])]

  // ── 1. Exact name + exact weight ─────────────────────────────────────────────
  for (const rec of atSchool) {
    if (rec.displayName.toLowerCase() === nameLower && rec.weights.includes(weightClass)) {
      return match(raw, schoolId, weightClass, rec, 'exact', [])
    }
  }

  // ── 2. Exact name, any weight at same school ──────────────────────────────────
  for (const rec of atSchool) {
    if (rec.displayName.toLowerCase() === nameLower) {
      return match(raw, schoolId, weightClass, rec, 'high', [])
    }
  }

  // ── 3. Fuzzy name within school ───────────────────────────────────────────────
  const schoolScored = atSchool
    .map(rec => ({ wrestlerId: rec.wrestlerId, displayName: rec.displayName, score: trigramSimilarity(raw, rec.displayName) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  const best = schoolScored[0]

  // ── 4. Cross-school alternates ────────────────────────────────────────────────
  // Included when no exact/exact-weight match was found, as additional signal.
  const schoolIds = new Set(atSchool.map(r => r.wrestlerId))
  const crossAlts = allWrestlers
    .filter(w => !schoolIds.has(w.wrestlerId))
    .map(w  => ({ wrestlerId: w.wrestlerId, displayName: w.displayName, score: trigramSimilarity(raw, w.displayName) }))
    .sort((a, b) => b.score - a.score)
    .filter(w => w.score > 0.5)
    .slice(0, 3)

  const allAlts = dedupeAlts([...schoolScored, ...crossAlts])

  if (best && best.score >= 0.85) {
    const rec = schoolIndex.get(schoolId)!.get(best.wrestlerId)!
    return match(raw, schoolId, weightClass, rec, 'high', allAlts)
  }

  if (best && best.score >= 0.6) {
    const rec = schoolIndex.get(schoolId)!.get(best.wrestlerId)!
    return match(raw, schoolId, weightClass, rec, 'low', allAlts)
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
    alternates:  allAlts,
  }
}

/** Clears the in-memory cache — useful in tests or after DB updates. */
export function clearWrestlerCache(): void {
  cacheReady = false
  schoolIndex.clear()
  allWrestlers.length = 0
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

function dedupeAlts(
  alts: { wrestlerId: string; displayName: string; score: number }[],
): { wrestlerId: string; displayName: string; score: number }[] {
  const seen = new Set<string>()
  return alts.filter(a => {
    if (seen.has(a.wrestlerId)) return false
    seen.add(a.wrestlerId)
    return true
  })
}
