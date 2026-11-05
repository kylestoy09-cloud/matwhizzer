import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const gsp = (await db.from('girls_school_profiles').select('school_id')).data!.map((x: any) => x.school_id)
const gs = new Set((await db.from('girls_schools').select('school_id')).data!.map((x: any) => x.school_id))
const extra = gsp.filter((id: number) => !gs.has(id))
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((x: any) => [x.id, x.display_name]))
const inact = new Set((await db.from('inactive_school_seasons').select('school_id').eq('gender', 'F')).data!.map((x: any) => x.school_id))
const ftours = (await db.from('tournaments').select('id').eq('gender', 'F')).data!.map((t: any) => t.id)
const rows: string[] = []
for (const id of extra) {
  const e = (await db.from('tournament_entries').select('id', { count: 'exact', head: true }).eq('school_id', id).in('tournament_id', ftours)).count
  const d = (await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).count
  const b = (await db.from('tournament_bouts_girls').select('id', { count: 'exact', head: true }).or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).count
  const p = (await db.from('power_points').select('*', { count: 'exact', head: true }).eq('school_id', id).eq('gender', 'F')).count
  const gd = (await db.from('girls_school_districts').select('*', { count: 'exact', head: true }).eq('school_id', id)).count
  if (e || d || b || p || gd) rows.push(`${id} ${names.get(id)}${inact.has(id) ? ' [inactive]' : ''}: entries ${e}, duals ${d}, bouts ${b}, PP ${p}, district rows ${gd}`)
}
console.log(`${extra.length} extra profiles; with girls data: ${rows.length}\n` + rows.join('\n'))
