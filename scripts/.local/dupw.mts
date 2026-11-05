import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const evs = new Map<string, Set<string>>()
for (const [label, q, re] of [['Herrera', 'last_name.ilike.%herrera%', /evian/i], ['Walpla', 'last_name.ilike.%walp%', /./], ['Nova', 'last_name.ilike.%nova%', /arian/i], ['Rodriguez', 'last_name.ilike.%rodriguez%', /daniel/i], ['Bennet', 'last_name.ilike.%benn%t%', /peyton/i]] as const) {
  console.log(`\n== ${label}`)
  const ws = ((await db.from('wrestlers').select('id, first_name, last_name, grade, main_weight, created_at').eq('gender', 'F').or(q)).data ?? []).filter((w: any) => re.test(w.first_name))
  for (const w of ws) {
    const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? []
    const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id, weight_class, dual_meets_girls(meet_date)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const e = (await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', w.id)).data ?? []
    const r = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status').eq('wrestler_id', w.id)).data ?? []
    evs.set(w.id, new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...e.map((x: any) => 'E' + x.tournament_id)]))
    const dates = d.map((x: any) => x.dual_meets_girls?.meet_date).filter(Boolean).sort()
    console.log(`${w.id} "${w.first_name} | ${w.last_name}" ${w.grade ?? '-'} wt ${w.main_weight} created ${w.created_at.slice(0, 10)} @ ${[...new Set(al.map((a: any) => names.get(a.school_id)))].join(', ')}\n   duals ${d.length} wts ${[...new Set(d.map((x: any) => x.weight_class))]} ${dates[0] ?? ''}..${dates.at(-1) ?? ''} | tourn ${t.length} wts ${[...new Set(t.map((x: any) => x.weight_class))]} | entries ${e.length} | roster ${r.map((x: any) => `${x.first_name_raw} ${x.last_name_raw} (${x.grade})`).join('; ')}`)
  }
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    const both = [...evs.get(ws[i].id)!].filter(x => evs.get(ws[j].id)!.has(x))
    if (both.length) console.log(`   SHARED ${ws[i].first_name} ${ws[i].last_name} & ${ws[j].first_name} ${ws[j].last_name}: ${both.length} events`)
  }
}
