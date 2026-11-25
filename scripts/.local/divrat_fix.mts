import { NextRequest } from 'next/server'
const T = await import('../../src/app/api/admin/hub/tournaments/route')
const res = await T.PATCH(new NextRequest('http://x/api', { method: 'PATCH', body: JSON.stringify({ gender: 'M', id: 27, division_ratings: { Freshman: 75, Sophomore: 75, Junior: 90, Senior: 90 } }) }))
console.log(res.status, JSON.stringify((await res.json()).tournament.division_ratings))
