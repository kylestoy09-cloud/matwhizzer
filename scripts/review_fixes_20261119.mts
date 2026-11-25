// Fixes from the 2026-11-19 review (scripts/review_audit_20261119.mts):
//   1. the six college years scripts/college_unlink_bad_timing_20261119.mts sent back to review kept their wrestler_id
//      and an empty candidate list: the wrestler moves into the review card's candidate (as the weight audit does)
//   2. colors for the six colleges NJ girls were matched to after the color fill (colors_checked stays false)
//   3. Palmyra's NFHS link: https
//   4. Joseph Aragona and Adrian DeJesus each had two Offseason Hub prospects linked to them: one prospect each
//      (the placements move to the older one; the emptied prospect is deleted only when nothing points at it)
// Backs up what it changes (docs/migrations/backups/20261119_review_fixes.json). Dry run unless --apply.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const APPLY = process.argv.includes('--apply')
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data }
const backup: Record<string, unknown> = {}

// 1
const rev = chk(await db.from('boys_college_entries').select('*').eq('match_status', 'review').not('wrestler_id', 'is', null), 'rev') as any[]
backup.review = rev
const names = new Map((chk(await db.from('wrestlers').select('id, first_name, last_name').in('id', [...new Set(rev.map(r => r.wrestler_id))]), 'w') as any[]).map(w => [w.id, `${w.first_name} ${w.last_name}`]))
console.log('1. review rows:', rev.map(r => r.name).join(', '))
// 2
const COLORS: Record<string, [string, string]> = {
  'North Central (IL)': ['#C8102E', '#FFFFFF'], 'Northern Michigan': ['#046A38', '#FFC72C'], 'Alvernia': ['#7A0019', '#C99700'],
  'Western New England': ['#002D72', '#FFC72C'], 'Cumberlands': ['#8A1538', '#FFC72C'], 'Life': ['#003087', '#C99700'],
}
const cols = chk(await db.from('colleges').select('id, name, primary_color').in('name', Object.keys(COLORS)), 'c') as any[]
console.log('2. colleges:', cols.map(c => `${c.name}${c.primary_color ? ' (has colors)' : ''}`).join(', '))
// 3
const palmyra = chk(await db.from('boys_streaming_links').select('*').like('nfhs_url', 'http://%'), 'p') as any[]
console.log('3. http links:', palmyra.length)
// 4
const PAIRS: [number, number][] = [[10688, 12452], [11006, 11176]]   // [merge from, into] — the into keeps the older id where it has more
for (const [from, into] of PAIRS) {
  backup[`prospect ${from}`] = chk(await db.from('boys_prospects').select('*').eq('id', from), 'pr')
  backup[`placements ${from}`] = chk(await db.from('boys_hub_placements').select('*').eq('prospect_id', from), 'pl')
}
console.log('4. prospects:', PAIRS.map(([f, i]) => `${f} → ${i}`).join(', '))
if (!APPLY) { console.log('dry run'); process.exit(0) }
writeFileSync('docs/migrations/backups/20261119_review_fixes.json', JSON.stringify(backup, null, 1))
for (const r of rev) chk(await db.from('boys_college_entries').update({ wrestler_id: null, match_note: JSON.stringify({ note: JSON.parse(r.match_note ?? '{}').note ?? 'check', candidates: [{ wrestler_id: r.wrestler_id, name: names.get(r.wrestler_id) ?? '', schools: '', hs: '', gap: '', why: 'the earlier match' }] }) }).eq('id', r.id).select('id'), 'rev upd')
for (const c of cols) if (!c.primary_color) chk(await db.from('colleges').update({ primary_color: COLORS[c.name][0], secondary_color: COLORS[c.name][1] }).eq('id', c.id).select('id'), 'col')
for (const p of palmyra) chk(await db.from('boys_streaming_links').update({ nfhs_url: p.nfhs_url.replace(/^http:/, 'https:') }).eq('school_id', p.school_id).eq('season_id', p.season_id).select('school_id'), 'pal')
for (const [from, into] of PAIRS) {
  chk(await db.from('boys_hub_placements').update({ prospect_id: into }).eq('prospect_id', from).select('id'), 'move')
  let left = 0
  for (const [t, c] of [['boys_hub_placements', 'prospect_id'], ['boys_hub_bouts', 'winner_prospect_id'], ['boys_hub_bouts', 'loser_prospect_id']]) { const { count } = await db.from(t).select('id', { count: 'exact', head: true }).eq(c, from); left += count ?? 0 }
  if (left) { console.log(`prospect ${from}: ${left} references left — kept`); continue }
  const d = await db.from('boys_prospects').delete().eq('id', from).select('id')
  console.log(d.error ? `prospect ${from}: ${d.error.message} — kept` : `prospect ${from} merged into ${into}`)
}
console.log('applied')
