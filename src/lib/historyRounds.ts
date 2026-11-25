// Round labels from FloWrestling exports (tournament history, Kyle 2026-11-20) → the site's round codes (R1… QF SF F,
// C1… CQF CSF, 3rd_Place / 5th_Place / 7th_Place). Labels vary by year: "Round of 32", "R-32", "Champ. Round 1",
// "Round 1 (64 Man)", "Consy 3", "Consi of 8 #2", "Cons. Semi", "1st Place Match"… Some years number waves across both
// sides ("ROUND 4" — Iron Man 2014–18) or leave the round blank: a wave's side comes from the wrestlers' losses so far
// (two unbeaten wrestlers = championship side), its final wave's placement matches from how far each pair got.

export type Side = 'champ' | 'cons' | 'place' | 'wave' | 'rr' | 'unknown'
export type ParsedRound = { side: Side; order: number; place?: 1 | 3 | 5 | 7; raw: string }

/** A label's side and its order within the side (bigger = later) */
export function parseRound(label: string): ParsedRound {
  const raw = (label ?? '').trim()
  const l = raw.toLowerCase().replace(/\s+/g, ' ')
  if (!l) return { side: 'unknown', order: 0, raw }
  if (/^rr rnd|round robin|pool/.test(l)) return { side: 'rr', order: Number(/\d+/.exec(l)?.[0] ?? 0), raw }
  // placement matches
  // the final: "Finals", "1st Place Match", "Championship" alone or "Championship Final" — not "Championship Round 2",
  // "Championship Quarterfinals" or "Championship Semifinals" (Beast of the East 2019)
  if ((/^(1st place|first place|finals?\b|1st place match|champ\.? final|2nd place match)/.test(l) || /^championship( finals?)?( \(.*\))?$/.test(l)) && !/cons|consi|consy|semi|quarter/.test(l)) return { side: 'place', order: 100, place: 1, raw }
  if (/(3rd|third) place|^cons\.? final|^consi? finals?/.test(l)) return { side: 'place', order: 100, place: 3, raw }
  if (/(5th|fifth) place/.test(l)) return { side: 'place', order: 100, place: 5, raw }
  if (/(7th|seventh) place/.test(l)) return { side: 'place', order: 100, place: 7, raw }
  // consolation side
  if (/cons|consi|consy|conso|^c - pig|wrestleback/.test(l)) {
    if (/semi/.test(l)) return { side: 'cons', order: 90, raw }
    if (/quarter|quater|qtr/.test(l)) return { side: 'cons', order: 80, raw }
    if (/pig|prelim/.test(l)) return { side: 'cons', order: 1, raw }
    const of = /of (\d+) #(\d+)/.exec(l)                                   // "Consi of 16 #2": earlier for bigger brackets
    if (of) return { side: 'cons', order: 70 - Math.log2(Number(of[1])) * 8 + Number(of[2]), raw }
    const n = /(\d+)/.exec(l)
    return { side: 'cons', order: n ? 10 + Number(n[1]) * 5 : 50, raw }
  }
  // championship side
  if (/semi/.test(l)) return { side: 'champ', order: 90, raw }
  if (/quarter|qtr/.test(l)) return { side: 'champ', order: 80, raw }
  if (/pig|prelim/.test(l)) return { side: 'champ', order: 1, raw }
  const of = /(?:round of|r-)\s*(\d+)/.exec(l)                               // "Round of 32", "R-16": bigger = earlier
  if (of) return { side: 'champ', order: 70 - Math.log2(Number(of[1])) * 8, raw }
  if (/champ|championship/.test(l)) { const n = /round (\d+)/.exec(l); return { side: 'champ', order: n ? 10 + Number(n[1]) * 5 : 50, raw } }
  if (/^round 1 \(\d+ man\)/.test(l)) return { side: 'champ', order: 10, raw }
  const wave = /^round ?(\d+)/.exec(l)                                       // "ROUND 4", "ROUND3", "Round 6 (Conso)"
  if (wave) return /conso/.test(l) ? { side: 'cons', order: 10 + Number(wave[1]) * 5, raw } : { side: 'wave', order: Number(wave[1]), raw }
  return { side: 'unknown', order: 0, raw }
}

export type HistBoutIn = { weight: number; round: string; winner: string; loser: string | null; bye: boolean }
export type HistBoutOut = HistBoutIn & { code: string | null }

