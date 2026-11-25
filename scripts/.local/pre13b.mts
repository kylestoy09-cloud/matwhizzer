import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
for (const [f, l] of [['Bryant','Clagon'],['Antrez','Clagon'],['Robert','Trombetta'],['Richard','Lewis'],['Joseph','Ghione'],['Zachary','Hertling'],['Nicholas','Zak'],['Salvatore','Profaci']]) {
  const { data } = await db.from('tournament_entries').select('school:schools(display_name), weight_class:weight_classes(weight), tournament:tournaments!inner(season_id, tournament_type, gender), wrestler:wrestlers!inner(first_name,last_name)').eq('wrestler.first_name', f).eq('wrestler.last_name', l).eq('tournament.gender', 'M').lte('tournament.season_id', 2016)
  console.log(f, l, (data ?? []).map((d: any) => `${d.tournament.season_id} ${d.tournament.tournament_type} ${d.weight_class?.weight} ${d.school?.display_name}`).join(' | '))
}
