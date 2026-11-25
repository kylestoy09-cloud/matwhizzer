// Directory archive mode: read 2025-26, edit one past-season value, confirm schools (2026-27) untouched, restore.
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { NextRequest } = await import('next/server')
for (const [g, path] of [['boys', '../../src/app/api/admin/school-directory/route'], ['girls', '../../src/app/api/admin/school-directory-girls/route']] as const) {
  const { GET, PATCH } = await import(path)
  const d = await (await GET(new NextRequest('http://l/api?season_id=2026&coach_season_id=2026&archive=1'))).json()
  const rows = d.schools as any[]
  const target = rows.find(r => r.ad_name) ?? rows[0]
  const before = (await db.from('schools').select('ad_name').eq('id', target.id).single()).data!.ad_name
  const patch = (value: string | null) => PATCH(new NextRequest('http://l/api', { method: 'PATCH', body: JSON.stringify({ school_id: target.id, field: 'ad_name', value, season_id: 2026, coach_season_id: 2026, archive: true }) }))
  await patch('TEST 2025-26 AD')
  const past = (await db.from(`${g}_school_season_details`).select('ad_name').eq('school_id', target.id).eq('season_id', 2026).single()).data!.ad_name
  const live = (await db.from('schools').select('ad_name').eq('id', target.id).single()).data!.ad_name
  await patch(target.ad_name)
  const restored = (await db.from(`${g}_school_season_details`).select('ad_name').eq('school_id', target.id).eq('season_id', 2026).single()).data!.ad_name
  console.log(`${g}: ${rows.length} rows | with AD ${rows.filter(r => r.ad_name).length}, coach ${rows.filter(r => r.coach_name).length}, section ${rows.filter(r => r.section).length} | edit → 2025-26 "${past}", 2026-27 unchanged: ${live === before} | restored: ${restored === target.ad_name}`)
}
