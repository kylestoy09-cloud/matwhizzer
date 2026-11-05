import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: c } = await db.from('individual_ranking_completion').select('week_id, gender, weight_class, stage, stage_entity').limit(1)
if (!c?.length) { console.log('no published rankings yet'); process.exit(0) }
const x = c[0]
const r = await (await fetch(`https://matwhizzer.com/api/rankings/individual?gender=${x.gender}&week_id=${x.week_id}&weight_class=${x.weight_class}&stage=${x.stage}&stage_entity=${x.stage_entity}`)).json()
console.log('rankings rows', r.rankings?.length, 'with school id', r.rankings?.filter((w: any) => w.school_id).length, 'with logo', r.rankings?.filter((w: any) => w.school_logo).length, JSON.stringify(r.rankings?.[0]))
