import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: s } = await db.from('tournament_bracket_slots').select('in_season_tournament_id, weight_class, top_school_id, bottom_school_id, top_name_raw, bottom_name_raw')
const by = new Map<string, { w: Set<number>; n: number; noSch: number }>()
for (const r of s!) { const x = by.get(r.in_season_tournament_id) ?? { w: new Set(), n: 0, noSch: 0 }; x.w.add(r.weight_class); for (const p of ['top', 'bottom']) if (r[`${p}_name_raw`]) { x.n++; if (r[`${p}_school_id`] == null) x.noSch++ } by.set(r.in_season_tournament_id, x) }
for (const [id, x] of by) {
  const { data: b } = await db.from('in_season_tournaments').select('name, tournament_type').eq('id', id).maybeSingle()
  const { data: g } = await db.from('in_season_tournaments_girls').select('name, tournament_type').eq('id', id).maybeSingle()
  console.log(b ? 'boys ' : g ? 'girls' : '??   ', (b ?? g)?.name, '| weights', x.w.size, '| names', x.n, 'no school id', x.noSch, '| /tournaments/' + id + '/bracket')
}
const { data: conf } = await db.from('in_season_tournaments_girls').select('id, name').ilike('name', '%conference%'); console.log('girls conference tournaments:', conf)
