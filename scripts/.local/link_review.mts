// Review every offseason result linked to one of our HS wrestlers: weight vs their 2025-26 weight, and division.
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '../../src/lib/hammerScore'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string, f: (q: any) => any = q => q) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const out: any[] = []
for (const [g, gender, list] of [['boys', 'M', WEIGHT_ORDER_BOYS], ['girls', 'F', WEIGHT_ORDER_GIRLS]] as const) {
  const ps = (await all(`${g}_prospects`, 'id, first_name, last_name, wrestler_id')).filter(p => p.wrestler_id)
  const pl = await all(`${g}_hub_placements`, 'id, event_id, division, weight, place, place_to, prospect_id, name_listed, club_listed')
  const evs = new Map((await all(`${g}_hub_events`, 'id, season, start_date, tournament_id')).map(e => [e.id, e]))
  const ts = new Map((await all(`${g}_hub_tournaments`, 'id, name')).map(t => [t.id, t.name]))
  const wIds = ps.map(p => p.wrestler_id)
  const w = new Map<string, any>(), r = new Map<string, any>()
  for (let i = 0; i < wIds.length; i += 300) {
    const { data } = await db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', wIds.slice(i, i + 300)); for (const x of data ?? []) w.set(x.id, x)
    const { data: rr } = await db.from('wrestler_hammer_scores').select('wrestler_id, weight_class').eq('season', '2025-26').in('wrestler_id', wIds.slice(i, i + 300)); for (const x of rr ?? []) r.set(x.wrestler_id, x.weight_class)
  }
  const idx = (n: number) => { const c = [...list].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || b - a)[0]; return list.indexOf(c as never) }
  for (const p of ps) {
    const W = w.get(p.wrestler_id), last = r.get(p.wrestler_id)
    for (const x of pl.filter(x => x.prospect_id === p.id)) {
      const n = Number.parseInt(x.weight), e = evs.get(x.event_id)
      const diff = n && last ? idx(n) - list.indexOf(Number(last) as never) : null
      out.push({ g, prospect_id: p.id, placement_id: x.id, wrestler: `${W?.first_name} ${W?.last_name}`, wrestler_id: p.wrestler_id, class: W?.graduation_year, last_weight: last ?? null, event: `${ts.get(e.tournament_id)} ${e.season}`, date: e.start_date, division: x.division, weight: x.weight, place: x.place, listed: x.name_listed, club: x.club_listed, diff })
    }
  }
}
writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/links.json', JSON.stringify(out))
const big = out.filter(o => o.diff != null && o.diff <= -2)
console.log('linked results', out.length, '| weight 2+ classes BELOW last season:', big.length, '| 3+ above:', out.filter(o => o.diff >= 3).length, '| youth divisions:', out.filter(o => /\b(14 ?U|11 ?U|12U|10U|8U)\b/i.test(o.division ?? '')).length)
for (const o of big) console.log(`  ${o.g} ${o.wrestler} (${o.class}, ${o.last_weight}) ← ${o.event} ${o.division} ${o.weight} ${o.place} [${o.club}] diff ${o.diff}`)
