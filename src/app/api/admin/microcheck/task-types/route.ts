import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase/service'
import { requireMicrocheckAdmin } from '../_auth'
import { loadWorkload, openCounts, typeGenderLabel } from '../_workload'

export const dynamic = 'force-dynamic'

// GET — every task type in dealing order, with open / total counts and the front-of-queue list
export async function GET() {
  if (!await requireMicrocheckAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const db = createSupabaseAdmin()
    const w = await loadWorkload(db)
    const counts = openCounts(w)
    const typeByKey = new Map(w.types.map(t => [t.key, t]))
    return NextResponse.json({
      types: w.types.map(t => ({
        ...t,
        group_label: typeGenderLabel(t.gender),
        ...counts.get(t.key),
        scope_schools: (t.school_ids ?? []).map(id => ({ id, name: w.nameFor(t, id) })),
      })),
      focus: w.focus
        .filter(f => typeByKey.has(f.task_key))
        .map(f => {
          const t = typeByKey.get(f.task_key)!
          return { ...f, school_name: w.nameFor(t, f.school_id), task_label: `${typeGenderLabel(t.gender)} · ${t.label}`, status: w.status(t.key, f.school_id) }
        }),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// PATCH — save the order and settings
// Body: { types: [{ key, sort_order, enabled, pinned, school_ids }] }
export async function PATCH(req: NextRequest) {
  if (!await requireMicrocheckAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { types } = await req.json() as {
    types: { key: string; sort_order: number; enabled: boolean; pinned: boolean; school_ids: number[] | null }[]
  }
  if (!Array.isArray(types)) return NextResponse.json({ error: 'types required' }, { status: 400 })

  const db = createSupabaseAdmin()
  const { data: current, error: readErr } = await db.from('microcheck_task_types').select('key, pinned_at')
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  const pinnedAt = new Map((current ?? []).map(c => [c.key as string, c.pinned_at as string | null]))
  const now = new Date().toISOString()

  for (const t of types) {
    const { error } = await db.from('microcheck_task_types').update({
      sort_order: t.sort_order,
      enabled:    t.enabled,
      // Keep an existing pin's time so pins stay in the order they were made
      pinned_at:  t.pinned ? (pinnedAt.get(t.key) ?? now) : null,
      school_ids: t.school_ids?.length ? t.school_ids : null,
      updated_at: now,
    }).eq('key', t.key)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
