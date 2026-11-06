// Boys 2024-25 District 10, Region 2 and Region 7 from TrackWrestling's per-tournament CSV exports
// (../Match Data/NJSIAADistrict10.csv, NJSIAARegion2.csv, NJSIAARegion7.csv, added by Kyle 2026-11-05).
// The season export (2025 District Data.py / 2025 Region Data.py) lacks District 10's and Region 2's
// finals (District 10's 3rd-place matches were copied twice in their place, and both copies were
// stored) and Region 7's consolation rounds and 3rd-place matches.
// 1. compares every stored bout of the three tournaments with the CSV;
// 2. District 10: the second copy of each 3rd-place match becomes that weight's final;
//    Region 2: finals added; Region 7: Cons. Round 1, Cons. Semi and 3rd-place matches added;
// 3. lists duplicate placement rows and checks each kept row against the CSV.
//   npx tsx --tsconfig tsconfig.json scripts/fix_2025_csv_brackets_20261105.mts [--apply]
// --apply writes the SQL file (matches are SQL-editor only); placements are written after it runs.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await q(i, i + 999), 'page'); o.push(...d); if (d.length < 1000) break } return o }
const SQL = 'docs/migrations/20261105_2025_csv_brackets.sql'
const WC: Record<number, number> = { 106: 53, 113: 54, 120: 55, 126: 56, 132: 57, 138: 58, 144: 59, 150: 60, 157: 61, 165: 62, 175: 63, 190: 64, 215: 65, 285: 66 }
const RND: Record<string, [string, string]> = {
  'Champ. Round 1': ['championship', 'R2'], Quarterfinal: ['championship', 'QF'], Semifinal: ['championship', 'SF'], '1st Place Match': ['championship', 'F'],
  'Cons. Round 1': ['consolation', 'C1'], 'Cons. Semi': ['consolation', 'C3'], '3rd Place Match': ['consolation', '3rd_Place'], '5th Place Match': ['consolation', '5th_Place'],
}
const n = (s: string) => s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z]/g, '')
const FILES: [string, string][] = [['../Match Data/NJSIAADistrict10.csv', 'Boy_s Districts District 10'], ['../Match Data/NJSIAARegion2.csv', 'Boy_s Regions r2'], ['../Match Data/NJSIAARegion7.csv', 'Boy_s Regions r7']]
const cell = (s: string) => s.replace(/^="?|"$/g, '').replace(/^"|"$/g, '')
function parseCsv(text: string) { const rows: string[][] = []; for (const line of text.split(/\r?\n/)) { if (!line.trim()) continue; const out: string[] = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = '' } else cur += c }
  out.push(cur); rows.push(out.map(cell)) } return rows }
