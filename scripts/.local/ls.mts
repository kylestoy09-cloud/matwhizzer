import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ws = (await db.from('wrestlers').select('id, first_name, last_name, is_oos, is_active, grade, created_at').eq('first_name', 'Lerrod').eq('last_name', 'Smalls')).data!
for (const w of ws) {
  const e = (await db.from('tournament_entries').select('id').eq('wrestler_id', w.id)).data?.length
  const d = (await db.from('dual_meet_matches').select('id').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data?.length
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data
  console.log(w.id.slice(0, 8), 'created', w.created_at.slice(0, 16), 'is_oos', w.is_oos, 'active', w.is_active, 'grade', w.grade, '| entries', e, 'duals', d, '| links', JSON.stringify(al))
}
