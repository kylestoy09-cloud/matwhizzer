import { NextRequest } from 'next/server'
const Hi = await import('../../src/app/api/admin/history/route')
for (const g of ['M', 'F']) {
  const d = await (await Hi.GET(new NextRequest(`http://x/api?gender=${g}`))).json()
  const names = new Set(d.finishes.map((f: any) => f.school).filter(Boolean))
  const withSec = d.finishes.filter((f: any) => f.school && d.sections[f.school]).length
  const missing = new Map<string, number>(); for (const f of d.finishes) if (f.school && !d.sections[f.school]) missing.set(f.school, (missing.get(f.school) ?? 0) + 1)
  console.log(`${g}: school names ${names.size}, with a section ${Object.keys(d.sections).length}; finishes with a section ${withSec} of ${d.finishes.length}; sections ${JSON.stringify([...new Set(Object.values(d.sections))])}`)
  console.log('   most finishes without one:', [...missing].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, v]) => `${k} (${v})`).join(', '))
}
