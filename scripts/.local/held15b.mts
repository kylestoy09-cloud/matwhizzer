import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const wc = new Map((await db.from('weight_classes').select('id, weight')).data!.map((r: any) => [r.id, r.weight]))
const all = (await db.from('wrestlers').select('*').eq('gender', 'M').limit(20000)).data!
const byPre = (p: string) => all.find((w: any) => w.id.startsWith(p))
for (const p of ['55a3a9ad', '6474eb87', '9d99e85b']) { const w = byPre(p); console.log(`B ${w.first_name} ${w.last_name}: grade ${w.grade} source ${w.grade_confirmed_source} ${(w.grade_confirmed_at ?? '').slice(0, 10)} created ${w.created_at.slice(0, 10)}`) }
for (const [p, sid] of [['55a3a9ad', 'Clifton'], ['6474eb87', 'Manchester Township'], ['9d99e85b', 'Howell']] as const) {
  const w = byPre(p); const s = [...names].find(([, n]) => n === sid)![0]
  console.log(`   Track at ${sid}:`, JSON.stringify((await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status, wrestler_id').eq('school_id', s).eq('gender', 'M').ilike('last_name_raw', w.last_name)).data?.filter((r: any) => r.first_name_raw.toLowerCase().startsWith(w.first_name.toLowerCase().slice(0, 3)))))
}
for (const p of ['347ed397', '78adb9e0', 'ac5b80ce', 'fad47eaa']) {
  const w = byPre(p)
  const e = (await db.from('tournament_entries').select('weight_class_id, school_id, grade_label, tournaments(season_id, name)').eq('wrestler_id', w.id)).data ?? []
  const t = (await db.from('tournament_bouts').select('weight_class').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
  console.log(`C ${w.first_name} ${w.last_name}: 2024-25 ${e.map((x: any) => `${x.tournaments.name.replace("Boy_s ", '')} ${wc.get(x.weight_class_id)}lb ${x.grade_label}`).join(', ')} | 2025-26 weights ${[...new Set(t.map((x: any) => x.weight_class))]}`)
}
const k = byPre('b6399f5c')
const ro = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, status, wrestler_id, school_id').eq('gender', 'M').ilike('last_name_raw', 'Young').ilike('first_name_raw', 'K%')).data ?? []
for (const r of ro) { const o = all.find((w: any) => w.id === r.wrestler_id); console.log(`Kson Track row: ${r.first_name_raw} ${r.last_name_raw} ${r.grade} @ ${names.get(r.school_id)} → ${o ? `${o.first_name} ${o.last_name} ${o.id.slice(0, 8)} active ${o.is_active}` : 'unlinked'}`) }
