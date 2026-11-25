import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r1 = await db.from('schools').select('*').limit(1); console.log(Object.keys(r1.data![0]).join(','))
const all: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('schools').select('id, display_name, is_nj').range(f, f + 999); all.push(...data!); if (data!.length < 1000) break }
const re = /(^|[\s/(-])(st\.?|saint)\s/i
for (const r of all.filter(r => re.test(r.display_name))) console.log(r.id, '|', r.display_name, r.is_nj)
const sn: any[] = []; for (let f = 0; ; f += 1000) { const { data } = await db.from('school_season_names').select('school_id, season_id, gender, display_name').range(f, f + 999); sn.push(...data!); if (data!.length < 1000) break }
const m = new Map<string, string[]>(); for (const r of sn.filter(r => re.test(r.display_name))) m.set(r.display_name, [...(m.get(r.display_name) ?? []), `${r.gender}${r.season_id}`])
console.log('season names:'); for (const [k, v] of m) console.log(k, v.length)
