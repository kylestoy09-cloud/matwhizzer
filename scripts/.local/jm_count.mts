import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [g, name] of [['boys', 'Journeymen Fall Classic'], ['girls', 'Journeymen Fall Classic'], ['mixed', 'Journeymen Fall Classic (Overflo MS Division)']]) {
  const { data: t } = await db.from(`${g}_hub_tournaments`).select('id').eq('name', name).single()
  const { data: evs } = await db.from(`${g}_hub_events`).select('id').eq('tournament_id', t!.id)
  const c = new Map<string, number>()
  for (const e of evs ?? []) { const { data } = await db.from(`${g}_hub_placements`).select('division').eq('event_id', e.id); for (const r of data ?? []) c.set(r.division, (c.get(r.division) ?? 0) + 1) }
  console.log(g, JSON.stringify([...c]))
}
