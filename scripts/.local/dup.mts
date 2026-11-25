import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ts = (await db.from('tournaments').select('id, name').eq('gender', 'M').in('season_id', [2025, 2026]).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!
let dups = 0; const where: Record<string, number> = {}
for (const t of ts as any[]) {
  const ms = (await db.from('matches').select('round, weight_class_id, winner_entry_id, loser_entry_id').eq('tournament_id', t.id).limit(5000)).data!
  const seen = new Map<string, number>(); for (const m of ms) { if (!m.winner_entry_id || !m.loser_entry_id) continue; const k = `${m.weight_class_id}|${m.round}|${m.winner_entry_id}|${m.loser_entry_id}`; seen.set(k, (seen.get(k) ?? 0) + 1) }
  for (const [, c] of seen) if (c > 1) { dups += c - 1; where[t.name] = (where[t.name] ?? 0) + c - 1 }
}
console.log('duplicate bout copies (same round, same two wrestlers):', dups, JSON.stringify(where))
