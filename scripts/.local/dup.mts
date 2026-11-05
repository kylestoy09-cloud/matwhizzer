import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts')
let dupTotal = 0; const perDist: string[] = []; const c3Counts = new Map<number, number>()
for (const t of ts!) {
  const { data: m } = await db.from('matches').select('id, weight_class_id, round, winner_entry_id, loser_entry_id').eq('tournament_id', t.id)
  const seen = new Map<string, number>(); let dups = 0
  for (const x of m!) { const k = `${x.weight_class_id}|${x.round}|${x.winner_entry_id}|${x.loser_entry_id}`; const n = (seen.get(k) ?? 0) + 1; seen.set(k, n); if (n > 1) dups++ }
  dupTotal += dups; if (dups) perDist.push(`${t.name.replace("Girl_s Districts ", '')}: ${dups}`)
  const c3 = new Map<number, Set<string>>()
  for (const x of m!) if (x.round === 'C3') { const s = c3.get(x.weight_class_id) ?? new Set(); s.add(`${x.winner_entry_id}|${x.loser_entry_id}`); c3.set(x.weight_class_id, s) }
  for (const s of c3.values()) c3Counts.set(s.size, (c3Counts.get(s.size) ?? 0) + 1)
}
console.log('duplicate bout rows in girls 2025-26 districts:', dupTotal, perDist.join(', '))
console.log('distinct C3 bouts per weight bracket → how many brackets:', JSON.stringify([...c3Counts].sort()))
