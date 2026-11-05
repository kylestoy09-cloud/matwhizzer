import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// TrackWrestling standings: "<rank>\t<team> \t<points>" right after each "District N" / "Region N" line
const stand = new Map<string, { team: string; pts: number }[]>()
for (const [file, key] of [['../gt_s2_girls_districts.txt', 'District'], ['../gt_s2_girls_regions.txt', 'Region']] as const) {
  let cur = ''
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const h = line.match(new RegExp(`^${key} (\\d+)$`)); if (h) { cur = `${key} ${h[1]}`; if (!stand.has(cur)) stand.set(cur, []); continue }
    const m = line.match(/^\d+\t(.+?)\s*\t([\d.]+)\s*$/); if (m && cur && !stand.get(cur)!.some(x => x.team === m[1].trim())) stand.get(cur)!.push({ team: m[1].trim(), pts: Number(m[2]) })
  }
}
const schools = new Map((await db.from('schools').select('id, display_name')).data!.map(s => [s.id, s.display_name]))
const { data: alias } = await db.from('school_aliases').select('*').limit(5000)
const aliasKey = alias?.[0] ? Object.keys(alias[0]) : []
const norm = (s: string) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/\b(regional|reg|high school|hs|h s|school|township|twp|co|tech-voc|tech|voc|academy)\b/g, ' ').replace(/[^a-z0-9/ -]/g, ' ').replace(/\s+/g, ' ').trim()
const { data: ts } = await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).in('tournament_type', ['districts', 'girls_regions'])
let n = 0, cacheOk = 0, calcOk = 0, unmatched = 0; const bad: string[] = []
for (const t of ts!) {
  const d = t.name.match(/District (\d+)/), r = t.name.match(/Regions r(\d)/)
  const key = d ? `District ${d[1]}` : `Region ${r![1]}`
  const gt = stand.get(key) ?? []
  const { data: cache } = await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)
  const calc = (d ? (await db.rpc('district_team_score', { p_district: Number(d[1]), p_gender: 'F', p_season: 2026 })).data : (await db.rpc('girls_region_team_score', { p_region: r![1], p_season: 2026 })).data) as any[]
  const C = new Map(calc.map(x => [x.school_id, Number(x.total_points)])), K = new Map(cache!.map(x => [x.school_id, Number(x.total_points)]))
  const ids = [...new Set([...C.keys(), ...K.keys()])]
  for (const g of gt) {
    if (g.pts <= 0) continue
    // the school: display name or a known alias, else the one school in this tournament whose name matches loosely
    const gn = norm(g.team)
    let c = ids.filter(id => norm(schools.get(id) ?? '') === gn)
    if (c.length !== 1) c = ids.filter(id => { const sn = norm(schools.get(id) ?? ''); return sn && (gn.startsWith(sn) || sn.startsWith(gn) || gn.split('/')[0] === sn.split('/')[0]) })
    if (c.length !== 1) { unmatched++; continue }
    n++; const k = K.get(c[0]), cc = C.get(c[0]) ?? 0
    if (k != null && Math.abs(k - g.pts) < 0.01) cacheOk++; if (Math.abs(cc - g.pts) < 0.01) calcOk++
    if (k == null || Math.abs(k - g.pts) >= 0.01) bad.push(`${key} ${g.team}: TrackWrestling ${g.pts} | stored ${k ?? '—'} | calc ${cc}`)
  }
}
console.log(`girls 2025-26 districts + regions: ${n} schools matched to TrackWrestling standings (${unmatched} names not matched)`)
console.log(`stored totals equal TrackWrestling: ${cacheOk}; calculation equals TrackWrestling: ${calcOk}`)
console.log(bad.length, 'stored totals that differ:'); console.log(bad.slice(0, 40).join('\n'))
void aliasKey
