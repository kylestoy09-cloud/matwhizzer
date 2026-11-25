// Placements for the loaded Playoff History seasons (Kyle 2026-11-14 hidden-year review: no State Champions on those
// years' playoff pages — the placements table only had the live seasons). Runs buildPlacements (src/lib/playoffHistory/
// load.ts, which Load now runs too) for every loaded season: 1st–8th from the placing bouts. Add-only; the new ids are
// kept in docs/migrations/backups/20261114_history_placements_added.json.
//   npx tsx --env-file=.env.local scripts/history_placements_20261114.mts
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { buildPlacements } from '../src/lib/playoffHistory/load'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: seasons, error } = await db.from('playoff_history_seasons').select('season_id, gender, status').eq('status', 'loaded').order('gender').order('season_id')
if (error) throw error
const F = 'docs/migrations/backups/20261114_history_placements_added.json'
const added: string[] = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : []
for (const s of seasons ?? []) {
  const r = await buildPlacements(db as never, s.gender, s.season_id)
  added.push(...r.ids)
  fs.writeFileSync(F, JSON.stringify(added))
  console.log(`${s.gender} ${s.season_id}: ${r.rows} placements${r.skipped.length ? `; skipped ${r.skipped.join('; ')}` : ''}`)
}
console.log('total added', added.length)
