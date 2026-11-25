// Kyle 2026-11-21 ("we also need to import the 2026 ncaa girls tournament"): the colleges the 2026 NCAA Women's
// Championships file prints that weren't on our list. Six are here under another spelling, so those rows only add the
// printed name; Bridgeport and Illinois Wesleyan are new (city, state, conference, mascot, colors — colors_checked stays
// false for Kyle). Same shape as scripts/add_women_colleges_20261119.mts. Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

// name | city | state | conference | mascot | primary | secondary | aliases (as printed; existing colleges: name only)
const ROWS = `
Bridgeport|Bridgeport|CT|CACC|Purple Knights|#5F259F|#FFFFFF|Bridgeport
Illinois Wesleyan|Bloomington|IL|CCIW|Titans|#006341|#FFFFFF|Ill. Wesleyan;Illinois Wesleyan
Delaware State||||||||Delaware St.
Elmira||||||||Elmira
Frostburg State||||||||Frostburg St
Marymount||||||||Marymount (VA)
Northern Michigan||||||||Northern Mich.
William Jewell||||||||William Jewell
`.trim().split('\n').map(l => { const p = l.split('|'); const [name, city, state, conference, mascot, primary_color, secondary_color] = p; return { name, city: city || null, state: state || null, conference: conference || null, mascot: mascot || null, primary_color: primary_color || null, secondary_color: secondary_color || null, aliases: p[p.length - 1].split(';') } })

const { data: have } = await db.from('colleges').select('id, name')
const { data: haveAlias } = await db.from('college_aliases').select('alias, college_id')
const byName = new Map((have ?? []).map(c => [c.name.toLowerCase(), c.id as number]))
const aliasOf = new Map((haveAlias ?? []).map(a => [a.alias.toLowerCase(), a.college_id as number]))
const newColleges = ROWS.filter(r => !byName.has(r.name.toLowerCase()))
const missing = newColleges.filter(r => !r.city)   // an "existing" row whose name isn't on file: a typo here
const clash = ROWS.flatMap(r => r.aliases.filter(a => aliasOf.has(a.toLowerCase()) && aliasOf.get(a.toLowerCase()) !== byName.get(r.name.toLowerCase())).map(a => `${a} (already → college ${aliasOf.get(a.toLowerCase())})`))
console.log({ rows: ROWS.length, new: newColleges.map(r => r.name), aliases: ROWS.reduce((n, r) => n + r.aliases.length, 0), alias_clashes: clash, not_found: missing.map(r => r.name) })
if (!APPLY) process.exit(0)
if (clash.length || missing.length) throw new Error('alias clash or unknown college — sort out first')
if (newColleges.length) {
  const { data, error } = await db.from('colleges').insert(newColleges.map(({ aliases: _a, ...c }) => c)).select('id, name')
  if (error) throw new Error(error.message)
  for (const c of data ?? []) byName.set(c.name.toLowerCase(), c.id)
}
const aliasRows = ROWS.flatMap(r => r.aliases.filter(a => !aliasOf.has(a.toLowerCase())).map(a => ({ alias: a.toLowerCase(), college_id: byName.get(r.name.toLowerCase())! })))
const uniq = [...new Map(aliasRows.map(a => [a.alias, a])).values()]
const { error } = await db.from('college_aliases').insert(uniq)
if (error) throw new Error(error.message)
console.log({ colleges_added: newColleges.length, aliases_added: uniq.length })
