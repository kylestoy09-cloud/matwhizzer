// Kyle 2026-11-16: "you can make the hidden season visible" — switch on every loaded Playoff History season
// (boys 2013-2024, girls 2019-2024), as the Playoff History tool's switch does. Backup first.
// Usage: npx tsx --env-file=.env.local scripts/publish_history_seasons_20261116.mts [--apply]
import { writeFileSync } from 'node:fs'
import { createSupabaseAdmin } from '../src/lib/supabase/service'
const db = createSupabaseAdmin()
const apply = process.argv.includes('--apply')
const { data: rows, error } = await db.from('season_gender_state').select('*').eq('stage', 'history').order('gender').order('season_id')
if (error) throw new Error(error.message)
const { data: st } = await db.from('playoff_history_seasons').select('season_id, gender, status')
const loaded = new Set((st ?? []).filter(s => s.status === 'loaded').map(s => `${s.gender}|${s.season_id}`))
const todo = (rows ?? []).filter(r => !r.history_public && loaded.has(`${r.gender}|${r.season_id}`))
const notLoaded = (rows ?? []).filter(r => !loaded.has(`${r.gender}|${r.season_id}`))
console.log('history rows', rows?.length, 'to switch on', todo.map(r => `${r.gender}${r.season_id}`).join(' '), 'not loaded', notLoaded.map(r => `${r.gender}${r.season_id}`).join(' ') || 'none')
if (!apply) process.exit(0)
writeFileSync('docs/migrations/backups/20261116_season_gender_state_history.json', JSON.stringify(rows, null, 1))
for (const r of todo) {
  const { error: e } = await db.from('season_gender_state').update({ history_public: true }).eq('season_id', r.season_id).eq('gender', r.gender).eq('stage', 'history')
  if (e) throw new Error(e.message)
}
const { data: after } = await db.from('season_gender_state').select('season_id, gender, history_public').eq('stage', 'history')
console.log('public now', (after ?? []).filter(r => r.history_public).length, 'of', after?.length)
