import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const a = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_five_and_links_before.json', 'utf8'))
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_split_six_before.json', 'utf8'))
const all = { ...a, ...b }
let rated = 0, seniorRated = 0, n = 0
for (const k of Object.keys(all).filter(k => !k.includes(' '))) { n++; const nw = all[`${k} new`]
  rated += ((await db.from('wrestler_hammer_scores').select('wrestler_id').eq('wrestler_id', nw).eq('season', '2025-26')).data ?? []).length ? 1 : 0
  seniorRated += ((await db.from('wrestler_hammer_scores').select('wrestler_id').eq('wrestler_id', k).eq('season', '2025-26')).data ?? []).length ? 1 : 0 }
console.log(`new 2025-26 wrestlers with a 2025-26 rating: ${rated}/${n} | seniors with a 2025-26 rating: ${seniorRated}/${n}`)
await db.rpc('log_admin_activity', { p_admin_email: 'kyle.stoy09@gmail.com', p_action: 'scoring_run', p_entity_type: 'wrestler_hammer_scores', p_entity_id: null, p_details: { gender: 'M', season: '2025-26 (archive) and 2026-27', note: 'local runs after splitting 11 senior profiles and the boys active rule 2026-11-05' } })
