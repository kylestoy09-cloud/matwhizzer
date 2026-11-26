// FloWrestling bracket PDF → each weight's draw (bracket intake, 2026-11-26). NJSIAA's postseason is on Flo for
// 2026-27. One PDF holds a whole tournament; a weight's first page holds its first round: boxes of `seed Name (CODE)`
// or `BYE`, top to bottom. Rehearsed on 2013–2024 (every championship bout fit the draw): see
// docs/reviews/bracket_source_quirks.md §6 and scripts/bracket_intake/.
import { rows, type PageText } from './rows'

export type DrawLine = { seed: number | null; name: string; code: string } | null   // null = a bye / empty line
export type WeightDraw = {
  page: number            // 1-based page in the PDF (for the zoomed review crop)
  event: string
  weight: number
  pool: string            // '' for a plain bracket; 'Default Pool' / 'Pool A' at pool-play events
  paged: boolean          // the page says "Page 1 of N"
  lines: DrawLine[]
  tops: (number | null)[] // each line's y on its page (for cropping the PDF beside a review item)
  x: number               // the first column's x
}

const EMPTY = /^(\d+\s*)?(BYE|Forfeit)$/i   // a bye, or a withdrawn seed's line ("1 Forfeit")
// "1 Killian Coluccio (CBA)"; a long name can push the closing parenthesis off the column, a nickname stays in the
// name: "Michael VanderMeulen (JETW", "Richard John (RJ) Hunnewell ("
const ENTRY = /^(\d+)?\s*(\D.*?)\s*\(([^()]*)\)?$/

export function readFloDraws(pages: PageText[]): WeightDraw[] {
  const found: WeightDraw[] = []
  pages.forEach((pg, n) => {
    const W = pg.width
    const all = rows(pg)
    const topRight = all.filter(p => p.x > W * 0.6 && p.top < 150).map(p => p.text).join(' ')
    const pageNo = /Page (\d+) of (\d+)/.exec(topRight)
    if (pageNo && pageNo[1] !== '1') return                       // a weight's first page holds the first round
    // the event and weight: top right (newer PDFs), else the first lines (2013: no page numbers, top left)
    const head = all.filter(p => p.top < 150 && !p.text.includes('Page'))
    const right = head.filter(p => p.x > W * 0.75 && p.top > 40).map(p => p.text)
    const pool_ = right.length ? right : head.map(p => p.text)
    let weight: number | null = null
    for (const t of pool_) { const m = /^(\d{2,3})(?:\s*lbs\b.*)?$/.exec(t); if (m) { weight = Number(m[1]); break } }   // "106" or "106 lbs - Pool A"
    if (weight == null) return
    const event = pool_.find(t => /^[A-Z][A-Za-z].*[A-Za-z0-9]$/.test(t) && !t.includes('(')) ?? ''
    const pool = (/lbs\s*-\s*(.+)$/.exec(pool_.join(' '))?.[1] ?? '').split(' Page')[0].trim()
    // the first column: the left-most entry lines (later rounds' boxes sit further right)
    const left = rows(pg, { xMax: W * 0.32 }).filter(p => p.top > 40)
    const cand = left.filter(p => EMPTY.test(p.text) || (p.text.includes('(') && /\([^()]*\)?$/.test(p.text)))
    if (!cand.length) return
    const x0 = Math.min(...cand.map(p => p.x))
    const lines: DrawLine[] = [], tops: (number | null)[] = []
    for (const p of cand) {
      if (Math.abs(p.x - x0) > 25) continue
      if (EMPTY.test(p.text)) { lines.push(null); tops.push(p.top); continue }
      const m = ENTRY.exec(p.text)
      if (m) { lines.push({ seed: m[1] ? Number(m[1]) : null, name: m[2].trim(), code: m[3].trim() }); tops.push(p.top) }
    }
    found.push({ page: n + 1, event, weight, pool, paged: !!pageNo, lines, tops, x: x0 })
  })
  // pool-play events: a weight's round-robin pool pages have no "Page 1 of N"; its bracket does. Keep the numbered
  // bracket page when a weight has one, else its unnumbered page (2013 has no page numbers at all)
  const best = new Map<number, WeightDraw>()
  for (const d of found) {
    const cur = best.get(d.weight)
    if (!cur || (d.paged && !cur.paged) || (d.paged === cur.paged && d.lines.length > cur.lines.length)) best.set(d.weight, d)
  }
  return [...best.values()].sort((a, b) => a.weight - b.weight)
}
