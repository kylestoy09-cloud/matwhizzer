// Playoff History (Kyle 2026-11-13): a past season's district / region / state brackets rebuilt from TrackWrestling
// bout exports. The exports label rounds 60-odd ways across the years ("Placement (16 Man)" holds the final AND the
// 3rd-place bout), so a bout's round is worked out from the bracket itself, the labels giving only the order rounds
// were wrestled (their order in the file):
//   * championship side = neither wrestler had lost yet; F, SF, QF, R2, R1 counted back from the final
//   * a consolation bout no one wrestles past is a place bout: both came in with one loss = 3rd place, two = 5th
//     (7th when the label says so); the consolation rounds before them are counted back from those
// Codes match what the pages draw and what 2024-25 / 2025-26 hold. Boys: districts R2 QF SF F 3rd; regions R2 QF SF F,
// C1 (C2) C3, 3rd 5th; state R1 R2 QF SF F, C1-C6, 3rd 5th 7th. Girls: regions R1 R2 QF SF F, C1-C4 (C4 = consolation
// semis), 3rd 5th; state R1 QF SF F (a 16-man state's first round is R1), C1-C4, 3rd 5th 7th.
import type { HistEvent, HistRow } from './readFiles'

export type Round = 'R1' | 'R2' | 'QF' | 'SF' | 'F' | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6' | '3rd_Place' | '5th_Place' | '7th_Place'
export type WinType = 'FALL' | 'TF' | 'DEC' | 'MD' | 'UTB' | 'INJ' | 'DQ' | 'FORF' | 'SV-1' | 'TB-1' | 'TB-2'
export type Bout = {
  weight: number; round: Round; side: 'championship' | 'consolation'; order: number
  winner: string; winnerTeam: string; loser: string | null; loserTeam: string | null
  winType: WinType; winnerScore: number | null; loserScore: number | null; fallSeconds: number | null; raw: string; label: string
}
export type Bracket = { weight: number; bouts: Bout[]; entrants: { name: string; team: string }[]; places: Map<number, string>; problems: string[] }

// TrackWrestling placeholders for an empty slot: "Forfeit Forfeit", "A Forfeit", "Joe Forfeit", "For Feit", ". Bye",
// "bye Bye", "Unknown3" (team names too)
export const isPlaceholder = (name: string, team = '') =>
  !/[a-z]{2}/i.test(name) || /\b(forfeit|for\s*feit|bye|tbd|wrestler)\b/i.test(name) || /^unknown\d*$/i.test(name.trim()) ||
  isPlaceholderTeam(team)
export const isPlaceholderTeam = (team: string) => /^(unknown\d*|forfeit|team forfeit)$/i.test(team.trim())

/** The export's win type and result → the site's codes, score and fall time; null = not a bout (bye, placeholder). */
export function winTypeOf(r: HistRow): { winType: WinType; winnerScore: number | null; loserScore: number | null; fallSeconds: number | null } | null {
  const t = r.winType.trim().toUpperCase()
  if (t === 'BYE' || t === 'OTHER1' || t === 'NC' || !t) return null   // NC: no contest, never wrestled
  const sc = /(\d+)\s*-\s*(\d+)/.exec(r.result), time = /(\d+):(\d{2})/.exec(r.result)
  const a = sc ? Number(sc[1]) : null, b = sc ? Number(sc[2]) : null
  const secs = time ? Number(time[1]) * 60 + Number(time[2]) : null
  const ot = /\bUTB\b/i.test(r.result) ? 'UTB' : /\bTB\s*2\b/i.test(r.result) ? 'TB-2' : /\bTB\s*1?\b/i.test(r.result) ? 'TB-1' : /\bSV\b/i.test(r.result) ? 'SV-1' : null
  switch (t) {
    case 'F': return { winType: 'FALL', winnerScore: null, loserScore: null, fallSeconds: secs }
    case 'DEC': return { winType: (ot ?? 'DEC') as WinType, winnerScore: a, loserScore: b, fallSeconds: null }
    case 'MD': return { winType: 'MD', winnerScore: a, loserScore: b, fallSeconds: null }
    case 'TF': return { winType: 'TF', winnerScore: a, loserScore: b, fallSeconds: secs }
    case 'FOR': case 'M FOR': case 'MFFL': case 'MFF': return { winType: 'FORF', winnerScore: null, loserScore: null, fallSeconds: null }
    case 'DEF': return { winType: 'INJ', winnerScore: null, loserScore: null, fallSeconds: secs }
    case 'DQ': return { winType: 'DQ', winnerScore: null, loserScore: null, fallSeconds: null }
    default: throw new Error(`unknown win type "${r.winType}" (${r.event} ${r.weight} ${r.round})`)
  }
}

