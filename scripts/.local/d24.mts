import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const get = async (y: number) => (await db.from('playoff_history_entrants').select('weight, place, name, team').eq('gender', 'M').eq('season_id', y).eq('kind', 'district').eq('num', 24).order('weight').order('place')).data ?? []
const a = await get(2013), b = await get(2014)
const key = (r: { weight: number; place: number | null; name: string }) => `${r.weight}|${r.place}|${r.name.replace(/\s+/g, ' ')}`
const sb = new Set(b.map(key))
console.log('2013 D24 rows', a.length, '2014 D24 rows', b.length, 'identical rows', a.filter(r => sb.has(key(r))).length)
console.log('2013 champs', a.filter(r => r.place === 1).map(r => `${r.weight} ${r.name} (${r.team})`).join('; '))
const bt = await db.from('playoff_history_bouts').select('source_file').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24).limit(1)
const bt4 = await db.from('playoff_history_bouts').select('source_file').eq('gender', 'M').eq('season_id', 2014).eq('kind', 'district').eq('num', 24).limit(1)
console.log('files', bt.data, bt4.data, bt.error?.message)
const m = await db.from('history_finishes').select('year, weight, level, place, name, school, region').ilike('name', '%Mendez%')
console.log(m.data)