/** A weight's bouts with site round codes. Waves are split into sides by losses so far; the last wave's or the placement
 *  label's matches are ranked into 1st / 3rd / 5th / 7th by how far each pair got. Byes and round-robin get no code. */
export function codeRounds(bouts: HistBoutIn[]): HistBoutOut[] {
  const parsed = bouts.map(b => ({ b, p: parseRound(b.round) }))
  const out = new Map<HistBoutIn, string | null>()
  // waves: in order, both unbeaten → championship, else consolation; the final wave's bouts are placement matches
  const waves = parsed.filter(x => x.p.side === 'wave' && !x.b.bye && x.b.loser)
  if (waves.length) {
    const losses = new Map<string, number>(), wins = new Map<string, number>()
    const maxWave = Math.max(...waves.map(x => x.p.order))
    for (const w of [...new Set(waves.map(x => x.p.order))].sort((a, b) => a - b)) {
      const these = waves.filter(x => x.p.order === w)
      for (const x of these) {
        const unbeaten = !(losses.get(x.b.winner) ?? 0) && !(losses.get(x.b.loser!) ?? 0)
        x.p = { ...x.p, side: unbeaten ? 'champ' : 'cons', order: w }
      }
      for (const x of these) { losses.set(x.b.loser!, (losses.get(x.b.loser!) ?? 0) + 1); wins.set(x.b.winner, (wins.get(x.b.winner) ?? 0) + 1) }
      void maxWave
    }
  }
  // placement matches with a generic label ("FINALS" holding 1st, 3rd and 5th): the pair of unbeaten wrestlers is the
  // final; the rest rank by the pair's wins before it
  const place = parsed.filter(x => x.p.side === 'place' && !x.b.bye && x.b.loser)
  const generic = place.filter(x => x.p.place === 1)
  if (generic.length > 1) {
    const lossesBefore = new Map<string, number>(), winsBefore = new Map<string, number>()
    for (const x of parsed.filter(y => y.p.side !== 'place' && !y.b.bye && y.b.loser)) {
      lossesBefore.set(x.b.loser!, (lossesBefore.get(x.b.loser!) ?? 0) + 1); winsBefore.set(x.b.winner, (winsBefore.get(x.b.winner) ?? 0) + 1)
    }
    const fin = generic.find(x => !(lossesBefore.get(x.b.winner) ?? 0) && !(lossesBefore.get(x.b.loser!) ?? 0)) ?? generic[0]
    const rest = generic.filter(x => x !== fin).sort((a, b) =>
      ((winsBefore.get(b.b.winner) ?? 0) + (winsBefore.get(b.b.loser!) ?? 0)) - ((winsBefore.get(a.b.winner) ?? 0) + (winsBefore.get(a.b.loser!) ?? 0)))
    const taken = new Set(place.filter(x => x.p.place !== 1).map(x => x.p.place))
    const free = ([3, 5, 7] as const).filter(p => !taken.has(p))
    rest.forEach((x, i) => { x.p = { ...x.p, place: free[i] ?? 7 } })
  }
  // codes: championship rounds before the quarters numbered R1, R2… in order; consolation C1, C2… in order
  const champOrders = [...new Set(parsed.filter(x => x.p.side === 'champ' && x.p.order < 80).map(x => x.p.order))].sort((a, b) => a - b)
  const consOrders = [...new Set(parsed.filter(x => x.p.side === 'cons' && x.p.order < 80).map(x => x.p.order))].sort((a, b) => a - b)
  for (const x of parsed) {
    if (x.b.bye || !x.b.loser) { out.set(x.b, null); continue }
    const p = x.p
    let code: string | null = null
    if (p.side === 'place') code = p.place === 1 ? 'F' : `${p.place}${p.place === 3 ? 'rd' : 'th'}_Place`
    else if (p.side === 'champ') code = p.order >= 90 ? 'SF' : p.order >= 80 ? 'QF' : `R${champOrders.indexOf(p.order) + 1}`
    else if (p.side === 'cons') code = p.order >= 90 ? 'CSF' : p.order >= 80 ? 'CQF' : `C${consOrders.indexOf(p.order) + 1}`
    out.set(x.b, code)
  }
  return bouts.map(b => ({ ...b, code: out.get(b) ?? null }))
}
