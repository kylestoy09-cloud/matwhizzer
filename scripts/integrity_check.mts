// MatWhizzer data integrity check. Read-only. Every rule here must hold; each failure is
// counted with examples. Run before and after any data change:
//   npx tsx --tsconfig tsconfig.json scripts/integrity_check.mts [--json out.json]
// Rules come from real problems (2026-11-01/02): merged profiles, swapped dual sides,
// duplicate meets, skipped meets, out-of-state flags wrong in both directions.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { classifyOutcome } from '../src/lib/hammerScore'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string, f?: (q: any) => any, key = 'id') {
  const out: any[] = []; let last: any = null
  for (;;) { let q = db.from(t).select(cols).order(key).limit(1000); if (f) q = f(q); if (last != null) q = q.gt(key, last); const d = chk(await q, t); out.push(...d); if (d.length < 1000) break; last = d[d.length - 1][key] }
  return out
}
type Fail = { rule: string; count: number; examples: string[] }
const results: Fail[] = []
const rule = (name: string, items: string[]) => { results.push({ rule: name, count: items.length, examples: items.slice(0, 6) }) }

const schools = await all('schools', 'id, display_name, is_nj')
const sch = new Map(schools.map(s => [s.id, s]))
const sn = (id: number | null) => (id == null ? 'null' : sch.get(id)?.display_name ?? `#${id}`)
const wrestlers = await all('wrestlers', 'id, first_name, last_name, gender, is_oos, is_active')
const W = new Map(wrestlers.map(w => [w.id, w]))
const wn = (id: string) => { const w = W.get(id); return w ? `${w.first_name} ${w.last_name}` : id.slice(0, 8) }

// where each wrestler has wrestled (bouts and postseason entries), per gender table
const rec = new Map<string, Map<number, number>>()
// seasons each wrestler wrestled for each school (end year: 2025-26 = 2026)
const recSeason = new Map<string, Map<number, Set<number>>>()
const addRec = (w: string | null, s: number | null, season?: number | null) => { if (!w || s == null) return; const m = rec.get(w) ?? new Map(); m.set(s, (m.get(s) ?? 0) + 1); rec.set(w, m)
  if (season) { const ms = recSeason.get(w) ?? new Map<number, Set<number>>(); (ms.get(s) ?? ms.set(s, new Set()).get(s)!).add(season); recSeason.set(w, ms) } }
