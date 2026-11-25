import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const rows: any[] = []
for (let f = 0; ; f += 1000) { const { data } = await db.from('playoff_history_entrants').select('season_id, name, team, wrestler_id').eq('gender', 'F').order('id').range(f, f + 999); rows.push(...(data ?? [])); if ((data ?? []).length < 1000) break }
const ids = new Set(rows.map(r => r.wrestler_id))
console.log('distinct wrestlers on girls entries', ids.size)
// existing profiles reached by more than one history wrestler (the 3)
const { data: prof } = await db.from('playoff_history_profiles').select('wrestler_id').eq('gender', 'F').eq('created', false)
const linkedIds = new Set((prof ?? []).map(p => p.wrestler_id))
const byW = new Map<string, Set<string>>()
for (const r of rows) if (linkedIds.has(r.wrestler_id)) (byW.get(r.wrestler_id) ?? byW.set(r.wrestler_id, new Set()).get(r.wrestler_id)!).add(`${r.season_id - 1}-${String(r.season_id).slice(2)} ${r.name} (${r.team})`)
const { data: ws } = await db.from('wrestlers').select('id, first_name, last_name, graduation_year').in('id', [...byW.keys()].slice(0, 400))
for (const w of ws ?? []) { const v = [...byW.get(w.id)!]; const seasons = new Set(v.map(x => x.slice(0, 7))); if ([...seasons].length < v.length) console.log(`  ${w.first_name} ${w.last_name} (class ${w.graduation_year}): ${v.sort().join(' | ')}`) }
