import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { girlsRosterGradeCounts, boysRosterGradeCounts } from '../../src/lib/rosterGrades'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_name_links_backfill_added.json', 'utf8'))
let ok = 0; for (const r of b.added) { const x = (await db.from('wrestler_name_aliases').select('wrestler_id').eq('raw_name', r.raw_name).eq('school_id', r.school_id)).data?.[0]; if (x?.wrestler_id === r.wrestler_id) ok++ }
console.log(`links present and pointing at the right wrestler: ${ok}/${b.added.length}`)
const g = await girlsRosterGradeCounts(db as never, [301, 36, 113])
console.log('Timber Creek / Pequannock / Hanover Park now:', JSON.stringify([...g.bySchool]))
const m = await boysRosterGradeCounts(db as never, [269, 219, 248, 99, 206])
console.log('boys Gloucester Catholic / Jackson Liberty / Donovan / Weehawken / Ranney now:', JSON.stringify([...m.bySchool]))
