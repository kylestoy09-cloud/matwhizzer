// Projection Accuracy (/admin/{boys,girls}/projection-accuracy). Admin only.
//   GET  ?gender=M&season=2025-26           the season's tracked bouts graded: as projected at the time (frozen) and
//                                           replayed with the active settings; settings versions; seasons on file
//   POST { gender, season, params }         a lever test: the same bouts replayed with params vs the active settings
//   PUT  { gender, params, name, note }     save params as the next version and make it active (site projections and
//                                           newly tracked bouts use it from then on; bouts on file keep their projection)
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { isAdminUser } from '@/lib/auth/isAdminUser'
import { withDefaults, type ProjectionParams } from '@/lib/projection'
import { OUTCOME_LABELS } from '@/lib/hammerScore'
import { getSeasons } from '@/lib/seasons-server'
import { weightGroup } from '@/lib/weightGroups'
import { evaluate, frozenPicks, replayPicks, compareChanges, biggestMisses, onSpeedScale, cutoffsFrom, spreadChart, spreadKindChart, buildWinCurve, weightMixFrom, type EvalRow, type Pick } from '@/lib/projectionEval'
import { speedLabel, type BandCutoffs } from '@/lib/speedBands'
import { buildOddsTable, oddsFor, topOutcomes, outcomeIndex, DEFAULT_ODDS, type OddsTable } from '@/lib/projectionOdds'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type Db = ReturnType<typeof createSupabaseAdmin>
type Settings = { id: number; version: number; name: string | null; note: string | null; params: ProjectionParams; is_active: boolean; created_at: string; created_by: string | null }

async function admin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!(await isAdminUser(user.id))) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}

const COLS = 'id, match_date, wrestler_a_id, wrestler_b_id, a_pre_wrr, b_pre_wrr, common_opp_score, h2h_score, a_wins, a_pins, a_techs, a_majors, a_losses, a_pinned, a_teched, b_wins, b_pins, b_techs, b_majors, b_losses, b_pinned, b_teched, settings_id, predicted_winner, predicted_rank, actual_winner, actual_rank, fall_time_seconds, time_estimated, a_strength, b_strength, edge, weight_class'

// a season's rows stay in memory a few minutes, so lever tests answer fast
const cache = new Map<string, { at: number; rows: EvalRow[] }>()
async function loadRows(db: Db, g: 'M' | 'F', season: string): Promise<EvalRow[]> {
  const k = `${g}|${season}`
  const hit = cache.get(k)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.rows
  const raw: Record<string, unknown>[] = []
  for (let last = 0; ;) {
    const { data, error } = await db.from('match_projections').select(COLS).eq('gender', g).eq('season', season).gt('id', last).order('id').limit(1000)
    if (error) throw new Error(error.message)
    raw.push(...(data ?? []))
    if (!data || data.length < 1000) break
    last = data[data.length - 1].id as number
  }
  const n = (v: unknown) => (v == null ? null : Number(v))
  const fin = (r: Record<string, unknown>, p: 'a' | 'b') => ({
    wins: Number(r[`${p}_wins`]), pins: Number(r[`${p}_pins`]), techs: Number(r[`${p}_techs`]), majors: Number(r[`${p}_majors`]),
    losses: Number(r[`${p}_losses`]), pinned: Number(r[`${p}_pinned`]), teched: Number(r[`${p}_teched`]),
  })
  const rows: EvalRow[] = raw.map(r => ({
    id: r.id as number, d: r.match_date as string, a: r.wrestler_a_id as string, b: r.wrestler_b_id as string,
    wa: Number(r.a_pre_wrr), wb: Number(r.b_pre_wrr), c: n(r.common_opp_score), h: n(r.h2h_score),
    finA: fin(r, 'a'), finB: fin(r, 'b'), sid: r.settings_id as number,
    pw: r.predicted_winner as EvalRow['pw'], pr: n(r.predicted_rank), aw: r.actual_winner as EvalRow['aw'], ar: Number(r.actual_rank),
    t: n(r.fall_time_seconds), te: !!r.time_estimated, sa: n(r.a_strength), sb: n(r.b_strength), e: (r.edge as 'a' | 'b' | null) ?? null, wg: weightGroup(g, n(r.weight_class)),
  }))
  cache.set(k, { at: Date.now(), rows })
  return rows
}

