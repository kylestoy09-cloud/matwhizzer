// A wrestler created at a school marked non-NJ (is_nj = false: other states, and NJ
// schools outside the NJSIAA such as Lawrenceville, Peddie, Blair) is out-of-state:
// not rated, ranked or seeded. Imports set wrestlers.is_oos from the school record.

import type { createSupabaseAdmin } from '@/lib/supabase/service'

type Db = ReturnType<typeof createSupabaseAdmin>

/** The ids among `schoolIds` whose school is marked non-NJ. */
export async function nonNjSchools(db: Db, schoolIds: (number | null | undefined)[]): Promise<Set<number>> {
  const ids = [...new Set(schoolIds.filter((s): s is number => s != null))]
  const out = new Set<number>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from('schools').select('id').in('id', ids.slice(i, i + 200)).eq('is_nj', false)
    if (error) throw new Error(`schools: ${error.message}`)
    for (const s of data ?? []) out.add(s.id as number)
  }
  return out
}
