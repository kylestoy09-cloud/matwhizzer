import { readFileSync } from 'fs'
import { getDocumentProxy } from 'unpdf'
const pdf = await getDocumentProxy(new Uint8Array(readFileSync(process.argv[2])))
const page = await pdf.getPage(1)
const tc = await page.getTextContent()
const items = (tc.items as any[]).filter(i => i.str.trim()).map(i => ({ s: i.str.trim(), x: Math.round(i.transform[4]), y: Math.round(i.transform[5]) }))
items.sort((a, b) => b.y - a.y || a.x - b.x)
for (const i of items) console.log(`${String(i.x).padStart(4)} ${String(i.y).padStart(4)}  ${i.s}`)
