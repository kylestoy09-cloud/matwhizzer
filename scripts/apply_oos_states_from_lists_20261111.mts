// Applies the states from Kyle's TrackWrestling team lists (scripts/oos_states_from_lists_20261111.mts →
// docs/reviews/oos_states_from_lists.csv), 2026-11-11:
//   - "new" states from the lists, plus 8 found by hand under another printed name (Anderson Union, Lasalle College,
//     Oxford Area Hs, Morris, Norwich Sr HS, SLAM! NEVADA, Preston Hs, The St James Performance Academy)
//   - corrections: Boiling Springs SC (was PA), Mount de Sales Academy GA (was MD)
//   - splits, where one record held two schools: Christian Brothers College (MO) ← its 92 East Coast Catholic bouts are
//     Christian Brothers High School (TN); St. John Bosco Academy (CA) ← its 7 East Coast Catholic bouts are St. John
//     Bosco Academy (GA); Mountain View (VA) ← its 1 Doc Buchanan bout is Mountain View (CA). The bouts, and the name
//     links of wrestlers who only wrestled there, move to the new record.
//   - kept, list disagreed: Pitman CA (the Doc Buchanan list also has "Pitman, NJ", a TrackWrestling label), Roosevelt
//     CO and Canyon View AZ (their bouts print the tagged name; the list match had taken a namesake)
// Names get the tag ("Name (ST)"); the old name stays as an out-of-state alias. Backup of every changed row; --apply.
//   npx tsx --tsconfig tsconfig.json scripts/apply_oos_states_from_lists_20261111.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { withStateTag, addOosAlias } from '@/lib/oosSchool'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const csv = fs.readFileSync('docs/reviews/oos_states_from_lists.csv', 'utf8').trim().split('\n').slice(1).map(l => l.match(/"((?:[^"]|"")*)"/g)!.map(c => c.slice(1, -1).replace(/""/g, '"')))
const states = new Map<number, string>()
for (const [id, , , st, status] of csv) if (status === 'new') states.set(+id, st)
for (const [id, st] of [[980, 'CA'], [1174, 'WV'], [697, 'VA'], [643, 'PA'], [688, 'PA'], [665, 'IL'], [866, 'NV'], [723, 'NY'], [675, 'VA']] as const) states.set(id, st)
const RETAG: [number, string][] = [[1081, 'SC'], [1083, 'GA']]
const SPLITS = [
  { from: 506, tournament: '2026 East Coast Catholic Classic', table: 'tournament_bouts', newName: 'Christian Brothers', st: 'TN' },
  { from: 909, tournament: '2026 East Coast Catholic Classic', table: 'tournament_bouts', newName: 'St. John Bosco Academy', st: 'GA' },
  { from: 675, tournament: 'Doc Buchanan', table: 'tournament_bouts', newName: 'Mountain View', st: 'CA' },
]
const { data: schools } = await db.from('schools').select('id, display_name, is_nj')
const byId = new Map(schools!.map(s => [s.id, s]))
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '')
const plan: { id: number; from: string; to: string }[] = []
for (const [id, st] of [...states, ...RETAG]) {
  const s = byId.get(id)!; const cur = s.display_name.replace(/\s*\([A-Z]{2}\)$/, '').replace(/, [A-Z]{2}\)$/, ')')
  const to = withStateTag(cur, st); if (to !== s.display_name) plan.push({ id, from: s.display_name, to })
}
const clash = plan.filter(p => schools!.some(s => s.id !== p.id && norm(s.display_name) === norm(p.to)) || plan.some(q => q.id !== p.id && norm(q.to) === norm(p.to)))
console.log(`renames ${plan.length}; held for a name clash ${clash.length}: ${clash.map(c => `${c.id} ${c.from} → ${c.to}`).join('; ')}`)
// splits: which bouts move
const tid = new Map<string, string>(); for (const t of (await db.from('in_season_tournaments').select('id, name')).data ?? []) tid.set(t.name, t.id)
for (const sp of SPLITS) {
  const t = tid.get(sp.tournament)!
  const [a, b] = await Promise.all([1, 2].map(k => db.from(sp.table).select('id').eq('in_season_tournament_id', t).eq(`wrestler${k}_school_id`, sp.from)))
  console.log(`split ${byId.get(sp.from)!.display_name}: ${sp.tournament} bouts ${chk(a, 'a').length + chk(b, 'b').length} → ${withStateTag(sp.newName, sp.st)}`)
}
if (!APPLY) process.exit(0)
const backup: any = { renames: plan, splits: {} }
// 1. splits
for (const sp of SPLITS) {
  const t = tid.get(sp.tournament)!
  const name = withStateTag(sp.newName, sp.st)
  const created = chk(await db.from('schools').insert({ display_name: name, is_nj: false }).select('id'), 'create')[0].id as number
  const moved: any = { school: created, bouts: [], aliases: [] }
  const wrestlers = new Set<string>()
  for (const k of [1, 2]) {
    const rows = chk(await db.from(sp.table).select(`id, wrestler${k}_id`).eq('in_season_tournament_id', t).eq(`wrestler${k}_school_id`, sp.from), 'read')
    moved.bouts.push(...rows.map(r => ({ id: r.id, side: k })))
    for (const r of rows) if (r[`wrestler${k}_id`]) wrestlers.add(r[`wrestler${k}_id`])
    if (rows.length) chk(await db.from(sp.table).update({ [`wrestler${k}_school_id`]: created }).in('id', rows.map(r => r.id)).select('id'), 'move')
  }
  // name links of wrestlers whose only bouts at the old school were these
  for (const w of wrestlers) {
    const left = await Promise.all([1, 2].map(k => db.from(sp.table).select('id', { count: 'exact', head: true }).eq(`wrestler${k}_id`, w).eq(`wrestler${k}_school_id`, sp.from)))
    const duals = await db.from('dual_meet_matches').select('id', { count: 'exact', head: true }).or(`and(wrestler_a_id.eq.${w},school_a_id.eq.${sp.from}),and(wrestler_b_id.eq.${w},school_b_id.eq.${sp.from})`)
    if ((left[0].count ?? 0) + (left[1].count ?? 0) + (duals.count ?? 0) > 0) continue
    const al = chk(await db.from('wrestler_name_aliases').update({ school_id: created }).eq('wrestler_id', w).eq('school_id', sp.from).select('id'), 'alias')
    moved.aliases.push(...al.map(a => ({ id: a.id, wrestler: w })))
  }
  await addOosAlias(db, sp.newName === 'Christian Brothers' ? 'Christian Brothers High School' : sp.newName, created, name)
  backup.splits[`${sp.from}`] = moved
  console.log(`split → ${created} ${name}: ${moved.bouts.length} bouts, ${moved.aliases.length} name links`)
}
// 2. renames + aliases
const go = plan.filter(p => !clash.includes(p))
for (const p of go) {
  chk(await db.from('schools').update({ display_name: p.to }).eq('id', p.id).eq('display_name', p.from).select('id'), `rename ${p.id}`)
  await addOosAlias(db, p.from, p.id, p.to)
}
fs.writeFileSync('docs/migrations/backups/20261111_oos_states_from_lists_before.json', JSON.stringify(backup, null, 1))
console.log('renamed', go.length)
