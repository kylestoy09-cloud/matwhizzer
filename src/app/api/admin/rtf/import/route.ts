import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText, parseDateRange, boutResultToDb, normalizeRound } from '@/lib/parseRtf'
import { matchSchoolNames, clearSchoolCache } from '@/lib/matchSchools'
import { matchWrestler, clearWrestlerCache, reloadAliases } from '@/lib/matchWrestlers'
import { matchTournament } from '@/lib/matchTournaments'
import type { SchoolFlag, ImportResult, SchoolOverride, WrestlerOverride, TournamentOverride, MsProfileLink } from '@/app/admin/import-rtf/types'

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

type ResolvedSchool = {
  school_id: number | null
  display_name: string | null
  confidence: string
  alternates: SchoolFlag['alternates']
}

function normalizeOosSchoolName(raw: string): string {
  // TW sometimes exports school names in ALL CAPS (e.g. "COWETA", "EDMOND NORTH").
  // If the entire string is uppercase, convert to title case.
  if (raw === raw.toUpperCase() && /[A-Z]{2}/.test(raw)) {
    return raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }
  return raw
}

async function findOrCreateOosSchool(client: ReturnType<typeof createClient>, raw: string): Promise<number> {
  const name = normalizeOosSchoolName(raw)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = client as any
  const existing = await c.from('schools').select('id').eq('display_name', name).eq('is_nj', false).maybeSingle()
  if (existing.data?.id) return existing.data.id
  const ins = await c.from('schools').insert({ display_name: name, is_nj: false }).select('id').single()
  if (ins.error) throw new Error(`OOS school insert failed for "${name}": ${ins.error.message}`)
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
        : await findOrCreateOosSchool(client, override.display_name ?? raw)
      const display_name = override.display_name ?? raw
      cache.set(raw, { school_id, display_name, confidence: 'oos', alternates: [] })
      // Persist alias: school_id stored in notes to avoid conflict with nj_alias_unique partial index.
      // Swallow all errors (duplicates are fine; transient errors must not abort the import).
      await (client as any).from('school_aliases')
        .insert({ school_id: null, alias: raw, alias_type: 'oos', notes: String(school_id) })
        .then(() => {}).catch(() => {})
    } else if (override?.type === 'nj') {
      cache.set(raw, { school_id: override.school_id, display_name: override.display_name, confidence: 'exact', alternates: [] })
      // Save alias so this raw name auto-resolves next import
      await (client as any).from('school_aliases')
        .insert({ school_id: override.school_id, alias: raw, alias_type: 'nj' })
        .then(() => {}).catch(() => {})
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

  let text: string, year: number, selected: string[], gender: 'M' | 'F'
  let schoolOverrides: Record<string, SchoolOverride>
  let wrestlerOverrides: Record<string, WrestlerOverride>
  let tournamentDates: Record<string, { start_date: string; end_date: string | null }>
  let tournamentTypes: Record<string, string>
  let tournamentVenues: Record<string, { venue_name: string; venue_address: string }>
  let tournamentOverrides: Record<string, TournamentOverride>
  let msProfileLinks: Record<string, MsProfileLink>
  let boutReview: Record<string, Record<string, string>>
  let force: boolean
  let registry_id: string | undefined
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
    selected = body.selected ?? []
    schoolOverrides = body.schoolOverrides ?? {}
    wrestlerOverrides = body.wrestlerOverrides ?? {}
    tournamentDates = body.tournamentDates ?? {}
    tournamentTypes = body.tournamentTypes ?? {}
    tournamentVenues = body.tournamentVenues ?? {}
    tournamentOverrides = body.tournamentOverrides ?? {}
    msProfileLinks = body.msProfileLinks ?? {}
    boutReview = body.boutReview ?? {}
    force = body.force ?? false
    gender = body.gender ?? 'M'
    registry_id = body.registry_id ?? undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'

  function confirmedRoundToDb(label: string): string {
    const map: Record<string, string> = {
      'Finals': 'F', 'Semifinals': 'SF', 'Quarterfinals': 'QF',
      '1st Round': 'R1', '2nd Round': 'R2', '3rd Round': 'R3', '4th Round': 'R4',
      '3rd Place': '3rd_Place', '5th Place': '5th_Place', '7th Place': '7th_Place',
      'Consolation Finals': 'CF', 'Consolation Semifinals': 'CSF', 'Consolation Quarterfinals': 'CQF',
      'Exhibition': 'Exhibition',
    }
    if (label in map) return map[label]
    const m = label.match(/^Consolation (\d+)$/)
    if (m) return `C${m[1]}`
    return label
  }

  const parsed = parseRtfText(text)
  const selectedSet = new Set(selected)
  clearSchoolCache()
  clearWrestlerCache()
  await reloadAliases()

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
    for (const s of t.team_scores) {
      if (s.school_name) allSchoolRaws.add(s.school_name)
    }
  }

  const client = serviceClient()
  let schoolCache: Map<string, ResolvedSchool>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schoolCache = await buildSchoolCache([...allSchoolRaws], schoolOverrides, client as any)
  } catch (err) {
    return NextResponse.json({ error: `School setup failed: ${String(err)}` }, { status: 500 })
  }

  // Load existing tournaments for auto-matching (overrides in tournamentOverrides take precedence)
  const { data: existingTournaments } = await client
    .from(istTable)
    .select('id, name, start_date, source_format')
    .eq('season', SEASON)
  const tournamentCandidates = (existingTournaments ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    start_date: r.start_date as string | null,
  }))
  const existingByIdMap = new Map((existingTournaments ?? []).map(r => [r.id as string, r]))

  const results: ImportResult[] = []

  for (const t of parsed) {
    if (!selectedSet.has(`${t.name}|${t.date_raw}`)) continue

    await reloadAliases()

    try {
      const tkey = `${t.name}|${t.date_raw}`
      const dates = tournamentDates[tkey] ?? {
        start_date: parseDateRange(t.date_raw, year)[0],
        end_date: parseDateRange(t.date_raw, year)[1],
      }
      const venueOverride = tournamentVenues[tkey]
      const venue_name    = venueOverride?.venue_name    ?? t.venue_name    ?? null
      const venue_address = venueOverride?.venue_address ?? t.venue_address ?? null
      const location = venue_name
        ? (venue_address ? `${venue_name}, ${venue_address}` : venue_name)
        : null

      // Dedup bouts before using them for any decision (hasOos, tournament type, etc.)
      // so that a deduped-away OOS bout can't mislabel the tournament as inside_outside.
      const seen = new Set<string>()
      const dedupedBoutsAll = t.bouts.filter(b => {
        const key = `${b.weight_class}|${normalizeRound(b.round)}|${b.result_type}|${b.result_detail ?? ''}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })

      let tournamentType = tournamentTypes[tkey] ?? 'inside'
      // If venue is NJ (inside) but the deduplicated bout list has confirmed OOS schools → inside_outside
      if (tournamentType === 'inside') {
        const hasOos = dedupedBoutsAll.some(b =>
          (b.wrestler1_school && schoolCache.get(b.wrestler1_school)?.confidence === 'oos') ||
          (b.wrestler2_school && schoolCache.get(b.wrestler2_school)?.confidence === 'oos')
        )
        if (hasOos) tournamentType = 'inside_outside'
      }
      const tOverride = tournamentOverrides[tkey]

      // Resolve which tournament record to use:
      // 1. Explicit 'existing' override → use that tournament_id
      // 2. Explicit 'new' override → always create
      // 3. No override → try exact name match first, then auto-match if high/exact confidence
      let tid: string

      if (tOverride?.type === 'existing') {
        tid = tOverride.tournament_id
        const existingRec = existingByIdMap.get(tid)
        const updates: Record<string, string | null> = {}
        if (existingRec && !existingRec.source_format) updates.source_format = t.source_format
        if (tournamentType) updates.tournament_type = tournamentType
        if (venue_name)    updates.venue_name    = venue_name
        if (venue_address) updates.venue_address = venue_address
        if (location)      updates.location      = location
        if (Object.keys(updates).length) {
          await client.from(istTable).update(updates).eq('id', tid)
        }
      } else if (tOverride?.type === 'new') {
        const ins = await client.from(istTable).insert({
          name: t.name,
          season: SEASON,
          start_date: dates.start_date,
          end_date: dates.end_date ?? undefined,
          source_format: t.source_format,
          tournament_type: tournamentType,
          venue_name,
          venue_address,
          location,
        }).select('id').single()
        if (ins.error) throw new Error(ins.error.message)
        tid = ins.data.id
      } else {
        // Auto: try exact name match first, then fuzzy
        const exactMatch = await client.from(istTable).select('id, source_format').eq('name', t.name).eq('season', SEASON).maybeSingle()
        let resolvedExisting: { id: string; source_format: string | null } | null = exactMatch.data ?? null

        if (!resolvedExisting) {
          const { best } = matchTournament(t.name, tournamentCandidates)
          if (best && (best.confidence === 'exact' || best.confidence === 'high')) {
            const matched = existingByIdMap.get(best.tournament_id)
            if (matched) resolvedExisting = { id: matched.id, source_format: matched.source_format as string | null }
          }
        }

        if (resolvedExisting) {
          tid = resolvedExisting.id
          const updates: Record<string, string | null> = {}
          if (!resolvedExisting.source_format) updates.source_format = t.source_format
          if (tournamentType) updates.tournament_type = tournamentType
          if (venue_name)    updates.venue_name    = venue_name
          if (venue_address) updates.venue_address = venue_address
          if (location)      updates.location      = location
          if (Object.keys(updates).length) {
            await client.from(istTable).update(updates).eq('id', tid)
          }
        } else {
          const ins = await client.from(istTable).insert({
            name: t.name,
            season: SEASON,
            start_date: dates.start_date,
            end_date: dates.end_date ?? undefined,
            source_format: t.source_format,
            tournament_type: tournamentType,
            venue_name,
            venue_address,
            location,
          }).select('id').single()
          if (ins.error) throw new Error(ins.error.message)
          tid = ins.data.id
        }
      }

      // If this import came from a hub row, link the registry row back to the tournament
      if (registry_id) {
        await (client as any).from('tournament_registry').update({ in_season_tournament_id: tid }).eq('id', registry_id)
      }

      const bq = await client.from(boutTable).select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', tid)
      const hasBouts = (bq.count ?? 0) > 0

      if (hasBouts && !force) {
        const plRowsRaw = t.placements.map(p => {
          const ps = schoolCache.get(p.school_name)
          return { in_season_tournament_id: tid, weight_class: p.weight_class, place: p.place, bracket: p.bracket, wrestler_name_raw: p.wrestler_name, school_name_raw: p.school_name, school_id: ps?.school_id ?? null, wrestler_id: null }
        })
        const seenPl = new Set<string>()
        const plRows = plRowsRaw.filter(r => {
          const k = `${r.weight_class}|${r.place}|${r.bracket}`
          if (seenPl.has(k)) return false
          seenPl.add(k); return true
        })
        let pl_count = 0
        let pl_error: string | undefined
        if (plRows.length) {
          const plRes = await client.from('tournament_placements').upsert(plRows, { onConflict: 'in_season_tournament_id,weight_class,place,bracket' })
          if (plRes.error) { pl_error = plRes.error.message } else { pl_count = plRows.length }
        }
        let ts_count = 0
        let ts_error: string | undefined
        if (t.team_scores.length > 0) {
          await client.from('in_season_tournament_team_scores').delete().eq('tournament_id', tid)
          const tsRows = t.team_scores.map(s => ({ tournament_id: tid, place: s.place, school_name: s.school_name, school_id: schoolCache.get(s.school_name)?.school_id ?? null, score: s.score }))
          const tsRes = await client.from('in_season_tournament_team_scores').insert(tsRows).select('id')
          ts_count = tsRes.data?.length ?? 0
          if (tsRes.error) ts_error = tsRes.error.message
        }
        results.push({ tournament: t.name, bouts_inserted: 0, placements_upserted: pl_count, placements_parsed: t.placements.length, team_scores_inserted: ts_count, wrestlers_created: 0, skipped: true, ...(pl_error ? { pl_error } : {}), ...(ts_error ? { ts_error } : {}) })
        continue
      }

      // Force re-import: delete existing bouts, placements, and team scores before re-inserting
      if (hasBouts && force) {
        await client.from(boutTable).delete().eq('in_season_tournament_id', tid)
        await client.from('tournament_placements').delete().eq('in_season_tournament_id', tid)
        await client.from('in_season_tournament_team_scores').delete().eq('tournament_id', tid)
      }

      // Only drop OOS-vs-OOS bouts when at least one NJ school (exact/high confidence) is
      // present in the tournament. For fully-OOS tournaments (e.g. an out-of-state girls
      // invitational) keep everything — the filter would otherwise wipe all bouts.
      const hasNjSchool = dedupedBoutsAll.some(b => {
        const c1 = schoolCache.get(b.wrestler1_school)?.confidence
        const c2 = schoolCache.get(b.wrestler2_school)?.confidence
        return c1 === 'exact' || c1 === 'high' || c2 === 'exact' || c2 === 'high'
      })
      const dedupedBouts = hasNjSchool
        ? dedupedBoutsAll.filter(b => {
            const c1 = schoolCache.get(b.wrestler1_school)?.confidence
            const c2 = schoolCache.get(b.wrestler2_school)?.confidence
            return !(c1 === 'oos' && c2 === 'oos')
          })
        : dedupedBoutsAll

      // Collect new wrestlers, respecting overrides
      type NewWrestler = { name: string; school_id: number; first_name: string; last_name: string; is_oos: boolean }
      const newWrestlers: NewWrestler[] = []
      const seenNew = new Set<string>()
      // Cache of override-existing wrestler ids: key → wrestler_id
      const overrideExistingMap = new Map<string, string>()

      for (const b of dedupedBouts) {
        const { db_type, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        for (const [name, school_raw] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
          const s = schoolCache.get(school_raw)
          if (!s?.school_id) continue
          const nkey = `${name}|${s.school_id}`
          if (seenNew.has(nkey) || overrideExistingMap.has(nkey)) continue

          const flagKey = `${name}|${s.school_id}|${b.weight_class}`
          const ov = wrestlerOverrides[flagKey]
          const isOos = s.confidence === 'oos'

          if (ov?.type === 'skip') {
            overrideExistingMap.set(nkey, '__skip__')
          } else if (ov?.type === 'existing') {
            overrideExistingMap.set(nkey, ov.wrestler_id)
          } else if (ov?.type === 'create') {
            seenNew.add(nkey)
            newWrestlers.push({ name, school_id: s.school_id, first_name: ov.first_name, last_name: ov.last_name, is_oos: isOos })
          } else {
            // accept or no override — run matcher
            const wm = await matchWrestler(name, s.school_id, b.weight_class, gender)
            if (wm.isNew) {
              if (!isOos) continue // NJ wrestlers require explicit 'create' override — never auto-create
              seenNew.add(nkey)
              const parts = name.trim().split(/\s+/)
              const last = parts.length > 1 ? parts[parts.length - 1] : ''
              const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : name
              newWrestlers.push({ name, school_id: s.school_id, first_name: first, last_name: last, is_oos: isOos })
            }
          }
        }
      }

      const newWrestlerMap = new Map<string, string>()
      const aliasRows: Array<{ raw_name: string; school_id: number; wrestler_id: string }> = []

      for (const w of newWrestlers) {
        const ins = await client.from('wrestlers').insert({ first_name: w.first_name, last_name: w.last_name, gender, is_oos: w.is_oos }).select('id').single()
        if (!ins.error && ins.data) {
          newWrestlerMap.set(`${w.name}|${w.school_id}`, ins.data.id)
          aliasRows.push({ raw_name: w.name, school_id: w.school_id, wrestler_id: ins.data.id })
        }
      }

      // Apply MS prospect links for newly-created NJ wrestlers
      for (const [nkey, newId] of newWrestlerMap.entries()) {
        // Find any msProfileLink for this wrestler (key = name|school_id|weight_class, we match on prefix)
        const matchingLink = Object.entries(msProfileLinks).find(([k, v]) =>
          k.startsWith(`${nkey}|`) && v.type === 'confirm'
        )
        if (!matchingLink) continue
        const link = matchingLink[1] as Extract<MsProfileLink, { type: 'confirm' }>
        // Set hs_wrestler_id on the ms_wrestler record — credit computed on-the-fly from placements
        await client.from('ms_wrestlers')
          .update({ hs_wrestler_id: newId })
          .eq('id', link.ms_wrestler_id)
      }

      // Also alias confirmed existing/accept overrides so they resolve instantly next time
      for (const b of dedupedBouts) {
        const { db_type, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        for (const [name, school_raw] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
          const s = schoolCache.get(school_raw)
          if (!s?.school_id) continue
          const flagKey = `${name}|${s.school_id}|${b.weight_class}`
          const ov = wrestlerOverrides[flagKey]
          if (ov?.type === 'existing') {
            aliasRows.push({ raw_name: name, school_id: s.school_id, wrestler_id: ov.wrestler_id })
          } else if (ov?.type === 'accept' && b.result_type !== 'BYE') {
            const wm = await matchWrestler(name, s.school_id, b.weight_class, gender)
            if (wm.wrestlerId) aliasRows.push({ raw_name: name, school_id: s.school_id, wrestler_id: wm.wrestlerId })
          }
        }
      }

      // Deduplicate and upsert aliases
      const seenAlias = new Set<string>()
      const uniqueAliases = aliasRows.filter(a => {
        const k = `${a.raw_name}|${a.school_id}`
        if (seenAlias.has(k)) return false
        seenAlias.add(k); return true
      })
      if (uniqueAliases.length > 0) {
        await client.from('wrestler_name_aliases')
          .upsert(uniqueAliases, { onConflict: 'raw_name,school_id' })
      }

      const tBoutReview = boutReview[tkey] ?? {}

      const boutRows = []
      for (const b of dedupedBouts) {
        const { db_type, db_detail, fall_time_seconds, result_time_estimated, winner_score, loser_score, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        const s1 = schoolCache.get(b.wrestler1_school)
        const s2 = schoolCache.get(b.wrestler2_school)
        const resolveId = async (name: string, school_id: number | null | undefined, wc: number) => {
          if (!school_id) return null
          const nkey = `${name}|${school_id}`
          const flagKey = `${name}|${school_id}|${wc}`
          const ov = wrestlerOverrides[flagKey]
          if (ov?.type === 'skip') return null
          if (ov?.type === 'existing') return ov.wrestler_id
          const cached = overrideExistingMap.get(nkey)
          if (cached === '__skip__') return null
          if (cached) return cached
          if (newWrestlerMap.has(nkey)) return newWrestlerMap.get(nkey)!
          const wm = await matchWrestler(name, school_id, wc, gender)
          return wm.wrestlerId ?? null
        }
        const w1 = await resolveId(b.wrestler1_name, s1?.school_id, b.weight_class)
        const w2 = await resolveId(b.wrestler2_name, s2?.school_id, b.weight_class)
        // Never store a bout with a null wrestler ID — both sides must be resolved
        if (b.result_type !== 'BYE' && (!w1 || !w2)) continue
        const bkey = b.result_type === 'BYE'
          ? `${b.weight_class}|bye|${b.wrestler1_name}|${b.wrestler1_school}`
          : `${b.weight_class}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
        const confirmedRound = tBoutReview[bkey]
        const roundForDb = confirmedRound ? confirmedRoundToDb(confirmedRound) : normalizeRound(b.round)

        boutRows.push({
          in_season_tournament_id: tid,
          weight_class: b.weight_class,
          round: roundForDb,
          wrestler1_name_raw: b.wrestler1_name,
          wrestler1_school_raw: s1?.display_name ?? b.wrestler1_school,
          wrestler1_school_id: s1?.school_id ?? null,
          wrestler1_id: w1,
          wrestler2_name_raw: b.wrestler2_name,
          wrestler2_school_raw: s2?.display_name ?? b.wrestler2_school,
          wrestler2_school_id: s2?.school_id ?? null,
          wrestler2_id: w2,
          winner,
          result_type: db_type,
          result_detail: db_detail,
          fall_time_seconds,
          result_time_estimated,
          winner_score,
          loser_score,
          source_format: 'rtf',
        })
      }

      // Second dedup pass: after IDs are resolved, drop rows that would violate
      // tb_unique_bout (weight, round, wrestler1_id, wrestler2_id, winner/loser score).
      // The name-based dedup above catches same-name duplicates; this catches cases where
      // two slightly different raw names resolve to the same wrestler IDs.
      const seenBout = new Set<string>()
      const finalBoutRows = boutRows.filter(r => {
        if (r.wrestler1_id == null || r.wrestler2_id == null) return true
        const ids = [r.wrestler1_id, r.wrestler2_id].sort()
        const k = `${r.weight_class}|${r.round}|${ids[0]}|${ids[1]}|${r.winner_score ?? ''}|${r.loser_score ?? ''}`
        if (seenBout.has(k)) return false
        seenBout.add(k); return true
      })

      let bouts_inserted = 0
      for (let i = 0; i < finalBoutRows.length; i += CHUNK) {
        const res = await client.from(boutTable).insert(finalBoutRows.slice(i, i + CHUNK))
        if (res.error) throw new Error(`bout insert: ${res.error.message}`)
        bouts_inserted += finalBoutRows.slice(i, i + CHUNK).length
      }

      const plRowsRaw = []
      for (const p of t.placements) {
        const ps = schoolCache.get(p.school_name)
        let nj_wid: string | null = null
        if (ps?.school_id) {
          const pm = await matchWrestler(p.wrestler_name, ps.school_id, p.weight_class, gender)
          if (pm.confidence === 'exact' || pm.confidence === 'high') nj_wid = pm.wrestlerId
        }
        plRowsRaw.push({ in_season_tournament_id: tid, weight_class: p.weight_class, place: p.place, bracket: p.bracket, wrestler_name_raw: p.wrestler_name, school_name_raw: p.school_name, school_id: ps?.school_id ?? null, wrestler_id: nj_wid })
      }
      const placements_parsed = plRowsRaw.length
      const seenPl = new Set<string>()
      const plRows = plRowsRaw.filter(r => {
        const k = `${r.weight_class}|${r.place}|${r.bracket}`
        if (seenPl.has(k)) return false
        seenPl.add(k); return true
      })
      let pl_count = 0
      let pl_error: string | undefined
      if (plRows.length) {
        const plRes = await client.from('tournament_placements').upsert(plRows, { onConflict: 'in_season_tournament_id,weight_class,place,bracket' })
        if (plRes.error) { pl_error = plRes.error.message } else { pl_count = plRows.length }
      }

      let ts_count = 0
      let ts_error: string | undefined
      if (t.team_scores.length > 0) {
        await client.from('in_season_tournament_team_scores').delete().eq('tournament_id', tid)
        const tsRows = t.team_scores.map(s => ({ tournament_id: tid, place: s.place, school_name: s.school_name, school_id: schoolCache.get(s.school_name)?.school_id ?? null, score: s.score }))
        const tsRes = await client.from('in_season_tournament_team_scores').insert(tsRows).select('id')
        ts_count = tsRes.data?.length ?? 0
        if (tsRes.error) ts_error = tsRes.error.message
      }

      results.push({ tournament: t.name, bouts_inserted, placements_upserted: pl_count, placements_parsed, team_scores_inserted: ts_count, wrestlers_created: newWrestlerMap.size, skipped: false, ...(pl_error ? { pl_error } : {}), ...(ts_error ? { ts_error } : {}) })
    } catch (err) {
      results.push({ tournament: t.name, bouts_inserted: 0, placements_upserted: 0, team_scores_inserted: 0, wrestlers_created: 0, skipped: false, error: String(err) })
    }
  }

  return NextResponse.json({ results })
}