export function buildBrackets(ev: HistEvent, gender: 'M' | 'F' = 'M'): Bracket[] {
  const out: Bracket[] = []
  for (const weight of [...new Set(ev.rows.map(r => Number(r.weight)))].sort((a, b) => a - b)) {
    let wRows = ev.rows.filter(r => Number(r.weight) === weight)
    const relabel: string[] = []
    // no round names and out of order (2024 Region 7): wrestled order from the Flo bracket's bout numbers
    if (wRows.some(r => winTypeOf(r)) && wRows.filter(r => winTypeOf(r)).every(r => !r.round.trim())) {
      const order = ev.boutOrder?.get(weight)
      if (!order) relabel.push('export has no round names or order: needs the FloWrestling bracket PDF')
      else {
        const last = (n: string) => n.trim().split(/\s+/).filter(x => !/^(ii|iii|iv|jr\.?|sr\.?)$/i.test(x)).slice(-1)[0] ?? ''
        // a pair that met twice (championship and consolation): the PDF's printed result tells them apart — win type
        // first ("FOR" has no score), then the score / fall time
        const digits = (x: string) => (x.match(/\d+/g) ?? []).join(' ')
        const TYPE: Record<string, string> = { F: 'F', DEC: 'DEC', MD: 'MD', TF: 'TF', FOR: 'FOR', 'M FOR': 'FOR', MFFL: 'FOR', DEF: 'DEF', DQ: 'DQ' }
        // one PDF bout per row: every (row, bout) pair scored, best first, each bout used once
        const pairs: { r: HistRow; num: number; score: number }[] = []
        for (const r of wRows) {
          if (!winTypeOf(r) || !r.loser) continue
          const list = order.get(`${last(r.winner)}|${last(r.loser)}`.toLowerCase().replace(/[^a-z|]/g, '')) ?? []
          const mine = digits(r.result), type = TYPE[r.winType.trim().toUpperCase()] ?? ''
          for (const b of list) pairs.push({ r, num: b.num, score: (b.result.split(' ')[0].toUpperCase() === type ? 2 : 0) + (digits(b.result) && mine.endsWith(digits(b.result)) ? 1 : 0) })
        }
        const assigned = new Map<HistRow, number>(), used = new Set<number>()
        for (const p of pairs.sort((x, y) => y.score - x.score)) if (!assigned.has(p.r) && !used.has(p.num)) { assigned.set(p.r, p.num); used.add(p.num) }
        const known = (r: HistRow) => assigned.get(r)
        // a bout missing from the PDF: after both wrestlers' earlier bouts — after the loser's last known bout, and
        // after the winner's FIRST known loss (a consolation bout follows the winner's championship loss)
        const nums = new Map(wRows.map(r => [r, known(r)]))
        const numOf = (r: HistRow) => {
          const n = nums.get(r); if (n != null) return n
          if (!r.loser) return undefined
          const of = (name: string, asLoser: boolean) => wRows.filter(x => x !== r && nums.get(x) != null && (asLoser ? x.loser === name : x.winner === name || x.loser === name)).map(x => nums.get(x)!)
          const winnerLosses = of(r.winner, true)
          const after = Math.max(-1, ...of(r.loser, false), ...(winnerLosses.length ? [Math.min(...winnerLosses)] : []))
          return after >= 0 ? after + 0.5 : undefined
        }
        const unmatched = wRows.filter(r => winTypeOf(r) && r.loser && numOf(r) == null)
        if (unmatched.length) relabel.push(`${unmatched.length} bout(s) not found in the bracket PDF: ${unmatched.map(r => `${r.winner} over ${r.loser}`).join('; ')}`)
        const placed = wRows.filter(r => winTypeOf(r) && r.loser && nums.get(r) == null && numOf(r) != null)
        if (placed.length) relabel.push(`placed by the wrestlers' other bouts (not in the bracket PDF): ${placed.map(r => `${r.winner} over ${r.loser}`).join('; ')}`)
        wRows = [...wRows].sort((x, y) => (numOf(x) ?? 1e9) - (numOf(y) ?? 1e9))
        relabel.push('export had no round names: wrestled order from the bracket PDF')
      }
    }
    const rows = wRows.map((r, i) => ({ r, i }))
    // the order rounds were wrestled = their first appearance among this weight's rows (the whole file can list one
    // weight's 3rd-place bouts before another weight's Cons. Round 3)
    const rank = new Map<string, number>()
    for (const { r } of rows) if (!rank.has(r.round)) rank.set(r.round, rank.size)
    const problems: string[] = [...relabel]
    const key = (n: string, t: string) => `${n.trim()}|${t.trim()}`
    const entrants = new Map<string, { name: string; team: string }>()
    for (const { r } of rows) for (const [n, t] of [[r.winner, r.winnerTeam], [r.loser, r.loserTeam]]) if (n && !isPlaceholder(n, t)) entrants.set(key(n, t), { name: n.trim(), team: t.trim() })
    // real bouts in wrestled order
    const bouts = rows.map(({ r, i }) => ({ r, i, w: winTypeOf(r) }))
      .filter(x => x.w && !isPlaceholder(x.r.winner, x.r.winnerTeam))
      .sort((a, b) => (rank.get(a.r.round)! - rank.get(b.r.round)!) || a.i - b.i)
    const losses = new Map<string, number>()
    type B = { r: HistRow; w: NonNullable<ReturnType<typeof winTypeOf>>; win: string; lose: string | null; side: 'championship' | 'consolation'; lossesBefore: [number, number]; order: number; round?: Round }
    const list: B[] = bouts.map((x, order) => {
      const win = key(x.r.winner, x.r.winnerTeam), lose = x.r.loser && !isPlaceholder(x.r.loser, x.r.loserTeam) ? key(x.r.loser, x.r.loserTeam) : null
      const lw = losses.get(win) ?? 0, ll = lose ? losses.get(lose) ?? 0 : 0
      if (lose) losses.set(lose, ll + 1)
      return { r: x.r, w: x.w!, win, lose, side: lw === 0 && ll === 0 ? 'championship' : 'consolation', lossesBefore: [lw, ll], order }
    })
    const champ = list.filter(b => b.side === 'championship')
    const later = (b: B, who: string) => list.filter(x => x.order > b.order && (x.win === who || x.lose === who))
    // championship: depth from the final along the winner's path
    const champDepth = new Map<B, number>()
    const finals = champ.filter(b => !later(b, b.win).some(x => x.side === 'championship'))
    const final = finals.sort((a, b) => b.order - a.order)[0]
    const depthOf = (b: B): number => {
      if (champDepth.has(b)) return champDepth.get(b)!
      const next = later(b, b.win).find(x => x.side === 'championship')
      const d = next ? depthOf(next) + 1 : b === final ? 0 : 99
      champDepth.set(b, d); return d
    }
    const CH: Round[] = ['F', 'SF', 'QF', 'R2', 'R1']
    const champMax = Math.max(0, ...champ.map(depthOf).filter(d => d <= 4))
    for (const b of champ) {
      const d = depthOf(b)
      // girls state: a 16-man bracket's first round is R1
      if (gender === 'F' && ev.kind === 'state' && d === 3 && champMax === 3) { b.round = 'R1'; continue }
      if (d > 4) {
        // the export is missing a later bout on this path: go by the round's label
        const byLabel: Round | null = /semi/i.test(b.r.round) ? 'SF' : /quart/i.test(b.r.round) && !/pre/i.test(b.r.round) ? 'QF'
          : /final|1st|first|championship/i.test(b.r.round) ? 'F' : /round 2|pre-?q/i.test(b.r.round) ? 'R2' : /round 1|prelim|perlim/i.test(b.r.round) ? (ev.kind === 'state' ? 'R1' : 'R2') : null
        problems.push(`missing bout after ${b.r.winner} over ${b.r.loser ?? '—'} (${b.r.round})${byLabel ? ` — shown as ${byLabel}` : ''}`)
        if (!byLabel) continue
        b.round = byLabel; continue
      }
      b.round = CH[d]
    }
    if (!final) problems.push('no final')
    // consolation: place bouts, then rounds counted back from them
    const cons = list.filter(b => b.side === 'consolation')
    const terminal = cons.filter(b => !later(b, b.win).length && !(b.lose && later(b, b.lose).length))
    for (const b of terminal) {
      const lbl = b.r.round
      b.round = /7th/i.test(lbl) ? '7th_Place' : /5th/i.test(lbl) ? '5th_Place' : /3rd|3\/4/i.test(lbl) ? '3rd_Place'
        : b.lossesBefore[0] <= 1 && b.lossesBefore[1] <= 1 ? '3rd_Place' : '5th_Place'
    }
    const consDepth = new Map<B, number>()
    const cdepth = (b: B): number => {
      if (terminal.includes(b)) return 0
      if (consDepth.has(b)) return consDepth.get(b)!
      const next = later(b, b.win).find(x => x.side === 'consolation')
      const d = next ? cdepth(next) + 1 : 1
      consDepth.set(b, d); return d
    }
    const nonTerm = cons.filter(b => !terminal.includes(b))
    const maxD = Math.max(0, ...nonTerm.map(cdepth))
    for (const b of nonTerm) {
      const d = cdepth(b)
      // girls: C4 = consolation semis; 2019's 32-wrestler North region ran six consolation rounds → C1-C6
      if (gender === 'F') { const n = (maxD > 4 ? 7 : 5) - d; if (n < 1) { problems.push(`consolation too deep: ${b.r.round}`); continue } b.round = `C${n}` as Round }
      else if (ev.kind === 'state') { const n = 7 - d; if (n < 1) { problems.push(`consolation too deep: ${b.r.round}`); continue } b.round = `C${n}` as Round }
      else if (ev.kind === 'region') b.round = d === 1 ? 'C3' : d === 2 ? (maxD >= 3 ? 'C2' : 'C1') : d === 3 ? 'C1' : (problems.push(`region consolation too deep: ${b.r.round}`), 'C1')
      else b.round = d === 1 ? 'C3' : 'C1'
    }
    // places
    const places = new Map<number, string>()
    if (final) { places.set(1, final.win); if (final.lose) places.set(2, final.lose) }
    for (const b of terminal) {
      const p = b.round === '3rd_Place' ? 3 : b.round === '5th_Place' ? 5 : 7
      if (places.has(p)) problems.push(`two ${p}th-place bouts`)
      places.set(p, b.win); if (b.lose) places.set(p + 1, b.lose)
    }
    const [n0, t0] = [(k: string) => k.split('|')[0], (k: string) => k.split('|')[1]]
    out.push({
      weight, entrants: [...entrants.values()], problems,
      places: new Map([...places].map(([p, k]) => [p, n0(k)])),
      bouts: list.filter(b => b.round).map(b => ({
        weight, round: b.round!, side: b.side, order: b.order, winner: n0(b.win), winnerTeam: t0(b.win), loser: b.lose ? n0(b.lose) : null, loserTeam: b.lose ? t0(b.lose) : null,
        winType: b.w.winType, winnerScore: b.w.winnerScore, loserScore: b.w.loserScore, fallSeconds: b.w.fallSeconds, raw: b.r.result, label: b.r.round,
      })),
    })
  }
  return out
}
