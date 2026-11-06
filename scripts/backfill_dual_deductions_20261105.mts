// 2025-26 dual team point adjustments (deductions, criteria points, corrections) from the source files (Whizzer Upload/2025-26 Boys Data,
// 2025-26 Girls Data: every .rtf / .rtfd results file Kyle imported duals from). The dual parser skipped
// them until 2026-11-05 (docs/migrations/20261105_dual_meet_deductions.sql). Each deduction is
// matched to its stored dual (date + the two raw team names, either order) and kept when the stored
// bouts plus the deductions equal the stored final score, or are tied and the winner has the +1
// criteria point, or the dual has no stored bouts.
//   npx tsx --tsconfig tsconfig.json scripts/backfill_dual_deductions_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { parseDualMeetText } from '@/lib/parseDualMeet'
import { parseDualMeetGirlsText } from '@/lib/parseDualMeetGirls'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, c: string) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await db.from(t).select(c).order('id').range(i, i + 999), t); o.push(...d); if (d.length < 1000) break } return o }
const ROOT = '../Whizzer Upload'
// every results file with duals: dual results, gap / extra matches, team playoffs, "other"
const files = (dir: string) => fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.rtfd?$/.test(f) && !/tournament|power|ranking|roster|hammer|standings/i.test(f))
  .map(f => path.join(ROOT, dir, f, f.endsWith('.rtfd') ? 'TXT.rtf' : '')).filter(f => fs.existsSync(f))
const text = (f: string) => execFileSync('textutil', ['-convert', 'txt', '-stdout', f], { maxBuffer: 1 << 28 }).toString()
const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const iso = (d: string) => { const [m, dd, y] = d.split('/'); return `${y}-${m}-${dd}` }

for (const [g, dir, meetT, boutT, dedT] of [['M', '2025-26 Boys Data', 'dual_meets', 'dual_meet_matches', 'dual_meet_deductions'], ['F', '2025-26 Girls Data', 'dual_meets_girls', 'dual_meet_matches_girls', 'dual_meet_deductions_girls']] as const) {
  const parsed = files(dir).flatMap(f => (g === 'M' ? parseDualMeetText(text(f)) : parseDualMeetGirlsText(text(f))).map(m => ({ ...m, file: path.basename(path.dirname(f)) + '/' + path.basename(f) })))
  const withDed = parsed.filter(m => m.deductions.length && !m.isDuplicate)
  const meets = (await all(meetT, 'id, season_id, meet_date, team1_school_name_raw, team2_school_name_raw, team1_score, team2_score, status')).filter(m => m.season_id === 2026)
  const sums = new Map<string, [number, number]>()
  for (const b of await all(boutT, 'id, dual_meet_id, team1_points, team2_points')) { const s = sums.get(b.dual_meet_id) ?? [0, 0]; s[0] += b.team1_points ?? 0; s[1] += b.team2_points ?? 0; sums.set(b.dual_meet_id, s) }
  const rows: any[] = [], skipped: string[] = [], noBoutDuals: string[] = []
  const done = new Set<string>()
  for (const p of withDed) {
    const d = iso(p.date)
    const hit = meets.filter(m => m.meet_date === d && ((n(m.team1_school_name_raw ?? '') === n(p.team1Name) && n(m.team2_school_name_raw ?? '') === n(p.team2Name)) || (n(m.team1_school_name_raw ?? '') === n(p.team2Name) && n(m.team2_school_name_raw ?? '') === n(p.team1Name))))
    const label = `${p.date} ${p.team1Name} v ${p.team2Name} (${p.deductions.map(x => `${x.label} ${x.team1Points}/${x.team2Points}`).join('; ')})`
    if (hit.length !== 1) { skipped.push(`${label}: ${hit.length} stored duals`); continue }
    const m = hit[0]; if (done.has(m.id)) { skipped.push(`${label}: listed twice`); continue }
    const swap = n(m.team1_school_name_raw ?? '') !== n(p.team1Name)
    const ded = p.deductions.map(x => ({ label: x.label, team1_points: swap ? x.team2Points : x.team1Points, team2_points: swap ? x.team1Points : x.team2Points }))
    const [b1, b2] = sums.get(m.id) ?? [0, 0], d1 = ded.reduce((a, x) => a + x.team1_points, 0), d2 = ded.reduce((a, x) => a + x.team2_points, 0)
    const t1 = b1 + d1, t2 = b2 + d2
    const exact = t1 === m.team1_score && t2 === m.team2_score
    const tiebreak = t1 === t2 && ((m.team1_score === t1 + 1 && m.team2_score === t2) || (m.team2_score === t2 + 1 && m.team1_score === t1))
    const noBouts = !sums.has(m.id)   // the dual's bouts were never stored; the deduction still belongs to it
    if (noBouts) noBoutDuals.push(label)
    if (!exact && !tiebreak && !noBouts) { skipped.push(`${label}: stored ${m.team1_score}-${m.team2_score}, bouts ${b1}-${b2} + deductions = ${b1 + d1}-${b2 + d2}`); continue }
    done.add(m.id); for (const x of ded) rows.push({ dual_meet_id: m.id, ...x })
  }
  console.log(`${g}: source duals ${parsed.length}, with deductions ${withDed.length}; matched and adding up: ${done.size} duals, ${rows.length} deductions; not used: ${skipped.length}`)
  for (const s of skipped) console.log('   not used:', s)
  for (const s of noBoutDuals) console.log('   added, but the dual has no stored bouts:', s)
  if (!APPLY) continue
  // re-runnable: a dual that already has deductions is left as is
  const have = new Set((await all(dedT, 'id, dual_meet_id')).map(d => d.dual_meet_id))
  const add = rows.filter(r => !have.has(r.dual_meet_id))
  console.log(`   already stored for ${rows.length - add.length} of these rows' duals; adding ${add.length}`)
  rows.length = 0; rows.push(...add)
  for (let i = 0; i < rows.length; i += 200) chk(await db.from(dedT).insert(rows.slice(i, i + 200)).select('id'), dedT)
  console.log(`   APPLIED: ${rows.length} rows in ${dedT}`)
}
if (!APPLY) console.log('DRY RUN')