async function loadSettings(db: Db, g: 'M' | 'F'): Promise<Settings[]> {
  const { data, error } = await db.from('projection_settings').select('id, version, name, note, params, is_active, created_at, created_by').eq('gender', g).order('version')
  if (error) throw new Error(error.message)
  return (data ?? []).map(s => ({ ...s, params: withDefaults(s.params as Partial<ProjectionParams>) })) as Settings[]
}

/** The listed misses with names and schools, ready to show */
async function describe(db: Db, g: 'M' | 'F', rows: EvalRow[], picks: Pick[], idx: number[], cut?: BandCutoffs) {
  const ids = [...new Set(idx.flatMap(i => [rows[i].a, rows[i].b]))]
  const names = new Map<string, string>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name').in('id', ids.slice(i, i + 200))
    for (const w of data ?? []) names.set(w.id as string, `${w.first_name} ${w.last_name}`)
  }
  const label = (r: number | null) => (r == null ? 'Toss-up' : cut && r <= 12 ? speedLabel(r, cut) : OUTCOME_LABELS[r] ?? '?')
  return idx.map(i => {
    const r = rows[i], p = picks[i]
    const pickName = p.w === 'a' ? names.get(r.a) : p.w === 'b' ? names.get(r.b) : null
    return {
      date: r.d, a: { id: r.a, name: names.get(r.a) ?? '?', wrr: r.wa }, b: { id: r.b, name: names.get(r.b) ?? '?', wrr: r.wb },
      projected: p.w === 'even' ? 'Toss-up' : `${pickName ?? '?'} · ${label(p.r)}`,
      happened: `${(r.aw === 'a' ? names.get(r.a) : names.get(r.b)) ?? '?'} · ${label(r.ar)}`,
      winnerFinishes: p.w === 'a' ? r.finA : p.w === 'b' ? r.finB : null,
      g,
    }
  })
}

const genderOf = (v: unknown): 'M' | 'F' => (v === 'F' ? 'F' : 'M')

// side A is the higher WRR going in, so it's the odds table's favorite
const oddsBouts = (rows: EvalRow[]) => rows.map(r => ({ favWrr: r.wa, dogWrr: r.wb, rankFav: r.aw === 'a' ? r.ar : 33 - r.ar }))
const tableFrom = (rows: EvalRow[], label: string) => buildOddsTable(oddsBouts(rows), label)

/** Picks with outcome odds graded fairly: each half of the season replayed with the odds table built from the other half */
function heldOutPicks(rows: EvalRow[], params: ProjectionParams): Pick[] {
  const halves = [0, 1].map(h => rows.filter(r => r.id % 2 === h))
  const tables = halves.map((h, i) => tableFrom(h, `half ${i}`))
  const byId = new Map<number, Pick>()
  // the other half's odds table and win curve, so no bout is graded with odds built from itself
  halves.forEach((h, i) => replayPicks(h, { ...params, odds: { ...params.odds, table: tables[1 - i], winCurve: buildWinCurve(halves[1 - i], params) },
    weight: { ...params.weight, mix: params.weight.on ? weightMixFrom(halves[1 - i]) : null } }).forEach((p, j) => byId.set(h[j].id, p)))
  return rows.map(r => byId.get(r.id)!)
}

/** The odds themselves, graded on held-out halves: the pick (likeliest of ten outcomes), the top three, and how
 *  honest the odds are (when the pick said ~55%, how often it happened) */
