import { createClient } from '@supabase/supabase-js'
import { readYear } from '../../src/lib/playoffHistory/readFiles'
import { schoolMatcher } from '../../src/lib/historySchools'
import { pickSchool } from '../../src/lib/playoffHistory/schoolNames'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const m = await schoolMatcher(db as any)
const teams = new Set<string>()
for (let y = 2013; y <= 2020; y++) for (const e of readYear(y).events) for (const r of e.rows) for (const t of [r.winnerTeam, r.loserTeam]) if (t) teams.add(t)
// every auto match whose school name isn't simply the export's name: for a read-through
const rows = [...teams].map(t => ({ t, p: pickSchool(t, m) })).filter(r => r.p.decision === 'auto')
const diff = rows.filter(r => r.t.toLowerCase().replace(/[^a-z]/g, '') !== m.school.get(r.p.school_id!)!.display_name.toLowerCase().replace(/[^a-z]/g, ''))
console.log('auto', rows.length, '| name differs from the school', diff.length)
for (const r of diff.sort((a, b) => a.t.localeCompare(b.t))) console.log(`  ${r.t} → ${m.school.get(r.p.school_id!)!.display_name}`)
