import { trophyIndex } from '../../src/lib/trophyCase'
const idx = await trophyIndex('M')
for (const [id, t] of Object.entries(idx)) for (const f of t.individual) if (/sc?heets/i.test(f.name)) console.log(id, f.year, f.weight, f.level, f.place, f.name, f.region)
