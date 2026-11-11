// Team standings Kyle compiled from TrackWrestling (2026-11-11: "Whizzer Upload/2026-27 Girls Data/Tournament
// Standings.rtf", parsed to docs/reviews/tournament_standings_20261111.json: tournament, then place / team / score /
// placer counts). Loads tournaments that have no standings yet, both sides; add-only. Each team is matched first by
// the school text its own wrestlers' bouts carry at that tournament, else by the school matcher.
//   npx tsx --tsconfig tsconfig.json scripts/load_tournament_standings_20261111.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { matchSchoolNames } from '@/lib/matchSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
// Settled by hand 2026-11-11 (short or variant names; 4 schools created with their state for these standings:
// Archmere Academy (DE) 1207, Germantown Friends (PA) 1208, Executive Education Academy (PA) 1209, Pottstown (PA) 1210)
const OVERRIDE: Record<string, number> = {
  'Howdy Duncan|Mt St Joseph': 680, 'Howdy Duncan|Odessa H S': 1105, 'Howdy Duncan|Delmar Junior-Senior H S': 689, 'Howdy Duncan|Archmere Academy': 1207,
  'Sam Cali Battle for the Belt|Greens Farms Academy': 600, 'Sam Cali Battle for the Belt|Peddie School': 603, 'Sam Cali Battle for the Belt|Waldwick/Midland Park': 9,
  '2026 East Coast Catholic Classic|Christian Brothers Academy': 197, '2026 East Coast Catholic Classic|Christian Brothers High': 1204,
  '2026 East Coast Catholic Classic|St. Mark`s': 619, '2026 East Coast Catholic Classic|Mount Saint Charles Academy': 602,
  'Doc Buchanan|Faith Christian (PA)': 494, 'Doc Buchanan|Randall (TX)': 807,
  'Battle at the Brook|Saddle Brook/Lodi': 379, 'Battle at the Brook|Eastside': 72,
  'Penn Charter Invitational|Central High': 1120, 'Penn Charter Invitational|Academy at Palumbo': 1041, 'Penn Charter Invitational|Germantown Friends': 1208, 'Penn Charter Invitational|MLK High School': 1044,
  'Burlington County Tournament|Rv': 263, 'Burlington County Tournament|Burlington Twp': 229,
  'Escape the Rock Girls at North Penn HS|Dallastown': 1066, 'Escape the Rock Girls at North Penn HS|Nazareth': 590, 'Escape the Rock Girls at North Penn HS|St. Georges Tech': 656,
  'Escape the Rock Girls at North Penn HS|Council Rock': 587, 'Escape the Rock Girls at North Penn HS|Bethlehem Liberty': 585, 'Escape the Rock Girls at North Penn HS|Elco': 1071,
  'Escape the Rock Girls at North Penn HS|Octorara': 1072, 'Escape the Rock Girls at North Penn HS|Central Bucks': 1022, 'Escape the Rock Girls at North Penn HS|Conwell Egan Catholic': 694,
  'Escape the Rock Girls at North Penn HS|Boyertown': 581, 'Escape the Rock Girls at North Penn HS|Coatesville': 1076, 'Escape the Rock Girls at North Penn HS|Executive Education Academy': 1209,
  'Escape the Rock Girls at North Penn HS|Hill School': 642, 'Escape the Rock Girls at North Penn HS|Pottstown': 1210,
  'Ralph Wetzel Girls Classic|Central HS Philadelphia': 1120, 'Ralph Wetzel Girls Classic|Jim Thrope HS': 1125, 'Ralph Wetzel Girls Classic|Marianna Bracetti Academy': 1103,
}
// the file's name for a tournament → ours
const TOUR_NAME: Record<string, string> = { 'Morris Knolls Holiday Tournament': 'Morris Knolls Tournament' }
const blocks: { name: string; rows: { place: number; team: string; score: number }[] }[] = JSON.parse(fs.readFileSync('docs/reviews/tournament_standings_20261111.json', 'utf8'))
const norm = (s: string) => s.toLowerCase().replace(/`/g, "'").replace(/[^a-z0-9]/g, '')
const strip = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').replace(/\s+(High School|H\.?S\.?|Hs|H S|Sr|Jr\/Sr|JR\/SR|School)$/i, '').trim()
const tours: { id: string; name: string; g: 'M' | 'F'; bt: string }[] = []
for (const [g, tt, bt] of [['M', 'in_season_tournaments', 'tournament_bouts'], ['F', 'in_season_tournaments_girls', 'tournament_bouts_girls']] as const)
  for (const t of (await db.from(tt).select('id, name').eq('season', '2025-26')).data ?? []) tours.push({ ...t, g, bt })
const { data: sch } = await db.from('schools').select('id, display_name'); const sn = new Map(sch!.map(s => [s.id, s.display_name]))
const rows: any[] = [], problems: string[] = []
for (const b of blocks) {
  const t = tours.find(t => norm(t.name) === norm(TOUR_NAME[b.name] ?? b.name))
  if (!t) { problems.push(`no tournament named "${b.name}"`); continue }
  const { count } = await db.from('in_season_tournament_team_scores').select('*', { count: 'exact', head: true }).eq('tournament_id', t.id)
  if (count) { problems.push(`${b.name}: already has ${count} rows, skipped`); continue }
  const bouts = (await db.from(t.bt).select('wrestler1_school_raw, wrestler1_school_id, wrestler2_school_raw, wrestler2_school_id').eq('in_season_tournament_id', t.id).limit(5000)).data ?? []
  const viaBouts = new Map<string, Map<number, number>>()
  for (const x of bouts) for (const [raw, sid] of [[x.wrestler1_school_raw, x.wrestler1_school_id], [x.wrestler2_school_raw, x.wrestler2_school_id]] as [string, number][]) {
    if (!raw || sid == null) continue; for (const k of [norm(raw), norm(strip(raw))]) { const m = viaBouts.get(k) ?? new Map(); m.set(sid, (m.get(sid) ?? 0) + 1); viaBouts.set(k, m) }
  }
  for (const r of b.rows) {
    let sid: number | null = OVERRIDE[`${b.name}|${r.team}`] ?? null, how = 'override'
    if (sid == null) { const vb = viaBouts.get(norm(r.team)) ?? viaBouts.get(norm(strip(r.team))); if (vb) { sid = [...vb].sort((a, c) => c[1] - a[1])[0][0]; how = 'bouts' } }
    if (sid == null) { const m: any = await matchSchoolNames(r.team, { gender: t.g, seasonId: 2026 }); const x = Array.isArray(m) ? m[0] : m; if (x?.schoolId && ['exact', 'oos', 'high'].includes(x.confidence)) { sid = x.schoolId; how = `matcher ${x.confidence}` } else problems.push(`${b.name}: "${r.team}" (${r.score}) not matched${x?.schoolId ? ` — ${x.confidence} → ${x.displayName}` : ''}`) }
    if (sid != null) rows.push({ tournament_id: t.id, place: r.place, school_name: r.team, school_id: sid, score: r.score, _t: b.name, _how: how, _g: t.g })
  }
}
const byT = new Map<string, any[]>(); for (const r of rows) { const a = byT.get(r._t) ?? []; a.push(r); byT.set(r._t, a) }
for (const [t, rs] of byT) { const dup = rs.map(r => r.school_id).filter((v, i, a) => a.indexOf(v) !== i); console.log(`${t} (${rs[0]._g}): ${rs.length} rows; winner ${rs[0].school_name} → ${sn.get(rs[0].school_id)}${dup.length ? `; SAME SCHOOL TWICE: ${dup.map(d => sn.get(d)).join(', ')}` : ''}`) }
console.log(`\nrows ${rows.length}; problems ${problems.length}\n  ${problems.join('\n  ')}`)
if (!APPLY) process.exit(0)
if (problems.some(p => /not matched/.test(p))) throw new Error('settle the unmatched teams first')
const { data, error } = await db.from('in_season_tournament_team_scores').insert(rows.map(({ _t, _how, _g, ...r }) => r)).select('id'); if (error) throw error
fs.writeFileSync('docs/migrations/backups/20261111_tournament_standings_added.json', JSON.stringify(data!.map(d => d.id)))
console.log('added', data!.length)
