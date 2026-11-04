// Site snapshot check (2026-11-03). Boys and girls share database functions and page code, so a
// change made for one side can change the other. This loads a fixed sample of live pages for each
// side, keeps what each one shows (its visible text, logo count, TBD count), and compares a run with
// the last good one. Run it before and after any change to shared code.
//   npx tsx scripts/check_site_snapshot.mts            compare with the baseline
//   npx tsx scripts/check_site_snapshot.mts --save     store this run as the new baseline
//   npx tsx scripts/check_site_snapshot.mts --side F   one side only (M or F)
// Pages are fetched two at a time with a pause, to stay easy on the database. Right after a deploy,
// wait 5 minutes: pages serve cached data for that long.
import fs from 'fs'

const BASE = 'https://matwhizzer.com'
const FILE = 'docs/site_snapshot/baseline.json'
const PAGES: Record<'M' | 'F', string[]> = {
  M: [
    '/boys', '/boys/districts/1', '/boys/districts/1/150', '/boys/regions/1', '/boys/regions/1/150',
    '/boys/state', '/boys/state/150', '/boys/leaderboards', '/boys/rankings', '/boys/tournaments',
    '/boys/schools', '/boys/schools/18', '/boys/wrestler/92147059-a5bd-4e19-89de-3a7f6fb1d657',
    '/tournaments/b37954eb-ba9c-4fa6-b1c5-957f5a5fad9a', '/meets/010158ac-8d4e-45b0-836d-b0ad6a0d00d9',
  ],
  F: [
    '/girls', '/girls/districts/1', '/girls/districts/1/120', '/girls/regions/1', '/girls/regions/1/120',
    '/girls/state', '/girls/state/120', '/girls/leaderboards', '/girls/rankings', '/girls/tournaments',
    '/girls/schools', '/girls/schools/18', '/girls/wrestler/fa43ea25-09e1-4f58-bad1-89ef020fbbe9',
    '/tournaments/c7819525-a6dc-41b8-8605-74ca51de4ec8', '/meets/046532f2-30d4-4ae6-b049-735254fe9a7a',
  ],
}
type Snap = { status: number; logos: number; tbd: number; lines: string[] }

// what a reader sees: visible text, one line per text node, without the scripts and the
// parts that change on their own (dates "x ago", build ids)
async function snap(path: string): Promise<Snap> {
  const res = await fetch(BASE + path, { redirect: 'follow', signal: AbortSignal.timeout(60_000) }).catch(() => null)
  if (!res) return { status: 0, logos: 0, tbd: 0, lines: ['(timed out)'] }
  const html = await res.text()
  const main = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<!-- -->/g, '')
  const lines = main.replace(/<[^>]+>/g, '\n').split('\n').map(l => l.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ').trim())
    .filter(l => l && !/\b(ago|just now)\b/i.test(l))
  return {
    status: res.status,
    logos: (html.match(/<img[^>]+school-logos[^>]*>/g) ?? []).length,
    tbd: lines.filter(l => l === 'TBD').length,
    lines,
  }
}

const args = process.argv.slice(2)
const sides = (args.includes('--side') ? [args[args.indexOf('--side') + 1]] : ['M', 'F']) as ('M' | 'F')[]
const todo = sides.flatMap(s => PAGES[s].map(p => ({ side: s, path: p })))
const out: Record<string, Snap> = {}
for (let i = 0; i < todo.length; i += 2) {
  await Promise.all(todo.slice(i, i + 2).map(async t => { out[t.path] = await snap(t.path) }))
  await new Promise(r => setTimeout(r, 1500))
}

if (args.includes('--save')) {
  const prev = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { pages: {} }
  fs.mkdirSync('docs/site_snapshot', { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify({ saved: new Date().toISOString(), pages: { ...prev.pages, ...out } }, null, 1))
  console.log(`baseline saved: ${Object.keys(out).length} pages`)
  process.exit(0)
}
if (!fs.existsSync(FILE)) { console.log('no baseline yet: run with --save first'); process.exit(1) }
const base = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let changed = 0
for (const side of sides) {
  console.log(`\n== ${side === 'M' ? 'Boys' : 'Girls'} ==`)
  for (const path of PAGES[side]) {
    const a: Snap | undefined = base.pages[path], b = out[path]
    if (!a) { console.log(`  new      ${path}`); continue }
    const A = new Set(a.lines), B = new Set(b.lines)
    const gone = a.lines.filter(l => !B.has(l)), added = b.lines.filter(l => !A.has(l))
    const same = a.status === b.status && a.logos === b.logos && a.tbd === b.tbd && !gone.length && !added.length
    if (same) { console.log(`  same     ${path}`); continue }
    changed++
    console.log(`  CHANGED  ${path}  status ${a.status}→${b.status}, logos ${a.logos}→${b.logos}, TBD ${a.tbd}→${b.tbd}, ${gone.length} lines gone, ${added.length} new`)
    for (const l of gone.slice(0, 6)) console.log(`      - ${l.slice(0, 100)}`)
    for (const l of added.slice(0, 6)) console.log(`      + ${l.slice(0, 100)}`)
  }
}
console.log(`\n${changed ? `${changed} page(s) changed since the baseline (${base.saved})` : `no change since the baseline (${base.saved})`}`)
process.exit(changed ? 2 : 0)