const seasonEnd = (label: string | null | undefined) => (label && /^\d{4}-\d{2}$/.test(label) ? Number(label.slice(0, 4)) + 1 : null)
const wrongGender: string[] = []
for (const g of ['M', 'F'] as const) {
  const mt = g === 'F' ? 'dual_meets_girls' : 'dual_meets', bt = g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const it = g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', tb = g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  const meets = new Map((await all(mt, `id, meet_date, season_id, team1_school_id, team2_school_id, team1_score, team2_score, status${g === 'F' ? ', meet_kind' : ''}`)).map(m => [m.id, m]))
  const bouts = await all(bt, 'id, dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id, winner_id, result_type, team1_points, team2_points')
  const L = g === 'F' ? 'girls' : 'boys'
  // dual bout rules
  const badWinner: string[] = [], badSide: string[] = [], badSchool: string[] = [], orphanBout: string[] = [], sameW: string[] = []
  const byMeet = new Map<string, any[]>()
  for (const b of bouts) {
    const m = meets.get(b.dual_meet_id); if (!m) { orphanBout.push(b.id); continue }
    ;(byMeet.get(m.id) ?? byMeet.set(m.id, []).get(m.id)!).push(b)
    if (b.winner_id && b.winner_id !== b.wrestler_a_id && b.winner_id !== b.wrestler_b_id) badWinner.push(`${m.meet_date} ${b.weight_class} ${b.id.slice(0, 8)}`)
    if (b.winner_id && ((b.team1_points > 0 && b.winner_id === b.wrestler_b_id) || (b.team2_points > 0 && b.winner_id === b.wrestler_a_id))) badSide.push(`${m.meet_date} ${b.weight_class} ${b.id.slice(0, 8)}`)
    if ((b.school_a_id != null && b.school_a_id !== m.team1_school_id) || (b.school_b_id != null && b.school_b_id !== m.team2_school_id)) badSchool.push(`${m.meet_date} ${sn(m.team1_school_id)} v ${sn(m.team2_school_id)}: bout ${sn(b.school_a_id)} v ${sn(b.school_b_id)}`)
    if (b.wrestler_a_id && b.wrestler_a_id === b.wrestler_b_id) sameW.push(b.id.slice(0, 8))
    for (const w of [b.wrestler_a_id, b.wrestler_b_id]) if (w && W.get(w) && W.get(w)!.gender !== g) wrongGender.push(`${wn(w)} (${W.get(w)!.gender}) in ${L} dual ${m.meet_date}`)
    addRec(b.wrestler_a_id, b.school_a_id, m.season_id); addRec(b.wrestler_b_id, b.school_b_id, m.season_id)
  }
  rule(`${L} duals: winner is not one of the two wrestlers`, badWinner)
  rule(`${L} duals: team points go to one side, winner on the other`, badSide)
  rule(`${L} duals: bout school is not that side's team`, badSchool)
  rule(`${L} duals: bout points to a missing meet`, orphanBout)
  void sameW   // same wrestler on both sides = a bye (see the tournament rule below)
  // meet rules
  // team point deductions (src/lib/parseDualMeet.ts reads them; the final score includes them)
  const ded = new Map<string, [number, number]>()
  for (const d of await all(g === 'F' ? 'dual_meet_deductions_girls' : 'dual_meet_deductions', 'id, dual_meet_id, team1_points, team2_points')) { const x = ded.get(d.dual_meet_id) ?? [0, 0]; x[0] += Number(d.team1_points); x[1] += Number(d.team2_points); ded.set(d.dual_meet_id, x) }
  const scoreOff: string[] = [], dupMeet: string[] = [], dupWeight: string[] = []
  const sig = new Map<string, string>()
  for (const [id, bs] of byMeet) {
    const m = meets.get(id)!
    const dd = ded.get(id) ?? [0, 0]
    const p1 = bs.reduce((a, b) => a + (b.team1_points ?? 0), 0) + dd[0], p2 = bs.reduce((a, b) => a + (b.team2_points ?? 0), 0) + dd[1]
    // a dual tied on bouts is settled by criteria: the winner's score carries 1 extra point
    const tiebreak = p1 === p2 && ((m.team1_score === p1 + 1 && m.team2_score === p2) || (m.team2_score === p2 + 1 && m.team1_score === p1))
    if (m.status === 'final' && (m.meet_kind ?? 'dual') === 'dual' && m.team1_score != null && !tiebreak && (p1 !== m.team1_score || p2 !== m.team2_score)) scoreOff.push(`${m.meet_date} ${sn(m.team1_school_id)} ${m.team1_score}-${m.team2_score} ${sn(m.team2_school_id)} (bouts ${p1}-${p2})`)
    const real = bs.filter(b => b.wrestler_a_id || b.wrestler_b_id)
    const s = `${m.meet_date}|` + real.map(b => `${b.weight_class}:${b.wrestler_a_name_raw}/${b.wrestler_b_name_raw}/${b.result_type}`).sort().join('|')
    if (real.length >= 3) { if (sig.has(s)) dupMeet.push(`${m.meet_date} ${sn(m.team1_school_id)} v ${sn(m.team2_school_id)} = ${sig.get(s)}`); else sig.set(s, `${sn(m.team1_school_id)} v ${sn(m.team2_school_id)}`) }
    // girls duals may wrestle a weight twice (Kyle, 2026-11-05): boys only
    const wc = real.map(b => b.weight_class); if (g === 'M' && new Set(wc).size !== wc.length) dupWeight.push(`${m.meet_date} ${sn(m.team1_school_id)} v ${sn(m.team2_school_id)}`)
  }
  rule(`${L} duals: final score differs from bout points`, scoreOff)
  rule(`${L} duals: same meet imported twice`, dupMeet)
  if (g === 'M') rule(`${L} duals: a weight wrestled twice in one dual`, dupWeight)
  // tournament bouts
  const istSeason = new Map((await all(it, 'id, season')).map((t: any) => [t.id, seasonEnd(t.season)]))
  const tbs = await all(tb, 'id, in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id, winner')
  const tSame: string[] = []
  for (const b of tbs) {
    const se = istSeason.get(b.in_season_tournament_id) ?? null
    addRec(b.wrestler1_id, b.wrestler1_school_id, se); addRec(b.wrestler2_id, b.wrestler2_school_id, se)
    if (b.wrestler1_id && b.wrestler1_id === b.wrestler2_id) tSame.push(b.id.slice(0, 8))
    for (const w of [b.wrestler1_id, b.wrestler2_id]) if (w && W.get(w) && W.get(w)!.gender !== g) wrongGender.push(`${wn(w)} (${W.get(w)!.gender}) in ${L} tournament bout`)
  }
  // a bout with the same wrestler on both sides is how a results file lists a bye (Kyle,
  // 2026-11-06: Ella Magee, SJWHOF 2026): not a failure. Records skip it (NC is unscored).
  void tSame
}
const tSeason = new Map((await all('tournaments', 'id, season_id')).map((t: any) => [t.id, t.season_id]))
for (const e of await all('tournament_entries', 'id, wrestler_id, school_id, tournament_id')) addRec(e.wrestler_id, e.school_id, tSeason.get(e.tournament_id))
rule('wrestler of one gender in the other gender\'s bouts', wrongGender)

