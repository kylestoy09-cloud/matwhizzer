// Practice mistakes for the bracket intake (2026-11-26): break a real results file on purpose so the review can be
// seen working. Used by the Aesthetic Tool's Import review tab and scripts/bracket_intake/mutation_test.mts.
// Each one picks a bout by weight and round and changes it the way a results file goes wrong.
import type { ResultRow } from './results'

export type Practice = { key: string; label: string; weight: number; caught: boolean; apply: (rows: ResultRow[]) => ResultRow | null }

const find = (rows: ResultRow[], w: number, round: RegExp) => rows.find(x => x.weight === w && round.test(x.round)) ?? null

export const PRACTICE: Practice[] = [
  { key: 'swap', label: 'A quarterfinal with the winner and loser swapped', weight: 132, caught: true, apply: rows => {
    const r = find(rows, 132, /^quarter/i); if (r) { [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam] } return r } },
  { key: 'spell', label: 'A misspelled name in a semifinal', weight: 150, caught: true, apply: rows => {
    const r = find(rows, 150, /^semi/i); if (r) r.loser = r.loser.replace(/[aeiou]/, 'x'); return r } },
  { key: 'weight', label: 'A bout listed under the wrong weight (165 → 175)', weight: 175, caught: true, apply: rows => {
    const r = find(rows, 165, /^quarter/i); if (r) r.weight = 175; return r } },
  { key: 'round', label: 'A quarterfinal labeled as a semifinal', weight: 215, caught: true, apply: rows => {
    const r = find(rows, 215, /^quarter/i); if (r) r.round = 'Semifinal'; return r } },
  { key: 'final', label: 'A final with the wrong winner (the one mistake it can’t catch)', weight: 285, caught: false, apply: rows => {
    const r = find(rows, 285, /^(1st|final|first)/i); if (r) { [r.winner, r.loser] = [r.loser, r.winner]; [r.winnerTeam, r.loserTeam] = [r.loserTeam, r.winnerTeam] } return r } },
]
