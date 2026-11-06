// The 30 grade conflicts (docs/reviews/grade_conflicts_20261106.md): each record is a vote for a class:
// every tournament entry's printed grade (season + its grade), the profile grade (2025-26 when it
// came from a roster upload / manual edit), and the wrestler's Track roster row (2025-26) unless the
// profile grade was copied from that row (one source counts once). Kyle,
// 2026-11-06: when one class has more votes than any other, set it — graduation_year, and the grade
// becomes that class's 2025-26 grade (the season the grade column describes). Ties are listed.
//   npx tsx --tsconfig tsconfig.json scripts/resolve_grade_conflicts_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const IDX: Record<string, number> = { Fr: 9, So: 10, Jr: 11, Sr: 12 }, NAME: Record<number, string> = { 9: 'Fr', 10: 'So', 11: 'Jr', 12: 'Sr' }
const norm = (g: string | null) => { const t = (g ?? '').trim().toLowerCase(); return t.startsWith('fr') || t === '9' ? 'Fr' : t.startsWith('so') || t === '10' ? 'So' : t.startsWith('jr') || t.startsWith('ju') || t === '11' ? 'Jr' : t.startsWith('sr') || t.startsWith('se') || t === '12' ? 'Sr' : null }
const ids = [...fs.readFileSync('docs/reviews/grade_conflicts_20261106.md', 'utf8').matchAll(/\(([0-9a-f]{8})\)/g)].map(m => m[1])
const all: any[] = []; for (let i = 0; ; i += 1000) { const d = (await db.from('wrestlers').select('id, first_name, last_name, gender, grade, graduation_year, grade_confirmed_source, is_oos').order('id').range(i, i + 999)).data!; all.push(...d); if (d.length < 1000) break }
const ws = ids.map(p => all.filter(w => w.id.startsWith(p) && !w.graduation_year && !w.is_oos)).map(x => x[0]).filter(Boolean)
const decided: any[] = [], ties: string[] = []
for (const w of ws) {
  const votes: string[] = []
  const e = (await db.from('tournament_entries').select('grade_label, tournaments(name, season_id)').eq('wrestler_id', w.id)).data!
  for (const r of e) { const g = norm(r.grade_label); if (g) votes.push(`${r.tournaments.season_id + 12 - IDX[g]}|${r.tournaments.season_id - 1}-${String(r.tournaments.season_id).slice(2)} ${r.tournaments.name.replace(/Boy_s |Girl_s /, '')}: ${g}`) }
  if (w.grade_confirmed_source !== 'districts' && IDX[w.grade]) votes.push(`${2026 + 12 - IDX[w.grade]}|profile (${w.grade_confirmed_source}): ${w.grade}`)
  // a profile grade from the roster upload IS the roster row's grade: one source, one vote
  const rr = (await db.from('roster_grade_import').select('grade').eq('wrestler_id', w.id)).data ?? []
  for (const r of rr) { const g = norm(r.grade); if (g && !(w.grade_confirmed_source === 'roster_upload' && g === w.grade)) votes.push(`${2026 + 12 - IDX[g]}|Track roster: ${g}`) }
  const tally = new Map<number, string[]>(); for (const v of votes) { const [gy, why] = v.split('|'); (tally.get(Number(gy)) ?? tally.set(Number(gy), []).get(Number(gy))!).push(why) }
  const ranked = [...tally].sort((a, b) => b[1].length - a[1].length)
  const line = `${w.gender} ${w.first_name} ${w.last_name} (${w.id.slice(0, 8)}): ${ranked.map(([gy, why]) => `class of ${gy} ×${why.length} [${why.join('; ')}]`).join('  vs  ')}`
  if (ranked.length && (ranked.length === 1 || ranked[0][1].length > ranked[1][1].length)) {
    const gy = ranked[0][0], idx = 12 - (gy - 2026)
    decided.push({ id: w.id, gy, grade: NAME[idx] ?? null, was: w.grade, line })
  } else ties.push(line)
}
console.log(`decided by majority: ${decided.length}`); for (const d of decided) console.log(`  → class of ${d.gy} (2025-26 ${d.grade ?? 'graduated'}; profile was ${d.was}) | ${d.line}`)
console.log(`\nties for Kyle: ${ties.length}`); for (const t of ties) console.log('  ', t)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_grade_conflicts_before.json', JSON.stringify(ws, null, 1))
for (const d of decided) {
  const upd: any = { graduation_year: d.gy }
  if (d.grade && d.grade !== d.was) upd.grade = d.grade
  if (!d.grade) { upd.is_active = false }   // the majority says he graduated before 2025-26
  const r = await db.from('wrestlers').update(upd).eq('id', d.id).select('id'); if (r.error) throw r.error
}
console.log(`APPLIED: ${decided.length}`)
