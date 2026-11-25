// Off the offseason lists (Kyle 2026-11-12): in-season tournaments, National Prep (not NJSIAA), and the
// UWW U17 & U20 World Team Trials ("hide for now"). Hidden (is_active false), not deleted.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const OFF = ['Beast of the East', 'Walsh Jesuit Ironman', 'PowerAde Tournament', 'Escape the Rock', 'National Prep Championship', 'UWW U17 & U20 World Team Trials']
for (const t of ['boys_hub_tournaments', 'girls_hub_tournaments']) {
  const { data: ev } = await db.from(t.replace('tournaments', 'events')).select('id, tournament_id')
  const { data: ts } = await db.from(t).select('id, name').in('name', OFF)
  const withEvents = (ts ?? []).filter(x => (ev ?? []).some(e => e.tournament_id === x.id))
  if (withEvents.length) throw new Error(`has seasons entered: ${withEvents.map(x => x.name)}`)
  const { data, error } = await db.from(t).update({ is_active: false }).in('name', OFF).select('name')
  if (error) throw error
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }).eq('is_active', true)
  console.log(t, 'hidden', data!.length, '| shown now', count)
}