// out-of-state flag, both directions
const notFlaggedNonNj: string[] = [], flaggedNj: string[] = [], mixed: string[] = []
for (const [w, m] of rec) {
  const ww = W.get(w); if (!ww) continue
  const s = [...m.keys()], non = s.filter(x => sch.get(x)?.is_nj === false), nj = s.filter(x => sch.get(x)?.is_nj === true)
  const desc = `${ww.gender} ${wn(w)}: ${s.map(x => `${sn(x)}${sch.get(x)?.is_nj === false ? '*' : ''} ${m.get(x)}`).join(' / ')}`
  // a transfer between seasons is fine (August Cassidy: Nottingham 2024-25, Peddie 2025-26)
  const ms = recSeason.get(w), seasonsOf = (xs: number[]) => new Set(xs.flatMap(x => [...(ms?.get(x) ?? [])]))
  const nonS = seasonsOf(non), sameSeason = [...seasonsOf(nj)].some(y => nonS.has(y)) || !ms
  if (non.length && nj.length && sameSeason) mixed.push(desc)
  else if (non.length && !ww.is_oos) notFlaggedNonNj.push(desc)
  else if (nj.length && !non.length && ww.is_oos) flaggedNj.push(desc)
}
rule('not flagged out-of-state, only wrestles for non-NJ schools', notFlaggedNonNj)
rule('flagged out-of-state, only wrestles for NJ schools', flaggedNj)
rule('wrestles for both NJ and non-NJ schools (* = non-NJ)', mixed)

