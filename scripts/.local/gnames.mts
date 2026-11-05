import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sch = new Map((await db.from('schools').select('id, display_name')).data!.map(s => [s.id, s.display_name]))
for (const [t, g] of [['girls_schools', 'F'], ['boys_schools', 'M']] as const) {
  const rows: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from(t).select('school_id, display_name, is_combined').range(f, f + 999); rows.push(...data!); if (data!.length < 1000) break }
  const diff = rows.filter(r => r.display_name !== sch.get(r.school_id))
  console.log(`${t}: ${rows.length} rows, ${diff.length} differ from schools.display_name`); for (const r of diff) console.log(`  ${r.school_id}: schools "${sch.get(r.school_id)}" vs ${g} "${r.display_name}"${r.is_combined ? ' (co-op)' : ''}`)
}
const { data: ssn } = await db.from('school_season_names').select('*'); console.log('school_season_names rows:', JSON.stringify(ssn))
