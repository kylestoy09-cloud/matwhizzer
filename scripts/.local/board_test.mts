import { hubLeaderboard } from '../../src/lib/hubLeaderboard'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F'] as const) {
  const { rows } = await hubLeaderboard(db as any, g, 'offseason', { season: 2026, onlyNj: true, sex: null })
  const e = rows.filter(r => r.wrestler?.school && r.class_year && [2027, 2028, 2029].includes(r.class_year) && (r.score > 0 || r.notable.length)).sort((a, b) => b.score - a.score)
  console.log(g, 'on the board', e.length, '| top:', e.slice(0, 8).map(r => `${r.wrestler!.name} (${r.wrestler!.school}, ${r.class_year}) ${r.weight}`).join('; '))
}
