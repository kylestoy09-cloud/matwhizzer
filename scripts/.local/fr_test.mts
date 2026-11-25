import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/freshman/route'
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}`))).json()
  if (d.error) { console.log(g, d.error); continue }
  const m = d.rows.filter((r: any) => r.matched)
  const by = new Map<number, number>(); for (const r of m) by.set(r.ms_season, (by.get(r.ms_season) ?? 0) + 1)
  console.log(g, 'rows', d.rows.length, 'matched', m.length, JSON.stringify([...by]), 'postseasons', d.postseasons, '| 2024 Intermediate champs:', m.filter((r: any) => r.ms_season === 2024 && r.place === 1).map((r: any) => `${r.name} ${r.division} → ${r.furthest} ${r.state ?? ''}`).join('; '))
}
