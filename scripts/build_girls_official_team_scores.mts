// Girls 2025-26 postseason team totals straight from TrackWrestling (2026-11-03).
// precomputed_team_scores holds the girls "official" totals the girls pages show, but some rows
// were wrong (District 1 High Point stored 147.5, TrackWrestling 202.5; some region rows had
// been overwritten with the site's own formula). The TrackWrestling exports open each district /
// region / state with its team standings ("<rank>\t<team> \t<points>"). This maps every team to
// its school and writes a review file; with --apply it backs up and replaces the stored totals.
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_official_team_scores.mts [--apply]
// A team maps to a school by, in order: the school text on that tournament's entries
// (school_context_raw → school_id, the import's own link), a school alias, the school_names
// table, the school's display name, then a loose name match among the schools entered there.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(t: string, cols: string) { const out: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await db.from(t).select(cols).range(i, i + 999), t); out.push(...d); if (d.length < 1000) break } return out }
const key = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const loose = (s: string) => key(s).replace(/\(.*?\)/g, ' ').replace(/\b(regional|reg|high school|h\.?s\.?|school|township|twp|senior|jr\/sr|central)\b/g, ' ').replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim()

// ── TrackWrestling standings ──────────────────────────────────────────────────────────────
type Team = { team: string; pts: number }
const stand = new Map<string, Team[]>()      // tournament name → standings
const read = (file: string, header: RegExp, name: (m: RegExpMatchArray) => string) => {
  let cur = ''
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const h = line.match(header); if (h) { cur = name(h); if (!stand.has(cur)) stand.set(cur, []); continue }
    const m = line.match(/^\d+\t(.+?)\s*\t([\d.]+)\s*$/)
    if (m && cur && !stand.get(cur)!.some(x => x.team === m[1].trim())) stand.get(cur)!.push({ team: m[1].trim(), pts: Number(m[2]) })
  }
}
read('../gt_s2_girls_districts.txt', /^District (\d+)$/, m => `Girl_s Districts District ${m[1]}`)
read('../gt_s2_girls_regions.txt', /^Region (\d+)$/, m => `Girl_s Regions r${m[1]}`)
// the state export has no header line: the standings open the file
{ const st: Team[] = []; for (const line of fs.readFileSync('../gt_s2_girls_state.txt', 'utf8').split('\n')) { const m = line.match(/^\d+\t(.+?)\s*\t([\d.]+)\s*$/); if (m && !st.some(x => x.team === m[1].trim())) st.push({ team: m[1].trim(), pts: Number(m[2]) }) } stand.set('Girl_s States', st) }

// ── lookups ───────────────────────────────────────────────────────────────────────────────
const schools = new Map(chk(await db.from('schools').select('id, display_name'), 's').map(s => [s.id, s.display_name]))
const girlsNames = new Map(chk(await db.from('girls_schools').select('school_id, display_name'), 'g').map(s => [s.school_id, s.display_name]))
const aliases = await all('school_aliases', 'school_id, alias')
const snames = await all('school_names', 'school_name, school_id')
const byName = new Map<string, Set<number>>()
const put = (n: string | null, id: number | null) => { if (!n || id == null) return; const k = key(n); const s = byName.get(k) ?? new Set(); s.add(id); byName.set(k, s) }
for (const [id, n] of schools) put(n, id)
for (const [id, n] of girlsNames) put(n, id)
for (const a of aliases) put(a.alias, a.school_id)
for (const s of snames) put(s.school_name, s.school_id)

