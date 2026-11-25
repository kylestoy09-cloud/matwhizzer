import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
for (const q of ['gender=M&hub=offseason&season=2026', 'gender=F&hub=offseason&season=2026', 'gender=X&hub=ms&sex=M', 'gender=X&hub=ms&sex=F']) {
  const d = await (await GET(new NextRequest(`http://x/api?${q}`))).json()
  if (d.error) { console.log(q, d.error); continue }
  const top = [...d.rows].sort((a: any, b: any) => b.score - a.score).slice(0, 4)
  console.log(`${q}: ${d.rows.length} NJ kids, no weight ${d.rows.filter((r: any) => !r.weight).length} | top:`, top.map((r: any) => `${r.name} ${r.weight} ${r.score} (${r.score_from}) ${r.wrestler?.school ?? ''} WRR ${r.wrestler?.rating?.score ?? '-'}`).join(' ;; '))
}
