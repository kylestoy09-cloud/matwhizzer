// Can we score in-season tournaments ourselves? For every 2025-26 in-season tournament with official standings
// (in_season_tournament_team_scores, copied from TrackWrestling), score each school from the stored bouts and
// placements with the proven TrackWrestling rules (docs/reviews/trackwrestling_team_scoring.md): advancement 2 per
// championship win, 1 per consolation win, none for placement matches; bonus fall/forfeit/default/DQ 2, tech fall 1.5,
// major 1; placement points from the table that fits the tournament best. Byes aren't stored for in-season events, so
// bye points (2 each) are missing from our side. Read-only; writes docs/reviews/inseason_team_scoring_check.csv.
//   npx tsx --tsconfig tsconfig.json scripts/check_inseason_team_scoring.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const TABLES: Record<string, number[]> = {
  '16/12/9/7/5/3/2/1': [16, 12, 9, 7, 5, 3, 2, 1], '16/12/9/7/5/3': [16, 12, 9, 7, 5, 3], '14/10/7/4': [14, 10, 7, 4],
  '16/12/10/9/7/6/4/3': [16, 12, 10, 9, 7, 6, 4, 3], '20/16/12/10/8/6/4/2': [20, 16, 12, 10, 8, 6, 4, 2], '12/9/7/5/3/2': [12, 9, 7, 5, 3, 2],
  '16/12/10/8/6/4/2/1': [16, 12, 10, 8, 6, 4, 2, 1], '10/7/4/2': [10, 7, 4, 2], '16/12/9/7': [16, 12, 9, 7], '20/16/13/10/7/4': [20, 16, 13, 10, 7, 4],
}
const kind = (r: string) => {
  const x = (r ?? '').toUpperCase()
  if (/^(F|3RD_PLACE|5TH_PLACE|7TH_PLACE|PL\d?|2ND_PLACE_MATCH)$/.test(x) || /PLACE/.test(x)) return 'place'
  if (/^(C\d+|CQF|CSF|CF|CONS)/.test(x) || /CONS/.test(x)) return 'cons'
  if (/^(R\d+|QF|SF|ROUND \d+|R16|R32|R64|\d+TH ROUND|CROSS)/.test(x)) return 'champ'
  return 'unknown'
}
const bonus = (t: string) => { const x = (t ?? '').toUpperCase(); if (/FALL|FOR|FF|INJ|DEF|DQ|MFF/.test(x)) return 2; if (/^TF/.test(x)) return 1.5; if (/^(MD|MAJ)/.test(x)) return 1; return 0 }
const out: string[] = ['side,tournament,official_schools,exact,within_2,best_table,unknown_rounds,mean_gap,note']
const summary: string[] = []
const podium: { side: string; t: string; inside: boolean; winner: boolean; top3: number; complete: boolean }[] = []
for (const [side, tt, bt] of [['Boys', 'in_season_tournaments', 'tournament_bouts'], ['Girls', 'in_season_tournaments_girls', 'tournament_bouts_girls']] as const) {
  const tours = await all((f, t) => db.from(tt).select('id, name, tournament_type').eq('season', '2025-26').order('id').range(f, t))
  for (const t of tours) {
    const off = (await db.from('in_season_tournament_team_scores').select('school_id, score').eq('tournament_id', t.id)).data ?? []
    if (!off.length) continue
    const bouts = await all((f, to) => db.from(bt).select('round, winner, result_type, wrestler1_school_id, wrestler2_school_id').eq('in_season_tournament_id', t.id).order('id').range(f, to))
    const places = (await db.from('tournament_placements').select('school_id, place').eq('in_season_tournament_id', t.id)).data ?? []
    const base = new Map<number, number>(); let unknown = 0
    for (const b of bouts) {
      if (b.winner !== 1 && b.winner !== 2) continue
      const sid = b.winner === 1 ? b.wrestler1_school_id : b.wrestler2_school_id; if (sid == null) continue
      const k = kind(b.round); if (k === 'unknown') unknown++
      const adv = k === 'champ' ? 2 : k === 'cons' ? 1 : 0
      base.set(sid, (base.get(sid) ?? 0) + adv + bonus(b.result_type))
    }
    const offBy = new Map<number, number>(); for (const o of off) if (o.school_id != null) offBy.set(o.school_id, Math.max(offBy.get(o.school_id) ?? 0, Number(o.score)))
    let best = { name: '', exact: -1, w2: 0, gap: 0 }
    for (const [name, tab] of Object.entries(TABLES)) {
      const tot = new Map(base); for (const p of places) if (p.school_id != null && p.place <= tab.length) tot.set(p.school_id, (tot.get(p.school_id) ?? 0) + tab[p.place - 1])
      let exact = 0, w2 = 0, gap = 0
      for (const [sid, sc] of offBy) { const d = sc - (tot.get(sid) ?? 0); if (Math.abs(d) < 0.01) exact++; if (Math.abs(d) <= 2.01) w2++; gap += d }
      if (exact > best.exact) best = { name, exact, w2, gap: gap / offBy.size }
    }
    // fixed table, no fitting: do we get the winner and the top 3 right?
    const fixed = new Map(base); for (const p of places) if (p.school_id != null && p.place <= 8) fixed.set(p.school_id, (fixed.get(p.school_id) ?? 0) + [16, 12, 9, 7, 5, 3, 2, 1][p.place - 1])
    const offRank = [...offBy].sort((a, b) => b[1] - a[1]).map(x => x[0]), ourRank = [...offBy.keys()].sort((a, b) => (fixed.get(b) ?? 0) - (fixed.get(a) ?? 0))
    podium.push({ side, t: t.name, inside: t.tournament_type !== 'outside' && t.tournament_type !== 'inside_outside', winner: offRank[0] === ourRank[0], top3: offRank.slice(0, 3).filter(x => ourRank.slice(0, 3).includes(x)).length, complete: places.length > 0 && bouts.length >= 20 })
    const note = !places.length ? 'no placements stored' : bouts.length < 20 ? 'few bouts stored' : ''
    out.push([side, t.name, offBy.size, best.exact, best.w2, best.name, `${unknown}/${bouts.length}`, best.gap.toFixed(1), note].map(v => `"${v}"`).join(','))
    summary.push(`${side.padEnd(5)} ${t.name.slice(0, 44).padEnd(44)} ${String(best.exact).padStart(3)}/${String(offBy.size).padEnd(3)} exact, ${String(best.w2).padStart(3)} within 2 | ${best.name.padEnd(19)} | gap ${best.gap.toFixed(1).padStart(6)} | unknown rounds ${unknown}/${bouts.length} ${note}`)
  }
}
fs.writeFileSync('docs/reviews/inseason_team_scoring_check.csv', out.join('\n') + '\n')
console.log(summary.join('\n'))
for (const grp of [['NJ events (inside)', (p: any) => p.inside && p.complete], ['out-of-state / mixed events', (p: any) => !p.inside && p.complete]] as const) {
  const ps = podium.filter(grp[1]); console.log(`${grp[0]}: winner right ${ps.filter(p => p.winner).length}/${ps.length}; top-3 teams right ${ps.reduce((s, p) => s + p.top3, 0)}/${ps.length * 3}`)
}
fs.writeFileSync('docs/reviews/inseason_team_scoring_podium.json', JSON.stringify(podium, null, 1))
