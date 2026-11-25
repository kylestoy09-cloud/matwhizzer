// Save one championship (level + year) read from its PDFs (src/lib/ncaa/parse.ts): each entrant with college, seed,
// record and place, matched to our wrestlers (src/lib/ncaa/match.ts). Re-importing a year keeps Kyle's decisions
// (confirmed / not ours) for the same entrant. Per side: {boys,girls}_college_events / _college_entries.
import type { SupabaseClient } from '@supabase/supabase-js'
import { resultType, type NcaaBout, type NcaaWeight } from '@/lib/ncaa/parse'
import { matchEntrant, matchPool, poolIndex, collegeTimingFits, collegeWeightFits } from '@/lib/ncaa/match'
import { LEVEL_COLLEGE_FIXES } from '@/lib/ncaa/colleges'

export type Side = 'M' | 'F'
export const collegeTables = (g: Side) => ({ events: g === 'F' ? 'girls_college_events' : 'boys_college_events', entries: g === 'F' ? 'girls_college_entries' : 'boys_college_entries' })
export type Pool = ReturnType<typeof poolIndex>
export const loadPool = async (db: SupabaseClient, g: Side): Promise<Pool> => poolIndex(await matchPool(db, g))

export type SaveResult = { event_id: number; entrants: number; auto: number; review: number; none: number; kept: number; unknown_colleges: string[]; places_added: string[]; bouts: number }

