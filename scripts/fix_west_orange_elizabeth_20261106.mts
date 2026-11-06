// Girls 2025-26 West Orange v Elizabeth 2/13: TrackWrestling's two pages disagree on the 165 bout
// (West Orange's: MD 13-5, final 34-33; Elizabeth's: Dec 9-6, final 33-33). The stored bouts are
// West Orange's version (34-33) but the final was stored as 33-33. Kyle, 2026-11-06: West Orange won
// on the results, so the final is 34-33.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const ID = '6e5e6e2b-f629-4e19-bff7-7fe0976ec855'
const before = (await db.from('dual_meets_girls').select('*').eq('id', ID)).data!
if (before.length !== 1 || before[0].team1_score !== 33 || before[0].team2_score !== 33) throw new Error('unexpected: ' + JSON.stringify(before))
fs.writeFileSync('docs/migrations/backups/20261106_west_orange_elizabeth_before.json', JSON.stringify(before, null, 1))
const r = await db.from('dual_meets_girls').update({ team1_score: 34 }).eq('id', ID).eq('team1_score', 33).select('team1_school_name_raw, team1_score, team2_score, team2_school_name_raw')
console.log(r.error?.message ?? JSON.stringify(r.data))
