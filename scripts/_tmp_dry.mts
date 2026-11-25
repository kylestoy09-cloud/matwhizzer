// dry run of the WRR rebuild for one past season, in-process (writes nothing): saves each wrestler's result
import { writeFileSync } from 'fs'
import { NextRequest } from 'next/server'
process.env.CRON_SECRET = process.env.CRON_SECRET || 'local-dry-run'
const { POST } = await import('../src/app/api/admin/recalculate-hammer-scores/route')
const out: Record<string, unknown> = {}
for (const gender of ['M', 'F']) {
  const req = new NextRequest(`http://localhost/api/admin/recalculate-hammer-scores?gender=${gender}`, { method: 'POST', headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, 'content-type': 'application/json' }, body: JSON.stringify({ season: '2025-26', dryRun: true, gender }) })
  const res = await POST(req); const j = await res.json()
  if (j.error) throw new Error(j.error)
  out[gender] = j.rows; console.log(gender, 'bouts', j.bouts_processed, 'wrestlers', j.rows.length)
}
writeFileSync(process.argv[2], JSON.stringify(out))
