// Link in-season tournament placements that have a name but no wrestler (or no school) to the
// wrestler who placed, so tournament pages never fall back to imported text. 2026-11-02.
//   npx tsx --tsconfig tsconfig.json scripts/resolve_unlinked_placements.mts            (dry run)
//   npx tsx --tsconfig tsconfig.json scripts/resolve_unlinked_placements.mts --apply
// A placement links only when exactly one wrestler in that tournament's bouts, at that weight,
// carries that name (bout text or profile name). The school comes from his bouts there.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string, f?: (q: any) => any, key = 'id') {
  const out: any[] = []; let last: any = null
  for (;;) { let q = db.from(t).select(cols).order(key).limit(1000); if (f) q = f(q); if (last != null) q = q.gt(key, last); const d = chk(await q, t); out.push(...d); if (d.length < 1000) break; last = d[d.length - 1][key] }
  return out
}
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[`'’.]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()

const pl = (await all('tournament_placements', '*')).filter(p => !p.wrestler_id || p.school_id == null)
const tids = [...new Set(pl.map(p => p.in_season_tournament_id))]
const W = new Map((await all('wrestlers', 'id, first_name, last_name')).map(w => [w.id, w]))
const sides = new Map<string, { wid: string; sid: number | null; names: Set<string> }[]>()  // tid|weight → sides
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) {
  for (let i = 0; i < tids.length; i += 50) {
    const rows = await all(t, 'id, in_season_tournament_id, weight_class, wrestler1_id, wrestler1_name_raw, wrestler1_school_id, wrestler2_id, wrestler2_name_raw, wrestler2_school_id', q => q.in('in_season_tournament_id', tids.slice(i, i + 50)))
    for (const r of rows) for (const n of [1, 2]) {
      const wid = r[`wrestler${n}_id`]; if (!wid) continue
      const k = `${r.in_season_tournament_id}|${r.weight_class}`
      const list = sides.get(k) ?? []; sides.set(k, list)
      let s = list.find(x => x.wid === wid)
      if (!s) { s = { wid, sid: r[`wrestler${n}_school_id`], names: new Set() }; list.push(s) }
      if (s.sid == null) s.sid = r[`wrestler${n}_school_id`]
      s.names.add(norm(r[`wrestler${n}_name_raw`])); const w = W.get(wid); if (w) s.names.add(norm(`${w.first_name} ${w.last_name}`))
    }
  }
}
let link = 0, school = 0; const skipped: string[] = [], plan: { id: string; upd: Record<string, any> }[] = []
for (const p of pl) {
  const cands = (sides.get(`${p.in_season_tournament_id}|${p.weight_class}`) ?? []).filter(s => s.names.has(norm(p.wrestler_name_raw)))
  const upd: Record<string, any> = {}
  if (!p.wrestler_id) {
    if (cands.length !== 1) { skipped.push(`${p.wrestler_name_raw} (${p.school_name_raw}) ${p.weight_class} place ${p.place}: ${cands.length} matches`); continue }
    upd.wrestler_id = cands[0].wid; link++
  }
  const sid = (p.wrestler_id ? (sides.get(`${p.in_season_tournament_id}|${p.weight_class}`) ?? []).find(s => s.wid === p.wrestler_id)?.sid : cands[0]?.sid) ?? null
  if (p.school_id == null && sid != null) { upd.school_id = sid; school++ }
  if (Object.keys(upd).length) plan.push({ id: p.id, upd })
}
console.log(`${pl.length} placements missing a wrestler or school; ${link} wrestlers and ${school} schools can be linked; ${skipped.length} left`)
const sk = new Map<string, number>(); skipped.forEach(s => sk.set(s.replace(/ \d+ place \d+/, ''), (sk.get(s.replace(/ \d+ place \d+/, '')) ?? 0) + 1))
console.log(skipped.slice(0, 40).join('\n'))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261102_placements_before.json', JSON.stringify(pl, null, 1))
for (const x of plan) chk(await db.from('tournament_placements').update(x.upd).eq('id', x.id).select('id'), 'update')
console.log(`APPLIED ${plan.length} placements`)
