// Playoff History: Load / Unload one staged season (Kyle 2026-11-14), from the review tool. Writes what the district,
// region and state pages read — tournaments, tournament_entries, matches — plus any old weight classes the season used
// and each co-op's name that season (school_season_names). The season stays hidden until Kyle switches it on.
// Needs every entry to have its wrestler (Create profiles). Unload removes exactly what Load wrote: these seasons are
// history-only for the side (stage 'history'), so everything in them came from here.
import type { SupabaseClient } from '@supabase/supabase-js'

type G = 'M' | 'F'
// boys 2020-21's four super regions (Kyle 2026-11-14: "call them North I, North II, Central and South")
const BOYS_NAMED: Record<number, string> = { 1: 'North I', 2: 'North II', 3: 'Central', 4: 'South' }
// girls regions as the site keys them (2024-25: r1 North I, r2 North II, r3 Central, r4 South); r5 = 2019-22's North
const GIRLS_REGION_ID: Record<number, number> = { 1: 10, 2: 11, 3: 9, 4: 12 }

async function all<T>(q: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if ((data ?? []).length < 1000) return out
  }
}
const chk = <T>(r: { data: T | null; error: { message: string } | null }, what: string): T => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data as T }
const isoDate = (d: string | undefined) => { const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(d ?? ''); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null }

async function assertHistory(db: SupabaseClient, g: G, season: number) {
  const { data } = await db.from('season_gender_state').select('stage').eq('season_id', season).eq('gender', g)
  if (!data?.length || data.some(r => r.stage !== 'history')) throw new Error(`${season} isn't a Playoff History season for this side`)
}

async function nextId(db: SupabaseClient, table: string) {
  const { data } = await db.from(table).select('id').order('id', { ascending: false }).limit(1)
  return ((data?.[0]?.id as number | undefined) ?? 0) + 1
}

/** A region row for the named regions of an odd season (boys 2021 super regions, girls 2019-22 North). */
async function regionId(db: SupabaseClient, g: G, name: string) {
  const { data } = await db.from('regions').select('id').eq('gender', g).eq('name', name).maybeSingle()
  if (data) return data.id as number
  const id = await nextId(db, 'regions')
  chk(await db.from('regions').insert({ id, name, gender: g }).select('id'), `region ${name}`)
  return id
}

