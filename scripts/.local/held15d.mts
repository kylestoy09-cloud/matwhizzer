import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const all = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active').eq('gender', 'M').limit(20000)).data!
console.log('== sheet names on the group-A profiles\' 2025-26 bouts')
for (const p of ['4975137d', '52409afa', 'd7de8506', 'da811bba', 'b0046216']) {
  const w = all.find((x: any) => x.id.startsWith(p))!
  const t = (await db.from('tournament_bouts').select('wrestler1_id, wrestler1_name_raw, wrestler2_name_raw, wrestler1_school_raw, wrestler2_school_raw, created_at').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
  const d = (await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_a_name_raw, wrestler_b_name_raw, created_at, dual_meets(season_id)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
  const raws = new Set([...t.map((b: any) => b.wrestler1_id === w.id ? b.wrestler1_name_raw : b.wrestler2_name_raw), ...d.map((b: any) => b.wrestler_a_id === w.id ? b.wrestler_a_name_raw : b.wrestler_b_name_raw)])
  const when = new Set([...t, ...d].map((b: any) => b.created_at.slice(0, 10)))
  console.log(`  ${w.first_name} ${w.last_name}: sheet names ${JSON.stringify([...raws])}, imported ${[...when].join(', ')}`)
}
console.log('== do the 2025-26 wrestlers already have their own profile?')
for (const [f, l] of [['Benjamin', 'Almonte'], ['Adrian', 'Leon'], ['Paul', 'Kim'], ['Romeo', 'Roman']]) console.log(`  ${f} ${l}:`, JSON.stringify(all.filter((w: any) => w.first_name === f && w.last_name === l).map((w: any) => `${w.id.slice(0, 8)} ${w.grade ?? '-'} active ${w.is_active}`)))
console.log('== Track rows for the four younger wrestlers')
for (const [f, l, s] of [['Benjamin', 'Almonte', 'Edison'], ['Adrian', 'Leon', 'Hackensack'], ['Paul', 'Kim', 'Demarest'], ['Romeo', 'Roman', 'Old Bridge']]) {
  const sid = [...names].find(([, n]) => n === s)![0]
  console.log(`  ${f} ${l} @ ${s}:`, JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status').eq('school_id', sid).eq('gender', 'M').ilike('last_name_raw', l)).data))
}
const nes = [...names].find(([, n]) => n === 'Newark East Side')![0]
console.log('  Newark East Side Cruz rows:', JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status').eq('school_id', nes).eq('gender', 'M').ilike('last_name_raw', '%cruz%')).data))
