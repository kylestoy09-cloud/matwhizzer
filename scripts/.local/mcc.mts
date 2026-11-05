import { loadWorkload, openCounts } from '../../src/app/api/admin/microcheck/_workload'
import { createSupabaseAdmin } from '../../src/lib/supabase/service'
const w = await loadWorkload(createSupabaseAdmin())
const c = openCounts(w)
for (const k of ['girls_roster', 'boys_roster']) {
  const t = w.types.find(t => t.key === k)!
  const by: Record<string, number> = {}
  for (const s of w.schools) { const st = w.status(k, s.id); by[st] = (by[st] ?? 0) + 1 }
  console.log(k, JSON.stringify(c.get(k)), JSON.stringify(by), '| Dover:', w.status(k, 61))
  if (k === 'girls_roster') console.log('  girls still open:', w.schools.filter(s => w.status(k, s.id) === 'missing').map(s => w.nameFor(t, s.id)).slice(0, 40).join(', '))
}
