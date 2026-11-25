import { load, rowsOf } from './build_podiums.mts'
const sets: Record<string, string[]> = { Early: ['super 32 early qualifier.rtf', '2026NJSuper32EarlyEntry.csv'], Journeymen: ['Journeymen Fall Classic.rtf', '2026JourneymenFallClassic.csv'], WAR: ['war at the shore.rtf', '2026WarattheShore.csv'], NJFS: ['2026 New Jersey Freestyle & Greco State Championship.rtf', '2026NewJerseyFreestyle&GrecoStateChampionship.csv'], NER: ['2026 Phil Portuese Northeast Regional Championships.rtf'] }
for (const [k, f] of Object.entries(sets)) {
  const rows = rowsOf(await load(f))
  const c = new Map<string, number>(); for (const r of rows) c.set(r.team, (c.get(r.team) ?? 0) + 1)
  const st = rows.filter(r => /,\s*[A-Z]{2}\s*$|\([A-Z]{2}\)\s*$/.test(r.team)).length
  console.log(`\n${k}: ${c.size} teams, ${st}/${rows.length} with a state in the name | top:`, [...c].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([t, n]) => `${t}(${n})`).join(' · '))
}
