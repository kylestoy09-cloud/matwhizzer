import { readFileSync } from 'fs'
import * as H from '../../src/lib/hubFiles'
const t = H.rtfToText(readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026/2026 NHSCA National Duals.rtf`, 'utf8'))
const ros = H.parseRoster(t)
console.log(ros.filter(r => /^collins$/i.test(r.last) && /^b/i.test(r.first ?? '')).map(r => `${r.first} ${r.last} | ${r.team} | ${r.weight} | ${r.division}`))
const { bouts, unresolved } = H.parseDualCopy(t)
console.log('unresolved now', unresolved.length, unresolved)
console.log(bouts.filter(b => /collins/i.test(b.winner + b.loser) && /BIG MACS/i.test(b.winTeam + b.loseTeam)).slice(0, 6).map(b => `${b.weight}: ${b.winner} v ${b.loser}`))
for (const u of unresolved) {
  const m = /^([A-Za-z])\.?\s+(.+?) \((.+)\)$/.exec(u); if (!m) continue
  const last = m[2].replace(/,?\s+(jr|sr|ii|iii|iv)\.?$/i, '').toLowerCase()
  const hits = ros.filter(r => r.last.toLowerCase().replace(/,?\s+(jr|sr|ii|iii|iv)\.?$/i, '') === last && r.first?.[0]?.toLowerCase() === m[1].toLowerCase())
  console.log('  ', u, '→', hits.map(r => `${r.first} ${r.last} [${r.team}] ${r.weight}`).join('; ') || 'NOT ON ROSTER')
}