// bouts credited to a school where the wrestler has no alias, though they have aliases
// elsewhere (a results file naming two schools alike: Dover / Dover DE, CBA / CBC)
{
  const aliasAt = new Map<string, Set<number>>()
  for (const a of await all('wrestler_name_aliases', 'id, wrestler_id, school_id')) if (a.school_id != null) (aliasAt.get(a.wrestler_id) ?? aliasAt.set(a.wrestler_id, new Set()).get(a.wrestler_id)!).add(a.school_id)
  const off: string[] = []
  for (const [w, m] of rec) {
    const al = aliasAt.get(w); if (!al?.size) continue
    const stray = [...m.keys()].filter(s => !al.has(s))
    if (stray.length) off.push(`${W.get(w)?.gender} ${wn(w)}: alias at ${[...al].map(sn).join('/')}; records at ${stray.map(x => `${sn(x)} ${m.get(x)}`).join(', ')}`)
  }
  rule('records at a school where the wrestler has no alias (but has one elsewhere)', off)
  // An active NJ wrestler who wrestled for an NJ school in 2025-26 with no name link anywhere is
  // missing from every roster tool (grade %, Roster Grade Import, microcheck), which list a
  // school's wrestlers from links. Imports save a link for every bout (src/lib/nameLinks.ts).
  const cur = new Map<string, Set<number>>()
  const addCur = (w: string | null, s: number | null) => { if (w && s) (cur.get(w) ?? cur.set(w, new Set()).get(w)!).add(s) }
  const curMeets = new Set([...(await all('dual_meets', 'id, season_id')), ...(await all('dual_meets_girls', 'id, season_id'))].filter((m: any) => m.season_id === 2026).map((m: any) => m.id))
  for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) for (const b of await all(t, 'id, dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id')) if (curMeets.has(b.dual_meet_id)) { addCur(b.wrestler_a_id, b.school_a_id); addCur(b.wrestler_b_id, b.school_b_id) }
  const curIst = new Set([...(await all('in_season_tournaments', 'id, season')), ...(await all('in_season_tournaments_girls', 'id, season'))].filter((t: any) => t.season === '2025-26').map((t: any) => t.id))
  for (const t of ['tournament_bouts', 'tournament_bouts_girls']) for (const b of await all(t, 'id, in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')) if (curIst.has(b.in_season_tournament_id)) { addCur(b.wrestler1_id, b.wrestler1_school_id); addCur(b.wrestler2_id, b.wrestler2_school_id) }
  const unlinked: string[] = []
  for (const [w, ss] of cur) {
    const ww = W.get(w); if (!ww || ww.is_oos || ww.is_active === false || ww.first_name === 'Unknown' || aliasAt.get(w)?.size) continue
    const nj = [...ss].filter(s => sch.get(s)?.is_nj === true)
    if (nj.length) unlinked.push(`${ww.gender} ${wn(w)}: 2025-26 bouts at ${nj.map(sn).join(', ')}`)
  }
  rule('active wrestler with 2025-26 bouts at an NJ school but no name link anywhere', unlinked)
}

// same school twice under two records
const norm = (n: string) => n.toLowerCase().replace(/,\s*[a-z]{2}$/, '').replace(/\b(high school|hs|school|regional|reg)\b/g, '').replace(/[^a-z0-9]/g, '')
const byNorm = new Map<string, any[]>(); for (const s of schools) (byNorm.get(norm(s.display_name)) ?? byNorm.set(norm(s.display_name), []).get(norm(s.display_name))!).push(s)
// An NJ school and an out-of-state namesake (Dover / Dover, DE) are different schools, as are the
// out-of-state pairs Kyle confirmed (2026-11-05): flag only two NJ records, or two out-of-state ones
// not on that list.
const DISTINCT_OOS = [[566, 1024], [766, 1181]]   // Cleveland HS / Cleveland, TN; Westfield, VA / West Field HS
const suspect = (v: any[]) => { const nj = v.filter(s => s.is_nj !== false), oos = v.filter(s => s.is_nj === false)
  return nj.length > 1 || (oos.length > 1 && !DISTINCT_OOS.some(p => oos.every(s => p.includes(s.id)))) }
rule('school names that collapse to the same name (possible duplicate records)', [...byNorm.values()].filter(v => v.length > 1 && suspect(v)).map(v => v.map(s => `${s.display_name}#${s.id}${s.is_nj === false ? '*' : ''}`).join(' = ')))

// one person on two profiles: same name, same school, both with bouts
const keyOf = new Map<string, string[]>()
for (const [w, m] of rec) { const ww = W.get(w); if (!ww) continue; for (const s of m.keys()) { const k = `${ww.gender}|${`${ww.first_name}${ww.last_name}`.toLowerCase().replace(/[^a-z]/g, '')}|${s}`; (keyOf.get(k) ?? keyOf.set(k, []).get(k)!).push(w) } }
// letters only, so a name split differently ("Aaliyah Gordon | Burke" / "Aaliyah | Gordon Burke") counts
rule('two profiles with the same name at the same school', [...keyOf].filter(([, v]) => new Set(v).size > 1).map(([k, v]) => `${k.split('|')[0]} ${[...new Set(v)].map(wn).join(' = ')} @ ${sn(Number(k.split('|')[2]))} (${new Set(v).size} profiles)`))

