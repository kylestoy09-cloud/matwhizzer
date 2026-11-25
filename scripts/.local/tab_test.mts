const { GET } = await import('../../src/app/api/admin/past-seasons/tab/route')
const { NextRequest } = await import('next/server')
for (const gender of ['M', 'F']) for (const tab of ['schools', 'wrestlers', 'coaches', 'tournaments', 'leaderboards', 'playoffs']) {
  const t = Date.now()
  const res = await GET(new NextRequest(`http://l/api?tab=${tab}&seasonId=2026&gender=${gender}`))
  const d = await res.json()
  const n = d.rows ? d.rows.length : d.lists ? d.lists.map((l: any) => l.rows.length).join('/') : JSON.stringify(d).slice(0, 200)
  const sample = d.rows?.[0] ? JSON.stringify(d.rows[0]).slice(0, 160) : d.lists?.[0]?.rows?.[0] ? JSON.stringify(d.lists[0].rows[0]) : ''
  const extra = tab === 'playoffs' ? ` | levels ${JSON.stringify(Object.entries(d.rows.reduce((a: any, r: any) => (a[r.level] = (a[r.level] ?? 0) + 1, a), {})))} | state placers ${d.rows.find((r: any) => r.level === 'state')?.placers.length}` : tab === 'coaches' ? ` | without ${d.without?.length}` : ''
  console.log(gender, tab, res.status, n, `${Date.now() - t}ms`, extra, '\n   ', sample)
}
