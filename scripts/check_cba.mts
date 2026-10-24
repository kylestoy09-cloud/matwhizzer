import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Find the school
const { data: schools } = await db
  .from('schools')
  .select('id, display_name')
  .ilike('display_name', '%christian brothers%')
console.log('SCHOOLS:', schools)

// Find distinct school_name_raw values in roster_grade_import that look related
const { data: rawNames } = await db
  .from('roster_grade_import')
  .select('school_name_raw, school_id')
  .ilike('school_name_raw', '%christian%')
console.log('RAW NAME VARIANTS:', [...new Set((rawNames ?? []).map(r => `${r.school_name_raw} -> school_id=${r.school_id}`))])

if (schools && schools.length > 0) {
  for (const s of schools) {
    const { data: rows, count } = await db
      .from('roster_grade_import')
      .select('id, first_name_raw, last_name_raw, weight_class, grade, status, school_name_raw, import_batch', { count: 'exact' })
      .eq('school_id', s.id)
      .order('last_name_raw')
    console.log(`\n--- school_id=${s.id} (${s.display_name}) rows=${count} ---`)
    for (const r of rows ?? []) {
      console.log(`${r.first_name_raw} ${r.last_name_raw} | wt ${r.weight_class} | ${r.grade} | ${r.status} | raw="${r.school_name_raw}" | batch=${r.import_batch}`)
    }
  }
}
