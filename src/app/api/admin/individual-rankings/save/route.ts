import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const sb = await createSupabaseServer()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await sb.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

// ── GET — load existing saved rankings for a stage ────────────────────────────
// ?week_id=1&gender=M&weight_class=106&stage=district&stage_entity=5
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const weekId      = searchParams.get('week_id')
  const gender      = searchParams.get('gender') ?? 'M'
  const weightClass = parseInt(searchParams.get('weight_class') ?? '0', 10)
  const stage       = searchParams.get('stage') ?? ''
  const stageEntity = searchParams.get('stage_entity') ?? ''

  if (!weekId || !weightClass || !stage || !stageEntity) {
    return NextResponse.json({ rankings: [], is_complete: false })
  }

  const db = createSupabaseAdmin()

  const [rankRes, compRes] = await Promise.all([
    db.from('individual_rankings')
      .select('wrestler_id, manual_rank, hammer_score_snapshot, school_id')
      .eq('week_id', weekId)
      .eq('gender', gender)
      .eq('weight_class', weightClass)
      .eq('stage', stage)
      .eq('stage_entity', stageEntity)
      .not('manual_rank', 'is', null)
      .order('manual_rank', { ascending: true }),

    db.from('individual_ranking_completion')
      .select('id, completed_at, completed_by')
      .eq('week_id', weekId)
      .eq('gender', gender)
      .eq('weight_class', weightClass)
      .eq('stage', stage)
      .eq('stage_entity', stageEntity)
      .maybeSingle(),
  ])

  return NextResponse.json({
    rankings:    rankRes.data ?? [],
    is_complete: !!compRes.data,
    completed_at: compRes.data?.completed_at ?? null,
    completed_by: compRes.data?.completed_by ?? null,
  })
}

// ── POST — save/lock rankings for a stage ─────────────────────────────────────
// Body:
// {
//   week_id: number,
//   gender: 'M' | 'F',
//   weight_class: number,
//   stage: string,
//   stage_entity: string,
//   ranked_wrestlers: { wrestler_id: string; school_id: number | null; hammer_score_snapshot: number }[]
// }
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { week_id, gender, weight_class, stage, stage_entity, ranked_wrestlers } = body

  if (!week_id || !gender || !weight_class || !stage || !stage_entity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!Array.isArray(ranked_wrestlers) || ranked_wrestlers.length === 0) {
    return NextResponse.json({ error: 'ranked_wrestlers must be a non-empty array' }, { status: 400 })
  }

  const db = createSupabaseAdmin()

  // Verify week exists
  const { data: week } = await db
    .from('individual_ranking_weeks')
    .select('id')
    .eq('id', week_id)
    .maybeSingle()
  if (!week) return NextResponse.json({ error: 'week_id not found — run Season 3 seed first' }, { status: 404 })

  // Upsert new rankings first — if this fails, the old rows are still intact.
  // Only clean up stale rows after confirming the new set wrote successfully.
  const rankRows = ranked_wrestlers.map((w: { wrestler_id: string; school_id: number | null; hammer_score_snapshot: number }, i: number) => ({
    week_id,
    gender,
    weight_class,
    stage,
    stage_entity,
    wrestler_id:           w.wrestler_id,
    school_id:             w.school_id ?? null,
    manual_rank:           i + 1,
    hammer_score_snapshot: w.hammer_score_snapshot,
  }))

  const { error: upsertError } = await db
    .from('individual_rankings')
    .upsert(rankRows, { onConflict: 'week_id,gender,weight_class,stage,stage_entity,wrestler_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }

  // Remove wrestlers from a prior save that are no longer in the ranked set
  const keepIds = rankRows.map((r: { wrestler_id: string }) => r.wrestler_id)
  await db
    .from('individual_rankings')
    .delete()
    .eq('week_id', week_id)
    .eq('gender', gender)
    .eq('weight_class', weight_class)
    .eq('stage', stage)
    .eq('stage_entity', stage_entity)
    .not('wrestler_id', 'in', `(${keepIds.join(',')})`)

  // Upsert completion row
  const { error: compError } = await db
    .from('individual_ranking_completion')
    .upsert({
      week_id,
      gender,
      weight_class,
      stage,
      stage_entity,
      completed_at: new Date().toISOString(),
      completed_by: email,
    }, { onConflict: 'week_id,gender,weight_class,stage,stage_entity' })

  if (compError) {
    return NextResponse.json({ error: compError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ranked: ranked_wrestlers.length })
}

// ── DELETE — unlock a completed stage (clears completion, keeps rankings) ──────
// Body: { week_id, gender, weight_class, stage, stage_entity }
export async function DELETE(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { week_id, gender, weight_class, stage, stage_entity } = body

  if (!week_id || !gender || !weight_class || !stage || !stage_entity) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  await db
    .from('individual_ranking_completion')
    .delete()
    .eq('week_id',      week_id)
    .eq('gender',       gender)
    .eq('weight_class', weight_class)
    .eq('stage',        stage)
    .eq('stage_entity', stage_entity)

  return NextResponse.json({ ok: true })
}
