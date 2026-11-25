import { readFileSync } from 'fs'
const { createClient } = await import('@supabase/supabase-js')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const plan = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const boys = plan.find((p: any) => p.gender === 'M')
const x = boys.people.find((x: any) => x.name === 'Edward George' && x.state === 'NJ')
const w = x.wrestlers.find((w: any) => w.id === x.suggestion.id)
const { data: pl } = await db.from('boys_hub_placements').select('prospect_id').eq('event_id', boys.event_id).eq('name_listed', 'Edward George').single()
const { data: other } = await db.from('boys_prospects').select('id').eq('wrestler_id', w.id).maybeSingle()
if (other) throw new Error('another prospect already linked')
const { error } = await db.from('boys_prospects').update({ wrestler_id: w.id, class_year: w.class_year }).eq('id', pl!.prospect_id)
if (error) throw error
const { data: after } = await db.from('boys_prospects').select('first_name, last_name, state, wrestler_id').eq('id', pl!.prospect_id).single()
console.log('linked', after, '→', w.name, w.schools)
// totals
for (const t of ['boys_hub_placements', 'girls_hub_placements', 'mixed_hub_placements', 'boys_prospects', 'girls_prospects', 'mixed_prospects']) {
  const { count } = await db.from(t).select('*', { count: 'exact', head: true }); console.log(t, count)
}
const { data: nj } = await db.from('mixed_prospects').select('first_name, last_name, class_year').eq('state', 'NJ').order('class_year')
console.log('NJ middle school / youth prospects:', (nj ?? []).map(p => `${p.first_name} ${p.last_name} '${String(p.class_year).slice(2)}`).join(', '))
