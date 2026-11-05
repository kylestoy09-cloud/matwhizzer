import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: g } = await db.from('girls_schools').select('*').in('school_id', [176, 177]); console.log('girls_schools', g)
const { data: c } = await db.from('school_coops').select('*').or('coop_school_id.in.(176,177),member_school_id.in.(176,177)'); console.log('coops', c)
const { data: t } = await db.from('tournaments').select('id').eq('name', 'Girl_s Districts District 8').eq('season_id', 2026).single()
const { data: e } = await db.from('tournament_entries').select('school_id, school_context_raw, wrestler_id, wrestlers(first_name,last_name)').eq('tournament_id', t!.id).in('school_id', [176, 177])
for (const x of e! as any[]) {
  const { data: d } = await db.from('dual_meet_matches_girls').select('school_a_id, school_b_id, wrestler_a_id').or(`wrestler_a_id.eq.${x.wrestler_id},wrestler_b_id.eq.${x.wrestler_id}`)
  const ds = [...new Set(d!.map(r => r.wrestler_a_id === x.wrestler_id ? r.school_a_id : r.school_b_id))]
  console.log(`${x.wrestlers.first_name} ${x.wrestlers.last_name}: entry school ${x.school_id} raw "${x.school_context_raw}" | dual schools ${JSON.stringify(ds)}`)
}
