// In-season tournament team standings from the TrackWrestling result files, either gender (2026-11-09; girls first).
// --boys reads Whizzer Upload/2025-26 Boys Data and the boys tables. Girls header kept below:
// Girls 2025-26 in-season tournaments: team standings (2026-11-09). None of the 41 girls tournaments has a team
// score row (in_season_tournament_team_scores), so the Tournaments page's Winner column is empty. The TrackWrestling
// results files (Whizzer Upload/2025-26 Girls Data/*Tournament*.rtf) open each tournament with its name, date and
// site, then the standings as separate lines (place / team / points), ending at "Round Results"; the RTF import
// didn't read that layout. This reads every standings block, pairs it with the stored tournament (name and date),
// and matches each team to a school (src/lib/matchSchools.ts: exact or alias; girls, 2025-26).
//   without --apply: prints what it would add (tournaments matched, teams not matched)
//   --apply: (service role) inserts the rows for tournaments that have none (never replaces); backup of new ids
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_tournament_team_scores.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'child_process'
import fs from 'fs'
import { matchSchoolNames } from '../src/lib/matchSchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const BOYS = process.argv.includes('--boys')
const DIR = BOYS ? '../Whizzer Upload/2025-26 Boys Data' : '../Whizzer Upload/2025-26 Girls Data'
const files = fs.readdirSync(DIR).filter(f => /Tournament/i.test(f) && f.endsWith('.rtf'))
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

