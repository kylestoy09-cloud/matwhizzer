import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const tables = ['tournaments', 'tournament_entries', 'matches', 'wrestlers', 'schools', 'dual_meets', 'dual_meet_matches', 'in_season_tournaments', 'tournament_bouts']

async function main() {
  for (const t of tables) {
    const { error } = await db.from(t).select('id').limit(1)
    console.log(`${t.padEnd(28)} ${error ? '✗ ' + error.message : '✓ ok'}`)
  }
}

main().catch(console.error)
