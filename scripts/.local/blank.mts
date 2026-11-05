import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const want = ['Donovan Catholic', 'Gloucester Catholic', 'Jackson Liberty', 'Ranney', 'Weehawken']
const sch = (await db.from('schools').select('id, display_name, is_nj').in('display_name', want)).data!
const ist = (await db.from('in_season_tournaments').select('id').eq('season', '2025-26')).data!.map((x: any) => x.id)
for (const s of sch) {
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender, is_active, is_oos, first_name)').eq('school_id', s.id).eq('wrestlers.gender', 'M')).data ?? []
  const counted = al.filter((a: any) => a.wrestlers.is_active && !a.wrestlers.is_oos && a.wrestlers.first_name !== 'Unknown').length
  const d = (await db.from('dual_meets').select('id', { count: 'exact', head: true }).eq('gender', 'M').eq('season_id', 2026).or(`team1_school_id.eq.${s.id},team2_school_id.eq.${s.id}`)).count
  const dm = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id, school_a_id, school_b_id').or(`school_a_id.eq.${s.id},school_b_id.eq.${s.id}`).limit(5000)).data ?? []
  const ids = new Set(dm.map((b: any) => b.school_a_id === s.id ? b.wrestler_a_id : b.wrestler_b_id).filter(Boolean))
  const tb = (await db.from('tournament_bouts').select('wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_school_id.eq.${s.id},wrestler2_school_id.eq.${s.id}`).limit(5000)).data ?? []
  for (const b of tb as any[]) { const w = b.wrestler1_school_id === s.id ? b.wrestler1_id : b.wrestler2_id; if (w) ids.add(w) }
  const e = (await db.from('tournament_entries').select('wrestler_id, tournaments!inner(gender)').eq('school_id', s.id).eq('tournaments.gender', 'M')).data ?? []
  for (const x of e as any[]) if (x.wrestler_id) ids.add(x.wrestler_id)
  const ws = ids.size ? (await db.from('wrestlers').select('id, is_active, is_oos, gender, first_name').in('id', [...ids])).data ?? [] : []
  const ro = (await db.from('roster_grade_import').select('status').eq('school_id', s.id).eq('gender', 'M').eq('season_id', 2026)).data ?? []
  const inBoys = (await db.from('boys_schools').select('school_id').eq('school_id', s.id)).data?.length
  console.log(`${s.id} ${s.display_name} nj=${s.is_nj} boys_program=${inBoys} | aliases ${al.length} (counted ${counted}) | 2025-26 duals ${d} | wrestlers in any bout/entry ${ids.size} (active ${ws.filter((w: any) => w.is_active).length}, oos ${ws.filter((w: any) => w.is_oos).length}, unknown ${ws.filter((w: any) => w.first_name === 'Unknown').length}) | Track roster rows ${ro.length}`)
}
