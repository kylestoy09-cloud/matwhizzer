import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

for (const schoolId of [197, 506]) {
  const { data: aliases } = await db
    .from('wrestler_name_aliases')
    .select('wrestler_id')
    .eq('school_id', schoolId)
  const wrestlerIds = [...new Set((aliases ?? []).map(a => a.wrestler_id).filter(Boolean))]
  console.log(`\nschool_id=${schoolId}: ${wrestlerIds.length} distinct wrestler_ids via aliases`)

  if (wrestlerIds.length === 0) continue
  const { data: wrestlers } = await db
    .from('wrestlers')
    .select('id, first_name, last_name, grade, gender, is_active, is_oos')
    .in('id', wrestlerIds)
    .order('last_name')
  for (const w of wrestlers ?? []) {
    console.log(`${w.first_name} ${w.last_name} | ${w.grade} | gender=${w.gender} | active=${w.is_active} | oos=${w.is_oos}`)
  }
}
