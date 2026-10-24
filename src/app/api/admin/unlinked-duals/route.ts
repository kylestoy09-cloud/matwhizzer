// Unlinked dual matches — boys dual sides imported with a wrestler name but no
// wrestler_id. Those wrestlers are missing from their school's roster and their
// record. Grouped as one person per school + name.

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { splitWrestlerAtSchool } from '@/lib/splitWrestler'
import suggestions from '@/data/reviewSuggestions.json'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSb = await createSupabaseServer()
  const { data: { user } } = await userSb.auth.getUser()
  if (!user) return null
  const { data: appUser } = await userSb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return null
  return user
}

type MatchRow = {
  id: string
  weight_class: number
  wrestler_a_id: string | null
  wrestler_b_id: string | null
  wrestler_a_name_raw: string | null
  wrestler_b_name_raw: string | null
  school_a_id: number | null
  school_b_id: number | null
  winner_id: string | null
  result_type: string | null
  result_detail: string | null
  team1_points: number | null
  team2_points: number | null
  dual_meets: { season_id: number; gender: string; meet_date: string | null; team1_school_id: number | null; team2_school_id: number | null }
}

const SELECT = 'id, weight_class, wrestler_a_id, wrestler_b_id, wrestler_a_name_raw, wrestler_b_name_raw, school_a_id, school_b_id, winner_id, result_type, result_detail, team1_points, team2_points, dual_meets!inner(season_id, gender, meet_date, team1_school_id, team2_school_id)'

const groupKey = (schoolId: number | null, name: string) => `${schoolId}|${name.trim().toLowerCase()}`

async function loadUnlinked(db: ReturnType<typeof createSupabaseAdmin>) {
  return fetchAllRows<MatchRow>((from, to) =>
    db.from('dual_meet_matches').select(SELECT)
      .eq('dual_meets.gender', 'M')
      .or('and(wrestler_a_id.is.null,wrestler_a_name_raw.not.is.null),and(wrestler_b_id.is.null,wrestler_b_name_raw.not.is.null)')
      .order('id')
      // many-to-one embed: PostgREST returns an object (typed as an array by supabase-js)
      .range(from, to) as unknown as PromiseLike<{ data: MatchRow[] | null; error: { message: string } | null }>)
}

// Did the (unlinked) side win? winner_id is only set for linked wrestlers, so
// fall back to which team scored the bout.
function sideWon(m: MatchRow, side: 'a' | 'b'): boolean | null {
  const other = side === 'a' ? m.wrestler_b_id : m.wrestler_a_id
  if (m.winner_id && m.winner_id === other) return false
  const school = side === 'a' ? m.school_a_id : m.school_b_id
  const isTeam1 = school != null && school === m.dual_meets.team1_school_id
  const pts = isTeam1 ? m.team1_points : m.team2_points
  const oppPts = isTeam1 ? m.team2_points : m.team1_points
  if ((pts ?? 0) > 0) return true
  if ((oppPts ?? 0) > 0) return false
  return null
}

// GET — one item per person (school + name), with candidate wrestlers
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseAdmin()

  const { data: matches, error } = await loadUnlinked(db)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Side = { match_id: string; side: 'a' | 'b'; date: string | null; weight: number; opponent: string | null; result: string; won: boolean | null }
  const groups = new Map<string, { school_id: number | null; name: string; sides: Side[] }>()
  for (const m of matches) {
    for (const side of ['a', 'b'] as const) {
      const name = side === 'a' ? m.wrestler_a_name_raw : m.wrestler_b_name_raw
      const id = side === 'a' ? m.wrestler_a_id : m.wrestler_b_id
      if (id || !name) continue
      const school = side === 'a' ? m.school_a_id : m.school_b_id
      const k = groupKey(school, name)
      if (!groups.has(k)) groups.set(k, { school_id: school, name: name.trim(), sides: [] })
      groups.get(k)!.sides.push({
        match_id: m.id, side, date: m.dual_meets.meet_date, weight: m.weight_class,
        opponent: side === 'a' ? m.wrestler_b_name_raw : m.wrestler_a_name_raw,
        result: [m.result_type, m.result_detail].filter(Boolean).join(' '),
        won: sideWon(m, side),
      })
    }
  }

  const schoolIds = [...new Set([...groups.values()].map(g => g.school_id).filter((s): s is number => s != null))]
  const { data: schoolRows } = await db.from('schools').select('id, display_name').in('id', schoolIds.length ? schoolIds : [-1])
  const schoolName = new Map((schoolRows ?? []).map(s => [s.id, s.display_name]))

  // Candidates: wrestlers with this exact name (any school), with where they're aliased
  const items = []
  for (const [key, g] of groups) {
    const parts = g.name.split(/\s+/)
    const first = parts[0], last = parts.slice(1).join(' ')
    const { data: recs } = await db.from('wrestlers')
      .select('id, first_name, last_name, grade, is_active, is_oos')
      .eq('gender', 'M').ilike('first_name', first).ilike('last_name', last)
    const candidates = []
    for (const r of recs ?? []) {
      const { data: al } = await db.from('wrestler_name_aliases').select('school_id').eq('wrestler_id', r.id)
      candidates.push({
        ...r,
        schools: [...new Set((al ?? []).map(a => a.school_id))].map(id => ({ id, name: schoolName.get(id) ?? `School ${id}` })),
      })
    }
    items.push({
      key, school_id: g.school_id, school_name: g.school_id != null ? (schoolName.get(g.school_id) ?? `School ${g.school_id}`) : '—',
      name: g.name, sides: g.sides.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '')), candidates,
      suggestion: (suggestions.unlinked_duals as Record<string, unknown>)[key] ?? null,
    })
  }
  items.sort((a, b) => a.school_name.localeCompare(b.school_name) || a.name.localeCompare(b.name))
  return NextResponse.json({ items })
}

