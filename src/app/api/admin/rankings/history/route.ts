import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CURRENT_SEASON_ID = 2

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

type ResultRow = { rank: number; wrestler_id: string; label: string; score: number }
type PublishedRow = {
  id: string; published_at: string; published_by: string | null;
  source_type: string; period_start: string; period_end: string;
  results: ResultRow[]
}

// GET /api/admin/rankings/history
// ?scope=state&scope_id=&weight_class=106
// Returns published history newest-first, each entry annotated with movement
// (+N/-N/NEW) compared to the immediately prior published snapshot.
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scope   = req.nextUrl.searchParams.get('scope') ?? 'state'
  const scopeId = req.nextUrl.searchParams.get('scope_id') ?? null
  // null = team scope (IS NULL weight_class), integer = individual scope
  const wcParam     = req.nextUrl.searchParams.get('weight_class')
  const weightClass = wcParam !== null ? parseInt(wcParam, 10) : null

  const supabase = db()

  let q = supabase
    .from('ranking_published')
    .select('id, published_at, published_by, source_type, period_start, period_end, results')
    .eq('scope', scope)
    .eq('season_id', CURRENT_SEASON_ID)
    .order('published_at', { ascending: false })
    .limit(20)

  if (weightClass !== null) q = q.eq('weight_class', weightClass)
  else q = q.is('weight_class', null)

  q = scopeId ? q.eq('scope_id', scopeId) : q.is('scope_id', null)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as PublishedRow[]

  // Annotate movement: compare each row to the one immediately after it (which is older)
  const history = rows.map((row, idx) => {
    const priorRow = rows[idx + 1]
    const priorRankMap = new Map<string, number>()
    if (priorRow) {
      for (const r of priorRow.results) priorRankMap.set(r.wrestler_id, r.rank)
    }

    const annotated = row.results.map(r => {
      const priorRank = priorRankMap.get(r.wrestler_id)
      let movement: string | null = null
      if (!priorRow) movement = null                           // first ever publish
      else if (priorRank == null) movement = 'NEW'
      else if (priorRank > r.rank) movement = `+${priorRank - r.rank}`
      else if (priorRank < r.rank) movement = `-${r.rank - priorRank}`
      else movement = '—'
      return { ...r, movement }
    })

    return {
      id:           row.id,
      published_at: row.published_at,
      published_by: row.published_by,
      source_type:  row.source_type,
      period_start: row.period_start,
      period_end:   row.period_end,
      results:      annotated,
    }
  })

  return NextResponse.json({ history })
}
