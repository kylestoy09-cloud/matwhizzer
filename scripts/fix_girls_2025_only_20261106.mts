// Girls whose only record is a 2024-25 postseason entry (the "292", found 2026-11-05): active, no name
// link, no 2025-26 match; their grade came from that 2024-25 entry, so it is a 2024-25 class.
// Kyle, 2026-11-06:
//   * 2024-25 seniors graduated in 2025: inactive, graduation_year 2025.
//   * underclassmen are still in school and may just not have come out for the team: they stay on file
//     (still active = in school), their grade becomes the 2025-26 class (+1) and graduation_year is set,
//     so their grade keeps rolling over. They are on no 2025-26 roster (rosters come from matches).
//   * the one with no grade is left as is.
//   npx tsx --tsconfig tsconfig.json scripts/fix_girls_2025_only_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
async function all(t: string, c: string, f?: (q: any) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { let q = db.from(t).select(c).order('id'); if (f) q = f(q); const { data, error } = await q.range(i, i + 999); if (error) throw new Error(t + error.message); o.push(...data!); if (data!.length < 1000) break } return o }
const NEXT: Record<string, string> = { Fr: 'So', So: 'Jr', Jr: 'Sr' }
const GRAD_2026: Record<string, number> = { Sr: 2026, Jr: 2027, So: 2028, Fr: 2029 }   // class of, for a 2025-26 grade
// every girl's latest season with any record
const last = new Map<string, number>(); const up = (w: string | null, s: number | null) => { if (w && s) last.set(w, Math.max(last.get(w) ?? 0, s)) }
const meets = new Map((await all('dual_meets_girls', 'id, season_id')).map(m => [m.id, m.season_id]))
for (const b of await all('dual_meet_matches_girls', 'id, dual_meet_id, wrestler_a_id, wrestler_b_id')) { const s = meets.get(b.dual_meet_id); up(b.wrestler_a_id, s); up(b.wrestler_b_id, s) }
const ist = new Map((await all('in_season_tournaments_girls', 'id, season')).map(t => [t.id, Number(String(t.season).slice(0, 4)) + 1]))
for (const b of await all('tournament_bouts_girls', 'id, in_season_tournament_id, wrestler1_id, wrestler2_id')) { const s = ist.get(b.in_season_tournament_id); up(b.wrestler1_id, s); up(b.wrestler2_id, s) }
const ts = new Map((await all('tournaments', 'id, season_id')).map(t => [t.id, t.season_id]))
for (const e of await all('tournament_entries', 'id, wrestler_id, tournament_id')) up(e.wrestler_id, ts.get(e.tournament_id))
const linked = new Set((await all('wrestler_name_aliases', 'id, wrestler_id')).map(a => a.wrestler_id))
const girls = await all('wrestlers', 'id, first_name, last_name, grade, is_active, is_oos, graduation_year, grade_confirmed_source', q => q.eq('gender', 'F'))
const target = girls.filter(w => w.is_active && !w.is_oos && w.first_name !== 'Unknown' && !linked.has(w.id) && last.get(w.id) === 2025)
const grad = target.filter(w => w.grade === 'Sr'), under = target.filter(w => NEXT[w.grade]), none = target.filter(w => !w.grade)
console.log(`2024-25-only girls: ${target.length} — seniors (graduate) ${grad.length}, underclassmen (advance) ${under.length}, no grade ${none.length}`)
const by: any = {}; for (const w of under) by[`${w.grade}→${NEXT[w.grade]}`] = (by[`${w.grade}→${NEXT[w.grade]}`] ?? 0) + 1; console.log('   ', JSON.stringify(by), '| grade sources:', JSON.stringify(target.reduce((t: any, w) => (t[w.grade_confirmed_source] = (t[w.grade_confirmed_source] ?? 0) + 1, t), {})))
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_girls_2025_only_before.json', JSON.stringify(target, null, 1))
for (let i = 0; i < grad.length; i += 200) { const r = await db.from('wrestlers').update({ is_active: false, graduation_year: 2025 }).in('id', grad.slice(i, i + 200).map(w => w.id)).eq('grade', 'Sr').select('id'); if (r.error) throw r.error }
for (const g of ['Fr', 'So', 'Jr']) {
  const ids = under.filter(w => w.grade === g).map(w => w.id)
  for (let i = 0; i < ids.length; i += 200) { const r = await db.from('wrestlers').update({ grade: NEXT[g], graduation_year: GRAD_2026[NEXT[g]] }).in('id', ids.slice(i, i + 200)).eq('grade', g).select('id'); if (r.error) throw r.error }
}
console.log(`APPLIED: ${grad.length} graduated (2025), ${under.length} advanced to their 2025-26 class`)
