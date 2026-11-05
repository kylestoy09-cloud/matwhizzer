// Boys 2025-26 district team totals straight from TrackWrestling (2026-11-05, Kyle: "the copied
// standings are the TRUTH"). The stored boys totals had been replaced by the site's own formula
// (20260921_team_score_cache_auto_refresh.sql): Fort Lee D8 read 50.5, the formula without Ryan
// Kim's deleted bouts, while TrackWrestling lists 76.5. Source: the 32 "Team Scores" tables in
// ../2026 District Match Data.pages, saved to data/official_team_scores/boys_2025_26_district_tables.json.
// Tables 1-19 are each followed by their district's results (District 6 appears twice); tables
// 20-32 have no heading, so each is assigned to the district whose entered schools it matches.
// Every labelled table goes through the same match as a check.
//   npx tsx --tsconfig tsconfig.json scripts/build_boys_official_district_team_scores.mts [--apply]
// A team maps to a school by the school text on that tournament's entries (school_context_raw →
// school_id, the import's own link), then a school alias / name, then a loose name match among
// the schools entered there. --apply backs up and replaces the stored totals of those districts.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string) { const out: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await db.from(t).select(cols).range(i, i + 999), t); out.push(...d); if (d.length < 1000) break } return out }
const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const loose = (s: string) => key(s).replace(/\(.*?\)/g, ' ').replace(/\b(regional|reg|high school|h\.?s\.?|hs|school|township|twp|senior|jr\/sr|central)\b/g, ' ').replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim()
type Team = { rank: number; team: string; points: number }
const SRC = JSON.parse(fs.readFileSync('data/official_team_scores/boys_2025_26_district_tables.json', 'utf8')).tables as { order: number; district_heading_after: number | null; teams: Team[] }[]

const schools = new Map(chk(await db.from('schools').select('id, display_name'), 's').map(s => [s.id, s.display_name]))
const byName = new Map<string, Set<number>>()
const put = (n: string | null, id: number | null) => { if (!n || id == null) return; const k = key(n); const s = byName.get(k) ?? new Set(); s.add(id); byName.set(k, s) }
for (const [id, n] of schools) put(n, id)
for (const a of await all('school_aliases', 'school_id, alias')) put(a.alias, a.school_id)
for (const s of await all('school_names', 'school_name, school_id')) put(s.school_name, s.school_id)

