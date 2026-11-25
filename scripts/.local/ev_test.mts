import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
const d = await (await GET(new NextRequest('http://x/api?gender=M&hub=offseason&season=2026'))).json()
const c = new Map<number, number>(); for (const r of d.rows) c.set(r.events, (c.get(r.events) ?? 0) + 1)
console.log('NJ boys by events:', JSON.stringify([...c].sort((a, b) => a[0] - b[0])))
console.log('most:', [...d.rows].sort((a: any, b: any) => b.events - a.events).slice(0, 5).map((r: any) => `${r.name} ${r.events} (${r.wrestler?.school ?? r.club ?? ''})`).join('; '))
