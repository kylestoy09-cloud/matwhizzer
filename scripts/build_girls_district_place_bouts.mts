// Girls 2025-26 districts: the 3rd and 5th place bouts were never imported (2026-11-02).
// The TrackWrestling export (../gt_s2_girls_districts.txt) lists 144 "3rd Place Match" and 143
// "5th Place Match" bouts; matches had none, so girls district pages showed no 3rd-6th places.
// This reads them, matches both wrestlers to their entries in that district at that weight, and
// writes the INSERT migration (the service role can only read matches).
//   npx tsx --tsconfig tsconfig.json scripts/build_girls_district_place_bouts.mts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const norm = (s: string) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[`'’.]/g, '').replace(/-/g, ' ').replace(/\s+/g, ' ').trim()

// ── parse the export ──────────────────────────────────────────────────────────────────────
type Bout = { district: number; weight: number; round: '3rd_Place' | '5th_Place'; w: string; wSchool: string; l: string; lSchool: string; detail: string; line: string }
const bouts: Bout[] = []
const FORFEIT = /^(forfeit( forfeit| [a-z])?|[a-z] forfeit)$/i
let district = 0, weight = 0
// school names can hold brackets: "Voorhees (Glen Gardner)", "Northern Burlington ( Columbus)"
const SCH = String.raw`\(((?:[^()]|\([^()]*\))*)\)`
const LINE = new RegExp(String.raw`^(3rd|5th) Place Match - (.+?) ${SCH} \d+-\d+ won (?:by|in) .+? over (.+?) ${SCH} \d+-\d+ \((.+)\)$`)
const BYE = new RegExp(String.raw`^(3rd|5th) Place Match - (.+?) ${SCH} \d+-\d+ received a bye (.*?) ?(?:${SCH} \d+-\d+ )?\(Bye\)$`)
for (const raw of fs.readFileSync('../gt_s2_girls_districts.txt', 'utf8').split('\n')) {
  const line = raw.trim()
  let m: RegExpMatchArray | null
  if ((m = line.match(/^District (\d+)$/))) { district = Number(m[1]); continue }
  if (/^\d{3}$/.test(line)) { weight = Number(line); continue }
  if (!/^(3rd|5th) Place Match - /.test(line)) continue
  if ((m = line.match(BYE))) {
    // a placement by bye: the winner places, nobody is beaten. Forfeit-vs-forfeit byes are not bouts.
    if (!FORFEIT.test(m[2])) bouts.push({ district, weight, round: m[1] === '3rd' ? '3rd_Place' : '5th_Place', w: m[2], wSchool: m[3], l: '', lSchool: '', detail: 'Bye', line })
    continue
  }
  if (!(m = line.match(LINE))) { console.log('UNPARSED', district, weight, line); continue }
  bouts.push({ district, weight, round: m[1] === '3rd' ? '3rd_Place' : '5th_Place', w: m[2], wSchool: m[3], l: m[4], lSchool: m[5], detail: m[6], line })
}

// result → win_type, scores, fall time (same codes the district import used)
function result(d: string) {
  const time = (t: string) => { const [mm, ss] = t.split(':').map(Number); return mm * 60 + ss }
  let m: RegExpMatchArray | null
  if ((m = d.match(/^Fall (\d+:\d+)/))) return { win_type: 'FALL', fall_time_seconds: time(m[1]), winner_score: null, loser_score: null }
  if ((m = d.match(/^TF-1\.5 (\d+:\d+) \((\d+)-(\d+)\)/))) return { win_type: 'TF-1.5', fall_time_seconds: time(m[1]), winner_score: Number(m[2]), loser_score: Number(m[3]) }
  if ((m = d.match(/^MD (\d+)-(\d+)/))) return { win_type: 'MD', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^(?:Dec|SV-1|TB-1|UTB) (\d+)-(\d+)/))) return { win_type: d.startsWith('Dec') ? 'DEC' : d.split(' ')[0], fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if ((m = d.match(/^OT (\d+)-(\d+)/))) return { win_type: 'SV-1', fall_time_seconds: null, winner_score: Number(m[1]), loser_score: Number(m[2]) }
  if (d === 'Bye') return { win_type: 'BYE', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^(For\.|M\. For\.)/.test(d)) return { win_type: 'FORF', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^Inj\./.test(d)) return { win_type: 'INJ', fall_time_seconds: null, winner_score: null, loser_score: null }
  if (/^DQ/.test(d)) return { win_type: 'DQ', fall_time_seconds: null, winner_score: null, loser_score: null }
  return null
}

// ── match wrestlers to their district entries ─────────────────────────────────────────────
const tourn = new Map(chk(await db.from('tournaments').select('id, name').eq('gender', 'F').eq('season_id', 2026).eq('tournament_type', 'districts'), 't')
  .map(t => [Number(t.name.match(/District (\d+)/)[1]), t.id]))
const wcs = new Map(chk(await db.from('weight_classes').select('id, weight').eq('gender', 'F'), 'wc').map(w => [w.weight, w.id]))
const entries = new Map<string, { id: string; names: Set<string> }[]>()
for (const [d, tid] of tourn) {
  const rows = chk(await db.from('tournament_entries').select('id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', tid), 'entries')
  for (const e of rows) {
    const k = `${d}|${e.weight_class_id}`; const list = entries.get(k) ?? []; entries.set(k, list)
    list.push({ id: e.id, names: new Set([norm(`${e.wrestlers.first_name} ${e.wrestlers.last_name}`)]) })
  }
}
const existing = new Set<string>()
for (const tid of tourn.values()) for (const m of chk(await db.from('matches').select('round, weight_class_id').eq('tournament_id', tid).in('round', ['3rd_Place', '5th_Place']), 'existing')) existing.add(`${tid}|${m.weight_class_id}|${m.round}`)

