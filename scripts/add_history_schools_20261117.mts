// Kyle 2026-11-17: closed / old schools in the pre-2013 history (NJ Wrestling History) that didn't fold into one of our
// schools — or that we can't place for sure — become inactive schools under their old name (no program rows, so they
// stay off every current list, like Bishop Ahr). The ones that became one of our schools are connected in code
// (src/lib/historySchools.ts) instead. Re-runnable: skips a name already there.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const NEW: { display_name: string; town: string | null; county: string | null }[] = [
  { display_name: 'Bayley-Ellard', town: 'Madison', county: 'Morris' },
  { display_name: 'Essex Catholic', town: 'Newark', county: 'Essex' },
  { display_name: 'Don Bosco Tech', town: 'Paterson', county: 'Passaic' },
  { display_name: 'Paterson Catholic', town: 'Paterson', county: 'Passaic' },
  { display_name: 'Phillipsburg Catholic', town: 'Phillipsburg', county: 'Warren' },
  { display_name: 'St. Cecilia', town: 'Englewood', county: 'Bergen' },
  { display_name: 'St. James', town: 'Carneys Point', county: 'Salem' },
  { display_name: 'Sacred Heart', town: 'Vineland', county: 'Cumberland' },
  { display_name: 'Vailsburg', town: 'Newark', county: 'Essex' },
  { display_name: 'Bergen Tech', town: 'Hackensack', county: 'Bergen' },
  { display_name: 'Bridgeton', town: 'Bridgeton', county: 'Cumberland' },
  { display_name: 'Midland Park', town: 'Midland Park', county: 'Bergen' },
  { display_name: 'Montclair Kimberley', town: 'Montclair', county: 'Essex' },
  { display_name: 'Newark Central', town: 'Newark', county: 'Essex' },
  { display_name: 'Pleasantville', town: 'Pleasantville', county: 'Atlantic' },
  { display_name: 'Woodrow Wilson', town: 'Camden', county: 'Camden' },
  // Burlington, North Edison, South Freehold, Green Brook were created here, then connected by Kyle (removed: see
  // scripts/remove_placeholder_schools_20261117.mts)
]
const { data: have } = await db.from('schools').select('id, display_name').in('display_name', NEW.map(n => n.display_name))
const made: Record<string, number> = Object.fromEntries((have ?? []).map(s => [s.display_name, s.id]))
for (const n of NEW) {
  if (made[n.display_name]) continue
  const { data, error } = await db.from('schools').insert({ ...n, is_nj: true, is_combined: false }).select('id').single()
  if (error) throw new Error(`${n.display_name}: ${error.message}`)
  made[n.display_name] = data.id
}
console.log(JSON.stringify(made))
// 2026-11-17 (review): Sussex Tech (Sparta, NJ) — its one history finish had landed on Sussex Tech (DE)
{
  const { data: have } = await db.from('schools').select('id').eq('display_name', 'Sussex Tech').maybeSingle()
  if (!have) { const { data, error } = await db.from('schools').insert({ display_name: 'Sussex Tech', town: 'Sparta', county: 'Sussex', is_nj: true, is_combined: false }).select('id').single(); if (error) throw error; console.log('Sussex Tech', data.id) }
  else console.log('Sussex Tech', have.id)
}
