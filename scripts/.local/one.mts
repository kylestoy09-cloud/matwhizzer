const u = process.argv[2]
const html = await (await fetch(`https://matwhizzer.com${u}`)).text()
console.log('len', html.length)
const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, '\n')
const i = text.indexOf('\nTBD\n'); console.log('TBD count', (text.match(/\nTBD\n/g) ?? []).length)
for (const m of text.matchAll(/\nTBD\n/g)) console.log(JSON.stringify(text.slice(m.index! - 250, m.index! + 6).replace(/\n+/g, " | ")))
const r = process.argv[3]; if (r) { const j = text.indexOf(r); console.log('raw', j, JSON.stringify(text.slice(j - 400, j + 50))) }
