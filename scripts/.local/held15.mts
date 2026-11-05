import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const names = new Map((await db.from('schools').select('id, display_name')).data!.map((r: any) => [r.id, r.display_name]))
const hold = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_reactivate_boys_before.json', 'utf8')).hold as string[]
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const all = (await db.from('wrestlers').select('id, first_name, last_name, grade, is_active').eq('gender', 'M').limit(20000)).data!
const tS = new Map((await db.from('tournaments').select('id, season_id, name').eq('gender', 'M')).data!.map((t: any) => [t.id, t]))
const istS = new Map((await db.from('in_season_tournaments').select('id, season, name')).data!.map((t: any) => [t.id, t]))
for (const h of hold) {
  const nm = h.split(':')[0]
  const ws = all.filter((w: any) => key(w.first_name + w.last_name) === key(nm))
  console.log(`\n${h}`)
  for (const w of ws) {
    const e = (await db.from('tournament_entries').select('tournament_id, school_id, grade_label').eq('wrestler_id', w.id)).data ?? []
    const t = (await db.from('tournament_bouts').select('in_season_tournament_id, weight_class, wrestler1_id, wrestler1_school_id, wrestler2_school_id').or(`wrestler1_id.eq.${w.id},wrestler2_id.eq.${w.id}`)).data ?? []
    const d = (await db.from('dual_meet_matches').select('weight_class, wrestler_a_id, school_a_id, school_b_id, dual_meets(season_id)').or(`wrestler_a_id.eq.${w.id},wrestler_b_id.eq.${w.id}`)).data ?? []
    const ro = (await db.from('roster_grade_import').select('first_name_raw, last_name_raw, grade, school_id').eq('wrestler_id', w.id)).data ?? []
    const post = e.map((x: any) => { const tt = tS.get(x.tournament_id); return `${tt?.season_id} ${names.get(x.school_id)} (${x.grade_label ?? '-'})` })
    const tsum = Object.entries(t.reduce((m: any, b: any) => { const s = istS.get(b.in_season_tournament_id)?.season; const sc = names.get(b.wrestler1_id === w.id ? b.wrestler1_school_id : b.wrestler2_school_id); const k = `${s} ${sc} ${b.weight_class}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))
    const dsum = Object.entries(d.reduce((m: any, b: any) => { const sc = names.get(b.wrestler_a_id === w.id ? b.school_a_id : b.school_b_id); const k = `${b.dual_meets?.season_id} ${sc} ${b.weight_class}`; m[k] = (m[k] ?? 0) + 1; return m }, {}))
    console.log(`   ${w.id.slice(0, 8)} "${w.first_name} ${w.last_name}" grade ${w.grade ?? '-'} active ${w.is_active}`)
    console.log(`      postseason: ${post.join('; ') || '-'}`)
    console.log(`      tournaments: ${tsum.map(([k, n]) => `${k}lb ×${n}`).join('; ') || '-'} | duals: ${dsum.map(([k, n]) => `${k}lb ×${n}`).join('; ') || '-'}`)
    console.log(`      Track roster: ${ro.map((r: any) => `${r.grade} @ ${names.get(r.school_id)}`).join(', ') || '-'}`)
  }
}
