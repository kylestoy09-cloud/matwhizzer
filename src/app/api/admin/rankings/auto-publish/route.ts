import { NextRequest, NextResponse } from 'next/server'
import { getWorkingSeason, lockedError, parseGender } from '@/lib/season-context'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { RATING_SHORT } from '@/lib/rating'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

const BATCH              = 50   // rows per Supabase insert call

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

type ScoreRow = {
  wrestler_id: string
  hammer_score: number
  weight_class: string | null
  conference: string | null
  district: number | null
  region: number | null
}

type GroupKey = { scope: 'conference' | 'district' | 'region'; scope_id: string; weight_class: string }
type Group    = { key: GroupKey; scores: { wrestler_id: string; hammer_score: number }[] }

// POST /api/admin/rankings/auto-publish
// Reads current wrestler_hammer_scores and auto-publishes rankings for every
// distinct (conference|district|region) × weight_class combination.
// Intended to be called immediately after each hammer-score recalculation run.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()
  const body = await req.json().catch(() => ({}))
  const seasonGender = parseGender(body.gender)
  const season = await getWorkingSeason(seasonGender)
  const CURRENT_SEASON_ID = season.id
  const CURRENT_SEASON_STR = season.label
  const locked = lockedError(season, seasonGender)
  if (locked) return NextResponse.json({ error: locked }, { status: 423 })

  // 1. Load all hammer scores
  const allScores: ScoreRow[] = []
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from('wrestler_hammer_scores')
      .select('wrestler_id, hammer_score, weight_class, conference, district, region')
      .eq('season', CURRENT_SEASON_STR)
      .range(offset, offset + 499)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) break
    allScores.push(...(data as ScoreRow[]))
    if (data.length < 500) break
  }

  if (!allScores.length) {
    return NextResponse.json({ ok: true, published: 0, message: `No ${RATING_SHORT} ratings found` })
  }

  // 2. Batch-fetch wrestler names
  const wrestlerIds = [...new Set(allScores.map(s => s.wrestler_id))]
  const nameMap = new Map<string, string>()
  for (let i = 0; i < wrestlerIds.length; i += 100) {
    const { data } = await supabase
      .from('wrestlers')
      .select('id, first_name, last_name')
      .in('id', wrestlerIds.slice(i, i + 100))
    for (const w of (data ?? []) as { id: string; first_name: string; last_name: string }[]) {
      nameMap.set(w.id, `${w.last_name} ${w.first_name.charAt(0)}.`)
    }
  }

  // 3. Batch-fetch school names via wrestler_school_history
  const schoolMap = new Map<string, string>()
  for (let i = 0; i < wrestlerIds.length; i += 100) {
    const { data } = await supabase
      .from('wrestler_school_history')
      .select('wrestler_id, schools(display_name)')
      .in('wrestler_id', wrestlerIds.slice(i, i + 100))
      .is('end_date', null)
      .order('start_date', { ascending: false })
    for (const h of (data ?? []) as unknown as { wrestler_id: string; schools: { display_name: string }[] | null }[]) {
      const name = Array.isArray(h.schools) ? h.schools[0]?.display_name : (h.schools as { display_name: string } | null)?.display_name
      if (!schoolMap.has(h.wrestler_id) && name) schoolMap.set(h.wrestler_id, name)
    }
  }

  // 4. Group scores by (scope_type, scope_id, weight_class)
  const groups = new Map<string, Group>()

  for (const s of allScores) {
    if (!s.weight_class) continue

    if (s.conference) {
      const key = `conf|${s.conference}|${s.weight_class}`
      if (!groups.has(key)) groups.set(key, { key: { scope: 'conference', scope_id: s.conference, weight_class: s.weight_class }, scores: [] })
      groups.get(key)!.scores.push({ wrestler_id: s.wrestler_id, hammer_score: Number(s.hammer_score) })
    }
    if (s.district != null) {
      const sid = String(s.district)
      const key = `dist|${sid}|${s.weight_class}`
      if (!groups.has(key)) groups.set(key, { key: { scope: 'district', scope_id: sid, weight_class: s.weight_class }, scores: [] })
      groups.get(key)!.scores.push({ wrestler_id: s.wrestler_id, hammer_score: Number(s.hammer_score) })
    }
    if (s.region != null) {
      const sid = String(s.region)
      const key = `reg|${sid}|${s.weight_class}`
      if (!groups.has(key)) groups.set(key, { key: { scope: 'region', scope_id: sid, weight_class: s.weight_class }, scores: [] })
      groups.get(key)!.scores.push({ wrestler_id: s.wrestler_id, hammer_score: Number(s.hammer_score) })
    }
  }

  // Sort scores descending within each group
  for (const group of groups.values()) {
    group.scores.sort((a, b) => b.hammer_score - a.hammer_score)
  }

  const today   = new Date().toISOString().slice(0, 10)
  const weekOut = new Date(Date.now() + 6 * 86400 * 1000).toISOString().slice(0, 10)

  // 5. Build variant rows to batch-insert
  type VariantInsert = {
    ranking_type: string; formula_name: string
    scope: string; scope_id: string | null
    season_id: number; weight_class: number
    period_start: string; period_end: string; results: unknown
  }

  const groupArr = [...groups.values()]
  const variantRows: VariantInsert[] = groupArr.map(({ key, scores }) => ({
    ranking_type: 'individual',
    formula_name: 'hammer_score',
    scope:        key.scope,
    scope_id:     key.scope_id,
    season_id:    CURRENT_SEASON_ID,
    weight_class: parseInt(key.weight_class, 10),
    period_start: today,
    period_end:   weekOut,
    results: scores.map((s, idx) => ({
      rank:        idx + 1,
      wrestler_id: s.wrestler_id,
      label:       `${nameMap.get(s.wrestler_id) ?? '?'} – ${schoolMap.get(s.wrestler_id) ?? '?'}`,
      score:       s.hammer_score,
    })),
  }))

  // 6. Batch-insert ranking_computed_variants → get IDs
  const insertedVariants: { id: string; scope: string; scope_id: string | null; weight_class: number }[] = []
  for (let i = 0; i < variantRows.length; i += BATCH) {
    const { data, error } = await supabase
      .from('ranking_computed_variants')
      .insert(variantRows.slice(i, i + BATCH))
      .select('id, scope, scope_id, weight_class')
    if (error) return NextResponse.json({ error: `variant insert failed: ${error.message}` }, { status: 500 })
    insertedVariants.push(...((data ?? []) as typeof insertedVariants))
  }

  // 7. Build ranking_published rows (pair with variant results by position)
  type PublishedInsert = {
    ranking_type: string; scope: string; scope_id: string | null
    season_id: number; weight_class: number
    period_start: string; period_end: string
    source_type: string; source_editorial_id: null
    source_variant_id: string; published_by: null; results: unknown
  }

  const publishedRows: PublishedInsert[] = insertedVariants.map((v, idx) => ({
    ranking_type:        'individual',
    scope:               v.scope,
    scope_id:            v.scope_id,
    season_id:           CURRENT_SEASON_ID,
    weight_class:        v.weight_class,
    period_start:        today,
    period_end:          weekOut,
    source_type:         'auto_computed',
    source_editorial_id: null,
    source_variant_id:   v.id,
    published_by:        null,
    results:             variantRows[idx].results,
  }))

  // 8. Batch-insert ranking_published
  for (let i = 0; i < publishedRows.length; i += BATCH) {
    const { error } = await supabase
      .from('ranking_published')
      .insert(publishedRows.slice(i, i + BATCH))
    if (error) return NextResponse.json({ error: `publish insert failed: ${error.message}` }, { status: 500 })
  }

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'rankings_auto_published',
      p_entity_type: 'ranking_published',
      p_entity_id:   null,
      p_details:     {
        groups:      groupArr.length,
        conference:  groupArr.filter(g => g.key.scope === 'conference').length,
        district:    groupArr.filter(g => g.key.scope === 'district').length,
        region:      groupArr.filter(g => g.key.scope === 'region').length,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({
    ok:        true,
    published: groupArr.length,
    conference: groupArr.filter(g => g.key.scope === 'conference').length,
    district:   groupArr.filter(g => g.key.scope === 'district').length,
    region:     groupArr.filter(g => g.key.scope === 'region').length,
  })
}
