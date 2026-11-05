import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_duplicates_before.json', 'utf8'))
const r = await db.from('wrestler_hammer_scores').select('wrestler_id, season, gender').in('wrestler_id', b.pairs.map((p: any) => p.into))
console.log('rating query error:', r.error?.message ?? 'none', '| kept profiles rated:', new Set((r.data ?? []).map((x: any) => x.wrestler_id)).size, '/', b.pairs.length, JSON.stringify(Object.entries((r.data ?? []).reduce((m: any, x: any) => (m[`${x.gender} ${x.season}`] = (m[`${x.gender} ${x.season}`] ?? 0) + 1, m), {}))))
const unrated = b.pairs.filter((p: any) => !(r.data ?? []).some((x: any) => x.wrestler_id === p.into)).map((p: any) => p.who)
console.log('not rated:', unrated.join('; '))
const left = []
for (const p of b.pairs) { const x = (await db.from('wrestler_match_score_log').select('season, gender').eq('opponent_wrestler_id', p.from)).data ?? []; if (x.length) left.push(`${p.who}: ${JSON.stringify(Object.entries(x.reduce((m: any, y: any) => (m[`${y.gender} ${y.season}`] = (m[`${y.gender} ${y.season}`] ?? 0) + 1, m), {})))}`) }
console.log('opponent rows left:', left.join(' | '))
