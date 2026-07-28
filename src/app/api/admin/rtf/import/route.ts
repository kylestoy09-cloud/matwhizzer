import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'
import { parseRtfText, parseDateRange, boutResultToDb, normalizeRound } from '@/lib/parseRtf'
import { matchSchoolNames } from '@/lib/matchSchools'
import { matchWrestler, clearWrestlerCache } from '@/lib/matchWrestlers'
import type { SchoolFlag, ImportResult, SchoolOverride, WrestlerOverride } from '@/app/admin/import-rtf/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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
      const school_id = await findOrCreateOosSchool(client, raw)
      cache.set(raw, { school_id, display_name: raw, confidence: 'oos', alternates: [] })
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

  let text: string, year: number, selected: string[]
  let schoolOverrides: Record<string, SchoolOverride>
  let wrestlerOverrides: Record<string, WrestlerOverride>
  let tournamentDates: Record<string, { start_date: string; end_date: string | null }>
  let tournamentTypes: Record<string, string>
  let force: boolean
  try {
    const body = await req.json()
    text = body.text
    year = body.year ?? new Date().getFullYear()
    selected = body.selected ?? []
    schoolOverrides = body.schoolOverrides ?? {}
    wrestlerOverrides = body.wrestlerOverrides ?? {}
    tournamentDates = body.tournamentDates ?? {}
    tournamentTypes = body.tournamentTypes ?? {}
    force = body.force ?? false
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schoolCache = await buildSchoolCache([...allSchoolRaws], schoolOverrides, client as any)
  const results: ImportResult[] = []

  for (const t of parsed) {
    if (!selectedSet.has(`${t.name}|${t.date_raw}`)) continue

    try {
      const tkey = `${t.name}|${t.date_raw}`
      const dates = tournamentDates[tkey] ?? {
        start_date: parseDateRange(t.date_raw, year)[0],
        end_date: parseDateRange(t.date_raw, year)[1],
      }

      const existing = await client.from('in_season_tournaments').select('id, source_format').eq('name', t.name).eq('season', SEASON).maybeSingle()
      let tid: string

      const tournamentType = tournamentTypes[tkey] ?? 'inside'

      if (existing.data) {
        tid = existing.data.id
        const updates: Record<string, string> = {}
        if (!existing.data.source_format) updates.source_format = t.source_format
        if (tournamentType) updates.tournament_type = tournamentType
        if (Object.keys(updates).length) {
          await client.from('in_season_tournaments').update(updates).eq('id', tid)
        }
      } else {
        const ins = await client.from('in_season_tournaments').insert({
          name: t.name,
          season: SEASON,
          start_date: dates.start_date,
          end_date: dates.end_date ?? undefined,
          source_format: t.source_format,
          tournament_type: tournamentType,
        }).select('id').single()
        if (ins.error) throw new Error(ins.error.message)
        tid = ins.data.id
      }

      const bq = await client.from('tournament_bouts').select('id', { count: 'exact', head: true }).eq('in_season_tournament_id', tid)
      const hasBouts = (bq.count ?? 0) > 0

      if (hasBouts && !force) {
        const plRows = t.placements.map(p => {
          const ps = schoolCache.get(p.school_name)
          return { in_season_tournament_id: tid, weight_class: p.weight_class, place: p.place, wrestler_name_raw: p.wrestler_name, school_name_raw: p.school_name, school_id: ps?.school_id ?? null, wrestler_id: null }
        })
        let pl_count = 0
        if (plRows.length) {
          const plRes = await client.from('tournament_placements').upsert(plRows, { onConflict: 'in_season_tournament_id,weight_class,place' }).select('id')
          pl_count = plRes.data?.length ?? 0
        }
        results.push({ tournament: t.name, bouts_inserted: 0, placements_upserted: pl_count, wrestlers_created: 0, skipped: true })
        continue
      }

      // Force re-import: delete existing bouts and placements before re-inserting
      if (hasBouts && force) {
        await client.from('tournament_bouts').delete().eq('in_season_tournament_id', tid)
        await client.from('tournament_placements').delete().eq('in_season_tournament_id', tid)
      }

      const seen = new Set<string>()
      const dedupedBouts = t.bouts.filter(b => {
        const key = `${b.weight_class}|${[`${b.wrestler1_name}|${b.wrestler1_school}`, `${b.wrestler2_name}|${b.wrestler2_school}`].sort().join('|')}`
        if (seen.has(key)) return false
        seen.add(key); return true
      })

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
            // accept or no override — run matcher (OOS wrestlers always isNew since they're not in tournament_entries)
            const wm = isOos ? { isNew: true, wrestlerId: null } : await matchWrestler(name, s.school_id, b.weight_class, 'M')
            if (wm.isNew) {
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
        const ins = await client.from('wrestlers').insert({ first_name: w.first_name, last_name: w.last_name, gender: 'M', is_oos: w.is_oos }).select('id').single()
        if (!ins.error && ins.data) {
          newWrestlerMap.set(`${w.name}|${w.school_id}`, ins.data.id)
          aliasRows.push({ raw_name: w.name, school_id: w.school_id, wrestler_id: ins.data.id })
        }
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
            const wm = await matchWrestler(name, s.school_id, b.weight_class, 'M')
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

      const boutRows = []
      for (const b of dedupedBouts) {
        const { db_type, db_detail, fall_time_seconds, winner } = boutResultToDb(b.result_type, b.result_detail)
        if (db_type === null && winner === null) continue
        const s1 = schoolCache.get(b.wrestler1_school)
        const s2 = schoolCache.get(b.wrestler2_school)
        const resolveId = async (name: string, school_id: number | null | undefined, wc: number, isOos: boolean) => {
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
          // OOS wrestlers: only check alias (no tournament_entries to match against)
          if (isOos) return null
          const wm = await matchWrestler(name, school_id, wc, 'M')
          return wm.wrestlerId ?? null
        }
        const w1 = await resolveId(b.wrestler1_name, s1?.school_id, b.weight_class, s1?.confidence === 'oos')
        const w2 = await resolveId(b.wrestler2_name, s2?.school_id, b.weight_class, s2?.confidence === 'oos')
        boutRows.push({
          in_season_tournament_id: tid,
          weight_class: b.weight_class,
          round: normalizeRound(b.round),
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
          source_format: 'rtf',
        })
      }

      let bouts_inserted = 0
      for (let i = 0; i < boutRows.length; i += CHUNK) {
        const res = await client.from('tournament_bouts').insert(boutRows.slice(i, i + CHUNK))
        if (res.error) throw new Error(`bout insert: ${res.error.message}`)
        bouts_inserted += boutRows.slice(i, i + CHUNK).length
      }

      const plRows = []
      for (const p of t.placements) {
        const ps = schoolCache.get(p.school_name)
        let nj_wid: string | null = null
        if (ps?.school_id) {
          const pm = await matchWrestler(p.wrestler_name, ps.school_id, p.weight_class, 'M')
          if (pm.confidence === 'exact' || pm.confidence === 'high') nj_wid = pm.wrestlerId
        }
        plRows.push({ in_season_tournament_id: tid, weight_class: p.weight_class, place: p.place, wrestler_name_raw: p.wrestler_name, school_name_raw: p.school_name, school_id: ps?.school_id ?? null, wrestler_id: nj_wid })
      }
      let pl_count = 0
      if (plRows.length) {
        const plRes = await client.from('tournament_placements').upsert(plRows, { onConflict: 'in_season_tournament_id,weight_class,place' }).select('id')
        pl_count = plRes.data?.length ?? 0
      }

      results.push({ tournament: t.name, bouts_inserted, placements_upserted: pl_count, wrestlers_created: newWrestlerMap.size, skipped: false })
    } catch (err) {
      results.push({ tournament: t.name, bouts_inserted: 0, placements_upserted: 0, wrestlers_created: 0, skipped: false, error: String(err) })
    }
  }

  return NextResponse.json({ results })
}
