import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ts = (await db.from('tournaments').select('id, name').eq('gender', 'M').in('season_id', [2025, 2026]).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!
const dupBouts: string[] = []; const dupPl: string[] = []; const plWhere: Record<string, number> = {}
for (const t of ts as any[]) {
  const ms = (await db.from('matches').select('id, round, weight_class_id, winner_entry_id, loser_entry_id').eq('tournament_id', t.id).order('id').limit(5000)).data!
  const seen = new Set<string>()
  for (const m of ms) { if (!m.winner_entry_id || !m.loser_entry_id) continue; const k = `${m.weight_class_id}|${m.round}|${m.winner_entry_id}|${m.loser_entry_id}`; if (seen.has(k)) dupBouts.push(m.id); else seen.add(k) }
  const pl = (await db.from('placements').select('id, weight_class_id, place, entry_id').eq('tournament_id', t.id).order('id')).data!
  const ps = new Set<string>()
  for (const p of pl) { const k = `${p.weight_class_id}|${p.place}|${p.entry_id}`; if (ps.has(k)) { dupPl.push(p.id); plWhere[t.name] = (plWhere[t.name] ?? 0) + 1 } else ps.add(k) }
}
const refs = dupBouts.length ? (await db.from('wrestler_match_score_log').select('id', { count: 'exact', head: true }).in('source_id', dupBouts)).count : 0
console.log(`duplicate bouts: ${dupBouts.length}; rating-log rows pointing at them: ${refs}`)
console.log(`duplicate placement rows (same weight, place and wrestler): ${dupPl.length}`, JSON.stringify(plWhere))
