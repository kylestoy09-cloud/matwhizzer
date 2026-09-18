import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const CURRENT_SEASON_ID = 2

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null }
  const { data: appUser } = await userSupabase.from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null }
  return { user }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db() { return createClient<any>(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') }

// GET /api/admin/rankings/archive
// Returns distinct (ranking_type, scope, scope_id, weight_class) combos that exist
// in ranking_published, with snapshot counts, for building the archive browser selector.
export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rankingType = req.nextUrl.searchParams.get('ranking_type') ?? null

  const supabase = db()

  let q = supabase
    .from('ranking_published')
    .select('ranking_type, scope, scope_id, weight_class, published_at')
    .eq('season_id', CURRENT_SEASON_ID)
    .order('scope').order('scope_id').order('weight_class').order('published_at', { ascending: false })
    .limit(5000)

  if (rankingType) q = q.eq('ranking_type', rankingType)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Dedupe into distinct combos, counting snapshots and tracking latest published_at
  type Combo = {
    ranking_type: string
    scope: string
    scope_id: string | null
    weight_class: number | null
    snapshot_count: number
    latest_published_at: string
  }

  const comboMap = new Map<string, Combo>()
  for (const row of (data ?? []) as { ranking_type: string; scope: string; scope_id: string | null; weight_class: number | null; published_at: string }[]) {
    const key = `${row.ranking_type}|${row.scope}|${row.scope_id ?? ''}|${row.weight_class ?? ''}`
    const existing = comboMap.get(key)
    if (!existing) {
      comboMap.set(key, {
        ranking_type:        row.ranking_type,
        scope:               row.scope,
        scope_id:            row.scope_id,
        weight_class:        row.weight_class,
        snapshot_count:      1,
        latest_published_at: row.published_at,
      })
    } else {
      existing.snapshot_count++
      // rows are ordered by published_at DESC so first row is already latest
    }
  }

  const combos = [...comboMap.values()].sort((a, b) => {
    // Sort: scope type order, then scope_id, then weight_class
    const scopeOrder = { state: 0, section: 1, conference: 2, district: 3, region: 4 }
    const so = (scopeOrder[a.scope as keyof typeof scopeOrder] ?? 9) - (scopeOrder[b.scope as keyof typeof scopeOrder] ?? 9)
    if (so !== 0) return so
    const sidA = a.scope_id ?? ''
    const sidB = b.scope_id ?? ''
    if (sidA !== sidB) return sidA.localeCompare(sidB)
    return (a.weight_class ?? 0) - (b.weight_class ?? 0)
  })

  return NextResponse.json({ combos })
}
