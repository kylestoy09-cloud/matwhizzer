import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: ts } = await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'F').eq('season_id', 2026).in('tournament_type', ['districts', 'girls_regions'])
const stats = { districts: [0, 0, 0, 0], girls_regions: [0, 0, 0, 0] } as Record<string, number[]>  // schools, exact, within 2, total abs diff
const samples: string[] = []
for (const t of ts!) {
  const { data: off } = await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)
  const d = t.name.match(/District (\d+)/), r = t.name.match(/Regions r(\d)/)
  const calc = d ? (await db.rpc('district_team_score', { p_district: Number(d[1]), p_gender: 'F', p_season: 2026 })).data as any[]
    : (await db.rpc('girls_region_team_score', { p_region: r![1], p_season: 2026 })).data as any[]
  const C = new Map(calc.map(x => [x.school_id, Number(x.total_points)]))
  for (const o of off!) {
    if (Number(o.total_points) <= 0) continue
    const s = stats[t.tournament_type], c = C.get(o.school_id) ?? 0, diff = c - Number(o.total_points)
    s[0]++; if (Math.abs(diff) < 0.01) s[1]++; if (Math.abs(diff) <= 2) s[2]++; s[3] += Math.abs(diff)
    if (samples.length < 14 && Math.abs(diff) >= 0.01 && /District (1|9)$|r1$/.test(t.name)) samples.push(`${t.name.replace("Girl_s ", '')} school ${o.school_id}: official ${o.total_points}, calc ${c} (${diff > 0 ? '+' : ''}${diff.toFixed(1)})`)
  }
}
for (const [k, [n, ex, w2, ad]] of Object.entries(stats)) console.log(`${k}: ${n} schools, exact ${ex} (${(100 * ex / n).toFixed(0)}%), within 2 pts ${w2}, avg miss ${(ad / n).toFixed(1)} pts`)
console.log(samples.join('\n'))
