import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

// GET /api/admin/null-wrestler-bouts?gender=M&limit=200&offset=0
export async function GET(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const gender = (params.get('gender') ?? 'M') as 'M' | 'F' | 'all'
  const limit = Math.min(parseInt(params.get('limit') ?? '300'), 500)
  const offset = parseInt(params.get('offset') ?? '0')

  const db = createSupabaseAdmin()
  const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'
  const istTable  = gender === 'F' ? 'in_season_tournaments_girls' : 'in_season_tournaments'

  // Fetch bouts with null wrestler IDs (non-BYE)
  const { data: bouts, error: boutsErr, count } = await db
    .from(boutTable)
    .select(`
      id,
      in_season_tournament_id,
      weight_class,
      round,
      result_type,
      result_detail,
      wrestler1_id,
      wrestler1_name,
      wrestler1_school_raw,
      wrestler1_school_id,
      wrestler2_id,
      wrestler2_name,
      wrestler2_school_raw,
      wrestler2_school_id
    `, { count: 'exact' })
    .neq('result_type', 'BYE')
    .or('wrestler1_id.is.null,wrestler2_id.is.null')
    .order('weight_class')
    .range(offset, offset + limit - 1)

  if (boutsErr) return NextResponse.json({ error: boutsErr.message }, { status: 500 })
  if (!bouts?.length) return NextResponse.json({ bouts: [], tournaments: {}, total: 0 })

  // Fetch tournament names for all referenced tournaments
  const tourIds = [...new Set(bouts.map(b => b.in_season_tournament_id).filter(Boolean))] as string[]
  const { data: tournaments } = await db
    .from(istTable)
    .select('id, name, start_date')
    .in('id', tourIds)

  const tourMap: Record<string, { name: string; start_date: string | null }> = {}
  for (const t of tournaments ?? []) {
    tourMap[t.id] = { name: t.name, start_date: t.start_date }
  }

  return NextResponse.json({ bouts, tournaments: tourMap, total: count ?? 0 })
}

// POST /api/admin/null-wrestler-bouts/resolve — link wrestler_id + write alias
export async function POST(req: NextRequest) {
  const auth = await createSupabaseServer()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const {
    bout_id,
    slot,           // 'wrestler1' | 'wrestler2'
    wrestler_id,
    raw_name,
    school_id,
    gender,
  } = await req.json()

  if (!bout_id || !slot || !wrestler_id) {
    return NextResponse.json({ error: 'bout_id, slot, and wrestler_id are required' }, { status: 400 })
  }

  const db = createSupabaseAdmin()
  const boutTable = gender === 'F' ? 'tournament_bouts_girls' : 'tournament_bouts'

  // Update the bout
  const field = slot === 'wrestler1' ? 'wrestler1_id' : 'wrestler2_id'
  const { error: updateErr } = await db
    .from(boutTable)
    .update({ [field]: wrestler_id })
    .eq('id', bout_id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Write alias if we have enough info to make it useful
  if (raw_name && school_id != null) {
    await db
      .from('wrestler_name_aliases')
      .upsert({ raw_name, school_id, wrestler_id }, { onConflict: 'raw_name,school_id' })
  }

  return NextResponse.json({ ok: true })
}
