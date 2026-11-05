import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const tours = new Map((await db.from('tournaments').select('id, season_id').eq('gender', 'F')).data!.map((t: any) => [t.id, t]))
const ist = new Map((await db.from('in_season_tournaments_girls').select('id, season, name')).data!.map((t: any) => [t.id, t]))
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
for (const id of [277, 301, 94, 359, 124, 36]) {
  const out = new Map<string, Set<string>>()
  const add = (w: string | null, src: string) => { if (!w) return; (out.get(w) ?? out.set(w, new Set()).get(w)!).add(src) }
  for (const x of (await db.from('tournament_entries').select('wrestler_id, tournament_id').eq('school_id', id)).data ?? []) { const t = tours.get(x.tournament_id); if (t) add(x.wrestler_id, `post ${t.season_id}`) }
  for (const b of (await db.from('tournament_bouts_girls').select('in_season_tournament_id, wrestler1_id, wrestler2_id, wrestler1_school_id, wrestler1_name_raw, wrestler2_name_raw').or(`wrestler1_school_id.eq.${id},wrestler2_school_id.eq.${id}`)).data ?? []) add(b.wrestler1_school_id === id ? b.wrestler1_id : b.wrestler2_id, `tourn ${ist.get(b.in_season_tournament_id)?.season}`)
  const dmRows = (await db.from('dual_meet_matches_girls').select('wrestler_a_id, wrestler_b_id, school_a_id, wrestler_a_name_raw, wrestler_b_name_raw, dual_meets_girls(season_id)').or(`school_a_id.eq.${id},school_b_id.eq.${id}`)).data ?? []
  let unlinked = 0
  for (const b of dmRows as any[]) { const w = b.school_a_id === id ? b.wrestler_a_id : b.wrestler_b_id; if (!w) unlinked++; add(w, `dual ${b.dual_meets_girls?.season_id}`) }
  const ws = out.size ? (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active, is_oos, gender').in('id', [...out.keys()])).data ?? [] : []
  const al = (await db.from('wrestler_name_aliases').select('wrestler_id, wrestlers!inner(gender)').eq('school_id', id).eq('wrestlers.gender', 'F')).data ?? []
  const ro = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, status, wrestler_id').eq('school_id', id).eq('gender', 'F').eq('season_id', 2026)).data ?? []
  const dm = (await db.from('dual_meets_girls').select('id', { count: 'exact', head: true }).eq('season_id', 2026).or(`team1_school_id.eq.${id},team2_school_id.eq.${id}`)).count
  console.log(`\n${id} ${names.get(id)} | girls aliases ${al.length} | Track roster rows ${ro.length} (${[...new Set(ro.map((r: any) => r.status))]}) | 2025-26 duals ${dm} | dual bout sides with no profile ${unlinked}`)
  for (const w of ws) console.log(`   ${w.first_name} ${w.last_name} ${w.gender} grade ${w.grade ?? '-'} active ${w.is_active} oos ${w.is_oos} | ${[...out.get(w.id)!].join(', ')}`)
  if (ro.length) console.log('   roster:', ro.map((r: any) => `${r.first_name_raw} ${r.last_name_raw} [${r.status}${r.wrestler_id ? ' linked' : ''}]`).join(', '))
}
