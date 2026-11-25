import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
const d = await (await GET(new NextRequest('http://x/api?gender=M&hub=offseason&season=2026'))).json()
for (const n of ['Frank Albright', 'Thomas Blewett', 'Aidan Yarussi', 'Matty Ortega', 'Max Garcia', 'Christian Wolf']) {
  const r = d.rows.find((r: any) => r.name === n)
  console.log(n, '→', r?.weight, '|', r?.finishes.map((f: any) => `${f.tournament.slice(0, 22)} ${f.weight}`).join('; '))
}
console.log('no weight:', d.rows.filter((r: any) => !r.weight).length)
