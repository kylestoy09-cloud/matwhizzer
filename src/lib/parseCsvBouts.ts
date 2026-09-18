// Generic parser for TournamentWrestling CSV exports.
// Format: weight,match,round,result,seed1,name1,team1,score1,seed2,name2,team2,score2
// name1/name2 are the winner/loser respectively.

export type CsvBout = {
  weight: number
  round: string            // pre-normalized DB code (QF, SF, F, R1, R2, R3, C1, CQF, CSF, 3rd_Place, 5th_Place)
  result_type: string
  result_detail: string | null
  winner_name: string      // "D. Butenewicz"
  winner_school: string
  winner_seed: number
  loser_name: string
  loser_school: string
  loser_seed: number
}

export type CsvSeed = {
  weight: number
  seed: number
  name: string
  school: string
}

export type ParsedCsvData = {
  bouts: CsvBout[]
  seeds: CsvSeed[]
}

// Parse "F 3:25", "MD", "DEC SV", etc. into result_type + result_detail
function parseResult(raw: string): { result_type: string; result_detail: string | null } {
  const r = raw.trim()
  if (!r) return { result_type: 'Unknown', result_detail: null }

  if (r.startsWith('F ') || r === 'F') {
    const time = r.slice(2).trim()
    return { result_type: 'Fall', result_detail: time || null }
  }
  if (r.startsWith('TF ') || r === 'TF') {
    const detail = r.slice(r.indexOf(' ') + 1).trim()
    return { result_type: 'TF', result_detail: detail || null }
  }
  if (r === 'MD') return { result_type: 'MD', result_detail: null }
  if (r === 'MD SV') return { result_type: 'MD', result_detail: 'SV' }
  if (r === 'DEC') return { result_type: 'Dec', result_detail: null }
  if (r === 'DEC SV') return { result_type: 'SV-1', result_detail: null }
  if (r === 'DEC TB2') return { result_type: 'TB-2', result_detail: null }
  if (r === 'DEC TB1') return { result_type: 'TB-1', result_detail: null }
  if (r.startsWith('M FOR')) {
    const time = r.slice(5).trim()
    return { result_type: 'M. For.', result_detail: time || null }
  }
  if (r === 'NC') return { result_type: 'NC', result_detail: null }
  if (r === 'FOR' || r === 'Forfeit') return { result_type: 'Forfeit', result_detail: null }
  if (r === 'DFF') return { result_type: 'DFF', result_detail: null }
  return { result_type: r, result_detail: null }
}

// Normalize CSV round names to DB codes.
// Championship rounds (R1/R2/R3) are weight-class-relative — computed after scanning all rows.
const ROUND_MAP: Record<string, string> = {
  'Quarter-Finals':  'QF',
  'Semi-Finals':     'SF',
  'Finals':          'F',
  'Consi of 4':      'CQF',
  'Consi-Semis':     'CSF',
  '3rd Place':       '3rd_Place',
  '5th Place':       '5th_Place',
  '7th Place':       '7th_Place',
}

function normalizeCsvRound(csvRound: string, relativeIndex: number): string {
  if (ROUND_MAP[csvRound]) return ROUND_MAP[csvRound]
  // "Round of X" gets converted per-weight-class after scanning; placeholder during initial pass
  if (csvRound.startsWith('Round of ')) return `_ROF_${csvRound.slice(9)}`  // e.g. "_ROF_64"
  return csvRound
}

// Parse CSV text into bouts and seed list.
// CSV row: weight,match,round,result,seed1,name1,team1,score1,seed2,name2,team2,score2
export function parseCsvBouts(csvText: string): ParsedCsvData {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) return { bouts: [], seeds: [] }

  // Skip header row (first line contains "weight,match,round,...")
  const dataStart = lines[0].toLowerCase().startsWith('weight') ? 1 : 0

  type RawRow = {
    weight: number
    match: number
    round: string     // raw CSV round name
    result: string
    seed1: number
    name1: string
    team1: string
    seed2: number
    name2: string
    team2: string
  }

  const rows: RawRow[] = []
  for (let i = dataStart; i < lines.length; i++) {
    const cols = lines[i].split(',')
    if (cols.length < 12) continue
    const weight = parseInt(cols[0], 10)
    if (isNaN(weight)) continue
    rows.push({
      weight,
      match:  parseInt(cols[1], 10),
      round:  cols[2].trim(),
      result: cols[3].trim(),
      seed1:  parseInt(cols[4], 10),
      name1:  cols[5].trim(),
      team1:  cols[6].trim(),
      seed2:  parseInt(cols[8], 10),
      name2:  cols[9].trim(),
      team2:  cols[10].trim(),
    })
  }

  // Determine per-weight bracket entry round for R1/R2/R3 assignment.
  // "Round of X" — the highest X for a given weight is R1 (the first round).
  // e.g. if weight has Round of 64 and Round of 32: 64→R1, 32→R2, 16→R3
  // If weight only has Round of 32 and Round of 16: 32→R1, 16→R2
  const rofByWeight = new Map<number, number[]>()  // weight → sorted desc list of bracket sizes
  for (const r of rows) {
    if (!r.round.startsWith('Round of ')) continue
    const size = parseInt(r.round.slice(9), 10)
    if (!rofByWeight.has(r.weight)) rofByWeight.set(r.weight, [])
    const arr = rofByWeight.get(r.weight)!
    if (!arr.includes(size)) arr.push(size)
  }
  // Sort descending so index 0 = first round (largest bracket)
  for (const [, arr] of rofByWeight) arr.sort((a, b) => b - a)

  const bouts: CsvBout[] = []
  const seedMap = new Map<string, CsvSeed>()  // `${weight}|${seed}` → CsvSeed (dedupe)

  for (const r of rows) {
    // Resolve round code
    let round: string
    if (r.round.startsWith('Round of ')) {
      const size = parseInt(r.round.slice(9), 10)
      const arr = rofByWeight.get(r.weight) ?? [size]
      const idx = arr.indexOf(size)
      round = `R${idx + 1}`  // R1 for highest bracket size, R2 for next, etc.
    } else {
      round = ROUND_MAP[r.round] ?? r.round
    }

    const { result_type, result_detail } = parseResult(r.result)

    bouts.push({
      weight:         r.weight,
      round,
      result_type,
      result_detail,
      winner_name:    r.name1,
      winner_school:  r.team1,
      winner_seed:    r.seed1,
      loser_name:     r.name2,
      loser_school:   r.team2,
      loser_seed:     r.seed2,
    })

    // Collect seeds — both wrestlers in each bout carry their seed
    for (const [seed, name, school] of [
      [r.seed1, r.name1, r.team1],
      [r.seed2, r.name2, r.team2],
    ] as [number, string, string][]) {
      const key = `${r.weight}|${seed}`
      if (!seedMap.has(key)) {
        seedMap.set(key, { weight: r.weight, seed, name, school })
      }
    }
  }

  return { bouts, seeds: [...seedMap.values()].sort((a, b) => a.weight - b.weight || a.seed - b.seed) }
}
