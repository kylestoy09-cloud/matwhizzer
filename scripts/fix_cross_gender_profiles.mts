// Girls don't wrestle on boys teams in NJ (Kyle, 2026-11-02), so a girl's profile in a boys
// dual is a data error. The integrity check found 4 profiles, 6 boys-dual bout sides:
//   Alexis Santiago (Asbury Park): every bout is a boys dual and Asbury Park's boys Track roster
//     lists him (Fr) — the profile is male, marked F. Gender corrected.
//   Riley Allen, Addison Collins (Peddie), Gabriel Grant (East Orange): a boy merged into a girl
//     of the same name by the old name-only import match. The boys-dual side moves to a new male
//     profile at that school (out-of-state when the school is). Approved 2026-11-02.
// Dry run unless --apply. Backup: docs/migrations/backups/20261102_cross_gender_profiles_before.json
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const apply = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const GENDER_FIX = '5e1ee2c3', SPLIT = ['469aba49', '5ae82076', '031c6969']
const NAMES: Record<string, [string, string]> = { '5e1ee2c3': ['Alexis', 'Santiago'], '469aba49': ['Riley', 'Allen'], '5ae82076': ['Addison', 'Collins'], '031c6969': ['Gabriel', 'Grant'] }
const find = async (prefix: string) => {
  const [f, l] = NAMES[prefix]
  const d = chk(await db.from('wrestlers').select('*').eq('first_name', f).eq('last_name', l), 'w').filter(w => w.id.startsWith(prefix))
  if (d.length !== 1) throw new Error(prefix); return d[0]
}
const backup: any = { gender_fix: null, splits: [] }

const g = await find(GENDER_FIX)
const gb = chk(await db.from('dual_meet_matches_girls').select('id').or(`wrestler_a_id.eq.${g.id},wrestler_b_id.eq.${g.id}`), 'gb').length
const gt = chk(await db.from('tournament_bouts_girls').select('id').or(`wrestler1_id.eq.${g.id},wrestler2_id.eq.${g.id}`), 'gt').length
if (gb || gt) throw new Error(`${g.first_name} ${g.last_name} has girls bouts; not a pure gender fix`)
backup.gender_fix = g
console.log(`gender: ${g.first_name} ${g.last_name} F -> M (girls bouts: 0)`)

const sch = new Map(chk(await db.from('schools').select('id, display_name, is_nj'), 's').map(s => [s.id, s]))
for (const p of SPLIT) {
  const w = await find(p)
  const sides: any[] = []
  for (const side of ['a', 'b']) for (const b of chk(await db.from('dual_meet_matches').select('*').eq(`wrestler_${side}_id`, w.id), 'b')) sides.push({ side, bout: b, school: b[`school_${side}_id`] })
  if (!sides.length || new Set(sides.map(s => s.school)).size !== 1) throw new Error(`${w.first_name} ${w.last_name}: expected boys bouts at one school`)
  const school = sch.get(sides[0].school)
  backup.splits.push({ wrestler: w, bouts: sides.map(s => s.bout) })
  console.log(`split: ${w.first_name} ${w.last_name} — ${sides.length} boys-dual side(s) at ${school.display_name} -> new male profile${school.is_nj === false ? ' (out-of-state)' : ''}`)
  if (!apply) continue
  const { data: nw, error } = await db.from('wrestlers').insert({ first_name: w.first_name, last_name: w.last_name, gender: 'M', is_oos: school.is_nj === false }).select('id').single()
  if (error) throw error
  for (const s of sides) {
    const patch: any = { [`wrestler_${s.side}_id`]: nw!.id }
    if (s.bout.winner_id === w.id) patch.winner_id = nw!.id
    chk(await db.from('dual_meet_matches').update(patch).eq('id', s.bout.id).eq(`wrestler_${s.side}_id`, w.id).select('id'), 'move')
  }
  chk(await db.from('wrestler_name_aliases').insert({ raw_name: `${w.first_name} ${w.last_name}`, school_id: school.id, wrestler_id: nw!.id }).select('id'), 'alias')
  console.log(`   -> ${nw!.id}`)
}
if (apply) {
  fs.writeFileSync('docs/migrations/backups/20261102_cross_gender_profiles_before.json', JSON.stringify(backup, null, 1))
  chk(await db.from('wrestlers').update({ gender: 'M' }).eq('id', g.id).eq('gender', 'F').select('id'), 'gender')
  console.log('applied; backup written')
}
