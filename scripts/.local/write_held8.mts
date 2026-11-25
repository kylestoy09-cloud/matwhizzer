// Kyle 2026-11-13: the Mobbin weights are right ("that is 150"), so the 8 held moves follow the rule too.
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = JSON.parse(readFileSync('docs/migrations/backups/20261113_projected_weights_v2.json', 'utf8')).filter((r: any) => !r.sure)
for (const r of rows) {
  const { error } = await db.from('wrestlers').update({ projected_weight_class: r.pick }).eq('id', r.wrestler_id); if (error) throw error
  if (r.has_row) { const { error: e2 } = await db.from('wrestler_hammer_scores').update({ weight_class: String(r.pick) }).eq('season', '2026-27').eq('wrestler_id', r.wrestler_id); if (e2) throw e2 }
  console.log(`${r.name}: ${r.last_2025_26} → ${r.pick}`)
}