const tourns = chk(await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2026).eq('tournament_type', 'districts'), 't')
const dist = new Map<number, { id: number; viaEntries: Map<string, Map<number, number>>; entered: Set<number> }>()
for (const t of tourns) {
  const d = Number(t.name.match(/District (\d+)$/)?.[1]); if (!d) continue
  const ents = chk(await db.from('tournament_entries').select('school_id, school_context_raw').eq('tournament_id', t.id), 'e')
  const viaEntries = new Map<string, Map<number, number>>()
  for (const e of ents) if (e.school_context_raw && e.school_id != null) { const k = key(e.school_context_raw); const m = viaEntries.get(k) ?? new Map(); m.set(e.school_id, (m.get(e.school_id) ?? 0) + 1); viaEntries.set(k, m) }
  dist.set(d, { id: t.id, viaEntries, entered: new Set(ents.map(e => e.school_id).filter(x => x != null)) })
}
function mapTeam(team: string, d: number): { id: number | null; how: string } {
  const D = dist.get(d)!
  const ve = D.viaEntries.get(key(team))
  if (ve) return { id: [...ve.entries()].sort((a, b) => b[1] - a[1])[0][0], how: 'entries' }
  const c = [...(byName.get(key(team)) ?? [])].filter(x => D.entered.has(x)); if (c.length === 1) return { id: c[0], how: 'name' }
  const l = [...D.entered].filter(x => { const a = loose(team), b = loose(schools.get(x) ?? ''); return b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ') || a.split('/')[0].trim() === b.split('/')[0].trim()) })
  if (l.length === 1) return { id: l[0], how: 'LOOSE' }
  return { id: null, how: '' }
}
// which district a table belongs to: the one where the most of its teams map through the entries
const fit = (teams: Team[], d: number) => teams.filter(t => dist.get(d)!.viaEntries.has(key(t.team))).length
const assigned = new Map<number, Team[]>(), review: string[] = []
for (const tb of SRC) {
  const scores = [...dist.keys()].map(d => [d, fit(tb.teams, d)] as const).sort((a, b) => b[1] - a[1])
  const [best, n] = scores[0], second = scores[1]
  const note = `table ${tb.order}${tb.district_heading_after ? ` (heading D${tb.district_heading_after})` : ' (no heading)'}: best fit D${best} ${n}/${tb.teams.length}, next D${second[0]} ${second[1]}`
  if (tb.district_heading_after && tb.district_heading_after !== best) { review.push(`- ⚠ ${note} — heading and teams disagree; skipped`); continue }
  if (n < Math.ceil(tb.teams.length / 2) || n === second[1]) { review.push(`- ⚠ ${note} — no clear district; skipped`); continue }
  if (assigned.has(best)) { const same = JSON.stringify(assigned.get(best)) === JSON.stringify(tb.teams); review.push(`- ${note} — ${same ? 'identical duplicate, ignored' : '⚠ DIFFERENT second table for this district; skipped'}`); continue }
  assigned.set(best, tb.teams); if (!tb.district_heading_after) review.push(`- ${note}`)
}
const missing = [...dist.keys()].filter(d => !assigned.has(d)).sort((a, b) => a - b)

const newRows: any[] = []; let same = 0, changed = 0, added = 0, unmatched = 0
const lines: string[] = []
for (const d of [...assigned.keys()].sort((a, b) => a - b)) {
  const D = dist.get(d)!, teams = assigned.get(d)!
  const stored = new Map(chk(await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', D.id), 'c').map(c => [c.school_id, Number(c.total_points)]))
  const used = new Set<number>()
  lines.push(`## District ${d}`)
  for (const t of teams) {
    if (/^(team )?forfeit$|^-+$/i.test(t.team.trim())) { lines.push(`- (filler) ${t.team} ${t.points} — not a school, skipped`); continue }
    const { id, how } = mapTeam(t.team, d)
    if (id == null) { unmatched++; lines.push(`- ${t.team} ${t.points} → **not matched**`); continue }
    if (used.has(id)) { lines.push(`- ⚠ ${t.team} ${t.points} → ${schools.get(id)} [${id}] already used`); continue }
    used.add(id)
    const cur = stored.get(id)
    const st = cur == null ? 'new row' : Math.abs(cur - t.points) < 0.01 ? 'same' : `stored ${cur}`
    if (st === 'same') same++; else if (st === 'new row') added++; else changed++
    if (how !== 'entries' || st !== 'same') lines.push(`- ${t.team} — ${t.points} → ${schools.get(id)} [${id}] (${how}; ${st})`)
    newRows.push({ tournament_id: D.id, school_id: id, school_name: schools.get(id), total_points: t.points, season_id: 2026, tournament_type: 'boys_districts' })
  }
  for (const [sid, p] of stored) if (!used.has(sid) && p > 0) lines.push(`- (stored only) ${schools.get(sid)} [${sid}] ${p} — not in the TrackWrestling table (it lists the top ${teams.length})`)
}
const head = `# Boys 2025-26 district team totals: TrackWrestling → stored\n\nDistricts with an official table: ${assigned.size}/32. No table: ${missing.length ? missing.map(d => `D${d}`).join(', ') : 'none'}.\nTeams mapped ${newRows.length}, not matched ${unmatched}. Stored already equal ${same}; would change ${changed}; new rows ${added}.\n\n### Tables\n${review.join('\n')}\n\n`
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/boys_district_team_mapping.md', head + lines.join('\n') + '\n')
console.log(head); console.log(lines.filter(l => /not matched|LOOSE|⚠|stored only|stored \d|new row/.test(l)).slice(0, 60).join('\n'))
if (!APPLY) process.exit(0)
if (unmatched) throw new Error('unmatched teams: fix the mapping first')
// Only the listed teams are replaced; a stored row for a team TrackWrestling doesn't list is kept as is.
const ids = [...assigned.keys()].map(d => dist.get(d)!.id)
const before = chk(await db.from('precomputed_team_scores').select('*').in('tournament_id', ids), 'before')
fs.writeFileSync('docs/migrations/backups/20261105_boys_district_team_scores_before.json', JSON.stringify(before, null, 1))
for (const r of newRows) {
  const ex = before.find(b => b.tournament_id === r.tournament_id && b.school_id === r.school_id)
  if (ex) chk(await db.from('precomputed_team_scores').update({ total_points: r.total_points }).eq('id', ex.id).select('id'), 'update')
  else chk(await db.from('precomputed_team_scores').insert(r).select('id'), 'insert')
}
console.log(`APPLIED: ${newRows.length} official totals written (${changed} changed, ${added} new)`)
