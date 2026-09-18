import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

const EDITABLE_FIELDS = new Set([
  'display_name', 'short_name', 'mascot', 'nickname',
  'color_primary', 'color_secondary', 'color_tertiary', 'header_background',
  'town', 'county', 'section', 'classification', 'athletic_conference',
  'website_url', 'twitter_handle', 'logo_url',
])

type Change = { field: string; before: string | null; after: string }
type ApplyRow = { school_id: number; school_name: string; changes: Change[] }

async function requireAdmin() {
  const userSupabase = await createSupabaseServer()
  const { data: { user } } = await userSupabase.auth.getUser()
  if (!user) return { user: null, email: '' }
  const { data: appUser } = await userSupabase
    .from('app_users').select('role').eq('id', user.id).single()
  if (!appUser || appUser.role !== 'admin') return { user: null, email: '' }
  return { user, email: user.email ?? '' }
}

// POST /api/admin/school-bulk-apply
// Body: { rows: ApplyRow[], batchNote?: string }
// Applies all rows and logs ONE batch entry to admin_activity_log.
export async function POST(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rows, batchNote }: { rows: ApplyRow[]; batchNote?: string } =
    await req.json().catch(() => ({ rows: [] }))

  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: 'No rows to apply' }, { status: 400 })

  const db = createSupabaseAdmin()
  const results: Array<{ school_id: number; school_name: string; ok: boolean; error?: string }> = []

  for (const row of rows) {
    if (!row.school_id || !row.changes?.length) continue

    // Only apply known editable fields — never let caller write arbitrary columns
    const update: Record<string, string> = {}
    for (const c of row.changes) {
      if (EDITABLE_FIELDS.has(c.field)) update[c.field] = c.after
    }
    if (Object.keys(update).length === 0) continue

    const { error } = await db.from('schools').update(update).eq('id', row.school_id)
    results.push({ school_id: row.school_id, school_name: row.school_name, ok: !error, error: error?.message })
  }

  const applied = results.filter(r => r.ok)
  const failed  = results.filter(r => !r.ok)

  // One log entry for the whole batch
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'school_bulk_update',
      p_entity_type: 'school',
      p_entity_id:   null,
      p_details:     {
        batch_note:    batchNote ?? null,
        applied_count: applied.length,
        failed_count:  failed.length,
        changes:       rows.map(r => ({
          school_id:   r.school_id,
          school_name: r.school_name,
          fields:      r.changes.map(c => ({ field: c.field, before: c.before, after: c.after })),
        })),
      },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ applied: applied.length, failed: failed.length, errors: failed })
}
