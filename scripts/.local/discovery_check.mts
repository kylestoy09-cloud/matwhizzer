// 2025-26: wrestlers with NO 2024-25 postseason entry — how many beat / went .501+ against opponents
// rated 20+, by two measures: (a) opponent's 2024-25 postseason score >= 20, (b) opponent's WRR going in >= 20.
import { createClient } from '@supabase/supabase-js'
import { postseasonScore, type PostseasonFact } from '../../src/lib/hammerScore'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number, t: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f, f + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
async function chunk<T>(table: string, col: string, ids: any[], sel: string): Promise<T[]> { const out: T[] = []; for (let i = 0; i < ids.length; i += 100) { const { data, error } = await db.from(table).select(sel).in(col, ids.slice(i, i + 100)); if (error) throw error; out.push(...(data as T[])) } return out }

async function factsFor(g: 'M' | 'F', season: number) {
  const stateT = g === 'F' ? 'girls_state' : 'boys_state', regT = g === 'F' ? 'girls_regions' : 'regions'
  // 2024-25 postseason facts (same logic as the recalculation)
  const ts = (await db.from('tournaments').select('id, tournament_type').eq('season_id', season).eq('gender', g).in('tournament_type', ['districts', regT, stateT])).data ?? []
  const tType = new Map(ts.map(t => [t.id, t.tournament_type]))
  const entries = await chunk<{ id: string; wrestler_id: string; tournament_id: number }>('tournament_entries', 'tournament_id', ts.map(t => t.id), 'id, wrestler_id, tournament_id')
  const facts = new Map<string, PostseasonFact>()
  const f = (w: string) => facts.get(w) ?? facts.set(w, { madeState: false, stateWins: 0, statePlacement: null, districtBest: 'none', regionBest: 'none' }).get(w)!
  for (const e of entries) { const tt = tType.get(e.tournament_id); const x = f(e.wrestler_id); if (tt === stateT) x.madeState = true; else if (tt === 'districts' && x.districtBest === 'none') x.districtBest = 'entry' }
  const eInfo = new Map(entries.map(e => [e.id, e]))
  const ms = [...await chunk<any>('matches', 'winner_entry_id', entries.map(e => e.id), 'id, round, winner_entry_id, loser_entry_id, validated')]
  for (const m of ms) {
    if (!m.validated) continue
    const w = eInfo.get(m.winner_entry_id), l = m.loser_entry_id ? eInfo.get(m.loser_entry_id) : null
    const tt = w ? tType.get(w.tournament_id) : null
    if (w && tt === 'districts') { if (m.round === 'F') f(w.wrestler_id).districtBest = 'champion'; else if (m.round === '3rd_Place' && f(w.wrestler_id).districtBest !== 'champion') f(w.wrestler_id).districtBest = 'third' }
    if (l && tt === 'districts' && m.round === 'F' && f(l.wrestler_id).districtBest !== 'champion') f(l.wrestler_id).districtBest = 'runner-up'
    if (w && tt === stateT) f(w.wrestler_id).stateWins++
  }
  return facts
}
for (const g of ['M', 'F'] as const) {
  const facts = await factsFor(g, 2025), now = await factsFor(g, 2026)
  const ps = new Map([...facts].map(([w, x]) => [w, postseasonScore(x)]))
  const grade = (ids: string[]) => {
    const s = ids.map(id => now.get(id)); const sc = s.map(x => x ? postseasonScore(x) : -1)
    return `→ 2025-26: state ${s.filter(x => x?.madeState).length}, district champ ${sc.filter(v => v === 20).length}, other postseason ${sc.filter(v => v >= 0 && v < 20).length}, none ${sc.filter(v => v < 0).length}`
  }
  const log = await all<any>((a, b) => db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, is_winner, opponent_pre_match_hammer, match_date').eq('season', '2025-26').eq('gender', g).gte('match_date', '2025-07-01').order('id').range(a, b))
  for (const [label, strong] of [
    ['opponent 2024-25 postseason score 20+', (r: any) => (ps.get(r.opponent_wrestler_id) ?? 0) >= 20],
    ['opponent WRR going in 20+', (r: any) => Number(r.opponent_pre_match_hammer) >= 20],
  ] as const) {
    const rec = new Map<string, { w: number; l: number; firstWin: string | null }>()
    for (const r of log.sort((x, y) => x.match_date.localeCompare(y.match_date))) {
      if (facts.has(r.wrestler_id) || !r.opponent_wrestler_id || !strong(r)) continue
      const x = rec.get(r.wrestler_id) ?? rec.set(r.wrestler_id, { w: 0, l: 0, firstWin: null }).get(r.wrestler_id)!
      if (r.is_winner) { x.w++; x.firstWin ??= r.match_date } else x.l++
    }
    const halfIds = [...rec].filter(([, x]) => x.w > x.l && x.w + x.l >= 2).map(([id]) => id)
    const oneIds = [...rec].filter(([, x]) => x.w > 0).map(([id]) => id)
    const v = [...rec.values()]
    const beatOne = v.filter(x => x.w > 0), half = v.filter(x => x.w > x.l)
    console.log(`${g} | ${label}: no-history wrestlers who faced one: ${v.length}; beat at least one: ${beatOne.length}; .501+ with 2+ bouts: ${half.length}; .501+ with 3+ such bouts: ${half.filter(x => x.w + x.l >= 3).length}`)
    console.log(`    beat one ${grade(oneIds)}`)
    console.log(`    .501+    ${grade(halfIds)}`)
  }
  console.log(`${g} | 2024-25 postseason wrestlers: ${facts.size}; with score 20+: ${[...ps.values()].filter(s => s >= 20).length}`)
}
