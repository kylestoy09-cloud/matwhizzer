// ─────────────────────────────────────────────────────────────────────────────
// import-meets/route.ts
// Server action for Stage 5: write imported dual meets to the database.
//
// Steps:
//   1. Collect all isNew wrestlers across all non-skipped meets
//   2. Check which already exist in wrestlers table; INSERT only truly new ones
//   3. For each non-skipped meet: INSERT dual_meets row, then INSERT all
//      dual_meet_matches rows in one batch
//
// season_id is hardcoded to 2 (current season). Add UI selector later.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import type { ParsedMeet } from '@/lib/parseDualMeet'
import type { SchoolMatch } from '@/lib/matchSchools'
import type { WrestlerMatch } from '@/lib/matchWrestlers'
import { clearWrestlerCache } from '@/lib/matchWrestlers'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
} from '@/app/admin/import/types'

export const dynamic = 'force-dynamic'

const SEASON_ID = 2

// ── Request shape ──────────────────────────────────────────────────────────────

type ImportRequest = {
  meets:               ParsedMeet[]
  skipped:             number[]
  schoolResolutions:   Record<string, SchoolMatch>
  schoolOverrides:     Record<string, SchoolOverride>
  wrestlerResolutions: Record<string, WrestlerMatch>
  wrestlerOverrides:   Record<string, WrestlerOverride>
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** 'MM/DD/YYYY' → 'YYYY-MM-DD' */
function toISODate(d: string): string {
  const [mm, dd, yyyy] = d.split('/')
  return `${yyyy}-${mm}-${dd}`
}

/** 'M:SS' or 'MM:SS' → total seconds, or null */
function parseFallTime(detail: string | null): number | null {
  if (!detail) return null
  const m = detail.match(/^(\d+):(\d{2})$/)
  if (!m) return null
  return parseInt(m[1]) * 60 + parseInt(m[2])
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

function parseName(raw: string): { first_name: string; last_name: string; suffix: string | null } {
  const parts = raw.trim().split(/\s+/)
  if (parts.length <= 1) return { first_name: raw.trim(), last_name: '', suffix: null }

  let suffix: string | null = null
  let lastIdx = parts.length - 1
  const lastNorm = parts[lastIdx].toLowerCase().replace(/\.$/, '')

  if (SUFFIXES.has(lastNorm)) {
    suffix = parts[lastIdx]
    lastIdx--
    if (lastIdx === 0) return { first_name: parts[0], last_name: '', suffix }
  }

  return {
    first_name: parts.slice(0, lastIdx).join(' '),
    last_name:  parts[lastIdx],
    suffix,
  }
}

/** Inline resolvers — avoids cross-layer import of UI types.ts helpers. */
function resolveSchoolId(
  rawName:   string,
  resMap:    Record<string, SchoolMatch>,
  overrides: Record<string, SchoolOverride>,
): number | null {
  const ovr = overrides[rawName]
  if (ovr) return ovr.schoolId
  return resMap[rawName]?.schoolId ?? null
}

/**
 * Like resolveSchoolId but falls back to the OOS stub school map.
 * Returns { schoolId, isOos } — isOos=true when the school has no NJ record.
 */
function resolveSchoolFull(
  rawName:   string,
  resMap:    Record<string, SchoolMatch>,
  overrides: Record<string, SchoolOverride>,
  oosMap:    Map<string, number>,
): { schoolId: number | null; isOos: boolean } {
  const njId = resolveSchoolId(rawName, resMap, overrides)
  if (njId !== null) return { schoolId: njId, isOos: false }
  const oosId = oosMap.get(rawName) ?? null
  return { schoolId: oosId, isOos: true }
}

function resolveWrestlerId(
  key:         WrestlerKey,
  resMap:      Record<string, WrestlerMatch>,
  overrides:   Record<string, WrestlerOverride>,
): { wrestlerId: string | null; isNew: boolean } {
  const ovr = overrides[key]
  if (ovr) return { wrestlerId: ovr.wrestlerId, isNew: ovr.confirmedNew }
  const res = resMap[key]
  if (!res) return { wrestlerId: null, isNew: true }
  return { wrestlerId: res.wrestlerId, isNew: res.isNew }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ImportRequest = await req.json().catch(() => null)
  if (!body?.meets) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const {
    meets, skipped,
    schoolResolutions, schoolOverrides,
    wrestlerResolutions, wrestlerOverrides,
  } = body

  const skippedSet = new Set(skipped)

  // Service-role client — required for INSERT
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  // ── Phase 0: Pre-create OOS stub schools ──────────────────────────────────────
  // School names that don't resolve to an NJ school ID get a stub row in the
  // schools table (is_nj=false).  This gives them a real FK-safe integer ID so
  // dual_meets and dual_meet_matches can store it rather than NULL, enabling
  // schedule display, wrestler match history, and the future common-opponent
  // feature to work across state lines without full school profiles.

  const oosSchoolMap = new Map<string, number>()  // raw display name → stub id

  {
    const unresolvedNames = new Set<string>()
    for (let i = 0; i < meets.length; i++) {
      if (skippedSet.has(i)) continue
      const meet = meets[i]
      for (const rawName of [meet.team1Name, meet.team2Name]) {
        if (rawName && resolveSchoolId(rawName, schoolResolutions, schoolOverrides) === null) {
          unresolvedNames.add(rawName)
        }
      }
      for (const match of meet.matches) {
        for (const raw of [match.winnerSchoolRaw, match.loserSchoolRaw]) {
          if (raw && resolveSchoolId(raw, schoolResolutions, schoolOverrides) === null) {
            unresolvedNames.add(raw)
          }
        }
      }
    }

    if (unresolvedNames.size > 0) {
      // Fetch existing OOS stubs by display_name
      const { data: existingOos } = await supabase
        .from('schools')
        .select('id, display_name')
        .in('display_name', [...unresolvedNames])
        .eq('is_nj', false)

      for (const s of existingOos ?? []) {
        oosSchoolMap.set(s.display_name, s.id as number)
      }

      // Create any that don't exist yet
      const toCreate = [...unresolvedNames].filter(n => !oosSchoolMap.has(n))
      if (toCreate.length > 0) {
        const { data: created, error: oosErr } = await supabase
          .from('schools')
          .insert(toCreate.map(name => ({ display_name: name, is_nj: false })))
          .select('id, display_name')

        if (oosErr) {
          return NextResponse.json(
            { error: `Failed to create OOS school stubs: ${oosErr.message}` },
            { status: 500 },
          )
        }
        for (const s of created ?? []) {
          oosSchoolMap.set(s.display_name, s.id as number)
        }
      }
    }
  }

  // ── Step 1: Collect new wrestlers needed across all meets ─────────────────────
  // key → { first_name, last_name, suffix, gender }
  const newWrestlerMeta = new Map<
    WrestlerKey,
    { first_name: string; last_name: string; suffix: string | null; gender: string; is_stub: boolean }
  >()

  for (let i = 0; i < meets.length; i++) {
    if (skippedSet.has(i)) continue
    const meet = meets[i]

    for (const match of meet.matches) {
      if (match.isDoubleForfeit) continue

      const candidates: [string | null, string | null][] = [
        [match.winnerName, match.winnerSchoolRaw],
      ]
      if (!match.isForfeitWin) {
        candidates.push([match.loserName, match.loserSchoolRaw])
      }

      for (const [name, schoolRaw] of candidates) {
        if (!name) continue
        const { schoolId, isOos } = resolveSchoolFull(schoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
        const key = makeWrestlerKey(name, schoolId, match.weightClass)
        const { isNew, wrestlerId } = resolveWrestlerId(key, wrestlerResolutions, wrestlerOverrides)

        if (isNew && !wrestlerId) {
          newWrestlerMeta.set(key, { ...parseName(name), gender: 'M', is_stub: isOos })
        }
      }
    }
  }

  // ── Step 2: Resolve/create wrestler IDs ──────────────────────────────────────
  // Map WrestlerKey → uuid
  const wrestlerIdMap = new Map<WrestlerKey, string>()

  // Pre-fill from already-matched wrestlers
  for (let i = 0; i < meets.length; i++) {
    if (skippedSet.has(i)) continue
    for (const match of meets[i].matches) {
      if (match.isDoubleForfeit) continue
      const pairs: [string | null, string | null][] = [
        [match.winnerName, match.winnerSchoolRaw],
        ...(!match.isForfeitWin ? [[match.loserName, match.loserSchoolRaw] as [string | null, string | null]] : []),
      ]
      for (const [name, schoolRaw] of pairs) {
        if (!name) continue
        const { schoolId } = resolveSchoolFull(schoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
        const key = makeWrestlerKey(name, schoolId, match.weightClass)
        const { wrestlerId } = resolveWrestlerId(key, wrestlerResolutions, wrestlerOverrides)
        if (wrestlerId) wrestlerIdMap.set(key, wrestlerId)
      }
    }
  }

  // Create new wrestlers
  let wrestlersCreated = 0
  if (newWrestlerMeta.size > 0) {
    // Deduplicate by (first_name, last_name, gender)
    const uniqueNew = [
      ...new Map(
        [...newWrestlerMeta.values()].map(w => [`${w.first_name}|${w.last_name}|${w.gender}`, w])
      ).values()
    ]

    // Fetch any that already exist (e.g. previously imported)
    const firstNames = [...new Set(uniqueNew.map(w => w.first_name))]
    const { data: existing } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name, gender')
      .in('first_name', firstNames)

    const existingMap = new Map<string, string>()  // "first|last|gender" → id
    for (const w of existing ?? []) {
      existingMap.set(`${w.first_name}|${w.last_name}|${w.gender}`, w.id)
    }

    const trulyNew = uniqueNew.filter(
      w => !existingMap.has(`${w.first_name}|${w.last_name}|${w.gender}`)
    )

    if (trulyNew.length > 0) {
      const { data: created, error: createErr } = await supabase
        .from('wrestlers')
        .insert(trulyNew.map(w => ({
          first_name: w.first_name,
          last_name:  w.last_name,
          suffix:     w.suffix,
          gender:     w.gender,
          is_stub:    w.is_stub,
        })))
        .select('id, first_name, last_name, gender')

      if (createErr) {
        return NextResponse.json(
          { error: `Failed to create wrestlers: ${createErr.message}` },
          { status: 500 },
        )
      }

      for (const w of created ?? []) {
        existingMap.set(`${w.first_name}|${w.last_name}|${w.gender}`, w.id)
        wrestlersCreated++
      }
    }

    // Map keys → IDs for new wrestlers
    for (const [key, v] of newWrestlerMeta.entries()) {
      const id = existingMap.get(`${v.first_name}|${v.last_name}|${v.gender}`)
      if (id) wrestlerIdMap.set(key, id)
    }
  }

  // ── Step 3: Import each meet ──────────────────────────────────────────────────
  let meetsImported   = 0
  let matchesImported = 0
  const errors: string[] = []

  // Collect raw_name → wrestler_id aliases for NJ wrestlers across all meets
  const aliasMap = new Map<string, { raw_name: string; school_id: number; wrestler_id: string }>()

  for (let i = 0; i < meets.length; i++) {
    if (skippedSet.has(i)) continue
    const meet = meets[i]

    const { schoolId: team1SchoolId } = resolveSchoolFull(meet.team1Name, schoolResolutions, schoolOverrides, oosSchoolMap)
    const { schoolId: team2SchoolId } = resolveSchoolFull(meet.team2Name, schoolResolutions, schoolOverrides, oosSchoolMap)

    // Insert dual_meets row
    const { data: meetRow, error: meetErr } = await supabase
      .from('dual_meets')
      .insert({
        season_id:              SEASON_ID,
        team1_school_id:        team1SchoolId,
        team2_school_id:        team2SchoolId,
        team1_school_name_raw:  meet.team1Name,
        team2_school_name_raw:  meet.team2Name,
        meet_date:              toISODate(meet.date),
        team1_score:            meet.team1Score || null,
        team2_score:            meet.team2Score || null,
        gender:                 'M',
        status:                 'final',
      })
      .select('id')
      .single()

    if (meetErr || !meetRow) {
      errors.push(
        `Meet ${i + 1} (${meet.team1Name} vs ${meet.team2Name}): ${meetErr?.message ?? 'no row returned'}`
      )
      continue
    }

    const dualMeetId = meetRow.id as string
    meetsImported++

    // Build match rows
    const matchRows = []
    for (const match of meet.matches) {
      // Resolve each side's school (NJ or OOS stub)
      const { schoolId: winnerSchoolId } = resolveSchoolFull(match.winnerSchoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
      const { schoolId: loserSchoolId  } = resolveSchoolFull(match.loserSchoolRaw  ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)

      // Resolve wrestler IDs
      let winnerWrestlerId: string | null = null
      let loserWrestlerId:  string | null = null

      if (!match.isDoubleForfeit && match.winnerName) {
        const key = makeWrestlerKey(match.winnerName, winnerSchoolId, match.weightClass)
        winnerWrestlerId = wrestlerIdMap.get(key) ?? null
        // Save alias for NJ wrestlers
        const { isOos: winnerOos } = resolveSchoolFull(match.winnerSchoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
        if (!winnerOos && winnerSchoolId && winnerWrestlerId) {
          aliasMap.set(`${match.winnerName}|${winnerSchoolId}`, {
            raw_name: match.winnerName, school_id: winnerSchoolId, wrestler_id: winnerWrestlerId,
          })
        }
      }
      if (!match.isDoubleForfeit && !match.isForfeitWin && match.loserName) {
        const key = makeWrestlerKey(match.loserName, loserSchoolId, match.weightClass)
        loserWrestlerId = wrestlerIdMap.get(key) ?? null
        // Save alias for NJ wrestlers
        const { isOos: loserOos } = resolveSchoolFull(match.loserSchoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
        if (!loserOos && loserSchoolId && loserWrestlerId) {
          aliasMap.set(`${match.loserName}|${loserSchoolId}`, {
            raw_name: match.loserName, school_id: loserSchoolId, wrestler_id: loserWrestlerId,
          })
        }
      }

      // Assign team A (= team1) vs team B (= team2) slots.
      // If winner's school matches team1's school, winner is A; otherwise winner is B.
      const winnerIsTeam1 =
        team1SchoolId !== null && winnerSchoolId === team1SchoolId

      let wrestlerAId: string | null
      let wrestlerBId: string | null
      let wrestlerANameRaw: string | null
      let wrestlerBNameRaw: string | null

      if (match.isDoubleForfeit) {
        wrestlerAId = null
        wrestlerBId = null
        wrestlerANameRaw = null
        wrestlerBNameRaw = null
      } else if (match.isForfeitWin) {
        wrestlerAId      = winnerIsTeam1 ? winnerWrestlerId   : null
        wrestlerBId      = winnerIsTeam1 ? null               : winnerWrestlerId
        wrestlerANameRaw = winnerIsTeam1 ? match.winnerName   : null
        wrestlerBNameRaw = winnerIsTeam1 ? null               : match.winnerName
      } else {
        wrestlerAId      = winnerIsTeam1 ? winnerWrestlerId   : loserWrestlerId
        wrestlerBId      = winnerIsTeam1 ? loserWrestlerId    : winnerWrestlerId
        wrestlerANameRaw = winnerIsTeam1 ? match.winnerName   : match.loserName
        wrestlerBNameRaw = winnerIsTeam1 ? match.loserName    : match.winnerName
      }

      matchRows.push({
        dual_meet_id:         dualMeetId,
        weight_class:         match.weightClass,
        wrestler_a_id:        wrestlerAId,
        wrestler_b_id:        wrestlerBId,
        wrestler_a_name_raw:  wrestlerANameRaw,
        wrestler_b_name_raw:  wrestlerBNameRaw,
        school_a_id:          team1SchoolId,
        school_b_id:          team2SchoolId,
        winner_id:            winnerWrestlerId,
        result_type:          match.resultType,
        result_detail:        match.resultDetail,
        fall_time_seconds:    match.resultType === 'Fall' ? parseFallTime(match.resultDetail) : null,
        team1_points:         match.team1Points,
        team2_points:         match.team2Points,
        is_double_forfeit:    match.isDoubleForfeit,
        is_forfeit_win:       match.isForfeitWin,
        validated:            false,
      })
    }

    if (matchRows.length > 0) {
      const { error: matchErr } = await supabase
        .from('dual_meet_matches')
        .insert(matchRows)

      if (matchErr) {
        errors.push(`Meet ${i + 1} matches: ${matchErr.message}`)
      } else {
        matchesImported += matchRows.length
      }
    }
  }

  // ── Step 4: Persist name aliases for future imports ──────────────────────────
  if (aliasMap.size > 0) {
    await supabase
      .from('wrestler_name_aliases')
      .upsert([...aliasMap.values()], { onConflict: 'raw_name,school_id' })
    // Invalidate the in-process cache so next match-wrestlers call picks up new aliases
    clearWrestlerCache()
  }

  return NextResponse.json({
    ok:               errors.length === 0,
    meetsImported,
    matchesImported,
    wrestlersCreated,
    errors,
  })
}
