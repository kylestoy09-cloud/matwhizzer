// Girls postseason team scoring: the boys TrackWrestling rules (docs/reviews/trackwrestling_team_scoring.md)
// run on girls brackets, against the official copied totals (precomputed_team_scores). Read-only.
// Championship rounds are the ones each bracket has (R1 / R2 first round, QF, SF, F); placement points
// are tried per level to find the table each uses.
//   npx tsx --tsconfig tsconfig.json scripts/check_girls_team_scoring.mts [--detail <tournament id>]
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw error; o.push(...data); if (data.length < 1000) break } return o }
const LABELS: Record<string, string> | null = process.argv.includes('--labels') ? JSON.parse((await import('fs')).readFileSync(process.argv[process.argv.indexOf('--labels') + 1], 'utf8')) : null
const DETAIL = process.argv.includes('--detail') ? Number(process.argv[process.argv.indexOf('--detail') + 1]) : null
const TABLES: Record<string, number[]> = {
  '16/12/9/7/5/3/2/1': [16, 12, 9, 7, 5, 3, 2, 1], '16/12/9/7/5/3': [16, 12, 9, 7, 5, 3], '14/10/7/4': [14, 10, 7, 4],
  '12/9/7/5/3/1': [12, 9, 7, 5, 3, 1],
  // NFHS-style tables, tried for the girls districts (2026-11-09)
  '16/12/10/9/7/6': [16, 12, 10, 9, 7, 6], '16/12/11/9/7/5': [16, 12, 11, 9, 7, 5], '17/13/11/9/7/5': [17, 13, 11, 9, 7, 5], '16/12/10/9/7/6/4/3': [16, 12, 10, 9, 7, 6, 4, 3], '14/10/7/5/3/1': [14, 10, 7, 5, 3, 1], '16/12/10/8/6/4': [16, 12, 10, 8, 6, 4], '20/16/12/10/8/6/4/2': [20, 16, 12, 10, 8, 6, 4, 2],
}
const PLACE_OF: Record<string, [number, number]> = { F: [1, 2], '3rd_Place': [3, 4], '5th_Place': [5, 6], '7th_Place': [7, 8] }
const tours = (await db.from('tournaments').select('id, name, tournament_type, season_id').eq('gender', 'F').order('id')).data!
// --only 1,2,3: just these tournament ids (e.g. the brackets that match the export exactly)
const ONLY = process.argv.includes('--only') ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(',').map(Number)) : null
if (ONLY) tours.splice(0, tours.length, ...tours.filter(t => ONLY.has(t.id)))
type T = { t: any; ents: any[]; ms: any[]; pl: Map<string, number>; off: any[]; ord: string[] }
const data: T[] = []
for (const t of tours) {
  const ents = await all((f, to) => db.from('tournament_entries').select('id, school_id, weight_class_id, wrestlers(first_name, last_name)').eq('tournament_id', t.id).range(f, to))
  const ms = (await all((f, to) => db.from('matches').select('id, round, bracket_side, winner_entry_id, loser_entry_id, win_type, forfeit_opponent, validated').eq('tournament_id', t.id).range(f, to))).filter((m: any) => m.validated !== false)
  // --labels <file.json>: forfeit_opponent values to try before a migration sets them ({ match id: 'filler' | 'empty' })
  if (LABELS) for (const m of ms) if (LABELS[m.id]) m.forfeit_opponent = LABELS[m.id]
  const pl = new Map((await all((f, to) => db.from('placements').select('entry_id, place').eq('tournament_id', t.id).range(f, to))).map((p: any) => [p.entry_id, p.place]))
  const off = (await db.from('precomputed_team_scores').select('school_id, school_name, total_points').eq('tournament_id', t.id)).data!
  const present = new Set(ms.filter((m: any) => m.bracket_side === 'championship').map((m: any) => m.round))
  // the 2025-26 girls districts are 32-wrestler brackets whose first round is all byes (not stored): count
  // from Round 1 so a bye there is credited like any other (2026-11-09)
  const ord = t.tournament_type === 'districts' && t.season_id === 2026 ? ['R1', 'R2', 'QF', 'SF', 'F'] : ['R1', 'R2', 'QF', 'SF', 'F'].filter(r => present.has(r))
  data.push({ t, ents, ms, pl, off, ord })
}
function entryPoints(d: T, e: any, table: number[]) {
  const mine = d.ms.filter(m => m.winner_entry_id === e.id || m.loser_entry_id === e.id)
  let pts = 0
  for (const m of mine) if (m.winner_entry_id === e.id) {
    pts += PLACE_OF[m.round] ? 0 : m.bracket_side === 'championship' ? 2 : 1
    const wt = String(m.win_type ?? '')
    pts += !m.loser_entry_id || ['FALL', 'FORF', 'M-FORF', 'INJ', 'DQ'].includes(wt) ? 2 : wt.startsWith('TF') ? 1.5 : wt === 'MD' ? 1 : 0
  }
  const champ = mine.filter(m => m.bracket_side === 'championship' && d.ord.includes(m.round)).sort((a, b) => d.ord.indexOf(a.round) - d.ord.indexOf(b.round))
  if (champ.length) {
    const first = d.ord.indexOf(champ[0].round)
    const nextContested = champ.find(m => m.forfeit_opponent !== 'empty')
    if (first > 0 && nextContested?.winner_entry_id === e.id) pts += 2 * first
    for (let i = 1; i < champ.length; i++) { const gap = d.ord.indexOf(champ[i].round) - d.ord.indexOf(champ[i - 1].round) - 1; if (gap > 0 && champ[i].winner_entry_id === e.id) pts += 2 * gap }
  }
  let place = d.pl.get(e.id)
  if (place == null) { const pm = mine.find(m => PLACE_OF[m.round]); if (pm) place = PLACE_OF[pm.round][pm.winner_entry_id === e.id ? 0 : 1] }
  if (place != null) pts += table[place - 1] ?? 0
  return pts
}
const schoolTotals = (d: T, table: number[]) => { const s = new Map<number, number>(); for (const e of d.ents) if (e.school_id) s.set(e.school_id, (s.get(e.school_id) ?? 0) + entryPoints(d, e, table)); return s }
const groups = new Map<string, T[]>(); for (const d of data) { const k = `${d.t.season_id} ${d.t.tournament_type}`; (groups.get(k) ?? groups.set(k, []).get(k)!).push(d) }
for (const [k, ds] of groups) {
  const res = Object.entries(TABLES).map(([name, table]) => { let eq = 0, n = 0; for (const d of ds) { const s = schoolTotals(d, table); for (const o of d.off) { n++; if (Math.abs((s.get(o.school_id) ?? 0) - Number(o.total_points)) < 0.01) eq++ } } return { name, eq, n } }).sort((a, b) => b.eq - a.eq)
  console.log(`${k} (${ds.length} tournaments, rounds ${[...new Set(ds.map(d => d.ord.join('-')))].join(' | ')}): best ${res[0].name} ${res[0].eq}/${res[0].n}; next ${res[1].name} ${res[1].eq}/${res[1].n}`)
}
if (DETAIL) {
  const d = data.find(x => x.t.id === DETAIL)!; const k = `${d.t.season_id} ${d.t.tournament_type}`
  const table = TABLES[process.argv[process.argv.indexOf('--detail') + 2] ?? '16/12/9/7/5/3/2/1']
  const s = schoolTotals(d, table)
  for (const o of d.off.sort((a, b) => b.total_points - a.total_points)) console.log(`   ${o.school_name}: official ${o.total_points}, ours ${s.get(o.school_id) ?? 0}`)
}

