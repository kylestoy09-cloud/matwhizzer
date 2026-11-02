// Link every bout side that has a name but no wrestler (and every linked side with no school)
// to the right profile, so no page has to fall back to imported text. 2026-11-02.
//   npx tsx --tsconfig tsconfig.json scripts/resolve_unlinked_bouts.mts            (dry run)
//   npx tsx --tsconfig tsconfig.json scripts/resolve_unlinked_bouts.mts --apply
// A side links to a profile only when exactly one same-gender profile with that name already
// wrestles (or has an alias) at that school. Otherwise a new profile is made at that school
// (out-of-state when the school is). Forfeit / "Unknown" sides are not wrestlers and stay empty.
// Mirrors /api/admin/unlinked-duals: an alias is added and a won dual side gets winner_id.
import { createClient } from '@supabase/supabase-js'
import { splitWrestlerAtSchool } from '../src/lib/splitWrestler'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string, key = 'id') {
  const out: any[] = []; let last: any = null
  for (;;) { let q = db.from(t).select(cols).order(key).limit(1000); if (last != null) q = q.gt(key, last); const d = chk(await q, t); out.push(...d); if (d.length < 1000) break; last = d[d.length - 1][key] }
  return out
}
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[`'’.]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()
const blank = (s: any) => s == null || String(s).trim() === ''
const NOT_A_WRESTLER = /^(unknown|forfeit( forfeit)?|medical forfeit|forefit a)$/

// Raw school text on in-season tournament bouts that never resolved to a school id
const RAW_SCHOOL: Record<string, number> = {
  'Northern Valley Regional (Old Tappan) HS': 6, 'Eastside ( Paterson)': 72, 'BCIT': 256,
  'Charter School of Wilmington': 611, 'Milford Senior': 620, 'Sussex Central H S': 652, 'Sussex Tech H S': 650,
  'Delmar Junior-Senior H S': 814, 'Great Valley Hs': 824, 'Red Lion Area Hs': 865, 'Spring Grove Area Hs': 874,
  'West Chester Henderson Hs': 894, 'Delcastle H S': 614, 'Palisades Hs': 610, 'Laurel H S': 606,
  'IC Catholic Prep - INACTIVE': 832, 'NORTH PENN HS (Lansdale)': 854,
}
// Same name already on a profile at another school, but a different person (different
// school, same season, other weights): split this school's bouts off onto a new profile.
const SPLIT_FROM: Record<string, string> = { 'hopewell valley|sebastian soto': 'e6235560-0707-4776-8426-4c9acba73410' }

const schools = new Map((await all('schools', 'id, display_name, is_nj')).map(s => [s.id, s]))
const wrestlers = await all('wrestlers', 'id, first_name, last_name, gender, is_oos')
const W = new Map(wrestlers.map(w => [w.id, w]))
const byName = new Map<string, any[]>()
for (const w of wrestlers) { const k = `${w.gender}|${norm(`${w.first_name} ${w.last_name}`)}`; byName.set(k, [...(byName.get(k) ?? []), w]) }
const aliases = await all('wrestler_name_aliases', 'id, wrestler_id, school_id')
// Schools a profile has bouts at, and schools it only has an alias at. An alias alone is not
// enough when the profile wrestles somewhere else: the 2026-07-31 alias build aliased common
// names at several schools to one person (e.g. Anthony Rodriguez, Keansburg and Lakeland).
const atSchool = new Map<string, Set<number>>(), aliasAt = new Map<string, Set<number>>()
const add = (m: Map<string, Set<number>>, w: string | null, s: number | null) => { if (!w || s == null) return; const x = m.get(w) ?? new Set(); x.add(s); m.set(w, x) }
const mark = (w: string | null, s: number | null) => add(atSchool, w, s)
for (const a of aliases) add(aliasAt, a.wrestler_id, a.school_id)

const tables = {
  M: { dual: 'dual_meet_matches', meets: 'dual_meets', tb: 'tournament_bouts' },
  F: { dual: 'dual_meet_matches_girls', meets: 'dual_meets_girls', tb: 'tournament_bouts_girls' },
} as const
const data: any = {}
for (const g of ['M', 'F'] as const) {
  const t = tables[g]
  const meets = new Map((await all(t.meets, 'id, team1_school_id, team2_school_id')).map(m => [m.id, m]))
  const dual = await all(t.dual, 'id, dual_meet_id, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id, winner_id, team1_points, team2_points, is_double_forfeit')
  const tb = await all(t.tb, 'id, round, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler1_school_raw, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, wrestler2_school_raw')
  for (const r of dual) { mark(r.wrestler_a_id, r.school_a_id); mark(r.wrestler_b_id, r.school_b_id) }
  for (const r of tb) { mark(r.wrestler1_id, r.wrestler1_school_id); mark(r.wrestler2_id, r.wrestler2_school_id) }
  data[g] = { meets, dual, tb }
}

type Side = { g: 'M' | 'F'; kind: 'dual' | 'tb'; row: any; side: string; name: string; school: number; fix?: Record<string, any> }
const groups = new Map<string, Side[]>()
const schoolOnly: { g: 'M' | 'F'; row: any; n: number; school: number }[] = []
const skipped: string[] = []
for (const g of ['M', 'F'] as const) {
  for (const r of data[g].dual) {
    if (r.is_double_forfeit) continue
    for (const s of ['a', 'b']) {
      const name = r[`wrestler_${s}_name_raw`]
      if (r[`wrestler_${s}_id`] || blank(name)) continue
      if (NOT_A_WRESTLER.test(norm(name))) { skipped.push(`dual ${name}`); continue }
      const k = `${g}|${r[`school_${s}_id`]}|${norm(name)}`
      groups.set(k, [...(groups.get(k) ?? []), { g, kind: 'dual', row: r, side: s, name: name.trim(), school: r[`school_${s}_id`] }])
    }
  }
  for (const r of data[g].tb) for (const n of [1, 2]) {
    let name = r[`wrestler${n}_name_raw`], raw = r[`wrestler${n}_school_raw`]
    let school = r[`wrestler${n}_school_id`] ?? (raw ? RAW_SCHOOL[raw.trim()] : undefined)
    let fix: Record<string, any> | undefined
    // "Name (BCIT | Westampton)" was split on the pipe: the name landed in round
    if (name === 'Westampton)' && / \(BCIT$/.test(r.round ?? '')) {
      name = r.round.replace(/ \(BCIT$/, ''); raw = 'BCIT'; school = 256
      fix = { round: 'UNK', [`wrestler${n}_name_raw`]: name, [`wrestler${n}_school_raw`]: 'BCIT (Westampton)' }
    }
    if (blank(name) && !r[`wrestler${n}_id`]) continue
    if (r[`wrestler${n}_id`]) {
      if (r[`wrestler${n}_school_id`] == null) {
        if (school == null) skipped.push(`tb linked, school unknown: ${name} / ${raw}`)
        else schoolOnly.push({ g, row: r, n, school })
      }
      continue
    }
    if (NOT_A_WRESTLER.test(norm(name))) { skipped.push(`tb ${name}`); continue }
    if (school == null) { skipped.push(`tb no school: ${name} / ${raw}`); continue }
    const k = `${g}|${school}|${norm(name)}`
    groups.set(k, [...(groups.get(k) ?? []), { g, kind: 'tb', row: r, side: String(n), name: name.trim(), school, fix }])
  }
}

const plan: string[] = []
let linked = 0, created = 0, split = 0, schoolSet = 0
for (const [k, sides] of groups) {
  const { g, school, name } = sides[0]
  const sname = `${schools.get(school)?.display_name} (${school})`
  const same = byName.get(`${g}|${norm(name)}`) ?? []
  const cands = same.filter(w => atSchool.get(w.id)?.has(school) || (!atSchool.has(w.id) && aliasAt.get(w.id)?.has(school)))
  // stale alias: this school's alias points at a same-name profile that wrestles elsewhere
  const staleAlias = cands.length ? undefined : aliases.find(a => a.school_id === school && same.some(w => w.id === a.wrestler_id))
  const splitFrom = SPLIT_FROM[`${norm(schools.get(school)?.display_name ?? '')}|${norm(name)}`]
  let action: string, wid: string | null = null
  if (splitFrom) action = `SPLIT off ${splitFrom.slice(0, 8)} → new profile`
  else if (cands.length === 1) { wid = cands[0].id; action = `link → ${wid.slice(0, 8)} ${cands[0].first_name} ${cands[0].last_name}` }
  else if (cands.length > 1) { plan.push(`?? ${g} ${name} @ ${sname}: ${cands.length} profiles at this school — skipped`); continue }
  else action = `NEW profile${schools.get(school)?.is_nj === false ? ' (out-of-state)' : ''}${staleAlias ? ` + move alias ${staleAlias.id} off ${staleAlias.wrestler_id.slice(0, 8)}` : ''}`
  plan.push(`${g} ${sides.length}x ${sides.map(s => s.kind).filter((v, i, a) => a.indexOf(v) === i).join('+')} ${name} @ ${sname}: ${action}`)
  if (!APPLY) continue
  if (splitFrom) {
    const parts = name.split(/\s+/)
    wid = (await splitWrestlerAtSchool(db as never, splitFrom, school, { first_name: parts[0], last_name: parts.slice(1).join(' '), grade: null }, { moveRecords: true })).newId
    split++
  } else if (!wid) {
    const parts = name.split(/\s+/)
    const tidy = (s: string) => s === s.toLowerCase() ? s.replace(/\b\w/g, c => c.toUpperCase()) : s
    wid = chk(await db.from('wrestlers').insert({ first_name: tidy(parts[0]), last_name: tidy(parts.slice(1).join(' ')), gender: g, is_oos: schools.get(school)?.is_nj === false }).select('id'), 'insert wrestler')[0].id
    created++
    if (staleAlias) chk(await db.from('wrestler_name_aliases').update({ wrestler_id: wid }).eq('id', staleAlias.id).select('id'), 'move alias')
  }
  // (the split helper adds its own alias, so check the table, not the list loaded at the start)
  const { data: hasAlias } = await db.from('wrestler_name_aliases').select('id').eq('raw_name', name).eq('school_id', school).limit(1)
  if (!staleAlias && !hasAlias?.length && !aliases.some(a => a.wrestler_id === wid && a.school_id === school))
    chk(await db.from('wrestler_name_aliases').insert({ raw_name: name, school_id: school, wrestler_id: wid }).select('id'), 'alias')
  for (const s of sides) {
    if (s.kind === 'dual') {
      const m = data[g].meets.get(s.row.dual_meet_id)
      const other = s.side === 'a' ? s.row.wrestler_b_id : s.row.wrestler_a_id
      const team1 = s.school === m?.team1_school_id
      const pts = team1 ? s.row.team1_points : s.row.team2_points, opp = team1 ? s.row.team2_points : s.row.team1_points
      const won = s.row.winner_id && s.row.winner_id === other ? false : (pts ?? 0) > 0 ? true : (opp ?? 0) > 0 ? false : null
      const upd: Record<string, any> = { [`wrestler_${s.side}_id`]: wid }
      if (!s.row.winner_id && won) upd.winner_id = wid
      chk(await db.from(tables[g].dual).update(upd).eq('id', s.row.id).is(`wrestler_${s.side}_id`, null).select('id'), 'dual update')
    } else {
      chk(await db.from(tables[g].tb).update({ ...(s.fix ?? {}), [`wrestler${s.side}_id`]: wid, [`wrestler${s.side}_school_id`]: s.school }).eq('id', s.row.id).is(`wrestler${s.side}_id`, null).select('id'), 'tb update')
    }
    linked++
  }
}
for (const x of schoolOnly) {
  const w = W.get(x.row[`wrestler${x.n}_id`])
  plan.push(`${x.g} school only: ${w?.first_name} ${w?.last_name} → ${schools.get(x.school)?.display_name} (${x.school})`)
  if (!APPLY) continue
  chk(await db.from(tables[x.g].tb).update({ [`wrestler${x.n}_school_id`]: x.school }).eq('id', x.row.id).is(`wrestler${x.n}_school_id`, null).select('id'), 'tb school')
  schoolSet++
}
console.log(plan.sort().join('\n'))
console.log(`\nleft empty (not wrestlers / unknown school): ${skipped.length}`)
const sk = new Map<string, number>(); for (const s of skipped) sk.set(s, (sk.get(s) ?? 0) + 1)
for (const [s, n] of sk) console.log(`  ${n}x ${s}`)
console.log(APPLY ? `\nAPPLIED: ${linked} sides linked, ${created} profiles created, ${split} split, ${schoolSet} school ids set` : '\nDRY RUN — rerun with --apply')
