import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const cases = [['Aaliyah Gordon Burke', 132, 'c591de74'], ['Hunter Sedita Lott', 109, '1ce3cd5e'], ['Sabrina Jean Baptiste', 105, '827bcaf2'], ['Tiffany Guanoquiza Restrepo', 100, '80aefb13']] as const
const ws = (await db.from('wrestlers').select('id, first_name, last_name').eq('gender', 'F').limit(5000)).data!
for (const [n, sid, pre] of cases) {
  const old = ws.find((w: any) => w.id.startsWith(pre))!
  const e = (await db.from('tournament_entries').select('school_id, created_at').eq('wrestler_id', old.id)).data ?? []
  const t = (await db.from('tournament_bouts_girls').select('wrestler1_id, wrestler1_school_id, wrestler2_school_id, created_at').or(`wrestler1_id.eq.${old.id},wrestler2_id.eq.${old.id}`)).data ?? []
  const d = (await db.from('dual_meet_matches_girls').select('wrestler_a_id, school_a_id, school_b_id, created_at').or(`wrestler_a_id.eq.${old.id},wrestler_b_id.eq.${old.id}`)).data ?? []
  const before = (x: any) => x.created_at < '2026-09-10T03:19'
  const sch = (rows: any[], f: (x: any) => number) => [...new Set(rows.filter(before).map(f))].map(i => `${i} ${names.get(i)}`)
  console.log(`${n}: review used school ${sid} (${names.get(sid)}) | existing profile's records before 9/10 03:19 — entries at ${JSON.stringify(sch(e, (x: any) => x.school_id))}, tournament bouts at ${JSON.stringify(sch(t, (x: any) => x.wrestler1_id === old.id ? x.wrestler1_school_id : x.wrestler2_school_id))}, duals at ${JSON.stringify(sch(d, (x: any) => x.wrestler_a_id === old.id ? x.school_a_id : x.school_b_id))}`)
}
