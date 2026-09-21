import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: null }
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: null }
  return { user, email: user.email ?? '' }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!) }

// GET /api/admin/seasons
// Returns seasons with embedded genderState from season_gender_state.
// Shape: { seasons: [{ id, year_label, created_at, genderState: { M: {...}, F: {...} } }] }
export async function GET() {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const client = db()

  const { data: seasons, error: sErr } = await client
    .from('seasons')
    .select('id, year_label, created_at')
    .order('id', { ascending: false })

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })

  const { data: states, error: gsErr } = await client
    .from('season_gender_state')
    .select('season_id, gender, stage, is_public_default, finalized_at')

  if (gsErr) return NextResponse.json({ error: gsErr.message }, { status: 500 })

  type GState = { stage: string; is_public_default: boolean; finalized_at: string | null }
  const stateMap = new Map<string, GState>()
  for (const s of (states ?? [])) {
    stateMap.set(`${s.season_id}_${s.gender}`, {
      stage: s.stage,
      is_public_default: s.is_public_default,
      finalized_at: s.finalized_at,
    })
  }

  const result = (seasons ?? []).map(s => ({
    id: s.id,
    year_label: s.year_label,
    created_at: s.created_at,
    genderState: {
      M: stateMap.get(`${s.id}_M`) ?? null,
      F: stateMap.get(`${s.id}_F`) ?? null,
    },
  }))

  return NextResponse.json({ seasons: result })
}

