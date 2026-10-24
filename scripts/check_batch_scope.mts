import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const { data: batch } = await db
  .from('wrestlers')
  .select('id, first_name, last_name, main_weight')
  .gte('created_at', '2026-08-03T00:07:00')
  .lte('created_at', '2026-08-03T00:09:00')

console.log('Batch size:', batch?.length)
const ids = (batch ?? []).map(w => w.id)

// Any match/tournament history at all for this batch?
const { data: entries } = await db.from('tournament_entries').select('wrestler_id').in('wrestler_id', ids)
console.log('Batch wrestlers with tournament_entries:', new Set((entries ?? []).map(e => e.wrestler_id)).size)

const { data: duals } = await db.from('dual_meet_matches').select('wrestler_a_id, wrestler_b_id').or(
  `wrestler_a_id.in.(${ids.join(',')}),wrestler_b_id.in.(${ids.join(',')})`
)
console.log('Batch wrestlers with dual_meet_matches rows:', duals?.length ?? 0)

// Which schools (if any) do these batch wrestlers get aliased to?
const { data: aliases } = await db.from('wrestler_name_aliases').select('wrestler_id, school_id, raw_name').in('wrestler_id', ids)
console.log('Batch wrestlers WITH an alias to some school:', aliases?.length)

const bySchool: Record<number, number> = {}
for (const a of aliases ?? []) bySchool[a.school_id] = (bySchool[a.school_id] ?? 0) + 1
const schoolIds = Object.keys(bySchool).map(Number)
const { data: schools } = await db.from('schools').select('id, display_name').in('id', schoolIds)
for (const sid of schoolIds) {
  console.log(`school_id=${sid} (${schools?.find(s => s.id === sid)?.display_name}): ${bySchool[sid]} aliased batch-wrestlers`)
}

console.log('\nBatch wrestlers with NO alias anywhere (orphaned):', ids.length - (aliases?.length ?? 0))
