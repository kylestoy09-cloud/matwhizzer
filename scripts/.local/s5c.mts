import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tb = (await db.from('tournament_bouts_girls').select('wrestler1_school_id, wrestler2_school_id, wrestler1_school_raw, wrestler2_school_raw').or('wrestler1_school_id.eq.122,wrestler2_school_id.eq.122')).data ?? []
const raws = new Map<string, number>(); for (const b of tb as any[]) { const r = b.wrestler1_school_id === 122 ? b.wrestler1_school_raw : b.wrestler2_school_raw; raws.set(r, (raws.get(r) ?? 0) + 1) }
console.log('girls tournament bout sides on Newark East Side, by school name on the sheet:', JSON.stringify([...raws]))
const dm = (await db.from('dual_meets_girls').select('id, meet_date, team1_school_name_raw, team2_school_name_raw, team1_school_id, team2_school_id').or('team1_school_id.eq.122,team2_school_id.eq.122')).data ?? []
console.log('girls duals on Newark East Side:', JSON.stringify(dm.map((m: any) => `${m.meet_date} "${m.team1_school_id === 122 ? m.team1_school_name_raw : m.team2_school_name_raw}"`)))
