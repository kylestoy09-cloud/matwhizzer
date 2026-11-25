import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const wc = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.id, r.weight]))
const ids = ['e3c97685', '8eb02bca', 'b81a6c9d', '12690e41', '92a836ab', '36ba8d6f']
const all = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active, created_at, is_oos').eq('gender', 'M').or('first_name.eq.Charles,first_name.eq.Terrance,first_name.eq.Arjun,first_name.ilike.Pinhao%')).data!
for (const p of ids) { const w = all.find((x: any) => x.id.startsWith(p)); if (!w) { console.log(p, 'not found'); continue }
  const e = (await db.from('tournament_entries').select('id, school_id, weight_class_id, tournaments(name, season_id)').eq('wrestler_id', w.id)).data as any[]
  const d = (await db.from('dual_meet_matches').select('school_a_id, school_b_id, wrestler_a_id, dual_meets(season_id)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data as any[]
  const tb = (await db.from('tournament_bouts').select('wrestler1_id, wrestler1_school_id, wrestler2_school_id, in_season_tournaments(season)').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data as any[]
  const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data as any[]
  const rg = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, school_id').eq('wrestler_id', w.id)).data as any[]
  const ds: Record<string, number> = {}; for (const x of d) { const k = `${x.dual_meets?.season_id}@${names.get(x.wrestler_a_id === w.id ? x.school_a_id : x.school_b_id)}`; ds[k] = (ds[k] ?? 0) + 1 }
  const ts: Record<string, number> = {}; for (const x of tb) { const k = `${x.in_season_tournaments?.season}@${names.get(x.wrestler1_id === w.id ? x.wrestler1_school_id : x.wrestler2_school_id)}`; ts[k] = (ts[k] ?? 0) + 1 }
  console.log(`${w.id.slice(0, 8)} "${w.first_name}|${w.last_name}" grade ${w.grade} active ${w.is_active} created ${w.created_at.slice(0, 10)}\n   entries ${JSON.stringify(e.map(x => `${x.tournaments.season_id} ${x.tournaments.name} ${names.get(x.school_id)} ${wc.get(x.weight_class_id)} [${x.id.slice(0, 8)}]`))}\n   duals ${JSON.stringify(ds)} tourn ${JSON.stringify(ts)}\n   links ${JSON.stringify(al.map(a => `${a.raw_name}@${names.get(a.school_id)}`))} track ${JSON.stringify(rg.map(r => `${r.first_name_raw} ${r.last_name_raw} ${r.grade}@${names.get(r.school_id)}`))}`)
}
