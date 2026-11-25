process.env.CRON_SECRET = 'local-run'
const { POST } = await import('../../src/app/api/admin/recalculate-hammer-scores/route')
const { NextRequest } = await import('next/server')
for (const extra of [{ season: '2025-26', archive: true }, {}]) {
  const t = Date.now()
  const res = await POST(new NextRequest('http://local/api', { method: 'POST', headers: { 'x-cron-secret': 'local-run', 'content-type': 'application/json' }, body: JSON.stringify({ gender: 'M', ...extra }) }))
  console.log(JSON.stringify(extra), res.status, JSON.stringify(await res.json()).slice(0, 300), `${Math.round((Date.now() - t) / 1000)}s`)
}
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const season of [2025, 2026, 2027]) for (const fn of ['lb_rs_refresh', 'lb_ps_refresh']) {
  const r = await db.rpc(fn, { p_gender: 'M', p_season: season }); console.log(fn, season, r.error?.message ?? 'ok')
}
