import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: seasons } = await db.from('seasons').select('*').order('id')
console.log('seasons', JSON.stringify(seasons?.map(s => ({ id: s.id, label: s.label ?? s.name, end: s.end_year }))))
const { data: ts, error } = await db.from('tournaments').select('id, name, season_id, tournament_type, gender, region_id').eq('gender', 'F')
if (error) throw error
const c = new Map<string, number>(); for (const t of ts ?? []) c.set(`${t.season_id}|${t.tournament_type}`, (c.get(`${t.season_id}|${t.tournament_type}`) ?? 0) + 1)
console.log([...c].sort().join('\n'))
const { data: one } = await db.from('tournament_entries').select('*').limit(1); console.log('entry cols', Object.keys(one?.[0] ?? {}))
