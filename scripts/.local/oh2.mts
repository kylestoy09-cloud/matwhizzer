import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const id = 'd1421eca-fdc4-45c5-bccd-8d33e4d87c29'
const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class, round, wrestler1_name_raw, wrestler1_school_raw, wrestler2_name_raw, wrestler2_school_raw, result_type, source_format').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data!
for (const b of t) console.log(b.weight_class, b.round, `${b.wrestler1_name_raw} (${b.wrestler1_school_raw})`, 'vs', `${b.wrestler2_name_raw} (${b.wrestler2_school_raw})`, b.result_type, b.source_format)
const tid = t[0].in_season_tournament_id
console.log(JSON.stringify((await db.from('in_season_tournaments_girls').select('name, start_date, venue_name, source_format').eq('id', tid)).data))
const all = (await db.from('tournament_bouts_girls').select('wrestler1_name_raw, wrestler1_school_raw, wrestler2_name_raw, wrestler2_school_raw').eq('in_season_tournament_id', tid)).data!
const riv = new Set<string>(); for (const b of all) { if (/riverside/i.test(b.wrestler1_school_raw)) riv.add(b.wrestler1_name_raw); if (/riverside/i.test(b.wrestler2_school_raw)) riv.add(b.wrestler2_name_raw) }
console.log('Riverside wrestlers in that tournament:', [...riv])
console.log('school 214:', JSON.stringify((await db.from('schools').select('id, display_name, town, is_nj, section').eq('id', 214)).data))
console.log('Riverside 214 girls Track roster:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade').eq('school_id', 214).eq('gender', 'F')).data))
const others = (await db.from('wrestler_name_aliases').select('raw_name, wrestlers!inner(gender)').eq('school_id', 214).eq('wrestlers.gender', 'F')).data
console.log('girls with a Riverside alias:', JSON.stringify(others?.map((o: any) => o.raw_name)))
console.log('schools named like Riverside:', JSON.stringify((await db.from('schools').select('id, display_name, is_nj').ilike('display_name', '%riverside%')).data))
