import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/freshman/route'
const out = (r: any) => r.furthest === 'State' ? (r.state && r.state <= 8 ? 'placer' : 'SQ') : r.furthest === 'Region' ? 'region' : r.furthest === 'District' ? 'district' : 'none'
const band = (p: number) => (p === 1 ? 'Champion' : p === 2 ? 'Runner-up' : p <= 4 ? '3rd-4th' : '5th-8th')
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}`))).json()
  const m = d.rows.filter((r: any) => r.matched && r.ms_season === 2024)
  console.log(`\n${g} 2024 (8th grade 2023-24) matched ${m.length}; by division ${JSON.stringify(Object.entries(m.reduce((a: any, r: any) => (a[r.division] = (a[r.division] ?? 0) + 1, a), {})))}`)
  for (const b of ['Champion', 'Runner-up', '3rd-4th', '5th-8th']) { const x = m.filter((r: any) => band(r.place) === b); console.log(b, x.length, ['placer', 'SQ', 'region', 'district', 'none'].map(o => `${o} ${x.filter((r: any) => out(r) === o).length}`).join(' · ')) }
  console.log('state placers:', m.filter((r: any) => out(r) === 'placer').map((r: any) => `${r.name} (${r.hs_school}) MS ${r.place} ${r.division} → ${r.state}`).join('; '))
}