const result = (wt: string, res: string) => {
  const t = res.match(/(\d+):(\d\d)/), sc = res.match(/^(\d+)-(\d+)/); const secs = t ? Number(t[1]) * 60 + Number(t[2]) : null
  const ws = sc && !(sc[1] === '0' && sc[2] === '0') ? Number(sc[1]) : null, ls = ws != null ? Number(sc![2]) : null
  const W: Record<string, string> = { F: 'FALL', DEC: 'DEC', MD: 'MD', TF: 'TF-1.5', FOR: 'FORF', 'M FOR': 'M-FORF', DEF: 'INJ', DQ: 'DQ' }
  if (!W[wt]) throw new Error(`win type ${wt}`)
  // the CSV's DEC covers overtime: "4-1 SV" sudden victory, "TB" tiebreaker
  const win_type = wt === 'DEC' && / SV/.test(res) ? 'SV-1' : wt === 'DEC' && / (UTB|TB)/.test(res) ? 'UTB' : W[wt]
  if (win_type === 'FALL') return { win_type, winner_score: null, loser_score: null, fall_time_seconds: secs, score_raw: secs != null ? `Fall ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : null }
  if (win_type === 'TF-1.5') return { win_type, winner_score: ws, loser_score: ls, fall_time_seconds: secs, score_raw: ws != null ? `TF-1.5 ${ws}-${ls}` : null }
  if (['FORF', 'M-FORF', 'INJ', 'DQ'].includes(win_type)) return { win_type, winner_score: null, loser_score: null, fall_time_seconds: win_type === 'INJ' ? secs : null, score_raw: null }
  return { win_type, winner_score: ws, loser_score: ls, fall_time_seconds: null, score_raw: ws != null ? `${ws}-${ls}` : null }
}
// CSV spelling → stored spelling
const ALIAS: Record<string, string> = { karamabuali: 'kareemabuali' }
const nm2 = (s: string) => ALIAS[n(s)] ?? n(s)

const T = chk(await db.from('tournaments').select('id, name').eq('gender', 'M').eq('season_id', 2025).in('name', FILES.map(f => f[1])), 't')
const report: string[] = [], updates: { id: string; row: any; label: string }[] = [], inserts: { row: any; label: string }[] = [], problems: string[] = []
const plDup: any[] = [], plCheck: string[] = [], plNew: any[] = []
for (const [file, name] of FILES) {
  const tid = T.find(t => t.name === name)!.id
  const rows = parseCsv(fs.readFileSync(file, 'utf8')).slice(1).map(r => ({ w: Number(r[1]), rnd: r[2], win: r[3], winSchool: r[4], res: r[5], wt: r[6], lose: r[7], loseSchool: r[8] })).filter(r => r.wt !== 'BYE')
  const ents = await all((f, t) => db.from('tournament_entries').select('id, weight_class_id, school_id, wrestlers(first_name, last_name)').eq('tournament_id', tid).range(f, t))
  const ms = await all((f, t) => db.from('matches').select('*').eq('tournament_id', tid).range(f, t))
  const pl = await all((f, t) => db.from('placements').select('id, weight_class_id, place, entry_id').eq('tournament_id', tid).order('id').range(f, t))
  const en = new Map(ents.map(e => [e.id, n(`${e.wrestlers.first_name}${e.wrestlers.last_name}`)]))
  const entryOf = (wc: number, nm: string) => { const x = ents.filter(e => e.weight_class_id === wc && en.get(e.id) === nm2(nm)); if (x.length !== 1) problems.push(`${name} wc${wc}: "${nm}" matches ${x.length} entries`); return x[0]?.id }
  const used = new Set<string>(); let same = 0, diff = 0
  const missing: typeof rows = []
  for (const r of rows) {
    const wc = WC[r.w], [side, round] = RND[r.rnd]
    const m = ms.find(m => !used.has(m.id) && m.weight_class_id === wc && m.round === round && en.get(m.winner_entry_id) === nm2(r.win) && (m.loser_entry_id ? en.get(m.loser_entry_id) === nm2(r.lose) : !r.lose))
    if (!m) { missing.push(r); continue }
    used.add(m.id); const want = result(r.wt, r.res)
    const bad = (['win_type', 'winner_score', 'loser_score', 'fall_time_seconds'] as const).filter(k => !(k === 'win_type' && want.win_type === 'M-FORF' && m.win_type === 'FORF') && !(k === 'fall_time_seconds' && m.win_type === 'TF-1.5' && m[k] === 0 && want[k] == null) && (m[k] ?? null) !== (want[k] ?? null))
    if (bad.length) { diff++; report.push(`  ${name} ${r.w} ${round} ${r.win} over ${r.lose}: stored ${bad.map(k => `${k}=${m[k]}`).join(' ')} | CSV ${r.wt} ${r.res}`) } else same++
  }
  const extra = ms.filter(m => !used.has(m.id))
  console.log(`${name}: CSV bouts ${rows.length}, stored ${ms.length}; matched ${same + diff} (${diff} with a different result), CSV-only ${missing.length}, stored-only ${extra.length}`)
  const extraBy: Record<string, number> = {}; for (const m of extra) extraBy[m.round] = (extraBy[m.round] ?? 0) + 1
  const missBy: Record<string, number> = {}; for (const r of missing) missBy[r.rnd] = (missBy[r.rnd] ?? 0) + 1
  console.log('   CSV-only by round', missBy, '| stored-only by round', extraBy)
  // stored-only must all be duplicate copies of a matched bout
  const isCopy = (m: any) => ms.some(o => o.id !== m.id && used.has(o.id) && o.weight_class_id === m.weight_class_id && o.round === m.round && o.winner_entry_id === m.winner_entry_id && o.loser_entry_id === m.loser_entry_id)
  const notCopy = extra.filter(m => !isCopy(m)); if (notCopy.length) problems.push(`${name}: ${notCopy.length} stored bouts not in the CSV and not a copy: ${notCopy.map(m => m.id).join(', ')}`)
  for (const r of missing) {
    const wc = WC[r.w], [side, round] = RND[r.rnd]
    const row = { tournament_id: tid, weight_class_id: wc, bracket_side: side, round, winner_entry_id: entryOf(wc, r.win), loser_entry_id: r.lose ? entryOf(wc, r.lose) : null, ...result(r.wt, r.res), validated: true, forfeit_opponent: null }
    const label = `${name} ${r.w} ${r.rnd}: ${r.win} (${r.winSchool}) over ${r.lose} (${r.loseSchool}) ${r.wt} ${r.res}`
    const copy = round === 'F' ? extra.find(m => m.weight_class_id === wc && m.round === '3rd_Place' && !updates.some(u => u.id === m.id)) : undefined
    if (copy) updates.push({ id: copy.id, row, label }); else inserts.push({ row, label })
  }
  if (extra.length !== updates.filter(u => u.row.tournament_id === tid).length) problems.push(`${name}: ${extra.length} stored-only bouts, ${updates.filter(u => u.row.tournament_id === tid).length} reused as finals`)
  // placements: final standing from the CSV
  const want = new Map<string, number>()
  for (const r of rows) { const pr: Record<string, [number, number]> = { '1st Place Match': [1, 2], '3rd Place Match': [3, 4], '5th Place Match': [5, 6] }; const p = pr[r.rnd]; if (!p) continue
    const wc = WC[r.w]; const a = entryOf(wc, r.win); if (a) want.set(`${wc}|${p[0]}`, a as any); if (r.lose) { const b = entryOf(wc, r.lose); if (b) want.set(`${wc}|${p[1]}`, b as any) } }
  const seen = new Map<string, any>()
  for (const p of pl) { const k = `${p.weight_class_id}|${p.place}|${p.entry_id}`; if (seen.has(k)) plDup.push({ ...p, tournament: name, keeps: seen.get(k).id }); else seen.set(k, p) }
  for (const [k, entry] of want) { const [wc, place] = k.split('|').map(Number); const kept = [...seen.values()].filter(p => p.weight_class_id === wc && p.place === place)
    if (kept.length === 0) plNew.push({ tournament_id: tid, weight_class_id: wc, place, entry_id: entry, label: `${name} wc${wc} place ${place}` })
    else if (kept.length > 1 || kept[0].entry_id !== entry) plCheck.push(`${name} wc${wc} place ${place}: kept ${kept.map(p => p.entry_id.slice(0, 8)).join(',')} vs CSV ${String(entry).slice(0, 8)}`) }
  const wrongPlace = [...seen.values()].filter(p => p.place <= 6 && !want.has(`${p.weight_class_id}|${p.place}`))
  for (const p of wrongPlace) plCheck.push(`${name} wc${p.weight_class_id} place ${p.place}: stored, but the CSV has no bout deciding it`)
}
if (report.length) { console.log('Different results:'); for (const r of report) console.log(r) }
console.log(`\nfinals from duplicate 3rd-place rows: ${updates.length}; bouts to add: ${inserts.length}`)
for (const u of updates) console.log('  replace:', u.label)
for (const x of inserts) console.log('  add:', x.label)
console.log(`\nduplicate placement rows: ${plDup.length} (${[...new Set(plDup.map(p => p.tournament))].map(t => `${t} ${plDup.filter(p => p.tournament === t).length}`).join(', ')})`)
console.log(`kept placement rows that disagree with the CSV: ${plCheck.length}`); for (const c of plCheck) console.log('  ', c)
console.log(`placements to add: ${plNew.length}`); for (const p of plNew) console.log('  ', p.label)
if (problems.length) { console.log('PROBLEMS:'); for (const p of problems) console.log('  ', p) }
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
if (problems.length) throw new Error('fix problems first')

// ── apply ──────────────────────────────────────────────────────────────────────────────────────
// Each duplicate placement row (an exact copy of a kept row) becomes one of the missing placements,
// so nothing is deleted. The 14 duplicate District 10 3rd-place bouts become the finals (same ids:
// their rating-log rows are replaced when the 2024-25 ratings are rebuilt).
const backup = { matches: [] as any[], placements: plDup }
for (const u of updates) backup.matches.push(chk(await db.from('matches').select('*').eq('id', u.id), 'm')[0])
fs.writeFileSync('docs/migrations/backups/20261105_2025_csv_brackets_before.json', JSON.stringify(backup, null, 1))
for (const t of T) {
  const dups = plDup.filter(p => p.tournament === t.name), need = plNew.filter(p => p.tournament_id === t.id)
  if (dups.length !== need.length) throw new Error(`${t.name}: ${dups.length} duplicate rows for ${need.length} missing placements`)
  for (let i = 0; i < need.length; i++) chk(await db.from('placements').update({ weight_class_id: need[i].weight_class_id, place: need[i].place, entry_id: need[i].entry_id }).eq('id', dups[i].id).select('id'), 'placement')
}
const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const cols = ['tournament_id', 'weight_class_id', 'bracket_side', 'round', 'winner_entry_id', 'loser_entry_id', 'win_type', 'winner_score', 'loser_score', 'fall_time_seconds', 'score_raw', 'validated', 'forfeit_opponent']
const set = ['bracket_side', 'round', 'winner_entry_id', 'loser_entry_id', 'win_type', 'winner_score', 'loser_score', 'fall_time_seconds', 'score_raw']
fs.writeFileSync(SQL, `-- docs/migrations/20261105_2025_csv_brackets.sql
--
-- Boys 2024-25 District 10, Region 2 and Region 7 from TrackWrestling's per-tournament CSV exports
-- (Match Data/NJSIAADistrict10.csv, NJSIAARegion2.csv, NJSIAARegion7.csv; scripts/fix_2025_csv_brackets_20261105.mts).
-- Every bout already stored in the three tournaments matched the CSVs (82 + 223 + 168).
-- 1. District 10: the ${updates.length} duplicate 3rd-place bouts (the season export listed the 3rd-place
--    matches twice in place of the finals) become the finals.
-- 2. ${inserts.length} bouts added: Region 2's 14 finals; Region 7's Cons. Round 1, Cons. Semi and 3rd-place matches.
-- Placements were set by the service role (the 84 duplicate placement rows now hold the missing
-- 1st/2nd and 3rd/4th places). Before: backups/20261105_2025_csv_brackets_before.json.
-- Run in the Supabase SQL editor. All or nothing.

BEGIN;

${updates.map(u => `UPDATE matches SET ${set.map(c => `${c} = ${q(u.row[c])}`).join(', ')} WHERE id = ${q(u.id)} AND round = '3rd_Place';  -- ${u.label}`).join('\n')}

INSERT INTO matches (${cols.join(', ')}) VALUES
${inserts.map((x, i) => `  (${cols.map(c => q(x.row[c])).join(', ')})${i === inserts.length - 1 ? ';' : ','}  -- ${x.label}`).join('\n')}

COMMIT;

-- Verify: District 10 14 finals / 14 3rd; Region 2 14 finals; Region 7 28 C1, 28 C3, 14 3rd
SELECT t.name, m.round, count(*) FROM matches m JOIN tournaments t ON t.id = m.tournament_id
WHERE t.season_id = 2025 AND t.gender = 'M' AND t.name IN ('Boy_s Districts District 10', 'Boy_s Regions r2', 'Boy_s Regions r7')
  AND m.round IN ('F', '3rd_Place', 'C1', 'C3') GROUP BY 1, 2 ORDER BY 1, 2;
`)
console.log(`APPLIED: ${plNew.length} placements set. Run ${SQL} in the SQL editor (${updates.length} updates, ${inserts.length} inserts).`)
