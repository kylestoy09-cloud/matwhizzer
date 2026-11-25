import { NextRequest } from 'next/server'
const H = await import('../../src/app/api/admin/home-videos/route')
const { youTubeId } = await import('../../src/lib/homeVideo')
for (const g of ['M', 'F']) { const d = await (await H.GET(new NextRequest(`http://x/api?gender=${g}`))).json(); console.log(g, 'enabled', d.enabled, 'rows', d.rows?.length, 'thisWeek', d.thisWeek, 'showing', d.showing, d.error ?? '') }
for (const u of ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30', 'youtu.be/dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ', 'https://m.youtube.com/live/dQw4w9WgXcQ?si=x', 'https://vimeo.com/123', 'javascript:alert(1)']) console.log(u, '→', youTubeId(u))
