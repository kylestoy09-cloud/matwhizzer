import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/playoff-history/route'
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}`))).json()
  if (d.error) { console.log(g, 'ERROR', d.error); continue }
  const c: Record<string, number> = {}; for (const n of d.names) c[n.decision] = (c[n.decision] ?? 0) + 1
  console.log(g, '| seasons staged', d.seasons.map((s: any) => `${s.label}:${s.status}`).join(' '), '| history seasons', d.history_seasons.join(','), '| names', JSON.stringify(c), '| schools list', d.schools.length)
}
