// dev helper: dump unpdf text items (string, x, y, width) for a PDF page
import { readFileSync, writeFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
const [file, pageArg] = process.argv.slice(2)
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(file)))
const out: { p: number; s: string; x: number; y: number; w: number }[] = []
for (let p = 1; p <= pdf.numPages; p++) {
  if (pageArg && Number(pageArg) !== p) continue
  const tc = await (await pdf.getPage(p)).getTextContent()
  for (const it of tc.items as { str: string; transform: number[]; width: number }[]) if (it.str?.trim()) out.push({ p, s: it.str.trim(), x: Math.round(it.transform[4] * 10) / 10, y: Math.round(it.transform[5] * 10) / 10, w: Math.round(it.width * 10) / 10 })
}
writeFileSync(process.argv[4] ?? '/dev/stdout', JSON.stringify(out))
