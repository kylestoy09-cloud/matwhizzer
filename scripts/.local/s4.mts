import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const info = async (id: string) => {
  const w = (await db.from('wrestlers').select('first_name, last_name, grade, is_active').eq('id', id)).data![0]
  const e = (await db.from('tournament_entries').select('tournament_id, school_id').eq('wrestler_id', id)).data ?? []
  const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, wrestler1_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []
  const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id, wrestler_a_id, school_a_id, school_b_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', id)).data ?? []
  const schools = new Set([...e.map((x: any) => x.school_id), ...t.map((x: any) => x.wrestler1_id === id ? x.wrestler1_school_id : x.wrestler2_school_id), ...d.map((x: any) => x.wrestler_a_id === id ? x.school_a_id : x.school_b_id)])
  return { s: `"${w.first_name}|${w.last_name}" ${w.grade ?? '-'} active ${w.is_active} | ${e.length} entries, ${t.length} tourn, ${d.length} duals at ${[...schools].map(x => names.get(x)).join('/')} | links ${al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`).join(', ') || 'none'}`, ev: new Set([...e.map((x: any) => 'E' + x.tournament_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...d.map((x: any) => 'D' + x.dual_meet_id)]) }
}
for (const [bad, good] of [['3c99f426-0000', '16ad31b8-f792-4ee9-b319-187c864896ac'], ['7938aa62', '29fb3c2a-b65b-4195-a96c-d03320e53ca0']]) {
  const all = (await db.from('wrestlers').select('id').eq('gender', 'F').limit(6000)).data!
  const badId = all.find((w: any) => w.id.startsWith(bad.slice(0, 8)))!.id
  const a = await info(badId), b = await info(good)
  console.log(`BROKEN ${badId.slice(0, 8)} ${a.s}\nGOOD   ${good.slice(0, 8)} ${b.s}\n   shared events: ${[...a.ev].filter(x => b.ev.has(x)).length}`)
}
