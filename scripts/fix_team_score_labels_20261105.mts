// precomputed_team_scores.tournament_type must be the label the readers use (school profile team
// card in SchoolProfileCore.tsx, src/lib/standings.ts): boys_districts / regions / boys_state and
// girls_districts / girls_regions / girls_state. The team-score loads of 2026-11-03 (girls 2025-26)
// and 2026-11-05 (boys 2024-25) copied the tournament's own type instead, writing "districts", so
// those district points vanished from school pages and standings; 66 girls 2024-25 state rows
// (older) were labelled girls_regions. Sets every row's label from its tournament.
//   npx tsx --tsconfig tsconfig.json scripts/fix_team_score_labels_20261105.mts [--apply]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const APPLY = process.argv.includes('--apply')
const chk = (r: any, w: string) => { if (r.error) throw new Error(`${w}: ${r.error.message}`); return r.data as any[] }

export const LABEL: Record<string, Record<string, string>> = {
  M: { districts: 'boys_districts', regions: 'regions', boys_state: 'boys_state' },
  F: { districts: 'girls_districts', girls_regions: 'girls_regions', girls_state: 'girls_state' },
}
const T = new Map(chk(await db.from('tournaments').select('id, gender, tournament_type'), 't').map(t => [t.id, t]))
const rows: any[] = []; for (let i = 0; ; i += 1000) { const d = chk(await db.from('precomputed_team_scores').select('*').order('id').range(i, i + 999), 'p'); rows.push(...d); if (d.length < 1000) break }
const wrong = rows.filter(r => { const t = T.get(r.tournament_id); return t && LABEL[t.gender]?.[t.tournament_type] && r.tournament_type !== LABEL[t.gender][t.tournament_type] })
const unknown = rows.filter(r => { const t = T.get(r.tournament_id); return !t || !LABEL[t.gender]?.[t.tournament_type] })
const by: Record<string, number> = {}
for (const r of wrong) { const t = T.get(r.tournament_id); const k = `${t.gender} ${r.season_id} ${r.tournament_type} → ${LABEL[t.gender][t.tournament_type]}`; by[k] = (by[k] ?? 0) + 1 }
console.log(`${rows.length} rows; wrong label ${wrong.length}:`, JSON.stringify(by), `| rows whose tournament has no known label: ${unknown.length}`)
if (!APPLY) { console.log('DRY RUN'); process.exit(0) }
fs.writeFileSync('docs/migrations/backups/20261105_team_score_labels_before.json', JSON.stringify(wrong, null, 1))
for (const [k] of Object.entries(by)) {
  const [g, season, from, , to] = k.split(' ')
  const ids = wrong.filter(r => T.get(r.tournament_id).gender === g && String(r.season_id) === season && r.tournament_type === from).map(r => r.id)
  for (let i = 0; i < ids.length; i += 200) chk(await db.from('precomputed_team_scores').update({ tournament_type: to }).in('id', ids.slice(i, i + 200)).select('id'), 'update')
  console.log(`done: ${k} (${ids.length})`)
}
