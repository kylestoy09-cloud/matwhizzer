// Removes the wrong FloWrestling event loaded as the 2012-13 boys District 24 (tournament 243) — Kyle 2026-11-14 ("yeah",
// with the counts in hand). Its wrestlers wrestled other weights at that week's Region 6 and none of Region 6's District 24
// qualifiers are in it; the Shore Conference archives' real District 24 champions match neither it nor 2013-14.
// Backup: docs/migrations/backups/20261114_district24_2013_wrong_event.json. Keeps the tournament row (the podium is added
// by scripts/district24_2013_podium_20261114.mts).
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const B = JSON.parse(readFileSync('docs/migrations/backups/20261114_district24_2013_wrong_event.json', 'utf8'))
const T = 243
const chk = <R,>(r: { data: R | null; error: { message: string } | null }, what: string) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data! }
const only: string[] = B.only_here_wrestlers.map((w: { id: string }) => w.id)
// guard: still exactly what was counted
const ents = chk(await db.from('tournament_entries').select('id').eq('tournament_id', T), 'entries')
if (ents.length !== 134) throw new Error(`entries now ${ents.length}, expected 134`)
const elsewhere = chk(await db.from('tournament_entries').select('wrestler_id').in('wrestler_id', only).neq('tournament_id', T), 'elsewhere')
if (elsewhere.length) throw new Error(`${elsewhere.length} entries elsewhere for the only-here profiles — stop`)
const n = (x: unknown[]) => x.length
console.log('matches', n(chk(await db.from('matches').delete().eq('tournament_id', T).select('id'), 'matches')))
console.log('team scores', n(chk(await db.from('precomputed_team_scores').delete().eq('tournament_id', T).select('id'), 'team scores')))
console.log('entries', n(chk(await db.from('tournament_entries').delete().eq('tournament_id', T).select('id'), 'entries')))
console.log('staged bouts', n(chk(await db.from('playoff_history_bouts').delete().eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24).select('id'), 'bouts')))
console.log('staged entrants', n(chk(await db.from('playoff_history_entrants').delete().eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24).select('id'), 'entrants')))
console.log('completeness', n(chk(await db.from('wrestler_completeness').delete().in('wrestler_id', only).select('wrestler_id'), 'completeness')))
console.log('history profiles', n(chk(await db.from('playoff_history_profiles').delete().in('wrestler_id', only).select('wrestler_id'), 'ph profiles')))
console.log('wrestlers', n(chk(await db.from('wrestlers').delete().in('id', only).select('id'), 'wrestlers')))
