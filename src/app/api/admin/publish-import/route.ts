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

function db() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL  ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

// POST /api/admin/publish-import
// Body: { id: string }   — uuid of an import_queue item in 'ready_for_review' status
//
// Calls publish_import_queue_dual_meet() which runs as a single atomic transaction:
//   writes dual_meets + dual_meet_matches rows, marks queue item as 'published',
//   and logs to admin_activity_log.  If the function raises an exception, Postgres
//   rolls back all writes and the item stays in 'ready_for_review'.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id } = body as { id?: string }
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const supabase = db()

  // Fetch the item to determine source_type and validate status before calling RPC
  const { data: item, error: fetchErr } = await supabase
    .from('import_queue')
    .select('id, status, source_type, label')
    .eq('id', id)
    .single()

  if (fetchErr || !item) {
    return NextResponse.json({ error: 'Import queue item not found' }, { status: 404 })
  }

  const q = item as { id: string; status: string; source_type: string; label: string }

  if (q.status !== 'ready_for_review') {
    return NextResponse.json(
      { error: `Cannot publish: item status is '${q.status}', expected 'ready_for_review'` },
      { status: 409 },
    )
  }

  const SUPPORTED_TYPES: Record<string, string> = {
    dual_meet:       'publish_import_queue_dual_meet',
    tournament_rtf:  'publish_import_queue_tournament',
  }

  const rpcName = SUPPORTED_TYPES[q.source_type]
  if (!rpcName) {
    return NextResponse.json(
      { error: `publish-import does not yet support source_type '${q.source_type}'` },
      { status: 400 },
    )
  }

  const { data: result, error: rpcErr } = await supabase.rpc(rpcName, {
    p_queue_id:    id,
    p_admin_email: email,
  })

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = result as any
  if (!r?.ok) {
    return NextResponse.json(
      { error: r?.error ?? 'Publish failed — no details returned from database' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, ...r })
}
