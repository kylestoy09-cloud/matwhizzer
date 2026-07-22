// import-tournament-bouts/route.ts
// Writes tournament bouts from a --json-out JSON payload to the DB.
//
// Steps:
//   1. For each non-skipped tournament: get or create its in_season_tournaments row
//   2. Skip tournaments that already have bouts (unless they've been force-wiped)
//   3. Collect "new" wrestlers across all tournaments; create them in batch
//   4. Build final bout rows with overridden school/wrestler IDs applied
//   5. Insert to tournament_bouts in chunks

import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { PipeImportJSON, SchoolOverride, WrestlerOverride, BoutRow } from '@/app/admin/import-tournament/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = SupabaseClient<any, any, any>

export const dynamic = 'force-dynamic'

const SEASON = '2025-26'
const CHUNK  = 500

function parseName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first_name: full.trim(), last_name: '' }
  const suffixes = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'jr.', 'sr.'])
  let lastIdx = parts.length - 1
  if (suffixes.has(parts[lastIdx].toLowerCase())) lastIdx--
  return { first_name: parts.slice(0, lastIdx).join(' '), last_name: parts[lastIdx] ?? '' }
}

async function ensureTournament(
  name: string,
  existingId: string | null,
  startDate: string | null,
  endDate: string | null,
  supabase: AnySupabase,
): Promise<string> {
  if (existingId) return existingId

  const check = await supabase
    .from('in_season_tournaments')
    .select('id')
    .eq('name', name)
    .eq('season', SEASON)
    .single()

  if (check.data) return (check.data as { id: string }).id

  const payload: Record<string, string | null> = {
    name,
    season: SEASON,
    start_date: startDate ?? '2025-12-27',
    end_date: endDate ?? null,
  }

  const { data, error } = await supabase
    .from('in_season_tournaments')
    .insert(payload)
    .select('id')
    .single()

  if (error) throw new Error(`Failed to create tournament "${name}": ${error.message}`)
  return (data as { id: string }).id
}

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    importData: PipeImportJSON
    schoolOverrides: Record<string, SchoolOverride>
    wrestlerOverrides: Record<string, WrestlerOverride>
  }
  const { importData, schoolOverrides, wrestlerOverrides } = body

  const supabase: AnySupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Collect all "new" wrestlers that need to be created ─────────────────────
  type NewWrestlerReq = { name: string; school_id: number }
  const toCreate: NewWrestlerReq[] = []
  const toCreateKeys = new Set<string>()

  for (const t of importData.tournaments) {
    if (t.skipped) continue
    for (const bout of t.bouts) {
      for (const [nameRaw, keyField] of [
        [bout.winner_name, bout.winner_key] as const,
        [bout.loser_name,  bout.loser_key ] as const,
      ]) {
        if (!keyField) continue
        const [, schoolIdStr] = keyField.split('|')
        if (schoolIdStr === 'null') continue

        const override = wrestlerOverrides[keyField]
        const resolution = importData.wrestlers[keyField]

        const isNew =
          override?.type === 'new' ||
          (!override && resolution?.is_new)

        if (isNew && !toCreateKeys.has(keyField)) {
          const schoolRaw = bout.winner_key === keyField ? bout.winner_school_raw : bout.loser_school_raw
          const schoolOv = schoolOverrides[schoolRaw]
          const effectiveSchoolId =
            (schoolOv?.type === 'nj' ? schoolOv.school_id : null) ??
            importData.schools[schoolRaw]?.school_id ??
            Number(schoolIdStr)
          toCreate.push({ name: nameRaw, school_id: effectiveSchoolId })
          toCreateKeys.add(keyField)
        }
      }
    }
  }

  // ── Create new wrestlers ─────────────────────────────────────────────────────
  const newWrestlerMap = new Map<string, string>()  // wrestlerKey → new uuid

  if (toCreate.length > 0) {
    const lastNames = [...new Set(toCreate.map(w => parseName(w.name).last_name).filter(Boolean))]
    const existingRes = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('last_name', lastNames)
      .eq('gender', 'M')
    const existing = new Map(
      (existingRes.data ?? []).map(r => [`${r.first_name}|${r.last_name}`, r.id])
    )

    const toInsert: { first_name: string; last_name: string; gender: string }[] = []
    const insertKeys: string[] = []  // parallel array: wrestler key

    for (const [i, w] of toCreate.entries()) {
      const parsed = parseName(w.name)
      const existKey = `${parsed.first_name}|${parsed.last_name}`
      const wrestlerKey = [...toCreateKeys][i]
      if (existing.has(existKey)) {
        newWrestlerMap.set(wrestlerKey, existing.get(existKey)!)
      } else {
        toInsert.push({ ...parsed, gender: 'M' })
        insertKeys.push(wrestlerKey)
      }
    }

    if (toInsert.length > 0) {
      const { data: created, error } = await supabase
        .from('wrestlers')
        .insert(toInsert)
        .select('id')
      if (error) return NextResponse.json({ error: `Wrestler creation failed: ${error.message}` }, { status: 500 })
      for (const [i, row] of (created ?? []).entries()) {
        newWrestlerMap.set(insertKeys[i], row.id)
      }
    }
  }

  // ── Helper: resolve final wrestler_id for a bout side ─────────────────────
  function resolveWrestlerId(key: string | null, schoolRaw: string): string | null {
    if (!key) return null
    const override = wrestlerOverrides[key]
    if (override?.type === 'existing') return override.wrestler_id
    if (override?.type === 'new' || importData.wrestlers[key]?.is_new) {
      return newWrestlerMap.get(key) ?? null
    }
    return importData.wrestlers[key]?.wrestler_id ?? null
  }

  function resolveSchoolId(rawName: string): number | null {
    const ov = schoolOverrides[rawName]
    if (ov?.type === 'nj') return ov.school_id
    if (ov?.type === 'oos') return null
    return importData.schools[rawName]?.school_id ?? null
  }

  // ── Process each tournament ─────────────────────────────────────────────────
  let totalInserted = 0
  const errors: string[] = []

  for (const t of importData.tournaments) {
    if (t.skipped || t.bouts.length === 0) continue

    let tid: string
    try {
      tid = await ensureTournament(t.name, t.existing_id, t.start_date, t.end_date, supabase)
    } catch (err) {
      errors.push(String(err))
      continue
    }

    // Skip if already has bouts
    const existingBouts = await supabase
      .from('tournament_bouts')
      .select('id', { count: 'exact', head: true })
      .eq('in_season_tournament_id', tid)
    if ((existingBouts.count ?? 0) > 0) {
      errors.push(`Skipped "${t.name}" — already has bouts in DB`)
      continue
    }

    const rows = t.bouts.map((bout: BoutRow) => ({
      in_season_tournament_id: tid,
      weight_class:            bout.weight,
      round:                   bout.round,
      nj_wrestler1_id:         resolveWrestlerId(bout.winner_key, bout.winner_school_raw),
      wrestler1_name_raw:      bout.winner_name,
      wrestler1_school_id:     resolveSchoolId(bout.winner_school_raw),
      wrestler1_school_raw:    importData.schools[bout.winner_school_raw]?.display_name ?? bout.winner_school_raw,
      nj_wrestler2_id:         resolveWrestlerId(bout.loser_key, bout.loser_school_raw),
      wrestler2_name_raw:      bout.loser_name,
      wrestler2_school_id:     resolveSchoolId(bout.loser_school_raw),
      wrestler2_school_raw:    importData.schools[bout.loser_school_raw]?.display_name ?? bout.loser_school_raw,
      winner:                  1,
      result_type:             bout.result_type,
      result_detail:           bout.result_detail,
      fall_time_seconds:       bout.fall_time_seconds,
      source_format:           importData.source_format,
    }))

    let inserted = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { data, error } = await supabase
        .from('tournament_bouts')
        .insert(rows.slice(i, i + CHUNK))
        .select('id')
      if (error) { errors.push(`"${t.name}" chunk insert: ${error.message}`); break }
      inserted += (data ?? []).length
    }
    totalInserted += inserted
  }

  return NextResponse.json({
    inserted: totalInserted,
    created:  newWrestlerMap.size,
    errors,
  })
}
