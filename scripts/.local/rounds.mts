import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const t of ['tournament_bouts', 'tournament_bouts_girls', 'matches']) {
  const c: Record<string, number> = {}
  for (let i = 0; ; i += 1000) { const { data, error } = await db.from(t).select('id, round').order('id').range(i, i + 999); if (error) throw error; for (const r of data!) c[r.round ?? 'null'] = (c[r.round ?? 'null'] ?? 0) + 1; if (data!.length < 1000) break }
  console.log(t, JSON.stringify(c))
}
const { data: cal } = await db.from('season_calendar').select('season_id, event_type, event_date').in('season_id', [2026]).like('event_type', 'individual_%')
console.log(JSON.stringify(cal))
