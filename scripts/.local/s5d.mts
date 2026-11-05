import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const sch = new Map((await db.from('schools').select('id, display_name, county').limit(2000)).data!.map((s: any) => [s.id, s]))
const dm = (await db.from('dual_meets_girls').select('id, meet_date, team1_school_id, team2_school_id').or('team1_school_id.eq.122,team2_school_id.eq.122').order('meet_date')).data ?? []
for (const m of dm as any[]) {
  const opp = sch.get(m.team1_school_id === 122 ? m.team2_school_id : m.team1_school_id)
  const b = (await db.from('dual_meet_matches_girls').select('school_a_id, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw').eq('dual_meet_id', m.id)).data ?? []
  const es = b.map((x: any) => x.school_a_id === 122 ? x.wrestler_a_name_raw : x.wrestler_b_name_raw).filter(Boolean)
  console.log(`${m.meet_date} vs ${opp?.display_name} [${opp?.county}] | East Side wrestlers: ${[...new Set(es)].join(', ') || '(none named)'}`)
}
// where else do those East Side wrestlers wrestle?
