import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const tours = new Map((await db.from('tournaments').select('id, name, season_id').eq('gender', 'F')).data!.map((t: any) => [t.id, `${t.name} ${t.season_id}`]))
for (const [f, l] of [['Ashley', 'Coronel'], ['Niah', ''], ['Kassandr', 'Lucero']]) {
  const ws = (await db.from('wrestlers').select('id, first_name, last_name, grade, created_at').eq('gender', 'F').eq('first_name', f).eq('last_name', l)).data ?? []
  for (const w of ws) {
    const e = (await db.from('tournament_entries').select('school_id, school_context_raw, tournament_id').eq('wrestler_id', w.id)).data ?? []
    const t = (await db.from('tournament_bouts_girls').select('wrestler1_id, wrestler1_school_id, wrestler2_school_id, wrestler1_name_raw, wrestler2_name_raw').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const d = (await db.from('dual_meet_matches_girls').select('wrestler_a_id, school_a_id, school_b_id, wrestler_a_name_raw, wrestler_b_name_raw').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? []
    const m = (await db.from('matches').select('id', { count: 'exact', head: true }).or(`winner_entry_id.in.(${e.map((x: any) => x.id ?? '0').join(',') || '0'})`)).count
    console.log(`"${w.first_name}|${w.last_name}" ${w.id.slice(0, 8)} created ${w.created_at.slice(0, 10)}`)
    console.log(`   postseason entries: ${e.map((x: any) => `${names.get(x.school_id)} (sheet: "${x.school_context_raw}") ${tours.get(x.tournament_id)}`).join('; ') || 'none'}`)
    console.log(`   tournament bouts: ${t.length} at ${[...new Set(t.map((b: any) => names.get(b.wrestler1_id === w.id ? b.wrestler1_school_id : b.wrestler2_school_id)))]} | names on sheets ${[...new Set(t.map((b: any) => b.wrestler1_id === w.id ? b.wrestler1_name_raw : b.wrestler2_name_raw))]}`)
    console.log(`   duals: ${d.length} | name links: ${al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`).join(', ') || 'none'}`)
  }
}
