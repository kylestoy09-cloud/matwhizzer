// Kyle 2026-11-13: the four middle school league tournaments are Local (champion rating 25); Mobbin was 9/13.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LOCAL = ['Jersey Shore Junior Wrestling League (JSJWL) Championships', 'South Jersey Middle School Wrestling League (SJMSWL) Tournament', 'Raritan Valley League Tournament', 'Tri-County Middle School / Youth Championships']
const { data, error } = await db.from('mixed_hub_tournaments').update({ level: 'local', champion_rating: 25 }).in('name', LOCAL).select('name, level, champion_rating')
if (error) throw error; console.log(data)
for (const g of ['boys', 'girls']) {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', 'Mobbin Classic Preseason Open').single()
  const { data: e, error: e2 } = await db.from(`${g}_hub_events`).update({ start_date: '2026-09-13' }).eq('tournament_id', t!.id).eq('season', 2026).select('id, start_date')
  if (e2) throw e2; console.log(g, 'Mobbin', e)
}
for (const g of ['boys', 'girls']) {
  const { data: ev } = await db.from(`${g}_hub_events`).select('id, season, start_date, tournament_id').gte('start_date', '2026-09-01')
  const { data: ts } = await db.from(`${g}_hub_tournaments`).select('id, name')
  console.log(g, 'after 9/1:', (ev ?? []).map(e => `${ts!.find(t => t.id === e.tournament_id)?.name} ${e.start_date}`))
}
