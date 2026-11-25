import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { PODIUM, TEAM_ORDER } from './d24_podium'
import { sameLastName } from '../../src/lib/trophyRows'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const reg = (await db.from('playoff_history_entrants').select('weight, name, team, wrestler_id').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'region').eq('num', 6)).data ?? []
const sch = new Map(((await db.from('playoff_history_schools').select('raw_name, school_id').eq('gender', 'M')).data ?? []).map(r => [r.raw_name, r.school_id]))
const nick: Record<string, string> = { bj: 'bryant', jeff: 'jeffery', zach: 'zachary', rich: 'richard', ben: 'benjamin', joe: 'joseph', chris: 'christopher', pat: 'patrick', steve: 'steven', dave: 'david', nick: 'nicholas', jake: 'jacob', greg: 'gregory', josh: 'joshua', quinten: 'quentin' }
const rows: string[] = []
for (const [w, p, n, s] of PODIUM) {
  const f = n.split(' ')[0].toLowerCase()
  const m = reg.filter(r => r.weight === w && sameLastName(r.name, n))
  const pick = m.length === 1 ? m[0] : m.find(r => r.name.toLowerCase().startsWith(f) || r.name.toLowerCase().startsWith(nick[f] ?? '~'))
  const sid = pick ? sch.get(pick.team) : null
  if (!pick?.wrestler_id || sid == null) throw new Error(`${w} ${n}: ${pick?.name} ${pick?.team} ${sid}`)
  rows.push(`(${w}, ${p}, '${pick.wrestler_id}', ${sid})`)
}
const tsch = (await db.from('playoff_history_entrants').select('team').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'region').eq('num', 6)).data ?? []
const teams = TEAM_ORDER.map((t, i) => {
  const id = sch.get(t) ?? sch.get(t.replace('Msgr.', 'Msgr')) ?? null
  if (id == null) throw new Error('team ' + t)
  return `(${i + 1}, ${id})`
})
writeFileSync(process.argv[2], JSON.stringify({ rows, teams }))
console.log(rows.length, teams.length)
