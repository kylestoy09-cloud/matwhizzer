import { createClient } from '@supabase/supabase-js'
import { schoolMatcher } from '../../src/lib/historySchools'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as any)
const { data: t } = await db.from('history_team_titles').select('kind, year, grp, champion')
const p = (t ?? []).filter(x => m.idOf(x.champion) === 309)
const years = new Set(p.map(x => x.year)), group = new Set(p.filter(x => x.kind === 'group').map(x => x.year))
const secOnly = [...years].filter(y => !group.has(y))
const stateNoSec = [...group].filter(y => !p.some(x => x.year === y && x.kind === 'sectional'))
console.log('Paulsboro title rows before', p.length, '→ years', years.size, '| state', group.size, '| sectional only', secOnly.length, '| state years with no sectional on file', stateNoSec.sort().join(','))
