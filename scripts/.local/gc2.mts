import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = 269
const meets = (await db.from('dual_meets').select('id').eq('season_id', 2026).eq('gender', 'M').or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).data!.map((m: any) => m.id)
const b = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id, school_a_id, school_b_id, result_type, is_forfeit_win, is_double_forfeit, winner_id').in('dual_meet_id', meets)).data!
const t: Record<string, number> = {}
for (const x of b as any[]) { const mine = x.school_a_id === id ? x.wrestler_a_id : x.school_b_id === id ? x.wrestler_b_id : 'x'; if (mine === null) { const k = `${x.result_type}${x.is_forfeit_win ? ' forfeit' : ''}${x.is_double_forfeit ? ' double' : ''}`; t[k] = (t[k] ?? 0) + 1 } }
console.log('Gloucester Catholic sides with no wrestler, by result:', JSON.stringify(t))
const w = (await db.from('wrestlers').select('*').eq('first_name', 'Luke').eq('last_name', 'Goss')).data
console.log('Luke Goss:', JSON.stringify(w?.map((x: any) => ({ active: x.is_active, grade: x.grade, grad: x.graduation_year, created: x.created_at, src: x.grade_confirmed_source }))))
