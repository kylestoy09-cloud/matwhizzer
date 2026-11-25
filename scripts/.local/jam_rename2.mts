import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data } = await db.from('jamborees_girls').select('id, name').like('name', '% / %')
for (const j of data ?? []) {
  const to = `${j.name.split(' / ')[0].trim()} Jamboree`
  for (const r of [await db.from('jamborees_girls').update({ name: to }).eq('id', j.id), await db.from('tournament_registry').update({ name: to }).eq('jamboree_id', j.id)]) if (r.error) throw r.error
  console.log(`${j.name} → ${to}`)
}
