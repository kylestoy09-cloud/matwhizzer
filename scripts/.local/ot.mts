import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
console.log('inactive:', JSON.stringify((await db.from('inactive_school_seasons').select('*').in('school_id', [6, 314])).data))
console.log('school aliases:', JSON.stringify((await db.from('school_aliases').select('school_id, alias, notes').or('alias.ilike.%tappan%,alias.ilike.%demarest%')).data))
console.log('school_names:', JSON.stringify((await db.from('school_names').select('*').or('school_name.ilike.%tappan%,school_name.ilike.%demarest%')).data))
console.log('girls district rows:', JSON.stringify((await db.from('girls_school_districts').select('*').in('school_id', [6, 314])).data))
const { data: ts } = await db.from('tournaments').select('id').eq('gender', 'F').eq('season_id', 2026)
for (const sid of [6, 314]) {
  const { count: e } = await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('school_id', sid).in('tournament_id', ts!.map(t => t.id))
  const { data: dm } = await db.from('dual_meets_girls').select('id, meet_date').or(`team1_school_id.eq.${sid},team2_school_id.eq.${sid}`).eq('season_id', 2026)
  const { count: tb } = await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${sid},wrestler2_school_id.eq.${sid}`)
  const { count: al } = await db.from('wrestler_name_aliases').select('id', { count: 'exact', head: true }).eq('school_id', sid)
  console.log(`school ${sid}: girls 2025-26 postseason entries ${e}, girls 2025-26 dual meets ${dm!.length} (first ${dm!.map(d => d.meet_date).sort()[0]}), girls tournament bouts ${tb}, wrestler aliases (any gender) ${al}`)
}
