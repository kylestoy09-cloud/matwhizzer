// Grade-review completions (roster_grade_school_complete) were marked on 2026-11-04 for the 2026-27 preseason,
// while the roster pool was still keyed 2026. The 2026-11-11 Season Rollovers moved the roster pool to 2027
// but not the marks, so the preseason dashboard (which reads the roster import season) dropped them —
// girls Grade Reviews fell to 19%. Copy each 2026 mark to 2027, same completed_at / completed_by.
// The 2026 rows are kept. Additive: rerunning skips rows already there.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: rows, error } = await db.from('roster_grade_school_complete').select('*').eq('season_id', 2026)
if (error) throw error
const copies = rows!.map(r => ({ ...r, season_id: 2027 }))
writeFileSync('docs/migrations/backups/20261112_carry_grade_reviews.json', JSON.stringify({ copied_from_2026: rows }))
const { error: e2 } = await db.from('roster_grade_school_complete').upsert(copies, { onConflict: 'school_id,season_id,gender', ignoreDuplicates: true })
if (e2) throw e2
for (const g of ['F', 'M']) {
  const { count } = await db.from('roster_grade_school_complete').select('school_id', { count: 'exact', head: true }).eq('season_id', 2027).eq('gender', g)
  console.log(g, '2026 marks', rows!.filter(r => r.gender === g).length, '→ 2027 marks now', count)
}
