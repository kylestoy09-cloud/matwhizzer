// 21 wrestlers whose grade and class year (graduation_year) disagreed going into the 2026-27 rollover:
// 11 boys (found when the boys rollover was finished) and 10 girls (checked before the girls rollover).
// Kyle 2026-11-11: "for all of them just use the grad year". Each grade is set from the class year for the
// season grade_season describes; a class that has already graduated is set inactive (as the rollover does).
// The graduation_year trigger then recomputes the same class year, which the check below confirms.
//   node --env-file=.env.local scripts/fix_grade_from_class_year_20261111.mts           dry run
//   node --env-file=.env.local scripts/fix_grade_from_class_year_20261111.mts --apply   backup, update, check
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const IDS: Record<'M' | 'F', string[]> = {
  M: ['37186400-0e5c-4557-acc6-95fcdb2310a9', '5631baef-75c4-4c48-87b4-ab3e16b1cbad', '571a53b1-7e6d-4c59-81ba-76c6eb1b0079',
      '5af57c19-34be-4ead-a5b6-dcc7f96b1fca', '61714262-24f2-44b4-8810-40bc646c91ce', '6a6a832a-64fc-4b03-b88c-1d2cdbbda6e4',
      '74bce91c-5cc2-40d4-9539-b4b0585db37f', 'a0f438d8-9cf5-457e-8d6c-a25a25abe278', 'b258fe4e-8760-4121-a442-782727836a2f',
      'd7f20f37-0a86-469e-9511-808ee12537b1', 'db494011-7ddd-4518-8c87-34c2bf7ae73f'],
  F: [],   // the 10 girls are found by the same rule (grade vs class year for grade_season F)
}
const GRADE = ['Sr', 'Jr', 'So', 'Fr']
const off: Record<string, number> = { Sr: 0, Jr: 1, So: 2, Fr: 3 }
const cols = 'id, first_name, last_name, gender, grade, graduation_year, is_active'

const seasonEnd = Object.fromEntries(((await db.from('grade_season').select('gender, season_end')).data ?? []).map(r => [r.gender, r.season_end]))
const girls: any[] = []
for (let i = 0; ; i += 1000) {
  const { data, error } = await db.from('wrestlers').select(cols).not('grade', 'is', null).eq('is_active', true).eq('is_oos', false).eq('gender', 'F').order('id').range(i, i + 999)
  if (error) throw error
  girls.push(...data!)
  if (data!.length < 1000) break
}
IDS.F = girls.filter(r => off[r.grade] != null && r.graduation_year != null && r.graduation_year !== seasonEnd.F + off[r.grade]).map(r => r.id)
if (IDS.F.length !== 10) throw new Error(`expected the 10 girls, found ${IDS.F.length} — has the girls rollover run? stopping`)
if (seasonEnd.M !== 2027 || seasonEnd.F !== 2026) throw new Error(`grade_season changed: ${JSON.stringify(seasonEnd)} — stopping`)

const rows = (await db.from('wrestlers').select(cols).in('id', [...IDS.M, ...IDS.F])).data!
const plan = rows.map(r => {
  const years = r.graduation_year - seasonEnd[r.gender]
  return years < 0 ? { r, grade: r.grade, is_active: false } : { r, grade: GRADE[years], is_active: true }
})
for (const p of plan) console.log(p.r.gender, `${p.r.first_name} ${p.r.last_name}`.padEnd(24), `${p.r.grade} → ${p.grade}`, `class of ${p.r.graduation_year}`, p.is_active ? '' : '→ graduated (inactive)')
if (!APPLY) process.exit(0)

writeFileSync('docs/migrations/backups/20261111_grade_from_class_year.json', JSON.stringify(rows))
const now = new Date().toISOString()
for (const p of plan) {
  const { error } = await db.from('wrestlers').update({ grade: p.grade, is_active: p.is_active, grade_confirmed_at: now, grade_confirmed_source: 'manual' }).eq('id', p.r.id)
  if (error) throw error
}
const after = (await db.from('wrestlers').select(cols).in('id', rows.map(r => r.id))).data!
const moved = after.filter(a => a.graduation_year !== rows.find(r => r.id === a.id)!.graduation_year)
console.log(`updated ${plan.length}; class year changed (should be 0): ${moved.length}`)
