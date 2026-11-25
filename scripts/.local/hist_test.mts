import { NextRequest } from 'next/server'
import { GET } from '../../src/app/api/admin/history/route'
for (const g of ['M', 'F']) {
  const d = await (await GET(new NextRequest(`http://x/api?gender=${g}`))).json()
  console.log(g, 'finishes', d.finishes?.length, 'titles', d.titles?.length, '| sample', JSON.stringify(d.finishes?.find((f: any) => f.level === 'region')))
}
