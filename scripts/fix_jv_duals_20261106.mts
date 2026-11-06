// Collingswood v Paulsboro 1/14 and Highland/Triton v Williamstown 1/28 (boys 2025-26): each is listed
// twice in the source on the same day, varsity (14 bouts) and JV (repeated weights: Collingswood 120,
// 157, 215, 285; Highland 126, 165, 285). The stored dual was built from the JV copy (all 7 / 6 stored
// bouts and the final). Kyle, 2026-11-06: only the varsity counts. The JV bouts are replaced by the
// varsity bouts and the final set to the varsity score; wrestlers from their name links at the school
// (a wrestler with none gets a profile and link, as an import would).
//   npx tsx --tsconfig tsconfig.json scripts/fix_jv_duals_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import { parseDualMeetText } from '@/lib/parseDualMeet'
import { saveNameLinks } from '@/lib/nameLinks'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const n = (s: string | null) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
const SRC = execFileSync('textutil', ['-convert', 'txt', '-stdout', '../Whizzer Upload/2025-26 Boys Data/January 1-11-20-2026 Dual Results.rtfd/TXT.rtf'], { maxBuffer: 1 << 28 }).toString()
  + execFileSync('textutil', ['-convert', 'txt', '-stdout', '../Whizzer Upload/2025-26 Boys Data/January 21-31-2026 Dual Results.rtfd/TXT.rtf'], { maxBuffer: 1 << 28 }).toString()
const parsed = parseDualMeetText(SRC)
const DUALS = [['2026-01-14', '01/14/2026', 'Collingswood', 'Paulsboro H.S.'], ['2026-01-28', '01/28/2026', 'Highland Regional/Triton', 'Williamstown']]
const secs = (d: string | null) => { const t = (d ?? '').match(/(\d+):(\d\d)/); return t ? Number(t[1]) * 60 + Number(t[2]) : null }
const backup: any = {}, plan: any[] = [], newProf = new Map<string, any>()
async function wid(name: string | null, school: number) {
  if (!name) return null
  const a = chk(await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender)').eq('raw_name', name).eq('school_id', school).eq('wrestlers.gender', 'M'), 'a')
  if (a.length) return a[0].wrestler_id as string
  const k = `${name}|${school}`; if (!newProf.has(k)) { const p = name.split(/\s+/); newProf.set(k, { first_name: p[0], last_name: p.slice(1).join(' '), gender: 'M', is_oos: false, is_active: true }) }
  return `new:${k}`
}
for (const [d, md, a, b] of DUALS) {
  const v = parsed.filter(m => m.date === md && m.team1Name === a && m.team2Name === b && m.matches.length === 14 && new Set(m.matches.map(x => x.weightClass)).size === 14)
  if (v.length !== 1) throw new Error(`${a}: ${v.length} varsity copies`)
  const s = chk(await db.from('dual_meets').select('*').eq('meet_date', d).eq('team1_school_name_raw', a).eq('team2_school_name_raw', b), 'm')[0]
  const old = chk(await db.from('dual_meet_matches').select('*').eq('dual_meet_id', s.id), 'b')
  backup[s.id] = { meet: s, bouts: old }
  const m = v[0]; const p1 = m.matches.reduce((x, y) => x + y.team1Points, 0), p2 = m.matches.reduce((x, y) => x + y.team2Points, 0)
  const d1 = m.deductions.reduce((x, y) => x + y.team1Points, 0), d2 = m.deductions.reduce((x, y) => x + y.team2Points, 0)
  console.log(`${a} v ${b} ${d}: stored ${s.team1_score}-${s.team2_score} with ${old.length} JV bouts → varsity ${m.team1Score}-${m.team2Score}, 14 bouts ${p1}-${p2}, adjustments ${d1}/${d2} (net, not stored when 0)`)
  if (p1 + d1 !== m.team1Score || p2 + d2 !== m.team2Score) throw new Error('varsity copy does not add up')
  for (const x of m.matches) {
    const winA = n(x.winnerSchoolRaw) === n(a)
    const aName = winA ? x.winnerName : x.loserName, bName = winA ? x.loserName : x.winnerName
    const sc = (x.resultDetail ?? '').match(/^(\d+)-(\d+)/)
    plan.push({ meet: s, aName, bName, winA, row: { dual_meet_id: s.id, weight_class: x.weightClass, school_a_id: aName ? s.team1_school_id : null, school_b_id: bName ? s.team2_school_id : null, result_type: x.resultType, result_detail: x.resultType === 'Fall' ? null : x.resultDetail, fall_time_seconds: secs(x.resultDetail), team1_points: x.team1Points, team2_points: x.team2Points, is_double_forfeit: x.isDoubleForfeit, is_forfeit_win: x.isForfeitWin, validated: false, wrestler_a_name_raw: aName, wrestler_b_name_raw: bName, result_time_estimated: false, winner_score: sc && x.resultType !== 'Fall' ? Number(sc[1]) : null, loser_score: sc && x.resultType !== 'Fall' ? Number(sc[2]) : null }, final: [m.team1Score, m.team2Score], net: [d1, d2] })
  }
}
for (const p of plan) { p.aId = await wid(p.aName, p.meet.team1_school_id); p.bId = await wid(p.bName, p.meet.team2_school_id) }
console.log(`varsity bouts: ${plan.length}; JV bouts replaced: ${Object.values(backup).reduce((t: number, x: any) => t + x.bouts.length, 0)}; new profiles: ${newProf.size}`, [...newProf.keys()].join(', '))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_jv_duals_before.json', JSON.stringify(backup, null, 1))
const made = new Map<string, string>(); for (const [k, w] of newProf) made.set(k, chk(await db.from('wrestlers').insert(w).select('id'), 'w')[0].id)
const id = (x: string | null) => (x?.startsWith('new:') ? made.get(x.slice(4))! : x)
for (const [mid, x] of Object.entries(backup) as [string, any][]) {
  chk(await db.from('dual_meet_matches').delete().in('id', x.bouts.map((b: any) => b.id)).select('id'), 'delete JV')
  const rows = plan.filter(p => p.meet.id === mid)
  chk(await db.from('dual_meet_matches').insert(rows.map(p => ({ ...p.row, wrestler_a_id: id(p.aId), wrestler_b_id: id(p.bId), winner_id: p.row.is_double_forfeit ? null : p.winA ? id(p.aId) : id(p.bId) }))).select('id'), 'insert')
  chk(await db.from('dual_meets').update({ team1_score: rows[0].final[0], team2_score: rows[0].final[1] }).eq('id', mid).select('id'), 'final')
}
const l = await saveNameLinks(db, plan.flatMap(p => [p.aName ? { raw_name: p.aName, school_id: p.meet.team1_school_id, wrestler_id: id(p.aId) } : null, p.bName ? { raw_name: p.bName, school_id: p.meet.team2_school_id, wrestler_id: id(p.bId) } : null]))
console.log(`APPLIED: ${plan.length} varsity bouts, ${made.size} profiles, ${l.saved} links`)
