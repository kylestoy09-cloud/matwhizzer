// Kyle 2026-11-19 ("cory ferguson didn't go to wisconsin-la crosse … a giant man won't shrink"): every matched college
// year checked against the wrestler's high school weight (collegeWeightFits in src/lib/ncaa/match.ts — his last high
// school season's weight) and timing (collegeTimingFits). Rerun after any college import.
//   light (well under his high school weight) or off-timing → not ours: every 'auto' year of that name at that college
//   cut (15–30 lbs under) or heavy (half again his high school weight or more) → back to review ('auto' only)
// Kyle's own decisions ('confirmed') are listed, never changed. Backs up every row it changes. Dry run unless --apply.
//   npx tsx scripts/college_weight_audit.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { matchPool, collegeWeightFits, collegeTimingFits } from '../src/lib/ncaa/match'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const stamp = { reviewed_at: new Date().toISOString(), reviewed_by: 'weight / timing audit' }
const backup: unknown[] = []
for (const g of ['M', 'F'] as const) {
  const T = g === 'M' ? 'boys' : 'girls'
  const pool = new Map((await matchPool(db as never, g)).map(w => [w.id, w]))
  const rows: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from(`${T}_college_entries`).select(`*, event:${T}_college_events(year, level)`).in('match_status', ['auto', 'confirmed']).not('wrestler_id', 'is', null).order('id').range(f, f + 999)
    if (error) throw error
    rows.push(...data!); if (data!.length < 1000) break
  }
  const notOurs = new Map<string, { wid: string; why: string }>(), review: any[] = [], kept: string[] = []
  for (const r of rows) {
    const w = pool.get(r.wrestler_id); if (!w) continue
    const wf = collegeWeightFits(w, r.weight), tf = collegeTimingFits(w, r.event.year)
    const line = `${r.event.level} ${r.event.year} ${r.weight} ${r.name} (${r.college_raw}) ← ${w.label}, HS ${w.hsMax ?? '?'}`
    if (wf === 'ok' && tf) continue
    if (r.match_status === 'confirmed') { kept.push(`${wf !== 'ok' ? wf : 'timing'}: ${line}`); continue }
    if (wf === 'light' || !tf) notOurs.set(`${r.name}|${r.college_id ?? r.college_raw}|${r.wrestler_id}`, { wid: r.wrestler_id, why: `${wf === 'light' ? `${r.weight} in college, ${w.hsMax} in his last high school season` : 'timing'}: ${line}` })
    else review.push({ r, line })
  }
  console.log(`\n${g}: ${rows.length} matched years`)
  console.log(`not ours (${notOurs.size} careers):\n  ` + [...notOurs.values()].map(x => x.why).join('\n  '))
  console.log(`to review (${review.length}):\n  ` + review.map(x => x.line).join('\n  '))
  if (kept.length) console.log(`confirmed by Kyle, left alone (${kept.length}):\n  ` + kept.join('\n  '))
  if (!APPLY) continue
  for (const [k, v] of notOurs) {
    const [name, col] = k.split('|')
    const q = db.from(`${T}_college_entries`).select('*').eq('name', name).eq('wrestler_id', v.wid).eq('match_status', 'auto')
    const { data } = await (/^\d+$/.test(col) ? q.eq('college_id', Number(col)) : q.eq('college_raw', col))
    backup.push(...(data ?? []))
    if (data?.length) await db.from(`${T}_college_entries`).update({ wrestler_id: null, match_status: 'not_ours', ...stamp }).in('id', data.map(d => d.id))
  }
  for (const { r } of review) {
    backup.push(r)
    await db.from(`${T}_college_entries`).update({ wrestler_id: null, match_status: 'review', match_note: JSON.stringify({ note: `${r.weight} in college, ${pool.get(r.wrestler_id)!.hsMax} in his last high school season — check`, candidates: [{ wrestler_id: r.wrestler_id, name: pool.get(r.wrestler_id)!.name, schools: pool.get(r.wrestler_id)!.schools, hs: '', gap: '', why: 'weight' }] }) }).eq('id', r.id)
  }
}
if (APPLY && backup.length) writeFileSync(`docs/migrations/backups/${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_college_weight_audit.json`, JSON.stringify(backup, null, 1))
console.log(APPLY ? `\napplied: ${backup.length} rows changed (backed up)` : '\ndry run')
