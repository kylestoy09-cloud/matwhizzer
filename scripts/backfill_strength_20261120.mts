// Fill the strength rating for 2025-26 (review 2026-11-20): every tracked bout's strengths going in (a_strength /
// b_strength, earlier days only) and each wrestler's season-end strength (wrestler_strength), from the WRR match log
// through src/lib/strengthRating.ts — the same code the tracker uses from now on. Only empty strengths are filled.
// Needs docs/migrations/20261120_strength_rating.sql. Dry run unless --apply.
//   npx tsx scripts/backfill_strength_20261120.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { runStrength, type StrengthLogRow } from '../src/lib/strengthRating'
const APPLY = process.argv.includes('--apply')
const SEASON = '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => any): Promise<T[]> { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); out.push(...data); if (data.length < 1000) break } return out }
const { error: colErr } = await db.from('match_projections').select('a_strength').limit(1)
if (colErr) throw new Error(`run docs/migrations/20261120_strength_rating.sql first (${colErr.message})`)
for (const g of ['M', 'F'] as const) {
  const log = (await all<any>(f => db.from('wrestler_match_score_log').select('id, wrestler_id, opponent_wrestler_id, match_date, outcome_rank, pre_match_hammer').eq('gender', g).eq('season', SEASON).gte('match_date', `${SEASON.slice(0, 4)}-08-01`).order('id').range(f, f + 999))).map(r => ({ ...r, pre_match_hammer: Number(r.pre_match_hammer) })) as StrengthLogRow[]
  const st = runStrength(log)
  const rows = await all<any>(f => db.from('match_projections').select('id, match_date, wrestler_a_id, wrestler_b_id, a_strength').eq('gender', g).eq('season', SEASON).order('id').range(f, f + 999))
  const todo = rows.filter(r => r.a_strength == null)
  console.log(`${g === 'M' ? 'Boys' : 'Girls'}: ${rows.length} tracked bouts, ${todo.length} without strength; ${st.final.size} wrestlers' season-end strength`)
  if (!APPLY) continue
  let done = 0
  const pool = async () => { while (todo.length) { const r = todo.pop()!; const { error } = await db.from('match_projections').update({ a_strength: Math.round(st.before(r.wrestler_a_id, r.match_date) * 100) / 100, b_strength: Math.round(st.before(r.wrestler_b_id, r.match_date) * 100) / 100 }).eq('id', r.id); if (error) throw new Error(`${r.id}: ${error.message}`); done++ } }
  await Promise.all(Array.from({ length: 30 }, pool))
  const now = new Date().toISOString()
  const fin = [...st.final].map(([wrestler_id, v]) => ({ wrestler_id, season: SEASON, gender: g, strength: Math.round(v.strength * 100) / 100, bouts: v.bouts, updated_at: now }))
  for (let i = 0; i < fin.length; i += 1000) { const { error } = await db.from('wrestler_strength').upsert(fin.slice(i, i + 1000), { onConflict: 'wrestler_id,season' }); if (error) throw new Error(error.message) }
  console.log(`  filled ${done} bouts, ${fin.length} season-end strengths`)
}
console.log(APPLY ? 'done' : 'dry run')
