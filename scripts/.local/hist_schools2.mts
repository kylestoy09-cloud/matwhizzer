import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { schoolMatcher } from '../../src/lib/historySchools'
import { pickSchool } from '../../src/lib/playoffHistory/schoolNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as any)
const teams = new Map<string, number>()
for (let y = 2013; y <= 2020; y++) for (const e of readYear(y).events) for (const r of e.rows) for (const t of [r.winnerTeam, r.loserTeam]) if (t) teams.set(t, (teams.get(t) ?? 0) + 1)
const res = [...teams.keys()].map(t => ({ t, p: pickSchool(t, m) }))
const c = { auto: 0, placeholder: 0, pending: 0 }; for (const r of res) c[r.p.decision]++
console.log(teams.size, 'names', c)
console.log('PENDING with a suggestion:'); for (const r of res.filter(r => r.p.decision === 'pending' && r.p.suggestion)) console.log(`  ${r.t} → ${m.school.get(r.p.suggestion!)?.display_name}${r.p.coop ? ' (co-op)' : ''}`)
console.log('PENDING, no suggestion:', res.filter(r => r.p.decision === 'pending' && !r.p.suggestion).map(r => r.t).sort().join('; '))
// sanity: auto matches whose cleaned forms differ a lot (spot check)
console.log('AUTO via expansion (sample):', res.filter(r => r.p.decision === 'auto' && r.p.via !== r.t).slice(0, 40).map(r => `${r.t} → ${m.school.get(r.p.school_id!)?.display_name}`).join('; '))
