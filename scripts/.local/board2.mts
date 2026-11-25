import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
for (const g of ['M', 'F'] as const) {
  const b = await buildOffseasonBoard(g)
  const byId = new Map(b!.entries.map(e => [e.wrestler_id, e]))
  console.log(g, 'overall', b!.lists.overall.length, '| weights', b!.weights.length, '| first 3:', b!.lists.overall.slice(0, 3).map(id => byId.get(id)!.name).join(', '), '| events in dropdown for #1:', byId.get(b!.lists.overall[0])!.finishes.length)
}
