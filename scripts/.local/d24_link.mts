import { createClient } from '@supabase/supabase-js'
import { PODIUM } from './d24_podium'
import { sameLastName } from '../../src/lib/trophyRows'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const reg = (await db.from('playoff_history_entrants').select('weight, name, team, wrestler_id').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'region').eq('num', 6)).data ?? []
let ok = 0
for (const [w, p, n, s] of PODIUM) {
  const first = n.split(' ')[0].toLowerCase().slice(0, 3)
  const m = reg.filter(r => r.weight === w && sameLastName(r.name, n) && (r.name.toLowerCase().startsWith(first) || ['bj', 'jeff', 'zach', 'rich', 'ben', 'joe', 'chris', 'pat', 'steve', 'dave', 'nick', 'jake', 'greg', 'josh', 'matt'].includes(n.split(' ')[0].toLowerCase())))
  if (m.length === 1) ok++
  else console.log(w, p, n, s, '→', m.length ? m.map(r => `${r.name} (${r.team})`).join('; ') : 'not at Region 6 at this weight')
}
console.log('linked', ok, 'of', PODIUM.length)
