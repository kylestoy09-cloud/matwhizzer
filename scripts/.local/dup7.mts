import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const key = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')
const ev = async (id: string) => { const d = (await db.from('dual_meet_matches_girls').select('dual_meet_id').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`)).data ?? []; const t = (await db.from('tournament_bouts_girls').select('in_season_tournament_id').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`)).data ?? []; const e = (await db.from('tournament_entries').select('tournament_id').eq('wrestler_id', id)).data ?? []; return { n: `${d.length}d ${t.length}t ${e.length}e`, s: new Set([...d.map((x: any) => 'D' + x.dual_meet_id), ...t.map((x: any) => 'T' + x.in_season_tournament_id), ...e.map((x: any) => 'E' + x.tournament_id)]) } }
for (const [full, sname] of [['Aaliyah Gordon Burke', 'Irvington'], ['Evellyn De Castro Barbosa', 'Delran'], ['Hunter Sedita Lott', 'West Orange'], ['Mariana Cepeda-Morel', 'Carteret'], ['Sabrina Jean Baptiste', 'Montclair'], ['Tiffany Guanoquiza Restrepo', 'Belleville']]) {
  const sid = [...names].find(([, n]) => n === sname)![0]
  const ro = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, wrestler_id').eq('school_id', sid).eq('gender', 'F').eq('season_id', 2026)).data!.find((r: any) => key(`${r.first_name_raw} ${r.last_name_raw}`) === key(full))!
  const cands = (await db.from('wrestlers').select('id, first_name, last_name, grade').eq('gender', 'F').ilike('last_name', `%${full.split(' ').at(-1)}%`)).data!.filter((w: any) => key(`${w.first_name} ${w.last_name}`) === key(full))
  const rows = []
  for (const w of cands) { const al = (await db.from('wrestler_name_aliases').select('raw_name, school_id').eq('wrestler_id', w.id)).data ?? []; const e = await ev(w.id); rows.push({ w, al, e }) }
  const shared = rows.length === 2 ? [...rows[0].e.s].filter(x => rows[1].e.s.has(x)).length : '?'
  console.log(`${full} @ ${sname} | roster ${ro.first_name_raw}|${ro.last_name_raw} ${ro.grade} → ${ro.wrestler_id?.slice(0, 8)} | shared events ${shared}`)
  for (const r of rows) console.log(`   ${r.w.id.slice(0, 8)} "${r.w.first_name} | ${r.w.last_name}" ${r.w.grade ?? '-'} ${r.e.n} aliases ${r.al.map((a: any) => `${a.raw_name}@${names.get(a.school_id)}`).join(', ') || '-'}`)
}
