// Kyle 2026-11-13: "update people's weight for 2026-27 to their weight in any tournament post 9/1" — the most recent
// such tournament, at the closest NJ weight (a tie goes up). Linked NJ wrestlers on the boys and girls Offseason
// lists. Writes wrestlers.projected_weight_class (the recalculation now prefers it to last season's weight) and the
// weight on their current preseason rating row. Usage: set_weights_20261113.mts [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '../../src/lib/hammerScore'
import { ratingSeasons } from '../../src/lib/hubSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SEASON = ratingSeasons()[0], FROM = '2026-09-01'
const closest = (w: number, list: readonly number[]) => [...list].sort((a, z) => Math.abs(a - w) - Math.abs(z - w) || z - a)[0]
const changes: any[] = []
for (const [g, gender, list] of [['boys', 'M', WEIGHT_ORDER_BOYS], ['girls', 'F', WEIGHT_ORDER_GIRLS]] as const) {
  const { data: evs } = await db.from(`${g}_hub_events`).select('id, start_date, tournament_id').gte('start_date', FROM)
  const { data: ts } = await db.from(`${g}_hub_tournaments`).select('id, name')
  const evMap = new Map((evs ?? []).map(e => [e.id, e]))
  const pl: any[] = []
  for (let a = 0; ; a += 1000) { const { data, error } = await db.from(`${g}_hub_placements`).select('event_id, weight, prospect_id').in('event_id', [...evMap.keys()]).order('id').range(a, a + 999); if (error) throw error; pl.push(...data); if (data.length < 1000) break }
  const pIds = [...new Set(pl.map(p => p.prospect_id))]
  const link = new Map<number, string>()
  for (let i = 0; i < pIds.length; i += 300) { const { data } = await db.from(`${g}_prospects`).select('id, wrestler_id').in('id', pIds.slice(i, i + 300)).not('wrestler_id', 'is', null); for (const p of data ?? []) link.set(p.id, p.wrestler_id) }
  // newest result per wrestler
  const best = new Map<string, { date: string; weight: number; from: string }>()
  for (const p of pl) {
    const w = link.get(p.prospect_id); if (!w) continue
    const e = evMap.get(p.event_id)!, n = Number.parseInt(p.weight)
    if (!n) continue
    const cur = best.get(w)
    if (!cur || e.start_date > cur.date) best.set(w, { date: e.start_date, weight: n, from: `${ts!.find(t => t.id === e.tournament_id)?.name} ${p.weight}` })
  }
  const ids = [...best.keys()]
  const info = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 300) { const { data } = await db.from('wrestlers').select('id, first_name, last_name, gender, is_oos, projected_weight_class').in('id', ids.slice(i, i + 300)); for (const w of data ?? []) info.set(w.id, w) }
  const rows = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 300) { const { data } = await db.from('wrestler_hammer_scores').select('wrestler_id, weight_class, match_count').eq('season', SEASON).in('wrestler_id', ids.slice(i, i + 300)); for (const r of data ?? []) rows.set(r.wrestler_id, r) }
  for (const [w, b] of best) {
    const x = info.get(w); if (!x || x.is_oos || x.gender !== gender) continue
    const nj = closest(b.weight, list)
    changes.push({ g, wrestler_id: w, name: `${x.first_name} ${x.last_name}`, from: b.from, date: b.date, weight: nj, projected_before: x.projected_weight_class, rating_weight_before: rows.get(w)?.weight_class ?? null, has_rating_row: rows.has(w) })
  }
}
// Held for Kyle (2026-11-13): a move of more than two weight classes, or no weight to compare: likely two kids with
// one name (Max Garcia 190 → a 14U 90), or a big move to confirm
const idx = (g: string, w: unknown) => (g === 'boys' ? WEIGHT_ORDER_BOYS : WEIGHT_ORDER_GIRLS).indexOf(Number(w) as never)
const held = changes.filter(c => idx(c.g, c.rating_weight_before) < 0 || Math.abs(idx(c.g, c.rating_weight_before) - idx(c.g, c.weight)) > 2)
changes.splice(0, changes.length, ...changes.filter(c => !held.includes(c)))
console.log(`held for Kyle: ${held.length}`)
const moved = changes.filter(c => String(c.rating_weight_before) !== String(c.weight))
console.log(`wrestlers: ${changes.length} (boys ${changes.filter(c => c.g === 'boys').length}, girls ${changes.filter(c => c.g === 'girls').length}) | weight differs from their ${SEASON} rating row: ${moved.length} | no rating row: ${changes.filter(c => !c.has_rating_row).length}`)
for (const c of moved.slice(0, 15)) console.log(`  ${c.name}: ${c.rating_weight_before ?? '—'} → ${c.weight} (${c.from}, ${c.date})`)
writeFileSync('docs/migrations/backups/20261113_projected_weights_before.json', JSON.stringify({ written: changes, held }, null, 1))
if (process.argv[2] === 'go') {
  for (const c of changes) {
    const { error } = await db.from('wrestlers').update({ projected_weight_class: c.weight }).eq('id', c.wrestler_id); if (error) throw error
    if (c.has_rating_row) { const { error: e2 } = await db.from('wrestler_hammer_scores').update({ weight_class: String(c.weight) }).eq('season', SEASON).eq('wrestler_id', c.wrestler_id); if (e2) throw e2 }
  }
  console.log('written')
}
