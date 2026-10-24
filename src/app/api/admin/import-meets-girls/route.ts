// ─────────────────────────────────────────────────────────────────────────────
// import-meets-girls/route.ts
// Server action for Stage 5: write imported GIRLS dual meets to the database.
//
// Girls weight classes: 100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235
//
// Steps:
//   1. Collect all isNew wrestlers across all non-skipped meets
//   2. Check which already exist in wrestlers table; INSERT only truly new ones
//   3. For each non-skipped meet: INSERT dual_meets row, then INSERT each
//      dual_meet_matches row individually (allows tri-meet/jamboree duplicate
//      weight classes to be flagged as warnings rather than failing the whole meet)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseDualMeetGirlsText } from '@/lib/parseDualMeetGirls'
import { parseJamboreeGirlsText } from '@/lib/parseJamboreeGirls'
import { matchSchoolNames } from '@/lib/matchSchools'
import { matchWrestler, reloadAliases, clearWrestlerCache } from '@/lib/matchWrestlers'
import { boutResultToDb } from '@/lib/parseRtf'
import {
  type SchoolOverride,
  type WrestlerOverride,
  type WrestlerKey,
  makeWrestlerKey,
} from '@/app/admin/import/types'

export const dynamic = 'force-dynamic'

const GENDER = 'F' as const

// ── Request shape ──────────────────────────────────────────────────────────────

type SlimSchoolMatch   = { rawName: string; schoolId: number | null; confidence: string }
type SlimWrestlerMatch = { wrestlerId: string | null; isNew: boolean }

type ImportRequest = {
  draftId: string
  skipped: number[]
  seasonId: number
  // Set by the jamboree import page. Each pairwise pseudo-dual it produces is
  // stored as meet_kind 'jamboree' and excluded from team W-L / Power Points.
  meetKind?: 'dual' | 'jamboree'
  // Required when meetKind is 'jamboree': the event date (MM/DD/YYYY). Jamboree
  // listings carry no per-meet date line, so the parser takes it as an argument.
  jamboreeDate?: string
}

// Meets with this many bouts are one-or-two-wrestler "random" meets. They are
// tagged meet_kind 'partial' (same rule as the 20260920 backfill) but still
// count toward team W-L until records are reviewed against official standings.
const PARTIAL_MAX_BOUTS = 2

// ── Helpers ────────────────────────────────────────────────────────────────────

