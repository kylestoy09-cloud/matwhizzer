// The practice results file's mistakes (2026-11-26): the 2024 NJSIAA State results with real-world kinds of errors
// written into the CSV (data/bracket_intake/2024_state_flo_practice.csv, made by
// scripts/bracket_intake/make_practice_csv.mts). The import page is never told about them: it finds them the way it
// finds any. This list is the answer key (scripts/bracket_intake/mutation_test.mts checks every one is caught and
// that the page's fixes put the file back the way it was).
import type { ResultRow } from './results'

export type Practice = { key: string; label: string; apply: (rows: ResultRow[]) => ResultRow | null }

const find = (rows: ResultRow[], w: number, round: RegExp) => rows.find(x => x.weight === w && round.test(x.round)) ?? null
const swap = (r: ResultRow) => { [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam] }

export const PRACTICE: Practice[] = [
  { key: 'swap', label: '132: a quarterfinal with the winner and loser swapped', apply: rows => { const r = find(rows, 132, /^quarter/i); if (r) swap(r); return r } },
  { key: 'spell', label: '150: a misspelled name in a semifinal (Jayden → Jxyden)', apply: rows => { const r = find(rows, 150, /^semi/i); if (r) r.loser = r.loser.replace(/[aeiou]/, 'x'); return r } },
  { key: 'weight', label: '165: a quarterfinal listed under 175', apply: rows => { const r = find(rows, 165, /^quarter/i); if (r) r.weight = 175; return r } },
  { key: 'score', label: '190: a decision with the wrong score', apply: rows => { const r = rows.find(x => x.weight === 190 && /^semi/i.test(x.round) && x.winType === 'DEC') ?? null; if (r) r.result = r.result.replace(/^(\d+)-(\d+)/, (_, a, b) => `${Number(a) + 1}-${b}`); return r } },
  { key: 'round', label: '215: a quarterfinal labeled as a semifinal', apply: rows => { const r = find(rows, 215, /^quarter/i); if (r) r.round = 'Semifinal'; return r } },
  { key: 'final', label: '285: the final with the winner and loser swapped', apply: rows => { const r = find(rows, 285, /^(1st|final|first)/i); if (r) swap(r); return r } },
]
