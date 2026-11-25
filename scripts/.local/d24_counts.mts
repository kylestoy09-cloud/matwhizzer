import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 243
const c = async (t: string, f: (q: any) => any) => (await f(db.from(t).select('*', { count: 'exact', head: true }))).count
const ents = (await db.from('tournament_entries').select('id, wrestler_id').eq('tournament_id', T)).data ?? []
console.log('tournament 243 entries', ents.length)
console.log('matches', await c('matches', q => q.eq('tournament_id', T)))
console.log('team scores (calculated)', await c('precomputed_team_scores', q => q.eq('tournament_id', T)))
const wids = [...new Set(ents.map(e => e.wrestler_id).filter(Boolean))] as string[]
let only: string[] = [], other = 0
for (let i = 0; i < wids.length; i += 80) {
  const { data } = await db.from('tournament_entries').select('wrestler_id, tournament_id').in('wrestler_id', wids.slice(i, i + 80)).neq('tournament_id', T)
  const has = new Set((data ?? []).map(r => r.wrestler_id))
  for (const w of wids.slice(i, i + 80)) if (has.has(w)) other++; else only.push(w)
}
console.log('profiles in it', wids.length, 'with other postseason entries', other, 'ONLY in this file', only.length)
// do the only-here profiles have anything else anywhere (dual bouts etc.)?
for (const t of ['dual_meet_bouts', 'wrestler_hammer_scores', 'roster_entries']) {
  const r = await db.from(t).select('*', { count: 'exact', head: true }).in('wrestler_id', only)
  console.log('  only-here profiles referenced in', t, r.error ? `(${r.error.message})` : r.count)
}
const ph = (await db.from('playoff_history_profiles').select('wrestler_id, created').in('wrestler_id', only)).data ?? []
console.log('  only-here profiles made by the import', ph.filter(p => p.created).length, 'linked existing', ph.filter(p => !p.created).length)
console.log('staging entrants', await c('playoff_history_entrants', q => q.eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24)))
console.log('staging bouts', await c('playoff_history_bouts', q => q.eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24)))
const names = (await db.from('wrestlers').select('first_name, last_name').in('id', only)).data ?? []
console.log('only-here names:', names.map(n => `${n.first_name} ${n.last_name}`).join(', '))