// POST — resolve one person
// Body: { key, action: 'link', wrestler_id }       — these sides are this existing wrestler
//     | { key, action: 'new', grade, split_from? } — a wrestler we don't have: create them
//       (split_from = a shared record aliased at this school → split them off it instead)
//     | { key, action: 'skip' }                     — leave unlinked (not a real wrestler)
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = createSupabaseAdmin()

  const body = await req.json() as { key: string; action: 'link' | 'new' | 'skip'; wrestler_id?: string; grade?: string | null; split_from?: string | null }
  if (body.action === 'skip') return NextResponse.json({ ok: true })

  const { data: matches, error } = await loadUnlinked(db)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const sides: { m: MatchRow; side: 'a' | 'b' }[] = []
  let schoolId: number | null = null
  let name = ''
  for (const m of matches) {
    for (const side of ['a', 'b'] as const) {
      const n = side === 'a' ? m.wrestler_a_name_raw : m.wrestler_b_name_raw
      const id = side === 'a' ? m.wrestler_a_id : m.wrestler_b_id
      const s = side === 'a' ? m.school_a_id : m.school_b_id
      if (!id && n && groupKey(s, n) === body.key) { sides.push({ m, side }); schoolId = s; name = n.trim() }
    }
  }
  if (sides.length === 0) return NextResponse.json({ error: 'Nothing left to link for this wrestler — reload' }, { status: 409 })
  if (schoolId == null) return NextResponse.json({ error: 'These matches have no school' }, { status: 400 })

  let wrestlerId: string
  if (body.action === 'link') {
    if (!body.wrestler_id) return NextResponse.json({ error: 'wrestler_id required' }, { status: 400 })
    wrestlerId = body.wrestler_id
    const { data: has } = await db.from('wrestler_name_aliases').select('id').eq('wrestler_id', wrestlerId).eq('school_id', schoolId).limit(1)
    if (!has?.length) {
      const { error: aErr } = await db.from('wrestler_name_aliases').insert({ raw_name: name, school_id: schoolId, wrestler_id: wrestlerId })
      if (aErr) return NextResponse.json({ error: `alias: ${aErr.message}` }, { status: 500 })
    }
  } else {
    const parts = name.split(/\s+/)
    const tidy = (s: string) => s === s.toLowerCase() ? s.replace(/\b\w/g, c => c.toUpperCase()) : s
    const person = { first_name: tidy(parts[0]), last_name: tidy(parts.slice(1).join(' ')), grade: body.grade ?? null }
    try {
      if (body.split_from) {
        // Shared record aliased here — split this school's wrestler off it (also links these sides)
        ;({ newId: wrestlerId } = await splitWrestlerAtSchool(db, body.split_from, schoolId, person, { moveRecords: true }))
      } else {
        const { data: created, error: cErr } = await db.from('wrestlers').insert({
          ...person, gender: 'M', is_oos: false,
          grade_confirmed_at: person.grade ? new Date().toISOString() : null,
          grade_confirmed_source: person.grade ? 'roster_upload' : null,
        }).select('id').single()
        if (cErr) throw new Error(cErr.message)
        wrestlerId = created.id
        const { error: aErr } = await db.from('wrestler_name_aliases').insert({ raw_name: name, school_id: schoolId, wrestler_id: wrestlerId })
        if (aErr) throw new Error(`alias: ${aErr.message}`)
      }
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
  }

  // Link every side (the split may already have linked them by name) + set winners
  let linked = 0
  for (const { m, side } of sides) {
    const col = side === 'a' ? 'wrestler_a_id' : 'wrestler_b_id'
    const update: Record<string, string> = { [col]: wrestlerId }
    if (!m.winner_id && sideWon(m, side)) update.winner_id = wrestlerId
    const { error: uErr } = await db.from('dual_meet_matches').update(update).eq('id', m.id)
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
    linked++
  }

  return NextResponse.json({ ok: true, wrestler_id: wrestlerId, linked })
}
