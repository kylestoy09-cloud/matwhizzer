// Boys 2024-25 bracket repairs (2026-11-05, approved by Kyle), from TrackWrestling's 2024-25 export
// (../gt_s1_districts.txt, ../gt_s1_regions.txt = ../Match Data/2025 District Data.py / 2025 Region Data.py).
// 1. (Withdrawn before running: District 10's and Region 2's finals are missing from the export, not
//    mislabelled; see the note at that step.)
// 2. District bouts the 2026-03-20 load never stored:
//    - shared-name wrestlers whose 2024-25 entry was later deleted (Sean Brown, Joel Martinez…): the
//      entry is recreated on the profile linked to that school;
//    - names with a nickname in parentheses the loader couldn't read (Palmisano, Monga, McSorley);
//    - forfeits over a filler entry ("A FF") removed by the 2026-11-02 filler cleanup: stored as a
//      forfeit win with forfeit_opponent = 'filler'.
//    Placements a restored 3rd-place match decides are added.
// The export's "District 21" has no heading (its bouts follow District 20); its "District 23" block
// repeats District 22's finals and is skipped.
//   npx tsx --tsconfig tsconfig.json scripts/fix_2025_brackets_20261105.mts [--apply]
// --apply writes entries and placements (service role) and the SQL file for the bouts.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await q(i, i + 999), 'page'); o.push(...d); if (d.length < 1000) break } return o }
const SQL = 'docs/migrations/20261105_2025_bracket_repairs.sql'
const WC: Record<number, number> = { 106: 53, 113: 54, 120: 55, 126: 56, 132: 57, 138: 58, 144: 59, 150: 60, 157: 61, 165: 62, 175: 63, 190: 64, 215: 65, 285: 66 }
const RND: Record<string, string> = { 'Champ. Round 1': 'R2', Quarterfinal: 'QF', Semifinal: 'SF', '1st Place Match': 'F', '3rd Place Match': '3rd_Place' }
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const plain = (s: string) => s.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim()

