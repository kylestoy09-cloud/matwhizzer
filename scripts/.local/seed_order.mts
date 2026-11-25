import fs from 'fs'
import { HISTORY_DIR, readYear } from '../../src/lib/playoffHistory/readFiles'
import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
const W = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285]
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
// standard bracket line order for 32 (top to bottom), pairs (1,32),(16,17),(9,24),(8,25),…
const order = (n: number): number[] => { let o = [1]; while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap(s => [s, m - s]) } return o }
const O32 = order(32)
for (const y of [2017, 2018, 2019, 2020, 2013]) {
  const pdf = `${HISTORY_DIR}/${y}/${fs.readdirSync(`${HISTORY_DIR}/${y}`).find(f => f.endsWith('.pdf'))}`
  const { seeds } = readStateSeeds(pdf, W)
  const st = readYear(y).events.find(e => e.kind === 'state')!
  let exact = 0, total = 0; const samples: string[] = []
  for (const w of W) {
    const seedOf = (n: string) => seeds.find(s => s.weight === w && norm(s.name) === norm(n))?.seed
    const first = st.rows.filter(r => Number(r.weight) === w && r.round === st.rows.find(x => Number(x.weight) === w)!.round)
    const seq = first.map(r => [seedOf(r.winner), r.loser ? seedOf(r.loser) : undefined])
    // expected pairs in line order: (O32[0],O32[1]), (O32[2],O32[3]) …
    const pairs = Array.from({ length: 16 }, (_, i) => [O32[2 * i], O32[2 * i + 1]].sort((a, b) => a - b).join('v'))
    const got = seq.map(p => p.filter(Boolean).sort((a, b) => a! - b!).join('v'))
    total++; if (JSON.stringify(got) === JSON.stringify(pairs)) exact++
    if (samples.length < 2) samples.push(`${w} [${first[0]?.round}]: ${got.join(' ')}`)
  }
  console.log(`${y}: first round in standard bracket order for ${exact}/${total} weights`)
  for (const s of samples) console.log('   ', s)
}