// the label readers use (SchoolProfileCore.tsx, src/lib/standings.ts), not the tournament's own type
// (2026-11-05: copying the tournament type wrote "districts" and hid district points)
const ROW_LABEL: Record<string, string> = { districts: 'girls_districts', girls_regions: 'girls_regions', girls_state: 'girls_state' }
const tourns = chk(await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'F').eq('season_id', 2026).in('tournament_type', ['districts', 'girls_regions', 'girls_state']), 't')
const rows: any[] = [], review: string[] = [], newRows: any[] = []
let changed = 0, same = 0, added = 0
for (const t of tourns.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))) {
  const teams = stand.get(t.name) ?? []
  if (!teams.length) { review.push(`## ${t.name}: no TrackWrestling standings found`); continue }
  const ents = chk(await db.from('tournament_entries').select('school_id, school_context_raw').eq('tournament_id', t.id), 'e')
  const viaEntries = new Map<string, Map<number, number>>()
  for (const e of ents) if (e.school_context_raw && e.school_id != null) { const k = key(e.school_context_raw); const m = viaEntries.get(k) ?? new Map(); m.set(e.school_id, (m.get(e.school_id) ?? 0) + 1); viaEntries.set(k, m) }
  const entered = new Set(ents.map(e => e.school_id).filter(x => x != null))
  const stored = new Map(chk(await db.from('precomputed_team_scores').select('id, school_id, total_points, school_name').eq('tournament_id', t.id), 'c').map(c => [c.school_id, c]))
  review.push(`## ${t.name.replace("Girl_s ", '')}`)
  const used = new Set<number>()
  for (const tm of teams) {
    let id: number | null = null, how = ''
    const ve = viaEntries.get(key(tm.team))
    if (ve) { id = [...ve.entries()].sort((a, b) => b[1] - a[1])[0][0]; how = 'entries' }
    if (id == null) { const c = [...(byName.get(key(tm.team)) ?? [])].filter(x => entered.has(x) || entered.size === 0); if (c.length === 1) { id = c[0]; how = 'name' } }
    if (id == null) { const c = [...entered].filter(x => { const a = loose(tm.team), b = loose(girlsNames.get(x!) ?? schools.get(x!) ?? ''); return b && (a === b || a.startsWith(b + ' ') || b.startsWith(a + ' ') || a.split('/')[0] === b.split('/')[0]) }); if (c.length === 1) { id = c[0]!; how = 'LOOSE' } }
    const sname = id != null ? (girlsNames.get(id) ?? schools.get(id)) : null
    const cur = id != null ? stored.get(id) : undefined
    const status = id == null ? 'UNMATCHED' : cur == null ? 'new row' : Math.abs(Number(cur.total_points) - tm.pts) < 0.01 ? 'same' : `stored ${cur.total_points}`
    if (id != null && used.has(id)) { review.push(`- ⚠ ${tm.team} (${tm.pts}) → ${sname} [${id}] already used by another team`); continue }
    if (id != null) used.add(id)
    if (status === 'same') same++; else if (status === 'new row') added++; else if (id != null) changed++
    if (how !== 'entries' || status !== 'same') review.push(`- ${tm.team} — ${tm.pts} → ${id == null ? '**not matched**' : `${sname} [${id}]`} (${how || '—'}; ${status})`)
    if (id != null) newRows.push({ tournament_id: t.id, school_id: id, school_name: sname, total_points: tm.pts, season_id: 2026, tournament_type: ROW_LABEL[t.tournament_type] })
    rows.push({ t: t.name, ...tm, id, how, status })
  }
  // stored rows for schools TrackWrestling doesn't list (or that no team mapped to)
  for (const [sid, c] of stored) if (!used.has(sid) && Number(c.total_points) > 0) review.push(`- (stored only) ${girlsNames.get(sid) ?? schools.get(sid)} [${sid}] ${c.total_points} — no TrackWrestling team maps here`)
}
const unmatched = rows.filter(r => r.id == null), looseN = rows.filter(r => r.how === 'LOOSE')
const head = `# Girls 2025-26 team totals: TrackWrestling standings → schools\n\n${rows.length} teams: ${rows.length - unmatched.length} mapped (${looseN.length} by loose name — check those), ${unmatched.length} not matched.\nStored total already equal: ${same}; would change: ${changed}; new rows: ${added}.\nLines shown: every team not mapped through the tournament's own entries, and every total that would change.\n\n`
fs.writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/girls_team_mapping.md', head + review.join('\n') + '\n')
console.log(head)
console.log(review.filter(l => /not matched|LOOSE|⚠|stored only|stored \d/.test(l)).join('\n'))
if (!APPLY) process.exit(0)
// 0-point teams that never entered, and filler ("Team Forfeit", "-") are not schools
const real = unmatched.filter(r => r.pts > 0 && !/^(team forfeit|-+)$/i.test(r.team))
if (real.length) throw new Error(`unmatched teams with points: ${real.map(r => r.team).join(', ')}`)
const ids = tourns.map(t => t.id)
const before = chk(await db.from('precomputed_team_scores').select('*').in('tournament_id', ids), 'before')
fs.writeFileSync('docs/migrations/backups/20261103_girls_team_scores_before.json', JSON.stringify(before, null, 1))
chk(await db.from('precomputed_team_scores').delete().in('tournament_id', ids).select('id'), 'delete')
for (let i = 0; i < newRows.length; i += 200) chk(await db.from('precomputed_team_scores').insert(newRows.slice(i, i + 200)).select('id'), 'insert')
console.log(`APPLIED: ${before.length} rows replaced by ${newRows.length}`)
