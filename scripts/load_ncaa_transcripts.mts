// Kyle 2026-11-17: load championship transcripts (src/lib/ncaa/transcript.ts) — data/ncaa/transcripts/<level>/<year>.txt —
// into {boys,girls}_college_events / _entries / _bouts, matched to our wrestlers like the PDF imports
// (src/lib/ncaa/save.ts; re-runnable, keeps decisions). Dry run unless --apply: lists each year's problems and the
// colleges not on our list yet.
//   npx tsx scripts/load_ncaa_transcripts.mts "NCAA DII" [year …] [--girls] [--apply]
import { readFileSync, readdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { parseTranscript } from '../src/lib/ncaa/transcript'
import { saveCollegeYear, loadPool } from '../src/lib/ncaa/save'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply'), g = args.includes('--girls') ? 'F' : 'M'
const [level, ...rest] = args.filter(a => !a.startsWith('--'))
if (!level) throw new Error('level?')
const years = rest.map(Number)
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const dir = `data/ncaa/transcripts/${g === 'F' ? 'women/' : ''}${level}`
const files = readdirSync(dir).filter(f => /^\d{4}\.txt$/.test(f) && (!years.length || years.includes(Number(f.slice(0, 4))))).sort()
const { data: aliases } = await db.from('college_aliases').select('alias')
const known = new Set((aliases ?? []).map(a => a.alias.toLowerCase()))
const pool = APPLY ? await loadPool(db as never, g) : undefined
const unknownAll = new Map<string, number[]>()
let bad = 0
for (const f of files) {
  const year = Number(f.slice(0, 4))
  const text = readFileSync(`${dir}/${f}`, 'utf8')
  const t = parseTranscript(text)
  const source = text.match(/source:\s*(.+)/)?.[1]?.trim() ?? `${year}.pdf`
  const entrants = t.weights.reduce((n, w) => n + w.entrants.length, 0), places = t.weights.reduce((n, w) => n + w.placers.length, 0)
  for (const w of t.weights) for (const e of w.entrants) if (!known.has(e.school.toLowerCase())) unknownAll.set(e.school, [...new Set([...(unknownAll.get(e.school) ?? []), year])])
  console.log(year, `weights ${t.weights.length} entrants ${entrants} places ${places} bouts ${t.bouts.length}`, t.problems.length ? `\n  PROBLEMS:\n   ${t.problems.join('\n   ')}` : '')
  if (t.problems.length) { bad++; continue }
  if (APPLY) {
    const r = await saveCollegeYear(db as never, g, level, year, t.weights, source.split('+').map(s => s.trim()), 'kyle.stoy09@gmail.com (transcript)', pool, t.bouts)
    console.log('  saved', JSON.stringify({ entrants: r.entrants, bouts: r.bouts, auto: r.auto, review: r.review, kept: r.kept }))
  }
}
console.log(`\n${files.length} files, ${bad} with problems${APPLY && bad ? ' (those not saved)' : ''}`)
if (unknownAll.size) console.log(`colleges not on our list (${unknownAll.size}):\n  ` + [...unknownAll].sort().map(([s, ys]) => `${s} [${ys.join(',')}]`).join('\n  '))
