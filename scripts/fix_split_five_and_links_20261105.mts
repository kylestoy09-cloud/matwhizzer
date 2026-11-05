// (2026-11-05, Kyle) Corrects scripts/fix_held_boys_20261105.mts part A for five boys. The
// profiles are 2024-25 seniors who graduated (Somerville, Clearview, Wayne Valley, Cedar Creek,
// Ridgefield Park); the 2025-26 wrestlers with those names at Ramapo, Raritan, Lakewood, Newark
// East Side and Bloomfield are different people. That script activated the seniors' profiles and
// gave them the new wrestlers' Track grades. This splits them: a new profile for each 2025-26
// wrestler (Track grade, active) gets his 2025-26 bouts and entries at that school, the Track row
// and the name links there; the senior's profile goes back to inactive with its own grade.
// Also repoints three name links that named the wrong boy (each pair is two wrestlers at two
// schools): "Joseph Paretti"@Elmwood Park, "Alexander Reyes"@North Brunswick, "Ryan Kim"@Fort Lee.
//   npx tsx --tsconfig tsconfig.json scripts/fix_split_five_and_links_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }
const APPLY = process.argv.includes('--apply')
const held = JSON.parse(fs.readFileSync('docs/migrations/backups/20261105_held_boys_before.json', 'utf8'))
const sid = async (n: string) => chk(await db.from('schools').select('id').eq('display_name', n), n)[0].id
const ist26 = new Set(chk(await db.from('in_season_tournaments').select('id').eq('season', '2025-26'), 'ist').map((x: any) => x.id))
const post26 = new Set(chk(await db.from('tournaments').select('id').eq('gender', 'M').eq('season_id', 2026), 't').map((x: any) => x.id))
const backup: Record<string, unknown> = {}, tasks: (() => Promise<void>)[] = [], out: string[] = []

const FIVE: [string, string, string, string, string | null][] = [
  ['4975137d', 'Ramapo', 'Sean', "O'Neill", null], ['52409afa', 'Raritan', 'Anthony', 'Morales', null], ['d7de8506', 'Lakewood', 'Alexander', 'Perez', null],
  ['da811bba', 'Newark East Side', 'Antonio', 'Cruz', 'Jr'], ['b0046216', 'Bloomfield', 'Derek', 'Rodriguez', null],
]
for (const [p, school, first, last, suffix] of FIVE) {
  const key = Object.keys(held).find(k => k.startsWith(`A ${p}`))!
  const before = held[key].wrestler, track = held[key].roster
  const id = before.id, s = await sid(school)
  const dm = chk(await db.from('dual_meet_matches').select('*, dual_meets!inner(season_id)').or(`wrestler_a_id.eq.${id},wrestler_b_id.eq.${id}`).eq('dual_meets.season_id', 2026), 'dm')
    .filter((b: any) => (b.wrestler_a_id === id ? b.school_a_id : b.school_b_id) === s)
  const tb = chk(await db.from('tournament_bouts').select('*').or(`wrestler1_id.eq.${id},wrestler2_id.eq.${id}`), 'tb')
    .filter((b: any) => ist26.has(b.in_season_tournament_id) && (b.wrestler1_id === id ? b.wrestler1_school_id : b.wrestler2_school_id) === s)
  const te = chk(await db.from('tournament_entries').select('*').eq('wrestler_id', id).eq('school_id', s), 'te').filter((e: any) => post26.has(e.tournament_id))
  const al = chk(await db.from('wrestler_name_aliases').select('*').eq('wrestler_id', id).eq('school_id', s), 'al')
  const others = (chk(await db.from('tournament_entries').select('id, tournament_id, school_id').eq('wrestler_id', id), 'all')).filter((e: any) => !te.some((x: any) => x.id === e.id))
  backup[id] = { before, now: chk(await db.from('wrestlers').select('*').eq('id', id), 'w')[0], dm: dm.map(({ dual_meets, ...r }: any) => r), tb, te, al, track }
  out.push(`${first} ${last}${suffix ? ' ' + suffix : ''} @ ${school}: new profile (${track.grade}, active) gets ${dm.length} duals, ${tb.length} tournament bouts, ${te.length} entries, ${al.length} name links, the Track row | senior's profile keeps ${others.length} other entries, back to inactive, grade ${before.grade}`)
  tasks.push(async () => {
    const now = new Date().toISOString()
    const n = chk(await db.from('wrestlers').insert({ first_name: first, last_name: last, suffix, gender: 'M', is_oos: false, is_active: true, grade: track.grade, grade_confirmed_source: 'roster_upload', grade_confirmed_at: now }).select('id'), 'new')[0].id
    backup[`${id} new`] = n
    for (const b of dm) chk(await db.from('dual_meet_matches').update({ ...(b.wrestler_a_id === id ? { wrestler_a_id: n } : { wrestler_b_id: n }), ...(b.winner_id === id ? { winner_id: n } : {}) }).eq('id', b.id).select('id'), 'dm')
    for (const b of tb) chk(await db.from('tournament_bouts').update(b.wrestler1_id === id ? { wrestler1_id: n } : { wrestler2_id: n }).eq('id', b.id).select('id'), 'tb')
    for (const e of te) chk(await db.from('tournament_entries').update({ wrestler_id: n }).eq('id', e.id).select('id'), 'te')
    for (const a of al) chk(await db.from('wrestler_name_aliases').update({ wrestler_id: n }).eq('id', a.id).select('id'), 'al')
    chk(await db.from('roster_grade_import').update({ wrestler_id: n }).eq('id', track.id).select('id'), 'track')
    chk(await db.from('wrestlers').update({ is_active: before.is_active, grade: before.grade, grade_confirmed_source: before.grade_confirmed_source, grade_confirmed_at: before.grade_confirmed_at }).eq('id', id).select('id'), 'revert')
    for (const t of ['wrestler_hammer_scores', 'wrestler_match_score_log', 'lb_rs_wrestler', 'lb_ps_wrestler', 'snapshot_streak_state']) chk(await db.from(t).delete().eq('wrestler_id', id).select(t.startsWith('lb_') ? 'wrestler_id' : '*'), t)
  })
}
const LINKS: [string, string, string, string][] = [['Joseph Paretti', 'Elmwood Park', 'bc2c6a27', '89411bde'], ['Alexander Reyes', 'North Brunswick', 'b2cd53bd', '773f3915'], ['Ryan Kim', 'Fort Lee', 'b2731464', 'ce3511b1']]
const boys = chk(await db.from('wrestlers').select('id').eq('gender', 'M').limit(20000), 'b')
for (const [raw, school, wrongPre, rightPre] of LINKS) {
  const s = await sid(school), a = chk(await db.from('wrestler_name_aliases').select('*').eq('raw_name', raw).eq('school_id', s), 'a')[0]
  const right = boys.find((w: any) => w.id.startsWith(rightPre)).id
  if (!a?.wrestler_id.startsWith(wrongPre)) throw new Error(`${raw}@${school}: link is not on ${wrongPre}`)
  backup[`link ${raw}@${school}`] = a
  out.push(`link "${raw}" @ ${school}: ${wrongPre} → ${rightPre} (the boy who wrestles for ${school})`)
  tasks.push(async () => { chk(await db.from('wrestler_name_aliases').update({ wrestler_id: right }).eq('id', a.id).select('id'), 'link') })
}
for (const l of out) console.log(l)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_split_five_and_links_before.json', JSON.stringify(backup, null, 1))
for (const t of tasks) await t()
fs.writeFileSync('docs/migrations/backups/20261105_split_five_and_links_before.json', JSON.stringify(backup, null, 1))
console.log('APPLIED')