// ratings: each 2025-26 log is one set; no rated out-of-state wrestler
for (const g of ['M', 'F'] as const) {
  const L = g === 'F' ? 'girls' : 'boys'
  const log = await all('wrestler_match_score_log', 'id, wrestler_id, source_id', q => q.eq('season', '2025-26').eq('gender', g))
  const seen = new Set<string>(), dup: string[] = []
  for (const r of log) { const k = `${r.wrestler_id}|${r.source_id}`; if (seen.has(k)) dup.push(k); seen.add(k) }
  rule(`${L} 2025-26 rating log: bout logged twice for a wrestler`, dup)
  const scores = await all('wrestler_hammer_scores', 'wrestler_id, school_id', q => q.eq('season', '2025-26').eq('gender', g), 'wrestler_id')
  rule(`${L} 2025-26 ratings for wrestlers flagged out-of-state`, scores.filter(s => W.get(s.wrestler_id)?.is_oos).map(s => wn(s.wrestler_id)))
  rule(`${L} 2025-26 ratings at a non-NJ school`, scores.filter(s => sch.get(s.school_id)?.is_nj === false).map(s => `${wn(s.wrestler_id)} @ ${sn(s.school_id)}`))
  rule(`${L} 2025-26 ratings for a wrestler of the other gender`, scores.filter(s => W.get(s.wrestler_id) && W.get(s.wrestler_id)!.gender !== g).map(s => wn(s.wrestler_id)))
  // every wrestled dual bout between two NJ wrestlers of this gender is in the log for both
  const mt = g === 'F' ? 'dual_meets_girls' : 'dual_meets', bt = g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches'
  const ids = (await all(mt, 'id', q => g === 'M' ? q.eq('season_id', 2026).eq('gender', 'M') : q.eq('season_id', 2026))).map(m => m.id)
  const logged = new Set(log.map(r => `${r.wrestler_id}|${r.source_id}`)), miss: string[] = []
  for (let i = 0; i < ids.length; i += 50) for (const b of chk(await db.from(bt).select('id, wrestler_a_id, wrestler_b_id, winner_id, result_type').in('dual_meet_id', ids.slice(i, i + 50)).limit(5000), bt)) {
    if (!b.wrestler_a_id || !b.wrestler_b_id || !b.winner_id) continue
    if (classifyOutcome(b.result_type, 60, 1, 0, true) === null) continue   // a result the rating skips on purpose (forfeit, injury, DQ)
    for (const w of [b.wrestler_a_id, b.wrestler_b_id]) { const ww = W.get(w); if (ww && !ww.is_oos && ww.gender === g && !logged.has(`${w}|${b.id}`)) miss.push(`${wn(w)} ${b.result_type} ${b.id.slice(0, 8)}`) }
  }
  rule(`${L} 2025-26: scoreable dual bout missing from the rating log`, miss)
}

// Team totals: the row label must be the one the readers use (SchoolProfileCore.tsx, standings.ts);
// a load that copied the tournament's own type ("districts") hid district points (2026-11-05)
{
  const LABEL: Record<string, Record<string, string>> = {
    M: { districts: 'boys_districts', regions: 'regions', boys_state: 'boys_state' },
    F: { districts: 'girls_districts', girls_regions: 'girls_regions', girls_state: 'girls_state' },
  }
  const TT = new Map((await all('tournaments', 'id, name, gender, season_id, tournament_type')).map((t: any) => [t.id, t]))
  const pts = await all('precomputed_team_scores', 'id, tournament_id, school_id, tournament_type')
  rule('team totals: row label is not the one the pages read', pts.filter((r: any) => { const t: any = TT.get(r.tournament_id); return !t || LABEL[t.gender]?.[t.tournament_type] !== r.tournament_type })
    .map((r: any) => { const t: any = TT.get(r.tournament_id); return `${t?.name ?? r.tournament_id} s${t?.season_id} school ${r.school_id}: ${r.tournament_type}` }))
}

const failing = results.filter(r => r.count > 0)
console.log(`\n${results.length} rules checked, ${failing.length} failing\n`)
for (const r of results) console.log(`${r.count ? 'FAIL' : ' ok '}  ${String(r.count).padStart(5)}  ${r.rule}${r.count ? '\n' + r.examples.map(e => '              ' + e).join('\n') : ''}`)
const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify(results, null, 1))
