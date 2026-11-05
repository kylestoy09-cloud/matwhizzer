import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')
const targets = [{ d: 5 }, { d: 9 }]
for (const { d } of targets) {
  const { data: t } = await db.from('tournaments').select('id, name').eq('name', `Girl_s Districts District ${d}`).eq('season_id', 2026).single()
  const { data: cache, error } = await db.from('precomputed_team_scores').select('*').eq('tournament_id', t!.id)
  if (error) throw error
  const { data: live } = await db.rpc('district_team_score', { p_district: d, p_gender: 'F', p_season: 2026 })
  const L = new Map((live as any[]).map(r => [r.school_id, Number(r.total_points)]))
  const diffs = cache!.filter(c => L.get(c.school_id) !== Number(c.total_points)).map(c => `${c.school_name} ${c.total_points}→${L.get(c.school_id)}`)
  console.log(t!.name, 'cache rows', cache!.length, 'live', L.size, 'differ:', diffs.join(', ') || 'none', '| cols', Object.keys(cache![0]).join(','))
  if (!apply || !diffs.length) continue
  fs.writeFileSync(`docs/migrations/backups/20261102_girls_d${d}_team_score_cache_before.json`, JSON.stringify(cache, null, 1))
  for (const c of cache!) { const v = L.get(c.school_id); if (v != null && v !== Number(c.total_points)) { const { error: e } = await db.from('precomputed_team_scores').update({ total_points: v }).eq('id', c.id).select('id'); if (e) throw e } }
  console.log('  updated')
}
