import { NextResponse } from 'next/server'
import { requireAdmin, serviceClient, BLOCKED_TABLES } from '../_auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { user } = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = serviceClient()
  const { data, error } = await db.rpc('admin_list_tables')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const tables = (data as { table_name: string }[])
    .map(r => r.table_name)
    .filter(t => !BLOCKED_TABLES.includes(t))

  return NextResponse.json({ tables })
}