function oddsReport(rows: EvalRow[], minCell = DEFAULT_ODDS.minCell, recordK = DEFAULT_ODDS.recordK) {
  const halves = [0, 1].map(h => rows.filter(r => r.id % 2 === h))
  const tables = halves.map((h, i) => tableFrom(h, `half ${i}`))
  let n = 0, top1 = 0, top3 = 0, pin1 = 0, pin3 = 0
  const cal = new Map<number, { n: number; hit: number; said: number }>()
  halves.forEach((h, i) => {
    for (const r of h) {
      const act = outcomeIndex(r.aw === 'a' ? r.ar : 33 - r.ar)
      const top = topOutcomes(oddsFor(tables[1 - i], r.wa, r.wb, r.finA, r.finB, { minCell, recordK, useRecords: true }), 3)
      n++
      if (top[0].i === act) top1++
      if (top.some(t => t.i === act)) top3++
      if (act === 0) pin1++
      if (act === 0 || act === 5 || act === 3) pin3++
      const b = Math.min(9, Math.floor(top[0].pct / 10))
      const c = cal.get(b) ?? cal.set(b, { n: 0, hit: 0, said: 0 }).get(b)!
      c.n++; c.said += top[0].pct; if (top[0].i === act) c.hit++
    }
  })
  return {
    bouts: n, pickRight: 100 * top1 / n, inTop3: 100 * top3 / n,
    // always "favorite by pin" / its top three "favorite by pin, underdog by pin, favorite by decision"
    pinPickRight: 100 * pin1 / n, pinInTop3: 100 * pin3 / n,
    calibration: [...cal].sort((x, y) => x[0] - y[0]).map(([b, c]) => ({ from: b * 10, bouts: c.n, said: c.said / c.n, happened: 100 * c.hit / c.n })),
  }
}

