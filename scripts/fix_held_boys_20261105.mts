// The 15 boys held back from the 2026-11-05 reactivation (approved by Kyle). Kyle: Sean O'Neill,
// Anthony Morales, Alexander Perez, Antonio Cruz and Derek Rodriguez wrestled in 2025-26 and are in
// the 2026 Track roster; Lucas Almonte, Jonathan Leon, Joel Kim and Aiden Roman graduated in 2025.
// The 2026-09-14 rule (2024-25 district entry + none in 2025-26 = graduated/inactive) is not used
// as evidence here.
//   A. activate, grade and Track row from the exact-name Track row at the 2025-26 school
//   B. the 2025-26 bouts on the graduated brothers' profiles belong to the wrestlers the sheets
//      name: Benjamin Almonte, Adrian Leon, Paul Kim (existing profiles), Romeo Roman (created)
//   C. Lerrod Smalls' one 2025-26 bout is for NY Military Academy (out of state): its own profile
//   npx tsx --tsconfig tsconfig.json scripts/fix_held_boys_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const APPLY = process.argv.includes('--apply')
const key = (s: string) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '')
const schools = chk(await db.from('schools').select('id, display_name, is_nj'), 's')
const sid = (n: string) => schools.find((s: any) => s.display_name === n).id
const boys = chk(await db.from('wrestlers').select('*').eq('gender', 'M').limit(20000), 'w')
const byPre = (p: string) => boys.find((w: any) => w.id.startsWith(p))
const backup: Record<string, unknown> = {}
const now = new Date().toISOString()
const out: string[] = []

