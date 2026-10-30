import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, lockedError, parseGender } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAllRows } from '@/lib/fetchAllRows'
import { getAllConferences, conferenceFromSlug } from '@/lib/conferences'
import { RATING_SHORT } from '@/lib/rating'

export const dynamic = 'force-dynamic'

const BOYS_WEIGHTS       = [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285]
const NJ_SECTIONS        = ['North 1', 'North 2', 'Central Jersey', 'South', 'Non-Public']

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') }

// GET /api/admin/rankings/variants
// ?sections=1                           → individual scope selector data
// ?conferences=1                        → team scope selector data
// ?scope=&scope_id=&weight_class=NNN    → individual variants (weight_class present)
// ?scope=&scope_id=                     → team variants (weight_class absent = IS NULL)
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()
  const seasonGender = parseGender(req.nextUrl.searchParams.get('gender'))
  const season = await getWorkingSeason(seasonGender)
  const CURRENT_SEASON_ID = season.id
  const CURRENT_SEASON_STR = season.label

  if (req.nextUrl.searchParams.get('sections') === '1') {
    const gender = req.nextUrl.searchParams.get('gender') ?? 'M'
    // Paged: the API caps each request at 1,000 rows, which dropped sections
    const { data } = await fetchAllRows((from, to) => supabase
      .from('wrestler_hammer_scores')
      .select('section')
      .eq('season', CURRENT_SEASON_STR)
      .eq('gender', gender === 'F' ? 'F' : 'M')
      .not('section', 'is', null)
      .order('wrestler_id')
      .range(from, to))
    const sections = [...new Set((data ?? []).map((r: { section: string }) => r.section))].sort()
    const weightClasses = gender === 'F'
      ? [100, 107, 114, 120, 126, 132, 138, 145, 152, 165, 185, 235]
      : BOYS_WEIGHTS
    return NextResponse.json({ sections, weightClasses })
  }

  if (req.nextUrl.searchParams.get('conferences') === '1') {
    return NextResponse.json({
      conferences: getAllConferences(),
      sections:    NJ_SECTIONS,
    })
  }

  const scope   = req.nextUrl.searchParams.get('scope') ?? 'state'
  const scopeId = req.nextUrl.searchParams.get('scope_id') ?? null
  // null = team scope (filter by IS NULL weight_class), integer = individual scope
  const wcParam     = req.nextUrl.searchParams.get('weight_class')
  const weightClass = wcParam !== null ? parseInt(wcParam, 10) : null

  let q = supabase
    .from('ranking_computed_variants')
    .select('id, ranking_type, formula_name, scope, scope_id, weight_class, season_id, period_start, period_end, computed_at, results')
    .eq('scope', scope)
    .eq('season_id', CURRENT_SEASON_ID)
    .order('computed_at', { ascending: false })
    .limit(10)

  if (weightClass !== null) q = q.eq('weight_class', weightClass)
  else q = q.is('weight_class', null)

  q = scopeId ? q.eq('scope_id', scopeId) : q.is('scope_id', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ variants: data ?? [] })
}

