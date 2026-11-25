// After profile merges: the college entrants still waiting for review are matched again against the current
// profiles (a merged duplicate leaves one candidate, which may now be a sure match). Decisions are untouched (only
// match_status 'review' rows). Backup first.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { loadPool } from '../src/lib/ncaa/save'
import { matchEntrant } from '../src/lib/ncaa/match'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const idx = await loadPool(db as never, 'M')
const { data } = await db.from('boys_college_entries').select('id, name, wrestler_id, match_status, match_note, event:boys_college_events(year)').eq('match_status', 'review')
writeFileSync(`docs/migrations/backups/20261117_college_rematch_review_before_${Date.now()}.json`, JSON.stringify(data))
const tally: Record<string, number> = {}
for (const e of (data ?? []) as any[]) {
  const m = matchEntrant(idx, e.name, e.event.year, e.weight)
  tally[m.status] = (tally[m.status] ?? 0) + 1
  if (m.status !== 'review') console.log(e.event.year, e.name, '→', m.status, m.note ?? '')
  await db.from('boys_college_entries').update({ wrestler_id: m.wrestler_id, match_status: m.status, match_note: m.status === 'none' ? null : JSON.stringify({ note: m.note, candidates: m.candidates }) }).eq('id', e.id)
}
console.log(tally)
