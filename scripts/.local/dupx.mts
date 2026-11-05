import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const evs = new Map<string, Set<string>>()
for (const [label, q] of [['Farber', 'last_name.ilike.%farber%'], ['Smith ?hori', 'first_name.ilike.%hori%'], ['Timonera', 'last_name.ilike.%timon%']] as const) {
  console.log(`\n== ${label}`)
  const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, main_weight, graduation_year, created_at').eq('gender', 'F').or(q)).data!
  for (const w of ws) {
    const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? []
    const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id, weight_class, dual_meets_girls(meet_date)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id, weight_class, round').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const e = (await db.from('tournament_entries').select('tournament_id, seed').eq('wrestler_id', w.id)).data ?? []
    const r = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status').eq('wrestler_id', w.id)).data ?? []
    const set = new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...e.map((x: any) => 'E' + x.tournament_id)])
    evs.set(w.id, set)
    const dates = d.map((x: any) => x.dual_meets_girls?.meet_date).filter(Boolean).sort()
    console.log(`${w.id} "${w.first_name} | ${w.last_name}" ${w.grade ?? '-'} wt ${w.main_weight} created ${w.created_at.slice(0, 10)}\n   at ${[...new Set(al.map((a: any) => names.get(a.school_id)))].join(', ')} | aliases ${al.map((a: any) => a.raw_name).join(', ')}\n   duals ${d.length} wts ${[...new Set(d.map((x: any) => x.weight_class))]} ${dates[0] ?? ''}..${dates.at(-1) ?? ''} | tourn ${t.length} wts ${[...new Set(t.map((x: any) => x.weight_class))]} | entries ${e.length} | roster ${r.map((x: any) => `${x.first_name_raw} ${x.last_name_raw} (${x.grade}, ${x.status})`).join('; ')}`)
  }
  for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
    const both = [...evs.get(ws[i].id)!].filter(x => evs.get(ws[j].id)!.has(x))
    if (both.length) console.log(`   SHARED ${ws[i].first_name} & ${ws[j].first_name}: ${both.join(', ')}`)
  }
}
const nutley = [...names].find(([, n]) => n === 'Nutley')?.[0]
const ros = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, weight_class, status, wrestler_id').eq('school_id', nutley).eq('gender', 'F').eq('season_id', 2026)).data ?? []
console.log('\nNutley Track roster (Timonera):', JSON.stringify(ros.filter((x: any) => /timon/i.test(x.last_name_raw))))
