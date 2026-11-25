// Projection odds test (Kyle 2026-11-20): odds over ten outcomes from rating level × spread (src/lib/projectionOdds.ts),
// graded fairly — built from half of the season's bouts and graded on the other half, then swapped. Compared with
// always "the favorite by pin", spread alone (rating level ignored), and the table without records.
//   npx tsx scripts/projection_odds_test.mts [2025-26]
import { createClient } from '@supabase/supabase-js'
import { buildOddsTable, oddsFor, topOutcomes, KIND_WORD, outcomeIndex, type OddsOptions, type OddsTable } from '../src/lib/projectionOdds'
import type { Finishes } from '../src/lib/projection'
const season = process.argv[2] ?? '2025-26'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
type Row = { id: number; fav: number; dog: number; rankFav: number; finFav: Finishes; finDog: Finishes }
for (const g of ['M', 'F'] as const) {
  const raw: Record<string, any>[] = []
  for (let last = 0; ;) { const { data, error } = await db.from('match_projections').select('*').eq('gender', g).eq('season', season).gt('id', last).order('id').limit(1000); if (error) throw error; raw.push(...data!); if (data!.length < 1000) break; last = data![data!.length - 1].id }
  const fin = (r: any, p: string): Finishes => ({ wins: r[`${p}_wins`], pins: r[`${p}_pins`], techs: r[`${p}_techs`], majors: r[`${p}_majors`], losses: r[`${p}_losses`], pinned: r[`${p}_pinned`], teched: r[`${p}_teched`] })
  // side A is the higher WRR going in = the favorite
  const rows: Row[] = raw.map(r => ({ id: r.id, fav: Number(r.a_pre_wrr), dog: Number(r.b_pre_wrr), rankFav: r.actual_winner === 'a' ? r.actual_rank : 33 - r.actual_rank, finFav: fin(r, 'a'), finDog: fin(r, 'b') }))
  const halves = [rows.filter(r => r.id % 2 === 0), rows.filter(r => r.id % 2 === 1)]
  const tables = halves.map((h, i) => buildOddsTable(h.map(r => ({ favWrr: r.fav, dogWrr: r.dog, rankFav: r.rankFav })), `half ${i}`))
  const grade = (name: string, oddsOf: (r: Row, t: OddsTable) => number[]) => {
    let n = 0, top1 = 0, top3 = 0, win = 0, ll = 0
    const cal = new Map<number, { n: number; hit: number; p: number }>()
    halves.forEach((h, i) => { const t = tables[1 - i]; for (const r of h) {
      const p = oddsOf(r, t), act = outcomeIndex(r.rankFav), top = topOutcomes(p, 3)
      n++; if (top[0].i === act) top1++; if (top.some(x => x.i === act)) top3++
      const favP = p.slice(0, 5).reduce((a, b) => a + b, 0); if ((favP >= 0.5) === (act < 5)) win++
      ll -= Math.log(Math.max(p[act], 1e-6))
      const b = Math.min(9, Math.floor(top[0].pct / 10)); const c = cal.get(b) ?? cal.set(b, { n: 0, hit: 0, p: 0 }).get(b)!; c.n++; c.p += top[0].pct; if (top[0].i === act) c.hit++
    } })
    console.log(`${name.padEnd(36)} pick right ${(100 * top1 / n).toFixed(1).padStart(5)}%  in top 3 ${(100 * top3 / n).toFixed(1).padStart(5)}%  winner ${(100 * win / n).toFixed(1)}%  log loss ${(ll / n).toFixed(3)}`)
    return cal
  }
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} ${season}: ${rows.length} bouts (built from one half, graded on the other)`)
  const pinOnly = () => { const p = new Array(10).fill(0.0001); p[0] = 1; return p }
  grade('Always "favorite by pin"', () => pinOnly())
  const opts = (o: Partial<OddsOptions>): OddsOptions => ({ minCell: 40, recordK: 20, useRecords: true, ...o })
  grade('Spread only (level ignored)', (r, t) => oddsFor(t, r.fav, r.dog, null, null, opts({ minCell: 1e9, useRecords: false })))
  grade('Level × spread', (r, t) => oddsFor(t, r.fav, r.dog, null, null, opts({ useRecords: false })))
  grade('Level × spread (lean 15)', (r, t) => oddsFor(t, r.fav, r.dog, null, null, opts({ useRecords: false, minCell: 15 })))
  grade('Level × spread (lean 100)', (r, t) => oddsFor(t, r.fav, r.dog, null, null, opts({ useRecords: false, minCell: 100 })))
  const cal = grade('Level × spread + records (k=20)', (r, t) => oddsFor(t, r.fav, r.dog, r.finFav, r.finDog, opts({})))
  grade('Level × spread + records (k=40)', (r, t) => oddsFor(t, r.fav, r.dog, r.finFav, r.finDog, opts({ recordK: 40 })))
  console.log('  Calibration (level × spread + records): when the pick had this chance, how often it happened')
  for (const [b, c] of [...cal].sort((x, y) => x[0] - y[0])) console.log(`    said ${b * 10}–${b * 10 + 10}%: ${String(c.n).padStart(6)} bouts, said ${(c.p / c.n).toFixed(0)}% on average, happened ${(100 * c.hit / c.n).toFixed(0)}%`)
  const full = buildOddsTable(rows.map(r => ({ favWrr: r.fav, dogWrr: r.dog, rankFav: r.rankFav })), season)
  const show = (a: number, b: number) => console.log(`  ${a} vs ${b}: ${topOutcomes(oddsFor(full, a, b, null, null, opts({ useRecords: false })), 3).map(x => `${x.favorite ? a : b} by ${KIND_WORD[x.kind]} ${x.pct.toFixed(0)}%`).join(' · ')}`)
  console.log('  Examples (no records):'); show(77, 76); show(65, 62); show(45, 42); show(25, 22); show(4, 3); show(60, 40); show(30, 10); show(85, 50)
}
