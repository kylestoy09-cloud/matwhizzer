import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const inact = (await db.from('inactive_school_seasons').select('*')).data!
console.log('inactive cols', Object.keys(inact[0]).join(','), '\nrows:', JSON.stringify(inact.filter((r: any) => r.gender === 'F')))
const ids = inact.filter((r: any) => r.gender === 'F').map((r: any) => r.school_id)
const pp = (await db.from('power_points').select('*').eq('gender', 'F').in('school_id', [...ids, 87, 64])).data!
console.log('pp cols', pp[0] && Object.keys(pp[0]).join(','))
for (const r of pp) console.log('PP', JSON.stringify(r))
const gsp = (await db.from('girls_school_profiles').select('*')).data!
const gs = new Set((await db.from('girls_schools').select('school_id')).data!.map((x: any) => x.school_id))
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((x: any) => [x.id, x.display_name]))
console.log('girls_school_profiles', gsp.length, '| girls_schools', gs.size)
console.log('profiles with no girls_schools row:', gsp.filter((p: any) => !gs.has(p.school_id)).map((p: any) => `${p.school_id} ${names.get(p.school_id)} ${p.section}/${p.classification}`).join('; '))
console.log('girls_schools with no profile:', [...gs].filter(id => !gsp.some((p: any) => p.school_id === id)).map(id => `${id} ${names.get(id)}`).join('; '))
console.log('profiles on inactive girls schools:', gsp.filter((p: any) => ids.includes(p.school_id)).map((p: any) => `${p.school_id} ${names.get(p.school_id)}`).join('; '))
