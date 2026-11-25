import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tids = (await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026).eq('tournament_type', 'districts')).data!.map((t: any) => t.id)
const ms = (await db.from('matches').select('forfeit_opponent, loser_entry_id').in('tournament_id', tids).limit(5000)).data!
console.log('filler', ms.filter((m: any) => m.forfeit_opponent === 'filler').length, '| empty', ms.filter((m: any) => m.forfeit_opponent === 'empty').length, '| no loser and unmarked', ms.filter((m: any) => !m.loser_entry_id && !m.forfeit_opponent).length)
