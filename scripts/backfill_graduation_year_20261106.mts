// graduation_year for every NJ wrestler with a grade (Kyle, 2026-11-06), so a wrestler's class in any
// season follows from it (class of 2027: 2024-25 So, 2025-26 Jr, 2026-27 Sr) and grades keep rolling
// over. The season a stored grade belongs to:
//   * from the Track roster upload / manual / microcheck: 2025-26;
//   * from a district entry ("districts"): the season of the entry with that grade.
// Kept only when every tournament entry's own grade gives the same class (or there are none); a
// conflict is listed for review and left blank. A graduation_year already set is kept.
// Also (Kyle, same day): boys whose only record is 2024-25, an underclassman then and marked inactive,
// are still in school, like the 87 girls: active, grade advanced to their 2025-26 class.
//   npx tsx --tsconfig tsconfig.json scripts/backfill_graduation_year_20261106.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
async function all(t: string, c: string) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await db.from(t).select(c).order('id').range(i, i + 999); if (error) throw new Error(t + error.message); o.push(...data!); if (data!.length < 1000) break } return o }
const IDX: Record<string, number> = { Fr: 9, So: 10, Jr: 11, Sr: 12 }, NEXT: Record<string, string> = { Fr: 'So', So: 'Jr', Jr: 'Sr' }
const norm = (g: string | null) => { const t = (g ?? '').trim().toLowerCase(); return t.startsWith('fr') || t === '9' ? 'Fr' : t.startsWith('so') || t === '10' ? 'So' : t.startsWith('jr') || t.startsWith('ju') || t === '11' ? 'Jr' : t.startsWith('sr') || t.startsWith('se') || t === '12' ? 'Sr' : null }
const last = new Map<string, number>(); const up = (w: string | null, s: number | null) => { if (w && s) last.set(w, Math.max(last.get(w) ?? 0, s)) }
for (const g of ['', '_girls']) {
  const meets = new Map((await all('dual_meets' + g, 'id, season_id')).map(m => [m.id, m.season_id]))
  for (const b of await all('dual_meet_matches' + g, 'id, dual_meet_id, wrestler_a_id, wrestler_b_id')) { const s = meets.get(b.dual_meet_id); up(b.wrestler_a_id, s); up(b.wrestler_b_id, s) }
  const ist = new Map((await all('in_season_tournaments' + g, 'id, season')).map(t => [t.id, Number(String(t.season).slice(0, 4)) + 1]))
  for (const b of await all('tournament_bouts' + g, 'id, in_season_tournament_id, wrestler1_id, wrestler2_id')) { const s = ist.get(b.in_season_tournament_id); up(b.wrestler1_id, s); up(b.wrestler2_id, s) }
}
const ts = new Map((await all('tournaments', 'id, season_id')).map(t => [t.id, t.season_id]))
const eg = new Map<string, { season: number; g: string }[]>()
for (const e of await all('tournament_entries', 'id, wrestler_id, tournament_id, grade_label')) { const s = ts.get(e.tournament_id); up(e.wrestler_id, s); const g = norm(e.grade_label); if (g && s) (eg.get(e.wrestler_id) ?? eg.set(e.wrestler_id, []).get(e.wrestler_id)!).push({ season: s, g }) }
const ws = await all('wrestlers', 'id, first_name, last_name, gender, grade, is_active, is_oos, graduation_year, grade_confirmed_source')
const setGy: { id: string; gy: number }[] = [], advance: any[] = [], conflicts: string[] = []
for (const w of ws) {
  if (w.is_oos || !IDX[w.grade] || w.graduation_year) continue
  const e = eg.get(w.id) ?? []
  const base = w.grade_confirmed_source === 'districts' ? (e.filter(x => x.g === w.grade).map(x => x.season).sort().at(-1) ?? null) : 2026
  const fromEntries = [...new Set(e.map(x => x.season + 12 - IDX[x.g]))]
  const gy = base != null ? base + 12 - IDX[w.grade] : null
  if (gy == null || (fromEntries.length && (fromEntries.length !== 1 || fromEntries[0] !== gy))) { conflicts.push(`${w.gender} ${w.first_name} ${w.last_name} (${w.id.slice(0, 8)}): grade ${w.grade} [${w.grade_confirmed_source}] → class of ${gy ?? '?'}; entries say ${fromEntries.join('/') || 'none'}`); continue }
  setGy.push({ id: w.id, gy })
  if (w.gender === 'M' && !w.is_active && w.grade_confirmed_source === 'districts' && base === 2025 && last.get(w.id) === 2025 && NEXT[w.grade]) advance.push({ id: w.id, from: w.grade, to: NEXT[w.grade] })
}
const byGy: any = {}; for (const x of setGy) byGy[x.gy] = (byGy[x.gy] ?? 0) + 1
console.log(`graduation_year to set: ${setGy.length}`, JSON.stringify(byGy))
const adv: any = {}; for (const a of advance) adv[`${a.from}→${a.to}`] = (adv[`${a.from}→${a.to}`] ?? 0) + 1
console.log(`boys 2024-25-only underclassmen to reactivate and advance: ${advance.length}`, JSON.stringify(adv))
console.log(`conflicts left blank for review: ${conflicts.length}`); for (const c of conflicts) console.log('   ', c)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261106_graduation_year_before.json', JSON.stringify(ws.filter(w => setGy.some(x => x.id === w.id)).map(w => ({ id: w.id, grade: w.grade, is_active: w.is_active, graduation_year: w.graduation_year })), null, 1))
fs.writeFileSync('docs/reviews/grade_conflicts_20261106.md', `# Grade conflicts (2026-11-06)\n\nWrestlers whose profile grade and tournament-entry grades give different classes. No graduation year set; review each.\n\n${conflicts.map(c => `- ${c}`).join('\n')}\n`)
for (const gy of Object.keys(byGy)) { const ids = setGy.filter(x => String(x.gy) === gy).map(x => x.id); for (let i = 0; i < ids.length; i += 300) { const r = await db.from('wrestlers').update({ graduation_year: Number(gy) }).in('id', ids.slice(i, i + 300)).is('graduation_year', null).select('id'); if (r.error) throw r.error } }
for (const g of ['Fr', 'So', 'Jr']) { const ids = advance.filter(a => a.from === g).map(a => a.id); for (let i = 0; i < ids.length; i += 300) { const r = await db.from('wrestlers').update({ grade: NEXT[g], is_active: true }).in('id', ids.slice(i, i + 300)).eq('grade', g).select('id'); if (r.error) throw r.error } }
console.log(`APPLIED: ${setGy.length} graduation years, ${advance.length} boys reactivated and advanced`)