export async function GET(req: NextRequest) {
  const a = await admin(); if (a.error) return a.error
  const g = genderOf(req.nextUrl.searchParams.get('gender'))
  const db = createSupabaseAdmin()
  try {
    const settings = await loadSettings(db, g)
    // the seasons with tracked bouts, newest first
    const seasons: string[] = []
    for (const s of [...(await getSeasons())].sort((x, y) => y.id - x.id)) {
      const { count } = await db.from('match_projections').select('id', { count: 'exact', head: true }).eq('gender', g).eq('season', s.label)
      if (count) seasons.push(s.label)
    }
    const season = req.nextUrl.searchParams.get('season') ?? seasons[0] ?? null
    if (!season) return NextResponse.json({ settings, seasons, season: null })
    const rows = await loadRows(db, g, season)
    const active = settings.find(s => s.is_active) ?? null
    const vLabel = (id: number) => { const s = settings.find(x => x.id === id); return s ? `Version ${s.version}` : `#${id}` }
    const frozen = frozenPicks(rows)
    const replay = active ? replayPicks(rows, active.params) : frozen
    // a bout projected by a speed version is graded on that version's bands
    const bandsOf = new Map(settings.filter(s => s.params.scale === 'speed' && s.params.bands).map(s => [s.id, s.params.bands!]))
    const gradedRows = bandsOf.size ? rows.map(r => (bandsOf.has(r.sid) ? onSpeedScale([r], bandsOf.get(r.sid)!)[0] : r)) : rows
    const activeRows = active?.params.scale === 'speed' && active.params.bands ? onSpeedScale(rows, active.params.bands) : rows
    return NextResponse.json({
      settings, seasons, season, bouts: rows.length, cutoffs: cutoffsFrom(rows),
      // the spread chart: what happened at each WRR spread vs what the active ladder assumes, on both scales
      spread: {
        clock: spreadChart(rows, (active?.params ?? withDefaults(null)).ladder),
        speed: spreadChart(onSpeedScale(rows, cutoffsFrom(rows)), (active?.params ?? withDefaults(null)).ladder),
        kind: spreadKindChart(rows, (active?.params ?? withDefaults(null)).ladder),
      },
      recorded: evaluate(gradedRows, frozen, vLabel),
      active: evaluate(activeRows, replay, vLabel),
      odds: { ...oddsReport(rows), table: tableFrom(rows, season) as OddsTable },
      misses: {
        upset: await describe(db, g, rows, frozen, biggestMisses(rows, frozen, 'upset', 25)),
        finish: await describe(db, g, rows, frozen, biggestMisses(rows, frozen, 'finish', 25)),
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const a = await admin(); if (a.error) return a.error
  const body = await req.json()
  const g = genderOf(body?.gender)
  if (typeof body?.season !== 'string') return NextResponse.json({ error: 'season required' }, { status: 400 })
  const db = createSupabaseAdmin()
  try {
    const settings = await loadSettings(db, g)
    const active = settings.find(s => s.is_active)
    if (!active) return NextResponse.json({ error: 'No active settings' }, { status: 400 })
    const rows = await loadRows(db, g, body.season)
    const params = withDefaults(body.params)
    // the speed scale grades what happened by speed band too (cutoffs from this season's own timed bouts)
    const cut = params.scale === 'speed' ? cutoffsFrom(rows) : undefined
    const testRows = cut ? onSpeedScale(rows, cut) : rows
    const activeRows = active.params.scale === 'speed' && active.params.bands ? onSpeedScale(rows, active.params.bands) : rows
    const before = active.params.odds.on ? heldOutPicks(rows, active.params) : replayPicks(rows, active.params)
    const after = params.odds.on ? heldOutPicks(rows, params) : replayPicks(rows, params)
    return NextResponse.json({
      active: evaluate(activeRows, before), test: evaluate(testRows, after), changes: compareChanges(activeRows, before, after, testRows),
      // the bar a finish lever has to beat: every bout a 1st Period Pin for the WRR favorite
      baseline: evaluate(rows, replayPicks(rows, { ...active.params, byLevel: { on: true, maxGap: 999, splitAt: 999, pinRank: 3, decRank: 15 }, fromRecord: { ...active.params.fromRecord, on: false }, finishStyle: { ...active.params.finishStyle, on: false }, hardToPin: { ...active.params.hardToPin, on: false }, bonusCap: { ...active.params.bonusCap, on: false } })),
      scale: params.scale, cutoffs: cut ?? null,
      misses: { finish: await describe(db, g, testRows, after, biggestMisses(testRows, after, 'finish', 15), cut) },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const a = await admin(); if (a.error) return a.error
  const body = await req.json()
  const g = genderOf(body?.gender)
  const params = withDefaults(body?.params)
  const db = createSupabaseAdmin()
  // speed bands: the saved version carries its band cutoffs, built from the season's tracked bouts, so its labels and
  // grading mean what they meant when it was saved
  if (params.scale === 'speed') {
    if (typeof body?.season !== 'string') return NextResponse.json({ error: 'season required to build the speed bands' }, { status: 400 })
    const rows = await loadRows(db, g, body.season)
    const cut = cutoffsFrom(rows)
    if (!cut.n.pin || !cut.n.tech) return NextResponse.json({ error: `No timed pins / techs in ${body.season} to build bands from` }, { status: 400 })
    params.bands = cut
  } else params.bands = null
  // outcome odds: the saved version carries its odds table, built from the season's tracked bouts
  if (params.odds.on) {
    if (typeof body?.season !== 'string') return NextResponse.json({ error: 'season required to build the odds table' }, { status: 400 })
    const rows = await loadRows(db, g, body.season)
    if (!rows.length) return NextResponse.json({ error: `No tracked bouts in ${body.season} to build odds from` }, { status: 400 })
    params.odds = { ...params.odds, table: tableFrom(rows, body.season), winCurve: buildWinCurve(rows, params) }
  } else params.odds = { ...params.odds, table: null, winCurve: null }
  // weight groups: the saved version carries the season's finish mix by group
  if (params.weight.on) {
    if (typeof body?.season !== 'string') return NextResponse.json({ error: 'season required to build the weight mix' }, { status: 400 })
    params.weight = { ...params.weight, mix: weightMixFrom(await loadRows(db, g, body.season)) }
  } else params.weight = { ...params.weight, mix: null }
  const settings = await loadSettings(db, g)
  const version = Math.max(0, ...settings.map(s => s.version)) + 1
  // one active version per side (unique index): retire the old, then add the new
  const { error: offErr } = await db.from('projection_settings').update({ is_active: false }).eq('gender', g).eq('is_active', true)
  if (offErr) return NextResponse.json({ error: offErr.message }, { status: 500 })
  const { data, error } = await db.from('projection_settings').insert({
    gender: g, version, name: typeof body?.name === 'string' && body.name.trim() ? body.name.trim() : `Version ${version}`,
    note: typeof body?.note === 'string' ? body.note.trim() || null : null, params, is_active: true, created_by: a.user!.email ?? null,
  }).select('id, version').single()
  if (error) {
    // put the old one back rather than leave the side with none
    const prev = settings.find(s => s.is_active)
    if (prev) await db.from('projection_settings').update({ is_active: true }).eq('id', prev.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, id: data.id, version: data.version })
}