type Block = { file: string; name: string; date: string; teams: { place: number; team: string; score: number }[] }
const blocks: Block[] = []
for (const f of files) {
  const lines = execFileSync('textutil', ['-convert', 'txt', '-stdout', `${DIR}/${f}`], { encoding: 'utf8', maxBuffer: 1 << 28 }).split('\n').map(l => l.trim())
  for (let i = 0; i < lines.length; i++) {
    // a tournament header: name, then a date line, then the site, then "1"
    // the date line: "12/12/2025", or a range "12/18 - 12/19/2025" (its first day)
    const dm = (lines[i + 1] ?? '').match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?: - \d{1,2}\/\d{1,2}\/(\d{4}))?$/)
    if (!dm || !(dm[3] || dm[4]) || !lines[i] || /^\d+$/.test(lines[i])) continue
    const name = lines[i], date = `${dm[1]}/${dm[2]}/${dm[3] ?? dm[4]}`
    let j = i + 2
    while (j < lines.length && lines[j] !== '1' && j < i + 6) j++
    const teams: Block['teams'] = []
    while (j + 2 < lines.length && /^\d+$/.test(lines[j]) && /^-?\d+(\.\d+)?$/.test(lines[j + 2])) {
      teams.push({ place: Number(lines[j]), team: lines[j + 1].trim(), score: Number(lines[j + 2]) }); j += 3
    }
    if (teams.length) blocks.push({ file: f, name, date, teams })
  }
}
const iso = (d: string) => { const [m, dd, y] = d.split('/').map(Number); return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}` }

const { data: tours } = await db.from(BOYS ? 'in_season_tournaments' : 'in_season_tournaments_girls').select('id, name, start_date, end_date').eq('season', '2025-26')
const { data: haveRows } = await db.from('in_season_tournament_team_scores').select('tournament_id').in('tournament_id', (tours ?? []).map(t => t.id))
const has = new Set((haveRows ?? []).map(r => r.tournament_id))
const schoolCache = new Map<string, any>()
// teams the matcher can't place, settled 2026-11-09: out-of-state schools by the record the boys version of the
// same event used (Beast of the East, Golden Eagle), else the only record for that name; two NJ name variants
const OVERRIDE: Record<string, number> = {
  'Peddie School': 603, 'Easton': 736, 'Bullis': 741, 'Milford': 620, 'Brentsville District': 699, 'Glasgow': 625,
  'Lake Highland Prep': 495, 'Mountain ViewHS': 675, 'The St James Academy': 697, 'The St. James Academy': 697,
  'Mt Lebanon': 851, 'Indian River H S': 1117, 'Moon High School': 542, 'New Lenox': 530, 'Perry HS': 515,
  'Mary Help of Christians': 381,
  'Canyon View': 920,   // Kyle 2026-11-09: Canyon View (AZ)
  // boys files' misspellings (Minuteman Classic)
  'Sommerville': 145, 'St. Mary`s Rutherford': 88, 'College Achieve- Patterson': 71,
}
// held for Kyle (none now: Canyon View settled as Arizona)
const HOLD = new Set<string>()
const held: string[] = []
const rows: any[] = [], unmatchedTour: string[] = [], unmatchedTeams: string[] = [], seenTour = new Set<string>()
for (const b of blocks) {
  const d = iso(b.date)
  const cands = (tours ?? []).filter(t => t.start_date === d || (t.end_date && t.start_date <= d && d <= t.end_date))
  // same date, and the names share their distinctive word ("BCWCA 7th 2026" / "BCWCA Tournament"; "2026 Elizabeth
  // Lady Minuteman Classic" / "Lady Minutemen Tournament")
  const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['girls', 'girl', 'tournament', 'classic', 'wrestling', 'invitational', 'annual', 'lady', 'ladies', 'conference', 'county', 'championship', 'championships'].includes(w)).map(w => w.replace(/(men|man)$/, 'm')))
  const share = (a: string, c: string) => { const A = words(a), C = words(c); return [...A].some(w => C.has(w)) }
  const t = cands.find(t => norm(t.name) === norm(b.name)) ?? (cands.length === 1 ? cands[0] : cands.find(t => norm(t.name).includes(norm(b.name)) || norm(b.name).includes(norm(t.name))) ?? (cands.filter(t => share(b.name, t.name)).length === 1 ? cands.filter(t => share(b.name, t.name))[0] : undefined))
  if (!t) { unmatchedTour.push(`${b.date} ${b.name} (${b.teams.length} teams) — stored that date: ${cands.map(c => c.name).join(' | ') || 'none'}`); continue }
  if (seenTour.has(t.id)) continue; seenTour.add(t.id)
  if (has.has(t.id)) continue
  // the school each team's own wrestlers were stored under at this tournament (the bouts' school text → school_id),
  // which settles out-of-state names with several records (Canyon View AZ / UT, Mountain View, Perry)
  const bouts = (await db.from(BOYS ? 'tournament_bouts' : 'tournament_bouts_girls').select('wrestler1_school_raw, wrestler1_school_id, wrestler2_school_raw, wrestler2_school_id').eq('in_season_tournament_id', t.id).limit(5000)).data ?? []
  const viaBouts = new Map<string, Map<number, number>>()
  for (const x of bouts as any[]) for (const [raw, sid] of [[x.wrestler1_school_raw, x.wrestler1_school_id], [x.wrestler2_school_raw, x.wrestler2_school_id]]) {
    if (!raw || sid == null) continue; const k = norm(raw); const m = viaBouts.get(k) ?? new Map(); m.set(sid, (m.get(sid) ?? 0) + 1); viaBouts.set(k, m)
  }
  for (const tm of b.teams) {
    if (HOLD.has(tm.team)) { held.push(`${t.name}: ${tm.team} ${tm.score}`); continue }
    if (OVERRIDE[tm.team]) { rows.push({ tournament_id: t.id, place: tm.place, school_name: tm.team, school_id: OVERRIDE[tm.team], score: tm.score, _t: t.name }); continue }
    const vb = viaBouts.get(norm(tm.team))
    if (vb) { const sid = [...vb.entries()].sort((a, c) => c[1] - a[1])[0][0]; rows.push({ tournament_id: t.id, place: tm.place, school_name: tm.team, school_id: sid, score: tm.score, _t: t.name }); continue }
    if (!schoolCache.has(tm.team)) schoolCache.set(tm.team, await matchSchoolNames(tm.team, { gender: BOYS ? 'M' : 'F', seasonId: 2026 }))
    const m = schoolCache.get(tm.team)
    const sid = m && ['exact', 'oos'].includes(m.confidence) ? m.schoolId : null
    if (!sid) unmatchedTeams.push(`${t.name}: ${tm.team} (${tm.score}) — ${m?.confidence ?? 'none'}${m?.displayName ? ' → ' + m.displayName : ''}`)
    rows.push({ tournament_id: t.id, place: tm.place, school_name: tm.team, school_id: sid, score: tm.score, _t: t.name })
  }
}
const tCount = new Set(rows.map(r => r.tournament_id)).size
console.log(`files ${files.length}; standings blocks ${blocks.length}; stored ${BOYS ? "boys" : "girls"} tournaments ${tours?.length}, with rows already ${has.size}`)
console.log(`tournaments to fill ${tCount}; rows ${rows.length}; teams not matched to a school ${unmatchedTeams.length}`)
console.log(`stored tournaments with no standings block: ${(tours ?? []).filter(t => !seenTour.has(t.id) && !has.has(t.id)).map(t => `${t.start_date} ${t.name}`).join('; ') || 'none'}`)
if (unmatchedTour.length) console.log('\nstandings blocks not paired:\n  ' + unmatchedTour.join('\n  '))
if (unmatchedTeams.length) console.log('\nteams not matched:\n  ' + unmatchedTeams.join('\n  '))
if (held.length) console.log('\nheld (not added): ' + held.join('; '))
if (APPLY && unmatchedTeams.length) throw new Error('teams not matched: settle them first')
if (process.argv.includes('--winners')) {
  const { data: sch } = await db.from('schools').select('id, display_name')
  const nm = new Map((sch ?? []).map(x => [x.id, x.display_name]))
  for (const r of rows.filter(r => r.place === 1)) console.log(`  ${r._t}: ${r.school_name} (${r.score}) → ${nm.get(r.school_id)}`)
}
if (!APPLY) process.exit(0)
const ins = rows.map(({ _t, ...r }) => r)
const { data, error } = await db.from('in_season_tournament_team_scores').insert(ins).select('id')
if (error) throw error
fs.writeFileSync(BOYS ? 'docs/migrations/backups/20261109_boys_tournament_team_scores_added.json' : 'docs/migrations/backups/20261109_girls_tournament_team_scores_added.json', JSON.stringify(data!.map(d => d.id)))
console.log(`added ${data!.length} rows (ids: docs/migrations/backups/20261109_${BOYS ? 'boys' : 'girls'}_tournament_team_scores_added.json)`)
