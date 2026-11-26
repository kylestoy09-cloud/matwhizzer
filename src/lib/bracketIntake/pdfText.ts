// PDF bytes → each page's text runs with positions (pdf.js). Works in the browser (the intake page) and in Node
// (scripts/bracket_intake/rehearse.mts). The caller passes the pdf.js module so each side loads its own build.
import type { PageText } from './rows'

type PdfJs = { getDocument: (src: { data: Uint8Array; verbosity?: number }) => { promise: Promise<any> } }

export async function pdfPages(pdfjs: PdfJs, data: Uint8Array): Promise<PageText[]> {
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise
  const out: PageText[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const vp = page.getViewport({ scale: 1 })
    const tc = await page.getTextContent()
    out.push({
      width: vp.width, height: vp.height,
      runs: (tc.items as { str: string; transform: number[]; width: number; height: number }[])
        .filter(it => typeof it.str === 'string' && it.str.trim())
        .map(it => ({ x0: it.transform[4], x1: it.transform[4] + it.width, top: vp.height - it.transform[5] - (it.height || 0), str: it.str })),
    })
    page.cleanup()
  }
  await doc.destroy()
  return out
}
