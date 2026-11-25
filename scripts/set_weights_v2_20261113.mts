// 2026-27 projected weights, Kyle's rule (2026-11-13): the NJSIAA weight wrestled most at our tournaments after 9/1,
// a tie going to the most recent; tournament weights count as the closest NJSIAA weight. Linked NJ wrestlers on the
// boys and girls Offseason lists. Written only when sure ("hold off on changing weight for anyone you are unsure
// of"): a move of 2 classes or less from their 2025-26 weight, or a bigger one that two or more 2026 offseason
// events back up (within a class). Writes wrestlers.projected_weight_class and their 2026-27 rating row's weight.
// Backup of every value before: docs/migrations/backups/20261113_projected_weights_v2.json. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { WEIGHT_ORDER_BOYS, WEIGHT_ORDER_GIRLS } from '../src/lib/hammerScore'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await db.from(t).select(sel).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const rows: any[] = []
for (const [g, gender, list] of [['boys', 'M', WEIGHT_ORDER_BOYS], ['girls', 'F', WEIGHT_ORDER_GIRLS]] as const) {
  const closest = (n: number) => [...list].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || b - a)[0]
  const ix = (n: number) => list.indexOf(n as never)
  const evs = new Map((await all(`${g}_hub_events`, 'id, season, start_date')).map(e => [e.id, e]))
  const pl = await all(`${g}_hub_placements`, 'event_id, weight, prospect_id')
  const link = new Map((await all(`${g}_prospects`, 'id, wrestler_id')).filter(p => p.wrestler_id).map(p => [p.id, p.wrestler_id]))
  const by = new Map<string, { date: string; w: number }[]>()
  for (const p of pl) {
    const wId = link.get(p.prospect_id), e = evs.get(p.event_id), n = Number.parseInt(p.weight)
    if (!wId || !e || e.season !== 2026 || !n) continue
    by.set(wId, [...(by.get(wId) ?? []), { date: e.start_date ?? '2026-01-01', w: closest(n) }])
  }
  const ids = [...by.keys()]
  const info = new Map<string, any>(), last = new Map<string, any>(), cur = new Map<string, any>()
  for (let i = 0; i < ids.length; i += 300) {
    const part = ids.slice(i, i + 300)
    const { data } = await db.from('wrestlers').select('id, first_name, last_name, gender, is_oos, projected_weight_class').in('id', part); for (const x of data ?? []) info.set(x.id, x)
    const { data: a } = await db.from('wrestler_hammer_scores').select('wrestler_id, weight_class').eq('season', '2025-26').in('wrestler_id', part); for (const x of a ?? []) last.set(x.wrestler_id, Number(x.weight_class))
    const { data: b } = await db.from('wrestler_hammer_scores').select('wrestler_id, weight_class').eq('season', '2026-27').in('wrestler_id', part); for (const x of b ?? []) cur.set(x.wrestler_id, x.weight_class)
  }
  for (const [wId, res] of by) {
    const x = info.get(wId); if (!x || x.is_oos || x.gender !== gender) continue
    const fall = res.filter(r => r.date >= '2026-09-01')
    if (!fall.length) continue
    const n = new Map<number, { c: number; d: string }>()
    for (const r of fall) { const v = n.get(r.w) ?? { c: 0, d: '' }; n.set(r.w, { c: v.c + 1, d: r.date > v.d ? r.date : v.d }) }
    const pick = [...n].sort((a, b) => b[1].c - a[1].c || b[1].d.localeCompare(a[1].d))[0][0]
    const prev = last.get(wId), move = prev && ix(prev) >= 0 ? ix(pick) - ix(prev) : null
    const backing = res.filter(r => Math.abs(ix(r.w) - ix(pick)) <= 1).length   // 2026 offseason events within a class of it
    const sure = move != null ? Math.abs(move) <= 2 || backing >= 2 : backing >= 2   // no 2025-26 weight: two events must agree
    rows.push({ g, wrestler_id: wId, name: `${x.first_name} ${x.last_name}`, last_2025_26: prev ?? null, pick, move, backing, sure, projected_before: x.projected_weight_class, rating_2026_27_before: cur.get(wId) ?? null, has_row: cur.has(wId), fall: fall.map(r => r.w).join('/') })
  }
}
writeFileSync('docs/migrations/backups/20261113_projected_weights_v2.json', JSON.stringify(rows, null, 1))
const sure = rows.filter(r => r.sure), held = rows.filter(r => !r.sure)
console.log(`wrestlers with fall results ${rows.length}: sure ${sure.length} (changes their 2026-27 weight: ${sure.filter(r => String(r.rating_2026_27_before) !== String(r.pick)).length}), held ${held.length}`)
for (const r of held) console.log(`  HELD ${r.g} ${r.name}: 2025-26 ${r.last_2025_26 ?? '?'} → ${r.pick} (fall ${r.fall}; ${r.backing} 2026 events back it)`)
for (const r of sure.filter(r => r.move != null && Math.abs(r.move) >= 3)) console.log(`  BIG BUT BACKED ${r.name}: ${r.last_2025_26} → ${r.pick} (${r.backing} events)`)
if (process.argv[2] === 'go') {
  for (const r of sure) {
    const { error } = await db.from('wrestlers').update({ projected_weight_class: r.pick }).eq('id', r.wrestler_id); if (error) throw error
    if (r.has_row) { const { error: e2 } = await db.from('wrestler_hammer_scores').update({ weight_class: String(r.pick) }).eq('season', '2026-27').eq('wrestler_id', r.wrestler_id); if (e2) throw e2 }
  }
  console.log('written', sure.length)
}
