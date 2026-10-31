import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, lockedError, parseGender } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'


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

// GET /api/admin/rankings/editorial
// ?scope=state&scope_id=&weight_class=106
// Returns the most recently updated editorial for this scope, or null.
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scope   = req.nextUrl.searchParams.get('scope') ?? 'state'
  const scopeId = req.nextUrl.searchParams.get('scope_id') ?? null
  // null = team scope (IS NULL weight_class), integer = individual scope
  const wcParam     = req.nextUrl.searchParams.get('weight_class')
  const weightClass = wcParam !== null ? parseInt(wcParam, 10) : null

  const supabase = db()
  const seasonGender = parseGender(req.nextUrl.searchParams.get('gender'))
  const season = await getWorkingSeason(seasonGender)
  const CURRENT_SEASON_ID = season.id

  let q = supabase
    .from('ranking_editorial')
    .select('id, ranking_type, scope, scope_id, weight_class, season_id, period_start, period_end, based_on_variant_id, results, updated_by, updated_at')
    .eq('scope', scope)
    .eq('gender', seasonGender)
    .eq('season_id', CURRENT_SEASON_ID)
    .order('updated_at', { ascending: false })
    .limit(1)

  if (weightClass !== null) q = q.eq('weight_class', weightClass)
  else q = q.is('weight_class', null)

  q = scopeId ? q.eq('scope_id', scopeId) : q.is('scope_id', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ editorial: data?.[0] ?? null })
}

// POST /api/admin/rankings/editorial
// Body: { variant_id, scope, scope_id, weight_class, period_start, period_end }
// Creates a new editorial copied from the specified variant.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { variant_id, scope, scope_id, weight_class, period_start, period_end } = body
  const seasonGender = parseGender(body.gender)
  const season = await getWorkingSeason(seasonGender)
  const locked = lockedError(season, seasonGender)
  if (locked) return NextResponse.json({ error: locked }, { status: 423 })
  if (!variant_id) {
    return NextResponse.json({ error: 'variant_id is required' }, { status: 400 })
  }

  const supabase = db()

  // Fetch the source variant
  const { data: variant, error: varErr } = await supabase
    .from('ranking_computed_variants')
    .select('id, results, period_start, period_end, scope, scope_id, weight_class, season_id')
    .eq('id', variant_id)
    .single()

  if (varErr || !variant) return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
  const v = variant as { id: string; results: unknown; period_start: string; period_end: string; scope: string; scope_id: string | null; weight_class: number | null; season_id: number; ranking_type?: string }

  const { data: editorial, error: insertErr } = await supabase
    .from('ranking_editorial')
    .insert({
      gender: seasonGender,
      ranking_type:        v.ranking_type ?? 'individual',
      scope:               scope ?? v.scope,
      scope_id:            scope_id ?? v.scope_id ?? null,
      season_id:           v.season_id,
      weight_class:        weight_class ?? v.weight_class ?? null,
      period_start:        period_start ?? v.period_start,
      period_end:          period_end   ?? v.period_end,
      based_on_variant_id: v.id,
      results:             v.results,
      updated_by:          email,
    })
    .select('id, results, updated_by, updated_at, based_on_variant_id, period_start, period_end')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'ranking_editorial_create',
      p_entity_type: 'ranking_editorial',
      p_entity_id:   (editorial as { id: string }).id,
      p_details:     { scope, scope_id, weight_class, source_variant_id: v.id },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ editorial })
}

// PATCH /api/admin/rankings/editorial
// Body: { id, results }
// Updates the editorial's results array (reordered or hand-edited list).
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, results } = body
  const seasonGender = parseGender(body.gender)
  const season = await getWorkingSeason(seasonGender)
  const locked = lockedError(season, seasonGender)
  if (locked) return NextResponse.json({ error: locked }, { status: 423 })
  if (!id || !Array.isArray(results)) {
    return NextResponse.json({ error: 'id and results array required' }, { status: 400 })
  }

  // Re-number ranks to match array order
  const reranked = results.map((r: Record<string, unknown>, idx: number) => ({ ...r, rank: idx + 1 }))

  const supabase = db()

  const { error } = await supabase
    .from('ranking_editorial')
    .update({ results: reranked, updated_by: email })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'ranking_editorial_save',
      p_entity_type: 'ranking_editorial',
      p_entity_id:   id,
      p_details:     { wrestlers: reranked.length },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