// ── the export's district bouts ─────────────────────────────────────────────────────────────────
type Bout = { d: number; w: number; round: string; win: string; winSchool: string; lose: string; loseSchool: string; res: string; detail: string; line: string }
const SRC: Bout[] = []
{ let d = 0, w = 0, inList = false, afterList = false
  for (const raw of fs.readFileSync('../gt_s1_districts.txt', 'utf8').split('\n')) {
    const l = raw.trim(); const h = l.match(/^District (\d+)$/); if (h) { d = Number(h[1]); inList = false; afterList = false; continue }
    const st = /^\d+\t.+\t[\d.]+\s*$/.test(raw)
    if (st && raw.startsWith('1\t') && afterList) d = d + 1
    if (st) { inList = true; continue } else if (inList) { inList = false; afterList = true }
    if (/^\d{3}$/.test(l)) { w = Number(l); continue }
    if (d === 23) continue
    const m = l.match(/^(Champ\. Round 1|Quarterfinal|Semifinal|1st Place Match|3rd Place Match) - (.+?) \(([^()]*(?:\([^()]*\)[^()]*)*)\) [\d-]+ won (?:by|in) (.+?) over (.*?) \(([^()]*(?:\([^()]*\)[^()]*)*)\)(?: [\d-]+)? \((.*)\)$/)
    if (!m || SRC.some(b => b.line === l)) continue
    SRC.push({ d, w, round: RND[m[1]], win: m[2], winSchool: m[3], lose: m[5], loseSchool: m[6], res: m[4], detail: m[7], line: l })
  }
}
const dbResult = (b: Bout) => {
  const r = b.res.toLowerCase(), t = b.detail.match(/(\d+):(\d\d)/), sc = b.detail.match(/(\d+)-(\d+)\)?$/)
  const secs = t ? Number(t[1]) * 60 + Number(t[2]) : null
  if (r.includes('tech')) return { win_type: 'TF-1.5', fall_time_seconds: secs, winner_score: null, loser_score: null, score_raw: null }
  if (r.includes('fall')) return { win_type: 'FALL', fall_time_seconds: secs, winner_score: null, loser_score: null, score_raw: secs != null ? `Fall ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : null }
  if (r.includes('forfeit')) return { win_type: 'FORF', fall_time_seconds: null, winner_score: null, loser_score: null, score_raw: null }
  if (r.includes('injury')) return { win_type: 'INJ', fall_time_seconds: secs, winner_score: null, loser_score: null, score_raw: null }
  const ws = sc ? Number(sc[1]) : null, ls = sc ? Number(sc[2]) : null
  const wt = r.includes('major') ? 'MD' : r.includes('overtime') || r.includes('sudden') ? 'SV-1' : 'DEC'
  return { win_type: wt, fall_time_seconds: null, winner_score: ws, loser_score: ls, score_raw: ws != null ? `${ws}-${ls}` : null }
}

const tours = chk(await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'M').eq('season_id', 2025).in('tournament_type', ['districts', 'regions']), 't')
const distT = new Map(tours.filter(t => t.tournament_type === 'districts').map(t => [Number(t.name.match(/District (\d+)$/)[1]), t.id]))
const tids = tours.map(t => t.id)
const ents = await all((f, t) => db.from('tournament_entries').select('id, tournament_id, weight_class_id, school_id, school_context_raw, wrestler_id, wrestlers(first_name, last_name)').in('tournament_id', tids).range(f, t))
const ms = await all((f, t) => db.from('matches').select('id, tournament_id, weight_class_id, round, bracket_side, win_type, winner_entry_id, loser_entry_id').in('tournament_id', tids).range(f, t))
const pl = await all((f, t) => db.from('placements').select('id, tournament_id, weight_class_id, place, entry_id').in('tournament_id', tids).range(f, t))
const entName = (e: any) => n(`${e.wrestlers.first_name}${e.wrestlers.last_name}`)

// ── 1. finals stored as 3rd-place matches ───────────────────────────────────────────────────────
const relabel: { id: string; label: string }[] = []
const placeFix: { id: string; place: number; label: string }[] = []
// (2026-11-05: not run. The export has no District 10 or Region 2 finals at all: their "3rd Place
// Match" lines are the real 3rd-place matches listed twice. The finals need TrackWrestling's pages.)
for (const [label, tid] of [] as [string, number][]) {
  for (const [wt, wc] of Object.entries(WC)) {
    const b = ms.filter(m => m.tournament_id === tid && m.weight_class_id === wc)
    if (b.some(m => m.round === 'F')) continue
    const sfWinners = new Set(b.filter(m => m.round === 'SF').map(m => m.winner_entry_id))
    const fin = b.filter(m => m.round === '3rd_Place' && sfWinners.has(m.winner_entry_id) && sfWinners.has(m.loser_entry_id))
    if (fin.length !== 1) throw new Error(`${label} ${wt}: ${fin.length} 3rd-place bouts between the semifinal winners`)
    relabel.push({ id: fin[0].id, label: `${label} ${wt}` })
    for (const [entry, place] of [[fin[0].winner_entry_id, 1], [fin[0].loser_entry_id, 2]]) {
      const row = pl.find(p => p.tournament_id === tid && p.entry_id === entry)
      if (row && row.place !== place) placeFix.push({ id: row.id, place, label: `${label} ${wt} place ${row.place} → ${place}` })
      if (!row) placeFix.push({ id: `new:${tid}|${wc}|${entry}`, place, label: `${label} ${wt} new place ${place}` })
    }
  }
}

// ── 2. district bouts never stored ───────────────────────────────────────────────────────────────
const toInsert: { row: any; label: string }[] = []
const newEntries: { key: string; row: any; label: string }[] = []
const newProfiles: { key: string; first: string; last: string; school_id: number; raw: string; label: string }[] = []
const problems: string[] = []
async function entryFor(tid: number, wc: number, name: string, schoolRaw: string): Promise<string | null> {
  const here = ents.filter(e => e.tournament_id === tid && e.weight_class_id === wc && entName(e) === n(name))
  if (here.length === 1) return here[0].id
  if (here.length > 1) { problems.push(`${name}: ${here.length} entries in one bracket`); return null }
  // recreate: the profile linked to that school (school text → school id from this tournament's entries)
  const sch = ents.find(e => e.tournament_id === tid && e.school_context_raw && n(e.school_context_raw) === n(schoolRaw))?.school_id
  if (!sch) { problems.push(`${name}: school "${schoolRaw}" not found in that district`); return null }
  const parts = plain(name).split(' ')
  const prof = chk(await db.from('wrestlers').select('id').eq('gender', 'M').ilike('first_name', parts[0]).ilike('last_name', parts.slice(1).join(' ')), 'w')
  const links = prof.length ? chk(await db.from('wrestler_name_aliases').select('wrestler_id').eq('school_id', sch).in('wrestler_id', prof.map(p => p.id)), 'a') : []
  const ids = [...new Set(links.map(l => l.wrestler_id))]
  let wid = ids[0]
  if (ids.length === 0 && prof.length) {
    // Kyle's rule: the same name at another school in the same season is a different person. Each
    // existing profile must have a 2024-25 entry at another school; then this wrestler gets his own.
    const other = chk(await db.from('tournament_entries').select('wrestler_id, school_id, tournaments!inner(season_id, gender)').in('wrestler_id', prof.map(p => p.id)).eq('tournaments.season_id', 2025).eq('tournaments.gender', 'M'), 'o')
    if (prof.every(p => other.some(o => o.wrestler_id === p.id && o.school_id !== sch))) {
      wid = `newprof:${plain(name)}|${sch}`
      if (!newProfiles.some(x => x.key === wid)) newProfiles.push({ key: wid, first: parts[0], last: parts.slice(1).join(' '), school_id: sch, raw: name, label: `${name} (${schoolRaw}): the existing profile wrestled 2024-25 for another school → new profile` })
    }
  }
  if (!wid) { problems.push(`${name} (${schoolRaw}, school ${sch}): ${prof.length} profiles, ${ids.length} linked at that school`); return null }
  if (ids.length > 1) { problems.push(`${name} (${schoolRaw}, school ${sch}): ${ids.length} profiles linked at that school`); return null }
  const key = `${tid}|${wc}|${wid}`
  if (!newEntries.some(x => x.key === key)) newEntries.push({ key, label: `${name} (${schoolRaw}) → profile ${wid.startsWith("newprof:") ? "(new)" : wid.slice(0, 8)}`, row: { wrestler_id: wid, tournament_id: tid, school_id: sch, weight_class_id: wc, seed: null, wins: 0, losses: 0, school_context_raw: schoolRaw, team_points: 0 } })
  return `new:${key}`
}
for (const b of SRC) {
  const tid = distT.get(b.d); const wc = WC[b.w]; if (!tid || !wc) continue
  const filler = b.loseSchool === '' || /forfeit|^a\.? ?ff$|^[a-z] ff$/i.test(b.lose)
  if (b.winSchool === '' || /forfeit/i.test(b.win)) continue   // filler against filler
  const here = ms.filter(m => m.tournament_id === tid && m.weight_class_id === wc && m.round === b.round)
  const winE = ents.filter(e => e.tournament_id === tid && e.weight_class_id === wc && entName(e) === n(b.win))
  const loseE = ents.filter(e => e.tournament_id === tid && e.weight_class_id === wc && entName(e) === n(b.lose))
  const stored = here.some(m => winE.some(e => e.id === m.winner_entry_id) && (filler ? !m.loser_entry_id : loseE.some(e => e.id === m.loser_entry_id)))
  if (stored) continue
  if (b.d === 10 && b.round === 'QF' && /abuali/i.test(b.lose)) continue   // stored, spelled "Kareem"
  const w = await entryFor(tid, wc, b.win, b.winSchool); if (!w) continue
  const l = filler ? null : await entryFor(tid, wc, b.lose, b.loseSchool); if (!filler && !l) continue
  toInsert.push({ label: `D${b.d} ${b.w} ${b.round}: ${b.line.slice(0, 110)}`, row: { tournament_id: tid, weight_class_id: wc, bracket_side: b.round === '3rd_Place' ? 'consolation' : 'championship', round: b.round, winner_entry_id: w, loser_entry_id: l, ...dbResult(b), validated: true, forfeit_opponent: filler ? 'filler' : null } })
}
// placements decided by a restored 3rd-place match
const newPl: any[] = []
for (const x of toInsert.filter(x => x.row.round === '3rd_Place')) for (const [entry, place] of [[x.row.winner_entry_id, 3], [x.row.loser_entry_id, 4]] as [string, number][]) {
  if (!entry || pl.some(p => p.tournament_id === x.row.tournament_id && p.weight_class_id === x.row.weight_class_id && p.place === place)) continue
  newPl.push({ tournament_id: x.row.tournament_id, weight_class_id: x.row.weight_class_id, place, entry_id: entry })
}

console.log(`finals relabelled: ${relabel.length}; placements corrected: ${placeFix.length}`)
console.log(`bouts to restore: ${toInsert.length}; new entries: ${newEntries.length}; new placements: ${newPl.length}`)
for (const p of newProfiles) console.log('  profile:', p.label)
for (const e of newEntries) console.log('  entry:', e.label)
for (const x of toInsert) console.log('  bout:', x.label)
if (problems.length) { console.log('NOT RESOLVED:'); for (const p of problems) console.log('  ', p) }
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
if (problems.length) throw new Error('unresolved wrestlers: fix first')

fs.writeFileSync('docs/migrations/backups/20261105_2025_bracket_repairs_before.json', JSON.stringify({ placements: pl.filter(p => placeFix.some(f => f.id === p.id)), relabel, toInsert, newEntries, newProfiles, newPl }, null, 1))
const madeProf = new Map<string, string>()
for (const p of newProfiles) {
  const id = chk(await db.from('wrestlers').insert({ first_name: p.first, last_name: p.last, gender: 'M', is_active: false, is_oos: false }).select('id'), 'profile')[0].id
  chk(await db.from('wrestler_name_aliases').insert({ raw_name: p.raw, school_id: p.school_id, wrestler_id: id }).select('id'), 'link')
  madeProf.set(p.key, id)
}
for (const e of newEntries) if (String(e.row.wrestler_id).startsWith('newprof:')) e.row.wrestler_id = madeProf.get(e.row.wrestler_id)
const created = new Map<string, string>()
for (const e of newEntries) created.set(e.key, chk(await db.from('tournament_entries').insert(e.row).select('id'), 'entry')[0].id)
const res = (x: string | null) => x?.startsWith('new:') ? created.get(x.slice(4))! : x
for (const f of placeFix) {
  if (f.id.startsWith('new:')) { const [tid, wc, entry] = f.id.slice(4).split('|'); chk(await db.from('placements').insert({ tournament_id: Number(tid), weight_class_id: Number(wc), place: f.place, entry_id: entry }).select('id'), 'pl new') }
  else chk(await db.from('placements').update({ place: f.place }).eq('id', f.id).select('id'), 'pl fix')
}
if (newPl.length) chk(await db.from('placements').insert(newPl.map(p => ({ ...p, entry_id: res(p.entry_id) }))).select('id'), 'pl add')
fs.writeFileSync('docs/migrations/backups/20261105_2025_bracket_repairs_inserted.json', JSON.stringify({ profiles: [...madeProf.entries()], entries: [...created.entries()] }, null, 1))
const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const cols = ['tournament_id', 'weight_class_id', 'bracket_side', 'round', 'winner_entry_id', 'loser_entry_id', 'win_type', 'winner_score', 'loser_score', 'fall_time_seconds', 'score_raw', 'validated', 'forfeit_opponent']
fs.writeFileSync(SQL, `-- docs/migrations/20261105_2025_bracket_repairs.sql
--
-- Boys 2024-25 bracket repairs from TrackWrestling's 2024-25 export (scripts/fix_2025_brackets_20261105.mts).
-- 1. ${relabel.length} finals stored as 3rd-place matches (the export labels District 10's and Region 2's
--    finals "3rd Place Match") become finals. Their placements were corrected to 1st / 2nd by the
--    service role.
-- 2. ${toInsert.length} district bouts the 2026-03-20 load never stored (shared-name wrestlers, nickname names,
--    forfeits over filler entries). ${created.size} entries were recreated by the service role (ids in
--    backups/20261105_2025_bracket_repairs_inserted.json).
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

${relabel.map(r => `UPDATE matches SET round = 'F', bracket_side = 'championship' WHERE id = ${q(r.id)} AND round = '3rd_Place';  -- ${r.label}`).join('\n')}

INSERT INTO matches (${cols.join(', ')}) VALUES
${toInsert.map((x, i) => `  (${cols.map(c => q(c.endsWith('entry_id') ? res(x.row[c]) : x.row[c])).join(', ')})${i === toInsert.length - 1 ? ';' : ','}  -- ${x.label.replace(/\n/g, ' ')}`).join('\n')}

COMMIT;

-- Verify: District 10 and Region 2 have 14 finals each
SELECT t.name, count(*) FILTER (WHERE m.round = 'F') AS finals
FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE t.season_id = 2025 AND t.gender = 'M' AND t.name IN ('Boy_s Districts District 10', 'Boy_s Regions r2')
GROUP BY t.name;
`)
console.log(`APPLIED: ${created.size} entries, ${placeFix.length + newPl.length} placement changes. Run ${SQL} in the SQL editor.`)
