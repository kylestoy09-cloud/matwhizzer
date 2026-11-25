import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/hub/leaderboard/route'
const d = await (await GET(new NextRequest('http://x/api?gender=M&hub=offseason&season=2026'))).json()
const r = d.rows.find((r: any) => /akers/i.test(r.name))
console.log(r ? `${r.name} weight ${r.weight} score ${r.score} club ${r.club} class ${r.class_year} linked ${!!r.wrestler} events ${r.events} W-L ${r.wins}-${r.losses}` : 'not in rows')
