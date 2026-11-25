import { NextRequest } from 'next/server'
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const P = await import('../../src/app/api/admin/hub/prospects/route')
const E = await import('../../src/app/api/admin/hub/event/route')
const L = await import('../../src/app/api/admin/hub/leaderboard/route')
const r = (u: string) => new NextRequest(`http://x${u}`)
for (const sex of ['M', 'F']) {
  const t = await (await T.GET(r(`/api?gender=X&hub=ms&sex=${sex}`))).json()
  const kids = t.tournaments.find((x: any) => x.name === 'USAW-NJ Scholastic State Championships (NJUSA)').events.find((e: any) => e.season === 2026)
  const p = await (await P.GET(r(`/api?gender=X&sex=${sex}`))).json()
  const ev = await (await E.GET(r(`/api?gender=X&id=${kids.id}&sex=${sex}`))).json()
  const lb = await (await L.GET(r(`/api?gender=X&hub=ms&sex=${sex}`))).json()
  const divs = [...new Set(ev.placements.map((x: any) => x.division))]
  console.log(`${sex}: NJ Kids States 2026 — NJ ${kids.nj.competed}, podium ${kids.nj.podium.length}, e.g. ${kids.nj.podium.slice(0, 3).map((x: any) => `${x.name} (${x.division})`).join('; ')} | event page places ${ev.placements.length}, divisions ${divs.length}: ${divs.slice(0, 6).join(', ')} | prospects ${p.prospects.length} | leaderboard ${lb.rows.length}, all ${sex}? ${lb.rows.every((x: any) => x.sex === sex)}`)
}