export async function loadSeason(db: SupabaseClient, g: G, season: number, by: string | null) {
  await assertHistory(db, g, season)
  const { data: st } = await db.from('playoff_history_seasons').select('status, summary').eq('season_id', season).eq('gender', g).single()
  if (!st) throw new Error('season not staged')
  if (st.status === 'loaded') throw new Error('already loaded — unload it first to load it again')
  const { count: have } = await db.from('tournaments').select('*', { count: 'exact', head: true }).eq('season_id', season).eq('gender', g)
  if (have) throw new Error(`${have} tournaments already exist for this season — unload first`)
  const ents = await all<{ id: number; kind: string; num: number | null; weight: number; name: string; team: string; seed: number | null; wrestler_id: string | null }>((f, t) =>
    db.from('playoff_history_entrants').select('id, kind, num, weight, name, team, seed, wrestler_id').eq('gender', g).eq('season_id', season).order('id').range(f, t))
  const schools = new Map((await all<{ raw_name: string; school_id: number | null; coop_name: string | null }>((f, t) =>
    db.from('playoff_history_schools').select('raw_name, school_id, coop_name').eq('gender', g).order('raw_name').range(f, t))).map(r => [r.raw_name, r]))
  const missing = ents.filter(e => !e.wrestler_id && schools.get(e.team)?.school_id != null)
  if (missing.length) throw new Error(`${missing.length} entries have no wrestler yet — run Create profiles`)
  const bouts = await all<Record<string, unknown>>((f, t) => db.from('playoff_history_bouts').select('*').eq('gender', g).eq('season_id', season).order('id').range(f, t))

  // weight classes this season used that the site doesn't have (145, 152 … before 2021-22)
  const wcs = await all<{ id: number; weight: number; gender: string }>((f, t) => db.from('weight_classes').select('id, weight, gender').eq('gender', g).order('id').range(f, t))
  const wcOf = new Map(wcs.map(w => [w.weight, w.id]))
  let wcNext = await nextId(db, 'weight_classes')
  for (const w of [...new Set(ents.map(e => e.weight))].sort((a, b) => a - b)) {
    if (wcOf.has(w)) continue
    chk(await db.from('weight_classes').insert({ id: wcNext, weight: w, gender: g }).select('id'), `weight ${w}`)
    wcOf.set(w, wcNext++)
  }

  // tournaments: one per event
  const dates = (st.summary as { dates?: Record<string, string[]> }).dates ?? {}
  const events = [...new Map(ents.map(e => [`${e.kind}|${e.num ?? ''}`, { kind: e.kind, num: e.num }])).values()]
  const prefix = g === 'F' ? 'Girl_s' : 'Boy_s'
  const tourOf = new Map<string, number>()
  let tNext = await nextId(db, 'tournaments')
  const named2021 = g === 'M' && events.some(e => e.kind === 'region') && !events.some(e => e.kind === 'district')   // boys 2021: super regions, no districts
  for (const e of events) {
    const ds = (dates[`${e.kind}${e.num ?? ''}`] ?? []).map(isoDate).filter(Boolean).sort() as string[]
    const row: Record<string, unknown> = { id: tNext, season_id: season, gender: g, start_date: ds[0] ?? null, end_date: ds.length > 1 ? ds[ds.length - 1] : null }
    if (e.kind === 'district') Object.assign(row, { name: `${prefix} Districts District ${e.num}`, tournament_type: 'districts', district_id: e.num, region_id: Math.ceil(e.num! / 4) })
    else if (e.kind === 'state') Object.assign(row, { name: `${prefix} States`, tournament_type: g === 'F' ? 'girls_state' : 'boys_state' })
    else if (g === 'F') Object.assign(row, { name: `Girl_s Regions r${e.num}`, tournament_type: 'girls_regions', region_id: GIRLS_REGION_ID[e.num!] ?? await regionId(db, 'F', 'Girls Region North') })
    else Object.assign(row, { name: `Boy_s Regions r${e.num}`, tournament_type: 'regions', region_id: named2021 ? await regionId(db, 'M', BOYS_NAMED[e.num!]) : e.num })
    chk(await db.from('tournaments').insert(row).select('id'), `tournament ${row.name}`)
    tourOf.set(`${e.kind}|${e.num ?? ''}`, tNext++)
  }

  // entries
  const entryRows = ents.filter(e => e.wrestler_id).map(e => ({
    tournament_id: tourOf.get(`${e.kind}|${e.num ?? ''}`)!, wrestler_id: e.wrestler_id, school_id: schools.get(e.team)?.school_id ?? null,
    weight_class_id: wcOf.get(e.weight)!, seed: e.seed, grade: null, grade_label: null, school_context_raw: e.team, seed_source: e.seed != null ? 'flowrestling' : null,
  }))
  const entryOf = new Map<string, string>()
  for (let i = 0; i < entryRows.length; i += 1000) {
    const batch = entryRows.slice(i, i + 1000)
    const data = chk(await db.from('tournament_entries').insert(batch).select('id, tournament_id, wrestler_id, weight_class_id'), 'entries')
    for (const d of data) entryOf.set(`${d.tournament_id}|${d.weight_class_id}|${d.wrestler_id}`, d.id)
  }
  const wrestlerOf = new Map(ents.map(e => [`${e.kind}|${e.num ?? ''}|${e.weight}|${e.name}|${e.team}`, e.wrestler_id]))
  const entry = (kind: unknown, num: unknown, weight: number, name: unknown, team: unknown) => {
    const w = wrestlerOf.get(`${kind}|${num ?? ''}|${weight}|${name}|${team}`)
    return w ? entryOf.get(`${tourOf.get(`${kind}|${num ?? ''}`)}|${wcOf.get(weight)}|${w}`) ?? null : null
  }

  // bouts (a pin or tech with no time counts as 6:00, Kyle 2026-11-14)
  const matchRows = bouts.flatMap(b => {
    const winner = entry(b.kind, b.num, b.weight as number, b.winner, b.winner_team)
    if (!winner) return []
    return [{
      tournament_id: tourOf.get(`${b.kind}|${b.num ?? ''}`)!, weight_class_id: wcOf.get(b.weight as number)!, bracket_side: b.side, round: b.round,
      winner_entry_id: winner, loser_entry_id: b.loser ? entry(b.kind, b.num, b.weight as number, b.loser, b.loser_team) : null,
      win_type: b.win_type, winner_score: b.winner_score, loser_score: b.loser_score, fall_time_seconds: b.fall_seconds ?? (/^(FALL|TF)/.test(String(b.win_type)) ? 360 : null), score_raw: b.result_raw, validated: true,
    }]
  })
  for (let i = 0; i < matchRows.length; i += 1000) chk(await db.from('matches').insert(matchRows.slice(i, i + 1000)).select('id'), 'matches')

  // co-ops by their name that season
  const coop = new Map<number, string>()
  for (const e of ents) { const s = schools.get(e.team); if (s?.school_id != null && s.coop_name) coop.set(s.school_id, s.coop_name) }
  if (coop.size) chk(await db.from('school_season_names').upsert([...coop].map(([school_id, display_name]) => ({ school_id, season_id: season, gender: g, display_name })), { onConflict: 'school_id,season_id,gender' }).select('school_id'), 'season names')

  chk(await db.from('playoff_history_seasons').update({ status: 'loaded', loaded_at: new Date().toISOString(), loaded_by: by }).eq('season_id', season).eq('gender', g).select('season_id'), 'status')
  const placed = await buildPlacements(db, g, season)
  const team = await calcTeamScores(db, g, season)
  return { team_scores: team.schools, placements: placed.rows, tournaments: tourOf.size, entries: entryRows.length, matches: matchRows.length, skipped_bouts: bouts.length - matchRows.length, weight_classes_added: [...wcOf.keys()].filter(w => !wcs.some(x => x.weight === w)), coop_names: coop.size }
}

