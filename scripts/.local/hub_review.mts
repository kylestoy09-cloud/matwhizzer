import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string, f: (q: any) => any = q => q) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
for (const g of ['boys', 'girls', 'mixed']) {
  const ts = await all(`${g}_hub_tournaments`, 'id, hub, name, is_active, format, in_state')
  const evs = await all(`${g}_hub_events`, 'id, tournament_id, season, start_date')
  const pl = await all(`${g}_hub_placements`, 'event_id, place, place_to, prospect_id, club_listed, club_id, division')
  const ps = new Map((await all(`${g}_prospects`, 'id, state, club_id, wrestler_id')).map(p => [p.id, p]))
  console.log(`\n=== ${g}: ${ts.filter(t => t.is_active).length} shown / ${ts.length} tournaments`)
  for (const t of ts.filter(t => t.is_active)) {
    const es = evs.filter(e => e.tournament_id === t.id)
    const line = es.map(e => {
      const rows = pl.filter(p => p.event_id === e.id)
      const nj = rows.filter(r => ps.get(r.prospect_id)?.state === 'NJ')
      return `${e.season}: ${rows.length} places, NJ ${nj.length} (podium ${nj.filter(r => r.place <= 8 && !r.place_to).length}), deepest ${Math.max(0, ...rows.map(r => r.place_to ?? r.place))}, divisions ${[...new Set(rows.map(r => r.division))].join('/')}`
    }).join(' || ')
    console.log(`  ${t.name.padEnd(52)} ${line || '— nothing loaded'}`)
  }
  const prosp = [...ps.values()]
  console.log(`  prospects ${prosp.length}: with club ${prosp.filter(p => p.club_id).length}, state set ${prosp.filter(p => p.state).length}, linked to HS ${prosp.filter(p => p.wrestler_id).length} | placements with club_listed ${pl.filter(p => p.club_listed).length}, club_id ${pl.filter(p => p.club_id).length}`)
}
const { count } = await db.from('wrestling_clubs').select('*', { count: 'exact', head: true }); console.log('\nclubs on file', count)
