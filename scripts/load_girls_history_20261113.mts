// Girls postseason podiums for the Daily Challenge history (Kyle 2026-11-13). 2019-2024 from Kyle's TrackWrestling
// bout exports (Whizzer Upload/Girls History), placed the way the hubs place them (src/lib/hubFiles.ts: exact places
// from the Finals and placement bouts; tied groups left out); 2025-2026 from MatWhizzer's own placements.
// 2019's one region file holds both regions: each bracket is North or South by its schools' region in 2020.
// Usage: load_girls_history_20261113.mts [go]
import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseBoutExport, bracketsFrom, placesFrom, contested } from '../src/lib/hubFiles'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const DIR = `${process.env.HOME}/Desktop/wrestling_brackets/Whizzer Upload/Girls History`
type Row = { gender: 'F'; level: 'state' | 'region'; year: number; region_name: string | null; weight: string; place: number; name: string; school: string | null; source: string }
const rows: Row[] = []
const files = readdirSync(DIR).filter(f => f.endsWith('.csv'))
const regionOfFile = (f: string) => /Central/.test(f) ? 'Central' : /NorthII/.test(f) ? 'North II' : /NorthI/.test(f) ? 'North I' : /North/.test(f) ? 'North' : /South/.test(f) ? 'South' : null
// 2019 state names every placement bout "Placement Matches (8 Man)": the two unbeaten kids wrestle for 1st, the
// 2nd-wrestleback winners for 3rd, its losers for 5th
function name2019Placements(b: ReturnType<typeof bracketsFrom>[number]) {
  const won2nd = new Set(b.bouts.filter(x => /^2nd Wrestleback/.test(x.round) && x.loser).map(x => x.winner))
  const lost2nd = new Set(b.bouts.filter(x => /^2nd Wrestleback/.test(x.round) && x.loser).map(x => x.loser))
  const losses = (n: string) => b.bouts.filter(x => x.loser === n && !/^Placement/.test(x.round)).length
  for (const x of b.bouts.filter(x => /^Placement Matches/.test(x.round) && x.loser)) {
    x.round = losses(x.winner) === 0 && losses(x.loser) === 0 ? '1st Place'
      : won2nd.has(x.winner) && won2nd.has(x.loser) ? '3rd Place'
      : lost2nd.has(x.winner) && lost2nd.has(x.loser) ? '5th Place' : x.round
  }
}
const placed = (f: string) => {
  const bs = bracketsFrom(parseBoutExport(readFileSync(`${DIR}/${f}`, 'utf8'))).filter(contested)
  if (/State/.test(f) && /2019/.test(f)) bs.forEach(name2019Placements)
  return bs
}
// schools' region in 2020, to split 2019
const school2020 = new Map<string, string>()
for (const f of files.filter(f => /Region/.test(f) && /2020/.test(f))) for (const b of placed(f)) for (const p of b.people) school2020.set(p.team, regionOfFile(f)!)
const report: string[] = []
for (const f of files) {
  const year = Number(/(20\d\d)\.csv$/.exec(f.replace(/\s/g, ''))?.[1])
  const level = /State/.test(f) ? 'state' : 'region'
  for (const b of placed(f)) {
    let region = level === 'region' ? regionOfFile(f) : null
    if (level === 'region' && !region) {
      const votes = new Map<string, number>()
      for (const p of b.people) { const r = school2020.get(p.team); if (r) votes.set(r, (votes.get(r) ?? 0) + 1) }
      const r = [...votes].sort((a, z) => z[1] - a[1])
      region = r.length && (r.length === 1 || r[0][1] > r[1][1]) ? r[0][0] : null
      report.push(`${year} region ${b.weight}: ${region ?? 'UNDECIDED'} (${JSON.stringify(r)})`)
    }
    // only places decided by a final or a placement match (a kid knocked out alone in a consolation round isn't one)
    const real = b.bouts.filter(x => x.loser || /place/i.test(x.round))
    const nths = real.map(x => /^(\d+)(?:st|nd|rd|th) place(?: match)?$/i.exec(x.round)?.[1]).filter(Boolean).map(Number)
    const deepest = Math.max(real.some(x => x.round === 'Finals') ? 2 : 0, ...nths.map(n => n + 1))
    for (const p of placesFrom(b)) if (!p.place_to && p.place <= Math.min(8, deepest)) rows.push({ gender: 'F', level, year, region_name: region, weight: b.weight, place: p.place, name: p.person.name, school: p.person.team || null, source: 'trackwrestling' })
  }
}
// 2025-2026: MatWhizzer's own region and state placements
const { data: ts } = await db.from('tournaments').select('id, name, season_id, tournament_type').eq('gender', 'F').in('tournament_type', ['girls_regions', 'girls_state'])
for (const t of ts ?? []) {
  const { data: pl, error } = await db.from('placements').select('place, weight_class_id, entry_id').eq('tournament_id', t.id).gte('place', 1).lte('place', 8)
  if (error) throw error
  const eIds = (pl ?? []).map(p => p.entry_id)
  const { data: en } = eIds.length ? await db.from('tournament_entries').select('id, wrestler_id, school_id').in('id', eIds) : { data: [] }
  const enMap = new Map((en ?? []).map(e => [e.id, e]))
  const wIds = [...new Set((en ?? []).map(e => e.wrestler_id))], sIds = [...new Set((en ?? []).map(e => e.school_id).filter(Boolean))]
  const { data: ws } = wIds.length ? await db.from('wrestlers').select('id, first_name, last_name').in('id', wIds) : { data: [] }
  const { data: ss } = sIds.length ? await db.from('schools').select('id, display_name').in('id', sIds) : { data: [] }
  const wcIds = [...new Set((pl ?? []).map(p => p.weight_class_id))]
  const { data: wc } = wcIds.length ? await db.from('weight_classes').select('id, weight').in('id', wcIds) : { data: [] }
  const wn = new Map((ws ?? []).map(w => [w.id, `${w.first_name} ${w.last_name}`])), sn = new Map((ss ?? []).map(s => [s.id, s.display_name])), wcn = new Map((wc ?? []).map(w => [w.id, String(w.weight)]))
  // MatWhizzer's girls regions 1-4 are North I, North II, Central, South (checked by their schools against 2024's files)
  const REGION_NAME: Record<string, string> = { r1: 'North I', r2: 'North II', r3: 'Central', r4: 'South' }
  const region = t.tournament_type === 'girls_regions' ? REGION_NAME[/r(\d)\s*$/.exec(t.name)?.[0] ?? ''] ?? null : null
  if (t.tournament_type === 'girls_regions' && !region) throw new Error(`no region name for ${t.name}`)
  for (const p of pl ?? []) {
    const e = enMap.get(p.entry_id); if (!e) continue
    rows.push({ gender: 'F', level: t.tournament_type === 'girls_state' ? 'state' : 'region', year: t.season_id, region_name: region, weight: wcn.get(p.weight_class_id) ?? '?', place: p.place, name: wn.get(e.wrestler_id) ?? '?', school: sn.get(e.school_id) ?? null, source: 'matwhizzer' })
  }
}
// summary
const by = new Map<string, number>()
for (const r of rows) by.set(`${r.year} ${r.level}${r.region_name ? ' ' + r.region_name : ''}`, (by.get(`${r.year} ${r.level}${r.region_name ? ' ' + r.region_name : ''}`) ?? 0) + 1)
console.log([...by].sort().map(([k, n]) => `${k}: ${n}`).join('\n'))
console.log(report.join('\n'))
const champs = (y: number) => rows.filter(r => r.year === y && r.level === 'state' && r.place === 1).length
console.log('state champions per year:', [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map(y => `${y}:${champs(y)}`).join(' '))
writeFileSync('docs/migrations/backups/20261113_girls_history_rows.json', JSON.stringify(rows))
if (process.argv[2] === 'go') {
  const { count } = await db.from('history_finishes').select('*', { count: 'exact', head: true }).eq('gender', 'F')
  if (count) throw new Error(`girls rows already loaded: ${count}`)
  for (let i = 0; i < rows.length; i += 500) { const { error } = await db.from('history_finishes').insert(rows.slice(i, i + 500)); if (error) throw error }
  console.log('inserted', rows.length)
}
