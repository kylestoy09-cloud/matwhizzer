import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/tournaments/route'
import { GET as LB } from '../../src/app/api/admin/hub/leaderboard/route'
import { GET as CL } from '../../src/app/api/admin/hub/clubs/route'
for (const g of ['M', 'F', 'X']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}&hub=${g === 'X' ? 'ms' : 'offseason'}`))).json()
  if (d.error) { console.log(g, d.error); continue }
  for (const t of d.tournaments.filter((t: any) => t.is_active)) for (const e of t.events)
    console.log(g, t.level, t.champion_rating, t.name, e.season, '| uploaded', e.uploaded_at?.slice(0, 10), '| places', e.placements, 'through', e.placed_through, '| NJ', e.nj.competed, 'podium', e.nj.podium.length, 'below8', e.nj.placed.length, '|', e.nj.podium.slice(0, 2).map((r: any) => `${r.place} ${r.name} (${r.from}) ${r.division} ${r.weight}`).join('; '))
}
const lb = await (await LB(new NextRequest('http://x/api?gender=M&hub=offseason&season=2026'))).json()
console.log('leaderboard top 3:', lb.rows.slice(0, 3).map((r: any) => `${r.name} | club ${r.club} | HS ${r.wrestler?.school}`))
const cl = await (await CL(new NextRequest('http://x/api?gender=M'))).json()
console.log('clubs', cl.clubs.length, 'unlisted', cl.unlisted.length)
