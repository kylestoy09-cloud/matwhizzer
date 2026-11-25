import { createClient } from '@supabase/supabase-js'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as any)
for (const name of ['Paulsboro', 'Bergen Catholic', 'Phillipsburg', 'Depaul Catholic']) {
  const id = m.idOf(name)
  const { data: f } = await db.from('history_finishes').select('year, level, place, name, school').eq('gender', name === 'Depaul Catholic' ? 'F' : 'M').limit(20000)
  const mine = (f ?? []).filter(x => m.idOf(x.school) === id && (x.level === 'state' || x.place === 1))
  const { data: t } = await db.from('history_team_titles').select('kind, year, grp, section, champion')
  const tm = (t ?? []).filter(x => m.idOf(x.champion) === id)
  console.log(`${name} (#${id}): individual ${mine.length} (state titles ${mine.filter(x => x.level === 'state' && x.place === 1).length}, region titles ${mine.filter(x => x.level === 'region').length}) | team titles ${tm.length} (state ${tm.filter(x => x.kind === 'group').length}, sectional ${tm.filter(x => x.kind === 'sectional').length})`)
}