// POST /api/admin/rankings/variants
// Supported actions:
//   seed_from_hammer          → individual ranking from hammer scores
//   seed_from_power_points    → team ranking from live power_points
//   seed_from_returning_strength → team ranking: sum hammer scores excluding seniors
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, scope, scope_id, weight_class, gender, period_start, period_end } = body
  const seasonGender = parseGender(gender)
  const season = await getWorkingSeason(seasonGender)
  const CURRENT_SEASON_ID = season.id
  const CURRENT_SEASON_STR = season.label
  const locked = lockedError(season, seasonGender)
  if (locked) return NextResponse.json({ error: locked }, { status: 423 })

  const supabase = db()
  const today   = new Date().toISOString().slice(0, 10)
  const weekOut = new Date(Date.now() + 6 * 86400 * 1000).toISOString().slice(0, 10)

  // ── Individual: Seed from Hammer Scores ─────────────────────────────────────
  if (action === 'seed_from_hammer') {
    if (!weight_class) return NextResponse.json({ error: 'weight_class required' }, { status: 400 })

    let scoresQ = supabase
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score, weight_class, section')
      .eq('season', CURRENT_SEASON_STR)
      .eq('weight_class', String(weight_class))
      .order('hammer_score', { ascending: false })
      .limit(200)

    if (scope === 'section' && scope_id) scoresQ = scoresQ.eq('section', scope_id)

    const { data: scores, error: scoresErr } = await scoresQ
    if (scoresErr) return NextResponse.json({ error: scoresErr.message }, { status: 500 })
    if (!scores?.length) return NextResponse.json({ error: `No ${RATING_SHORT} ratings found for this scope and weight class` }, { status: 404 })

    const wrestlerIds = scores.map((s: { wrestler_id: string }) => s.wrestler_id)
    const nameMap = new Map<string, string>()
    for (let i = 0; i < wrestlerIds.length; i += 100) {
      const { data: ws } = await supabase.from('wrestlers').select('id, first_name, last_name').in('id', wrestlerIds.slice(i, i + 100))
      for (const w of (ws ?? []) as { id: string; first_name: string; last_name: string }[]) {
        nameMap.set(w.id, `${w.last_name} ${w.first_name.charAt(0)}.`)
      }
    }

    const schoolMap = new Map<string, string>()
    for (let i = 0; i < wrestlerIds.length; i += 100) {
      const { data: hist } = await supabase
        .from('wrestler_school_history')
        .select('wrestler_id, school_id, schools(display_name)')
        .in('wrestler_id', wrestlerIds.slice(i, i + 100))
        .is('end_date', null)
        .order('start_date', { ascending: false })
      for (const h of (hist ?? []) as unknown as { wrestler_id: string; schools: { display_name: string }[] | null }[]) {
        const name = Array.isArray(h.schools) ? h.schools[0]?.display_name : (h.schools as { display_name: string } | null)?.display_name
        if (!schoolMap.has(h.wrestler_id) && name) schoolMap.set(h.wrestler_id, name)
      }
    }

    const results = scores.map((s: { wrestler_id: string; hammer_score: number }, idx: number) => ({
      rank:        idx + 1,
      wrestler_id: s.wrestler_id,
      label:       `${nameMap.get(s.wrestler_id) ?? '?'} – ${schoolMap.get(s.wrestler_id) ?? '?'}`,
      score:       Number(s.hammer_score),
    }))

    const { data: variant, error: insertErr } = await supabase
      .from('ranking_computed_variants')
      .insert({ ranking_type: 'individual', formula_name: 'hammer_score', scope, scope_id: scope_id ?? null, season_id: CURRENT_SEASON_ID, weight_class, period_start: period_start ?? today, period_end: period_end ?? weekOut, results })
      .select('id, formula_name, computed_at, results').single()
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    try {
      await supabase.rpc('log_admin_activity', { p_admin_email: email, p_action: 'ranking_variant_seeded', p_entity_type: 'ranking_computed_variants', p_entity_id: (variant as { id: string }).id, p_details: { scope, scope_id, weight_class, wrestlers: results.length } })
    } catch { /* non-fatal */ }
    return NextResponse.json({ variant })
  }

  // ── Team: Seed from Power Points ────────────────────────────────────────────
  if (action === 'seed_from_power_points') {
    const ppGender = gender ?? 'M'

    let scopeSchoolIds: number[] | null = null
    if (scope === 'conference' && scope_id) {
      const confName = conferenceFromSlug(scope_id) ?? scope_id
      const { data } = await supabase.from('schools').select('id').eq('athletic_conference', confName).eq('is_nj', true)
      scopeSchoolIds = (data ?? []).map((s: { id: number }) => s.id)
    } else if (scope === 'section' && scope_id) {
      const { data } = await supabase.from('schools').select('id').eq('section', scope_id).eq('is_nj', true)
      scopeSchoolIds = (data ?? []).map((s: { id: number }) => s.id)
    }

    let ppQ = supabase
      .from('power_points')
      .select('school_id, power_points, schools!inner(display_name)')
      .eq('season_id', CURRENT_SEASON_ID)
      .eq('gender', ppGender)
      .order('power_points', { ascending: false })
      .limit(500)

    if (scopeSchoolIds) ppQ = ppQ.in('school_id', scopeSchoolIds)

    const { data: ppData, error: ppErr } = await ppQ
    if (ppErr) return NextResponse.json({ error: ppErr.message }, { status: 500 })
    if (!ppData?.length) return NextResponse.json({ error: 'No power points data found for this scope' }, { status: 404 })

    const results = (ppData as unknown as { school_id: number; power_points: number; schools: { display_name: string } | { display_name: string }[] | null }[]).map((r, idx) => {
      const name = Array.isArray(r.schools) ? r.schools[0]?.display_name : (r.schools as { display_name: string } | null)?.display_name
      return { rank: idx + 1, school_id: r.school_id, label: name ?? `School ${r.school_id}`, score: Number(r.power_points) }
    })

    const { data: variant, error: insertErr } = await supabase
      .from('ranking_computed_variants')
      .insert({ ranking_type: 'team', formula_name: 'power_points', scope, scope_id: scope_id ?? null, season_id: CURRENT_SEASON_ID, weight_class: null, period_start: period_start ?? today, period_end: period_end ?? weekOut, results })
      .select('id, formula_name, computed_at, results').single()
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    try {
      await supabase.rpc('log_admin_activity', { p_admin_email: email, p_action: 'ranking_variant_seeded', p_entity_type: 'ranking_computed_variants', p_entity_id: (variant as { id: string }).id, p_details: { scope, scope_id, formula: 'power_points', schools: results.length } })
    } catch { /* non-fatal */ }
    return NextResponse.json({ variant })
  }

  // ── Team: Seed from Returning Strength (non-senior hammer score sum) ─────────
  if (action === 'seed_from_returning_strength') {
    // Get all hammer scores for current season
    const { data: allScores, error: scoresErr } = await supabase
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score')
      .eq('season', CURRENT_SEASON_STR)
    if (scoresErr) return NextResponse.json({ error: scoresErr.message }, { status: 500 })
    if (!allScores?.length) return NextResponse.json({ error: `No ${RATING_SHORT} ratings found for the current season` }, { status: 404 })

    const wrestlerIds = (allScores as { wrestler_id: string; hammer_score: number }[]).map(s => s.wrestler_id)

    // Fetch grades
    const gradeMap = new Map<string, string | null>()
    for (let i = 0; i < wrestlerIds.length; i += 100) {
      const { data: ws } = await supabase.from('wrestlers').select('id, grade').in('id', wrestlerIds.slice(i, i + 100))
      for (const w of (ws ?? []) as { id: string; grade: string | null }[]) gradeMap.set(w.id, w.grade)
    }

    // Fetch school associations
    const schoolIdMap = new Map<string, number>()
    for (let i = 0; i < wrestlerIds.length; i += 100) {
      const { data: hist } = await supabase.from('wrestler_school_history').select('wrestler_id, school_id').in('wrestler_id', wrestlerIds.slice(i, i + 100)).is('end_date', null)
      for (const h of (hist ?? []) as { wrestler_id: string; school_id: number }[]) {
        if (!schoolIdMap.has(h.wrestler_id)) schoolIdMap.set(h.wrestler_id, h.school_id)
      }
    }

    // Resolve scope school IDs
    let scopeSchoolIds: Set<number> | null = null
    if (scope === 'conference' && scope_id) {
      const confName = conferenceFromSlug(scope_id) ?? scope_id
      const { data } = await supabase.from('schools').select('id').eq('athletic_conference', confName).eq('is_nj', true)
      scopeSchoolIds = new Set((data ?? []).map((s: { id: number }) => s.id))
    } else if (scope === 'section' && scope_id) {
      const { data } = await supabase.from('schools').select('id').eq('section', scope_id).eq('is_nj', true)
      scopeSchoolIds = new Set((data ?? []).map((s: { id: number }) => s.id))
    }

    // Sum hammer scores per school, excluding seniors
    const schoolScores = new Map<number, number>()
    for (const s of (allScores as { wrestler_id: string; hammer_score: number }[])) {
      if (gradeMap.get(s.wrestler_id) === 'Sr') continue
      const schoolId = schoolIdMap.get(s.wrestler_id)
      if (!schoolId) continue
      if (scopeSchoolIds && !scopeSchoolIds.has(schoolId)) continue
      schoolScores.set(schoolId, (schoolScores.get(schoolId) ?? 0) + Number(s.hammer_score))
    }

    if (schoolScores.size === 0) return NextResponse.json({ error: 'No returning-strength data found for this scope' }, { status: 404 })

    // Fetch school names
    const uniqueSchoolIds = [...schoolScores.keys()]
    const schoolNameMap = new Map<number, string>()
    for (let i = 0; i < uniqueSchoolIds.length; i += 100) {
      const { data: schools } = await supabase.from('schools').select('id, display_name').in('id', uniqueSchoolIds.slice(i, i + 100))
      for (const sch of (schools ?? []) as { id: number; display_name: string }[]) schoolNameMap.set(sch.id, sch.display_name)
    }

    const results = [...schoolScores.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([schoolId, score], idx) => ({
        rank:      idx + 1,
        school_id: schoolId,
        label:     schoolNameMap.get(schoolId) ?? `School ${schoolId}`,
        score:     Math.round(score * 100) / 100,
      }))

    const { data: variant, error: insertErr } = await supabase
      .from('ranking_computed_variants')
      .insert({ ranking_type: 'team', formula_name: 'returning_hammer_strength', scope, scope_id: scope_id ?? null, season_id: CURRENT_SEASON_ID, weight_class: null, period_start: period_start ?? today, period_end: period_end ?? weekOut, results })
      .select('id, formula_name, computed_at, results').single()
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

    try {
      await supabase.rpc('log_admin_activity', { p_admin_email: email, p_action: 'ranking_variant_seeded', p_entity_type: 'ranking_computed_variants', p_entity_id: (variant as { id: string }).id, p_details: { scope, scope_id, formula: 'returning_hammer_strength', schools: results.length } })
    } catch { /* non-fatal */ }
    return NextResponse.json({ variant })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
