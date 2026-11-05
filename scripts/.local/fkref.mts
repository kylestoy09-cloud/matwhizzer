import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_girls_duplicate_profiles_before.json', 'utf8'))
for (const p of b.pairs) {
  const { data } = await db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, season').eq('opponent_wrestler_id', p.from)
  console.log(p.who, '| rating-log rows naming her as the opponent:', data!.length, JSON.stringify([...new Set(data!.map(r => r.season))]))
}
