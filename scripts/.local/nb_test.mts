import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}&hub=offseason&season=2026`))).json()
  const withWin = d.rows.filter((r: any) => r.notable.some((n: any) => n.kind === 'win')), withClose = d.rows.filter((r: any) => r.notable.some((n: any) => n.kind === 'close loss'))
  console.log(`\n${g}: NJ kids ${d.rows.length} | with a notable win ${withWin.length} | with a close loss ${withClose.length}`)
  const top = [...withWin].sort((a: any, b: any) => b.notable[0].opponent_score - a.notable[0].opponent_score).filter((r: any) => r.score < 80).slice(0, 6)
  for (const r of top) console.log(`  ${r.name} (${r.wrestler?.school ?? r.club ?? ''}, own score ${r.score}): ${r.notable.slice(0, 2).map((n: any) => `${n.kind} ${n.opponent} ${n.opponent_score} · ${n.result} · ${n.event}`).join(' | ')}`)
}
