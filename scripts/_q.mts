import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const c = async (t: string) => (await db.from(t).select('*', { count: 'exact', head: true })).count
console.log('schools is_nj', (await db.from('schools').select('*', { count: 'exact', head: true }).eq('is_nj', true)).count, 'boys_schools', await c('boys_schools'), 'girls_schools', await c('girls_schools'))
const { data: inact } = await db.from('inactive_school_seasons').select('season_id,gender').limit(5000); const g: any = {}; for (const r of inact!) g[`${r.season_id}${r.gender}`] = (g[`${r.season_id}${r.gender}`] ?? 0) + 1; console.log('inactive', g)
const { data: bs } = await db.from('boys_schools').select('school_id').limit(5000); const { data: gs } = await db.from('girls_schools').select('school_id').limit(5000)
const { data: nj } = await db.from('schools').select('id,display_name,is_nj').eq('is_nj', true).limit(5000)
const B = new Set(bs!.map(x => x.school_id)), G = new Set(gs!.map(x => x.school_id))
console.log('NJ in neither program table', nj!.filter(s => !B.has(s.id) && !G.has(s.id)).map(s => `${s.id} ${s.display_name}`))
console.log('girls-only NJ', nj!.filter(s => G.has(s.id) && !B.has(s.id)).length, 'boys-only NJ', nj!.filter(s => B.has(s.id) && !G.has(s.id)).length)
