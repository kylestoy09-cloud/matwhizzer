// Remove the bracket filler entries (not wrestlers) found 2026-11-02: postseason entries with no
// school whose only bouts are forfeit losses ("Forefit A", Rutgers coaches' names in D21, girls
// D9 filler names, one D5 entry pointing at a profile that doesn't exist). Approved by Kyle.
//   npx tsx --tsconfig tsconfig.json scripts/remove_placeholder_entries.mts            (dry run)
//   npx tsx --tsconfig tsconfig.json scripts/remove_placeholder_entries.mts --apply
// A real wrestler's forfeit win over filler becomes a bye (loser NULL, win_type BYE), as the
// bracket would show an empty slot. Duplicate copies of a bout and filler-vs-filler bouts are
// deleted. Then the entries, and the filler profiles once nothing else points at them.
// Team points for every affected tournament are compared before and after.
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }

const entries = chk(await db.from('tournament_entries').select('*, tournaments(id, name, season_id, gender, tournament_type)').is('school_id', null), 'entries')
const ids = entries.map(e => e.id), wids = [...new Set(entries.map(e => e.wrestler_id))]
// guard: every one is a filler entry (no school, no other entries, no bouts anywhere else)
for (const e of entries) {
  if (e.school_context_raw) throw new Error(`entry ${e.id} has school text — not filler`)
  const others = chk(await db.from('tournament_entries').select('id').eq('wrestler_id', e.wrestler_id), 'others').filter(x => !ids.includes(x.id))
  if (others.length) throw new Error(`wrestler ${e.wrestler_id} has other entries`)
}
const matches = chk(await db.from('matches').select('*').or(`winner_entry_id.in.(${ids}),loser_entry_id.in.(${ids})`), 'matches')
if (matches.some(m => m.win_type !== 'FORF')) throw new Error('a filler bout is not a forfeit')
const profiles = chk(await db.from('wrestlers').select('*').in('id', wids), 'profiles')

// team points before, per affected tournament
const tourn = new Map(entries.map(e => [e.tournaments.id, e.tournaments]))
async function teamScores() {
  const out: Record<string, number> = {}
  for (const t of tourn.values()) {
    const d = Number(t.name.match(/District (\d+)/)![1])
    const rows = chk(await db.rpc('district_team_score', { p_district: d, p_gender: t.gender, p_season: t.season_id }), 'team score')
    for (const r of rows) out[`${t.name} s${t.season_id}|${r.school_name}`] = Number(r.total_points)
  }
  return out
}
const before = await teamScores()

const seen = new Set<string>(), plan: { m: any; action: 'bye' | 'delete'; why: string }[] = []
for (const m of matches) {
  const key = `${m.tournament_id}|${m.weight_class_id}|${m.round}|${m.winner_entry_id}|${m.loser_entry_id}`
  if (seen.has(key)) { plan.push({ m, action: 'delete', why: 'duplicate copy' }); continue }
  seen.add(key)
  if (ids.includes(m.winner_entry_id)) plan.push({ m, action: 'delete', why: 'filler vs filler' })
  else plan.push({ m, action: 'bye', why: 'forfeit win over filler' })
}
for (const p of plan) console.log(p.action.padEnd(6), p.m.round.padEnd(4), p.why)
console.log(`${entries.length} entries, ${profiles.length} profiles (of ${wids.length} ids), ${plan.filter(p => p.action === 'bye').length} byes, ${plan.filter(p => p.action === 'delete').length} bouts deleted`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }

fs.writeFileSync('docs/migrations/backups/20261102_placeholder_entries_before.json', JSON.stringify({ entries, matches, profiles, team_scores_before: before }, null, 1))
for (const p of plan) {
  if (p.action === 'delete') chk(await db.from('matches').delete().eq('id', p.m.id).select('id'), 'delete match')
  else chk(await db.from('matches').update({ loser_entry_id: null, win_type: 'BYE' }).eq('id', p.m.id).select('id'), 'bye')
}
chk(await db.from('tournament_entries').delete().in('id', ids).select('id'), 'delete entries')
for (const w of profiles) {
  const r = await db.from('wrestlers').delete().eq('id', w.id).select('id')
  if (r.error) { console.log(`STOP: profile ${w.first_name} ${w.last_name} still referenced: ${r.error.message}`); process.exit(1) }
}
const after = await teamScores()
const keys = new Set([...Object.keys(before), ...Object.keys(after)])
const diffs = [...keys].filter(k => before[k] !== after[k]).map(k => `${k}: ${before[k]} → ${after[k]}`)
console.log(diffs.length ? `TEAM SCORE CHANGES:\n${diffs.join('\n')}` : 'team scores unchanged')
console.log('APPLIED')
