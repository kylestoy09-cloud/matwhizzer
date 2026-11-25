import { NextRequest } from 'next/server'
const R = await import('../../src/app/api/admin/playoff-history/route')
for (const [ids, decision] of [[[776, 884], 'different'], [[883], 'same']] as const) {
  const res = await R.POST(new NextRequest('http://x', { method: 'POST', body: JSON.stringify({ gender: 'M', action: 'decide', ids, decision }) }))
  console.log(ids, decision, res.status, JSON.stringify(await res.json()).slice(0, 200))
}
