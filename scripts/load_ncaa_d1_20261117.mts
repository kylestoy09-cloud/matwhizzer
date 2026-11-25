// Kyle 2026-11-17: load the men's NCAA DI championships 2000–2026 (~/Desktop/wrestling_brackets/NCAA Tournament/Mens/NCAA DI,
// one PDF a year; 2015 has two — brackets and places) into boys_college_events / _entries, matched to our wrestlers
// (src/lib/ncaa/save.ts). The Non-NJSIAA → College page does the same for later uploads. Re-runnable (keeps decisions).
import { readFileSync, readdirSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { getDocumentProxy } from 'unpdf'
import { parseNcaa, mergeParses, parseOfficialBouts, parseStatsBouts, type Item, type NcaaBout } from '../src/lib/ncaa/parse'
import { applyPlaceFixes } from '../src/lib/ncaa/corrections'
import { saveCollegeYear, loadPool } from '../src/lib/ncaa/save'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
// another level's folder of the same layouts: --level="NCAA DIII" (entrants and places only: --no-bouts)
const LEVEL = process.argv.find(a => a.startsWith('--level='))?.slice(8) ?? 'NCAA DI'
const NO_BOUTS = process.argv.includes('--no-bouts')
const dir = `${process.env.HOME}/Desktop/wrestling_brackets/NCAA Tournament/Mens/${LEVEL}`
// the year anywhere in the name ("1994.pdf", "NCAA_Championship_1994.pdf"); a copy named "… (1).pdf" is skipped
const yearOf = (f: string) => Number(f.match(/(?:19|20)\d{2}/)?.[0])
const files = readdirSync(dir).filter(f => /\.pdf$/i.test(f) && !/\(\d\)\.pdf$/i.test(f) && yearOf(f))
// only these years when given: npx tsx scripts/load_ncaa_d1_20261117.mts 1979 1980 …  (or a range: 1979-1998)
const want = process.argv.slice(2).filter(a => !a.startsWith('--')).flatMap(a => { const m = a.match(/^(\d{4})-(\d{4})$/); return m ? Array.from({ length: Number(m[2]) - Number(m[1]) + 1 }, (_, i) => Number(m[1]) + i) : [Number(a)] }).filter(Boolean)
const years = [...new Set(files.map(yearOf))].filter(y => !want.length || want.includes(y)).sort()
const pool = await loadPool(db as never, 'M')
const total = { entrants: 0, auto: 0, review: 0, none: 0, kept: 0 }
for (const y of years) {
  const mine = files.filter(f => yearOf(f) === y)
  const parts = []
  const bouts: NcaaBout[] = []
  for (const f of mine) {
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(`${dir}/${f}`)))
    const items: Item[] = []
    for (let p = 1; p <= pdf.numPages; p++) { const tc = await (await pdf.getPage(p)).getTextContent(); for (const it of tc.items as { str: string; transform: number[]; width: number }[]) if (it.str?.trim()) items.push({ p, s: it.str.trim(), x: it.transform[4], y: it.transform[5], w: it.width }) }
    const one = parseNcaa(items)
    parts.push(one)
    if (one.format === 'official') bouts.push(...parseOfficialBouts(items, one.weights))
    else if (one.format === 'stats') bouts.push(...parseStatsBouts(items, one.weights))
  }
  // before 1979 the brackets ran other formats (smaller fields, wrestlebacks only for those beaten by a finalist), so the
  // round names don't fit: entrants and places only (Kyle 2026-11-18: "just pull schools, names, and all american status")
  if (y < 1979 || NO_BOUTS) bouts.length = 0
  const parsed = applyPlaceFixes(LEVEL, y, mergeParses(parts))
  const places = parsed.weights.reduce((n, w) => n + w.placers.length, 0)
  const r = await saveCollegeYear(db as never, 'M', LEVEL, y, parsed.weights, mine, 'kyle.stoy09@gmail.com (load script)', pool, bouts)
  for (const k of Object.keys(total) as (keyof typeof total)[]) total[k] += r[k]
  console.log(y, mine.join('+'), `places ${places}`, JSON.stringify({ entrants: r.entrants, bouts: r.bouts, auto: r.auto, review: r.review, kept: r.kept }), r.unknown_colleges.length ? `UNKNOWN COLLEGES: ${r.unknown_colleges.join(', ')}` : '', r.places_added.length ? `PLACE WINNERS ADDED: ${r.places_added.join('; ')}` : '')
}
console.log('TOTAL', total)
