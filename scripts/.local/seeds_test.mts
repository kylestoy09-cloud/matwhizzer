import fs from 'fs'
import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
import { HISTORY_DIR, readYear } from '../../src/lib/playoffHistory/readFiles'
const W = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285]
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
for (let y = 2013; y <= 2020; y++) {
  const pdf = fs.readdirSync(`${HISTORY_DIR}/${y}`).find(f => f.endsWith('.pdf'))!
  const { seeds, problems } = readStateSeeds(`${HISTORY_DIR}/${y}/${pdf}`, W)
  const st = readYear(y).events.find(e => e.kind === 'state')!
  const names = new Map<number, Set<string>>()
  for (const r of st.rows) for (const n of [r.winner, r.loser]) if (n) (names.get(Number(r.weight)) ?? names.set(Number(r.weight), new Set()).get(Number(r.weight))!).add(norm(n))
  const per = W.map(w => seeds.filter(s => s.weight === w).length)
  const unmatched = seeds.filter(s => !names.get(s.weight)?.has(norm(s.name)))
  const entrants = W.map(w => names.get(w)?.size ?? 0)
  console.log(`${y}: seeds per weight ${[...new Set(per)].join('/')} (entrants ${[...new Set(entrants)].join('/')}) | seeds not matching a state entrant by name: ${unmatched.length}${unmatched.length ? ' e.g. ' + unmatched.slice(0, 4).map(s => `${s.weight} #${s.seed} ${s.name} (${s.code})`).join('; ') : ''}${problems.length ? ' | ' + problems.join('; ') : ''}`)
}
