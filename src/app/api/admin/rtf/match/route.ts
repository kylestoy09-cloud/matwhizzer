import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText, parseDateRange, boutResultToDb } from '@/lib/parseRtf'
import { matchSchoolNames } from '@/lib/matchSchools'
import { matchWrestler, oosSchoolHasPrior, clearWrestlerCache } from '@/lib/matchWrestlers'
import type { SchoolFlag, WrestlerFlag, ReviewedTournament, SchoolOverride } from '@/app/admin/import-rtf/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SEASON = '2025-26'

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

type ResolvedSchool = {
  school_id: number | null
  display_name: string | null
  confidence: string
  alternates: SchoolFlag['alternates']
}

async function findOrCreateOosSchool(client: ReturnType<typeof createClient>, raw: string): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any
  const existing = await c.from('schools').select('id').eq('display_name', raw).eq('is_nj', false).maybeSingle()
  if (existing.data?.id) return existing.data.id
  const ins = await c.from('schools').insert({ display_name: raw, is_nj: false }).select('id').single()
  if (ins.error) throw new Error(`OOS school insert failed for "${raw}": ${ins.error.message}`)
  return ins.data.id
}

async function buildSchoolCache(
  rawNames: string[],
  overrides: Record<string, SchoolOverride>,
  client: ReturnType<typeof createClient>,
): Promise<Map<string, ResolvedSchool>> {
  const cache = new Map<string, ResolvedSchool>()
  for (const raw of rawNames) {
    if (cache.has(raw)) continue
    const override = overrides[raw]
    if (override?.type === 'skip') {
      cache.set(raw, { school_id: null, display_name: null, confidence: 'skip', alternates: [] })
    } else if (override?.type === 'oos') {
      const school_id = override.school_id != null
        ? override.school_id
        : await findOrCreateOosSchool(client, raw)
      const display_name = override.display_name ?? raw
      cache.set(raw, { school_id, display_name, confidence: 'oos', alternates: [] })
    } else if (override?.type === 'nj') {
      cache.set(raw, { school_id: override.school_id, display_name: override.display_name, confidence: 'exact', alternates: [] })
    } else {
      const m = await matchSchoolNames(raw)
      cache.set(raw, {
        school_id: m.schoolId,
        display_name: m.displayName,
        confidence: m.confidence,
        alternates: m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score, is_oos: a.isOos })),
      })
    }
  }
  return cache
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let text: string, year: number, selected: string[], schoolOverrides: Record<string, SchoolOverride>
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
    selected = body.selected ?? []
    schoolOverrides = body.schoolOverrides ?? {}
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = parseRtfText(text)
  const selectedSet = new Set(selected)
  clearWrestlerCache()

  const allSchoolRaws = new Set<string>()
  for (const t of parsed) {
    if (!selectedSet.has(`${t.name}|${t.date_raw}`)) continue
    for (const b of t.bouts) {
      if (b.wrestler1_school) allSchoolRaws.add(b.wrestler1_school)
      if (b.wrestler2_school) allSchoolRaws.add(b.wrestler2_school)
    }
    for (const p of t.placements) {
      if (p.school_name) allSchoolRaws.add(p.school_name)
    }
  }

  const client = serviceClient()
  let schoolCache: Map<string, ResolvedSchool>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schoolCache = await buildSchoolCache([...allSchoolRaws], schoolOverrides, client as any)
  } catch (err) {
    return NextResponse.json({ error: `School matching failed: ${String(err)}` }, { status: 500 })
  }
  const reviewed: ReviewedTournament[] = []

  for (const t of parsed) {
    if (!selectedSet.has(`${t.name}|${t.date_raw}`)) continue

    const [start_date, end_date] = parseDateRange(t.date_raw, year)
    let existing: { data: { id: string } | null } = { data: null }
    let has_bouts = false
    try {
      const eq = await client.from('in_season_tournaments').select('id').eq('name', t.name).eq('season', SEASON).maybeSingle()
      existing = eq
      if (existing.data?.id) {
        const bq = await client.from('tournament_bouts').select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', existing.data.id)
        has_bouts = (bq.count ?? 0) > 0
      }
    } catch { /* non-fatal — existing_id will be null */ }

    const seen = new Set<string>()
    const dedupedBouts = t.bouts.filter(b => {
      const key = `${b.weight_class}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
      if (seen.has(key)) return false
      seen.add(key); return true
    })

    const schoolFlagMap = new Map<string, SchoolFlag>()
    for (const b of dedupedBouts) {
      for (const raw of [b.wrestler1_school, b.wrestler2_school]) {
        if (!raw || schoolFlagMap.has(raw)) continue
        const r = schoolCache.get(raw)!
        if (r.confidence !== 'skip' && (r.confidence === 'none' || r.confidence === 'low')) {
          schoolFlagMap.set(raw, {
            raw,
            confidence: r.confidence as SchoolFlag['confidence'],
            school_id: r.school_id,
            display_name: r.display_name,
            alternates: r.alternates,
            bout_count: 0,
          })
        }
      }
    }
    for (const b of dedupedBouts) {
      for (const raw of [b.wrestler1_school, b.wrestler2_school]) {
        if (schoolFlagMap.has(raw)) schoolFlagMap.get(raw)!.bout_count++
      }
    }

    const wrestlerFlagMap = new Map<string, WrestlerFlag>()
    try {
      for (const b of dedupedBouts) {
        const { db_type, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        for (const [name, school_raw] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
          const s = schoolCache.get(school_raw)
          // Skip wrestlers at unknown schools or uncertain NJ matches — resolve school flags first
          if (!s?.school_id) continue
          if (s.confidence !== 'exact' && s.confidence !== 'alias' && s.confidence !== 'high' && s.confidence !== 'oos') continue
          const fkey = `${name}|${s.school_id}|${b.weight_class}`
          if (wrestlerFlagMap.has(fkey)) continue
          const isOos = s.confidence === 'oos'
          const wm = await matchWrestler(name, s.school_id, b.weight_class, 'M')
          // OOS wrestlers: flag low-confidence (possible dup) OR new-looking at a school that already
          // has prior wrestlers (returning wrestler whose name changed enough to miss all matchers).
          // First-import OOS schools (no prior wrestlers) auto-create silently — no review needed.
          // NJ wrestlers: flag both new and low-confidence as before.
          const oosNewAtKnownSchool = isOos && wm.isNew && await oosSchoolHasPrior(s.school_id)
          const shouldFlag = isOos
            ? (wm.confidence === 'low' || oosNewAtKnownSchool)
            : (wm.confidence === 'low' || wm.confidence === 'none')
          if (shouldFlag) {
            wrestlerFlagMap.set(fkey, {
              key: fkey,
              raw_name: name,
              school_raw,
              school_id: s.school_id,
              weight_class: b.weight_class,
              confidence: wm.confidence,
              is_new: wm.isNew,
              is_oos: isOos,
              wrestler_id: wm.wrestlerId,
              display_name: wm.displayName,
              alternates: wm.alternates.map(a => ({ wrestler_id: a.wrestlerId, display_name: a.displayName, score: a.score })),
            })
          }
        }
      }
    } catch (err) {
      return NextResponse.json({ error: `Wrestler matching failed for "${t.name}": ${String(err)}` }, { status: 500 })
    }

    reviewed.push({
      name: t.name,
      date_raw: t.date_raw,
      start_date,
      end_date,
      source_format: t.source_format,
      tournament_type: 'inside',
      bout_count: dedupedBouts.length,
      placement_count: t.placements.length,
      existing_id: existing.data?.id ?? null,
      has_existing_bouts: has_bouts,
      school_flags: [...schoolFlagMap.values()],
      wrestler_flags: [...wrestlerFlagMap.values()],
      bouts_for_review: t.bouts_for_review ?? [],
    })
  }

  return NextResponse.json({ reviewed })
}
