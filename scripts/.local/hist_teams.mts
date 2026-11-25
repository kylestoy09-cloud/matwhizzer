import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as any)
const teams = new Map<string, Set<number>>()
const people = new Map<string, Set<number>>()
for (let y = 2013; y <= 2020; y++) for (const e of readYear(y).events) for (const r of e.rows) {
  for (const t of [r.winnerTeam, r.loserTeam]) if (t) (teams.get(t) ?? teams.set(t, new Set()).get(t)!).add(y)
  for (const [n, t] of [[r.winner, r.winnerTeam], [r.loser, r.loserTeam]]) if (n) (people.get(`${n}|${t}`) ?? people.set(`${n}|${t}`, new Set()).get(`${n}|${t}`)!).add(y)
}
const un = [...teams.keys()].filter(t => m.idOf(t) == null)
console.log('team names', teams.size, '| matched to one of our schools', teams.size - un.length, '| not', un.length)
console.log(un.sort().join('; '))
const multi = [...people.values()].filter(s => s.size > 1).length
console.log('wrestler+team keys', people.size, '| seen in 2+ seasons', multi)
