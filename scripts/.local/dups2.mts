import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const show = async (label: string, q: any) => { const r = await q; console.log(label, r.error?.message ?? JSON.stringify(r.data)) }
await show('Jazmin*', db.from('wrestlers').select('id, first_name, last_name, gender, grade, main_weight, created_at').or('first_name.ilike.%jazmin%,last_name.ilike.%guzman%,last_name.ilike.%quish%'))
await show('Jaylen*', db.from('wrestlers').select('id, first_name, last_name, gender, grade, main_weight, created_at').or('first_name.ilike.%jaylen%,first_name.ilike.%jailen%').ilike('last_name', '%v%z%'))
const sid = Object.fromEntries([...names].filter(([, n]) => /^(Hightstown|Hillsborough|Lenape Valley|Linden)/.test(n)).map(([i, n]) => [n, i]))
console.log(sid)
for (const [n, id] of Object.entries(sid)) {
  const r = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status, wrestler_id').eq('school_id', id).eq('gender', 'F').eq('season_id', 2026)).data ?? []
  const hits = r.filter((x: any) => /quish|guzman|abdalate|vazquez|carire|cruz/i.test(`${x.first_name_raw} ${x.last_name_raw}`))
  console.log('ROSTER', n, JSON.stringify(hits))
}
