import { createClient } from '@supabase/supabase-js'
import { deletePreview } from '../../src/lib/wrestlerDelete'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('existing inactive rows 2026 for the five:', JSON.stringify((await db.from('inactive_school_seasons').select('*').in('school_id', [13, 297, 253, 43, 191]).eq('season_id', 2026)).data))
const G = '031c6969-58e6-40f1-a217-500a2ff42ae5'
console.log('Gabriel (girls) preview:', JSON.stringify(await deletePreview(db as never, G)))
console.log(JSON.stringify((await db.from('dual_meet_matches_girls').select('id, dual_meet_id, weight_class, wrestler_a_id, wrestler_b_id, winner_id, result_type').or(`wrestler_a_id.eq.${G},wrestler_b_id.eq.${G}`)).data))
