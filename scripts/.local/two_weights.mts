import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await db.from(t).select(sel).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
for (const g of ['boys', 'girls', 'mixed']) {
  const pl = await all(`${g}_hub_placements`, 'id, event_id, style, division, weight, place, prospect_id, name_listed, club_listed')
  const ts = new Map((await all(`${g}_hub_tournaments`, 'id, name')).map(t => [t.id, t.name])), ev = new Map((await all(`${g}_hub_events`, 'id, tournament_id, season')).map(e => [e.id, e]))
  const grp = new Map<string, any[]>()
  for (const p of pl) { const k = `${p.prospect_id}|${p.event_id}|${p.style}`; grp.set(k, [...(grp.get(k) ?? []), p]) }
  const multi = [...grp.values()].filter(xs => new Set(xs.map(x => Number.parseInt(x.weight))).size > 1)
  // same club both times = probably one kid in two divisions (Main + Over); different clubs = two kids
  const twoKids = multi.filter(xs => new Set(xs.map(x => (x.club_listed ?? '').toLowerCase())).size > 1)
  console.log(`${g}: prospects with 2+ weights in one event ${multi.length}; with different clubs ${twoKids.length}`)
  for (const xs of twoKids.slice(0, 40)) console.log('   ', `${ts.get(ev.get(xs[0].event_id).tournament_id)} ${ev.get(xs[0].event_id).season}:`, xs.map(x => `${x.name_listed} ${x.division} ${x.weight} #${x.place} [${x.club_listed ?? ''}]`).join(' | '))
}
