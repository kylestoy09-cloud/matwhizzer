import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const [f, l, school] of [['Ben', 'Cloos', 'Toms River North'], ['Nicholas', 'Roche', 'Hoboken'], ['Gustavo', 'Nocelotl', 'Kearny']]) {
  const ws = (await db.from('wrestlers').select('id, grade, is_active').eq('gender', 'M').ilike('first_name', f).ilike('last_name', l)).data!
  for (const w of ws) { const al = (await db.from('wrestler_name_aliases').select('school_id').eq('wrestler_id', w.id)).data!.map((a: any) => names.get(a.school_id)); const e = (await db.from('tournament_entries').select('tournaments(name, season_id)').eq('wrestler_id', w.id)).data!.map((x: any) => `${x.tournaments.season_id} ${x.tournaments.name}`); console.log(f, l, w.id.slice(0, 8), w.grade, 'links', JSON.stringify(al), 'entries', JSON.stringify(e)) }
  if (!ws.length) console.log(f, l, 'NO PROFILE')
}
