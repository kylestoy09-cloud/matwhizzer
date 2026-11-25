import { load, rowsOf } from './build_podiums.mts'
import * as H from '../../src/lib/hubFiles'
import { readFileSync } from 'fs'
const B = `${process.env.HOME}/Desktop/wrestling_brackets/Off Season Stuff/2026`
for (const [k, f] of Object.entries({ Journeymen: ['Journeymen Fall Classic.rtf', '2026JourneymenFallClassic.csv'], WAR: ['war at the shore.rtf', '2026WarattheShore.csv'], NJFS: ['2026 New Jersey Freestyle & Greco State Championship.rtf', '2026NewJerseyFreestyle&GrecoStateChampionship.csv'] })) {
  const rows = rowsOf(await load(f))
  const c = new Map<string, any[]>()
  for (const r of rows) if (!r.place_to) { const key = `${r.division}|${r.weight}|${r.place}`; c.set(key, [...(c.get(key) ?? []), r]) }
  const d = [...c].filter(([, v]) => v.length > 1)
  console.log(`\n${k}: ${d.length} doubled places, e.g.`, d.slice(0, 3).map(([key, v]) => `${key}: ${v.map((r: any) => r.name).join(' / ')}`).join(' ;; '))
  const raw = H.parseBoutExport(readFileSync(`${B}/${f[1]}`, 'utf8'))
  const wts = [...new Set(raw.map(b => b.weight))]; console.log('  weight labels:', wts.slice(0, 25).join(' '))
  const rounds = [...new Set(raw.map(b => b.round))]; console.log('  rounds:', rounds.slice(0, 30).join(' | '))
}
