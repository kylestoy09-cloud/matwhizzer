import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/pp_new_M.json', 'utf8'))
const { data } = await db.from('power_points_computed').select('school_id, power_points, meets_counted, overall_wins, overall_losses, computed_at').eq('season_id', 2026).eq('gender', 'M')
const cur = new Map((data ?? []).map(r => [r.school_id, r]))
console.log('stored computed_at', [...new Set((data ?? []).map(r => r.computed_at.slice(0, 10)))])
let mc = 0, wl = 0, ppOnly = 0
for (const r of rows) { const c = cur.get(r.school_id); if (!c) continue
  if (c.meets_counted !== r.meets_counted) mc++
  if (c.overall_wins !== r.overall_wins || c.overall_losses !== r.overall_losses) wl++
  else if (Number(c.power_points) !== Number(r.power_points)) ppOnly++ }
console.log({ meetsCountedDiffer: mc, recordDiffer: wl, ppDifferSameRecord: ppOnly })
