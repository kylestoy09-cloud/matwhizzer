// POST /api/admin/csv/save
// Saves a parsed CSV tournament to the DB: creates/links tournament row,
// inserts seeds, inserts bouts.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseCsvBouts } from '@/lib/parseCsvBouts'
import { matchSchoolNames, clearSchoolCache } from '@/lib/matchSchools'
import { matchWrestler, clearWrestlerCache } from '@/lib/matchWrestlers'
import { boutResultToDb } from '@/lib/parseRtf'
import type { SchoolOverride, WrestlerOverride } from '@/app/admin/import-rtf/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const SEASON = '2025-26'
const CHUNK = 200

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const authClient = await createSupabaseServer()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let csvText: string
  let tournamentName: string
  let startDate: string
  let endDate: string | null
  let gender: 'M' | 'F'
  let force: boolean
  let schoolOverrides: Record<string, SchoolOverride>
  let wrestlerOverrides: Record<string, WrestlerOverride>
  let existingId: string | null
  try {
    const body = await req.json()
    csvText         = body.csvText
    tournamentName  = body.tournamentName
    startDate       = body.startDate
    endDate         = body.endDate ?? null
    gender          = body.gender ?? 'M'
    force           = body.force ?? false
    schoolOverrides = body.schoolOverrides ?? {}
    wrestlerOverrides = body.wrestlerOverrides ?? {}
    existingId      = body.existingId ?? null
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const istTable   = gender === 'F' ? 'in_season_tournaments_girls'      : 'in_season_tournaments'
  const boutTable  = gender === 'F' ? 'tournament_bouts_girls'           : 'tournament_bouts'
  const seedsTable = gender === 'F' ? 'in_season_tournament_seeds_girls' : 'in_season_tournament_seeds'

  const { bouts, seeds } = parseCsvBouts(csvText)
  if (bouts.length === 0) return NextResponse.json({ error: 'No bouts found in CSV' }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client = serviceClient() as any
  clearSchoolCache()
  clearWrestlerCache()

  // ── School cache ───────────────────────────────────────────────────────────
  const allSchoolRaws = new Set<string>()
  for (const b of bouts) {
    allSchoolRaws.add(b.winner_school)
    allSchoolRaws.add(b.loser_school)
  }

  type ResolvedSchool = {
    school_id: number | null
    display_name: string | null
    confidence: string
  }

  const schoolCache = new Map<string, ResolvedSchool>()

  async function findOrCreateOosSchool(raw: string): Promise<number> {
    const existing = await client.from('schools').select('id').eq('display_name', raw).eq('is_nj', false).maybeSingle()
    if (existing.data?.id) return existing.data.id
    const ins = await client.from('schools').insert({ display_name: raw, is_nj: false }).select('id').single()
    if (ins.error) throw new Error(`OOS school insert failed for "${raw}": ${ins.error.message}`)
    return ins.data.id
  }

  for (const raw of allSchoolRaws) {
    const override = schoolOverrides[raw]
    if (override?.type === 'skip') {
      schoolCache.set(raw, { school_id: null, display_name: null, confidence: 'skip' })
    } else if (override?.type === 'oos') {
      const school_id = override.school_id != null
        ? override.school_id
        : await findOrCreateOosSchool(override.display_name ?? raw)
      const display_name = override.display_name ?? raw
      schoolCache.set(raw, { school_id, display_name, confidence: 'oos' })
      await client.from('school_aliases')
        .insert({ school_id: null, alias: raw, alias_type: 'oos', notes: String(school_id) })
        .then(() => {}).catch((e: { code?: string }) => { if (e?.code !== '23505') throw e })
    } else if (override?.type === 'nj') {
      schoolCache.set(raw, { school_id: override.school_id, display_name: override.display_name, confidence: 'exact' })
      await client.from('school_aliases')
        .insert({ school_id: override.school_id, alias: raw, alias_type: 'nj' })
        .then(() => {}).catch(() => {})
    } else {
      const m = await matchSchoolNames(raw)
      schoolCache.set(raw, { school_id: m.schoolId, display_name: m.displayName, confidence: m.confidence })
    }
  }

  // ── Tournament row ─────────────────────────────────────────────────────────
  let tid: string

  if (existingId) {
    tid = existingId
    await client.from(istTable)
      .update({ source_format: 'csv', tournament_type: 'inside_outside' })
      .eq('id', tid)
  } else {
    const exactRow = await client
      .from(istTable)
      .select('id')
      .eq('name', tournamentName)
      .eq('season', SEASON)
      .maybeSingle()

    if (exactRow.data?.id) {
      tid = exactRow.data.id
    } else {
      const ins = await client.from(istTable).insert({
        name: tournamentName,
        season: SEASON,
        start_date: startDate,
        end_date: endDate ?? undefined,
        source_format: 'csv',
        tournament_type: 'inside_outside',
      }).select('id').single()
      if (ins.error) return NextResponse.json({ error: `Tournament create failed: ${ins.error.message}` }, { status: 500 })
      tid = ins.data.id
    }
  }

  // ── Link to tournament_registry if a matching entry exists ────────────────
  // Match by exact name + season + gender (or gender='both') where not yet linked
  const registryMatch = await client
    .from('tournament_registry')
    .select('id, in_season_tournament_id')
    .eq('season', SEASON)
    .in('gender', [gender, 'both'])
    .ilike('name', tournamentName)
    .maybeSingle()

  if (registryMatch.data) {
    const reg = registryMatch.data as { id: string; in_season_tournament_id: string | null }
    if (!reg.in_season_tournament_id) {
      await client.from('tournament_registry')
        .update({ in_season_tournament_id: tid, imported: true })
        .eq('id', reg.id)
    }
  }

  // ── Check existing bouts ───────────────────────────────────────────────────
  const existingBoutsQ = await client
    .from(boutTable)
    .select('id', { count: 'exact', head: true })
    .eq('in_season_tournament_id', tid)
  const hasBouts = (existingBoutsQ.count ?? 0) > 0

  // If the tournament already has bouts (from a prior RTF/paste import that was
  // carefully reviewed and wrestler-matched), don't touch them. The CSV's value
  // in that case is seeds only — bout data from a reviewed import is always better
  // than what the CSV can produce. Only force=true wipes and replaces everything.
  const seedsOnly = hasBouts && !force

  if (hasBouts && force) {
    await client.from(boutTable).delete().eq('in_season_tournament_id', tid)
    await client.from(seedsTable).delete().eq('in_season_tournament_id', tid)
  }

  // ── Seeds ──────────────────────────────────────────────────────────────────
  const seedRows = seeds.map(s => {
    const school = schoolCache.get(s.school)
    return {
      in_season_tournament_id: tid,
      weight_class: s.weight,
      seed: s.seed,
      wrestler_name_raw: s.name,
      school_name_raw: school?.display_name ?? s.school,  // use DB display name, not raw string
      school_id: school?.school_id ?? null,
      wrestler_id: null as string | null,
    }
  })

  // Resolve wrestler_id for seeds.
  // Secondary mode (seedsOnly): look up by (tournament_id, school_id, weight_class) from existing RTF bouts —
  // a school sends exactly one wrestler per weight class, so this key is unique and avoids all name matching.
  // Primary mode: use matchWrestler with initial+last name from CSV.
  for (const row of seedRows) {
    if (!row.school_id) continue
    if (seedsOnly) {
      // Check wrestler1 side first, then wrestler2 side
      const { data: w1 } = await client
        .from(boutTable)
        .select('wrestler1_id')
        .eq('in_season_tournament_id', tid)
        .eq('wrestler1_school_id', row.school_id)
        .eq('weight_class', row.weight_class)
        .not('wrestler1_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (w1?.wrestler1_id) { row.wrestler_id = w1.wrestler1_id; continue }
      const { data: w2 } = await client
        .from(boutTable)
        .select('wrestler2_id')
        .eq('in_season_tournament_id', tid)
        .eq('wrestler2_school_id', row.school_id)
        .eq('weight_class', row.weight_class)
        .not('wrestler2_id', 'is', null)
        .limit(1)
        .maybeSingle()
      if (w2?.wrestler2_id) row.wrestler_id = w2.wrestler2_id
    } else {
      const { initial, lastName } = parseInitialName(row.wrestler_name_raw)
      if (!initial || !lastName) continue
      const flagKey = `${row.wrestler_name_raw}|${row.school_id}|${row.weight_class}`
      const ov = wrestlerOverrides[flagKey]
      if (ov?.type === 'existing') {
        row.wrestler_id = ov.wrestler_id
      } else {
        const wm = await matchWrestler(row.wrestler_name_raw, row.school_id, row.weight_class, gender)
        if (!wm.isNew && wm.wrestlerId) row.wrestler_id = wm.wrestlerId
      }
    }
  }

  // Replace raw wrestler names with proper DB names for any resolved seeds
  const seedWrestlerIds = seedRows.map(r => r.wrestler_id).filter(Boolean) as string[]
  if (seedWrestlerIds.length) {
    const { data: wRows } = await client.from('wrestlers').select('id, first_name, last_name').in('id', seedWrestlerIds)
    const seedNameMap = new Map<string, string>((wRows ?? []).map((w: { id: string; first_name: string; last_name: string }) => [w.id, `${w.first_name} ${w.last_name}`.trim()]))
    for (const row of seedRows) {
      if (row.wrestler_id && seedNameMap.has(row.wrestler_id)) {
        row.wrestler_name_raw = seedNameMap.get(row.wrestler_id)!
      }
    }
  }

  let seeds_inserted = 0
  for (let i = 0; i < seedRows.length; i += CHUNK) {
    const res = await client.from(seedsTable)
      .insert(seedRows.slice(i, i + CHUNK))
    if (res.error && res.error.code !== '23505') {
      return NextResponse.json({ error: `Seed insert failed: ${res.error.message}` }, { status: 500 })
    }
    seeds_inserted += seedRows.slice(i, i + CHUNK).length
  }

  // ── Wrestlers: collect new ones, resolve IDs ───────────────────────────────
  // Skipped in secondary mode (seedsOnly) — wrestler IDs are already in the DB from the RTF import.
  // Bout rows are still built below for the round-merge pass, but no new wrestlers are created.
  type NewWrestler = { name: string; school_id: number; first_name: string; last_name: string; is_oos: boolean }
  const newWrestlers: NewWrestler[] = []
  const seenNew = new Set<string>()
  const overrideExistingMap = new Map<string, string>()  // `${name}|${school_id}` → wrestler_id or '__skip__'
  const newWrestlerMap = new Map<string, string>()

  if (!seedsOnly) {
    const allWrestlerRefs: Array<{ name: string; school_raw: string; weight: number }> = []
    for (const b of bouts) {
      allWrestlerRefs.push({ name: b.winner_name, school_raw: b.winner_school, weight: b.weight })
      allWrestlerRefs.push({ name: b.loser_name, school_raw: b.loser_school, weight: b.weight })
    }
    const seenWRef = new Set<string>()

    for (const { name, school_raw, weight } of allWrestlerRefs) {
      const school = schoolCache.get(school_raw)
      const school_id = school?.school_id ?? null
      if (!school_id) continue
      const nkey = `${name}|${school_id}`
      if (seenWRef.has(nkey)) continue
      seenWRef.add(nkey)

      const flagKey = `${name}|${school_id}|${weight}`
      const ov = wrestlerOverrides[flagKey]
      const isOos = school?.confidence === 'oos'

      if (ov?.type === 'skip') {
        overrideExistingMap.set(nkey, '__skip__')
      } else if (ov?.type === 'existing') {
        overrideExistingMap.set(nkey, ov.wrestler_id)
      } else if (ov?.type === 'create') {
        if (!seenNew.has(nkey)) {
          seenNew.add(nkey)
          newWrestlers.push({ name, school_id, first_name: ov.first_name, last_name: ov.last_name, is_oos: isOos })
        }
      } else if (ov?.type === 'accept') {
        const wm = await matchWrestler(name, school_id, weight, gender)
        if (wm.wrestlerId) overrideExistingMap.set(nkey, wm.wrestlerId)
      } else {
        // No override — auto-resolve; NJ new wrestlers require explicit create
        if (!isOos) continue
        if (!seenNew.has(nkey)) {
          seenNew.add(nkey)
          const { initial, lastName } = parseInitialName(name)
          newWrestlers.push({ name, school_id, first_name: initial ? `${initial}.` : name, last_name: lastName, is_oos: true })
        }
      }
    }

    for (const w of newWrestlers) {
      const ins = await client.from('wrestlers').insert({ first_name: w.first_name, last_name: w.last_name, gender, is_oos: w.is_oos }).select('id').single()
      if (!ins.error && ins.data) {
        newWrestlerMap.set(`${w.name}|${w.school_id}`, ins.data.id)
      }
    }
  }

  // ── Bout rows ──────────────────────────────────────────────────────────────
  async function resolveWrestlerId(name: string, school_id: number | null, weight: number): Promise<string | null> {
    if (!school_id) return null
    const nkey = `${name}|${school_id}`
    const flagKey = `${name}|${school_id}|${weight}`
    const ov = wrestlerOverrides[flagKey]
    if (ov?.type === 'skip') return null
    if (ov?.type === 'existing') return ov.wrestler_id
    const cached = overrideExistingMap.get(nkey)
    if (cached === '__skip__') return null
    if (cached) return cached
    if (newWrestlerMap.has(nkey)) return newWrestlerMap.get(nkey)!
    const wm = await matchWrestler(name, school_id, weight, gender)
    return wm.wrestlerId ?? null
  }

  // Build a proper name map for all resolved wrestler IDs so we store the clean
  // site name in name_raw instead of the ugly import format ("A. Spina" → "Anthony Spina").
  const resolvedIds = new Set<string>()
  for (const [nkey, wid] of [...overrideExistingMap, ...newWrestlerMap]) {
    if (wid && wid !== '__skip__') resolvedIds.add(wid)
    void nkey
  }
  const wrestlerNameMap = new Map<string, string>()
  if (resolvedIds.size) {
    const { data: wRows } = await client.from('wrestlers').select('id, first_name, last_name').in('id', [...resolvedIds])
    for (const w of wRows ?? []) {
      const fullName = `${(w as { first_name: string; last_name: string }).first_name} ${(w as { first_name: string; last_name: string }).last_name}`.trim()
      wrestlerNameMap.set((w as { id: string }).id, fullName)
    }
  }

  const boutRows = []
  const seenBout = new Set<string>()

  for (const b of bouts) {
    const { db_type, db_detail, fall_time_seconds, result_time_estimated, winner_score, loser_score, winner } = boutResultToDb(b.result_type, b.result_detail)
    if (db_type === null && winner === null) continue

    const s1 = schoolCache.get(b.winner_school)
    const s2 = schoolCache.get(b.loser_school)

    const w1id = await resolveWrestlerId(b.winner_name, s1?.school_id ?? null, b.weight)
    const w2id = await resolveWrestlerId(b.loser_name, s2?.school_id ?? null, b.weight)

    // Dedup by ID pair (catches same wrestler under different name spellings)
    if (w1id && w2id) {
      const ids = [w1id, w2id].sort()
      const k = `${b.weight}|${b.round}|${ids[0]}|${ids[1]}`
      if (seenBout.has(k)) continue
      seenBout.add(k)
    }

    // Use the clean DB name when the wrestler was matched; fall back to raw import name only for unlinked wrestlers.
    const w1name = (w1id && wrestlerNameMap.get(w1id)) || b.winner_name
    const w2name = (w2id && wrestlerNameMap.get(w2id)) || b.loser_name

    boutRows.push({
      in_season_tournament_id: tid,
      weight_class:         b.weight,
      round:                b.round,
      wrestler1_id:         w1id,
      wrestler1_name_raw:   w1name,
      wrestler1_school_raw: s1?.display_name ?? b.winner_school,
      wrestler1_school_id:  s1?.school_id ?? null,
      wrestler2_id:         w2id,
      wrestler2_name_raw:   w2name,
      wrestler2_school_raw: s2?.display_name ?? b.loser_school,
      wrestler2_school_id:  s2?.school_id ?? null,
      winner,
      result_type:          db_type,
      result_detail:        db_detail,
      fall_time_seconds,
      result_time_estimated,
      winner_score,
      loser_score,
      source_format:        'csv',
    })
  }

  let bouts_inserted = 0
  if (!seedsOnly) {
    for (let i = 0; i < boutRows.length; i += CHUNK) {
      const res = await client.from(boutTable).insert(boutRows.slice(i, i + CHUNK))
      if (res.error) return NextResponse.json({ error: `Bout insert failed: ${res.error.message}` }, { status: 500 })
      bouts_inserted += boutRows.slice(i, i + CHUNK).length
    }
  }

  // ── Round-merge pass (when existing RTF bouts need rounds from CSV) ──────────
  // Match by weight + winner school + loser school + result type.
  // result_detail breaks ties in consolation rematches (same pair, same result type, different score).
  let rounds_updated = 0
  let rounds_skipped_oos = 0
  if (seedsOnly) {
    for (const row of boutRows) {
      if (!row.wrestler1_school_id && !row.wrestler2_school_id) {
        rounds_skipped_oos++
        continue
      }
      if (!row.round || row.round === 'Unknown') continue

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q: any = client
        .from(boutTable)
        .select('id, result_detail')
        .eq('in_season_tournament_id', tid)
        .eq('weight_class', row.weight_class)
        .eq('result_type', row.result_type)

      q = row.wrestler1_school_id
        ? q.eq('wrestler1_school_id', row.wrestler1_school_id)
        : q.is('wrestler1_school_id', null)
      q = row.wrestler2_school_id
        ? q.eq('wrestler2_school_id', row.wrestler2_school_id)
        : q.is('wrestler2_school_id', null)

      const { data: matches } = await q

      if (!matches?.length) continue

      let targetId: string | null = null
      if (matches.length === 1) {
        targetId = (matches[0] as { id: string }).id
      } else {
        const exact = (matches as { id: string; result_detail: string | null }[])
          .find(m => m.result_detail === row.result_detail)
        if (exact) targetId = exact.id
      }

      if (!targetId) continue

      const { error } = await client
        .from(boutTable)
        .update({ round: row.round })
        .eq('id', targetId)

      if (!error) rounds_updated++
    }
  }

  // Update seed wrestler_id links now that wrestlers exist
  for (const row of seedRows) {
    if (row.wrestler_id) continue
    if (!row.school_id) continue
    const nkey = `${row.wrestler_name_raw}|${row.school_id}`
    const wid = overrideExistingMap.get(nkey) ?? newWrestlerMap.get(nkey)
    if (wid && wid !== '__skip__') {
      await client.from(seedsTable)
        .update({ wrestler_id: wid })
        .eq('in_season_tournament_id', tid)
        .eq('weight_class', row.weight_class)
        .eq('seed', row.seed)
    }
  }

  return NextResponse.json({
    tournament_id: tid,
    bouts_inserted,
    seeds_inserted,
    wrestlers_created: newWrestlerMap.size,
    seeds_only: seedsOnly,
    rounds_updated,
    rounds_skipped_oos,
  })
}

function parseInitialName(raw: string): { initial: string; lastName: string } {
  const m = raw.trim().match(/^([A-Za-z])\.?\s+(.+)$/)
  if (m) return { initial: m[1].toUpperCase(), lastName: m[2].trim() }
  return { initial: '', lastName: raw.trim() }
}