export async function unloadSeason(db: SupabaseClient, g: G, season: number) {
  await assertHistory(db, g, season)
  const { data: on } = await db.from('season_gender_state').select('history_public').eq('season_id', season).eq('gender', g).single()
  if (on?.history_public) throw new Error('switch the season off before unloading it')
  const tours = chk(await db.from('tournaments').select('id').eq('season_id', season).eq('gender', g), 'tournaments').map(t => t.id)
  let matches = 0, entries = 0
  for (let i = 0; i < tours.length; i += 20) {
    const ids = tours.slice(i, i + 20)
    chk(await db.from('placements').delete().in('tournament_id', ids).select('id'), 'placements')
    matches += chk(await db.from('matches').delete().in('tournament_id', ids).select('id'), 'matches').length
    chk(await db.from('precomputed_team_scores').delete().in('tournament_id', ids).eq('source', 'calculated').select('id'), 'team scores')
    entries += chk(await db.from('tournament_entries').delete().in('tournament_id', ids).select('id'), 'entries').length
  }
  if (tours.length) chk(await db.from('tournaments').delete().in('id', tours).select('id'), 'tournaments delete')
  chk(await db.from('school_season_names').delete().eq('season_id', season).eq('gender', g).select('school_id'), 'season names')
  chk(await db.from('playoff_history_seasons').update({ status: 'staged', loaded_at: null, loaded_by: null }).eq('season_id', season).eq('gender', g).select('season_id'), 'status')
  return { tournaments: tours.length, entries, matches }
}

