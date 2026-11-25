import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const r = await db.rpc('district_wrestler_points', { p_district: 8, p_gender: 'M', p_season: 2026 })
if (r.error) console.log(r.error.message)
const fl = (r.data ?? []).filter((x: any) => /fort lee/i.test(JSON.stringify(x)))
console.log(JSON.stringify(fl.map((x: any) => Object.fromEntries(Object.entries(x).filter(([k]) => !/id$/.test(k))))))
console.log('sum', fl.reduce((a: number, x: any) => a + Number(x.total_points ?? x.points ?? 0), 0))
