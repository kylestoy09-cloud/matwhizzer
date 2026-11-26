// Text from a PDF page as rows (bracket intake, 2026-11-26). pdf.js gives text in runs with positions; a bracket's
// lines are rebuilt from them. Rules learned from 13 years of brackets (docs/reviews/bracket_source_quirks.md):
// - a seed's digits sit a hair above its name → runs within 2.5pt of each other are one row
// - two columns can share a row on crowded state pages → a gap wider than 30pt splits the row into pieces

export type TextRun = { x0: number; x1: number; top: number; str: string; w?: number }   // w: font weight (pdfText.ts)
export type PageText = { width: number; height: number; runs: TextRun[] }
export type Piece = { top: number; x: number; text: string; w: number }   // w: the heaviest font among its letters

export function rows(page: PageText, opts: { xMax?: number; xMin?: number } = {}): Piece[] {
  const xMax = opts.xMax ?? Infinity, xMin = opts.xMin ?? -Infinity
  const runs = page.runs.filter(r => r.str.trim() && r.x0 >= xMin && r.x0 < xMax).sort((a, b) => a.top - b.top)
  const groups: { top: number; runs: TextRun[] }[] = []
  for (const r of runs) {
    const g = groups[groups.length - 1]
    if (g && r.top - g.top <= 2.5) g.runs.push(r)
    else groups.push({ top: r.top, runs: [r] })
  }
  const out: Piece[] = []
  for (const g of groups) {
    const rs = g.runs.sort((a, b) => a.x0 - b.x0)
    let text = '', start = rs[0].x0, prevEnd = rs[0].x0, w = 0
    rs.forEach((r, k) => {
      const gap = r.x0 - prevEnd
      if (k && gap > 30) { out.push({ top: g.top, x: start, text: tidy(text), w }); text = ''; start = r.x0; w = 0 }
      if (/[A-Za-z]/.test(r.str)) w = Math.max(w, r.w ?? 0)
      else if (k && gap > 1.5) text += ' '
      // the same run printed twice (bold overprint) adds nothing
      if (!(k && r.x0 === rs[k - 1].x0 && r.str === rs[k - 1].str)) text += r.str
      prevEnd = Math.max(prevEnd, r.x1)
    })
    out.push({ top: g.top, x: start, text: tidy(text), w })
  }
  return out
}

const tidy = (s: string) => s.replace(/\s+/g, ' ').trim()
