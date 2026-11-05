import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const tS = new Map((await db.from('tournaments').select('id, season_id').eq('gender', 'M')).data!.map((t: any) => [t.id, t.season_id]))
const istS = new Map((await db.from('in_season_tournaments').select('id, season')).data!.map((t: any) => [t.id, t.season]))
for (const [f, l] of [['Ryan', 'Kim'], ['Joseph', 'Paretti'], ['Alexander', 'Reyes'], ['Dan', 'Vargas']]) {
  const ws = (await db.from('wrestlers').select('id, grade, is_active, is_oos').eq('gender', 'M').eq('first_name', f).eq('last_name', l)).data!
  console.log(`\n${f} ${l}: ${ws.length} profiles`)
  for (const w of ws) {
    const per: Record<string, number> = {}
    const put = (k: string) => (per[k] = (per[k] ?? 0) + 1)
    for (const e of (await db.from('tournament_entries').select('tournament_id, school_id, weight_class_id').eq('wrestler_id', w.id)).data ?? []) put(`post ${tS.get(e.tournament_id)} ${names.get(e.school_id)}`)
    for (const b of (await db.from('tournament_bouts').select('in_season_tournament_id, weight_class, wrestler1_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []) put(`tourn ${istS.get(b.in_season_tournament_id)} ${names.get(b.wrestler1_id === w.id ? b.wrestler1_school_id : b.wrestler2_school_id)} ${b.weight_class}`)
    for (const b of (await db.from('dual_meet_matches').select('weight_class, wrestler_a_id, school_a_id, school_b_id, dual_meets(season_id)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []) put(`dual ${(b as any).dual_meets?.season_id} ${names.get(b.wrestler_a_id === w.id ? b.school_a_id : b.school_b_id)} ${b.weight_class}`)
    console.log(`  ${w.id.slice(0, 8)} grade ${w.grade ?? '-'} active ${w.is_active} oos ${w.is_oos}: ${Object.entries(per).map(([k, n]) => `${k}×${n}`).join('; ')}`)
  }
}
