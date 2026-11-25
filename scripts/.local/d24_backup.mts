import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const T = 243
const ents = (await db.from('tournament_entries').select('*').eq('tournament_id', T)).data ?? []
const wids = [...new Set(ents.map(e => e.wrestler_id))] as string[]
const other = new Set(((await db.from('tournament_entries').select('wrestler_id').in('wrestler_id', wids).neq('tournament_id', T)).data ?? []).map(r => r.wrestler_id))
const only = wids.filter(w => !other.has(w))
const out = {
  note: '2012-13 boys District 24 (tournament 243): the wrong FloWrestling event (Kyle 2026-11-14), backed up before removal',
  tournament: (await db.from('tournaments').select('*').eq('id', T)).data,
  tournament_entries: ents,
  matches: (await db.from('matches').select('*').eq('tournament_id', T)).data,
  precomputed_team_scores: (await db.from('precomputed_team_scores').select('*').eq('tournament_id', T)).data,
  playoff_history_entrants: (await db.from('playoff_history_entrants').select('*').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24)).data,
  playoff_history_bouts: (await db.from('playoff_history_bouts').select('*').eq('gender', 'M').eq('season_id', 2013).eq('kind', 'district').eq('num', 24)).data,
  only_here_wrestlers: (await db.from('wrestlers').select('*').in('id', only)).data,
  only_here_playoff_history_profiles: (await db.from('playoff_history_profiles').select('*').in('wrestler_id', only)).data,
  only_here_wrestler_completeness: (await db.from('wrestler_completeness').select('*').in('wrestler_id', only)).data,
}
const p = 'docs/migrations/backups/20261114_district24_2013_wrong_event.json'
writeFileSync(p, JSON.stringify(out, null, 1))
console.log(p, Object.entries(out).filter(([k]) => k !== 'note').map(([k, v]) => `${k} ${(v as unknown[] | null)?.length ?? 'ERR'}`).join(', '))
