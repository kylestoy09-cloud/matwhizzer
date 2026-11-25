import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}&hub=offseason&season=2026`))).json()
  const ours = d.rows.filter((r: any) => r.wrestler?.school)
  console.log(g, 'NJ kids', d.rows.length, '| ours with a school', ours.length, '| schools', new Set(ours.map((r: any) => r.wrestler.school)).size, '| linked but no school', d.rows.filter((r: any) => r.wrestler && !r.wrestler.school).length)
}
