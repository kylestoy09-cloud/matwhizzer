import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: regs } = await db.from('regions').select('id, name')
const rn = new Map((regs ?? []).map(r => [r.id, r.name]))
const { data } = await db.from('tournaments').select('season_id, gender, name, region_id, tournament_type').or('tournament_type.eq.regions,tournament_type.eq.girls_regions').order('season_id')
const by = new Map<string, Set<string>>()
for (const t of data ?? []) { const k = `${t.gender} ${t.season_id}`; (by.get(k) ?? by.set(k, new Set()).get(k)!).add(`${/r(\d+)$/.exec(t.name)?.[1]}=${rn.get(t.region_id) ?? '?'}`) }
for (const [k, v] of by) console.log(k, [...v].sort().join(', '))