// Placements (1st–8th) for a loaded season, from its placing bouts (Kyle 2026-11-14: the year's playoff page had no State
// Champions — state_champions, ghost_champions, On the Podium and others read the placements table, which only the
// live seasons had). Per weight: the final's winner / loser = 1st / 2nd, 3rd_Place = 3rd / 4th, 5th_Place, 7th_Place.
// A weight is used only when each placing round has one bout, nobody is in two of them and the champion lost no bout
// there (else it's listed in `skipped`). Only tournaments with no placements yet; Unload removes them.
const PLACE_ROUND: Record<string, number> = { F: 1, '3rd_Place': 3, '5th_Place': 5, '7th_Place': 7 }
export async function buildPlacements(db: SupabaseClient, g: G, season: number) {
  await assertHistory(db, g, season)
  const tours = chk(await db.from('tournaments').select('id, name').eq('season_id', season).eq('gender', g), 'tournaments') as { id: number; name: string }[]
  const rows: { tournament_id: number; weight_class_id: number; place: number; entry_id: string; wrestler_name_raw: string }[] = []
  const skipped: string[] = []
  for (const t of tours) {
    const { count } = await db.from('placements').select('id', { count: 'exact', head: true }).eq('tournament_id', t.id)
    if (count) continue
    const ms = await all<{ weight_class_id: number; round: string; winner_entry_id: string; loser_entry_id: string | null }>((f, to) =>
      db.from('matches').select('weight_class_id, round, winner_entry_id, loser_entry_id').eq('tournament_id', t.id).eq('validated', true).order('id').range(f, to))
    const ents = await all<Record<string, unknown>>((f, to) => db.from('tournament_entries').select('id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).order('id').range(f, to))
    const names = new Map(ents.map(e => { const w = e.wrestlers as { first_name: string; last_name: string } | null; return [e.id as string, w ? `${w.first_name} ${w.last_name}` : ''] }))
    for (const wc of new Set(ms.filter(m => m.round in PLACE_ROUND).map(m => m.weight_class_id))) {
      const add: typeof rows = [], used = new Set<string>()
      let bad = ''
      for (const [round, place] of Object.entries(PLACE_ROUND)) {
        const bs = ms.filter(m => m.weight_class_id === wc && m.round === round)
        if (!bs.length) continue
        if (bs.length > 1) { bad = `${bs.length} ${round} bouts`; break }
        for (const [e, p] of [[bs[0].winner_entry_id, place], [bs[0].loser_entry_id, place + 1]] as const) {
          if (!e) continue
          if (used.has(e)) { bad = `${names.get(e)} in two placing bouts`; break }
          used.add(e)
          add.push({ tournament_id: t.id, weight_class_id: wc, place: p, entry_id: e, wrestler_name_raw: names.get(e) ?? '' })
        }
        if (bad) break
      }
      const champ = add.find(x => x.place === 1)?.entry_id
      if (!bad && champ && ms.some(m => m.weight_class_id === wc && m.loser_entry_id === champ)) bad = `champion ${names.get(champ)} lost a bout`
      if (bad) skipped.push(`${t.name} weight class ${wc}: ${bad}`); else rows.push(...add)
    }
  }
  const ids: string[] = []
  for (let i = 0; i < rows.length; i += 500) ids.push(...chk(await db.from('placements').insert(rows.slice(i, i + 500)).select('id'), 'placements').map((r: { id: string }) => r.id))
  return { rows: rows.length, ids, skipped }
}

// Team scores for a loaded season: CALCULATED with the site's formula (Kyle 2026-11-13: "let's calculate and use our
// numbers for these years" — no copied standings exist), stored as source 'calculated' so a copied sheet can replace
// them. Labels as the pages read them (scripts/integrity_check.mts: boys_districts / regions / boys_state, girls_*).
const LABEL: Record<G, Record<string, string>> = {
  M: { districts: 'boys_districts', regions: 'regions', boys_state: 'boys_state' },
  F: { districts: 'girls_districts', girls_regions: 'girls_regions', girls_state: 'girls_state' },
}
export async function calcTeamScores(db: SupabaseClient, g: G, season: number) {
  await assertHistory(db, g, season)
  const tours = chk(await db.from('tournaments').select('id, name, tournament_type').eq('season_id', season).eq('gender', g), 'tournaments') as { id: number; name: string; tournament_type: string }[]
  if (tours.length) chk(await db.from('precomputed_team_scores').delete().in('tournament_id', tours.map(t => t.id)).eq('source', 'calculated').select('id'), 'clear')
  const rows: Record<string, unknown>[] = []
  for (const t of tours) {
    const num = /(\d+)$/.exec(t.name)?.[1]
    let totals: { school_id: number | null; school_name: string | null; school: string | null; total_points: number }[] = []
    if (t.tournament_type === 'districts') totals = chk(await db.rpc('district_team_score', { p_district: Number(num), p_gender: g, p_season: season }), t.name)
    else if (t.tournament_type === 'girls_regions') totals = chk(await db.rpc('girls_region_team_score', { p_region: num, p_season: season }), t.name)
    else if (t.tournament_type.endsWith('state')) totals = chk(await db.rpc('state_team_score', { p_gender: g, p_season: season }), t.name)
    else if (t.tournament_type === 'regions') {
      const per = chk(await db.rpc('region_team_pts', { p_region: Number(num), p_gender: g, p_season: season }), t.name) as { school_id: number | null; school_name: string | null; school: string | null; team_points: number }[]
      const by = new Map<number, { school_id: number; school_name: string | null; school: string | null; total_points: number }>()
      for (const r of per) if (r.school_id != null) { const x = by.get(r.school_id) ?? by.set(r.school_id, { school_id: r.school_id, school_name: r.school_name, school: r.school, total_points: 0 }).get(r.school_id)!; x.total_points += Number(r.team_points) }
      totals = [...by.values()]
    }
    for (const r of totals) if (r.school_id != null && Number(r.total_points) > 0)
      rows.push({ tournament_id: t.id, school_id: r.school_id, school_name: r.school_name ?? r.school ?? '', total_points: Number(r.total_points), season_id: season, tournament_type: LABEL[g][t.tournament_type], source: 'calculated' })
  }
  let id = await nextId(db, 'precomputed_team_scores')
  for (let i = 0; i < rows.length; i += 500) chk(await db.from('precomputed_team_scores').insert(rows.slice(i, i + 500).map(r => ({ ...r, id: id++ }))).select('id'), 'team scores')
  return { tournaments: tours.length, schools: rows.length }
}
