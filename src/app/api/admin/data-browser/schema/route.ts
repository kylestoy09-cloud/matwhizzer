import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, serviceClient, BLOCKED_TABLES } from '../_auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const table = req.nextUrl.searchParams.get('table') ?? ''
  if (!table || BLOCKED_TABLES.includes(table))
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })

  const db = serviceClient()
  const { data, error } = await db.rpc('admin_table_schema', { p_table: table })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ schema: data })
}
