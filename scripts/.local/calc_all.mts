import { createClient } from '@supabase/supabase-js'
import { calcTeamScores } from '../../src/lib/playoffHistory/load'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [g, y] of [...[2019, 2020, 2021, 2022, 2023, 2024].map(y => ['F', y]), ...Array.from({ length: 12 }, (_, i) => ['M', 2013 + i])] as ['M' | 'F', number][]) {
  try { const r = await calcTeamScores(db as never, g, y); console.log(g, y, r.tournaments, 'events,', r.schools, 'school totals') } catch (e) { console.log(g, y, 'FAILED', (e as Error).message) }
}
