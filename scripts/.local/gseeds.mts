import fs from 'fs'
import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
import { readYear, yearDir } from '../../src/lib/playoffHistory/readFiles'
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
for (let y = 2019; y <= 2024; y++) {
  const dir = yearDir(y, 'F'), pdf = `${dir}/${fs.readdirSync(dir).find(f => f.endsWith('.pdf'))}`
  const st = readYear(y, 'F').events.find(e => e.kind === 'state')!
  const W = [...new Set(st.rows.map(r => Number(r.weight)))].sort((a, b) => a - b)
  const { seeds, problems } = readStateSeeds(pdf, W)
  const names = new Map<number, Set<string>>()
  for (const r of st.rows) for (const n of [r.winner, r.loser]) if (n) (names.get(Number(r.weight)) ?? names.set(Number(r.weight), new Set()).get(Number(r.weight))!).add(norm(n))
  const per = W.map(w => `${seeds.filter(s => s.weight === w).length}/${names.get(w)?.size}`)
  const un = seeds.filter(s => !names.get(s.weight)?.has(norm(s.name)))
  console.log(`${y}: seeds/entrants per weight ${per.join(' ')} | not matching an entrant ${un.length}${un.length ? ' e.g. ' + un.slice(0, 3).map(s => `${s.weight} #${s.seed} ${s.name}`).join('; ') : ''}${problems.length ? ' | ' + problems.slice(0, 3).join('; ') : ''}`)
}