// POST /api/admin/seasons
// action='set-live'      body: { seasonId, gender }
//   → sets is_public_default=true on (seasonId, gender) in season_gender_state,
//     false on all other rows for that gender
// action='set-stage'     body: { seasonId, stage, gender }
//   → updates stage for (seasonId, gender) in season_gender_state
// action='finalize-season' body: { seasonId, gender }
//   → archives (seasonId, gender), creates next season year if needed,
//     creates new season_gender_state preseason row for that gender only
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, seasonId, gender } = body as {
    action: string
    seasonId: number
    gender?: 'M' | 'F'
  }

  if (!seasonId || !action) {
    return NextResponse.json({ error: 'Missing action or seasonId' }, { status: 400 })
  }
  if ((action !== 'finalize-season' || action === 'finalize-season') && !gender) {
    if (action !== 'finalize-season') {
      return NextResponse.json({ error: 'Missing gender' }, { status: 400 })
    }
  }

  const client = db()

  // ── set-live ──────────────────────────────────────────────────────────────
  if (action === 'set-live') {
    if (!gender) return NextResponse.json({ error: 'Missing gender' }, { status: 400 })

    const { error: clearErr } = await client
      .from('season_gender_state')
      .update({ is_public_default: false })
      .eq('gender', gender)
      .neq('season_id', seasonId)

    if (clearErr) return NextResponse.json({ error: clearErr.message }, { status: 500 })

    const { error: setErr } = await client
      .from('season_gender_state')
      .update({ is_public_default: true })
      .eq('season_id', seasonId)
      .eq('gender', gender)

    if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })

    try {
      await client.rpc('log_admin_activity', {
        p_admin_email: email,
        p_action: 'set_live',
        p_entity_type: 'season_gender_state',
        p_entity_id: String(seasonId),
        p_details: { seasonId, gender },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  }

  // ── set-stage ─────────────────────────────────────────────────────────────
  if (action === 'set-stage') {
    if (!gender) return NextResponse.json({ error: 'Missing gender' }, { status: 400 })
    const { stage } = body
    const VALID_STAGES = ['preseason', 'season', 'postseason', 'archived']
    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
    }

    const update: Record<string, unknown> = { stage }
    if (stage === 'archived') update.finalized_at = new Date().toISOString()

    const { error: stageErr } = await client
      .from('season_gender_state')
      .update(update)
      .eq('season_id', seasonId)
      .eq('gender', gender)

    if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 })

    try {
      await client.rpc('log_admin_activity', {
        p_admin_email: email,
        p_action: 'set_stage',
        p_entity_type: 'season_gender_state',
        p_entity_id: String(seasonId),
        p_details: { seasonId, stage, gender },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true })
  }

  // ── finalize-season ───────────────────────────────────────────────────────
  // Archives this season for the given gender only, creates the next season
  // year (shared) if it doesn't already exist, seeds a new preseason
  // season_gender_state row for that gender.
  if (action === 'finalize-season') {
    if (!gender) return NextResponse.json({ error: 'Missing gender' }, { status: 400 })

    // 1. Get current season's year_label
    const { data: cur, error: curErr } = await client
      .from('seasons')
      .select('year_label')
      .eq('id', seasonId)
      .single()

    if (curErr || !cur) return NextResponse.json({ error: 'Season not found' }, { status: 404 })

    // 2. Archive this gender's state
    const { error: archErr } = await client
      .from('season_gender_state')
      .update({ stage: 'archived', finalized_at: new Date().toISOString() })
      .eq('season_id', seasonId)
      .eq('gender', gender)

    if (archErr) return NextResponse.json({ error: archErr.message }, { status: 500 })

    // 3. Compute next year_label: "2025-26" → "2026-27"
    const [startStr] = (cur.year_label ?? '').split('-')
    const startYear = parseInt(startStr)
    if (!Number.isFinite(startYear)) {
      return NextResponse.json({ error: `Can't read the season year from "${cur.year_label}"` }, { status: 400 })
    }
    const nextLabel = `${startYear + 1}-${String(startYear + 2).slice(-2)}`

    // 4. Get or create the next shared season year record
    let newSeasonId: number

    const { data: existing } = await client
      .from('seasons')
      .select('id')
      .eq('year_label', nextLabel)
      .maybeSingle()

    if (existing) {
      newSeasonId = existing.id
    } else {
      // Season key = championship (ending) year, e.g. 2026-27 → 2027
      const nextId = startYear + 2

      const { data: newSeason, error: createErr } = await client
        .from('seasons')
        .insert({
          id:         nextId,
          year_label: nextLabel,
          label:      nextLabel,
          start_year: startYear + 1,
          end_year:   startYear + 2,
        })
        .select('id')
        .single()

      if (createErr || !newSeason) {
        return NextResponse.json({ error: createErr?.message ?? 'Failed to create season' }, { status: 500 })
      }
      newSeasonId = newSeason.id
    }

    // 5. Create season_gender_state preseason row for the new season + this gender
    const { error: sgsErr } = await client
      .from('season_gender_state')
      .insert({ season_id: newSeasonId, gender, stage: 'preseason', is_public_default: false })

    if (sgsErr) return NextResponse.json({ error: sgsErr.message }, { status: 500 })

    // 6. Carry this gender's active hammer score formula forward to the new season (if none yet),
    //    so the new season starts from last season's formula instead of the built-in defaults.
    let hammerConfigCopied = false
    const { data: nextCfg } = await client
      .from('hammer_score_config').select('id')
      .eq('season', nextLabel).eq('gender', gender).eq('is_active', true).maybeSingle()
    if (!nextCfg) {
      const { data: curCfg } = await client
        .from('hammer_score_config').select('name, config')
        .eq('season', cur.year_label).eq('gender', gender).eq('is_active', true).maybeSingle()
      if (curCfg) {
        const { error: cfgErr } = await client.from('hammer_score_config').insert({
          season: nextLabel, gender, name: curCfg.name, config: curCfg.config, is_active: true,
        })
        hammerConfigCopied = !cfgErr
      }
    }

    // 7. Seed preseason_checklist for new season (gender-unaware until migration adds gender col)
    const STEP_KEYS = [
      'alignment', 'coaches', 'roster_rollover', 'schedule_import',
      'school_list', 'tournament_rollover', 'rankings_setup',
    ]
    const rows = STEP_KEYS.map(step_key => ({
      season_id: newSeasonId,
      step_key,
      status: 'not_started',
    }))
    await client.from('preseason_checklist').upsert(rows, { onConflict: 'season_id,step_key', ignoreDuplicates: true })

    try {
      await client.rpc('log_admin_activity', {
        p_admin_email: email,
        p_action: 'finalize_season',
        p_entity_type: 'season_gender_state',
        p_entity_id: String(seasonId),
        p_details: { archivedSeasonId: seasonId, newSeasonId, newLabel: nextLabel, gender, hammerConfigCopied },
      })
    } catch { /* non-fatal */ }

    return NextResponse.json({ ok: true, newSeasonId, newLabel: nextLabel, hammerConfigCopied })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
