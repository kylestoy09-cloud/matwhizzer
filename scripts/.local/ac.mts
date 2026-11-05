import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const rows = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, weight_class, status, school_id, school_name_raw, season_id, wrestler_id').eq('gender', 'M').ilike('first_name_raw', 'antonio%').ilike('last_name_raw', '%cruz%')).data ?? []
for (const r of rows) console.log(`Track: ${r.first_name_raw} | ${r.last_name_raw} ${r.grade} ${r.weight_class} @ ${names.get(r.school_id) ?? `(unmatched "${r.school_name_raw}")`} ${r.status} season ${r.season_id} linked ${r.wrestler_id?.slice(0, 8) ?? '-'}`)
const ad = (await db.from('wrestlers').select('id').like('id', 'da811bba%')).data
const id = (await db.from('wrestlers').select('id').eq('first_name', 'Antonio').eq('last_name', 'Cruz').eq('gender', 'M')).data!.map((w: any) => w.id).find((x: string) => x.startsWith('da811bba'))!
const d = (await db.from('dual_meet_matches').select('school_a_id, school_b_id, wrestler_a_id, dual_meets(meet_date)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
console.log('profile da811bba 2025-26 duals for:', JSON.stringify([...new Set(d.map((b: any) => names.get(b.wrestler_a_id === id ? b.school_a_id : b.school_b_id)))]), d.length, 'bouts')
void ad
