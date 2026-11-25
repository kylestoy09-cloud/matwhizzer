// Playoff History: the order bouts were wrestled, read from a FloWrestling bracket PDF, for an export that came without
// round names AND out of order (boys 2024 Region 7, the same when re-downloaded). Flo numbers bouts round by round,
// prints each number twice just right of its two wrestlers ("1 Coluccio (CBA)" above, "8 Bauer (SENE)" below), so
// each bout number = the pair of entries nearest to its left. Needs pdftotext (poppler): runs where the files are.
import { execFileSync } from 'child_process'

type Word = { x0: number; y0: number; x1: number; y1: number; t: string }
export type FloBout = { weight: number; num: number; a: string; b: string; result: string }   // a / b: "lastname|CODE", lowercased; result as printed ("DEC 12-6")

export const floKey = (last: string, code = '') => `${last.toLowerCase().replace(/[^a-z]/g, '')}|${code.toLowerCase()}`

export function floBoutOrder(pdf: string, weights: number[]): FloBout[] {
  const html = execFileSync('pdftotext', ['-bbox', pdf, '-']).toString()
  const out: FloBout[] = []
  for (const page of html.split('<page ').slice(1)) {
    const words: Word[] = [...page.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(m => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: m[5].replace(/&amp;/g, '&') }))
    // the weight: a weight class printed alone at the top right
    const weight = words.filter(w => w.y0 < 80 && w.x0 > 600 && weights.includes(Number(w.t))).map(w => Number(w.t))[0]
    if (!weight) continue
    // entries: "(CODE)" words; the last name is the word before it on the same line
    // ("DeLorenzo II (TREH)": skip a suffix)
    const SUFFIX = /^(ii|iii|iv|jr\.?|sr\.?)$/i
    const entries = words.flatMap((w, i) => {
      // (a code cut off at the page edge: "(SHA")
      if (!/^\([A-Za-z0-9&]+\)?$/.test(w.t) || !words[i - 1] || Math.abs(words[i - 1].y0 - w.y0) >= 3) return []
      // the team code is the last bracketed word on its line ("John (RJ) Hunnewell (SHAW)")
      const next = words[i + 1]
      if (next && Math.abs(next.y0 - w.y0) < 3 && next.x0 - w.x1 < 15) return []
      const last = SUFFIX.test(words[i - 1].t) && words[i - 2] && Math.abs(words[i - 2].y0 - w.y0) < 3 ? words[i - 2].t : words[i - 1].t
      return [{ x1: w.x1, y: (w.y0 + w.y1) / 2, key: floKey(last, w.t.replace(/[()]/g, '')) }]
    })
    // bout numbers: the same number printed twice, one just under the other
    const nums = words.filter(w => /^\d{1,4}$/.test(w.t))
    const seen = new Set<string>()
    for (const n of nums) {
      const twin = nums.find(o => o !== n && o.t === n.t && Math.abs(o.x0 - n.x0) < 2 && o.y0 > n.y0 && o.y0 - n.y0 < 6)
      if (!twin || seen.has(`${n.t}|${n.x0}`)) continue
      seen.add(`${n.t}|${n.x0}`)
      const y = (n.y0 + twin.y1) / 2
      const near = entries.filter(e => e.x1 < n.x0 && n.x0 - e.x1 < 120 && Math.abs(e.y - y) < 25)
      const above = near.filter(e => e.y < y).sort((p, q) => q.y - p.y)[0], below = near.filter(e => e.y > y).sort((p, q) => p.y - q.y)[0]
      // the result sits just under the number, right-aligned with it
      const result = words.filter(r => r.y0 > twin.y1 && r.y0 - twin.y1 < 22 && Math.abs(r.x1 - n.x1) < 4 || (r.y0 > twin.y1 && r.y0 - twin.y1 < 22 && r.x0 >= n.x0 - 40 && r.x1 <= n.x1 + 2))
        .sort((p, q) => p.x0 - q.x0).map(r => r.t).join(' ')
      if (above && below) out.push({ weight, num: Number(n.t), a: above.key, b: below.key, result })
    }
  }
  return out
}
