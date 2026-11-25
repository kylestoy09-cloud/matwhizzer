import fs from 'fs'
import { execFileSync } from 'child_process'
import { readStateSeeds } from '../../src/lib/playoffHistory/stateSeeds'
import { HISTORY_DIR } from '../../src/lib/playoffHistory/readFiles'
const W = [106, 113, 120, 126, 132, 138, 145, 152, 160, 170, 182, 195, 220, 285]
for (let y = 2013; y <= 2020; y++) {
  const pdf = `${HISTORY_DIR}/${y}/${fs.readdirSync(`${HISTORY_DIR}/${y}`).find(f => f.endsWith('.pdf'))}`
  const { seeds } = readStateSeeds(pdf, W)
  const full = y <= 2016 ? 24 : 32
  for (const w of W) {
    const have = new Set(seeds.filter(s => s.weight === w).map(s => s.seed))
    const miss = Array.from({ length: full }, (_, i) => i + 1).filter(n => !have.has(n))
    if (!miss.length) continue
    const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString()
    const lines = miss.map(n => text.split('\n').find(l => new RegExp(`^\\s{0,3}${n}\\s+\\S`).test(l) && !have.has(n)) ?? '(no line)')
    console.log(y, w, 'missing seeds', miss.join(','), '| lines:', lines.map(l => JSON.stringify(l.slice(0, 70))).join(' '))
  }
}
