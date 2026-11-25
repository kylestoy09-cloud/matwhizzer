import { getWorkingSeason } from '../../src/lib/season-context'
for (const g of ['M', 'F'] as const) { const s = await getWorkingSeason(g); console.log(g, 'working season:', s.id, s.label) }
process.exit(0)
