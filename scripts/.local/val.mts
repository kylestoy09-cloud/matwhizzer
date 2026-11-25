import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tids = (await db.from('tournaments').select('id').eq('gender', 'M').in('season_id', [2025, 2026]).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!.map((t: any) => t.id)
console.log('boys postseason bouts not validated:', (await db.from('matches').select('id', { count: 'exact', head: true }).in('tournament_id', tids).or('validated.is.null,validated.eq.false')).count)
