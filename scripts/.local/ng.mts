import { NextRequest } from 'next/server'
const R = await import('../../src/app/api/admin/playoff-history/route')
const res = await R.POST(new NextRequest('http://x', { method: 'POST', body: JSON.stringify({ gender: 'M', action: 'decide', ids: [777, 891], decision: 'different' }) }))
console.log(res.status, JSON.stringify(await res.json()))