export async function saveCollegeYear(db: SupabaseClient, g: Side, level: string, year: number, weights: NcaaWeight[], files: string[], by: string, pool?: Pool, bouts: NcaaBout[] = []): Promise<SaveResult> {
  const T = collegeTables(g)
  const { data: ev, error: eErr } = await db.from(T.events).upsert({ level, year, source_files: files, imported_at: new Date().toISOString(), imported_by: by }, { onConflict: 'level,year' }).select('id').single()
  if (eErr) throw new Error(`${T.events}: ${eErr.message}`)
  const { data: aliases, error: aErr } = await db.from('college_aliases').select('alias, college_id')
  if (aErr) throw new Error(`college_aliases: ${aErr.message}`)
  const college = new Map((aliases ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
  // a name this level's files misprint (LEVEL_COLLEGE_FIXES) resolves to the college it means
  for (const [printed, meant] of Object.entries(LEVEL_COLLEGE_FIXES[level] ?? {})) { const id = college.get(meant); if (id != null) college.set(printed, id) }
  // decisions already made on this year's entrants
  const { data: before } = await db.from(T.entries).select('weight, name, college_raw, wrestler_id, match_status, match_note, reviewed_at, reviewed_by').eq('event_id', ev.id)
  const kept = new Map((before ?? []).filter(b => b.match_status === 'confirmed' || b.match_status === 'not_ours').map(b => [`${b.weight}|${b.name}|${b.college_raw}`, b]))
  // a decision on the same name at the same college in another year applies here too (Kyle: "if i say no once, it's
  // still no the second time")
  const { data: elsewhere } = await db.from(T.entries).select('name, college_id, college_raw, wrestler_id, match_status, match_note, reviewed_at, reviewed_by').neq('event_id', ev.id).in('match_status', ['confirmed', 'not_ours'])
  const decided = new Map((elsewhere ?? []).map(d => [`${d.name}|${d.college_id ?? d.college_raw}`, d]))
  // the same name at the same college as a wrestler matched in another year within 6 years is him (Ashnault 2019 = 6
  // years after high school, before the 2020+ window): his career, not a new name match
  const { data: matchedElsewhere } = await db.from(T.entries).select('name, college_id, college_raw, wrestler_id, event:' + T.events + '(year)').neq('event_id', ev.id).eq('match_status', 'auto').not('wrestler_id', 'is', null).limit(5000)
  const career = new Map<string, { wrestler_id: string; years: number[] }>()
  for (const d of (matchedElsewhere ?? []) as unknown as { name: string; college_id: number | null; college_raw: string; wrestler_id: string; event: { year: number } }[]) {
    const k = `${d.name}|${d.college_id ?? d.college_raw}`, c = career.get(k) ?? career.set(k, { wrestler_id: d.wrestler_id, years: [] }).get(k)!
    if (c.wrestler_id === d.wrestler_id) c.years.push(d.event.year)
  }
  for (const d of elsewhere ?? []) if (d.match_status === 'confirmed' && d.wrestler_id) { const k = `${d.name}|${d.college_id ?? d.college_raw}`; if (!career.has(k)) career.set(k, { wrestler_id: d.wrestler_id, years: [] }) }
  const idx = pool ?? await loadPool(db, g)
  const rows: Record<string, unknown>[] = []
  const unknown = new Set<string>()
  const tally = { auto: 0, review: 0, none: 0, kept: 0 }
  const nm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '')
  const lastNm = (x: string) => nm(x.trim().split(/\s+/).slice(-1)[0] ?? '')
  const added: string[] = []
  for (const w of weights) {
    // an entrant printed twice at a weight (older printouts list a wrestler on several bracket lines) is one entrant
    w.entrants = [...new Map(w.entrants.map(e => [`${e.name}|${e.school}`, e])).values()]
    // each place goes to one entrant: same name and college, else the one entrant there with that last name and college;
    // a place winner the bracket pages didn't give (or spell the same) is added as an entrant so the place isn't lost
    const placeOf = new Map<string, number>()
    for (const p of w.placers) {
      const pc = college.get(p.school.toLowerCase()) ?? null
      const same = (e: { name: string; school: string }) => e.school === p.school || (pc != null && college.get(e.school.toLowerCase()) === pc)
      let e = w.entrants.find(x => nm(x.name) === nm(p.name) && same(x))
      if (!e) { const byLast = w.entrants.filter(x => lastNm(x.name) === lastNm(p.name) && same(x)); if (byLast.length === 1) e = byLast[0] }
      if (!e) { e = { name: p.name, school: p.school, seed: p.seed, record: null }; w.entrants.push(e); added.push(`${w.weight} ${p.place}: ${p.name} (${p.school})`) }
      placeOf.set(`${e.name}|${e.school}`, p.place)
    }
  for (const e of w.entrants) {
    const cid = college.get(e.school.toLowerCase()) ?? null
    if (cid == null) unknown.add(e.school)
    const place = placeOf.get(`${e.name}|${e.school}`) ?? null
    const prior = kept.get(`${w.weight}|${e.name}|${e.school}`) ?? decided.get(`${e.name}|${cid ?? e.school}`)
    const m = matchEntrant(idx, e.name, year, w.weight)
    const base = { event_id: ev.id, weight: w.weight, name: e.name, college_id: cid, college_raw: e.school, seed: e.seed, record: e.record, place }
    if (prior) { rows.push({ ...base, wrestler_id: prior.wrestler_id, match_status: prior.match_status, match_note: prior.match_note, reviewed_at: prior.reviewed_at, reviewed_by: prior.reviewed_by }); tally.kept++; continue }
    const car = career.get(`${e.name}|${cid ?? e.school}`)
    // his career at the college carries him into another year only when that year fits his high school timing too
    // (Kyle 2026-11-19: Oklahoma State's Pat Smith, 1990–94, rode one borderline 1990 match onto Seton Hall Prep's, 1983)
    const carW = car ? idx.byId.get(car.wrestler_id) : undefined
    if (m.status !== 'auto' && car && car.years.some(y => Math.abs(y - year) <= 6) && (!carW || (collegeTimingFits(carW, year) && collegeWeightFits(carW, w.weight) !== 'light'))) {
      rows.push({ ...base, wrestler_id: car.wrestler_id, match_status: 'auto', match_note: JSON.stringify({ note: `same name at the same college as his matched years (${[...new Set(car.years)].sort().join(', ')})`, candidates: [] }) })
      tally.auto++; continue
    }
    rows.push({ ...base, wrestler_id: m.wrestler_id, match_status: m.status, match_note: m.status === 'none' ? null : JSON.stringify({ note: m.note, candidates: m.candidates }) })
    tally[m.status]++
  }
  }
  const { error: dErr } = await db.from(T.entries).delete().eq('event_id', ev.id)
  if (dErr) throw new Error(`${T.entries}: ${dErr.message}`)
  const idOf = new Map<string, number>()
  for (let i = 0; i < rows.length; i += 500) {
    const { data, error } = await db.from(T.entries).insert(rows.slice(i, i + 500)).select('id, weight, name, college_raw')
    if (error) throw new Error(`${T.entries}: ${error.message}`)
    for (const r of data ?? []) idOf.set(`${r.weight}|${r.name}|${r.college_raw}`, r.id as number)
  }
  // bouts (when the layout gives them): winner and loser are entrants of this championship
  let saved = 0
  const boutTable = g === 'F' ? 'girls_college_bouts' : 'boys_college_bouts'
  const boutRows = bouts.flatMap(b => {
    const w = idOf.get(`${b.weight}|${b.winner.name}|${b.winner.school}`)
    if (!w) return []
    const r = resultType(b.result)
    return [{ event_id: ev.id, weight: b.weight, bout_no: b.bout, winner_entry_id: w, loser_entry_id: b.loser ? idOf.get(`${b.weight}|${b.loser.name}|${b.loser.school}`) ?? null : null, result_raw: b.result, result_type: r.type, fall_secs: r.secs, ...(b.round ? { round: b.round } : {}) }]
  })
  for (let i = 0; i < boutRows.length; i += 500) {
    const { error } = await db.from(boutTable).insert(boutRows.slice(i, i + 500))
    if (error) throw new Error(`${boutTable}: ${error.message}`)
    saved += Math.min(500, boutRows.length - i)
  }
  return { event_id: ev.id, entrants: rows.length, ...tally, unknown_colleges: [...unknown], places_added: added, bouts: saved }
}
