// Dual bouts whose two wrestlers are on each other's side: the team points go to one team
// but the recorded winner sits on the other team's side (an early dual import put the
// winner on side B). The schools, points and winner are right; the wrestlers (id + raw
// name) swap sides. Dry run by default; --apply backs the rows up first.
// Run: npx tsx --tsconfig tsconfig.json scripts/fix_dual_wrestler_sides.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')
const backup: Record<string, unknown[]> = {}
for (const table of ['dual_meet_matches', 'dual_meet_matches_girls']) {
  const rows: any[] = []
  for (let f = 0; ; f += 1000) {
    const { data, error } = await db.from(table).select('*').order('id').range(f, f + 999)
    if (error) throw error
    rows.push(...(data ?? [])); if (!data || data.length < 1000) break
  }
  const bad = rows.filter(r => r.winner_id && ((r.team1_points > 0 && r.winner_id === r.wrestler_b_id) || (r.team2_points > 0 && r.winner_id === r.wrestler_a_id)))
  backup[table] = bad
  console.log(`${table}: ${bad.length} bouts to swap`)
  if (!apply) continue
  fs.writeFileSync(`docs/migrations/backups/20261101_dual_wrestler_sides_before_${table}.json`, JSON.stringify(bad))
  for (const r of bad) {
    // Only if the row is still as read (an empty side is NULL)
    let q = db.from(table).update({
      wrestler_a_id: r.wrestler_b_id, wrestler_a_name_raw: r.wrestler_b_name_raw,
      wrestler_b_id: r.wrestler_a_id, wrestler_b_name_raw: r.wrestler_a_name_raw,
    }).eq('id', r.id)
    q = r.wrestler_a_id ? q.eq('wrestler_a_id', r.wrestler_a_id) : q.is('wrestler_a_id', null)
    const { data: done, error } = await q.select('id')
    if (error) throw error
    if (!done?.length) console.log(`  skipped ${r.id}: changed since read`)
  }
}
