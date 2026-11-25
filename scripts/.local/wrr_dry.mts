// Dry run of the WRR recalculation for a past season (writes nothing): saves each wrestler's rating.
//   npx tsx scripts/.local/wrr_dry.mts <out.json> [season]
process.env.CRON_SECRET = 'local-dry-run'
const { POST } = await import('../../src/app/api/admin/recalculate-hammer-scores/route')
const { NextRequest } = await import('next/server')
const { writeFileSync } = await import('fs')
const out: Record<string, unknown> = {}
for (const gender of ['M', 'F']) {
  const req = new NextRequest('http://local/api', { method: 'POST', headers: { 'x-cron-secret': 'local-dry-run', 'content-type': 'application/json' },
    body: JSON.stringify({ gender, season: '2025-26', dryRun: true, bumpTest: process.argv[3] ? JSON.parse(process.argv[3]) : undefined }) })
  const res = await POST(req)
  const d = await res.json()
  if (!d.dry_run) throw new Error(JSON.stringify(d))
  console.log(gender, d.season, 'rows', d.rows.length, 'bouts', d.bouts_processed)
  out[gender] = d.rows
}
writeFileSync(process.argv[2], JSON.stringify(out))
