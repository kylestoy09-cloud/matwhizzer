import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
const d = await (await GET(new NextRequest('http://x/api?gender=M&hub=offseason&season=2026&state=all'))).json()
for (const div of ['Freshman', 'Sophomore', 'Junior', 'Senior']) {
  const r = d.rows.find((x: any) => (x.score_from ?? '').includes(`NHSCA High School Nationals ${div} `) && x.score_from.endsWith('1st'))
  console.log(div, '→', r ? `${r.name}: ${r.score} (${r.score_from})` : 'none')
}
