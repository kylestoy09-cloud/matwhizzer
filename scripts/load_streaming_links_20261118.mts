// Kyle 2026-11-18: "streaming sites is in the whizzer upload extra file — add them to the school list". Loads
// Whizzer Upload/Extra/Streaming Sites.csv (school_id, display_name, Stream) into boys_streaming_links /
// girls_streaming_links for the newest season (links are kept for the upcoming season, like coaches), through
// src/lib/streamingLinks.ts. A row goes to each program the school runs (boys_schools / girls_schools, NJ); an id we
// don't have is reported, not guessed. Dry run unless --apply.
//   npx tsx scripts/load_streaming_links_20261118.mts [--apply]
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { boysProgramSchoolIds, girlsProgramSchoolIds } from '../src/lib/genderPrograms'
import { cleanStreamingUrl, setStreamingLink } from '../src/lib/streamingLinks'
import { getNewestSeason } from '../src/lib/season-context'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows = readFileSync(`${process.env.HOME}/Desktop/wrestling_brackets/Whizzer Upload/Extra/Streaming Sites.csv`, 'utf8')
  .trim().split(/\r?\n/).slice(1).map(l => { const [id, name, ...url] = l.split(','); return { id: Number(id), name, url: url.join(',').trim() } })
const season = await getNewestSeason()
const boys = new Set(await boysProgramSchoolIds(db as never)), girls = new Set(await girlsProgramSchoolIds(db as never))
const out = { boys: 0, girls: 0, badUrl: [] as string[], noProgram: [] as string[], girlsBoysPage: [] as string[] }
for (const r of rows) {
  if (!cleanStreamingUrl(r.url)) { out.badUrl.push(`${r.id} ${r.name}: ${r.url}`); continue }
  const sides = [...(boys.has(r.id) ? ['M'] : []), ...(girls.has(r.id) ? ['F'] : [])] as ('M' | 'F')[]
  if (!sides.length) { out.noProgram.push(`${r.id} ${r.name}`); continue }
  for (const g of sides) {
    // a link to a boys team page, on the girls side — for Kyle to look at
    if (g === 'F' && /boys/i.test(r.url) && !/girls/i.test(r.url)) out.girlsBoysPage.push(`${r.id} ${r.name}`)
    if (APPLY) { const { error } = await setStreamingLink(db, g, r.id, season.id, r.url); if (error) throw new Error(`${r.id} ${g}: ${error}`) }
    out[g === 'M' ? 'boys' : 'girls']++
  }
}
console.log(`${APPLY ? 'saved' : 'would save'} for season ${season.label} (id ${season.id}):`, { boys: out.boys, girls: out.girls })
console.log('not a web address:', out.badUrl)
console.log('no NJ program with that id (not loaded):', out.noProgram)
console.log(`girls programs given a boys team page (${out.girlsBoysPage.length}):`, out.girlsBoysPage.join('; '))
