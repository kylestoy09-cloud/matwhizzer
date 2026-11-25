// Round trip on the new hub tables (service role): event → prospects → placement + bout → read → remove.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ok = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data }
for (const g of ['boys', 'girls']) {
  const t = ok(await db.from(`${g}_hub_tournaments`).select('id, name').eq('hub', 'ms').order('sort_order').limit(1).single(), 'tournament')
  const ev = ok(await db.from(`${g}_hub_events`).insert({ tournament_id: t.id, season: 2027, label: 'TEST' }).select('id').single(), 'event')
  const [a, b] = ok(await db.from(`${g}_prospects`).insert([{ first_name: 'Test', last_name: 'Alpha', state: 'NJ' }, { first_name: 'Test', last_name: 'Bravo' }]).select('id'), 'prospects')
  ok(await db.from(`${g}_hub_placements`).insert({ event_id: ev.id, weight: '120', place: 1, name_listed: 'Test Alpha', prospect_id: a.id }).select('id'), 'placement')
  const dup = await db.from(`${g}_hub_placements`).insert({ event_id: ev.id, weight: '120', place: 1, name_listed: 'X', prospect_id: b.id })
  ok(await db.from(`${g}_hub_bouts`).insert({ event_id: ev.id, weight: '120', winner_listed: 'Test Alpha', winner_prospect_id: a.id, loser_listed: 'Test Bravo', loser_prospect_id: b.id }).select('id'), 'bout')
  const read = ok(await db.from(`${g}_hub_placements`).select('place, prospect_id').eq('event_id', ev.id), 'read')
  const clubs = ok(await db.from('wrestling_clubs').select('id', { count: 'exact', head: true }), 'clubs')
  ok(await db.from(`${g}_hub_events`).delete().eq('id', ev.id).select('id'), 'cleanup event')   // cascades placements + bouts
  ok(await db.from(`${g}_prospects`).delete().in('id', [a.id, b.id]).select('id'), 'cleanup prospects')
  const left = ok(await db.from(`${g}_hub_events`).select('id').eq('label', 'TEST'), 'left')
  console.log(g, `${t.name}: placement read ${read.length}, duplicate place refused: ${dup.error?.code === '23505'}, test rows left: ${left.length}`)
}
