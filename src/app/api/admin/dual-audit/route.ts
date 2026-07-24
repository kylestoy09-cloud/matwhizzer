import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mid = req.nextUrl.searchParams.get('mid')
  if (!mid) return NextResponse.json({ error: 'mid required' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: matches, error } = await supabase
    .from('dual_meet_matches')
    .select('*')
    .eq('dual_meet_id', mid)
    .order('weight_class', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!matches?.length) return NextResponse.json({ matches: [] })

  // Collect all wrestler IDs (winner_id is always one of the two slot IDs)
  const wrestlerIds = new Set<string>()
  for (const m of matches) {
    if (m.wrestler_a_id) wrestlerIds.add(m.wrestler_a_id)
    if (m.wrestler_b_id) wrestlerIds.add(m.wrestler_b_id)
  }

  // Fetch wrestler records → name + stub detection
  const wrestlerMap = new Map<string, { name: string; isStub: boolean }>()
  if (wrestlerIds.size > 0) {
    const { data: wrestlers } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('id', [...wrestlerIds])

    for (const w of wrestlers ?? []) {
      wrestlerMap.set(w.id, {
        name: [w.first_name, w.last_name].filter(Boolean).join(' '),
        isStub: /^[A-Z]\.$/.test(w.first_name ?? ''),
      })
    }
  }

  // Cross-check: wrestler's school registration from tournament_entries.
  // Only populated when unambiguous (exactly one school). Transfers → null (skip mismatch).
  const wrestlerSchools = new Map<string, number | null>()
  if (wrestlerIds.size > 0) {
    const { data: entries } = await supabase
      .from('tournament_entries')
      .select('wrestler_id, school_id')
      .in('wrestler_id', [...wrestlerIds])

    const schoolsByWrestler = new Map<string, Set<number>>()
    for (const e of entries ?? []) {
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

  // Collect school IDs for display name lookup
  const schoolIds = new Set<number>()
  for (const m of matches) {
    if (m.school_a_id) schoolIds.add(m.school_a_id)
    if (m.school_b_id) schoolIds.add(m.school_b_id)
  }

  const schoolMap = new Map<number, string>()
  if (schoolIds.size > 0) {
    const { data: schools } = await supabase
      .from('schools')
      .select('id, display_name')
      .in('id', [...schoolIds])

    for (const s of schools ?? []) schoolMap.set(s.id, s.display_name)
  }

  const augmented = matches.map(m => ({
    ...m,
    wrestler_a_name: m.wrestler_a_id ? (wrestlerMap.get(m.wrestler_a_id)?.name ?? null) : null,
    wrestler_a_stub: m.wrestler_a_id ? (wrestlerMap.get(m.wrestler_a_id)?.isStub ?? false) : false,
    wrestler_b_name: m.wrestler_b_id ? (wrestlerMap.get(m.wrestler_b_id)?.name ?? null) : null,
    wrestler_b_stub: m.wrestler_b_id ? (wrestlerMap.get(m.wrestler_b_id)?.isStub ?? false) : false,
    school_a_name:   m.school_a_id ? (schoolMap.get(m.school_a_id) ?? null) : null,
    school_b_name:   m.school_b_id ? (schoolMap.get(m.school_b_id) ?? null) : null,
    wa_registered_school_id: m.wrestler_a_id
      ? (wrestlerSchools.get(m.wrestler_a_id) ?? null)
      : null,
    wb_registered_school_id: m.wrestler_b_id
      ? (wrestlerSchools.get(m.wrestler_b_id) ?? null)
      : null,
  }))

  return NextResponse.json({ matches: augmented })
}
