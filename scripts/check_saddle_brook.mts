import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// Find Saddle Brook school record
const { data: schools } = await db
  .from('schools')
  .select('id, display_name, section, classification, is_combined, is_nj')
  .ilike('display_name', '%saddle brook%')
console.log('Schools:', schools)

if (schools && schools.length > 0) {
  for (const s of schools) {
    const { data: meets } = await db.from('dual_meets').select('id', { count: 'exact', head: true }).or(`team1_school_id.eq.${s.id},team2_school_id.eq.${s.id}`)
    const { data: wrestlers } = await db.from('wrestlers').select('id', { count: 'exact', head: true }).eq('school_id', s.id)
    const { data: pp } = await db.from('power_points').select('season_id, gender, power_points').eq('school_id', s.id)
    const { data: aliases } = await db.from('school_aliases').select('alias, alias_type').eq('school_id', s.id)
    const { count: meetCount } = await db.from('dual_meets').select('*', { count: 'exact', head: true }).or(`team1_school_id.eq.${s.id},team2_school_id.eq.${s.id}`)
    const { count: wrestlerCount } = await db.from('wrestlers').select('*', { count: 'exact', head: true }).eq('school_id', s.id)
    console.log(`\n${s.display_name} (id=${s.id}):`)
    console.log(`  Dual meets: ${meetCount ?? 0}`)
    console.log(`  Wrestlers: ${wrestlerCount ?? 0}`)
    console.log(`  Power points:`, pp)
    console.log(`  Aliases:`, aliases)
  }
}
