import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_duplicates_before.json', 'utf8'))
let opp = 0, own = 0; for (const p of b.pairs) { opp += (await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('opponent_wrestler_id', p.from)).count ?? 0; own += (await db.from('wrestler_match_score_log').select('*', { count: 'exact', head: true }).eq('wrestler_id', p.from)).count ?? 0 }
console.log('rating log rows still naming a merged-away profile: as opponent', opp, '| own', own)
const rated = (await db.from('wrestler_hammer_scores').select('wrestler_id, updated_at, created_at').in('wrestler_id', b.pairs.map((p: any) => p.into))).data ?? []
console.log('kept profiles with a rating:', rated.length, '/', b.pairs.length, '| sample timestamps', JSON.stringify(rated.slice(0, 3).map((r: any) => r.updated_at ?? r.created_at)))
for (const g of ['F', 'M']) { const l = (await db.from('admin_activity_log').select('created_at').eq('action', 'scoring_run').order('created_at', { ascending: false }).limit(1)).data; void g; console.log('last logged run', l?.[0]?.created_at) ; break }
