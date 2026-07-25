import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const mid  = req.nextUrl.searchParams.get('mid')
  const view = req.nextUrl.searchParams.get('view')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // ── Work-queue view: all unlinked match slots, grouped by school ────────────
  if (view === 'unlinked') {
    const { data: unlinked, error: ulErr } = await supabase
      .from('dual_meet_matches')
      .select(`
        id, dual_meet_id, weight_class,
        school_a_id, school_b_id,
        wrestler_a_id, wrestler_b_id,
        wrestler_a_name_raw, wrestler_b_name_raw,
        winner_id, result_type, result_detail, fall_time_seconds,
        is_double_forfeit, is_forfeit_win, validated
      `)
      .or(
        // Exclude forfeit wins from both slots: forfeiting side has no wrestler to link;
        // winning side is lower priority and handled in By-Meet view.
        'and(wrestler_a_id.is.null,school_a_id.not.is.null,is_double_forfeit.eq.false,is_forfeit_win.eq.false),' +
        'and(wrestler_b_id.is.null,school_b_id.not.is.null,is_forfeit_win.eq.false,is_double_forfeit.eq.false)'
      )
      .order('weight_class')

    if (ulErr) return NextResponse.json({ error: ulErr.message }, { status: 500 })
    if (!unlinked?.length) return NextResponse.json({ groups: [] })

    // Collect school IDs and meet IDs
    const ulSchoolIds = new Set<number>()
    const ulMeetIds   = new Set<string>()
    for (const m of unlinked) {
      if (m.school_a_id) ulSchoolIds.add(m.school_a_id)
      if (m.school_b_id) ulSchoolIds.add(m.school_b_id)
      ulMeetIds.add(m.dual_meet_id)
    }

    const [{ data: ulSchools }, { data: ulMeets }] = await Promise.all([
      supabase.from('schools').select('id, display_name, is_nj').in('id', [...ulSchoolIds]),
      supabase
        .from('dual_meets')
        .select('id, meet_date, gender, team1:schools!team1_school_id(display_name), team2:schools!team2_school_id(display_name)')
        .in('id', [...ulMeetIds]),
    ])

    const ulSchoolMap = new Map<number, { name: string; isNj: boolean }>()
    for (const s of ulSchools ?? []) ulSchoolMap.set(s.id, { name: s.display_name, isNj: s.is_nj ?? true })

    const ulMeetMap = new Map<string, { label: string }>()
    for (const dm of (ulMeets ?? []) as any[]) {
      const t1 = dm.team1?.display_name ?? '?'
      const t2 = dm.team2?.display_name ?? '?'
      const date = new Date(dm.meet_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
      const g = dm.gender === 'F' ? ' · Girls' : ''
      ulMeetMap.set(dm.id, { label: `${t1} vs ${t2} · ${date}${g}` })
    }

    // Group unlinked slots by school
    const bySchool = new Map<number, {
      schoolId: number; schoolName: string; isNj: boolean
      slots: { matchId: string; meetId: string; meetLabel: string; weightClass: number; slot: 'a' | 'b'; nameRaw: string | null }[]
    }>()

    for (const m of unlinked) {
      const addSlot = (schoolId: number | null, slot: 'a' | 'b', nameRaw: string | null) => {
        if (!schoolId) return
        const school = ulSchoolMap.get(schoolId)
        if (!school) return
        // OOS schools can't be linked to NJ wrestler records — skip them
        if (!school.isNj) return
        if (!bySchool.has(schoolId)) {
          bySchool.set(schoolId, { schoolId, schoolName: school.name, isNj: school.isNj, slots: [] })
        }
        bySchool.get(schoolId)!.slots.push({
          matchId:     m.id,
          meetId:      m.dual_meet_id,
          meetLabel:   ulMeetMap.get(m.dual_meet_id)?.label ?? m.dual_meet_id,
          weightClass: m.weight_class,
          slot,
          nameRaw,
        })
      }

      if (!m.wrestler_a_id && m.school_a_id && !m.is_double_forfeit) {
        addSlot(m.school_a_id, 'a', m.wrestler_a_name_raw)
      }
      if (!m.wrestler_b_id && m.school_b_id && !m.is_forfeit_win && !m.is_double_forfeit) {
        addSlot(m.school_b_id, 'b', m.wrestler_b_name_raw)
      }
    }

    const groups = [...bySchool.values()].sort((a, b) =>
      a.schoolName.localeCompare(b.schoolName)
    )

    return NextResponse.json({ groups })
  }

  if (!mid) return NextResponse.json({ error: 'mid required' }, { status: 400 })

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

  const schoolMap = new Map<number, { name: string; isNj: boolean }>()
  if (schoolIds.size > 0) {
    const { data: schools } = await supabase
      .from('schools')
      .select('id, display_name, is_nj')
      .in('id', [...schoolIds])

    for (const s of schools ?? []) schoolMap.set(s.id, { name: s.display_name, isNj: s.is_nj ?? true })
  }

  const augmented = matches.map(m => ({
    ...m,
    wrestler_a_name:  m.wrestler_a_id ? (wrestlerMap.get(m.wrestler_a_id)?.name ?? null) : null,
    wrestler_a_stub:  m.wrestler_a_id ? (wrestlerMap.get(m.wrestler_a_id)?.isStub ?? false) : false,
    wrestler_b_name:  m.wrestler_b_id ? (wrestlerMap.get(m.wrestler_b_id)?.name ?? null) : null,
    wrestler_b_stub:  m.wrestler_b_id ? (wrestlerMap.get(m.wrestler_b_id)?.isStub ?? false) : false,
    school_a_name:    m.school_a_id ? (schoolMap.get(m.school_a_id)?.name ?? null) : null,
    school_a_is_nj:   m.school_a_id ? (schoolMap.get(m.school_a_id)?.isNj ?? true) : false,
    school_b_name:    m.school_b_id ? (schoolMap.get(m.school_b_id)?.name ?? null) : null,
    school_b_is_nj:   m.school_b_id ? (schoolMap.get(m.school_b_id)?.isNj ?? true) : false,
    wa_registered_school_id: m.wrestler_a_id
      ? (wrestlerSchools.get(m.wrestler_a_id) ?? null)
      : null,
    wb_registered_school_id: m.wrestler_b_id
      ? (wrestlerSchools.get(m.wrestler_b_id) ?? null)
      : null,
  }))

  return NextResponse.json({ matches: augmented })
}
