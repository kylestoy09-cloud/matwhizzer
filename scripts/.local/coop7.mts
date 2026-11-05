import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const id of [4, 56, 78, 314]) {
  const m = await db.rpc('get_coop_members', { p_coop_school_id: id })
  console.log(id, m.error?.message ?? JSON.stringify(m.data))
}
const ws = (await db.from('wrestlers').select('id, first_name, last_name, gender, graduation_year').ilike('last_name', '%Ratz%')).data
console.log('Ratz', JSON.stringify(ws))
const j = (await db.from('wrestlers').select('id, first_name, last_name, gender').or('first_name.ilike.%Jayden%Ratz%,last_name.ilike.%Jayden%')).data
console.log('Jayden', JSON.stringify(j?.filter((w: any) => /ratz/i.test(w.first_name + w.last_name))))
