// Rebuild each event's per-division upload lines from what is loaded (a partial reload replaces a division's line
// with just the part it loaded)
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['boys', 'girls', 'mixed']) {
  const { data: evs } = await db.from(`${g}_hub_events`).select('id, upload_divisions').not('uploaded_at', 'is', null)
  for (const e of evs ?? []) {
    const rows: any[] = []
    for (let a = 0; ; a += 1000) { const { data } = await db.from(`${g}_hub_placements`).select('division, style, weight, place, place_to').eq('event_id', e.id).order('id').range(a, a + 999); rows.push(...data!); if (data!.length < 1000) break }
    const keys = [...new Set(rows.map(r => `${r.division}|${r.style}`))]
    const lines = keys.map(k => { const rs = rows.filter(r => `${r.division}|${r.style}` === k); return { division: rs[0].division, style: rs[0].style, weights: new Set(rs.map(r => r.weight)).size, places: rs.length, placed_through: Math.max(...rs.map(r => r.place_to ?? r.place)) } })
    await db.from(`${g}_hub_events`).update({ upload_divisions: lines }).eq('id', e.id)
  }
  console.log(g, 'events rebuilt', evs?.length)
}
