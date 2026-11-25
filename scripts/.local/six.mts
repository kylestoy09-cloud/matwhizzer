import { NextRequest } from 'next/server'
const R = await import('../../src/app/api/admin/playoff-history/route')
// Kyle 2026-11-14: 1A 2A 3A 4A 5 different 6 different
const ids = [325, 352, 445, 694, 918, 923]
const res = await R.POST(new NextRequest('http://x', { method: 'POST', body: JSON.stringify({ gender: 'M', action: 'decide', ids, decision: 'different' }) }))
console.log(res.status, JSON.stringify(await res.json()))
