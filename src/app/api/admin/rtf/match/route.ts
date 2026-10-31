import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { getWorkingSeason, parseGender } from '@/lib/season-context'
import { parseRtfText, parseDateRange, boutResultToDb, normalizeRound } from '@/lib/parseRtf'
import { matchSchoolNames, isNjLookalike } from '@/lib/matchSchools'
import { matchWrestler, oosSchoolHasPrior, clearWrestlerCache, reloadAliases } from '@/lib/matchWrestlers'
import { matchTournament } from '@/lib/matchTournaments'
import { findMsProfileCandidates, msSeasonsForHsSeason, type MsWrestlerRow } from '@/lib/matchMsWrestler'
import type { SchoolFlag, WrestlerFlag, ReviewedTournament, SchoolOverride, TournamentType } from '@/app/admin/[side]/import-rtf/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


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
  // Normalize ALL CAPS names (e.g. "COWETA" → "Coweta") to match what import/route.ts stores.
  // Without this, match phase creates "COWETA" while import phase creates "Coweta" — duplicate rows.
  const name = raw === raw.toUpperCase() && /[A-Z]{2}/.test(raw)
    ? raw.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
    : raw
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
  gender: 'M' | 'F',
  seasonId?: number,
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
      const m = await matchSchoolNames(raw, { gender, seasonId })
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

  let text: string, year: number, selected: string[], schoolOverrides: Record<string, SchoolOverride>, gender: 'M' | 'F'
  let tournamentTypes: Record<string, TournamentType>
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
    selected = body.selected ?? []
    schoolOverrides = body.schoolOverrides ?? {}
    gender = body.gender ?? 'M'
    tournamentTypes = body.tournamentTypes ?? {}
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  const SEASON    = (await getWorkingSeason(parseGender(gender))).label
  const boutTable = gender === 'F' ? 'tournament_bouts_girls'      : 'tournament_bouts'

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
    for (const s of t.team_scores) {
      if (s.school_name) allSchoolRaws.add(s.school_name)
    }
  }

  const client = serviceClient()

  // Resolve season_id so school matching can filter to the gender-specific program list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seasonRow = await (client as any).from('seasons').select('id').eq('year_label', SEASON).maybeSingle()
  const seasonId: number | undefined = (seasonRow.data as { id: number } | null)?.id ?? undefined

  let schoolCache: Map<string, ResolvedSchool>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schoolCache = await buildSchoolCache([...allSchoolRaws], schoolOverrides, client as any, gender, seasonId)
  } catch (err) {
    return NextResponse.json({ error: `School matching failed: ${String(err)}` }, { status: 500 })
  }

  // Load existing tournaments once for fuzzy matching
  const { data: existingTournaments } = await client
    .from(istTable)
    .select('id, name, start_date')
    .eq('season', SEASON)
  const tournamentCandidates = (existingTournaments ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    start_date: r.start_date as string | null,
  }))

  // Load ms_wrestlers (unlinked, 3-year lookback) to surface MS candidates for new NJ wrestlers
  const msSeasons = msSeasonsForHsSeason(SEASON)
  const { data: msWrestlerRows } = await client
    .from('ms_wrestlers')
    .select(`
      id,
      canonical_name,
      ms_placements (
        id,
        weight_class,
        place,
        school_name,
        ms_tournament:ms_tournaments!inner (
          name,
          season,
          tier:ms_tournament_tiers!inner (
            name,
            credit_1, credit_2, credit_3, credit_4, credit_5, credit_6, credit_7, credit_8
          )
        )
      )
    `)
    .is('hs_wrestler_id', null)  // only unlinked — already-linked wrestlers don't need surfacing

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msWrestlersFlat: MsWrestlerRow[] = (msWrestlerRows ?? []).map((w: any) => {
    const placements = (w.ms_placements ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => msSeasons.includes(p.ms_tournament?.season))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => {
        const tier = p.ms_tournament?.tier ?? {}
        const credit = tier[`credit_${p.place}`] != null ? Number(tier[`credit_${p.place}`]) : null
        return {
          id: p.id,
          tournament_name: p.ms_tournament?.name ?? '?',
          tier_name: tier.name ?? '?',
          season: p.ms_tournament?.season ?? '?',
          weight_class: p.weight_class as number,
          place: p.place as number,
          school_name: p.school_name as string | null,
          credit,
        }
      })
    const best_credit = placements.reduce((max: number, p: { credit: number | null }) => Math.max(max, p.credit ?? 0), 0)
    return {
      ms_wrestler_id: w.id as number,
      canonical_name: w.canonical_name as string,
      placements,
      best_credit,
    }
  }).filter((w: MsWrestlerRow) => w.placements.length > 0)

  const reviewed: ReviewedTournament[] = []

  // OOS-matched schools whose name (raw or matched) resembles an NJ school
  const lookalikeCache = new Map<string, boolean>()
  for (const [raw, r] of schoolCache) {
    if (r.confidence !== 'oos') continue
    lookalikeCache.set(raw, await isNjLookalike(raw) || (r.display_name ? await isNjLookalike(r.display_name) : false))
  }

  function detectTournamentType(venue_name: string | null, venue_address: string | null): 'inside' | 'outside' {
    const text = [venue_name, venue_address].filter(Boolean).join(' ')
    if (/\bNJ\b|New Jersey|\b0[78]\d{3}\b/i.test(text)) return 'inside'
    if (text.replace(/\s/g, '').length > 5) return 'outside'
    return 'inside'
  }

  for (const t of parsed) {
    if (!selectedSet.has(`${t.name}|${t.date_raw}`)) continue

    const [start_date, end_date] = parseDateRange(t.date_raw, year)
    const tkey = `${t.name}|${t.date_raw}`
    const tournament_type = tournamentTypes[tkey] ?? detectTournamentType(t.venue_name, t.venue_address)
    // Out-of-state events: every school goes through review, even exact matches.
    // OOS programs can share a name with an NJ school exactly (Dover, DE vs Dover),
    // so an exact match is not proof the wrestler is from NJ.
    const reviewAll = tournament_type === 'outside'
    const needsReview = (r: ResolvedSchool) =>
      r.confidence !== 'skip' && (reviewAll || (r.confidence !== 'exact' && r.confidence !== 'oos'))
    const flagFor = (raw: string, r: ResolvedSchool, bout_count: number): SchoolFlag => ({
      raw,
      confidence: r.confidence as SchoolFlag['confidence'],
      school_id: r.school_id,
      display_name: r.display_name,
      alternates: r.alternates,
      bout_count,
      oos_event: reviewAll || undefined,
      nj_lookalike: lookalikeCache.get(raw) || undefined,
      bulk_ok: (reviewAll && r.confidence === 'oos' && r.school_id != null && lookalikeCache.get(raw) === false) || undefined,
    })
    let existing: { data: { id: string } | null } = { data: null }
    let has_bouts = false
    try {
      const eq = await client.from(istTable).select('id').eq('name', t.name).eq('season', SEASON).maybeSingle()
      existing = eq
      if (existing.data?.id) {
        const bq = await client.from(boutTable).select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', existing.data.id)
        has_bouts = (bq.count ?? 0) > 0
      }
    } catch { /* non-fatal — existing_id will be null */ }

    const seen = new Set<string>()
    const dedupedBoutsAll = t.bouts.filter(b => {
      // Normalize round so "3rd Place Match" and "Third Place" don't produce two DB rows.
      // Include full result fingerprint so genuinely different bouts between the same pair
      // (different rounds or different outcomes) are both preserved.
      const key = `${b.weight_class}|${normalizeRound(b.round)}|${b.result_type}|${b.result_detail ?? ''}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
      if (seen.has(key)) return false
      seen.add(key); return true
    })
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

    const schoolFlagMap = new Map<string, SchoolFlag>()
    for (const b of dedupedBouts) {
      for (const raw of [b.wrestler1_school, b.wrestler2_school]) {
        if (!raw || schoolFlagMap.has(raw)) continue
        const r = schoolCache.get(raw)!
        if (needsReview(r)) schoolFlagMap.set(raw, flagFor(raw, r, 0))
      }
    }
    for (const b of dedupedBouts) {
      for (const raw of [b.wrestler1_school, b.wrestler2_school]) {
        if (schoolFlagMap.has(raw)) schoolFlagMap.get(raw)!.bout_count++
      }
    }

    const teamScoreFlagMap = new Map<string, SchoolFlag>()
    for (const s of t.team_scores) {
      if (!s.school_name || teamScoreFlagMap.has(s.school_name)) continue
      const r = schoolCache.get(s.school_name)!
      if (needsReview(r)) teamScoreFlagMap.set(s.school_name, flagFor(s.school_name, r, s.place))
    }

    const wrestlerFlagMap = new Map<string, WrestlerFlag>()
    try {
      await reloadAliases()
      for (const b of dedupedBouts) {
        const { db_type, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        for (const [name, school_raw] of [[b.wrestler1_name, b.wrestler1_school], [b.wrestler2_name, b.wrestler2_school]] as [string, string][]) {
          const s = schoolCache.get(school_raw)
          // Skip wrestlers at unknown schools or uncertain NJ matches — resolve school flags first
          if (!s?.school_id) continue
          if (s.confidence !== 'exact' && s.confidence !== 'alias' && s.confidence !== 'high' && s.confidence !== 'oos') continue
          if (reviewAll && !schoolOverrides[school_raw]) continue
          const fkey = `${name}|${s.school_id}|${b.weight_class}`
          if (wrestlerFlagMap.has(fkey)) continue
          const isOos = s.confidence === 'oos'
          const wm = await matchWrestler(name, s.school_id, b.weight_class, gender)
          // OOS wrestlers: flag low-confidence (possible dup) OR new-looking at a school that already
          // has prior wrestlers (returning wrestler whose name changed enough to miss all matchers).
          // First-import OOS schools (no prior wrestlers) auto-create silently — no review needed.
          // NJ wrestlers: flag both new and low-confidence as before.
          const oosNewAtKnownSchool = isOos && wm.isNew && await oosSchoolHasPrior(s.school_id)
          const shouldFlag = isOos
            ? (wm.confidence === 'low' || oosNewAtKnownSchool)
            : (wm.confidence === 'low' || wm.confidence === 'none')
          if (shouldFlag) {
            const ms_candidates = (!isOos && wm.isNew)
              ? findMsProfileCandidates(name, msWrestlersFlat)
              : undefined
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
              ms_candidates,
            })
          }
        }
      }
    } catch (err) {
      return NextResponse.json({ error: `Wrestler matching failed for "${t.name}": ${String(err)}` }, { status: 500 })
    }

    const { best: tournament_match, alternates: tournament_alternates } = matchTournament(t.name, tournamentCandidates)

    reviewed.push({
      name: t.name,
      date_raw: t.date_raw,
      start_date,
      end_date,
      source_format: t.source_format,
      tournament_type,
      bout_count: dedupedBouts.length,
      placement_count: new Set(t.placements.map(p => `${p.weight_class}|${p.place}|${p.bracket}`)).size,
      team_score_count: t.team_score_count,
      existing_id: existing.data?.id ?? null,
      has_existing_bouts: has_bouts,
      venue_name: t.venue_name,
      venue_address: t.venue_address,
      tournament_match,
      tournament_alternates,
      school_flags: [...schoolFlagMap.values()],
      team_score_flags: [...teamScoreFlagMap.values()],
      wrestler_flags: [...wrestlerFlagMap.values()],
      bouts_for_review: t.bouts_for_review ?? [],
    })
  }

  return NextResponse.json({ reviewed })
}
