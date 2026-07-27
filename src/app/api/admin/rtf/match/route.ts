import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText, parseDateRange, boutResultToDb } from '@/lib/parseRtf'
import { matchSchoolNames } from '@/lib/matchSchools'
import { matchWrestler, clearWrestlerCache } from '@/lib/matchWrestlers'
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

async function buildSchoolCache(
  rawNames: string[],
  overrides: Record<string, SchoolOverride>,
): Promise<Map<string, ResolvedSchool>> {
  const cache = new Map<string, ResolvedSchool>()
  for (const raw of rawNames) {
    if (cache.has(raw)) continue
    const override = overrides[raw]
    if (override?.type === 'oos') {
      cache.set(raw, { school_id: null, display_name: raw, confidence: 'none', alternates: [] })
    } else if (override?.type === 'nj') {
      cache.set(raw, { school_id: override.school_id, display_name: override.display_name, confidence: 'exact', alternates: [] })
    } else {
      const m = await matchSchoolNames(raw)
      cache.set(raw, {
        school_id: m.schoolId,
        display_name: m.displayName,
        confidence: m.confidence,
        alternates: m.alternates.map(a => ({ school_id: a.schoolId, display_name: a.displayName, score: a.score })),
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
    if (!selectedSet.has(t.name)) continue
    for (const b of t.bouts) {
      if (b.wrestler1_school) allSchoolRaws.add(b.wrestler1_school)
      if (b.wrestler2_school) allSchoolRaws.add(b.wrestler2_school)
    }
    for (const p of t.placements) {
      if (p.school_name) allSchoolRaws.add(p.school_name)
    }
  }

  const schoolCache = await buildSchoolCache([...allSchoolRaws], schoolOverrides)
  const client = serviceClient()
  const reviewed: ReviewedTournament[] = []

  for (const t of parsed) {
    if (!selectedSet.has(t.name)) continue

    const [start_date, end_date] = parseDateRange(t.date_raw, year)
    const existing = await client.from('in_season_tournaments').select('id').eq('name', t.name).eq('season', SEASON).maybeSingle()
    let has_bouts = false
    if (existing.data?.id) {
      const bq = await client.from('tournament_bouts').select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', existing.data.id)
      has_bouts = (bq.count ?? 0) > 0
    }

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
        if (r.confidence === 'none' || r.confidence === 'low') {
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
    for (const b of dedupedBouts) {
      const { db_type, winner } = boutResultToDb(b.result_type, b.result_detail)
      if (db_type === null && winner === null) continue
      for (const [name, school_raw] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
        const s = schoolCache.get(school_raw)
        // Skip wrestlers at OOS schools or schools with uncertain NJ match — resolve school flags first
        if (!s?.school_id) continue
        if (s.confidence !== 'exact' && s.confidence !== 'alias' && s.confidence !== 'high') continue
        const fkey = `${name}|${s.school_id}|${b.weight_class}`
        if (wrestlerFlagMap.has(fkey)) continue
        const wm = await matchWrestler(name, s.school_id, b.weight_class, 'M')
        if (wm.confidence === 'low' || wm.confidence === 'none') {
          wrestlerFlagMap.set(fkey, {
            raw_name: name,
            school_raw,
            school_id: s.school_id,
            weight_class: b.weight_class,
            confidence: wm.confidence,
            is_new: wm.isNew,
            wrestler_id: wm.wrestlerId,
            display_name: wm.displayName,
            alternates: wm.alternates.map(a => ({ wrestler_id: a.wrestlerId, display_name: a.displayName, score: a.score })),
          })
        }
      }
    }

    reviewed.push({
      name: t.name,
      date_raw: t.date_raw,
      start_date,
      end_date,
      source_format: t.source_format,
      bout_count: dedupedBouts.length,
      placement_count: t.placements.length,
      existing_id: existing.data?.id ?? null,
      has_existing_bouts: has_bouts,
      school_flags: [...schoolFlagMap.values()],
      wrestler_flags: [...wrestlerFlagMap.values()],
    })
  }

  return NextResponse.json({ reviewed })
}
