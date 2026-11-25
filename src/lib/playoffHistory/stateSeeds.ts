// Playoff History: state seeds from the FloWrestling state bracket PDF in each History/<year> folder (Kyle downloads it
// alongside the TrackWrestling exports, which carry no seeds). 4 pages per weight; page 1 holds the seeded first round:
// "  1 Joe Manchio (SENE)". Needs pdftotext (poppler), so it runs where the files are (scripts/playoff_history_stage.mts).
import { execFileSync } from 'child_process'

export type StateSeed = { weight: number; seed: number; name: string; code: string }

export function readStateSeeds(pdf: string, weights: number[]): { seeds: StateSeed[]; problems: string[] } {
  const info = execFileSync('pdfinfo', [pdf]).toString()
  const pages = Number(/Pages:\s+(\d+)/.exec(info)?.[1] ?? 0)
  const seeds: StateSeed[] = [], problems: string[] = []
  for (let p = 1; p <= pages; p++) {
    const text = execFileSync('pdftotext', ['-layout', '-f', String(p), '-l', String(p), pdf, '-']).toString()
    // big brackets run 4 pages a weight ("Page 1 of 4" holds the seeds); small ones (girls 2019-2022) are one page each
    if (/Page \d+ of \d+/.test(text) && !/Page 1 of \d+/.test(text)) continue
    // the weight: a line that is just a weight class near the top, the one furthest right (bout numbers sit mid-page
    // and can equal a weight: bout 113)
    // (girls 2023-24 print it on the same line as a "BYE": a 3-digit number at the far end of a line, after a wide gap)
    const top = text.split('\n').slice(0, 25).flatMap(l => {
      const m = /\s{20,}(\d{3})\s*$/.exec(l)
      return m && weights.includes(Number(m[1])) ? [{ v: Number(m[1]), indent: l.length - l.trimEnd().length === 0 ? m.index + m[0].length - 3 : m.index }] : []
    }).filter(x => x.indent >= 80).sort((a, b) => b.indent - a.indent)
    const w = top[0]?.v
    if (!w) { problems.push(`page ${p}: no weight found`); continue }
    const found: StateSeed[] = []
    for (const line of text.split('\n')) {
      // a seeded line: the seed, the FULL name (first + last: later rounds print the last name only), "(CODE)"
      const m = /^\s*(\d{1,2})\s+([A-Za-z][^()]*?[A-Za-z.'`-])\s+\(([A-Za-z0-9&]+)\)\s*$/.exec(line)
      if (m && m[2].trim().split(/\s+/).length >= 2) found.push({ weight: w, seed: Number(m[1]), name: m[2].replace(/\s+/g, ' ').trim(), code: m[3] })
    }
    // a multi-word last name in a later round can repeat a seed: keep the longest name per seed
    const bySeed = new Map<number, StateSeed>()
    for (const f of found) if (!bySeed.has(f.seed) || f.name.length > bySeed.get(f.seed)!.name.length) bySeed.set(f.seed, f)
    seeds.push(...bySeed.values())
  }
  return { seeds, problems }
}
