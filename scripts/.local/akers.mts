import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, gender, graduation_year, is_oos').ilike('last_name', 'akers')
console.log('wrestlers', ws)
for (const pool of ['boys', 'girls', 'mixed']) {
  const { data: ps } = await db.from(`${pool}_prospects`).select('*').ilike('last_name', 'akers')
  for (const p of ps ?? []) {
    const { data: pl } = await db.from(`${pool}_hub_placements`).select('event_id, division, weight, place, place_to, name_listed, club_listed').eq('prospect_id', p.id)
    const { count: bw } = await db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).eq('winner_prospect_id', p.id)
    const { count: bl } = await db.from(`${pool}_hub_bouts`).select('*', { count: 'exact', head: true }).eq('loser_prospect_id', p.id)
    console.log(pool, p.id, p.first_name, p.last_name, 'state', p.state, 'wrestler', p.wrestler_id, 'club', p.club_listed, '| places', JSON.stringify(pl), '| bouts W', bw, 'L', bl)
  }
}
// listed names containing Akers anywhere (unlinked)
for (const pool of ['boys', 'mixed']) {
  const { data } = await db.from(`${pool}_hub_placements`).select('name_listed, club_listed, prospect_id, event_id').ilike('name_listed', '%akers%')
  const { data: b1 } = await db.from(`${pool}_hub_bouts`).select('winner_listed, winner_club_listed, winner_prospect_id, event_id').ilike('winner_listed', '%akers%').limit(5)
  console.log(pool, 'placements listed', JSON.stringify(data), '| bouts won listed', JSON.stringify(b1))
}
