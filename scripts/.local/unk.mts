import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const unk = (await db.from('wrestlers').select('id, gender').eq('first_name', 'Unknown')).data!
for (const u of unk) {
  const [boutT, tbT] = u.gender === 'F' ? ['dual_meet_matches_girls', 'tournament_bouts_girls'] : ['dual_meet_matches', 'tournament_bouts']
  const d = (await db.from(boutT).select('school_a_id, school_b_id, wrestler_a_id').or(`wrestler_a_id.eq.${u.id},wrestler_b_id.eq.${u.id}`)).data ?? []
  const t = (await db.from(tbT).select('wrestler1_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_id.eq.${u.id},wrestler2_id.eq.${u.id}`)).data ?? []
  const schools = new Set([...d.map((b: any) => b.wrestler_a_id === u.id ? b.school_a_id : b.school_b_id), ...t.map((b: any) => b.wrestler1_id === u.id ? b.wrestler1_school_id : b.wrestler2_school_id)])
  console.log(u.gender, u.id.slice(0, 8), 'dual bouts', d.length, 'tournament bouts', t.length, 'schools', schools.size)
}
