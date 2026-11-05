import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['girls_schools','girls_school_profiles','schools','school_coop_members','coop_memberships','school_season_names']) {
  const r = await db.from(t).select('*').limit(1); console.log(t, r.error?.message ?? Object.keys(r.data?.[0] ?? {}).join(','))
}
const ids=[56,87,78,64,4,18,24,76,314,287,267]
console.log(JSON.stringify((await db.from('girls_schools').select('*').in('school_id', ids)).data))
console.log(JSON.stringify((await db.from('schools').select('id,display_name,is_combined').in('id', [56,87,78,64])).data))
