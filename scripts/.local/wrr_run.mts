// Run the WRR recalculation locally (service role), e.g. a past-season rebuild:
//   npx tsx scripts/.local/wrr_run.mts '{"season":"2025-26","archive":true}'      (both genders)
//   npx tsx scripts/.local/wrr_run.mts '{}'                                      (season in progress)
process.env.CRON_SECRET = 'local-run'
const { POST } = await import('../../src/app/api/admin/recalculate-hammer-scores/route')
const { NextRequest } = await import('next/server')
const extra = JSON.parse(process.argv[2] ?? '{}')
for (const gender of ['M', 'F']) {
  const t = Date.now()
  const res = await POST(new NextRequest('http://local/api', { method: 'POST', headers: { 'x-cron-secret': 'local-run', 'content-type': 'application/json' }, body: JSON.stringify({ gender, ...extra }) }))
  console.log(gender, res.status, JSON.stringify(await res.json()), `${Math.round((Date.now() - t) / 1000)}s`)
}
