// End-of-season totals for one side (Kyle 2026-11-11): schools, wrestlers, matches and how they ended, across
// duals (jamboree pairings included), in-season tournaments and the postseason; then NJSIAA vs non-NJSIAA
// (is_nj = false: out-of-state schools and NJ non-members): NJ's wins and losses, by how they ended. Read-only.
//   npx tsx --tsconfig tsconfig.json scripts/season_totals_report.mts <season end year, e.g. 2026>
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SEASON = Number(process.argv[2]); if (!SEASON) throw new Error('season end year required')
const LABEL = `${SEASON - 1}-${String(SEASON).slice(2)}`
async function all(t: string, cols: string, f?: (q: any) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { let q = db.from(t).select(cols).order('id').range(i, i + 999); if (f) q = f(q); const { data, error } = await q; if (error) throw new Error(t + ': ' + error.message); out.push(...data!); if (data!.length < 1000) break } return out }

// result label → category (null = not a match: double forfeit, no contest, bye, unknown result)
function cat(r: string | null, dff = false): string | null {
  if (dff) return null
  const s = (r ?? '').trim().toUpperCase()
  if (/\(FALL\)/.test(s) || s === 'FALL') return 'Falls'
  if (/^TF/.test(s)) return 'Tech falls'
  if (s === 'MD' || s === 'MAJ') return 'Major decisions'
  if (/^(DEC|SV|TB|UTB|OT|2-OT)/.test(s)) return 'Decisions'
  if (/^(M\. ?FOR|MFF)/.test(s)) return 'Medical forfeits'
  if (/^(FOR|FORF|FF)\b/.test(s) || s === 'FORFEIT') return 'Forfeits'
  if (/^INJ/.test(s)) return 'Injury defaults'
  if (/^DEF/.test(s)) return 'Defaults'
  if (s === 'DQ') return 'Disqualifications'
  return null
}
const ORDER = ['Falls', 'Tech falls', 'Major decisions', 'Decisions', 'Forfeits', 'Medical forfeits', 'Injury defaults', 'Defaults', 'Disqualifications']
const schoolsNj = new Map((await all('schools', 'id, is_nj')).map(s => [s.id, s.is_nj]))
const W = new Map((await all('wrestlers', 'id, is_oos')).map(w => [w.id, w.is_oos]))

