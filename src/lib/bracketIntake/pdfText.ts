// PDF bytes → each page's text runs with positions (pdf.js). Works in the browser (the intake page) and in Node
// (scripts/bracket_intake/rehearse.mts). The caller passes the pdf.js module so each side loads its own build.
// weights: also record each run's font weight. A completed Flo bracket marks a bout's winner only by a heavier font
// (UniNeue Heavy over Bold / Regular), so reading results from it needs them (completed.ts).
import type { PageText } from './rows'

type PdfPage = {
  getViewport: (o: { scale: number }) => { width: number; height: number }
  getTextContent: () => Promise<{ items: unknown[] }>
  getOperatorList: () => Promise<unknown>
  commonObjs: { get: (id: string) => unknown }
  cleanup: () => void
}
type PdfDoc = { numPages: number; getPage: (n: number) => Promise<PdfPage>; destroy: () => Promise<void> }
type PdfJs = { getDocument: (src: { data: Uint8Array; verbosity?: number }) => { promise: Promise<PdfDoc> } }

/** 0 regular · 1 bold / semibold · 2 heavy / black / extra bold, from the embedded font's name */
export const fontWeight = (name: string) => (/heavy|black|extrabold|ultrabold/i.test(name) ? 2 : /bold|semibold|demi/i.test(name) ? 1 : 0)

export async function pdfPages(pdfjs: PdfJs, data: Uint8Array, opts: { weights?: boolean } = {}): Promise<PageText[]> {
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise
  const out: PageText[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    const weightOf = new Map<string, number>()
    if (opts.weights) {
      await page.getOperatorList()          // loads the page's fonts into commonObjs
      for (const it of tc.items as { fontName?: string }[]) {
        if (!it.fontName || weightOf.has(it.fontName)) continue
        let name = ''
        try { name = (page.commonObjs.get(it.fontName) as { name?: string } | null)?.name ?? '' } catch { /* not loaded */ }
        weightOf.set(it.fontName, fontWeight(name))
      }
    }
    out.push({
      width: vp.width, height: vp.height,
      runs: (tc.items as { str: string; transform: number[]; width: number; height: number; fontName?: string }[])
        .filter(it => typeof it.str === 'string' && it.str.trim())
        .map(it => ({ x0: it.transform[4], x1: it.transform[4] + it.width, top: vp.height - it.transform[5] - (it.height || 0), str: it.str, w: weightOf.get(it.fontName ?? '') ?? 0 })),
    })
    page.cleanup()
  }
  await doc.destroy()
  return out
}
