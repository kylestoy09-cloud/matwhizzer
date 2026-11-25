// A college year with the same name at the same college as a year matched to one of our wrestlers (within 6 years)
// is the same wrestler (Anthony Ashnault, Rutgers 2015–2017 matched; 2019 title 6 years after HS was left unmatched).
// Same rule as saveCollegeYear's for new imports. Backup of the rows changed first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 'boys_college_entries'
const all: any[] = []
for (let f = 0; ; f += 1000) { const { data, error } = await db.from(T).select('id, name, college_id, college_raw, wrestler_id, match_status, match_note, event:boys_college_events(year)').order('id').range(f, f + 999); if (error) throw error; all.push(...data!); if (data!.length < 1000) break }
const key = (r: any) => `${r.name}|${r.college_id ?? r.college_raw}`
const career = new Map<string, { wid: string; years: number[] }>()
for (const r of all) if (r.wrestler_id && (r.match_status === 'auto' || r.match_status === 'confirmed')) { const c = career.get(key(r)) ?? career.set(key(r), { wid: r.wrestler_id, years: [] }).get(key(r))!; if (c.wid === r.wrestler_id) c.years.push(r.event.year) }
const change = all.filter(r => (r.match_status === 'none' || r.match_status === 'review') && career.get(key(r))?.years.some(y => Math.abs(y - r.event.year) <= 6))
writeFileSync('docs/migrations/backups/20261117_college_carry_career_before.json', JSON.stringify(change))
for (const r of change) {
  const c = career.get(key(r))!
  const { error } = await db.from(T).update({ wrestler_id: c.wid, match_status: 'auto', match_note: JSON.stringify({ note: `same name at the same college as his matched years (${[...new Set(c.years)].sort().join(', ')})`, candidates: [] }) }).eq('id', r.id)
  if (error) throw error
}
console.log(change.map(r => `${r.event.year} ${r.name} (${r.college_raw}) was ${r.match_status}`).join('\n'), '\n', { changed: change.length })
