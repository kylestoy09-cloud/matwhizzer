import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const g of ['M', 'F']) {
  const oos = new Set<string>()
  for (let f = 0; ; f += 1000) { const { data } = await db.from('wrestlers').select('id').eq('gender', g).eq('is_oos', true).order('id').range(f, f + 999); for (const r of data ?? []) oos.add(r.id); if ((data ?? []).length < 1000) break }
  const log: any[] = []
  for (let last: string | null = null; ;) { let q = db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_source, pre_match_hammer, is_winner').eq('season', '2025-26').eq('gender', g).gte('match_date', '2025-07-01').order('id').limit(1000); if (last) q = q.gt('id', last); const { data } = await q; log.push(...(data ?? [])); if (!data || data.length < 1000) break; last = data[data.length - 1].id }
  const vsOos = log.filter(r => !r.opponent_wrestler_id || oos.has(r.opponent_wrestler_id))
  const top = vsOos.filter(r => r.pre_match_hammer >= 60)
  const kids = new Set(vsOos.map(r => r.wrestler_id)), topKids = new Set(top.map(r => r.wrestler_id))
  console.log(`${g}: OOS wrestlers on file ${oos.size} | NJ bouts 2025-26 ${log.length} | vs out-of-state ${vsOos.length} (${(100 * vsOos.length / log.length).toFixed(1)}%) by ${kids.size} NJ kids | by NJ kids rated 60+: ${top.length} bouts, ${topKids.size} kids | sources ${JSON.stringify(vsOos.reduce((a: any, r: any) => (a[r.match_source] = (a[r.match_source] ?? 0) + 1, a), {}))}`)
}
