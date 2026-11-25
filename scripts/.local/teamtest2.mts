// Apply the TrackWrestling rule set to stored bouts and compare school totals with the official ones
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(q: (f: number, t: number) => any) { const o: any[] = []; for (let i = 0; ; i += 1000) { const { data, error } = await q(i, i + 999); if (error) throw new Error(error.message); o.push(...data); if (data.length < 1000) break } return o }
const SEASON = Number(process.argv[2] ?? 2026)
const DUMP = process.env.DUMP === '1'
const dump: any[] = []
const PLACES: Record<string, Record<number, number>> = {
  districts: { 1: 14, 2: 10, 3: 7, 4: 4 },
  regions: JSON.parse(process.env.REG_PLACES ?? '{"1":14,"2":10,"3":7,"4":4}'),
  boys_state: { 1: 16, 2: 12, 3: 9, 4: 7, 5: 5, 6: 3, 7: 2, 8: 1 },
}
// fixed bracket: TrackWrestling's Champ. Round 1 is stored as R2 for districts and regions (16-man), R1/R2 for the state (32-man)
const CHAMP: Record<string, string[]> = { districts: ['R2', 'QF', 'SF', 'F'], regions: ['R2', 'QF', 'SF', 'F'], boys_state: ['R1', 'R2', 'QF', 'SF', 'F'] }
const PLACE_MATCH: Record<string, [number, number]> = { F: [1, 2], '3rd_Place': [3, 4], '5th_Place': [5, 6], '7th_Place': [7, 8] }
const bonus = (t: string) => ['FALL', 'FORF', 'M-FORF', 'INJ', 'DQ'].includes(t) ? 2 : t.startsWith('TF') ? 1.5 : t === 'MD' ? 1 : 0
const tours = (await db.from('tournaments').select('id, name, tournament_type').eq('gender', 'M').eq('season_id', SEASON).in('tournament_type', ['districts', 'regions', 'boys_state'])).data!
const res: Record<string, { eq: number; n: number; diffs: number[] }> = {}
const worst: string[] = []
for (const t of tours) {
  const ents = await all((f, x) => db.from('tournament_entries').select('id, school_id, weight_class_id').eq('tournament_id', t.id).range(f, x))
  const ms = await all((f, x) => db.from('matches').select('round, bracket_side, win_type, winner_entry_id, loser_entry_id, weight_class_id').eq('tournament_id', t.id).range(f, x))
  const placeOf = new Map<string, number>((await all((f, x) => db.from('placements').select('entry_id, place').eq('tournament_id', t.id).range(f, x))).map((r: any) => [r.entry_id, r.place]))
  const pts = new Map<string, number>()
  const add = (e: string, p: number) => pts.set(e, (pts.get(e) ?? 0) + p)
  const byW = new Map<number, any[]>(); for (const m of ms) (byW.get(m.weight_class_id) ?? byW.set(m.weight_class_id, []).get(m.weight_class_id))!.push(m)
  const order = CHAMP[t.tournament_type]
  for (const [wc, list] of byW) {
    const rounds = order
    const wEnts = ents.filter(e => e.weight_class_id === wc).map(e => e.id)
    for (const e of wEnts) {
      const mine = list.filter(m => m.winner_entry_id === e || m.loser_entry_id === e)
      // contested = a real opponent, or a forfeit over a filler entry ("Forfeit", "B Forfeit": stored
      // as BYE with no opponent since the 2026-11-02 filler cleanup). A forfeit over an empty
      // slot (stored FORF, no opponent) is not contested.
      const contested = (m: any) => true   // stored forfeits with no opponent can't be told apart (filler vs empty slot): treated as contested
      for (const m of mine) {
        if (m.winner_entry_id !== e) continue
        const placeMatch = m.round in PLACE_MATCH
        const champ = m.bracket_side === 'championship'
        const adv = placeMatch ? 0 : champ ? 2 : 1
        add(e, adv + (m.win_type === 'BYE' || !m.loser_entry_id ? 2 : bonus(m.win_type)))   // forfeit over filler or empty slot: forfeit win
      }
      // champ byes: champ rounds of this bracket before his first champ bout
      const firstChamp = mine.filter(m => m.bracket_side === 'championship').map(m => rounds.indexOf(m.round)).filter(i => i >= 0).sort((a, b) => a - b)[0]
      if (firstChamp > 0) {
        // the next contested match after the bye(s): his first contested championship bout, in bracket order
        const nextContested = mine.filter(m => contested(m) && m.bracket_side === 'championship' && order.includes(m.round))
          .sort((a, b) => order.indexOf(a.round) - order.indexOf(b.round))[0]
        if (nextContested && nextContested.winner_entry_id === e) add(e, 2 * firstChamp)
      }
      // place: the stored placements (a forfeited placement match may have no loser on the bout)
      let pl = placeOf.get(e)
      if (!pl) for (const m of mine) { const pm = PLACE_MATCH[m.round]; if (pm) pl = m.winner_entry_id === e ? pm[0] : pm[1] }
      if (pl) add(e, PLACES[t.tournament_type][pl] ?? 0)
    }
  }
  if (DUMP && t.tournament_type === 'districts') for (const e of ents) dump.push({ t: t.name, wc: e.weight_class_id, e: e.id, pts: pts.get(e.id) ?? 0 })
  const school = new Map<number, number>(); for (const e of ents) if (e.school_id) school.set(e.school_id, (school.get(e.school_id) ?? 0) + (pts.get(e.id) ?? 0))
  const off = (await db.from('precomputed_team_scores').select('school_id, total_points').eq('tournament_id', t.id)).data!
  const k = t.tournament_type; res[k] = res[k] ?? { eq: 0, n: 0, diffs: [] }
  for (const o of off) { const c = school.get(o.school_id) ?? 0; res[k].n++; const d = Number(o.total_points) - c; if (Math.abs(d) < 0.01) res[k].eq++; else { res[k].diffs.push(d); if (worst.length < 12 && k !== 'districts') worst.push(`${t.name} school ${o.school_id}: official ${o.total_points}, rules ${c}`) } }
}
for (const [k, v] of Object.entries(res)) { const c: Record<string, number> = {}; for (const d of v.diffs) c[d.toFixed(1)] = (c[d.toFixed(1)] ?? 0) + 1; console.log(`${SEASON} ${k}: ${v.eq}/${v.n} school totals equal; official minus rules:`, JSON.stringify(Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 8))) }
console.log(worst.join('\n'))

if (DUMP) (await import('fs')).writeFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/dbpts.json', JSON.stringify(dump))
