import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
const r = await anon.rpc('lb_gp_team_points', { p_pool: 'state', p_season: 2026 }); console.log('lb_gp_team_points:', r.error?.message ?? (r.data as any[]).length)
const csv = fs.readFileSync('../source_of_truth_team_scores.csv', 'utf8').trim().split('\n').slice(1).map(l => { const p = l.split(','); return { t: p[0], s: p[2], g: p[3], name: p[4], pts: Number(p[5]) } })
const { data: ts } = await svc.from('tournaments').select('id, name, season_id').eq('gender', 'F').eq('season_id', 2026)
const { data: schools } = await svc.from('schools').select('id, display_name')
const sn = new Map(schools!.map(s => [s.id, s.display_name]))
let tot = 0, match = 0, calcMatch = 0; const off: string[] = []
for (const t of ts!) {
  const { data: cache } = await svc.from('precomputed_team_scores').select('school_id, school_name, total_points').eq('tournament_id', t.id)
  const off_ = csv.filter(c => c.t === t.name && c.s === '2' && c.g === 'F')
  let calc: any[] = []
  const d = t.name.match(/District (\d+)/), rg = t.name.match(/Regions r(\d)/)
  if (d) calc = (await anon.rpc('district_team_score', { p_district: Number(d[1]), p_gender: 'F', p_season: 2026 })).data as any[]
  else if (rg) calc = (await anon.rpc('girls_region_team_score', { p_region: rg[1], p_season: 2026 })).data as any[]
  for (const c of cache!) {
    const o = off_.find(x => x.name === c.school_name || x.name === sn.get(c.school_id))
    if (!o) continue
    tot++; if (Math.abs(o.pts - Number(c.total_points)) < 0.01) match++; else off.push(`${t.name}: ${sn.get(c.school_id)} cache ${c.total_points} official ${o.pts}`)
    const k = calc?.find(x => x.school_id === c.school_id); if (k && Math.abs(Number(k.total_points) - o.pts) < 0.01) calcMatch++
  }
}
console.log(`girls 2025-26 schools found in official file: ${tot}; cache matches official: ${match}; calculation matches official: ${calcMatch}`)
console.log(off.join('\n'))
