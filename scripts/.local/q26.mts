import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['F', 'M']) {
  const rows = JSON.parse(fs.readFileSync(`/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/pp_new_${g}.json`, 'utf8'))
  const { data } = await db.from('power_points_computed').select('school_id, power_points, meets_counted').eq('season_id', 2026).eq('gender', g)
  const cur = new Map((data ?? []).map(r => [r.school_id, r]))
  let diff = 0; for (const r of rows) { const c = cur.get(r.school_id); if (!c || Number(c.power_points) !== Number(r.power_points) || c.meets_counted !== r.meets_counted) diff++ }
  console.log(g, 'rows', rows.length, 'stored', cur.size, 'differ', diff)
}
