import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const t = (await db.from('tournaments').select('id').eq('gender', 'F').eq('season_id', 2026).eq('name', 'Girl_s Districts District 2')).data![0]
const e = (await db.from('tournament_entries').select('school_id, school_context_raw, schools(display_name, county)').eq('tournament_id', t.id)).data ?? []
const by = new Map<string, number>()
for (const x of e as any[]) { const k = `${x.schools?.display_name} [${x.schools?.county}] sheet "${x.school_context_raw}"`; by.set(k, (by.get(k) ?? 0) + 1) }
console.log([...by].sort().map(([k, n]) => `${k} ×${n}`).join('\n'))
const d = (await db.from('girls_school_districts').select('school_id, schools(display_name)').eq('season_id', 2026).in('school_id', [(await db.from('schools').select('id').eq('display_name', 'Paterson Eastside')).data![0].id, (await db.from('schools').select('id').eq('display_name', 'Newark East Side')).data![0].id])).data
console.log('district assignments:', JSON.stringify(d))