for (const g of ['M', 'F'] as const) {
  const tally: Record<string, Record<string, number>> = {}
  const add = (src: string, c: string | null) => { const t = tally[src] ??= {}; t[c ?? 'not a match'] = (t[c ?? 'not a match'] ?? 0) + 1 }
  const sch = new Set<number>(), wr = new Set<string>()
  // NJSIAA vs non-NJSIAA: side 1/2 schools and the winning side (1, 2 or null)
  const vs = { win: {} as Record<string, number>, loss: {} as Record<string, number>, schools: new Set<number>() }
  const cross = (c: string | null, s1: number | null, s2: number | null, winSide: 1 | 2 | null) => {
    if (!c || !s1 || !s2 || !winSide) return
    const nj1 = schoolsNj.get(s1) === true, nj2 = schoolsNj.get(s2) === true
    if (nj1 === nj2) return
    const njWon = (winSide === 1) === nj1
    vs[njWon ? 'win' : 'loss'][c] = (vs[njWon ? 'win' : 'loss'][c] ?? 0) + 1
    vs.schools.add(nj1 ? s2 : s1)
  }
  const meets = new Set((await all(g === 'F' ? 'dual_meets_girls' : 'dual_meets', 'id', q => q.eq('season_id', SEASON))).map(m => m.id))
  for (const b of await all(g === 'F' ? 'dual_meet_matches_girls' : 'dual_meet_matches', 'id, dual_meet_id, result_type, is_double_forfeit, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, winner_id, team1_points, team2_points')) {
    if (!meets.has(b.dual_meet_id)) continue
    const c = cat(b.result_type, b.is_double_forfeit); add('Duals', c)
    const ws = b.winner_id ? (b.winner_id === b.wrestler_a_id ? 1 : b.winner_id === b.wrestler_b_id ? 2 : null) : b.team1_points > 0 ? 1 : b.team2_points > 0 ? 2 : null
    cross(c, b.school_a_id, b.school_b_id, ws)
    if (c) { for (const s of [b.school_a_id, b.school_b_id]) if (s) sch.add(s); for (const w of [b.wrestler_a_id, b.wrestler_b_id]) if (w) wr.add(w) }
  }
  const ist = new Set((await all(g === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments', 'id', q => q.eq('season', LABEL))).map(t => t.id))
  for (const b of await all(g === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts', 'id, in_season_tournament_id, result_type, winner, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id')) {
    if (!ist.has(b.in_season_tournament_id)) continue
    const c = cat(b.result_type); add('Tournaments', c)
    cross(c, b.wrestler1_school_id, b.wrestler2_school_id, b.winner === 1 ? 1 : b.winner === 2 ? 2 : null)
    if (c) { for (const s of [b.wrestler1_school_id, b.wrestler2_school_id]) if (s) sch.add(s); for (const w of [b.wrestler1_id, b.wrestler2_id]) if (w) wr.add(w) }
  }
  const pts = new Set((await all('tournaments', 'id', q => q.eq('season_id', SEASON).eq('gender', g))).map(t => t.id))
  const entries = new Map((await all('tournament_entries', 'id, tournament_id, wrestler_id, school_id')).filter(e => pts.has(e.tournament_id)).map(e => [e.id, e]))
  for (const m of await all('matches', 'id, tournament_id, win_type, winner_entry_id, loser_entry_id')) {
    if (!pts.has(m.tournament_id)) continue
    const c = cat(m.win_type); add('Postseason', c)
    if (c) for (const id of [m.winner_entry_id, m.loser_entry_id]) { const e = entries.get(id); if (e?.school_id) sch.add(e.school_id); if (e?.wrestler_id) wr.add(e.wrestler_id) }
  }
  const total: Record<string, number> = {}
  for (const t of Object.values(tally)) for (const [k, v] of Object.entries(t)) total[k] = (total[k] ?? 0) + v
  const matches = ORDER.reduce((n, k) => n + (total[k] ?? 0), 0)
  const njS = [...sch].filter(s => schoolsNj.get(s) === true).length, njW = [...wr].filter(w => W.get(w) === false).length
  console.log(`\n=== ${g === 'M' ? 'BOYS' : 'GIRLS'} ${LABEL}`)
  console.log(`Schools: ${njS} NJ (+${sch.size - njS} out of state)   Wrestlers: ${njW} NJ (+${wr.size - njW} out of state)`)
  console.log(`Matches: ${matches}  (duals ${ORDER.reduce((n, k) => n + (tally.Duals?.[k] ?? 0), 0)}, tournaments ${ORDER.reduce((n, k) => n + (tally.Tournaments?.[k] ?? 0), 0)}, postseason ${ORDER.reduce((n, k) => n + (tally.Postseason?.[k] ?? 0), 0)})`)
  for (const k of ORDER) console.log(`  ${k.padEnd(18)} ${String(total[k] ?? 0).padStart(6)}  ${((total[k] ?? 0) / matches * 100).toFixed(1).padStart(5)}%`)
  console.log(`  (not counted: ${total['not a match'] ?? 0} double forfeits, no contests, byes and unknown results)`)
  const vw = ORDER.reduce((n, k) => n + (vs.win[k] ?? 0), 0), vl = ORDER.reduce((n, k) => n + (vs.loss[k] ?? 0), 0)
  console.log(`NJSIAA vs non-NJSIAA: ${vw + vl} matches against ${vs.schools.size} schools — NJ ${vw}-${vl} (${(vw / (vw + vl) * 100).toFixed(1)}%)`)
  console.log(`  ${'how it ended'.padEnd(18)}  NJ won  NJ lost`)
  for (const k of ORDER) console.log(`  ${k.padEnd(18)} ${String(vs.win[k] ?? 0).padStart(7)} ${String(vs.loss[k] ?? 0).padStart(8)}`)
}
