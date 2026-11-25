// Girls postseason history (Daily Challenge): school names to MatWhizzer's school names. 2019-2024 came from
// TrackWrestling team names, which vary ("Bound Brook HS", "Bound Brook Hs") and differ from ours ("High Point
// Regional" v "High Point"), so one school split into several rows on the Schools tab. A name maps when exactly
// one school matches: an alias (school_aliases), or the name cleaned of HS / Regional / Township / Jr-Sr /
// punctuation against our names and aliases. The rest stay as written. Backup of every row changed:
// docs/migrations/backups/20261113_girls_history_school_names.json. Usage: [go]
import { writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
async function all(t: string, sel: string, f: (q: any) => any = q => q) { const out: any[] = []; for (let a = 0; ; a += 1000) { const { data, error } = await f(db.from(t).select(sel)).order('id').range(a, a + 999); if (error) throw error; out.push(...data); if (data.length < 1000) return out } }
const clean = (s: string) => s.toLowerCase().replace(/\bh\.?\s?s\.?\b|high school|\bregional\b|\breg\b|\btownship\b|\btwp\b|\bjr\.?\s*\/?\s*sr\.?\b|\bmemorial\b|, ?nj\b|\(nj\)/g, '').replace(/[^a-z]/g, '')
const schools = await all('schools', 'id, display_name, is_nj, is_combined')
// the girls program's name where it differs (school_season_names, newest season): Newton is "Newton/Kittatinny"
const { data: seasonNames, error: snErr } = await db.from('school_season_names').select('school_id, season_id, gender, display_name').eq('gender', 'F')
if (snErr) throw snErr
const girlsName = new Map<number, string>()
for (const r of (seasonNames ?? []).sort((a, b) => a.season_id - b.season_id)) girlsName.set(r.school_id, r.display_name)
const coop = new Map(schools.map(s => [s.id, !!s.is_combined]))
const aliases = await all('school_aliases', 'id, school_id, alias')
const name = new Map(schools.map(s => [s.id, girlsName.get(s.id) ?? s.display_name]))
const exact = new Map<string, Set<number>>(), loose = new Map<string, Set<number>>()
const add = (m: Map<string, Set<number>>, k: string, id: number) => { if (k) (m.get(k) ?? m.set(k, new Set()).get(k)!).add(id) }
for (const s of schools) { add(exact, s.display_name.toLowerCase().trim(), s.id); add(loose, clean(s.display_name), s.id) }
for (const [id, n] of girlsName) { add(exact, n.toLowerCase().trim(), id); add(loose, clean(n), id) }
for (const a of aliases) { add(exact, a.alias.toLowerCase().trim(), a.school_id); add(loose, clean(a.alias), a.school_id) }
const rows = await all('history_finishes', 'id, year, level, school', q => q.eq('gender', 'F'))
const map = new Map<string, string | null>(), substantive: string[] = []
for (const raw of new Set(rows.map(r => r.school).filter(Boolean))) {
  const e = exact.get(raw.toLowerCase().trim()), l = loose.get(clean(raw))
  const ids = e?.size === 1 ? e : l?.size === 1 ? l : null
  // unless the program changed: our school is a co-op and the name then was one school ("Lodi" → "Lodi/Saddle
  // Brook", "Ridgefield Park" → "Ridgefield Park/Bogota"), or the other way around ("Parsippany Hills/Parsippany")
  const id = ids ? [...ids][0] : null, to = id != null ? name.get(id) ?? null : null
  const wasCoop = /\//.test(raw.replace(/jr\.?\s*\/\s*sr/i, "")), isCoop = id != null && (coop.get(id) || /\//.test(to ?? ''))
  const same = to && (wasCoop === isCoop || clean(raw) === clean(to))
  map.set(raw, same ? to : null)
  if (to && !same) substantive.push(`${raw} (our school: ${to})`)
}
const changes = rows.filter(r => r.school && map.get(r.school) && map.get(r.school) !== r.school)
const unmatched = [...map].filter(([, v]) => !v).map(([k]) => k)
const before = new Set(rows.map(r => r.school)).size, after = new Set(rows.map(r => (r.school && map.get(r.school)) || r.school)).size
console.log(`girls history rows ${rows.length}; school names ${before} → ${after}; rows renamed ${changes.length}; names left as written ${unmatched.length}`)
console.log('renamed, e.g.:', [...new Set(changes.map(r => `${r.school} → ${map.get(r.school)}`))].slice(0, 30).join(' | '))
console.log('left as written, no single match:', unmatched.filter(u => !substantive.some(x => x.startsWith(u + ' ('))).sort().join(' | '))
console.log('left as written, a different name for the program then:', substantive.sort().join(' | '))
writeFileSync('docs/migrations/backups/20261113_girls_history_school_names.json', JSON.stringify(changes.map(r => ({ id: r.id, school: r.school, to: map.get(r.school) }))))
if (process.argv[2] === 'go') {
  for (const [from, to] of new Map(changes.map(r => [r.school, map.get(r.school)!]))) { const { error } = await db.from('history_finishes').update({ school: to }).eq('gender', 'F').eq('school', from); if (error) throw error }
  console.log('updated')
}
