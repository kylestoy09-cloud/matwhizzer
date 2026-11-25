import { buildOffseasonBoard } from '../../src/lib/offseasonPublic'
for (const g of ['M', 'F'] as const) {
  const b = (await buildOffseasonBoard(g))!
  const bo = b.entries.filter(e => !e.finishes.length)
  console.log(g, 'on the board', b.entries.length, '| wrestled but never placed', bo.length, '| e.g.', bo.slice(0, 2).map(e => `${e.name} (${e.school}): ${e.wrestled.map(w => w.tournament).join(', ')}`).join(' | '), '| cache', Math.round(JSON.stringify(b).length / 1024), 'KB')
}
