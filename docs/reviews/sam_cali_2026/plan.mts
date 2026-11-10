// Sam Cali plan from the Flo bracket + compare output. npx tsx plan.mts boys|girls → $S/<g>_plan.json
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const G = process.argv[2] as 'boys' | 'girls'
const S = '/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/samcali'
const T = G === 'boys' ? 'd046f392-9128-4755-8584-528ca5336281' : 'ca6174aa-a4e2-4092-be6f-774813d2e6bb'
const BT = G === 'boys' ? 'tournament_bouts' : 'tournament_bouts_girls'
const pdf = JSON.parse(fs.readFileSync(`${S}/${G}.json`, 'utf8'))
const cmp = JSON.parse(fs.readFileSync(`${S}/${G}_compare.json`, 'utf8'))
const norm = (s: string) => (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '')
const { data: stored } = await db.from(BT).select('id, weight_class, round, winner, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler2_id, wrestler2_name_raw, wrestler2_school_id, w1:wrestlers!wrestler1_id(first_name,last_name), w2:wrestlers!wrestler2_id(first_name,last_name)').eq('in_season_tournament_id', T).limit(5000)
const byId = new Map((stored ?? []).map(x => [x.id, x]))
const nm = (x: any, k: 1 | 2) => x[`w${k}`] ? `${x[`w${k}`].first_name} ${x[`w${k}`].last_name}` : x[`wrestler${k}_name_raw`]
const lastOf = (s: string) => norm(s.trim().split(/\s+/).slice(1).join(''))
// person key: weight + roster full name → wrestler id / school id, learned from matched bouts
const who = new Map<string, { id: string; school: number }>(), code = new Map<string, Map<number, number>>()
const rosterOf = (w: number) => cmp.roster[w] as { name: string; team: string; seed: number | null }[]
const key = (w: number, name: string) => `${w}|${name}`
const findRoster = (w: number, label: string) => { const [, seed, name, team] = label.match(/^(\S+) (.*) \((.*)\)$/)!; return rosterOf(w).find(r => r.name === name && r.team === team && String(r.seed ?? '-') === seed)! }
const sameLast = (a: string, b: string) => { const A = lastOf(a), B = lastOf(b); return A === B || (A.length > 3 && B.length > 3 && (A.startsWith(B) || B.startsWith(A))) }
for (const m of cmp.matched) {
  const x = byId.get(m.id)!; const r1 = findRoster(m.weight, m.top), r2 = findRoster(m.weight, m.bottom)
  for (const r of [r1, r2]) {
    const k = sameLast(nm(x, 1), r.name) && !(sameLast(nm(x, 2), r.name) && !sameLast(nm(x, 1), r.name)) ? 1 : 2
    const id = x[`wrestler${k}_id`], sc = x[`wrestler${k}_school_id`]
    if (id && !who.has(key(m.weight, r.name))) who.set(key(m.weight, r.name), { id, school: sc })
    if (sc != null) { const c = code.get(r.team) ?? new Map(); c.set(sc, (c.get(sc) ?? 0) + 1); code.set(r.team, c) }
  }
}
const schoolOf = (team: string) => { const c = code.get(team); return c ? [...c].sort((a, b) => b[1] - a[1])[0][0] : null }
// anyone not learned: another stored bout at this tournament, same weight, same name
const unresolved: string[] = []
// nicknames on the Flo bracket: same school, the only profile with that last name
if (G === 'girls') { who.set(key(185, 'Maggie Armstrong'), { id: '5d3def1a-d6e3-4aa9-96d6-b636b25b5b2c', school: 303 }); who.set(key(235, 'Abigail Paglia'), { id: '38c0fd3c-8327-4a07-9b31-600c18e5904a', school: 24 }) }
for (const [wk, ros] of Object.entries<any>(cmp.roster)) for (const r of ros) {
  const w = Number(wk); if (who.has(key(w, r.name))) continue
  let hit: any = null
  for (const x of stored ?? []) for (const k of [1, 2] as const) if (!hit && x.weight_class === w && x[`wrestler${k}_id`] && sameLast(nm(x, k), r.name) && norm(nm(x, k))[0] === norm(r.name)[0]) hit = { id: x[`wrestler${k}_id`], school: x[`wrestler${k}_school_id`] }
  if (!hit) { // a name alias at the team's school (how imports link a printed name to a profile)
    const sc = schoolOf(r.team); const { data: al } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id').eq('raw_name', r.name)
    const a = (al ?? []).filter(x => sc == null || x.school_id === sc); if (a.length && new Set(a.map(x => x.wrestler_id)).size === 1) hit = { id: a[0].wrestler_id, school: a[0].school_id }
  }
  if (hit) who.set(key(w, r.name), hit)
  else unresolved.push(`${w} ${r.seed ?? '-'} ${r.name} (${r.team}) → school ${schoolOf(r.team) ?? '?'}`)
}
// rounds
const roundCode = (w: number, r: string) => {
  const champ = ['Round of 64', 'Round of 32', 'Round of 16'].filter(x => pdf[w].bouts.some((b: any) => b.round === x))
  if (champ.includes(r)) return `R${champ.indexOf(r) + 1}`
  const cons = ['Consi of 8 #1', 'Consi of 8 #2', 'Consi of 4'].filter(x => pdf[w].bouts.some((b: any) => b.round === x))
  if (cons.includes(r)) return `C${cons.indexOf(r) + 1}`
  return ({ 'Quarter-Finals': 'QF', 'Semi-Finals': 'SF', 'Finals': 'F', 'Consi-Semis': 'CSF', '3rd Place': '3rd_Place', '5th Place': '5th_Place' } as any)[r] ?? '?'
}
const relabel = cmp.matched.map((m: any) => ({ id: m.id, from: m.storedRound, to: roundCode(m.weight, m.round) })).filter((x: any) => x.from !== x.to)
// result text → stored columns
const parseRes = (s: string) => {
  let m
  if ((m = s.match(/^F (\d+):(\d+)$/))) return { result_type: 'Fall', result_detail: null, fall_time_seconds: +m[1] * 60 + +m[2], winner_score: null, loser_score: null }
  if ((m = s.match(/^TF (\d+):(\d+)$/))) return { result_type: 'TF', result_detail: null, fall_time_seconds: +m[1] * 60 + +m[2], winner_score: null, loser_score: null }
  if ((m = s.match(/^(DEC|MD|DEC SV|SV) (\d+)-(\d+)$/))) return { result_type: m[1] === 'MD' ? 'MD' : m[1].includes('SV') ? 'SV-1' : 'Dec', result_detail: `${m[2]}-${m[3]}`, fall_time_seconds: null, winner_score: +m[2], loser_score: +m[3] }
  if (s === 'FOR') return { result_type: 'Forfeit', result_detail: null, fall_time_seconds: null, winner_score: null, loser_score: null }
  if (s === 'M FOR') return { result_type: 'MFF', result_detail: null, fall_time_seconds: null, winner_score: null, loser_score: null }
  throw new Error('result ' + s)
}
const adds: any[] = [], addProblems: string[] = [], moves: any[] = []
const storedOnly = [...cmp.storedOnly]
for (const p of cmp.pdfOnly) {
  if (p.result === 'NC') continue
  const r1 = findRoster(p.weight, p.top), r2 = findRoster(p.weight, p.bottom)
  const a = who.get(key(p.weight, r1.name)), b = who.get(key(p.weight, r2.name))
  if (!a || !b) { addProblems.push(`${p.weight} ${p.round}: ${p.top} ${a ? '' : '(no profile)'} vs ${p.bottom} ${b ? '' : '(no profile)'}`); continue }
  // stored at another weight (the girls 185 semifinal filed under 152): move it, don't add a copy
  const mv = storedOnly.findIndex((x: any) => x.weight !== p.weight && [byId.get(x.id)!.wrestler1_id, byId.get(x.id)!.wrestler2_id].sort().join() === [a.id, b.id].sort().join())
  if (mv >= 0) { const x = storedOnly.splice(mv, 1)[0]; moves.push({ id: x.id, from: x.weight, to: p.weight, round: roundCode(p.weight, p.round), winnerOk: (byId.get(x.id)!.winner === 1 ? byId.get(x.id)!.wrestler1_id : byId.get(x.id)!.wrestler2_id) === (p.win === r1.name ? a.id : b.id), label: `${p.weight} ${p.round}: ${p.top} vs ${p.bottom}` }); continue }
  adds.push({ weight_class: p.weight, round: roundCode(p.weight, p.round), wrestler1_id: a.id, wrestler1_name_raw: r1.name, wrestler1_school_id: a.school, wrestler2_id: b.id, wrestler2_name_raw: r2.name, wrestler2_school_id: b.school,
    winner: p.win === r1.name ? 1 : 2, ...parseRes(p.result), _label: `${p.weight} ${p.round}: ${p.top} vs ${p.bottom}, ${p.result}` })
}
// seeds: every seeded wrestler
const seeds: any[] = []
for (const [wk, ros] of Object.entries<any>(cmp.roster)) for (const r of ros) if (r.seed != null) { const h = who.get(key(Number(wk), r.name)); seeds.push({ weight_class: Number(wk), seed: r.seed, wrestler_name_raw: r.name, wrestler_id: h?.id ?? null, school_id: h?.school ?? schoolOf(r.team) }) }
// placements 1-6 from Finals / 3rd / 5th
const places: any[] = []
for (const [wk, W] of Object.entries<any>(pdf)) for (const [rn, hi] of [['Finals', 1], ['3rd Place', 3], ['5th Place', 5]] as const) {
  const b = W.bouts.find((x: any) => x.round === rn); if (!b || !b.top || !b.bottom) continue
  const w = Number(wk)
  const res = (s: any) => s.seed != null ? rosterOf(w).find(r => r.seed === s.seed)! : rosterOf(w).find(r => sameLast(r.name, 'x ' + s.name))!
  const win = res(b.winner === 1 ? b.top : b.bottom), lose = res(b.winner === 1 ? b.bottom : b.top)
  for (const [r, place] of [[win, hi], [lose, hi + 1]] as const) { const h = who.get(key(w, r.name)); places.push({ weight_class: w, place, wrestler_name_raw: r.name, wrestler_id: h?.id ?? null, school_id: h?.school ?? schoolOf(r.team) }) }
}
const winnerFix = cmp.matched.filter((m: any) => !m.winnerOk && m.result !== 'NC').map((m: any) => ({ id: m.id, label: `${m.weight} ${m.round}: ${m.top} vs ${m.bottom}, Flo: ${m.win} ${m.result}; stored winner ${m.storedWin} ${m.storedResult}` }))
const plan = { relabel, moves, adds, addProblems, seeds, places, unresolved, winnerFix, storedOnly, ncMatched: cmp.matched.filter((m: any) => m.result === 'NC').map((m: any) => m.id) }
fs.writeFileSync(`${S}/${G}_plan.json`, JSON.stringify(plan, null, 1))
console.log(`${G}: relabel ${relabel.length}; move ${moves.length} ${JSON.stringify(moves)}; add ${adds.length} (problems ${addProblems.length}); seeds ${seeds.length} (no profile ${seeds.filter(s => !s.wrestler_id).length}); placements ${places.length} (no profile ${places.filter(s => !s.wrestler_id).length}); winner fixes ${winnerFix.length}; NC matched to a stored bout ${plan.ncMatched.length}; roster without profile ${unresolved.length}`)
if (addProblems.length) console.log('  add problems:\n   ' + addProblems.join('\n   '))
if (unresolved.length) console.log('  no profile:\n   ' + unresolved.join('\n   '))
