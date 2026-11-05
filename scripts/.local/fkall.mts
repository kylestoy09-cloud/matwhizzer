import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const pairs: [string, string][] = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thebrain/a5d8edbf-83df-4831-93df-b8b0113fff98/scratchpad/fks.json', 'utf8'))
const b = JSON.parse(fs.readFileSync('docs/migrations/backups/20261102_girls_duplicate_profiles_before.json', 'utf8'))
const extra: [string, string][] = [['wrestler_match_score_log', 'opponent_wrestler_id'], ['tournament_entries', 'wrestler_id'], ['wrestler_hammer_scores', 'wrestler_id']]
console.log(pairs.length, 'FK columns found in migrations')
for (const p of b.pairs) {
  const hits: string[] = []
  for (const [t, c] of [...pairs, ...extra]) { const { count, error } = await db.from(t).select('*', { count: 'exact', head: true }).eq(c, p.from); if (error) { if (!/does not exist|schema cache/.test(error.message)) hits.push(`${t}.${c}: ${error.message}`); continue } if (count) hits.push(`${t}.${c} ${count}`) }
  console.log(p.who, '→', [...new Set(hits)].join(', ') || 'nothing')
}
