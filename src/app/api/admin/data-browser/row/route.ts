import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient, BLOCKED_TABLES } from '../_auth'

export const dynamic = 'force-dynamic'

// PATCH — update a single cell
export async function PATCH(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { table, pkCol, pkVal, column, newValue, oldValue } = body

  if (!table || !pkCol || pkVal === undefined || !column || newValue === undefined)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (BLOCKED_TABLES.includes(table))
    return NextResponse.json({ error: 'Table is read-only' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = serviceClient() as any

  // Validate table + column via schema
  const { data: schema } = await db.rpc('admin_table_schema', { p_table: table })
  const cols = (schema as { column_name: string; is_pk: boolean }[] ?? [])
  if (!cols.find((c: { column_name: string }) => c.column_name === column))
    return NextResponse.json({ error: 'Unknown column' }, { status: 400 })
  if (cols.find((c: { column_name: string; is_pk: boolean }) => c.column_name === column && c.is_pk))
    return NextResponse.json({ error: 'Cannot edit primary key' }, { status: 400 })

  const { error } = await db
    .from(table)
    .update({ [column]: newValue === '' ? null : newValue })
    .eq(pkCol, pkVal)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to admin_activity_log (non-fatal)
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'data_browser_edit',
      p_entity_type: table,
      p_entity_id:   String(pkVal),
      p_details:     { column, before: oldValue, after: newValue },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}

// DELETE — delete a row
export async function DELETE(req: NextRequest) {
  const { user, email } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { table, pkCol, pkVal } = body

  if (!table || !pkCol || pkVal === undefined)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (BLOCKED_TABLES.includes(table))
    return NextResponse.json({ error: 'Table is read-only' }, { status: 403 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = serviceClient() as any

  // Fetch row before deleting so we can log it
  const { data: existing } = await db.from(table).select('*').eq(pkCol, pkVal).single()

  const { error } = await db.from(table).delete().eq(pkCol, pkVal)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log (non-fatal)
  try {
    await db.rpc('log_admin_activity', {
      p_admin_email: email,
      p_action:      'data_browser_delete',
      p_entity_type: table,
      p_entity_id:   String(pkVal),
      p_details:     { deleted_row: existing },
    })
  } catch { /* non-fatal */ }

  return NextResponse.json({ ok: true })
}
