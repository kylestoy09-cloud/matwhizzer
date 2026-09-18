import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient, BLOCKED_TABLES, PAGE_SIZE } from '../_auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const p = req.nextUrl.searchParams
  const table  = p.get('table')  ?? ''
  const page   = Math.max(0, parseInt(p.get('page')  ?? '0'))
  const sort   = p.get('sort')   ?? 'id'
  const dir    = p.get('dir')    === 'desc' ? false : true
  const search = p.get('search') ?? ''

  if (!table || BLOCKED_TABLES.includes(table))
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const db = serviceClient()
  // Validate table exists (prevents injection via URL)
  const { data: tables } = await db.rpc('admin_list_tables')
  const knownTables = (tables as { table_name: string }[] ?? []).map(r => r.table_name)
  if (!knownTables.includes(table))
    return NextResponse.json({ error: 'Unknown table' }, { status: 400 })

  let query = db.from(table).select('*', { count: 'exact' })

  if (search) {
    // Get text columns to search against
    const { data: schema } = await db.rpc('admin_table_schema', { p_table: table })
    const textCols = (schema as { column_name: string; data_type: string }[] ?? [])
      .filter(c => ['text', 'character varying', 'character', 'uuid'].includes(c.data_type))
      .map(c => c.column_name)
    if (textCols.length > 0) {
      query = query.or(textCols.map(c => `${c}.ilike.%${search}%`).join(','))
    }
  }

  const { data, count, error } = await query
    .order(sort, { ascending: dir })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rows: data ?? [], total: count ?? 0, page, pageSize: PAGE_SIZE })
}