// A — profile prefix, school of the 2025-26 bouts, Track row first|last as stored
const A: [string, string, string, string][] = [
  ['4975137d', 'Ramapo', 'Sean', 'O`Neill'], ['52409afa', 'Raritan', 'Anthony', 'Morales'], ['d7de8506', 'Lakewood', 'Alexander', 'Perez'],
  ['da811bba', 'Newark East Side', 'Antonio Cruz', 'Jr'], ['b0046216', 'Bloomfield', 'Derek', 'Rodriguez'],
  ['55a3a9ad', 'Clifton', 'Ryan', 'Rodriguez'], ['6474eb87', 'Manchester Township', 'Jayden', 'Johnson'], ['9d99e85b', 'Howell', 'Rocco', 'Randazzo'],
]
const tasks: (() => Promise<void>)[] = []
for (const [p, school, f, l] of A) {
  const w = byPre(p), s = sid(school)
  const rows = chk(await db.from('roster_grade_import').select('*').eq('school_id', s).eq('gender', 'M').eq('first_name_raw', f).eq('last_name_raw', l), 'ro')
  if (rows.length !== 1 || rows[0].wrestler_id) throw new Error(`${f} ${l}: expected one unmatched Track row, got ${rows.length}`)
  backup[`A ${w.id}`] = { wrestler: w, roster: rows[0] }
  out.push(`A  ${w.first_name} ${w.last_name} (${p}) @ ${school}: active ${w.is_active}→true, grade ${w.grade ?? '-'}→${rows[0].grade}, Track row linked`)
  tasks.push(async () => {
    chk(await db.from('wrestlers').update({ is_active: true, grade: rows[0].grade, grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).eq('id', w.id).select('id'), 'A w')
    chk(await db.from('roster_grade_import').update({ wrestler_id: w.id, status: 'confirmed', confirmed_at: now, confirmed_by: 'kyle.stoy09@gmail.com' }).eq('id', rows[0].id).is('wrestler_id', null).select('id'), 'A ro')
  })
}

// B / C — move bouts whose sheet names another wrestler
async function moveBouts(fromPre: string, sheetName: string, toId: string | null, create: null | { first: string; last: string; grade: string | null; is_oos: boolean; school: string; trackRow?: any }) {
  const from = byPre(fromPre)
  const tb = chk(await db.from('tournament_bouts').select('*').or(`wrestler1_id.eq.${from.id},wrestler2_id.eq.${from.id}`), 'tb').filter((b: any) => (b.wrestler1_id === from.id ? b.wrestler1_name_raw : b.wrestler2_name_raw) === sheetName)
  const dm = chk(await db.from('dual_meet_matches').select('*').or(`wrestler_a_id.eq.${from.id},wrestler_b_id.eq.${from.id}`), 'dm').filter((b: any) => (b.wrestler_a_id === from.id ? b.wrestler_a_name_raw : b.wrestler_b_name_raw) === sheetName)
  backup[`move ${from.id} ${sheetName}`] = { tb, dm }
  out.push(`${create ? 'C' : 'B'}  ${tb.length + dm.length} bout(s) "${sheetName}" from ${from.first_name} ${from.last_name} → ${toId ? `existing ${byPre(toId.slice(0, 8))?.first_name} ${byPre(toId.slice(0, 8))?.last_name} (${toId.slice(0, 8)})` : `new profile ${create!.first} ${create!.last}${create!.is_oos ? ' (out of state)' : ''}${create!.grade ? `, ${create!.grade}` : ''}`}`)
  tasks.push(async () => {
    let to = toId
    if (!to) {
      to = chk(await db.from('wrestlers').insert({ first_name: create!.first, last_name: create!.last, gender: 'M', is_oos: create!.is_oos, grade: create!.grade, grade_confirmed_source: create!.grade ? 'roster_upload' : null, grade_confirmed_at: create!.grade ? now : null }).select('id'), 'create')[0].id
      backup[`created ${sheetName}`] = to
      if (create!.trackRow) chk(await db.from('roster_grade_import').update({ wrestler_id: to, status: 'confirmed', confirmed_at: now, confirmed_by: 'kyle.stoy09@gmail.com' }).eq('id', create!.trackRow.id).is('wrestler_id', null).select('id'), 'ro')
    }
    for (const b of tb) chk(await db.from('tournament_bouts').update(b.wrestler1_id === from.id ? { wrestler1_id: to } : { wrestler2_id: to }).eq('id', b.id).select('id'), 'tb')
    for (const b of dm) chk(await db.from('dual_meet_matches').update({ ...(b.wrestler_a_id === from.id ? { wrestler_a_id: to } : { wrestler_b_id: to }), ...(b.winner_id === from.id ? { winner_id: to } : {}) }).eq('id', b.id).select('id'), 'dm')
    const sch = (create?.school) ?? (tb[0] ? (tb[0].wrestler1_id === from.id ? tb[0].wrestler1_school_raw : tb[0].wrestler2_school_raw) : null)
    void sch
    // name link for the bouts' name at their school, pointing at the right wrestler
    const pairs = [...tb.map((b: any) => b.wrestler1_id === from.id ? b.wrestler1_school_id : b.wrestler2_school_id), ...dm.map((b: any) => b.wrestler_a_id === from.id ? b.school_a_id : b.school_b_id)]
    for (const s of new Set(pairs)) if (s) {
      await db.from('wrestler_name_aliases').delete().eq('raw_name', sheetName).eq('school_id', s).eq('wrestler_id', from.id)
      await db.from('wrestler_name_aliases').upsert({ raw_name: sheetName, school_id: s, wrestler_id: to }, { onConflict: 'raw_name,school_id', ignoreDuplicates: true })
    }
  })
}
const find = (f: string, l: string) => { const x = boys.filter((w: any) => w.first_name === f && w.last_name === l); if (x.length !== 1) throw new Error(`${f} ${l}: ${x.length} profiles`); return x[0].id }
await moveBouts('347ed397', 'Benjamin Almonte', find('Benjamin', 'Almonte'), null)
await moveBouts('ac5b80ce', 'Adrian Leon', find('Adrian', 'Leon'), null)
await moveBouts('fad47eaa', 'Paul Kim', find('Paul', 'Kim'), null)
const romeoRow = chk(await db.from('roster_grade_import').select('*').eq('school_id', sid('Old Bridge')).eq('gender', 'M').eq('first_name_raw', 'Romeo').eq('last_name_raw', 'Roman'), 'rr')
if (romeoRow.length !== 1 || romeoRow[0].wrestler_id) throw new Error('Romeo Track row')
await moveBouts('78adb9e0', 'Romeo Roman', null, { first: 'Romeo', last: 'Roman', grade: romeoRow[0].grade, is_oos: false, school: 'Old Bridge', trackRow: romeoRow[0] })
await moveBouts('562f1d5d', 'Lerrod Smalls', null, { first: 'Lerrod', last: 'Smalls', grade: null, is_oos: true, school: 'NY Military Academy' })

for (const l of out) console.log(l)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_held_boys_before.json', JSON.stringify(backup, null, 1))
for (const t of tasks) await t()
console.log('APPLIED')
