// Wrestlers not flagged out-of-state who only ever wrestled for schools marked non-NJ
// (dual bouts, tournament bouts, postseason entries): other states and NJ schools outside
// the NJSIAA. Name aliases don't count: the dual import left stray aliases at the
// same-name NJ school (Gloucester VA wrestlers aliased at Gloucester City). The dual imports never set is_oos (fixed 2026-11-02), so
// they were rated, ranked and seeded as NJ wrestlers. Flags them is_oos; wrestlers with
// records at both NJ and non-NJ schools are only listed. Dry run unless --apply.
// Run: npx tsx --tsconfig tsconfig.json scripts/flag_non_njsiaa_wrestlers.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')
async function all(t: string, cols: string, f?: (q: any) => any) {
  const out: any[] = []; let last: string | number | null = null
  for (;;) { let q = db.from(t).select(cols).order('id').limit(1000); if (f) q = f(q); if (last != null) q = q.gt('id', last); const { data, error } = await q; if (error) throw new Error(`${t}: ${error.message}`); out.push(...data); if (data.length < 1000) break; last = data[data.length - 1].id }
  return out
}
const schools = await all('schools', 'id, display_name, is_nj')
const nonNj = new Set(schools.filter(s => s.is_nj === false).map(s => s.id)), sn = new Map(schools.map(s => [s.id, s.display_name]))
const wrestlers = await all('wrestlers', 'id, first_name, last_name, gender, is_oos', q => q.or('is_oos.is.null,is_oos.eq.false'))
const at = new Map<string, Set<number>>(); const add = (w: string | null, s: number | null) => { if (w && s != null) (at.get(w) ?? at.set(w, new Set()).get(w)!).add(s) }
for (const t of ['dual_meet_matches', 'dual_meet_matches_girls']) for (const r of await all(t, 'id, wrestler_a_id, school_a_id, wrestler_b_id, school_b_id')) { add(r.wrestler_a_id, r.school_a_id); add(r.wrestler_b_id, r.school_b_id) }
for (const t of ['tournament_bouts', 'tournament_bouts_girls']) for (const r of await all(t, 'id, wrestler1_id, wrestler1_school_id, wrestler2_id, wrestler2_school_id')) { add(r.wrestler1_id, r.wrestler1_school_id); add(r.wrestler2_id, r.wrestler2_school_id) }
for (const r of await all('tournament_entries', 'id, wrestler_id, school_id')) add(r.wrestler_id, r.school_id)
const flag: any[] = [], mixed: any[] = []
for (const w of wrestlers) {
  const s = [...(at.get(w.id) ?? [])]; if (!s.length) continue
  const bad = s.filter(x => nonNj.has(x)); if (!bad.length) continue
  const row = { id: w.id, name: `${w.first_name} ${w.last_name}`, gender: w.gender, schools: s.map(x => sn.get(x)) }
  if (bad.length === s.length) flag.push(row); else mixed.push(row)
}
const bySchool: Record<string, number> = {}; for (const r of flag) for (const s of r.schools) bySchool[s] = (bySchool[s] ?? 0) + 1
console.log(`to flag out-of-state: ${flag.length} (boys ${flag.filter(r => r.gender === 'M').length}, girls ${flag.filter(r => r.gender === 'F').length})`)
console.log('by school:', JSON.stringify(Object.fromEntries(Object.entries(bySchool).sort((a, b) => b[1] - a[1]))))
console.log(`mixed NJ + non-NJ (listed, not changed): ${mixed.length}`); for (const m of mixed) console.log(`  ${m.gender} ${m.name}: ${m.schools.join(' / ')}`)
if (apply) {
  fs.writeFileSync('docs/migrations/backups/20261102_non_njsiaa_wrestlers_flagged.json', JSON.stringify({ flagged: flag, mixed }, null, 1))
  for (let i = 0; i < flag.length; i += 200) {
    const { error } = await db.from('wrestlers').update({ is_oos: true }).in('id', flag.slice(i, i + 200).map(r => r.id)).or('is_oos.is.null,is_oos.eq.false')
    if (error) throw error
  }
  console.log('flagged', flag.length)
}
