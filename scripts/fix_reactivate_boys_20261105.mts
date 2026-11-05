// Reactivate boys wrestlers who wrestled in 2025-26 but were marked inactive (2026-11-05, approved
// by Kyle). The 2026-09-14 "season 1 orphans" cleanup (docs/migrations/20260914_deactivate_season1_orphans.sql)
// set is_active = false for every boys wrestler with a 2024-25 district entry and no 2025-26 one,
// assuming their 2025-26 records sat on new profiles. 457 have 2025-26 duals or in-season
// tournament bouts on the same profile. Inactive wrestlers are left out of the grade %, the Roster
// Grade Import tool (so their Track rows went unmatched) and microcheck.
// Held back (listed, not changed): 2024-25 seniors with 2025-26 bouts (can't be the same person),
// anyone whose Track row is confirmed to another profile, anyone with another active profile of
// the same full name at one of the same schools, and anyone whose Track grade is below their grade.
// Grades: where exactly one unmatched Track row at the school has the same name, it is matched to
// the wrestler and its grade written (as the Roster Grade Import tool does); otherwise unchanged.
//   npx tsx --tsconfig tsconfig.json scripts/fix_reactivate_boys_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(q: (f: number, t: number) => any) { const out: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')

const inact = await all((f, t) => db.from('wrestlers').select('*').eq('gender', 'M').eq('is_active', false).order('id').range(f, t))
const meetIds = new Set((await all((f, t) => db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').order('id').range(f, t))).map((m: any) => m.id))
const ist = new Set(chk(await db.from('in_season_tournaments').select('id').eq('season', '2025-26'), 'ist').map((x: any) => x.id))
const schoolsOf = new Map<string, Set<number>>()
const add = (w: string | null, s: number | null) => { if (w && s) (schoolsOf.get(w) ?? schoolsOf.set(w, new Set()).get(w)!).add(s) }
for (const b of await all((f, t) => db.from('dual_meet_matches').select('dual_meet_id, wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').order('id').range(f, t))) if (meetIds.has(b.dual_meet_id)) { add(b.wrestler_a_id, b.school_a_id); add(b.wrestler_b_id, b.school_b_id) }
for (const b of await all((f, t) => db.from('tournament_bouts').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').order('id').range(f, t))) if (ist.has(b.in_season_tournament_id)) { add(b.wrestler1_id, b.wrestler1_school_id); add(b.wrestler2_id, b.wrestler2_school_id) }
const s25 = new Set(chk(await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2025), 't').map((t: any) => t.id))
const g25 = new Map<string, string>(); for (const e of await all((f, t) => db.from('tournament_entries').select('wrestler_id, tournament_id, grade_label').order('id').range(f, t))) if (s25.has(e.tournament_id) && e.grade_label) g25.set(e.wrestler_id, e.grade_label)
const ro = await all((f, t) => db.from('roster_grade_import').select('*').eq('gender', 'M').eq('season_id', 2026).order('id').range(f, t))
const roBy = new Map<string, any[]>(); for (const r of ro) { const k = `${r.school_id}|${key(r.first_name_raw + r.last_name_raw)}`; (roBy.get(k) ?? roBy.set(k, []).get(k)!).push(r) }
// every boys profile's schools, for the same-name-at-same-school check
const allBoys = await all((f, t) => db.from('wrestlers').select('id, first_name, last_name, is_active').eq('gender', 'M').order('id').range(f, t))
const aliasSchools = new Map<string, Set<number>>(); for (const a of await all((f, t) => db.from('wrestler_name_aliases').select('wrestler_id, school_id').order('id').range(f, t))) (aliasSchools.get(a.wrestler_id) ?? aliasSchools.set(a.wrestler_id, new Set()).get(a.wrestler_id)!).add(a.school_id)
const byName = new Map<string, any[]>(); for (const w of allBoys) { const k = key(w.first_name + w.last_name); (byName.get(k) ?? byName.set(k, []).get(k)!).push(w) }

const go: { w: any; track: any | null }[] = [], hold: string[] = []
for (const w of inact) {
  const sch = schoolsOf.get(w.id); if (!sch) continue
  const name = `${w.first_name} ${w.last_name}`
  const track = [...sch].flatMap(s => roBy.get(`${s}|${key(w.first_name + w.last_name)}`) ?? [])
  if (g25.get(w.id) === 'Sr') { hold.push(`${name}: senior in 2024-25 with 2025-26 bouts`); continue }
  if (track.some((t: any) => t.wrestler_id && t.wrestler_id !== w.id)) { hold.push(`${name}: Track row confirmed to another profile`); continue }
  const twin = (byName.get(key(w.first_name + w.last_name)) ?? []).find((o: any) => o.id !== w.id && o.is_active && [...(aliasSchools.get(o.id) ?? [])].some(s => sch.has(s)))
  if (twin) { hold.push(`${name}: another active profile with this name at the same school (${twin.id.slice(0, 8)})`); continue }
  const open = track.filter((t: any) => !t.wrestler_id)
  const RANK: Record<string, number> = { Fr: 1, So: 2, Jr: 3, Sr: 4 }
  // a grade can't go down: a younger Track grade is a different person with the same name
  if (open.length === 1 && w.grade && RANK[open[0].grade] < RANK[w.grade]) { hold.push(`${name}: Track grade ${open[0].grade} is below the profile's ${w.grade}`); continue }
  go.push({ w, track: open.length === 1 ? open[0] : null })
}
const withGrade = go.filter(g => g.track)
console.log(`reactivate ${go.length} | of those, Track grade matched ${withGrade.length}, grade unchanged ${go.length - withGrade.length} | held ${hold.length}`)
for (const h of hold) console.log('  HOLD', h)
console.log('grade changes:', JSON.stringify(Object.entries(withGrade.reduce((m: any, g) => { const k = `${g.w.grade ?? '-'}→${g.track.grade}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))))
if (!process.argv.includes('--apply')) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_reactivate_boys_before.json', JSON.stringify({ wrestlers: go.map(g => g.w), roster: withGrade.map(g => g.track), hold }, null, 1))
const ids = go.map(g => g.w.id)
for (let i = 0; i < ids.length; i += 200) chk(await db.from('wrestlers').update({ is_active: true }).in('id', ids.slice(i, i + 200)).select('id'), 'activate')
const now = new Date().toISOString()
for (const g of withGrade) {
  chk(await db.from('roster_grade_import').update({ wrestler_id: g.w.id, status: 'confirmed', confirmed_at: now, confirmed_by: 'kyle.stoy09@gmail.com' }).eq('id', g.track.id).is('wrestler_id', null).select('id'), 'roster')
  chk(await db.from('wrestlers').update({ grade: g.track.grade, grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).eq('id', g.w.id).select('id'), 'grade')
}
console.log(`APPLIED: ${ids.length} reactivated, ${withGrade.length} Track grades written`)
