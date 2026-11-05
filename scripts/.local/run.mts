import { NextRequest } from 'next/server'
import { POST } from '@/app/api/admin/recalculate-hammer-scores/route'
process.env.CRON_SECRET = process.env.LOCAL_RUN_SECRET!
const t = Date.now()
const req = new NextRequest('http://localhost/api/admin/recalculate-hammer-scores', {
  method: 'POST', headers: { authorization: `Bearer ${process.env.LOCAL_RUN_SECRET}`, 'content-type': 'application/json' }, body: process.env.RUN_BODY!,
})
const res = await POST(req); console.log(res.status, JSON.stringify(await res.json()).slice(0, 600), `${Math.round((Date.now() - t) / 1000)}s`)
