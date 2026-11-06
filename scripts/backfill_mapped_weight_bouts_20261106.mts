// 2025-26 dual bouts listed at weights that aren't ours (Lodi/Saddle Brook's 145...220, Pennsylvania's
// 107...189, Don Bosco's national-duals 103/110/118, girls' 121/128/135...). The dual parsers dropped
// them until 2026-11-06; they now map each to the NJ weight (mapToNjWeights, Kyle: map to the NJ
// weight). This adds the bouts each stored dual is missing, from the source files, with the wrestler
// taken from his name link at that school; a wrestler with no link gets a profile and link, as an
// import would (out-of-state when the school is).
//   npx tsx --tsconfig tsconfig.json scripts/backfill_mapped_weight_bouts_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { parseDualMeetText } from '@/lib/parseDualMeet'
import { parseDualMeetGirlsText } from '@/lib/parseDualMeetGirls'
import { saveNameLinks } from '@/lib/nameLinks'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const ROOT = '../Whizzer Upload'
const files = (dir: string) => fs.readdirSync(path.join(ROOT, dir)).filter(f => /\.rtfd?$/.test(f) && !/tournament|power|ranking|roster|hammer|standings/i.test(f)).map(f => path.join(ROOT, dir, f, f.endsWith('.rtfd') ? 'TXT.rtf' : '')).filter(f => fs.existsSync(f))
const text = (f: string) => execFileSync('textutil', ['-convert', 'txt', '-stdout', f], { maxBuffer: 1 << 28 }).toString()
const n = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const iso = (d: string) => { const [m, dd, y] = d.split('/'); return `${y}-${m}-${dd}` }
const secs = (d: string | null) => { const t = (d ?? '').match(/(\d+):(\d\d)/); return t ? Number(t[1]) * 60 + Number(t[2]) : null }
const plan: any[] = [], dedPlan: any[] = [], newProfiles = new Map<string, any>(), report: string[] = []
for (const [g, dir, sfx] of [['M', '2025-26 Boys Data', ''], ['F', '2025-26 Girls Data', '_girls']] as const) {
  const seen = new Set<string>()
  for (const f of files(dir)) for (const m of (g === 'M' ? parseDualMeetText(text(f)) : parseDualMeetGirlsText(text(f))) as any[]) {
    if (!m.matches.some((x: any) => x.listedWeight)) continue
    const stored = chk(await db.from('dual_meets' + sfx).select('id, team1_school_id, team2_school_id, team1_school_name_raw, team2_school_name_raw, team1_score, team2_score').eq('meet_date', iso(m.date)), 'm')
      .filter(s => (n(s.team1_school_name_raw) === n(m.team1Name) && n(s.team2_school_name_raw) === n(m.team2Name)) || (n(s.team1_school_name_raw) === n(m.team2Name) && n(s.team2_school_name_raw) === n(m.team1Name)))
    if (stored.length !== 1) { report.push(`${g} ${m.date} ${m.team1Name} v ${m.team2Name}: ${stored.length} stored duals`); continue }
    const s = stored[0]; if (seen.has(s.id)) continue; seen.add(s.id)
    const swap = n(s.team1_school_name_raw) !== n(m.team1Name)
    const have = chk(await db.from('dual_meet_matches' + sfx).select('weight_class, wrestler_a_name_raw, wrestler_b_name_raw, team1_points, team2_points').eq('dual_meet_id', s.id), 'b')
    const b1 = have.reduce((a, b) => a + b.team1_points, 0), b2 = have.reduce((a, b) => a + b.team2_points, 0)
    const ded = chk(await db.from('dual_meet_deductions' + sfx).select('team1_points, team2_points').eq('dual_meet_id', s.id), 'd').reduce((a, d) => [a[0] + Number(d.team1_points), a[1] + Number(d.team2_points)], [0, 0])
    const adds: any[] = []
    // a deduction the source lists that wasn't stored (it was left out while the dual didn't add up)
    const storedDed = chk(await db.from('dual_meet_deductions' + sfx).select('id').eq('dual_meet_id', s.id), 'dd').length
    const newDed = storedDed ? [] : m.deductions.map((d: any) => ({ dual_meet_id: s.id, label: d.label, team1_points: swap ? d.team2Points : d.team1Points, team2_points: swap ? d.team1Points : d.team2Points }))
    for (const d of newDed) { ded[0] += d.team1_points; ded[1] += d.team2_points }
    for (const x of m.matches) {
      if (!x.listedWeight) continue
      const names = [n(x.winnerName), n(x.loserName)].filter(Boolean)
      if (have.some(h => [n(h.wrestler_a_name_raw), n(h.wrestler_b_name_raw)].some(v => names.includes(v)) && (h.weight_class === x.weightClass || h.weight_class === x.listedWeight))) continue
      // a bout with no names (double forfeit) is stored when that weight already has a no-name bout
      if (!names.length && have.some(h => !h.wrestler_a_name_raw && !h.wrestler_b_name_raw && h.weight_class === x.weightClass)) continue
      const t1 = swap ? x.team2Points : x.team1Points, t2 = swap ? x.team1Points : x.team2Points
      const winnerSide = x.winnerSchoolRaw ? (n(x.winnerSchoolRaw) === n(s.team1_school_name_raw) ? 'A' : n(x.winnerSchoolRaw) === n(s.team2_school_name_raw) ? 'B' : null) : null
      if (!x.isDoubleForfeit && !winnerSide) { report.push(`${g} ${m.date} ${m.team1Name} v ${m.team2Name} ${x.listedWeight}: winner school "${x.winnerSchoolRaw}" is neither team`); continue }
      const aName = winnerSide === 'A' ? x.winnerName : x.loserName, bName = winnerSide === 'A' ? x.loserName : x.winnerName
      const type = x.resultType, det = x.resultDetail
      const sc = (det ?? '').match(/^(\d+)-(\d+)/)
      adds.push({ g, sfx, label: `${g} ${m.date} ${s.team1_school_name_raw} v ${s.team2_school_name_raw}: ${x.listedWeight}→${x.weightClass} ${x.winnerName ?? '-'} over ${x.loserName ?? '-'} (${type} ${det ?? ''}) ${t1}-${t2}`,
        row: { dual_meet_id: s.id, weight_class: x.weightClass, aName, bName, school_a_id: aName ? s.team1_school_id : null, school_b_id: bName ? s.team2_school_id : null, winnerSide, result_type: type, result_detail: type === 'Fall' ? null : det, fall_time_seconds: secs(det), team1_points: t1, team2_points: t2, is_double_forfeit: x.isDoubleForfeit, is_forfeit_win: x.isForfeitWin, validated: false, result_time_estimated: false, winner_score: sc && type !== 'Fall' ? Number(sc[1]) : null, loser_score: sc && type !== 'Fall' ? Number(sc[2]) : null } })
    }
    const a1 = adds.reduce((a, x) => a + x.row.team1_points, 0), a2 = adds.reduce((a, x) => a + x.row.team2_points, 0)
    const t1 = b1 + a1 + ded[0], t2 = b2 + a2 + ded[1]
    const okScore = (t1 === s.team1_score && t2 === s.team2_score) || (t1 === t2 && Math.abs(s.team1_score - s.team2_score) === 1 && Math.max(s.team1_score, s.team2_score) === t1 + 1)
    report.push(`${g} ${m.date} ${s.team1_school_name_raw} v ${s.team2_school_name_raw}: +${adds.length} bouts${newDed.length ? ` +${newDed.length} deduction` : ''} → ${t1}-${t2} vs final ${s.team1_score}-${s.team2_score} ${okScore ? 'adds up' : 'STILL OFF: not changed'}`)
    // only a dual that then adds up is changed; the rest are listed for review
    if (okScore) { plan.push(...adds); dedPlan.push(...newDed.map((d: any) => ({ ...d, sfx }))) }
  }
}
// wrestler ids from name links at the bout's school
const schools = new Map(chk(await db.from('schools').select('id, is_nj'), 's').map(s => [s.id, s]))
async function resolve(name: string | null, school: number | null, g: string) {
  if (!name || school == null || /^unknown$/i.test(name)) return null
  const a = chk(await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender)').eq('raw_name', name).eq('school_id', school).eq('wrestlers.gender', g), 'a')
  if (a.length) return a[0].wrestler_id as string
  // one profile with this name and no name link at another school (created before links were
  // saved, e.g. Taim Rahmoun): that's him
  const parts0 = name.trim().split(/\s+/)
  const same = chk(await db.from('wrestlers').select('id').eq('gender', g).ilike('first_name', parts0[0]).ilike('last_name', parts0.slice(1).join(' ') || parts0[0]), 'same')
  if (same.length === 1) {
    const other = chk(await db.from('wrestler_name_aliases').select('school_id').eq('wrestler_id', same[0].id), 'ol').filter(x => x.school_id !== school)
    if (!other.length) return same[0].id as string
  }
  const key = `${g}|${name}|${school}`
  if (!newProfiles.has(key)) { const parts = name.trim().split(/\s+/); newProfiles.set(key, { first_name: parts[0], last_name: parts.slice(1).join(' ') || parts[0], gender: g, is_oos: schools.get(school)?.is_nj === false, is_active: true, raw: name, school }) }
  return `new:${key}`
}
for (const p of plan) { p.aId = await resolve(p.row.aName, p.row.school_a_id, p.g); p.bId = await resolve(p.row.bName, p.row.school_b_id, p.g) }
for (const r of report) console.log(r)
console.log(`\ndeductions to add: ${dedPlan.length}`)
console.log(`bouts to add: ${plan.length} (boys ${plan.filter(p => p.g === 'M').length}, girls ${plan.filter(p => p.g === 'F').length}); new profiles: ${newProfiles.size}`)
for (const [k, v] of newProfiles) console.log(`   new profile: ${v.first_name} ${v.last_name} (${k.split('|')[0]}) at school ${v.school}${v.is_oos ? ' (out-of-state)' : ''}`)
if (!APPLY) { for (const p of plan) console.log('  add:', p.label); console.log('DRY RUN'); process.exit(0) }
const made = new Map<string, string>()
for (const [k, v] of newProfiles) { const { raw, school, ...w } = v; made.set(k, chk(await db.from('wrestlers').insert(w).select('id'), 'w')[0].id) }
const id = (x: string | null) => (x?.startsWith('new:') ? made.get(x.slice(4))! : x)
const links = plan.flatMap(p => [p.row.aName && p.aId ? { raw_name: p.row.aName, school_id: p.row.school_a_id, wrestler_id: id(p.aId) } : null, p.row.bName && p.bId ? { raw_name: p.row.bName, school_id: p.row.school_b_id, wrestler_id: id(p.bId) } : null])
const inserted: Record<string, string[]> = { '': [], _girls: [] }
for (const p of plan) {
  const { aName, bName, winnerSide, ...r } = p.row
  const row = { ...r, wrestler_a_id: id(p.aId), wrestler_b_id: id(p.bId), wrestler_a_name_raw: aName, wrestler_b_name_raw: bName, winner_id: winnerSide === 'A' ? id(p.aId) : winnerSide === 'B' ? id(p.bId) : null }
  inserted[p.sfx].push(chk(await db.from('dual_meet_matches' + p.sfx).insert(row).select('id'), 'insert ' + p.label)[0].id)
}
const l = await saveNameLinks(db, links); if (l.error) throw new Error(l.error)
for (const d of dedPlan) { const { sfx, ...row } = d; chk(await db.from('dual_meet_deductions' + sfx).insert(row).select('id'), 'ded') }
fs.writeFileSync('docs/migrations/backups/20261106_mapped_weight_bouts_inserted.json', JSON.stringify({ profiles: [...made.entries()], bouts: inserted }, null, 1))
console.log(`APPLIED: ${plan.length} bouts, ${made.size} profiles, ${l.saved} name links`)