// --fit <season> <type>: solve the placement table from the data (official total minus all non-placement
// points = sum over places of count x points), least squares, 8 places
if (process.argv.includes('--fit')) {
  const [fs, ft] = process.argv.slice(process.argv.indexOf('--fit') + 1, process.argv.indexOf('--fit') + 3)
  const ds = data.filter(d => String(d.t.season_id) === fs && d.t.tournament_type === ft)
  const rows: number[][] = [], y: number[] = []
  for (const d of ds) {
    const zero = schoolTotals(d, [0, 0, 0, 0, 0, 0, 0, 0])
    const cnt = new Map<number, number[]>()
    for (const e of d.ents) { if (!e.school_id) continue; let place = d.pl.get(e.id); if (place == null) { const pm = d.ms.find(m => (m.winner_entry_id === e.id || m.loser_entry_id === e.id) && PLACE_OF[m.round]); if (pm) place = PLACE_OF[pm.round][pm.winner_entry_id === e.id ? 0 : 1] }
      const c = cnt.get(e.school_id) ?? Array(8).fill(0); if (place && place <= 8) c[place - 1]++; cnt.set(e.school_id, c) }
    for (const o of d.off) { rows.push(cnt.get(o.school_id) ?? Array(8).fill(0)); y.push(Number(o.total_points) - (zero.get(o.school_id) ?? 0)) }
  }
  // normal equations
  const k = 8, A = Array.from({ length: k }, () => Array(k).fill(0)), b = Array(k).fill(0)
  rows.forEach((r, i) => { for (let p = 0; p < k; p++) { b[p] += r[p] * y[i]; for (let q = 0; q < k; q++) A[p][q] += r[p] * r[q] } })
  for (let p = 0; p < k; p++) A[p][p] += 1e-9
  for (let i = 0; i < k; i++) { let mx = i; for (let r = i + 1; r < k; r++) if (Math.abs(A[r][i]) > Math.abs(A[mx][i])) mx = r; [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]]; for (let r = 0; r < k; r++) if (r !== i && A[i][i]) { const f = A[r][i] / A[i][i]; for (let c = i; c < k; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i] } }
  const sol = b.map((v, i) => (A[i][i] ? v / A[i][i] : 0))
  console.log(`${fs} ${ft} fitted placement points:`, sol.map(v => v.toFixed(2)).join(' / '))
  const resid = rows.map((r, i) => y[i] - r.reduce((s, c, p) => s + c * sol[p], 0)); const big = resid.filter(v => Math.abs(v) > 0.6).length
  console.log(`   schools ${rows.length}, still off by more than 0.5 after the fit: ${big}`)
}