const rows: any[] = [], problems: string[] = [], loose: string[] = []
const lev = (a: string, b: string) => { const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length] }
for (const b of bouts) {
  const tid = tourn.get(b.district), wc = wcs.get(b.weight)
  if (!tid || !wc) { problems.push(`no tournament/weight: ${b.line}`); continue }
  if (existing.has(`${tid}|${wc}|${b.round}`)) { problems.push(`already in matches: D${b.district} ${b.weight} ${b.round}`); continue }
  const pool = entries.get(`${b.district}|${wc}`) ?? []
  // exact name; else one entry whose name is a long prefix of it (profile names cut at ~19
  // characters: "Ashley Romero-Tamay"); else one within 2 letters ("Cristell" / "Cristelle")
  const find = (n: string) => {
    const k = norm(n); let c = pool.filter(e => e.names.has(k))
    if (!c.length) { c = pool.filter(e => [...e.names].some(x => x.length >= 12 && (k.startsWith(x) || x.startsWith(k)))); if (c.length === 1) loose.push(`prefix  ${n} → ${[...c[0].names][0]}`) }
    if (!c.length) { c = pool.filter(e => [...e.names].some(x => lev(x, k) <= 2)); if (c.length === 1) loose.push(`spelling ${n} → ${[...c[0].names][0]}`) }
    return c
  }
  const r = result(b.detail)
  const W = find(b.w)
  const loserNone = b.detail === 'Bye' || FORFEIT.test(b.l)     // empty slot: the winner places, no loser entry
  const L = loserNone ? [{ id: null }] : find(b.l)
  if (W.length !== 1 || L.length !== 1 || !r) { problems.push(`D${b.district} ${b.weight} ${b.round}: winner ${W.length}, loser ${L.length}, result ${r ? 'ok' : 'UNKNOWN ' + b.detail} | ${b.w} over ${b.l}`); continue }
  rows.push({ tournament_id: tid, weight_class_id: wc, bracket_side: 'consolation', round: b.round, winner_entry_id: W[0].id, loser_entry_id: L[0].id, ...(loserNone && r.win_type !== 'BYE' ? { ...r, win_type: 'FORF' } : r), validated: true, _src: `D${b.district} ${b.weight}: ${b.w} over ${b.l || '(bye)'} (${b.detail})` })
}
console.log(`parsed ${bouts.length} (3rd ${bouts.filter(b => b.round === '3rd_Place').length}, 5th ${bouts.filter(b => b.round === '5th_Place').length}); ready ${rows.length}; problems ${problems.length}`)
console.log(problems.join('\n'))
console.log('loose name matches:\n' + loose.join('\n'))

const q = (v: any) => v == null ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`
const values = rows.map(r => `  -- ${r._src.replace(/\n/g, ' ')}\n  (${r.tournament_id}, ${r.weight_class_id}, 'consolation', '${r.round}', '${r.winner_entry_id}', ${q(r.loser_entry_id)}, '${r.win_type}', ${q(r.winner_score)}, ${q(r.loser_score)}, ${q(r.fall_time_seconds)}, true)`)
const sql = `-- Girls 2025-26 districts: add the 3rd and 5th place bouts (2026-11-02)
--
-- The TrackWrestling export (gt_s2_girls_districts.txt) lists ${bouts.filter(b => b.round === '3rd_Place').length} "3rd Place Match" and ${bouts.filter(b => b.round === '5th_Place').length} "5th Place Match"
-- bouts; the district import never loaded them, so girls district pages showed no 3rd-6th places
-- and the consolation bracket stopped at C3 (the consolation semifinal). Kyle checked the original
-- documents: every 3rd place match is listed. Each row's wrestlers are matched to their entry in
-- that district at that weight (built by scripts/build_girls_district_place_bouts.mts).
-- ROLLBACK: DELETE FROM matches WHERE round IN ('3rd_Place','5th_Place') AND tournament_id IN
--   (SELECT id FROM tournaments WHERE gender = 'F' AND season_id = 2026 AND tournament_type = 'districts');

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM matches m JOIN tournaments t ON t.id = m.tournament_id
             WHERE t.gender = 'F' AND t.season_id = 2026 AND t.tournament_type = 'districts'
               AND m.round IN ('3rd_Place', '5th_Place')) THEN
    RAISE EXCEPTION 'girls 2025-26 district place bouts already exist; migration already applied?';
  END IF;

  INSERT INTO matches (tournament_id, weight_class_id, bracket_side, round, winner_entry_id, loser_entry_id, win_type, winner_score, loser_score, fall_time_seconds, validated)
  VALUES
${values.join(',\n')};
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> ${rows.length} THEN RAISE EXCEPTION 'expected ${rows.length} bouts, got %', n; END IF;
END $$;
`
fs.writeFileSync('docs/migrations/20261102_girls_district_place_bouts.sql', sql)
console.log('wrote docs/migrations/20261102_girls_district_place_bouts.sql')
