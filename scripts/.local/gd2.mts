import { createClient } from '@supabase/supabase-js'
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
for (const [d, w] of [[1, 120], [9, 145]]) {
  const { data } = await anon.rpc('district_bracket', { p_district: d, p_weight: w, p_gender: 'F', p_season: 2026 })
  console.log(`== D${d} ${w}`)
  for (const r of (data as any[]).sort((a, b) => a.bracket_side.localeCompare(b.bracket_side) || a.round.localeCompare(b.round))) console.log(r.bracket_side.padEnd(13), r.round.padEnd(4), `${r.winner_seed ?? '-'} ${r.winner_name} (${r.winner_school_name})`, 'beat', `${r.loser_seed ?? '-'} ${r.loser_name ?? 'BYE'} (${r.loser_school_name ?? ''})`, r.win_type)
}
