import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await db.from(t).select(sel).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
for (const g of ['boys', 'girls', 'mixed']) {
  const ps = await all(`${g}_prospects`, 'id, wrestler_id, state, club_listed')
  const w = new Map<string, number>(); for (const p of ps) if (p.wrestler_id) w.set(p.wrestler_id, (w.get(p.wrestler_id) ?? 0) + 1)
  const pl = await all(`${g}_hub_placements`, 'id, event_id')
  const ev = await all(`${g}_hub_events`, 'id, tournament_id, season, uploaded_at, upload_files')
  const ts = new Map((await all(`${g}_hub_tournaments`, 'id, name')).map(t => [t.id, t.name]))
  console.log(`${g}: prospects ${ps.length} (linked ${ps.filter(p => p.wrestler_id).length}, NJ ${ps.filter(p => p.state === 'NJ').length}, with a club ${ps.filter(p => p.club_listed).length}) | a wrestler on two prospects: ${[...w.values()].filter(n => n > 1).length} | places ${pl.length}`)
  for (const e of ev) console.log(`   ${ts.get(e.tournament_id)} ${e.season}: ${pl.filter(p => p.event_id === e.id).length} places, uploaded ${e.uploaded_at ? 'yes' : 'NO'}`)
}
