import { NextRequest, NextResponse } from 'next/server'
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

// POST /api/admin/rankings/publish
// Body: { editorial_id }
// Copies the editorial into ranking_published as a permanent archive snapshot.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { editorial_id } = body
  if (!editorial_id) return NextResponse.json({ error: 'editorial_id required' }, { status: 400 })

  const supabase = db()

  const { data: editorial, error: fetchErr } = await supabase
    .from('ranking_editorial')
    .select('*')
    .eq('id', editorial_id)
    .single()

  if (fetchErr || !editorial) return NextResponse.json({ error: 'Editorial not found' }, { status: 404 })

  const e = editorial as {
    id: string; ranking_type: string; scope: string; scope_id: string | null;
    season_id: number; weight_class: number | null;
    period_start: string; period_end: string;
    results: unknown;
  }

  const { data: published, error: insertErr } = await supabase
    .from('ranking_published')
    .insert({
      ranking_type:        e.ranking_type,
      scope:               e.scope,
      scope_id:            e.scope_id,
      season_id:           e.season_id,
      weight_class:        e.weight_class,
      period_start:        e.period_start,
      period_end:          e.period_end,
      source_type:         'editorial',
      source_editorial_id: e.id,
      source_variant_id:   null,
      results:             e.results,
      published_by:        email,
    })
    .select('id, published_at')
    .single()

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  try {
    await supabase.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'ranking_published',
      p_entity_type: 'ranking_published',
      p_entity_id:   (published as { id: string }).id,
      p_details:     {
        scope:        e.scope,
        scope_id:     e.scope_id,
        weight_class: e.weight_class,
        period_start: e.period_start,
        period_end:   e.period_end,
        editorial_id: e.id,
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true, published_id: (published as { id: string }).id })
}
