import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const people = [['M','John Ross'],['M','Alexander Spagnuolo'],['M','George Dipsey'],['M','Elijah Roman'],['M','Thomas Ross'],['M','Chris Wolf'],['M','J. Mako Vezzosi'],['M','William Cruz'],['M','Daniel Roman'],['M','Terrence James Fearon'],['M','Dion Mesanko Coleman'],['M','Hayden Lauterback'],['M','Bobby Duffy'],['F','Alexandria Barskiy'],['F','Ellie Kisselbach'],['F','Grey Henecker'],['F','Victoria Lu']]
for (const [g, n] of people) {
  const last = n.split(' ').pop()!
  const { data } = await db.from('wrestlers').select('id, first_name, last_name, graduation_year, is_oos').eq('gender', g).ilike('last_name', last).eq('is_oos', false)
  const hits = []
  for (const w of data ?? []) { const { data: a } = await db.from('wrestler_name_aliases').select('schools(display_name)').eq('wrestler_id', w.id).limit(1); hits.push(`${w.first_name} ${w.last_name} '${String(w.graduation_year ?? '').slice(2)} ${(a?.[0] as any)?.schools?.display_name ?? ''}`) }
  console.log(`${n.padEnd(22)} → ${hits.join(' | ') || 'no NJ wrestler with that last name'}`)
}
