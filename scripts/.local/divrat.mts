import { NextRequest } from 'next/server'
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const list = await (await T.GET(new NextRequest('http://x/api?gender=M&hub=offseason'))).json()
const t = list.tournaments.find((x: any) => x.name === 'NHSCA High School Nationals')
console.log('before', t.id, JSON.stringify(t.division_ratings), 'divisions', JSON.stringify([...new Set(t.events.flatMap((e: any) => (e.upload_divisions ?? []).map((d: any) => d.division)))]))
const res = await T.PATCH(new NextRequest('http://x/api', { method: 'PATCH', body: JSON.stringify({ gender: 'M', id: t.id, division_ratings: { Freshman: '75', Sophomore: '', Junior: '90', Senior: '90' } }) }))
console.log('PATCH', res.status, JSON.stringify(await res.json()).slice(0, 300))
