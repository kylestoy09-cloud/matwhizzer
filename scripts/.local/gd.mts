import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts')
const rounds = new Map<string, number>()
for (const t of ts!) { const { data: m } = await db.from('matches').select('round, bracket_side').eq('tournament_id', t.id); for (const x of m!) rounds.set(`${x.bracket_side}:${x.round}`, (rounds.get(`${x.bracket_side}:${x.round}`) ?? 0) + 1) }
console.log('girls 2025-26 district bouts by round:', JSON.stringify([...rounds].sort()))
// per district: how many rows from the bracket function have no school
let tot = 0, noSch = 0; const byD: string[] = []
for (let d = 1; d <= 12; d++) for (const w of [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]) {
  const { data, error } = await anon.rpc('district_bracket', { p_district: d, p_weight: w, p_gender: 'F', p_season: 2026 })
  if (error) { console.log(error.message); process.exit(1) }
  let n = 0, z = 0
  for (const r of data as any[]) for (const s of ['winner', 'loser']) if (r[`${s}_wrestler_id`]) { n++; if (r[`${s}_school_id`] == null || !r[`${s}_school_name`]) z++ }
  tot += n; noSch += z; if (z) byD.push(`D${d}/${w}: ${z}/${n}`)
}
console.log(`district_bracket sides ${tot}, without a school ${noSch}`); console.log(byD.slice(0, 30).join('  '))
