// Championship transcripts (Kyle 2026-11-17: "all dii is collected"). Files whose brackets can't be read by a layout
// reader (scans with no text, or one-off layouts: NCAA DII 1963–2026, later DIII / NAIA) are typed up from the
// PDF pages into a plain-text transcript, one file a year: data/ncaa/transcripts/<level>/<year>.txt.
//
//   # anything after # is a note
//   @ 125                                    a weight
//   1 Isaiah Gamez | Adams St. | 27-3         an entrant: seed (or -), name, college as printed, record (optional)
//   r1 Gamez > Hunt | Dec 5-0                a bout: round, winner > loser, result as printed (optional)
//   r1 Laya > bye                            a bye: he moves on without a bout (not saved; the path check needs it)
//   place 3 Logan Davis                      a place the bouts don't give (old sheets list places only)
//   vacant 5                                 a place not awarded (both wrestlers disqualified — DII 1996 158)
//
// Rounds: pigtail r1 r2 qf sf f · cpig c1–c6 cqf csf · 3rd 5th 7th (the old consolation — only those beaten by a
// finalist wrestled back — numbers its rounds c1, c2 …). In a bout a wrestler is named by full name, "I. Last", or a
// last name that only one entrant at the weight has. Places come from the final and the place bouts, then `place` lines.
import { type NcaaBout, type NcaaEntrant, type NcaaWeight } from '@/lib/ncaa/parse'

// the order bouts are wrestled in, and where a wrestler in each round must come from (his bout before: won / lost).
// The 16-man brackets (DII) and the 32-man ones (DI) together: a quarterfinal takes first- or second-round winners, a
// consolation round 2 first-round winners of the wrestlebacks or quarterfinal / round-2 losers, and so on.
const ORDER = ['pigtail', 'r1', 'cpig', 'r2', 'c1', 'qf', 'c2', 'c3', 'sf', 'c4', 'cqf', 'csf', '7th', '5th', '3rd', 'f']
const FROM: Record<string, string[]> = {
  pigtail: ['start'], r1: ['start', 'pigtail:W'], r2: ['r1:W'], qf: ['r1:W', 'r2:W'], sf: ['qf:W'], f: ['sf:W'],
  cpig: ['pigtail:L', 'r1:L'], c1: ['r1:L', 'cpig:W'], c2: ['c1:W', 'qf:L', 'r2:L'], c3: ['c2:W'], c4: ['c3:W', 'qf:L'],
  cqf: ['c2:W', 'c4:W'], csf: ['cqf:W', 'sf:L'], '3rd': ['csf:W'], '5th': ['csf:L'], '7th': ['cqf:L'],
}
const ROUNDS = new Set(['pigtail', 'r1', 'r2', 'qf', 'sf', 'f', 'cpig', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'cqf', 'csf', '3rd', '5th', '7th'])
const nm = (x: string) => x.toLowerCase().replace(/[^a-z]/g, '')
// a suffix isn't the last name ("James Armstrong Jr" is Armstrong)
const noSuffix = (x: string) => x.trim().replace(/,?\s+(jr|sr|ii|iii|iv)\.?$/i, '')
const lastOf = (x: string) => nm(noSuffix(x).split(/\s+/).slice(-1)[0] ?? '')

export type Transcript = { weights: NcaaWeight[]; bouts: NcaaBout[]; problems: string[] }

