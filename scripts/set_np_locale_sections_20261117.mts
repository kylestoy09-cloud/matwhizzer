// Kyle 2026-11-17: the 32 Non-Public schools' locale_section (their geographic section, used by Whiz Rank and the
// daily report), 8 per section. Chosen by town / county / wrestling region against the public schools' sections,
// with Kyle moving the judgment calls plus Newark Academy and Paramus Catholic to North II. Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const PLAN: Record<string, number[]> = {
  'North I':  [11, 21, 394, 20, 22, 79, 381, 117],          // Don Bosco, Bergen Catholic, St. Joseph (Montvale), Saddle River Day, DePaul, Pioneer, Mary Help, Pope John
  'North II': [118, 167, 88, 127, 82, 144, 115, 153],       // St. Benedict's, St. Peter's, St. Mary (Rutherford), Seton Hall Prep, Delbarton, Pingry, Newark Academy, Paramus Catholic
  'Central':  [213, 234, 186, 264, 243, 197, 73, 196],      // Notre Dame, St. Thomas Aquinas, St. Joseph (Metuchen), Red Bank Catholic, SJV, CBA, Immaculata, Rutgers Prep
  'South':    [278, 269, 241, 313, 356, 280, 248, 201],     // Camden Catholic, Gloucester Catholic, Paul VI, St. Augustine, St. Joseph (Hammonton), Holy Spirit, Donovan, Holy Cross
}
const ids = Object.values(PLAN).flat()
if (new Set(ids).size !== 32) throw new Error('expected 32 distinct schools')
const { data: before, error } = await db.from('schools').select('id, display_name, section, locale_section').in('id', ids)
if (error) throw error
if (before!.length !== 32 || before!.some(s => s.section !== 'Non-Public')) throw new Error('not all 32 are Non-Public schools')
writeFileSync('docs/migrations/backups/20261117_np_locale_sections.json', JSON.stringify(before, null, 1))
for (const [section, list] of Object.entries(PLAN)) {
  const { error: uErr } = await db.from('schools').update({ locale_section: section }).in('id', list)
  if (uErr) throw uErr
}
const { data: after } = await db.from('schools').select('locale_section').eq('section', 'Non-Public').eq('is_nj', true)
const c: Record<string, number> = {}; for (const s of after!) c[s.locale_section ?? 'none'] = (c[s.locale_section ?? 'none'] ?? 0) + 1
console.log(c)
