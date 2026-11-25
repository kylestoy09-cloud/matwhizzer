import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const n = async (t: string, f: (q: any) => any = q => q) => { const r = await f(db.from(t).select('*', { count: 'exact', head: true })); return r.error ? `ERR ${r.error.message}` : r.count }
for (const g of ['boys', 'girls']) for (const s of [2026, 2027]) {
  console.log(g, s, {
    coaches: await n(`${g}_coaches`, q => q.eq('season_id', s)),
    conferences: await n(`${g}_school_conferences`, q => q.eq('season_id', s)),
    districts: await n(`${g}_school_districts`, q => q.eq('season_id', s)),
    regions: await n(`${g}_school_regions`, q => q.eq('season_id', s)),
    inactive: await n('inactive_school_seasons', q => q.eq('season_id', s).eq('gender', g === 'boys' ? 'M' : 'F')),
    season_names: await n('school_season_names', q => q.eq('season_id', s)),
  })
}
console.log('profiles', await n('boys_school_profiles'), await n('girls_school_profiles'))
const { data } = await db.from('school_season_names').select('*').limit(2); console.log(data)
