import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tid = req.nextUrl.searchParams.get('tid')
  if (!tid) return NextResponse.json({ error: 'tid required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: bouts, error } = await supabase
    .from('tournament_bouts')
    .select('*')
    .eq('in_season_tournament_id', tid)
    .order('weight_class', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!bouts?.length) return NextResponse.json({ bouts: [] })

  // Collect all linked wrestler IDs for the cross-check join
  const wrestlerIds = new Set<string>()
  for (const b of bouts) {
    if (b.nj_wrestler1_id) wrestlerIds.add(b.nj_wrestler1_id)
    if (b.nj_wrestler2_id) wrestlerIds.add(b.nj_wrestler2_id)
  }

  // wrestler_id → registered school_id from tournament_entries.
  // Only populated when unambiguous (wrestler appears under exactly one school).
  // Transfers or multi-school entries → null (don't flag as mismatch).
  const wrestlerSchools = new Map<string, number | null>()
  if (wrestlerIds.size > 0) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('wrestler_id, school_id')
      .in('wrestler_id', [...wrestlerIds])

    const schoolsByWrestler = new Map<string, Set<number>>()
    for (const e of (entries ?? [])) {
      if (!e.wrestler_id || !e.school_id) continue
      if (!schoolsByWrestler.has(e.wrestler_id)) {
        schoolsByWrestler.set(e.wrestler_id, new Set())
      }
      schoolsByWrestler.get(e.wrestler_id)!.add(e.school_id)
    }
    for (const [wid, schools] of schoolsByWrestler) {
      wrestlerSchools.set(wid, schools.size === 1 ? [...schools][0] : null)
    }
  }

  const augmented = bouts.map(b => ({
    ...b,
    w1_registered_school_id: b.nj_wrestler1_id
      ? (wrestlerSchools.get(b.nj_wrestler1_id) ?? null)
      : null,
    w2_registered_school_id: b.nj_wrestler2_id
      ? (wrestlerSchools.get(b.nj_wrestler2_id) ?? null)
      : null,
  }))

  return NextResponse.json({ bouts: augmented })
}
