// How often NJSIAA's higher seed won (Kyle 2026-11-20: "how accurate their seeding is based on how often their higher
// seeded wrestler won"), by season / gender / level, and — on 2025-26, the season with tracked projections — how often
// our projection picked the winner of the same bouts. Wrestled bouts only (forfeits, medical forfeits, injury defaults
// and DQs left out). "Higher seed" = the lower seed number; a seeded wrestler vs an unseeded one counts as the higher
// seed. Read only.
//   npx tsx scripts/seed_accuracy_20261120.mts
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all<T>(q: (f: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) { const out: T[] = []; for (let f = 0; ; f += 1000) { const { data, error } = await q(f); if (error) throw new Error(error.message); out.push(...(data ?? [])); if ((data ?? []).length < 1000) break } return out }
const LEVEL: Record<string, string> = { districts: 'District', regions: 'Region', girls_regions: 'Region', boys_state: 'State', girls_state: 'State' }
const { data: seasons } = await db.from('seasons').select('id, year_label')
const label = new Map(seasons!.map(s => [s.id, s.year_label]))
const tourns = await all<{ id: string; season_id: number; tournament_type: string; gender: string }>(f => db.from('tournaments').select('id, season_id, tournament_type, gender').order('id').range(f, f + 999))
const tById = new Map(tourns.map(t => [t.id, t]))
const entries = await all<{ id: string; tournament_id: string; seed: number | null; wrestler_id: string | null }>(f => db.from('tournament_entries').select('id, tournament_id, seed, wrestler_id').order('id').range(f, f + 999))
const eById = new Map(entries.map(e => [e.id, e]))
const seededTourn = new Set(entries.filter(e => e.seed != null).map(e => e.tournament_id))
const matches = await all<{ id: string; winner_entry_id: string | null; loser_entry_id: string | null; win_type: string | null }>(f => db.from('matches').select('id, winner_entry_id, loser_entry_id, win_type').eq('validated', true).order('id').range(f, f + 999))
const noBout = (w: string | null) => /^(for|ff|mffl|mff|inj|dq|def|dff|bye)/i.test((w ?? '').trim())

type Tally = { both: number; bothHi: number; one: number; oneHi: number; ourN: number; ourRight: number; seedSame: number }
const tally = new Map<string, Tally>()
const T = (k: string) => tally.get(k) ?? tally.set(k, { both: 0, bothHi: 0, one: 0, oneHi: 0, ourN: 0, ourRight: 0, seedSame: 0 }).get(k)!
// our frozen projections for the same bouts (2025-26)
const proj = new Map<string, { a: string; b: string; pw: string; aw: string }>()
for (const g of ['M', 'F']) {
  const rows = await all<{ source_id: string; wrestler_a_id: string; wrestler_b_id: string; predicted_winner: string; actual_winner: string }>(f => db.from('match_projections').select('source_id, wrestler_a_id, wrestler_b_id, predicted_winner, actual_winner').eq('gender', g).eq('match_source', 'postseason').order('id').range(f, f + 999))
  for (const r of rows) proj.set(r.source_id, { a: r.wrestler_a_id, b: r.wrestler_b_id, pw: r.predicted_winner, aw: r.actual_winner })
}
for (const m of matches) {
  if (!m.winner_entry_id || !m.loser_entry_id || noBout(m.win_type)) continue
  const w = eById.get(m.winner_entry_id), l = eById.get(m.loser_entry_id)
  if (!w || !l) continue
  const t = tById.get(w.tournament_id)
  if (!t || !seededTourn.has(t.id) || !LEVEL[t.tournament_type]) continue
  if (w.seed == null && l.seed == null) continue
  if (w.seed != null && l.seed != null && w.seed === l.seed) continue
  const hiWon = l.seed == null || (w.seed != null && w.seed < l.seed)
  for (const k of [`${label.get(t.season_id)}|${t.gender}|${LEVEL[t.tournament_type]}`, `${label.get(t.season_id)}|${t.gender}|All`, `ALL|${t.gender}|${LEVEL[t.tournament_type]}`, `ALL|${t.gender}|All`]) {
    const x = T(k)
    if (w.seed != null && l.seed != null) { x.both++; if (hiWon) x.bothHi++ } else { x.one++; if (hiWon) x.oneHi++ }
    // ours, on the same bout
    const p = proj.get(String(m.id))
    if (p && label.get(t.season_id) === '2025-26' && p.pw !== 'even') {
      x.ourN++; if (p.pw === p.aw) x.ourRight++
      const hiId = hiWon ? w.wrestler_id : l.wrestler_id
      const ourPickId = p.pw === 'a' ? p.a : p.b
      if (ourPickId === hiId) x.seedSame++
    }
  }
}
const pct = (a: number, b: number) => (b ? (100 * a / b).toFixed(1) + '%' : '—')
const keys = [...tally.keys()].sort()
for (const g of ['M', 'F']) {
  console.log(`\n${g === 'M' ? 'BOYS' : 'GIRLS'} — higher seed won (wrestled bouts)`)
  console.log('season    level      seeded v seeded       seeded v unseeded     all            | ours (2025-26, same bouts)  we agreed with the seed')
  for (const k of keys.filter(k => k.split('|')[1] === g)) {
    const [s, , lv] = k.split('|'), x = tally.get(k)!
    const all_ = x.both + x.one
    console.log(`${s.padEnd(9)} ${lv.padEnd(9)} ${pct(x.bothHi, x.both).padStart(6)} of ${String(x.both).padStart(5)}   ${pct(x.oneHi, x.one).padStart(6)} of ${String(x.one).padStart(5)}   ${pct(x.bothHi + x.oneHi, all_).padStart(6)} of ${String(all_).padStart(5)}` + (x.ourN ? `  | ${pct(x.ourRight, x.ourN)} of ${x.ourN}  ${pct(x.seedSame, x.ourN)}` : ''))
  }
}
