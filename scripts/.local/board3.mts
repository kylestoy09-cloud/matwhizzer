import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
for (const g of ['M', 'F'] as const) {
  const b = (await buildOffseasonBoard(g))!
  const byId = new Map(b.entries.map(e => [e.wrestler_id, e]))
  console.log(g, b.lists.overall.map(id => `${byId.get(id)!.name} ${byId.get(id)!.weight ?? 'NO WEIGHT'}`).join('; '))
}
