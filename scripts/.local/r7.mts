import { execFileSync } from 'child_process'
import { readYear, HISTORY_DIR } from '../../src/lib/playoffHistory/readFiles'
import { buildBrackets } from '../../src/lib/playoffHistory/brackets'
const ev = readYear(2024).events.find(e => e.kind === 'region' && e.num === 7)!
const brs = buildBrackets(ev)
// the PDF: on each weight's championship page a wrestler is printed once to enter + once per champ win
const pdf = `${HISTORY_DIR}/2024/NJSIAA Region 7 - Brackets - FloWrestling.pdf`
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf]).toString())![1])
const champWins = new Map<string, number>()
for (let p = 1; p <= pages; p++) {
  const t = execFileSync('pdftotext', ['-layout', '-f', String(p), '-l', String(p), pdf, '-']).toString()
  if (!/Page 1 of/.test(t)) continue
  const w = t.split('\n').slice(0, 20).map(l => /\s{20,}(\d{3})\s*$/.exec(l)?.[1]).find(Boolean)
  const counts = new Map<string, number>()
  for (const l of t.split('\n')) { const m = /^\s*\d{1,2}\s+(.+?)\s+\(([A-Z0-9]+)\)\s*$/.exec(l); if (m) { const last = m[1].trim().split(/\s+/).slice(-1)[0].replace(/\bII\b|\bJr\.?/, '').trim() || m[1]; const key = `${w}|${m[1].trim().split(/\s+/).filter(x => !/^(II|III|Jr\.?)$/.test(x)).slice(-1)[0]}|${m[2]}`; counts.set(key, (counts.get(key) ?? 0) + 1) } }
  for (const [k, v] of counts) champWins.set(k, v - 1)
}
let agree = 0, dis = 0; const bad: string[] = []
for (const b of brs) {
  const mine = new Map<string, number>()
  for (const x of b.bouts) if (x.side === 'championship') mine.set(x.winner, (mine.get(x.winner) ?? 0) + 1)
  for (const r of ev.rows) if (Number(r.weight) === b.weight && r.winType === 'BYE' && r.winner) mine.set(r.winner.trim(), (mine.get(r.winner.trim()) ?? 0) + 1)   // the PDF prints a bye advance too
  for (const e of b.entrants) {
    const last = e.name.trim().split(/\s+/).filter(x => !/^(II|III|Jr\.?)$/.test(x)).slice(-1)[0]
    const pdfKey = [...champWins.keys()].find(k => k.startsWith(`${b.weight}|${last}|`))
    if (pdfKey == null) continue
    if ((mine.get(e.name) ?? 0) === champWins.get(pdfKey)) agree++; else { dis++; bad.push(`${b.weight} ${e.name}: ours ${mine.get(e.name) ?? 0}, PDF ${champWins.get(pdfKey)}`) }
  }
  console.log(b.weight, b.problems.join(' / ') || 'ok', '| places', [...b.places].sort((x, y) => x[0] - y[0]).map(([p, n]) => `${p} ${n.split(' ').pop()}`).join(', '))
}
console.log('championship wins vs the PDF: agree', agree, 'disagree', dis); for (const x of bad) console.log('   ', x)
