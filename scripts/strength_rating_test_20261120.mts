// "Who beats whom" strength rating test (Kyle 2026-11-20: "any suggestions on how to separate" the wrestlers bunched
// near WRR 0). An Elo-style rating from the 2025-26 WRR match log, updated a day at a time (a bout only sees earlier
// days), bigger moves for bonus wins; graded on the tracked NJ-vs-NJ bouts against the WRR's own pick (the higher WRR
// going in), overall and where both wrestlers' WRR was under 1. Read only.
//   npx tsx scripts/strength_rating_test_20261120.mts
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw error; out.push(...data); if (data.length < 1000) break } return out }
const MARGIN = (rank: number) => { const r = rank <= 16 ? rank : 33 - rank; return r <= 12 ? (r % 2 ? 1.5 : 1.4) : r === 13 ? 1.25 : r <= 15 ? 1.0 : 0.8 }   // pin, tech, major, dec, OT
for (const g of ['M', 'F']) {
  const log = await all<any>(f => db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_date, outcome_rank, pre_match_hammer').eq('gender', g).eq('season', '2025-26').gte('match_date', '2025-08-01').order('id').range(f, f + 999))
  const mp = await all<any>(f => db.from('match_projections').select('match_date, wrestler_a_id, wrestler_b_id, a_pre_wrr, b_pre_wrr, actual_winner, a_wins, a_losses, b_wins, b_losses').eq('gender', g).eq('season', '2025-26').order('id').range(f, f + 999))
  for (const K of [24, 40]) {
    // each bout once (both wrestlers in the log): the row whose wrestler won
    const wins = log.filter(r => r.opponent_wrestler_id && r.outcome_rank <= 16)
    const days = [...new Set(wins.map(r => r.match_date))].sort()
    const byDay = new Map<string, any[]>(); for (const r of wins) (byDay.get(r.match_date) ?? byDay.set(r.match_date, []).get(r.match_date)!).push(r)
    // a wrestler's first strength: 1500, nudged by the WRR they started the season with (what's known going in)
    const first = new Map<string, number>(); for (const r of [...log].sort((a, b) => a.match_date.localeCompare(b.match_date))) if (!first.has(r.wrestler_id)) first.set(r.wrestler_id, Number(r.pre_match_hammer))
    const elo = new Map<string, number>(); const get = (id: string) => elo.get(id) ?? 1500 + 8 * (first.get(id) ?? 0)
    const before = new Map<string, Map<string, number>>()   // day → strength going into that day
    const mpDays = new Set(mp.map(r => r.match_date))
    for (const d of days) {
      if (mpDays.has(d)) { const snap = new Map<string, number>(); for (const r of mp.filter(x => x.match_date === d)) { snap.set(r.wrestler_a_id, get(r.wrestler_a_id)); snap.set(r.wrestler_b_id, get(r.wrestler_b_id)) } before.set(d, snap) }
      const delta = new Map<string, number>()
      for (const r of byDay.get(d)!) {
        const w = r.wrestler_id, l = r.opponent_wrestler_id
        const exp = 1 / (1 + 10 ** ((get(l) - get(w)) / 400)), k = K * MARGIN(r.outcome_rank)
        delta.set(w, (delta.get(w) ?? 0) + k * (1 - exp)); delta.set(l, (delta.get(l) ?? 0) - k * (1 - exp))
      }
      for (const [id, dv] of delta) elo.set(id, get(id) + dv)
    }
    const grade = (rows: any[], label: string) => {
      let n = 0, wrr = 0, el = 0, both = 0, eloTie = 0
      for (const r of rows) {
        const s = before.get(r.match_date); if (!s) continue
        const ea = s.get(r.wrestler_a_id)!, eb = s.get(r.wrestler_b_id)!
        n++
        const wrrPick = Number(r.a_pre_wrr) > Number(r.b_pre_wrr) ? 'a' : Number(r.a_pre_wrr) < Number(r.b_pre_wrr) ? 'b' : null
        if (wrrPick === r.actual_winner) wrr++
        const ePick = ea > eb ? 'a' : ea < eb ? 'b' : null; if (!ePick) eloTie++
        if (ePick === r.actual_winner) el++
        if (wrrPick === r.actual_winner || ePick === r.actual_winner) both++
      }
      console.log(`  ${label.padEnd(44)} ${String(n).padStart(6)} bouts   WRR picked the winner ${(100 * wrr / n).toFixed(1)}%   strength rating ${(100 * el / n).toFixed(1)}%   (strength ties ${eloTie})`)
    }
    console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} — strength rating, move size ${K}`)
    grade(mp, 'All tracked bouts')
    grade(mp.filter(r => Number(r.a_pre_wrr) < 1 && Number(r.b_pre_wrr) < 1), 'Both WRR under 1')
    grade(mp.filter(r => Number(r.a_pre_wrr) - Number(r.b_pre_wrr) < 0.5), 'WRR within half a point')
    grade(mp.filter(r => Number(r.a_pre_wrr) >= 1 && Number(r.b_pre_wrr) >= 1), 'Both WRR 1 or more')
    grade(mp.filter(r => r.match_date >= '2026-01-15'), 'From Jan 15 on')
  }
}
