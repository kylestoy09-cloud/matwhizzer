import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const REFS: [string, string][] = [['dual_meet_matches_girls', 'wrestler_a_id'], ['dual_meet_matches_girls', 'wrestler_b_id'], ['tournament_bouts_girls', 'wrestler1_id'], ['tournament_bouts_girls', 'wrestler2_id'], ['tournament_entries', 'wrestler_id'], ['roster_grade_import', 'wrestler_id'], ['wrestler_name_aliases', 'wrestler_id'], ['wrestler_school_history', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id']]
for (const last of ['Quishpe', 'Abdalate', 'Vazquez', 'Carire', 'Cruz']) {
  const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, graduation_year, main_weight, is_stub, created_at').eq('gender', 'F').ilike('last_name', `%${last}%`)).data!
  for (const w of ws) {
    if (last === 'Vazquez' && !/jaylenn/i.test(w.first_name)) continue
    if (last === 'Cruz' && !/andrea/i.test(w.first_name)) continue
    const c: string[] = []
    for (const [t, col] of REFS) { const n = (await db.from(t).select('*', { count: 'exact', head: true }).eq(col, w.id)).count; if (n) c.push(`${t.replace('_girls', '')}.${col} ${n}`) }
    const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? [].map((a: any) => `"${a.raw_name}"@${names.get(a.school_id)}`)
    const da = (await db.from('dual_meet_matches_girls').select('weight_class, wrestler_a_id, school_a_id, school_b_id, dual_meets_girls(meet_date)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const tb = (await db.from('tournament_bouts_girls').select('wrestler1_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const hist = [...new Set([...da.map((d: any) => d.wrestler_a_id === w.id ? d.school_a_id : d.school_b_id), ...tb.map((b: any) => b.wrestler1_id === w.id ? b.wrestler1_school_id : b.wrestler2_school_id)])].map(id => names.get(id))
    const dates = da.map((d: any) => d.dual_meets_girls?.meet_date).filter(Boolean).sort()
    console.log(`${w.first_name} | ${w.last_name} | ${w.id.slice(0, 8)} | grade ${w.grade} grad ${w.graduation_year} wt ${w.main_weight} stub ${w.is_stub} created ${w.created_at.slice(0, 10)}\n   schools: ${hist.join(', ')} | aliases: ${al.join(', ')}\n   refs: ${c.join(', ')}\n   duals ${dates.length}: ${dates[0] ?? ''}..${dates.at(-1) ?? ''} wts ${[...new Set(da.map((d: any) => d.weight_class))].join('/')}`)
  }
}