function toISODate(d: string): string {
  const [mm, dd, yyyy] = d.split('/')
  return `${yyyy}-${mm}-${dd}`
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

function resolveSchoolId(
  rawName:   string,
  resMap:    Record<string, SlimSchoolMatch>,
  overrides: Record<string, SchoolOverride>,
): number | null {
  const ovr = overrides[rawName]
  if (ovr) return ovr.schoolId
  return resMap[rawName]?.schoolId ?? null
}

function resolveSchoolFull(
  rawName:   string,
  resMap:    Record<string, SlimSchoolMatch>,
  overrides: Record<string, SchoolOverride>,
  oosMap:    Map<string, number>,
): { schoolId: number | null; isOos: boolean } {
  const njId = resolveSchoolId(rawName, resMap, overrides)
  if (njId !== null) return { schoolId: njId, isOos: false }
  const oosId = oosMap.get(rawName) ?? null
  return { schoolId: oosId, isOos: true }
}

function resolveWrestlerId(
  key:       WrestlerKey,
  resMap:    Record<string, SlimWrestlerMatch>,
  overrides: Record<string, WrestlerOverride>,
): { wrestlerId: string | null; isNew: boolean } {
  const ovr = overrides[key]
  if (ovr) return { wrestlerId: ovr.wrestlerId, isNew: ovr.confirmedNew }
  const res = resMap[key]
  if (!res) return { wrestlerId: null, isNew: true }
  return { wrestlerId: res.wrestlerId, isNew: res.isNew }
}

// ── Route handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: ImportRequest = await req.json().catch(() => null)
  if (!body?.draftId) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })

  const { draftId, skipped, seasonId } = body
  const skippedSet = new Set(skipped)
  const isJamboree = body.meetKind === 'jamboree'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )

  const { data: seasonRow } = Number.isInteger(seasonId)
    ? await supabase.from('seasons').select('id').eq('id', seasonId).maybeSingle()
    : { data: null }
  if (!seasonRow) return NextResponse.json({ error: `Unknown season: ${seasonId}` }, { status: 400 })

  // ── Fetch draft ───────────────────────────────────────────────────────────────
  const { data: draft, error: draftErr } = await supabase
    .from('dual_import_drafts')
    .select('raw_text, school_overrides, wrestler_overrides, gender')
    .eq('id', draftId)
    .eq('user_id', user.id)
    .single()

  if (draftErr || !draft) {
    return NextResponse.json({ error: 'Draft not found or access denied' }, { status: 404 })
  }

  if (draft.gender !== 'F') {
    return NextResponse.json({ error: 'Draft is not a girls draft' }, { status: 400 })
  }

  const schoolOverrides:   Record<string, SchoolOverride>   = (draft.school_overrides   as Record<string, SchoolOverride>)   ?? {}
  const wrestlerOverrides: Record<string, WrestlerOverride> = (draft.wrestler_overrides as Record<string, WrestlerOverride>) ?? {}

  // ── Parse meets using girls parser ───────────────────────────────────────────
  // Jamboree drafts hold the raw event listing (no "A vs. B (date)" headers), so
  // they must be re-parsed with the jamboree parser — the same one the review
  // screen used — and it needs the event date the page collected.
  let meets
  if (isJamboree) {
    const jamboreeDate = (body.jamboreeDate ?? '').trim()
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(jamboreeDate)) {
      return NextResponse.json({ error: 'Jamboree import requires jamboreeDate in MM/DD/YYYY format' }, { status: 400 })
    }
    meets = parseJamboreeGirlsText(draft.raw_text as string, jamboreeDate)
  } else {
    meets = parseDualMeetGirlsText(draft.raw_text as string)
  }

  if (meets.length === 0) {
    return NextResponse.json({ error: 'Draft produced no parseable meets' }, { status: 400 })
  }

  // ── Match schools server-side ─────────────────────────────────────────────────
  const allSchoolNames = new Set<string>()
  for (const meet of meets) {
    allSchoolNames.add(meet.team1Name)
    allSchoolNames.add(meet.team2Name)
    for (const m of meet.matches) {
      if (m.winnerSchoolRaw) allSchoolNames.add(m.winnerSchoolRaw)
      if (m.loserSchoolRaw)  allSchoolNames.add(m.loserSchoolRaw)
    }
  }
  // Season-aware, same as the review screen: a co-op member name (e.g. "Lodi")
  // must resolve to that season's program, not the member school.
  const schoolMatchResults = await Promise.all([...allSchoolNames].map(n => matchSchoolNames(n, { gender: GENDER, seasonId })))
  const schoolResolutions: Record<string, SlimSchoolMatch> = {}
  for (const r of schoolMatchResults) {
    schoolResolutions[r.rawName] = { rawName: r.rawName, schoolId: r.schoolId, confidence: r.confidence }
  }

  // ── Match wrestlers server-side ───────────────────────────────────────────────
  await reloadAliases()

  const wrestlerInputMap = new Map<WrestlerKey, { name: string; schoolId: number | null; weightClass: number }>()
  for (const meet of meets) {
    for (const m of meet.matches) {
      if (m.isDoubleForfeit) continue
      const pairs: [string | null, string | null][] = [
        [m.winnerName, m.winnerSchoolRaw],
        ...(!m.isForfeitWin ? [[m.loserName, m.loserSchoolRaw] as [string | null, string | null]] : []),
      ]
      for (const [name, schoolRaw] of pairs) {
        if (!name) continue
        const raw = schoolRaw ?? ''
        const ovr = schoolOverrides[raw]
        if (ovr?.isOutOfState) continue
        const res = schoolResolutions[raw]
        if (res?.confidence === 'oos') continue
        const schoolId = resolveSchoolId(raw, schoolResolutions, schoolOverrides)
        const key = makeWrestlerKey(name, schoolId, m.weightClass)
        if (!wrestlerInputMap.has(key)) {
          wrestlerInputMap.set(key, { name, schoolId, weightClass: m.weightClass })
        }
      }
    }
  }

  const wKeys    = [...wrestlerInputMap.keys()]
  const wValues  = [...wrestlerInputMap.values()]
  const wResults = await Promise.all(
    wValues.map(w =>
      w.schoolId === null
        ? Promise.resolve<SlimWrestlerMatch>({ wrestlerId: null, isNew: true })
        : matchWrestler(w.name, w.schoolId, w.weightClass, GENDER)
            .then(r => ({ wrestlerId: r.wrestlerId, isNew: r.isNew } as SlimWrestlerMatch))
    )
  )
  const wrestlerResolutions: Record<string, SlimWrestlerMatch> = {}
  wKeys.forEach((k, i) => { wrestlerResolutions[k] = wResults[i] })

  // ── Phase 0: Pre-create OOS stub schools ──────────────────────────────────────
  const oosSchoolMap = new Map<string, number>()

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
      const { data: existingOos } = await supabase
        .from('schools')
        .select('id, display_name')
        .in('display_name', [...unresolvedNames])
        .eq('is_nj', false)

      for (const s of existingOos ?? []) {
        oosSchoolMap.set(s.display_name, s.id as number)
      }

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

        const isLinked = !!wrestlerOverrides[key]?.linkedToKey
        if (isNew && !wrestlerId && !isLinked) {
          newWrestlerMeta.set(key, { ...parseName(name), gender: GENDER, is_stub: isOos })
        }
      }
    }
  }

  // ── Step 2: Resolve/create wrestler IDs ──────────────────────────────────────
  const wrestlerIdMap = new Map<WrestlerKey, string>()

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

  let wrestlersCreated = 0
  if (newWrestlerMeta.size > 0) {
    const uniqueNew = [
      ...new Map(
        [...newWrestlerMeta.values()].map(w => [`${w.first_name}|${w.last_name}|${w.gender}`, w])
      ).values()
    ]

    const firstNames = [...new Set(uniqueNew.map(w => w.first_name))]
    const { data: existing } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name, gender')
      .in('first_name', firstNames)

    const existingMap = new Map<string, string>()
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

    for (const [key, v] of newWrestlerMeta.entries()) {
      const id = existingMap.get(`${v.first_name}|${v.last_name}|${v.gender}`)
      if (id) wrestlerIdMap.set(key, id)
    }
  }

  // ── Step 2b: Resolve linked entries ──────────────────────────────────────────
  for (const [keyStr, ovr] of Object.entries(wrestlerOverrides)) {
    if (ovr.linkedToKey) {
      const targetId = wrestlerIdMap.get(ovr.linkedToKey as WrestlerKey)
      if (targetId) wrestlerIdMap.set(keyStr as WrestlerKey, targetId)
    }
  }

  // ── Step 3: Import each meet ──────────────────────────────────────────────────
  let meetsImported   = 0
  let matchesImported = 0
  let meetsSkippedDup = 0
  let meetsPartial    = 0
  const errors: string[] = []

  const aliasMap = new Map<string, { raw_name: string; school_id: number; wrestler_id: string }>()

  for (let i = 0; i < meets.length; i++) {
    if (skippedSet.has(i)) continue
    const meet = meets[i]

    const { schoolId: team1SchoolId } = resolveSchoolFull(meet.team1Name, schoolResolutions, schoolOverrides, oosSchoolMap)
    const { schoolId: team2SchoolId } = resolveSchoolFull(meet.team2Name, schoolResolutions, schoolOverrides, oosSchoolMap)
    const isoDate = toISODate(meet.date)

    if (team1SchoolId && team2SchoolId) {
      const { data: existing } = await supabase
        .from('dual_meets_girls')
        .select('id')
        .eq('season_id', seasonId)
        .eq('gender', GENDER)
        .eq('meet_date', isoDate)
        .or(
          `and(team1_school_id.eq.${team1SchoolId},team2_school_id.eq.${team2SchoolId}),` +
          `and(team1_school_id.eq.${team2SchoolId},team2_school_id.eq.${team1SchoolId})`
        )
        .limit(1)

      if (existing && existing.length > 0) {
        meetsSkippedDup++
        continue
      }
    }

    const { data: meetRow, error: meetErr } = await supabase
      .from('dual_meets_girls')
      .insert({
        season_id:              seasonId,
        team1_school_id:        team1SchoolId,
        team2_school_id:        team2SchoolId,
        team1_school_name_raw:  meet.team1Name,
        team2_school_name_raw:  meet.team2Name,
        meet_date:              isoDate,
        team1_score:            meet.team1Score ?? null,
        team2_score:            meet.team2Score ?? null,
        status:                 'final',
        meet_kind:              isJamboree ? 'jamboree' : 'dual',
        counts_toward_record:   !isJamboree,
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
    let boutsInserted = 0

    // Insert matches one at a time so duplicate weight class errors (tri-meets,
    // jamborees) are collected as warnings rather than failing the whole meet.
    for (let matchIdx = 0; matchIdx < meet.matches.length; matchIdx++) {
      const match = meet.matches[matchIdx]
      const { schoolId: winnerSchoolId } = resolveSchoolFull(match.winnerSchoolRaw ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)
      const { schoolId: loserSchoolId  } = resolveSchoolFull(match.loserSchoolRaw  ?? '', schoolResolutions, schoolOverrides, oosSchoolMap)

      let winnerWrestlerId: string | null = null
      let loserWrestlerId:  string | null = null

      if (!match.isDoubleForfeit && match.winnerName) {
        const key = makeWrestlerKey(match.winnerName, winnerSchoolId, match.weightClass)
        winnerWrestlerId = wrestlerIdMap.get(key) ?? null
        if (winnerSchoolId && winnerWrestlerId) {
          aliasMap.set(`${match.winnerName}|${winnerSchoolId}`, {
            raw_name: match.winnerName, school_id: winnerSchoolId, wrestler_id: winnerWrestlerId,
          })
        }
      }
      if (!match.isDoubleForfeit && !match.isForfeitWin && match.loserName) {
        const key = makeWrestlerKey(match.loserName, loserSchoolId, match.weightClass)
        loserWrestlerId = wrestlerIdMap.get(key) ?? null
        if (loserSchoolId && loserWrestlerId) {
          aliasMap.set(`${match.loserName}|${loserSchoolId}`, {
            raw_name: match.loserName, school_id: loserSchoolId, wrestler_id: loserWrestlerId,
          })
        }
      }

      if (!match.isDoubleForfeit) {
        if (winnerSchoolId && !winnerWrestlerId) continue
        if (!match.isForfeitWin && loserSchoolId && !loserWrestlerId) continue
      }

      const winnerIsTeam1 = team1SchoolId !== null && winnerSchoolId === team1SchoolId

      let wrestlerAId: string | null
      let wrestlerBId: string | null
      let wrestlerANameRaw: string | null
      let wrestlerBNameRaw: string | null

      if (match.isDoubleForfeit) {
        wrestlerAId = null; wrestlerBId = null
        wrestlerANameRaw = null; wrestlerBNameRaw = null
      } else if (match.isForfeitWin) {
        wrestlerAId      = winnerIsTeam1 ? winnerWrestlerId : null
        wrestlerBId      = winnerIsTeam1 ? null             : winnerWrestlerId
        wrestlerANameRaw = winnerIsTeam1 ? match.winnerName : null
        wrestlerBNameRaw = winnerIsTeam1 ? null             : match.winnerName
      } else {
        wrestlerAId      = winnerIsTeam1 ? winnerWrestlerId : loserWrestlerId
        wrestlerBId      = winnerIsTeam1 ? loserWrestlerId  : winnerWrestlerId
        wrestlerANameRaw = winnerIsTeam1 ? match.winnerName : match.loserName
        wrestlerBNameRaw = winnerIsTeam1 ? match.loserName  : match.winnerName
      }

      const { db_type, db_detail, fall_time_seconds, result_time_estimated, winner_score, loser_score } =
        boutResultToDb(match.resultType, match.resultDetail)

      const { error: matchErr } = await supabase
        .from('dual_meet_matches_girls')
        .insert({
          dual_meet_id:           dualMeetId,
          weight_class:           match.weightClass,
          order_index:            matchIdx,
          wrestler_a_id:          wrestlerAId,
          wrestler_b_id:          wrestlerBId,
          wrestler_a_name_raw:    wrestlerANameRaw,
          wrestler_b_name_raw:    wrestlerBNameRaw,
          school_a_id:            team1SchoolId,
          school_b_id:            team2SchoolId,
          winner_id:              winnerWrestlerId,
          result_type:            db_type ?? match.resultType,
          result_detail:          db_detail,
          fall_time_seconds,
          result_time_estimated,
          winner_score,
          loser_score,
          team1_points:           match.team1Points,
          team2_points:           match.team2Points,
          is_double_forfeit:      match.isDoubleForfeit,
          is_forfeit_win:         match.isForfeitWin,
          validated:              false,
        })

      if (matchErr) {
        // Duplicate weight class in same meet = tri-meet/jamboree — warn, don't fail
        if (matchErr.code === '23505') {
          errors.push(`Meet ${i + 1} weight ${match.weightClass}: duplicate bout skipped (tri-meet/jamboree)`)
        } else {
          errors.push(`Meet ${i + 1} weight ${match.weightClass}: ${matchErr.message}`)
        }
      } else {
        matchesImported++
        boutsInserted++
      }
    }

    // Classify by bouts actually stored, the same rule the backfill used.
    if (!isJamboree && boutsInserted >= 1 && boutsInserted <= PARTIAL_MAX_BOUTS) {
      const { error: kindErr } = await supabase
        .from('dual_meets_girls')
        .update({ meet_kind: 'partial' })
        .eq('id', dualMeetId)
      if (kindErr) errors.push(`Meet ${i + 1}: could not mark as partial: ${kindErr.message}`)
      else meetsPartial++
    }
  }

  // ── Step 4: Persist name aliases ─────────────────────────────────────────────
  if (aliasMap.size > 0) {
    await supabase
      .from('wrestler_name_aliases')
      .upsert([...aliasMap.values()], { onConflict: 'raw_name,school_id' })
    clearWrestlerCache()
  }

  // ── Step 5: Persist school aliases from user overrides ────────────────────────
  for (const [rawName, override] of Object.entries(schoolOverrides)) {
    if (!rawName.trim()) continue
    let row: { school_id: number | null; alias: string; alias_type: string; notes: string | null }

    if (!override.isOutOfState && override.schoolId != null) {
      row = { school_id: override.schoolId, alias: rawName.trim(), alias_type: 'abbreviation', notes: 'Confirmed via girls dual meet import' }
    } else if (override.isOutOfState && override.schoolId != null) {
      row = { school_id: null, alias: rawName.trim(), alias_type: 'oos', notes: String(override.schoolId) }
    } else if (override.isOutOfState && override.schoolId === null) {
      row = { school_id: null, alias: rawName.trim(), alias_type: 'oos', notes: 'Confirmed out-of-state via girls dual meet import' }
    } else {
      continue
    }

    const { error: aliasErr } = await supabase.from('school_aliases').insert(row)
    if (!aliasErr || aliasErr.code === '23505') continue

    if (aliasErr.code === '23502' && row.school_id === null && row.notes && /^\d+$/.test(row.notes)) {
      const oosId = parseInt(row.notes, 10)
      await supabase.from('school_aliases').insert({ ...row, school_id: oosId })
    }
  }

  return NextResponse.json({
    ok:               !errors.some(e => !e.includes('duplicate bout skipped')),
    meetsImported,
    matchesImported,
    wrestlersCreated,
    meetsSkippedDup,
    meetsPartial,
    meetKind:         isJamboree ? 'jamboree' : 'dual',
    errors,
  })
}
