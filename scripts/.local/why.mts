import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tS = new Map((await db.from('tournaments').select('id, season_id, tournament_type').eq('gender', 'M')).data!.map((t: any) => [t.id, t]))
for (const p of ['4975137d', '52409afa', 'd7de8506', 'da811bba', 'b0046216']) {
  const w = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active').eq('gender', 'M').like('id', `${p}%`)).data
  const id = (await db.from('wrestlers').select('id').eq('gender', 'M').limit(20000)).data!.map((x: any) => x.id).find((x: string) => x.startsWith(p))!
  const me = (await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', id)).data![0]
  const e = (await db.from('tournament_entries').select('tournament_id, grade_label').eq('wrestler_id', id)).data ?? []
  const dist = e.map((x: any) => tS.get(x.tournament_id)).filter((t: any) => t?.tournament_type === 'districts').map((t: any) => t.season_id)
  console.log(`${me.first_name} ${me.last_name}: grade ${me.grade}, active ${me.is_active} | district entries by season ${JSON.stringify(dist)}`)
  void w
}
