// Replaces the 2026-09-14 rule (docs/migrations/20260914_deactivate_season1_orphans.sql), per Kyle
// 2026-11-05: a boys wrestler with a 2024-25 district entry is inactive ONLY if there is zero
// 2025-26 information for him: no 2025-26 dual bout, in-season tournament bout or postseason entry,
// and no 2025-26 Track roster row (linked to him, or his exact name at a school he is linked to).
// One record is enough to keep him active. A Track row whose grade is below his profile's is a
// younger boy with the same name, not evidence for him. Where a single unmatched exact-name Track
// row is his evidence, it is matched and its grade written (as Roster Grade Import does).
//   npx tsx --tsconfig tsconfig.json scripts/fix_boys_active_rule_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const RANK: Record<string, number> = { Fr: 1, So: 2, Jr: 3, Sr: 4 }
const tours = await all((f, t) => db.from('tournaments').select('id, season_id, tournament_type').eq('gender', 'M').order('id').range(f, t))
const d25 = new Set(tours.filter((t: any) => t.season_id === 2025 && t.tournament_type === 'districts').map((t: any) => t.id))
const post26 = new Set(tours.filter((t: any) => t.season_id === 2026).map((t: any) => t.id))
const ws = new Map((await all((f, t) => db.from('wrestlers').select('*').eq('gender', 'M').order('id').range(f, t))).map((w: any) => [w.id, w]))
const target = new Set<string>(), ev = new Map<string, Set<string>>(), schoolsOf = new Map<string, Set<number>>()
const evid = (w: string | null, what: string) => { if (w) (ev.get(w) ?? ev.set(w, new Set()).get(w)!).add(what) }
const sch = (w: string | null, s: number | null) => { if (w && s) (schoolsOf.get(w) ?? schoolsOf.set(w, new Set()).get(w)!).add(s) }
for (const e of await all((f, t) => db.from('tournament_entries').select('wrestler_id, tournament_id, school_id').order('id').range(f, t))) { if (!ws.has(e.wrestler_id)) continue; sch(e.wrestler_id, e.school_id); if (d25.has(e.tournament_id)) target.add(e.wrestler_id); if (post26.has(e.tournament_id)) evid(e.wrestler_id, 'postseason') }
const meets = new Set((await all((f, t) => db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').order('id').range(f, t))).map((m: any) => m.id))
for (const b of await all((f, t) => db.from('dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id').order('id').range(f, t))) if (meets.has(b.dual_meet_id)) { evid(b.wrestler_a_id, 'dual'); evid(b.wrestler_b_id, 'dual') }
const ist = new Set(chk(await db.from('in_season_tournaments').select('id').eq('season', '2025-26'), 'ist').map((x: any) => x.id))
for (const b of await all((f, t) => db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id').order('id').range(f, t))) if (ist.has(b.in_season_tournament_id)) { evid(b.wrestler1_id, 'tournament'); evid(b.wrestler2_id, 'tournament') }
for (const a of await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id').order('id').range(f, t))) sch(a.wrestler_id, a.school_id)
const ro = await all((f, t) => db.from('roster_grade_import').select('id, school_id, first_name_raw, last_name_raw, grade, wrestler_id').eq('gender', 'M').eq('season_id', 2026).order('id').range(f, t))
const linkedRow = new Set(ro.filter((r: any) => r.wrestler_id).map((r: any) => r.wrestler_id))
const openBy = new Map<string, any[]>(); for (const r of ro) if (!r.wrestler_id) { const k = `${r.school_id}|${key(r.first_name_raw + r.last_name_raw)}`; (openBy.get(k) ?? openBy.set(k, []).get(k)!).push(r) }

const activate: any[] = [], deactivate: any[] = [], trackLinks: any[] = [], heldYounger: string[] = []
let keep = 0
for (const id of target) {
  const w = ws.get(id); if (!w || w.first_name === 'Unknown') continue
  const e = new Set(ev.get(id) ?? [])
  if (linkedRow.has(id)) e.add('Track row')
  let track: any = null
  if (!e.size || !linkedRow.has(id)) {
    const open = [...(schoolsOf.get(id) ?? [])].flatMap(s => openBy.get(`${s}|${key(w.first_name + w.last_name)}`) ?? [])
    if (open.length === 1) {
      if (w.grade && RANK[open[0].grade] < RANK[w.grade]) heldYounger.push(`${w.first_name} ${w.last_name} (${w.grade}): Track row ${open[0].grade}`)
      else { e.add('Track row (name)'); track = open[0] }
    }
  }
  const want = e.size > 0
  if (want && !w.is_active) activate.push({ w, why: [...e] })
  else if (!want && w.is_active) deactivate.push({ w })
  else keep++
  if (want && track) trackLinks.push({ w, track })
}
const tally = (xs: any[]) => JSON.stringify(Object.entries(xs.reduce((m: any, x: any) => { const k = x.why ? x.why.sort().join('+') : (x.w.grade ?? 'no grade'); m[k] = (m[k] ?? 0) + 1; return m }, {})))
console.log(`boys with a 2024-25 district entry: ${target.size}`)
console.log(`activate ${activate.length} (evidence: ${tally(activate)})`)
console.log(`deactivate ${deactivate.length} — active now, zero 2025-26 information (by grade: ${tally(deactivate)})`)
console.log(`already right ${keep} | Track grades to write ${trackLinks.length} | Track rows ignored as a younger boy: ${heldYounger.length}`)
for (const h of heldYounger) console.log('   ', h)
const names = new Map(chk(await db.from('schools').select('id, display_name'), 's').map((x: any) => [x.id, x.display_name]))
const where = (id: string) => [...(schoolsOf.get(id) ?? [])].map(x => names.get(x)).join('/')
for (const a of activate.filter(a => !a.why.includes('postseason'))) console.log('   activate:', a.w.id.slice(0, 8), a.w.first_name, a.w.last_name, a.w.grade ?? '-', '@', where(a.w.id), a.why.join('+'))
for (const a of activate.filter(a => a.why.includes('postseason'))) console.log('   activate (postseason):', a.w.first_name, a.w.last_name, a.w.grade ?? '-', '@', where(a.w.id))
for (const d of deactivate) console.log('   deactivate:', d.w.first_name, d.w.last_name, d.w.grade ?? '-', '@', where(d.w.id), '| created', d.w.created_at.slice(0, 10))
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_boys_active_rule_before.json', JSON.stringify({ activate: activate.map(a => a.w), deactivate: deactivate.map(d => d.w), trackLinks: trackLinks.map(t => ({ wrestler: t.w, row: t.track })), heldYounger }, null, 1))
const now = new Date().toISOString()
for (let i = 0; i < activate.length; i += 200) chk(await db.from('wrestlers').update({ is_active: true }).in('id', activate.slice(i, i + 200).map(a => a.w.id)).select('id'), 'on')
for (let i = 0; i < deactivate.length; i += 200) chk(await db.from('wrestlers').update({ is_active: false }).in('id', deactivate.slice(i, i + 200).map(d => d.w.id)).select('id'), 'off')
for (const t of trackLinks) {
  chk(await db.from('roster_grade_import').update({ wrestler_id: t.w.id, status: 'confirmed', confirmed_at: now, confirmed_by: 'kyle.stoy09@gmail.com' }).eq('id', t.track.id).is('wrestler_id', null).select('id'), 'ro')
  chk(await db.from('wrestlers').update({ grade: t.track.grade, grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).eq('id', t.w.id).select('id'), 'grade')
}
console.log('APPLIED')
