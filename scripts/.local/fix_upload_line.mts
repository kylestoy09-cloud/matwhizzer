import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: t } = await db.from('boys_hub_tournaments').select('id').eq('name', 'NHSCA High School Nationals').single()
const { data: e } = await db.from('boys_hub_events').select('id, upload_divisions').eq('tournament_id', t!.id).eq('season', 2026).single()
const rows: any[] = []
for (let a = 0; ; a += 1000) { const { data } = await db.from('boys_hub_placements').select('weight, place, place_to').eq('event_id', e!.id).eq('division', 'Junior').order('id').range(a, a + 999); rows.push(...data!); if (data!.length < 1000) break }
const line = { division: 'Junior', style: 'folkstyle', weights: new Set(rows.map(r => r.weight)).size, places: rows.length, placed_through: Math.max(...rows.map(r => r.place_to ?? r.place)) }
const divs = (e!.upload_divisions as any[]).map(d => (d.division === 'Junior' ? line : d))
await db.from('boys_hub_events').update({ upload_divisions: divs }).eq('id', e!.id)
console.log(divs)
