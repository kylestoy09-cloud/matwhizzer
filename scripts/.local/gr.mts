import { createClient } from '@supabase/supabase-js'
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const W = [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
const sides = (rows: any[], pre: string[]) => { let n = 0, z = 0; for (const r of rows) for (const s of pre) { const wid = r[`${s}wrestler_id`]; if (!wid) continue; n++; if (r[`${s}school_id`] == null) z++ } return [n, z] }
for (const season of [2025, 2026]) {
  const out: string[] = []
  for (const reg of ['1', '2', '3', '4']) for (const w of W) {
    const b = (await anon.rpc('girls_region_bracket', { p_region: reg, p_weight: w, p_season: season })).data as any[]
    const e = (await anon.rpc('girls_region_bracket_entries_v2', { p_region: reg, p_weight: w, p_season: season })).data as any[]
    const [n1, z1] = sides(b ?? [], ['winner_', 'loser_']); const [n2, z2] = sides(e ?? [], [''])
    if (z1 || z2) out.push(`R${reg}/${w}: bracket ${z1}/${n1}, entries ${z2}/${n2}`)
  }
  let st = ''
  for (const w of W) { const b = (await anon.rpc('state_bracket', { p_weight: w, p_gender: 'F', p_season: season })).data as any[]; const [n, z] = sides(b ?? [], ['winner_', 'loser_']); if (z) st += ` ${w}:${z}/${n}` }
  console.log(`season ${season} girls regions missing schools: ${out.length ? out.join(' | ') : 'none'}; state: ${st || 'none'}`)
}
