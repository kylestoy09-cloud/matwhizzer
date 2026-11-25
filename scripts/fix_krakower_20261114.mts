// Steven Krakower, 2013 District 23 at 152: the export left his school blank on every row (Kyle 2026-11-14: "he went
// to st. rose"). St. Rose = school 1218 (Kyle's new school). Staged rows get the team; he gets a profile; the loaded
// 2013 District 23 (tournament 242) gets his entry, his skipped quarterfinal win, and his two losses re-attached.
import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const chk = <T,>(r: { data: T | null; error: { message: string } | null }, w: string): T => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as T }
const T = 242, SCHOOL = 1218, TEAM = 'St. Rose'
const wc = chk(await db.from('weight_classes').select('id').eq('gender', 'M').eq('weight', 152).single(), 'wc') as { id: number }
const before = {
  entrants: chk(await db.from('playoff_history_entrants').select('*').eq('gender', 'M').eq('season_id', 2013).ilike('name', '%krakower%'), 'e'),
  bouts: chk(await db.from('playoff_history_bouts').select('*').eq('gender', 'M').eq('season_id', 2013).or('winner.ilike.%krakower%,loser.ilike.%krakower%'), 'b'),
  matches: chk(await db.from('matches').select('*').eq('tournament_id', T).eq('weight_class_id', wc.id), 'm'),
}
fs.writeFileSync('docs/migrations/backups/20261114_krakower.json', JSON.stringify(before, null, 1))
// staging
chk(await db.from('playoff_history_entrants').update({ team: TEAM }).eq('gender', 'M').eq('season_id', 2013).ilike('name', '%krakower%').select('id'), 'stage entrant')
chk(await db.from('playoff_history_bouts').update({ winner_team: TEAM }).eq('gender', 'M').eq('season_id', 2013).ilike('winner', '%krakower%').select('id'), 'stage w')
chk(await db.from('playoff_history_bouts').update({ loser_team: TEAM }).eq('gender', 'M').eq('season_id', 2013).ilike('loser', '%krakower%').select('id'), 'stage l')
// profile + entry
const w = chk(await db.from('wrestlers').insert({ first_name: 'Steven', last_name: 'Krakower', gender: 'M', is_active: false, is_oos: false }).select('id').single(), 'profile') as { id: string }
chk(await db.from('playoff_history_profiles').insert({ wrestler_id: w.id, gender: 'M', created: true, first_season: 2013, last_season: 2013 }).select('wrestler_id'), 'profile row')
chk(await db.from('playoff_history_entrants').update({ wrestler_id: w.id }).eq('gender', 'M').eq('season_id', 2013).ilike('name', '%krakower%').select('id'), 'stage wid')
const e = chk(await db.from('tournament_entries').insert({ tournament_id: T, wrestler_id: w.id, school_id: SCHOOL, weight_class_id: wc.id, school_context_raw: TEAM }).select('id').single(), 'entry') as { id: string }
// bouts: the QF he won (skipped at load), his SF and 3rd-place losses (loaded against an empty slot)
const ent = async (last: string) => { const r = chk(await db.from('tournament_entries').select('id, wrestlers!inner(last_name)').eq('tournament_id', T).eq('weight_class_id', wc.id).eq('wrestlers.last_name', last), last) as { id: string }[]; return r[0]?.id }
const dowd = await ent('Dowd'), rug = await ent('Ruggiero'), scott = await ent('Scott')
const qf = before.bouts.find((b: any) => /krakower/i.test(b.winner))!
chk(await db.from('matches').insert({ tournament_id: T, weight_class_id: wc.id, bracket_side: qf.side, round: qf.round, winner_entry_id: e.id, loser_entry_id: dowd, win_type: qf.win_type, winner_score: qf.winner_score, loser_score: qf.loser_score, fall_time_seconds: qf.fall_seconds, score_raw: qf.result_raw, validated: true }).select('id'), 'qf')
let fixed = 0
for (const m of before.matches as any[]) if (!m.loser_entry_id && (m.winner_entry_id === rug || m.winner_entry_id === scott)) { chk(await db.from('matches').update({ loser_entry_id: e.id }).eq('id', m.id).select('id'), 'loss'); fixed++ }
console.log('profile', w.id, '| entry', e.id, '| QF added (over Dowd:', !!dowd, ') | losses re-attached', fixed)
