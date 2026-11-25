// Kyle 2026-11-13: "add brawl at the beach to the off season tournaments - middle school and hs for boys and girls".
// Level, date and place left for Kyle (Edit details) — no source found for them.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [table, hub, name] of [['boys_hub_tournaments', 'offseason', 'Brawl at the Beach'], ['girls_hub_tournaments', 'offseason', 'Brawl at the Beach'], ['mixed_hub_tournaments', 'ms', 'Brawl at the Beach (MS Division)']]) {
  const { data: have } = await db.from(table).select('id').eq('name', name).maybeSingle()
  if (have) { console.log(table, 'already there'); continue }
  const { data, error } = await db.from(table).insert({ hub, name, format: 'Folkstyle Individual', in_state: 'In state', is_active: true, sort_order: 100 }).select('id, name').single()
  if (error) throw error
  console.log(table, 'added', data)
}