export function parseTranscript(text: string): Transcript {
  const weights: NcaaWeight[] = [], bouts: NcaaBout[] = [], problems: string[] = []
  let w: NcaaWeight | null = null
  // "format repechage": the old consolation (only those beaten by a finalist wrestled back) — no path check
  const repechage = /^\s*format\s+repechage\s*$/im.test(text)
  const pending: { w: NcaaWeight; line: number; round: string; win: string; lose: string; result: string | null }[] = []
  const places: { w: NcaaWeight; line: number; place: number; who: string }[] = []
  const vacant = new Map<NcaaWeight, Set<number>>()
  text.split('\n').forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '').trim(), n = i + 1
    if (!line) return
    let m: RegExpMatchArray | null
    if ((m = line.match(/^@\s*(\d{2,3}|hwt|unl)$/i))) {
      const weight = /^\d+$/.test(m[1]) ? Number(m[1]) : 285
      w = weights.find(x => x.weight === weight) ?? null
      if (!w) { w = { weight, entrants: [], placers: [], problems: [] }; weights.push(w) }
      return
    }
    if (!w) { problems.push(`line ${n}: before any weight`); return }
    if (/^format\s+/i.test(line)) return
    if ((m = line.match(/^vacant\s+(\d)$/i))) { vacant.set(w, (vacant.get(w) ?? new Set()).add(Number(m[1]))); return }
    if ((m = line.match(/^place\s+(\d)\s+(.+)$/i))) { places.push({ w, line: n, place: Number(m[1]), who: m[2].trim() }); return }
    if ((m = line.match(/^(\S+)\s+(.+?)\s+>\s+(.+?)(?:\s*\|\s*(.*))?$/)) && ROUNDS.has(m[1].toLowerCase())) {
      pending.push({ w, line: n, round: m[1].toLowerCase(), win: m[2].trim(), lose: m[3].trim(), result: m[4]?.trim() || null }); return
    }
    if ((m = line.match(/^(\d+|-)\s+(.+?)\s*\|\s*(.+?)(?:\s*\|\s*(\d+-\d+(?:-\d+)?))?$/))) {
      w.entrants.push({ name: m[2].trim(), school: m[3].trim(), seed: m[1] === '-' ? null : Number(m[1]), record: m[4] ?? null }); return
    }
    problems.push(`line ${n}: not read: ${line}`)
  })
  // a name in a bout → the entrant
  const find = (wt: NcaaWeight, who: string, line: number): NcaaEntrant | null => {
    const full = wt.entrants.filter(e => nm(e.name) === nm(who))
    if (full.length === 1) return full[0]
    const init = who.match(/^([A-Za-z])\.?\s+(.+)$/)
    if (init) { const hit = wt.entrants.filter(e => nm(e.name)[0] === init[1].toLowerCase() && lastOf(e.name) === lastOf(init[2])); if (hit.length === 1) return hit[0] }
    // a last name of two words ("Des Vigne", "Van Doren"): the entrant whose name ends with it
    if (/\s/.test(who.trim())) { const tail = wt.entrants.filter(e => nm(noSuffix(e.name)).endsWith(nm(noSuffix(who)))); if (tail.length === 1) return tail[0] }
    const last = wt.entrants.filter(e => lastOf(e.name) === nm(noSuffix(who)))
    if (last.length === 1) return last[0]
    problems.push(`line ${line} (${wt.weight}): "${who}" is ${last.length || full.length ? 'more than one entrant' : 'no entrant'}`)
    return null
  }
  const byes: NcaaBout[] = []
  for (const b of pending) {
    if (/^bye$/i.test(b.lose)) { const e = find(b.w, b.win, b.line); if (e) byes.push({ weight: b.w.weight, bout: 0, winner: e, loser: null, result: null, round: b.round }); continue }
    const winner = find(b.w, b.win, b.line), loser = find(b.w, b.lose, b.line)
    if (winner && loser) bouts.push({ weight: b.w.weight, bout: 0, winner, loser, result: b.result, round: b.round })
  }
  for (const wt of weights) {
    const set = (place: number, e: NcaaEntrant | null) => { if (e && !wt.placers.some(p => p.place === place)) wt.placers.push({ place, name: e.name, school: e.school, seed: e.seed }) }
    for (const p of places.filter(p => p.w === wt)) set(p.place, find(wt, p.who, p.line))
    for (const [round, place] of [['f', 1], ['3rd', 3], ['5th', 5], ['7th', 7]] as const) {
      const b = bouts.find(x => x.weight === wt.weight && x.round === round)
      if (b) { set(place, b.winner); set(place + 1, b.loser) }
    }
    wt.placers.sort((a, b) => a.place - b.place)
    problems.push(...checkTranscriptWeight(wt, bouts.filter(b => b.weight === wt.weight), vacant.get(wt) ?? new Set()))
    if (!repechage) problems.push(...checkPath(wt, [...bouts, ...byes].filter(b => b.weight === wt.weight)))
  }
  return { weights, bouts, problems }
}

/** A bracket must hold together: nobody loses more than the format allows, the champion never loses, places 1–N
 *  without a gap, no bout twice */
function checkTranscriptWeight(w: NcaaWeight, bouts: NcaaBout[], vacant: Set<number>): string[] {
  const out: string[] = []
  const losses = new Map<NcaaEntrant, number>()
  for (const b of bouts) if (b.loser) losses.set(b.loser, (losses.get(b.loser) ?? 0) + 1)
  const placeOf = (e: NcaaEntrant) => w.placers.find(p => p.name === e.name && p.school === e.school)?.place
  for (const [e, n] of losses) if (n > ([6, 8].includes(placeOf(e) ?? 0) ? 3 : 2)) out.push(`${w.weight}: ${e.name} loses ${n} times`)
  const champ = w.placers.find(p => p.place === 1)
  const ce = champ && w.entrants.find(e => e.name === champ.name && e.school === champ.school)
  if (ce && losses.get(ce)) out.push(`${w.weight}: champion ${ce.name} has a loss`)
  const places = w.placers.map(p => p.place)
  for (let p = 1; p <= Math.max(0, ...places); p++) if (!places.includes(p) && !vacant.has(p)) out.push(`${w.weight}: no ${p} place`)
  const seen = new Set<string>()
  for (const b of bouts) {
    const k = [b.winner.name, b.loser?.name].sort().join('|') + b.round
    if (seen.has(k)) out.push(`${w.weight}: ${b.winner.name} v ${b.loser?.name} twice in ${b.round}`)
    seen.add(k)
  }
  const names = w.entrants.map(e => nm(e.name) + '|' + e.school)
  if (new Set(names).size !== names.length) out.push(`${w.weight}: an entrant listed twice`)
  return out
}

/** Each wrestler's bouts, in the order wrestled, must follow the bracket: where he comes from into each round */
function checkPath(w: NcaaWeight, bouts: NcaaBout[]): string[] {
  const out: string[] = []
  for (const e of w.entrants) {
    const mine = bouts.filter(b => b.winner === e || b.loser === e).sort((a, b) => ORDER.indexOf(a.round!) - ORDER.indexOf(b.round!))
    mine.forEach((b, i) => {
      const prev = mine[i - 1]
      const came = prev ? `${prev.round}:${prev.winner === e ? 'W' : 'L'}` : 'start'
      if (!FROM[b.round!]?.includes(came)) out.push(`${w.weight}: ${e.name} in ${b.round} after ${came === 'start' ? 'no bout' : came.replace(':W', ' win').replace(':L', ' loss')}`)
    })
  }
  return out
}
